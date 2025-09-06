
import React, { useMemo, useState } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { useDebounce } from '../hooks/useDebounce';
import { useMailbox } from '../hooks/useMailbox';
import { EmailListSkeleton } from './skeletons/EmailListSkeleton';
import ConversationListItem from './ConversationListItem';
import { Conversation } from '../types';

interface EmailListProps {
    onSelectConversation: (conv: Conversation) => void;
}

// Helper to strip HTML for more accurate body searching
const stripHtml = (html: string): string => {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]*>?/gm, ' ');
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

const EmailList: React.FC<EmailListProps> = ({ onSelectConversation }) => {
  const {
    selectedFolder,
    conversations,
    isLoadingConversations,
    toggleThreadRead,
    selectedConversation
  } = useMailbox();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const isSearching = searchTerm !== debouncedSearchTerm;

  const filteredConversations = useMemo(() => {
    if (!debouncedSearchTerm) {
      return conversations;
    }
    const lowerCaseQuery = debouncedSearchTerm.toLowerCase();
    return conversations.filter(convo =>
      convo.subject.toLowerCase().includes(lowerCaseQuery) ||
      convo.emails.some(email => 
        email.from.name.toLowerCase().includes(lowerCaseQuery) ||
        email.from.email.toLowerCase().includes(lowerCaseQuery) ||
        email.to.some(r => r.name.toLowerCase().includes(lowerCaseQuery) || r.email.toLowerCase().includes(lowerCaseQuery)) ||
        stripHtml(email.body).toLowerCase().includes(lowerCaseQuery)
      )
    );
  }, [conversations, debouncedSearchTerm]);
  
  const handleSelect = (conv: Conversation) => {
    onSelectConversation(conv);
  };


  if (!selectedFolder) return null;

  const renderContent = () => {
    if (isLoadingConversations) {
      return <EmailListSkeleton />;
    }
    if (isSearching) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4 text-center">
          <SpinnerIcon />
          <span className="ml-2">Searching...</span>
        </div>
      );
    }
    if (conversations.length === 0) {
      return <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
        <p className="font-semibold">It's quiet in here</p>
        <p className="text-sm">There are no emails in {selectedFolder.name}.</p>
      </div>;
    }
    if (filteredConversations.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4 text-center">No conversations found.</div>;
    }
    return (
        <ul>
          {filteredConversations.map((convo) => (
            <ConversationListItem
              key={convo.threadId}
              conversation={convo}
              isSelected={selectedConversation?.threadId === convo.threadId}
              onSelect={handleSelect}
              onToggleRead={toggleThreadRead}
            />
          ))}
      </ul>
    );
  }

  return (
    <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold mb-4">{selectedFolder.name}</h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon /></div>
          <input
            type="text"
            placeholder="Search mail"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailList;