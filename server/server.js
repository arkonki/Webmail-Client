const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MOCK_USER, MOCK_FOLDERS_FLAT, MOCK_EMAILS } = require('./mock-data');
const { authenticateToken } = require('./auth');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'a-very-secret-key-that-should-be-in-an-env-file'; // In production, use environment variables

app.use(cors());
app.use(express.json());

// --- MOCK DATA HELPERS ---

// This function simulates building a hierarchical folder structure from a flat list,
// which is how IMAP servers often return mailbox lists. It also aggregates unread counts.
const buildFolderTree = () => {
    const foldersByPath = {};
    const rootFolders = [];

    MOCK_FOLDERS_FLAT.forEach(f => {
        const unreadCount = MOCK_EMAILS[f.path]?.filter(e => !e.read).length || 0;
        foldersByPath[f.path] = {
            ...f,
            unreadCount,
            children: [],
            parentId: null,
        };
    });

    Object.values(foldersByPath).forEach(folder => {
        const pathParts = folder.path.split('/');
        if (pathParts.length > 1) {
            const parentPath = pathParts.slice(0, -1).join('/');
            const parent = foldersByPath[parentPath];
            if (parent) {
                parent.children.push(folder);
                folder.parentId = parent.path;
            } else {
                rootFolders.push(folder);
            }
        } else {
            rootFolders.push(folder);
        }
    });
    
    const aggregateUnreadCounts = (folder) => {
        let totalUnread = folder.unreadCount;
        if (folder.children.length > 0) {
            totalUnread += folder.children.reduce((sum, child) => sum + aggregateUnreadCounts(child), 0);
        }
        folder.unreadCount = totalUnread;
        return totalUnread;
    };
    
    Object.values(foldersByPath).forEach(folder => {
        folder.children.sort((a, b) => a.name.localeCompare(b.name));
    });

    rootFolders.forEach(aggregateUnreadCounts);
    
    const systemOrder = ['Inbox', 'Sent', 'Drafts', 'Spam', 'Trash'];
    rootFolders.sort((a, b) => {
        const aIndex = systemOrder.indexOf(a.name);
        const bIndex = systemOrder.indexOf(b.name);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
    });

    return rootFolders;
};

const getConversationsByFolder = (folderPath) => {
  const emails = MOCK_EMAILS[folderPath] || [];
  const threads = {};
  emails.forEach(email => {
    if (!threads[email.threadId]) threads[email.threadId] = [];
    threads[email.threadId].push(email);
  });

  const conversations = Object.values(threads).map((threadEmails) => {
    threadEmails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const rootEmail = threadEmails[0];
    const latestEmail = threadEmails[threadEmails.length - 1];
    const participants = threadEmails.reduce((acc, email) => {
        if (!acc.some(p => p.name === email.from.name)) acc.push({ name: email.from.name });
        return acc;
    }, []);
    return {
      threadId: rootEmail.threadId,
      emails: threadEmails,
      subject: rootEmail.subject.replace(/^(Re: |Fwd: )+/i, ''),
      latestMessageDate: latestEmail.date,
      participants,
      hasUnread: threadEmails.some(e => !e.read),
      messageCount: threadEmails.length,
    };
  });
  conversations.sort((a, b) => new Date(b.latestMessageDate).getTime() - new Date(a.latestMessageDate).getTime());
  return conversations;
};


// --- API ROUTES ---

// Auth
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (email === MOCK_USER.email && password === 'password') {
        const token = jwt.sign({ user: MOCK_USER }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, user: MOCK_USER });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.post('/api/verify', authenticateToken, (req, res) => {
    res.json(req.user.user);
});


// Mail data
app.get('/api/folders', authenticateToken, (req, res) => {
    res.json(buildFolderTree());
});

app.get('/api/conversations/:folderPath', authenticateToken, (req, res) => {
    const folderPath = decodeURIComponent(req.params.folderPath);
    if (MOCK_EMAILS[folderPath]) {
        res.json(getConversationsByFolder(folderPath));
    } else {
        res.status(404).json({ message: 'Folder not found' });
    }
});

app.post('/api/folders', authenticateToken, (req, res) => {
    const { folderName, parentPath } = req.body;
    const newPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    if (MOCK_FOLDERS_FLAT.some(f => f.path.toLowerCase() === newPath.toLowerCase())) {
        return res.status(400).json({ message: "Folder already exists." });
    }
    MOCK_FOLDERS_FLAT.push({ path: newPath, name: folderName });
    MOCK_EMAILS[newPath] = [];
    res.status(201).send();
});

app.post('/api/emails/read-status', authenticateToken, (req, res) => {
    const { folderPath, uids, read } = req.body;
    const emails = MOCK_EMAILS[folderPath];
    if (!emails) return res.status(404).json({ message: "Folder not found" });
    
    let updatedCount = 0;
    emails.forEach(email => {
        if (uids.includes(email.uid)) {
            email.read = read;
            updatedCount++;
        }
    });
    console.log(`Updated read status for ${updatedCount} emails in ${folderPath} to ${read}`);
    res.status(200).send();
});

app.post('/api/conversations/move', authenticateToken, (req, res) => {
    const { threadId, sourceFolderPath, destinationFolderPath } = req.body;
    const sourceEmails = MOCK_EMAILS[sourceFolderPath];
    if (!sourceEmails || !MOCK_EMAILS[destinationFolderPath]) {
        return res.status(404).json({ message: 'Invalid source or destination folder.' });
    }
    const emailsToMove = sourceEmails.filter(e => e.threadId === threadId);
    MOCK_EMAILS[sourceFolderPath] = sourceEmails.filter(e => e.threadId !== threadId);
    MOCK_EMAILS[destinationFolderPath].unshift(...emailsToMove);
    console.log(`Moved thread ${threadId} from ${sourceFolderPath} to ${destinationFolderPath}`);
    res.status(200).send();
});

app.post('/api/send', authenticateToken, (req, res) => {
    console.log("Received 'send email' request:", req.body);
    // Here you would integrate with Nodemailer to send a real email.
    res.status(200).json({ message: "Email sent (mocked)" });
});


app.listen(PORT, () => {
    console.log(`Mock backend server running on http://localhost:${PORT}`);
});
