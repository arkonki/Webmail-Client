import { Folder, Conversation, User, Email } from '../types';
import { AUTH_TOKEN_KEY } from '../constants';

const API_BASE_URL = 'http://localhost:3001/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
};

// --- Auth Service ---

export const login = async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        throw new Error('Login failed');
    }
    return response.json();
};

export const verifyToken = async (): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
     if (!response.ok) {
        throw new Error('Token verification failed');
    }
    return response.json();
};


// --- Mail Service ---

export const getFolders = async (): Promise<Folder[]> => {
    const response = await fetch(`${API_BASE_URL}/folders`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch folders');
    return response.json();
};

export const createFolder = async (folderName: string, parentPath: string | null): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/folders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ folderName, parentPath }),
    });
    return response.ok;
};

export const getConversationsByFolder = async (folderPath: string): Promise<Conversation[]> => {
    const encodedPath = encodeURIComponent(folderPath);
    const response = await fetch(`${API_BASE_URL}/conversations/${encodedPath}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
};

export const sendEmail = async (emailData: { to: string, subject: string, body: string }): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(emailData)
    });
    if (!response.ok) throw new Error('Failed to send email');
};

export const updateEmailReadStatus = async (folderPath: string, uids: string[], read: boolean): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/emails/read-status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ folderPath, uids, read })
    });
    return response.ok;
};

export const moveConversation = async (threadId: string, sourceFolderPath: string, destinationFolderPath: string): Promise<void> => {
     const response = await fetch(`${API_BASE_URL}/conversations/move`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ threadId, sourceFolderPath, destinationFolderPath })
    });
    if (!response.ok) throw new Error('Failed to move conversation');
};
