
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Email, ComposeAction } from '../types';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { ReplyIcon } from './icons/ReplyIcon';
import { ReplyAllIcon } from './icons/ReplyAllIcon';
import { ForwardIcon } from './icons/ForwardIcon';
import { MoreVerticalIcon } from './icons/MoreVerticalIcon';
import { CodeIcon } from './icons/CodeIcon';
import { FileIcon } from './icons/FileIcon';

interface ThreadedEmailProps {
    email: Email;
    isExpanded: boolean;
    onToggle: () => void;
    currentUserEmail: string;
    onComposeAction: (action: ComposeAction, email: Email) => void;
    onViewSource: () => void;
}

const ThreadedEmail: React.FC<ThreadedEmailProps> = ({ email, isExpanded, onToggle, currentUserEmail, onComposeAction, onViewSource }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Sanitize email body to prevent XSS attacks
    const sanitizedBody = useMemo(() => DOMPurify.sanitize(email.body), [email.body]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMenuOpen(prev => !prev);
    };

    return (
        <div className="border border-gray-200 rounded-lg dark:border-gray-700">
            <button
                className="flex items-center w-full p-4 text-left cursor-pointer bg-gray-50 dark:bg-gray-800"
                onClick={onToggle}
                aria-expanded={isExpanded}
            >
                <div className="w-8 h-8 bg-primary-500 text-white flex items-center justify-center rounded-full font-bold mr-4 text-sm flex-shrink-0">
                    {email.from.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">{email.from.name}</div>
                    {!isExpanded && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{email.snippet}</p>}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 ml-4 text-right flex-shrink-0">
                    {format(new Date(email.date), 'MMM d, p')}
                </div>
                 <div className="relative ml-2" ref={menuRef}>
                    <button
                        onClick={handleMenuToggle}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        aria-label="More actions for this email"
                    >
                        <MoreVerticalIcon />
                    </button>
                    {isMenuOpen && (
                         <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1" role="menu">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onViewSource(); setIsMenuOpen(false); }}
                                    className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    role="menuitem"
                                >
                                    <CodeIcon />
                                    <span className="ml-3">View Source</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="ml-2">
                    {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </div>
            </button>
            {isExpanded && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        to {email.to.map(t => t.name).join(', ')}
                    </div>
                    <div
                        className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-300"
                        dangerouslySetInnerHTML={{ __html: sanitizedBody }}
                    />
                    {email.attachments && email.attachments.length > 0 && (
                        <div className="mt-8 border-t pt-6 dark:border-gray-700">
                            <h3 className="text-base font-semibold mb-2">Attachments</h3>
                            <div className="flex flex-wrap gap-4">
                                {email.attachments.map(att => (
                                    <a
                                        key={att.filename}
                                        href={att.url}
                                        download
                                        className="flex items-center p-2 border rounded-lg bg-gray-100 dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                        <FileIcon />
                                        <span className="text-sm font-medium ml-2">{att.filename}</span>
                                        <span className="text-xs text-gray-500 ml-2">({att.size})</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                     {email.from.email !== currentUserEmail && (
                        <div className="mt-6 pt-4 border-t dark:border-gray-600 flex items-center gap-2">
                            <button onClick={() => onComposeAction('reply', email)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600"><ReplyIcon />Reply</button>
                            <button onClick={() => onComposeAction('reply-all', email)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600"><ReplyAllIcon />Reply All</button>
                            <button onClick={() => onComposeAction('forward', email)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 dark:border-gray-600"><ForwardIcon />Forward</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ThreadedEmail;