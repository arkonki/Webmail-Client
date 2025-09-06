// This is a mocked/stubbed version of the database service for demonstration and debugging.
// It logs all operations to the new logger, which will help diagnose issues.
// In a real application, this would connect to a PostgreSQL database.
import { SystemFolder } from '../src/types';
import { logger } from './logger';
const MOCK_DB = {
    users: new Map(),
    sessions: new Map(),
    labels: new Map(),
    folders: new Map(),
    settings: new Map(),
    contacts: new Map(),
    contactGroups: new Map(),
    scheduledSends: new Map(),
    imapState: new Map(),
};
export const initDb = async () => {
    logger.info("Database service initialized (mock).");
};
// --- Sessions ---
export const createSession = async (token, userId, user, encryptedCredentials, ttl) => {
    const expiresAt = new Date(Date.now() + ttl);
    logger.info("DB: Creating session", { userId, expiresAt });
    MOCK_DB.sessions.set(token, { token, userId, user, encryptedCredentials, expiresAt });
};
export const getSession = async (token) => {
    const session = MOCK_DB.sessions.get(token);
    logger.debug("DB: Getting session", { token, found: !!session });
    return session;
};
export const deleteSession = async (token) => {
    logger.info("DB: Deleting session", { token });
    MOCK_DB.sessions.delete(token);
};
export const touchSession = async (token, ttl) => {
    const session = MOCK_DB.sessions.get(token);
    if (session) {
        session.expiresAt = new Date(Date.now() + ttl);
        MOCK_DB.sessions.set(token, session);
    }
};
export const deleteExpiredSessions = async () => {
    logger.debug("DB: Checking for expired sessions...");
    const now = Date.now();
    let deletedCount = 0;
    for (const [token, session] of MOCK_DB.sessions.entries()) {
        if (session.expiresAt.getTime() < now) {
            MOCK_DB.sessions.delete(token);
            deletedCount++;
        }
    }
    if (deletedCount > 0) {
        logger.info(`DB: Deleted ${deletedCount} expired sessions.`);
    }
};
// --- Users ---
export const findOrCreateUser = async (email) => {
    let user = Array.from(MOCK_DB.users.values()).find(u => u.email === email);
    if (user) {
        logger.info("DB: Found existing user", { email, userId: user.id });
        return user;
    }
    const id = `user_${Date.now()}`;
    const name = email.split('@')[0];
    user = { id, email, name };
    MOCK_DB.users.set(id, user);
    logger.info("DB: Created new user", { email, userId: id });
    return user;
};
export const getUserById = async (userId) => {
    const user = MOCK_DB.users.get(userId);
    logger.debug("DB: Get user by ID", { userId, found: !!user });
    return user ? { ...user, id: userId } : null;
};
// --- Folders ---
export const reconcileFolders = async (userId, imapFolders) => {
    logger.info("DB: Reconciling folders with IMAP server", { userId, count: imapFolders.length });
    // Clear existing IMAP folders for this user to avoid stale data in this mock scenario
    for (const [id, folder] of MOCK_DB.folders.entries()) {
        if (folder.userId === userId && folder.source === 'imap') {
            MOCK_DB.folders.delete(id);
        }
    }
    const specialUseMap = new Map([
        ['\\Inbox', SystemFolder.INBOX],
        ['\\Sent', SystemFolder.SENT],
        ['\\Drafts', SystemFolder.DRAFTS],
        ['\\Trash', SystemFolder.TRASH],
        ['\\Junk', SystemFolder.SPAM],
        ['\\Archive', SystemFolder.ARCHIVE],
    ]);
    function flattenAndProcess(folders, parentId) {
        for (const folder of folders) {
            const specialUseName = folder.specialUse ? specialUseMap.get(folder.specialUse) : null;
            const newFolder = {
                id: `${userId}_${folder.path}`,
                name: specialUseName || folder.name,
                userId: userId,
                path: folder.path,
                isSubscribed: folder.subscribed,
                source: 'imap',
                parentId: parentId,
                specialUse: folder.specialUse || null,
            };
            MOCK_DB.folders.set(newFolder.id, newFolder);
            if (folder.children?.length) {
                flattenAndProcess(folder.children, newFolder.id);
            }
        }
    }
    flattenAndProcess(imapFolders, null);
    // Ensure our custom 'Scheduled' folder exists if it doesn't come from IMAP
    const scheduledFolderExists = Array.from(MOCK_DB.folders.values()).some(f => f.userId === userId && f.name === SystemFolder.SCHEDULED);
    if (!scheduledFolderExists) {
        const scheduledFolder = {
            id: `${userId}_${SystemFolder.SCHEDULED}`,
            name: SystemFolder.SCHEDULED,
            userId: userId,
            path: SystemFolder.SCHEDULED,
            isSubscribed: true,
            source: 'user',
            parentId: null,
            specialUse: null,
        };
        MOCK_DB.folders.set(scheduledFolder.id, scheduledFolder);
    }
    // Return all folders for the user to be sent to the client
    return Array.from(MOCK_DB.folders.values()).filter(f => f.userId === userId);
};
export const getUserFolders = async (userId) => {
    const folders = Array.from(MOCK_DB.folders.values()).filter(f => f.userId === userId);
    logger.debug("DB: Get user folders", { userId, count: folders.length });
    return folders;
};
export const getFolderById = async (folderId, userId) => {
    const folder = Array.from(MOCK_DB.folders.values()).find(f => f.id === folderId && f.userId === userId) || null;
    logger.debug("DB: Get folder by ID", { folderId, userId, found: !!folder });
    return folder;
};
export const findFolder = async (identifier, userId) => {
    // Find by specialUse first, then name
    const bySpecialUse = Array.from(MOCK_DB.folders.values()).find(f => f.specialUse === identifier && f.userId === userId);
    if (bySpecialUse) {
        logger.debug("DB: Find folder by special use", { identifier, userId, found: !!bySpecialUse });
        return bySpecialUse;
    }
    const byNameOrId = Array.from(MOCK_DB.folders.values()).find(f => (f.id === identifier || f.name === identifier) && f.userId === userId) || null;
    logger.debug("DB: Find folder by name/id", { identifier, userId, found: !!byNameOrId });
    return byNameOrId;
};
// --- Labels ---
export const getLabels = async (userId) => {
    const labels = Array.from(MOCK_DB.labels.values()).filter(l => l.userId === userId);
    logger.debug("DB: Get labels", { userId, count: labels.length });
    return labels;
};
export const getLabelById = async (labelId, userId) => {
    const label = Array.from(MOCK_DB.labels.values()).find(l => l.id === labelId && l.userId === userId) || null;
    logger.debug("DB: Get label by ID", { labelId, userId, found: !!label });
    return label;
};
// --- IMAP State ---
export const getImapState = async (userId, folderPath) => {
    const key = `${userId}:${folderPath}`;
    const state = MOCK_DB.imapState.get(key);
    logger.debug("DB: Getting IMAP state", { userId, folderPath, state });
    return state;
};
export const setImapState = async (userId, folderPath, state) => {
    const key = `${userId}:${folderPath}`;
    logger.debug("DB: Setting IMAP state", { userId, folderPath, state });
    MOCK_DB.imapState.set(key, state);
};
// --- Other Stubs ---
export const getContacts = async (userId) => {
    logger.debug("DB: Getting contacts", { userId });
    return [];
};
export const getContactGroups = async (userId) => {
    logger.debug("DB: Getting contact groups", { userId });
    return [];
};
export const getAppSettings = async (userId) => {
    logger.debug("DB: Getting app settings", { userId });
    return MOCK_DB.settings.get(userId) || {
        signature: { isEnabled: false, body: '' },
        autoResponder: { isEnabled: false, subject: '', message: '' },
        rules: [],
        sendDelay: { isEnabled: true, duration: 5 },
        language: 'en',
        isOnboardingCompleted: false,
        displayName: '',
    };
};
export const createScheduledSend = async (job) => {
    logger.info('DB: Creating scheduled send job', job);
};
export const getDueScheduledSends = async () => {
    logger.debug("DB: Getting due scheduled sends");
    return [];
};
export const deleteScheduledSend = async (id) => {
    logger.info("DB: Deleting scheduled send job", { id });
};
export const createLabel = async (name, color, userId) => {
    logger.info("DB: Creating label", { name, color, userId });
    return { labels: [] };
};
export const updateLabel = async (id, updates, userId) => {
    logger.info("DB: Updating label", { id, updates, userId });
    return { labels: [] };
};
export const deleteLabel = async (id, userId) => {
    logger.info("DB: Deleting label", { id, userId });
    return { labels: [], emails: [] };
};
export const createFolder = async (name, userId, parentId) => {
    logger.info("DB: Creating folder", { name, userId, parentId });
    return { folders: [] };
};
export const updateFolder = async (id, newName, userId) => {
    logger.info("DB: Updating folder", { id, newName, userId });
    return { folders: [] };
};
export const deleteFolder = async (id, userId) => {
    logger.info("DB: Deleting folder", { id, userId });
    return { folders: [], emails: [] };
};
export const updateFolderSubscription = async (id, isSubscribed, userId) => {
    logger.info("DB: Updating folder subscription", { id, isSubscribed, userId });
    return { folders: [] };
};
export const updateSettings = async (settings, userId) => {
    logger.info("DB: Updating settings", { userId });
    MOCK_DB.settings.set(userId, settings);
    return { settings };
};
export const completeOnboarding = async (userId, data) => {
    logger.info("DB: Completing onboarding", { userId, data });
    const currentSettings = await getAppSettings(userId);
    const newSettings = { ...currentSettings, ...data, isOnboardingCompleted: true };
    MOCK_DB.settings.set(userId, newSettings);
    return { settings: newSettings, contacts: [] };
};
export const updateProfileSettings = async (userId, data) => {
    logger.info("DB: Updating profile settings", { userId, data });
    return { settings: {} };
};
export const addContact = async (data, userId) => {
    logger.info("DB: Adding contact", { userId, data });
    return { contacts: [], newContactId: '' };
};
export const updateContact = async (id, data, userId) => {
    logger.info("DB: Updating contact", { id, userId, data });
    return { contacts: [] };
};
export const deleteContact = async (id, userId) => {
    logger.info("DB: Deleting contact", { id, userId });
    return { contacts: [], groups: [] };
};
export const importContacts = async (newContacts, userId) => {
    logger.info("DB: Importing contacts", { userId, count: newContacts.length });
    return { contacts: [], importedCount: 0, skippedCount: 0 };
};
export const createContactGroup = async (name, userId) => {
    logger.info("DB: Creating contact group", { name, userId });
    return { groups: [] };
};
export const renameContactGroup = async (id, newName, userId) => {
    logger.info("DB: Renaming contact group", { id, newName, userId });
    return { groups: [] };
};
export const deleteContactGroup = async (id, userId) => {
    logger.info("DB: Deleting contact group", { id, userId });
    return { groups: [] };
};
export const addContactToGroup = async (groupId, contactId, userId) => {
    logger.info("DB: Adding contact to group", { groupId, contactId, userId });
    return { groups: [] };
};
export const removeContactFromGroup = async (groupId, contactId, userId) => {
    logger.info("DB: Removing contact from group", { groupId, contactId, userId });
    return { groups: [] };
};
