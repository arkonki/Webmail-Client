
import React from 'react';
import { Conversation } from '../types';
import { format, isToday, isThisYear } from 'date-fns';
import { MailIcon } from './icons/MailIcon';
import { MailOpenIcon } from './icons/MailOpenIcon';

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (conversation: Conversation) => void;
  onToggleRead: (conversation: Conversation) => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) return format(date, 'p');
  if (isThisYear(date)) return format(date, 'MMM d');
  return format(date, 'P');
};

const ConversationListItem: React.FC<ConversationListItemProps> = ({ conversation, isSelected, onSelect, onToggleRead }) => {
  const latestEmail = conversation.emails[conversation.emails.length - 1];
  const participants = conversation.participants.map(p => p.name).join(', ');

  return (
    <li className="border-b border-gray-200 dark:border-gray-700 relative group">
      <button
        onClick={() => onSelect(conversation)}
        className={`w-full p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 focus:outline-none ${isSelected ? 'bg-primary-50 dark:bg-primary-900/50' : ''}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center min-w-0 mr-4">
            {conversation.hasUnread && <span className="flex-shrink-0 w-2 h-2 mr-2 bg-primary-500 rounded-full"></span>}
            <p className={`text-sm font-semibold truncate ${conversation.hasUnread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
              {participants}
              {conversation.messageCount > 1 && <span className="ml-2 font-normal text-gray-500">({conversation.messageCount})</span>}
            </p>
          </div>
          <time className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">{formatDate(conversation.latestMessageDate)}</time>
        </div>
        <p className={`mt-1 text-sm truncate ${conversation.hasUnread ? 'text-gray-800 dark:text-gray-100 font-bold' : 'text-gray-600 dark:text-gray-400'}`}>
          {conversation.subject}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
          {latestEmail.snippet}
        </p>
      </button>
      <button
          onClick={(e) => { e.stopPropagation(); onToggleRead(conversation); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-opacity"
          aria-label={conversation.hasUnread ? 'Mark all as read' : 'Mark all as unread'}
          title={conversation.hasUnread ? 'Mark all as read' : 'Mark all as unread'}
      >
          {conversation.hasUnread ? <MailIcon /> : <MailOpenIcon />}
      </button>
    </li>
  );
};

export default React.memo(ConversationListItem);