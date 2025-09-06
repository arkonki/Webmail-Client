
import React, { useState, useEffect, useRef } from 'react';
import { Email, ComposeAction, Folder } from '../types';
import ThreadedEmail from './ThreadedEmail';
import SourceCodeModal from './SourceCodeModal';
import { MoreVerticalIcon } from './icons/MoreVerticalIcon';
import { SpamIcon } from './icons/SpamIcon';
import { FolderMoveIcon } from './icons/FolderMoveIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { useMailbox } from '../hooks/useMailbox';

interface EmailViewProps {
  onComposeAction: (action: ComposeAction, email: Email) => void;
  onBack: () => void;
}

const flattenFolders = (folders: Folder[], level = 0): { folder: Folder, level: number }[] => {
    let flatList: { folder: Folder, level: number }[] = [];
    folders.forEach(folder => {
        flatList.push({ folder, level });
        if (folder.children && folder.children.length > 0) {
            flatList = flatList.concat(flattenFolders(folder.children, level + 1));
        }
    });
    return flatList;
};

const EmailView: React.FC<EmailViewProps> = ({ onComposeAction, onBack }) => {
  const { user, selectedConversation, folders, selectedFolder, moveConversation } = useMailbox();
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [sourceCodeEmail, setSourceCodeEmail] = useState<Email | null>(null);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isMoveSubMenuOpen, setIsMoveSubMenuOpen] = useState(false);
  const [moveSubMenuPositionClass, setMoveSubMenuPositionClass] = useState('left-full');

  const menuRef = useRef<HTMLDivElement>(null);
  const moveMenuItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConversation && selectedConversation.emails.length > 0) {
      const latestEmailUid = selectedConversation.emails[selectedConversation.emails.length - 1].uid;
      setExpandedEmails(new Set([latestEmailUid]));
    } else {
      setExpandedEmails(new Set());
    }
    setIsActionsMenuOpen(false);
  }, [selectedConversation]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsActionsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleEmailExpansion = (uid: string) => {
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      newSet.has(uid) ? newSet.delete(uid) : newSet.add(uid);
      return newSet;
    });
  };

  const handleMove = (destinationFolderPath: string) => {
      if (selectedConversation) {
          moveConversation(selectedConversation, destinationFolderPath);
          onBack();
      }
      setIsActionsMenuOpen(false);
  }
  
  const handleMoveMenuHover = () => {
    if (moveMenuItemRef.current) {
        const rect = moveMenuItemRef.current.getBoundingClientRect();
        const menuWidth = 192;
        setMoveSubMenuPositionClass(rect.right + menuWidth > window.innerWidth ? 'right-full' : 'left-full');
    }
    setIsMoveSubMenuOpen(true);
  };

  if (!selectedConversation) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" /></svg>
        <p className="font-semibold text-lg">Select a conversation to read</p>
        <p>Nothing is selected.</p>
      </div>
    );
  }
  
  const otherFolders = flattenFolders(folders)
      .filter(({ folder }) => folder.path !== selectedFolder?.path && !['Sent', 'Drafts'].includes(folder.path));

  return (
    <>
      <div className="h-full p-6 overflow-y-auto">
        <header className="flex items-start justify-between mb-2">
            <div className="flex items-center min-w-0">
                <button onClick={onBack} className="lg:hidden p-2 -ml-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <ArrowLeftIcon />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{selectedConversation.subject}</h1>
            </div>
            <div className="relative flex-shrink-0" ref={menuRef}>
                <button onClick={() => setIsActionsMenuOpen(p => !p)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="More actions"><MoreVerticalIcon /></button>
                {isActionsMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1" role="menu">
                            <button onClick={() => handleMove('Spam')} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem"><SpamIcon /><span className="ml-3">Mark as Spam</span></button>
                            <div className="relative" ref={moveMenuItemRef} onMouseEnter={handleMoveMenuHover} onMouseLeave={() => setIsMoveSubMenuOpen(false)}>
                                <button className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><FolderMoveIcon /><span className="ml-3">Move to</span></button>
                                {isMoveSubMenuOpen && (
                                    <div className={`absolute ${moveSubMenuPositionClass} -top-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 max-h-60 overflow-y-auto`}>
                                      <div className="py-1">{otherFolders.map(({ folder, level }) => <button key={folder.path} onClick={() => handleMove(folder.path)} className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"><span style={{ paddingLeft: `${level * 1.5}rem` }}>{folder.name}</span></button>)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </header>
        <div className="text-sm text-gray-500 mb-6 dark:text-gray-400">{selectedConversation.messageCount} messages in this conversation</div>
        <div className="space-y-4">
          {selectedConversation.emails.map(email => <ThreadedEmail key={email.uid} email={email} isExpanded={expandedEmails.has(email.uid)} onToggle={() => toggleEmailExpansion(email.uid)} currentUserEmail={user?.email || ''} onComposeAction={onComposeAction} onViewSource={() => setSourceCodeEmail(email)} />)}
        </div>
      </div>
      {sourceCodeEmail && <SourceCodeModal emailBody={sourceCodeEmail.body} onClose={() => setSourceCodeEmail(null)} />}
    </>
  );
};

export default EmailView;