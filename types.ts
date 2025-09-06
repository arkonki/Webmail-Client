
export interface User {
  name: string;
  email: string;
}

export interface Folder {
  path: string; // e.g., "Inbox" or "Projects/Alpha"
  name: string; // e.g., "Inbox" or "Alpha"
  unreadCount: number;
  children: Folder[];
  parentId: string | null;
}

export interface Attachment {
  filename: string;
  size: string; // e.g., "1.2 MB"
  url: string; // a mock url
}

export interface Email {
  uid: string;
  threadId: string;
  from: {
    name: string;
    email: string;
  };
  to: {
    name: string;
    email: string;
  }[];
  subject: string;
  date: string;
  snippet: string;
  body: string;
  read: boolean;
  attachments?: Attachment[];
  references?: string[];
}

export interface Conversation {
  threadId: string;
  emails: Email[];
  subject: string;
  latestMessageDate: string;
  participants: { name: string }[];
  hasUnread: boolean;
  messageCount: number;
}

export type ComposeAction = 'reply' | 'reply-all' | 'forward';

export interface ComposeInitialData {
  action: ComposeAction;
  to?: string;
  subject?: string;
  body?: string; // This will be HTML content
}