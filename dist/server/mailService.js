import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import sanitizeHtml from 'sanitize-html';
import { SystemFolder, SystemLabel } from '../src/types';
import crypto from 'crypto';
import * as dbService from './databaseService';
import * as rulesEngine from './rulesEngine';
import { logger } from './logger';
// --- Connection Configurations ---
export const getImapConfig = (credentials) => ({
    host: 'mail.veebimajutus.ee',
    port: 993,
    secure: true,
    auth: {
        user: credentials.user,
        pass: credentials.pass,
    },
    logger: false,
    tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'development' ? false : true,
    }
});
export const getSmtpConfig = (user, pass) => ({
    host: 'mail.veebimajutus.ee',
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'development' ? false : true,
    }
});
// --- Helper Functions ---
export const mapParsedMailToEmail = (parsed, uid, folderId, flags, labelNameToIdMap) => {
    const normalizeReferences = (refs) => {
        if (!refs)
            return [];
        return (Array.isArray(refs) ? refs : [refs]).map(r => r.trim()).filter(Boolean);
    };
    const conversationId = parsed.inReplyTo?.[0] || (Array.isArray(parsed.references) ? parsed.references[0] : parsed.references) || parsed.messageId || `conv-${uid}`;
    const unsafeBody = parsed.html || parsed.textAsHtml || '<p>No content</p>';
    const safeBody = sanitizeHtml(unsafeBody, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
        allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['style'], 'a': ['href', 'name', 'target'], 'img': ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'] }
    });
    const getAddressString = (field) => {
        if (!field)
            return '';
        const addresses = Array.isArray(field) ? field.flatMap(t => t.value) : field.value;
        return addresses.map(a => a.address || '').filter(Boolean).join(', ');
    };
    const labelIds = [];
    if (flags.has('\\Flagged'))
        labelIds.push(SystemLabel.STARRED);
    flags.forEach(flag => {
        if (!flag.startsWith('\\')) {
            const labelId = labelNameToIdMap.get(flag);
            if (labelId) {
                labelIds.push(labelId);
            }
        }
    });
    const listUnsubscribeHeader = parsed.headers.get('list-unsubscribe');
    let unsubscribeUrl;
    if (typeof listUnsubscribeHeader === 'string' && listUnsubscribeHeader) {
        // Find the first http/https URL in the header. Regex looks for URLs inside < >.
        const match = listUnsubscribeHeader.match(/<(https?:\/\/[^>]+)>/);
        if (match && match[1]) {
            unsubscribeUrl = match[1];
        }
    }
    return {
        id: parsed.messageId || `email-${uid}`,
        uid,
        conversationId: conversationId,
        senderName: parsed.from?.value[0]?.name || 'Unknown Sender',
        senderEmail: parsed.from?.value[0]?.address || 'unknown@example.com',
        recipientEmail: getAddressString(parsed.to),
        cc: getAddressString(parsed.cc),
        bcc: getAddressString(parsed.bcc),
        subject: parsed.subject || '(no subject)',
        body: safeBody,
        snippet: (parsed.text || '').substring(0, 100),
        timestamp: parsed.date?.toISOString() || new Date().toISOString(),
        isRead: flags.has('\\Seen'),
        folderId: folderId,
        labelIds,
        attachments: parsed.attachments.map(att => ({ fileName: att.filename || 'attachment', fileSize: att.size, contentType: att.contentType, content: att.content?.toString('base64') })),
        references: normalizeReferences(parsed.references),
        unsubscribeUrl,
    };
};
export const withClient = async (credentials, action) => {
    const client = new ImapFlow(getImapConfig(credentials));
    client.on('error', (err) => {
        logger.error('IMAP Client Error Event', { user: credentials.user, error: err });
    });
    try {
        logger.debug('IMAP client connecting...', { user: credentials.user });
        await client.connect();
        logger.debug('IMAP client connected.', { user: credentials.user });
        return await action(client);
    }
    catch (error) {
        logger.error('withClient Execution Error', { user: credentials.user, error });
        throw error;
    }
    finally {
        if (client.usable) {
            try {
                await client.logout();
                logger.debug('IMAP client logged out.', { user: credentials.user });
            }
            catch (logoutErr) {
                logger.warn('IMAP client logout failed, connection may have been lost.', { user: credentials.user, logoutErr });
            }
        }
    }
};
const findUIDsForConversations = async (client, conversationIds) => {
    const uidsByBox = new Map();
    const allFolders = await client.list();
    const searchCriteria = { or: conversationIds.map(id => ({ header: { 'message-id': id.replace(/[<>]/g, '') } })) };
    const searchInFolders = async (folders) => {
        for (const folder of folders) {
            if (folder.flags.has('\\Noselect')) {
                if (folder.children?.length)
                    await searchInFolders(folder.children);
                continue;
            }
            try {
                await client.mailboxOpen(folder.path);
                const uids = await client.search(searchCriteria, { uid: true });
                if (uids && uids.length > 0) {
                    uidsByBox.set(folder.path, uids);
                }
            }
            catch (e) {
                logger.warn(`Could not search in box ${folder.path}, skipping.`, { error: e });
            }
            if (folder.children?.length)
                await searchInFolders(folder.children);
        }
    };
    await searchInFolders(allFolders);
    return uidsByBox;
};
const findUIDsForMessages = async (client, messageIds) => {
    const uidsByBox = new Map();
    const allFolders = await client.list();
    const cleanMessageIds = messageIds.map(id => id.replace(/[<>]/g, ''));
    if (cleanMessageIds.length === 0)
        return uidsByBox;
    const searchCriteria = { or: cleanMessageIds.map(id => ({ header: { 'message-id': id } })) };
    const searchInFolders = async (folders) => {
        for (const folder of folders) {
            if (folder.flags.has('\\Noselect')) {
                if (folder.children?.length)
                    await searchInFolders(folder.children);
                continue;
            }
            try {
                await client.mailboxOpen(folder.path);
                const uids = await client.search(searchCriteria, { uid: true });
                if (uids && uids.length > 0) {
                    const existing = uidsByBox.get(folder.path) || [];
                    uidsByBox.set(folder.path, [...new Set([...existing, ...uids])]);
                }
            }
            catch (e) {
                logger.warn(`Could not search in box ${folder.path}, skipping.`, { error: e });
            }
            if (folder.children?.length)
                await searchInFolders(folder.children);
        }
    };
    await searchInFolders(allFolders);
    return uidsByBox;
};
// --- Service Functions ---
export const login = async (user, pass) => {
    logger.info('Verifying credentials via IMAP login', { user });
    try {
        await withClient({ user, pass }, async () => {
            logger.info("IMAP connection successful for login test.", { user });
        });
        return { name: user.split('@')[0], email: user };
    }
    catch (err) {
        logger.error('IMAP login verification failed.', { user, error: err.message });
        throw new Error("Invalid login or password");
    }
};
const FOLDERS_TO_SYNC_INITIALLY = [
    { name: SystemFolder.INBOX, specialUse: '\\Inbox' },
    { name: SystemFolder.SENT, specialUse: '\\Sent' },
    { name: SystemFolder.DRAFTS, specialUse: '\\Drafts' },
    { name: SystemFolder.TRASH, specialUse: '\\Trash' },
    { name: SystemFolder.SPAM, specialUse: '\\Junk' },
    { name: SystemFolder.ARCHIVE, specialUse: '\\Archive' },
    { name: SystemFolder.SCHEDULED, specialUse: 'Scheduled' }
];
export const getEmailsForUser = async (credentials, userId, limitPerFolder = 50) => {
    logger.info('Starting efficient backlog sweep for user', { user: credentials.user });
    return withClient(credentials, async (client) => {
        const userLabels = await dbService.getLabels(userId);
        const allUserFolders = await dbService.getUserFolders(userId);
        const labelNameToIdMap = new Map(userLabels.map(label => [label.name, label.id]));
        const foldersToSync = [];
        for (const folderInfo of FOLDERS_TO_SYNC_INITIALLY) {
            const folder = await dbService.findFolder(folderInfo.specialUse, userId) || await dbService.findFolder(folderInfo.name, userId);
            if (folder) {
                foldersToSync.push(folder);
            }
            else {
                logger.warn(`Folder '${folderInfo.name}' not found on server. Skipping initial sync.`, { user: credentials.user });
            }
        }
        let finalEmails = [];
        const processedMessageIds = new Set();
        for (const serverFolder of foldersToSync) {
            logger.debug(`Processing folder: ${serverFolder.path}`, { user: credentials.user });
            const lock = await client.getMailboxLock(serverFolder.path);
            try {
                // --- 1. FETCH ---
                const searchResult = await client.search({}, { uid: true });
                const uids = (searchResult || []).slice(-limitPerFolder);
                if (uids.length === 0) {
                    logger.debug(`No emails found in ${serverFolder.path}`, { user: credentials.user });
                    continue;
                }
                logger.debug(`Fetching ${uids.length} emails from ${serverFolder.path}`, { user: credentials.user });
                const fetchedMessages = [];
                for await (const msg of client.fetch(uids, { source: true, flags: true, headers: ['list-unsubscribe'] }, { uid: true })) {
                    if (msg.source) {
                        const parsed = await simpleParser(msg.source);
                        const originalEmail = mapParsedMailToEmail(parsed, msg.uid, serverFolder.id, msg.flags || new Set(), labelNameToIdMap);
                        if (!processedMessageIds.has(originalEmail.id)) {
                            fetchedMessages.push({ originalEmail, uid: msg.uid });
                        }
                    }
                }
                if (fetchedMessages.length === 0)
                    continue;
                // --- 2. PLAN ---
                const uidsToMove = new Map(); // targetFolderId -> uids[]
                const flagsAndUidsToAdd = new Map(); // flag -> uids[]
                for (const { originalEmail, uid } of fetchedMessages) {
                    const { finalEmail, flagsToAdd, destinationFolderId } = await rulesEngine.applyRulesToEmailObject(originalEmail, userId, userLabels);
                    finalEmails.push(finalEmail);
                    processedMessageIds.add(finalEmail.id);
                    if (destinationFolderId && destinationFolderId !== serverFolder.id) {
                        if (!uidsToMove.has(destinationFolderId))
                            uidsToMove.set(destinationFolderId, []);
                        uidsToMove.get(destinationFolderId).push(uid);
                    }
                    if (flagsToAdd.length > 0) {
                        flagsToAdd.forEach(flag => {
                            const uidsForFlag = flagsAndUidsToAdd.get(flag) || [];
                            uidsForFlag.push(uid);
                            flagsAndUidsToAdd.set(flag, uidsForFlag);
                        });
                    }
                }
                // --- 3. EXECUTE ---
                for (const [targetFolderId, moveUids] of uidsToMove.entries()) {
                    const targetFolder = allUserFolders.find(f => f.id === targetFolderId);
                    if (targetFolder) {
                        logger.info(`Applying rule: Moving ${moveUids.length} emails to ${targetFolder.path}`, { user: credentials.user });
                        await client.messageMove(moveUids, targetFolder.path, { uid: true });
                    }
                }
                for (const [flag, flagUids] of flagsAndUidsToAdd.entries()) {
                    logger.info(`Applying rule: Adding flag '${flag}' to ${flagUids.length} emails.`, { user: credentials.user });
                    await client.messageFlagsAdd(flagUids, [flag], { uid: true });
                }
            }
            catch (err) {
                logger.error(`Error processing folder '${serverFolder.path}'`, { user: credentials.user, error: err });
            }
            finally {
                lock.release();
            }
        }
        logger.info(`Finished backlog sweep. Total emails to return: ${finalEmails.length}`, { user: credentials.user });
        finalEmails.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return finalEmails;
    });
};
export const fetchEmailsByUIDs = async (client, uids, folderId, userId) => {
    if (uids.length === 0)
        return [];
    logger.debug(`Fetching details for ${uids.length} emails by UID`, { userId, folderId });
    const userLabels = await dbService.getLabels(userId);
    const labelNameToIdMap = new Map();
    userLabels.forEach(label => labelNameToIdMap.set(label.name, label.id));
    const fetchedEmails = [];
    for await (const msg of client.fetch(uids, { source: true, flags: true, headers: ['list-unsubscribe'] }, { uid: true })) {
        if (msg.source) {
            const parsed = await simpleParser(msg.source);
            fetchedEmails.push(mapParsedMailToEmail(parsed, msg.uid, folderId, msg.flags || new Set(), labelNameToIdMap));
        }
    }
    return fetchedEmails;
};
export const getImapFolders = async (credentials) => {
    logger.info('Fetching IMAP folders', { user: credentials.user });
    return withClient(credentials, async (client) => {
        const flatFolders = await client.list();
        const folderMap = new Map();
        const rootFolders = [];
        flatFolders.forEach(folder => {
            folder.children = [];
            folderMap.set(folder.path, folder);
        });
        flatFolders.forEach(folder => {
            const delimiter = folder.delimiter;
            const lastDelimiterIndex = delimiter ? folder.path.lastIndexOf(delimiter) : -1;
            if (lastDelimiterIndex > -1) {
                const parentPath = folder.path.substring(0, lastDelimiterIndex);
                const parentFolder = folderMap.get(parentPath);
                if (parentFolder) {
                    parentFolder.children?.push(folder);
                }
                else {
                    rootFolders.push(folder);
                }
            }
            else {
                rootFolders.push(folder);
            }
        });
        logger.info(`Found ${flatFolders.length} total folders`, { user: credentials.user });
        return rootFolders;
    });
};
const buildRawMessage = (data, from, inReplyTo, references) => {
    const messageId = `<${crypto.randomBytes(16).toString('hex')}@webmail.app>`;
    let rawMessage = `Message-ID: ${messageId}\r\n`;
    rawMessage += `From: ${from}\r\n`;
    rawMessage += `To: ${data.to}\r\n`;
    if (data.cc)
        rawMessage += `Cc: ${data.cc}\r\n`;
    if (data.bcc)
        rawMessage += `Bcc: ${data.bcc}\r\n`;
    rawMessage += `Subject: ${data.subject}\r\n`;
    if (inReplyTo)
        rawMessage += `In-Reply-To: ${inReplyTo}\r\n`;
    if (references && references.length > 0)
        rawMessage += `References: ${references.join(' ')}\r\n`;
    rawMessage += `Content-Type: text/html; charset=utf-8\r\n`;
    rawMessage += `\r\n`;
    rawMessage += `${data.body}`;
    return { rawMessage, messageId };
};
export const moveConversations = async (credentials, conversationIds, targetFolderId, userId) => {
    logger.info('Moving conversations', { user: credentials.user, count: conversationIds.length, targetFolderId });
    const targetFolder = await dbService.getFolderById(targetFolderId, userId);
    if (!targetFolder)
        throw new Error(`Target folder ${targetFolderId} not found`);
    return withClient(credentials, async (client) => {
        const uidsByBox = await findUIDsForConversations(client, conversationIds);
        for (const [boxPath, uids] of uidsByBox.entries()) {
            if (uids.length > 0) {
                logger.debug(`Moving ${uids.length} UIDs from ${boxPath} to ${targetFolder.path}`);
                await client.mailboxOpen(boxPath);
                await client.messageMove(uids, targetFolder.path, { uid: true });
            }
        }
        return getEmailsForUser(credentials, userId);
    });
};
export const deleteConversationsPermanently = async (credentials, conversationIds, userId) => {
    logger.info('Deleting conversations permanently', { user: credentials.user, count: conversationIds.length });
    return withClient(credentials, async (client) => {
        const uidsByBox = await findUIDsForConversations(client, conversationIds);
        for (const [boxPath, uids] of uidsByBox.entries()) {
            if (uids.length > 0) {
                logger.debug(`Deleting ${uids.length} UIDs from ${boxPath}`);
                const lock = await client.getMailboxLock(boxPath);
                try {
                    await client.messageFlagsAdd(uids, ['\\Deleted'], { uid: true });
                    await client.expunge(uids); // Using type assertion as a workaround for potential type definition issues
                }
                finally {
                    lock.release();
                }
            }
        }
        return getEmailsForUser(credentials, userId);
    });
};
export const setLabelOnMessages = async (credentials, messageIds, labelName, state, userId) => {
    logger.info(`Setting label '${labelName}' to ${state}`, { user: credentials.user, count: messageIds.length });
    return withClient(credentials, async (client) => {
        const uidsByBox = await findUIDsForMessages(client, messageIds);
        const flag = labelName === SystemLabel.STARRED ? '\\Flagged' : labelName;
        for (const [boxPath, uids] of uidsByBox.entries()) {
            if (uids.length > 0) {
                await client.mailboxOpen(boxPath);
                if (state) {
                    await client.messageFlagsAdd(uids, [flag], { uid: true });
                }
                else {
                    await client.messageFlagsRemove(uids, [flag], { uid: true });
                }
            }
        }
        return getEmailsForUser(credentials, userId);
    });
};
export const markConversationsAsRead = async (credentials, conversationIds, isRead, userId) => {
    logger.info(`Marking conversations as read=${isRead}`, { user: credentials.user, count: conversationIds.length });
    return withClient(credentials, async (client) => {
        const uidsByBox = await findUIDsForConversations(client, conversationIds);
        for (const [boxPath, uids] of uidsByBox.entries()) {
            if (uids.length > 0) {
                await client.mailboxOpen(boxPath);
                if (isRead) {
                    await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
                }
                else {
                    await client.messageFlagsRemove(uids, ['\\Seen'], { uid: true });
                }
            }
        }
        return getEmailsForUser(credentials, userId);
    });
};
export const sendEmail = async (options) => {
    const { data, user, credentials, encryptedCredentials, draftId, conversationId } = options;
    logger.info('Sending email', { user: user.email, to: data.to, subject: data.subject });
    const { rawMessage } = buildRawMessage(data, user.email, conversationId, conversationId ? [conversationId] : undefined);
    if (data.scheduleDate) {
        await dbService.createScheduledSend({
            userId: user.id,
            encryptedPassword: encryptedCredentials,
            rawMessage,
            recipientTo: data.to,
            recipientCc: data.cc,
            recipientBcc: data.bcc,
            sendAt: new Date(data.scheduleDate),
            destinationFolderId: SystemFolder.SENT,
        });
        logger.info('Email scheduled', { sendAt: data.scheduleDate });
        await withClient(credentials, async (client) => {
            const scheduledFolder = await dbService.findFolder(SystemFolder.SCHEDULED, user.id);
            if (!scheduledFolder)
                throw new Error('Scheduled folder not found');
            await client.append(scheduledFolder.path, rawMessage, ['\\Seen']);
        });
    }
    else {
        const transporter = nodemailer.createTransport(getSmtpConfig(credentials.user, credentials.pass));
        await transporter.sendMail({
            from: user.email,
            to: data.to,
            cc: data.cc,
            bcc: data.bcc,
            subject: data.subject,
            html: data.body,
            attachments: data.attachments.map(att => ({
                filename: att.fileName,
                content: att.content,
                encoding: 'base64',
                contentType: att.contentType,
            }))
        });
        await withClient(credentials, async (client) => {
            const sentFolder = await dbService.findFolder(SystemFolder.SENT, user.id);
            if (!sentFolder)
                throw new Error('Sent folder not found');
            await client.append(sentFolder.path, rawMessage, ['\\Seen']);
        });
    }
    if (draftId) {
        await deleteDraft(credentials, draftId, user.id);
    }
    return getEmailsForUser(credentials, user.id);
};
export const saveDraft = async (options) => {
    const { data, user, credentials, draftId } = options;
    logger.info('Saving draft', { user: user.email, subject: data.subject });
    const { rawMessage, messageId } = buildRawMessage(data, user.email);
    return withClient(credentials, async (client) => {
        const draftsFolder = await dbService.findFolder(SystemFolder.DRAFTS, user.id);
        if (!draftsFolder)
            throw new Error('Drafts folder not found');
        if (draftId) {
            try {
                const lock = await client.getMailboxLock(draftsFolder.path);
                const searchResults = await client.search({ header: { 'message-id': draftId.replace(/[<>]/g, '') } }, { uid: true });
                if (searchResults && searchResults.length > 0) {
                    await client.messageDelete(searchResults, { uid: true });
                }
                lock.release();
            }
            catch (e) {
                logger.warn('Could not delete old draft version.', { draftId, e });
            }
        }
        await client.append(draftsFolder.path, rawMessage, ['\\Draft']);
        const emails = await getEmailsForUser(credentials, user.id);
        return { emails, newDraftId: messageId };
    });
};
export const deleteDraft = async (credentials, draftId, userId) => {
    logger.info('Deleting draft', { user: credentials.user, draftId });
    return withClient(credentials, async (client) => {
        const draftsFolder = await dbService.findFolder(SystemFolder.DRAFTS, userId);
        if (!draftsFolder) {
            logger.warn('Drafts folder not found, cannot delete draft.', { userId });
            return getEmailsForUser(credentials, userId);
        }
        const lock = await client.getMailboxLock(draftsFolder.path);
        try {
            const searchResults = await client.search({ header: { 'message-id': draftId.replace(/[<>]/g, '') } }, { uid: true });
            if (searchResults && searchResults.length > 0) {
                await client.messageFlagsAdd(searchResults, ['\\Deleted'], { uid: true });
                await client.expunge(searchResults);
            }
        }
        finally {
            lock.release();
        }
        return getEmailsForUser(credentials, userId);
    });
};
