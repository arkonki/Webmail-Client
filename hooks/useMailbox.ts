import { create } from 'zustand';
import { Conversation, Folder, Email, User } from '../types';
import * as mailService from '../services/mailService';

interface MailboxState {
  // State
  folders: Folder[];
  isLoadingFolders: boolean;
  selectedFolder: Folder | null;
  conversations: Conversation[];
  isLoadingConversations: boolean;
  selectedConversation: Conversation | null;
  user: User | null;

  // Actions
  setUser: (user: User | null) => void;
  fetchFolders: () => Promise<Folder[]>;
  selectFolder: (folder: Folder) => void;
  selectConversation: (conversation: Conversation) => Promise<void>;
  toggleThreadRead: (conversation: Conversation) => Promise<void>;
  moveConversation: (conversation: Conversation, destinationFolderPath: string) => Promise<void>;
  createFolder: (folderName: string, parentPath: string | null) => Promise<boolean>;
}

export const useMailbox = create<MailboxState>((set, get) => ({
  // Initial State
  folders: [],
  isLoadingFolders: true,
  selectedFolder: null,
  conversations: [],
  isLoadingConversations: false,
  selectedConversation: null,
  user: null,

  // Actions
  setUser: (user) => set({ user }),

  fetchFolders: async () => {
    set({ isLoadingFolders: true });
    try {
      const fetchedFolders = await mailService.getFolders();
      set({ folders: fetchedFolders, isLoadingFolders: false });
      return fetchedFolders;
    } catch (error) {
      console.error("Failed to fetch folders:", error);
      set({ isLoadingFolders: false, folders: [] });
      return [];
    }
  },

  selectFolder: (folder) => {
    set({ selectedFolder: folder, selectedConversation: null, isLoadingConversations: true, conversations: [] });
    mailService.getConversationsByFolder(folder.path).then(fetchedConversations => {
        set({ conversations: fetchedConversations, isLoadingConversations: false });
    }).catch(error => {
      console.error(`Failed to fetch conversations for ${folder.path}:`, error);
      set({ isLoadingConversations: false, conversations: [] });
    });
  },
  
  selectConversation: async (conversation) => {
    set({ selectedConversation: conversation });
    const { selectedFolder, fetchFolders } = get();
    const unreadEmails = conversation.emails.filter(e => !e.read);

    if (unreadEmails.length > 0 && selectedFolder) {
      const updatedEmails = conversation.emails.map(e => ({ ...e, read: true }));
      const updatedConversation = { ...conversation, hasUnread: false, emails: updatedEmails };
      
      set(state => ({
        selectedConversation: updatedConversation,
        conversations: state.conversations.map(c => c.threadId === conversation.threadId ? updatedConversation : c)
      }));
      
      const uids = unreadEmails.map(e => e.uid);
      await mailService.updateEmailReadStatus(selectedFolder.path, uids, true);
      await fetchFolders(); // To update unread counts
    }
  },

  toggleThreadRead: async (conversation) => {
    const { selectedFolder, selectedConversation, fetchFolders } = get();
    if (!selectedFolder) return;

    const newReadStatus = !conversation.hasUnread;
    const emailsToUpdate = newReadStatus 
      ? conversation.emails.filter(e => !e.read)
      : conversation.emails; // Mark all as unread

    if (emailsToUpdate.length === 0) return;

    const uids = emailsToUpdate.map(e => e.uid);
    const updatedEmails = conversation.emails.map(e => uids.includes(e.uid) ? { ...e, read: newReadStatus } : e);
    const updatedConversation = { ...conversation, hasUnread: !newReadStatus, emails: updatedEmails };

    set(state => ({
      conversations: state.conversations.map(c => c.threadId === conversation.threadId ? updatedConversation : c),
      selectedConversation: selectedConversation?.threadId === conversation.threadId ? updatedConversation : selectedConversation
    }));

    await mailService.updateEmailReadStatus(selectedFolder.path, uids, newReadStatus);
    await fetchFolders();
  },

  moveConversation: async (conversation, destinationFolderPath) => {
    const { selectedFolder, fetchFolders } = get();
    if (!selectedFolder || selectedFolder.path === destinationFolderPath) return;

    set(state => ({
      conversations: state.conversations.filter(c => c.threadId !== conversation.threadId),
      selectedConversation: null
    }));

    await mailService.moveConversation(conversation.threadId, selectedFolder.path, destinationFolderPath);
    await fetchFolders();
  },

  createFolder: async (folderName, parentPath) => {
    const success = await mailService.createFolder(folderName, parentPath);
    if (success) {
        await get().fetchFolders();
    }
    return success;
  },
}));
