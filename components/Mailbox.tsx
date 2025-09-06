import React, { useState, useEffect, useCallback } from 'react';
import FolderList from './FolderList';
import EmailList from './EmailList';
import EmailView from './EmailView';
import ComposeModal from './ComposeModal';
import SignatureModal from './SignatureModal';
import CreateFolderModal from './CreateFolderModal';
import { Email, ComposeInitialData, ComposeAction, Conversation } from '../types';
import { useAuth } from '../hooks/useAuth';
import { PencilIcon } from './icons/PencilIcon';
import { SunIcon } from './icons/SunIcon';
import { MoonIcon } from './icons/MoonIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { MenuIcon } from './icons/MenuIcon';
import { format } from 'date-fns';
import { useMailbox } from '../hooks/useMailbox';

type MobileView = 'folders' | 'conversations' | 'email';

const Mailbox: React.FC<{ toggleTheme: () => void; currentTheme: string; }> = ({ toggleTheme, currentTheme }) => {
  const { user, logout } = useAuth();
  
  const { fetchFolders, selectFolder, setUser, createFolder, folders } = useMailbox(state => ({
      fetchFolders: state.fetchFolders,
      selectFolder: state.selectFolder,
      setUser: state.setUser,
      createFolder: state.createFolder,
      folders: state.folders,
  }));
  const selectedFolder = useMailbox(state => state.selectedFolder);
  const selectConversationAction = useMailbox(state => state.selectConversation);
  
  const [isComposing, setIsComposing] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState<ComposeInitialData | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('folders');

  useEffect(() => {
    setUser(user);
  }, [user, setUser]);
  
  useEffect(() => {
    fetchFolders().then((fetchedFolders) => {
        const inbox = fetchedFolders.find(f => f.path === 'Inbox');
        if (inbox) {
            selectFolder(inbox);
        } else if (fetchedFolders.length > 0) {
            selectFolder(fetchedFolders[0]);
        }
    });
  }, [fetchFolders, selectFolder]);
  
  useEffect(() => {
    if (selectedFolder) setMobileView('conversations');
  }, [selectedFolder]);

  const handleSelectConversation = (conv: Conversation) => {
      selectConversationAction(conv);
      setMobileView('email');
  };
  
  const handleComposeAction = (action: ComposeAction, email: Email) => {
    let to = '';
    let subject = '';
    const originalSender = `${email.from.name} <${email.from.email}>`;
    const allRecipients = [ email.from, ...email.to.filter(t => t.email !== user?.email) ].map(r => `${r.name} <${r.email}>`);
    const uniqueRecipients = [...new Set(allRecipients)];

    switch (action) {
      case 'reply': to = originalSender; subject = `Re: ${email.subject.replace(/^(Re: |Fwd: )+/i, '')}`; break;
      case 'reply-all': to = uniqueRecipients.join(', '); subject = `Re: ${email.subject.replace(/^(Re: |Fwd: )+/i, '')}`; break;
      case 'forward': to = ''; subject = `Fwd: ${email.subject.replace(/^(Re: |Fwd: )+/i, '')}`; break;
    }
    
    const quotedBody = `<br><blockquote style="border-left: 2px solid #ccc; margin-left: 5px; padding-left: 10px; color: #6b7280;"><p>On ${format(new Date(email.date), 'MMM d, yyyy \'at\' p')}, ${email.from.name} &lt;${email.from.email}&gt; wrote:</p>${email.body}</blockquote>`;
    setComposeInitialData({ action, to, subject, body: quotedBody });
    setIsComposing(true);
  };

  const handleCreateFolder = async (folderName: string, parentPath: string | null) => {
      const success = await createFolder(folderName, parentPath);
      if (success) {
          setIsCreateFolderModalOpen(false);
      } else {
          alert("Folder with that name already exists in this location.");
      }
  };
  
  // Memoized handlers to prevent re-rendering of memoized modal components
  const handleOpenSignatureModal = useCallback(() => setIsSignatureModalOpen(true), []);
  const handleCloseSignatureModal = useCallback(() => setIsSignatureModalOpen(false), []);
  const handleOpenCreateFolderModal = useCallback(() => setIsCreateFolderModalOpen(true), []);
  const handleCloseCreateFolderModal = useCallback(() => setIsCreateFolderModalOpen(false), []);

  const handleOpenComposeModal = useCallback(() => {
    setComposeInitialData(null);
    setIsComposing(true);
  }, []);
  const handleCloseComposeModal = useCallback(() => {
    setIsComposing(false);
    setComposeInitialData(null);
  }, []);

  return (
      <div className="flex flex-col h-screen font-sans bg-gray-100 dark:bg-gray-900">
        <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center">
            <button onClick={() => setMobileView('folders')} className="lg:hidden p-2 -ml-2 mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <MenuIcon />
            </button>
            <div className="text-xl font-bold text-primary-600 dark:text-primary-400">Mail</div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">{user?.email}</span>
            <button onClick={handleOpenSignatureModal} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Settings"><SettingsIcon /></button>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Toggle theme">{currentTheme === 'light' ? <MoonIcon /> : <SunIcon />}</button>
            <button onClick={logout} className="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400 px-2 py-1">Logout</button>
          </div>
        </header>
        <div className="flex flex-1 min-h-0">
          <div className={`flex-shrink-0 w-full lg:w-64 p-4 bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out ${mobileView === 'folders' ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 absolute lg:static h-full lg:h-auto z-20`}>
            <button onClick={handleOpenComposeModal} className="flex items-center justify-center w-full px-4 py-2 mb-4 font-semibold text-white rounded-full bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <PencilIcon /><span className="ml-2">Compose</span>
            </button>
            <div className="flex-1 overflow-y-auto">
              <FolderList onCreateFolder={handleOpenCreateFolderModal} />
            </div>
          </div>
          <div className={`flex-shrink-0 w-full lg:w-96 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-transform duration-300 ease-in-out ${mobileView === 'conversations' ? 'translate-x-0' : mobileView === 'folders' ? 'translate-x-full' : '-translate-x-full'} lg:translate-x-0 absolute lg:static h-full lg:h-auto z-10`}>
            {selectedFolder ? <EmailList key={selectedFolder.path} onSelectConversation={handleSelectConversation} /> : <div className="hidden lg:flex items-center justify-center h-full text-gray-500">Select a folder to see emails.</div>}
          </div>
          <main className={`flex-1 min-w-0 overflow-y-auto transition-transform duration-300 ease-in-out ${mobileView === 'email' ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 absolute lg:static h-full w-full lg:h-auto lg:w-auto`}>
            <EmailView onComposeAction={handleComposeAction} onBack={() => setMobileView('conversations')} />
          </main>
        </div>
        {isComposing && <ComposeModal onClose={handleCloseComposeModal} initialData={composeInitialData} />}
        {isSignatureModalOpen && <SignatureModal onClose={handleCloseSignatureModal} />}
        {isCreateFolderModalOpen && <CreateFolderModal folders={folders} onClose={handleCloseCreateFolderModal} onCreate={handleCreateFolder} />}
      </div>
  );
};

export default Mailbox;
