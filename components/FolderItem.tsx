
import React, { useState } from 'react';
import { Folder } from '../types';
import { InboxIcon } from './icons/InboxIcon';
import { SentIcon } from './icons/SentIcon';
import { DraftsIcon } from './icons/DraftsIcon';
import { TrashIcon } from './icons/TrashIcon';
import { SpamIcon } from './icons/SpamIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface FolderItemProps {
  folder: Folder;
  onSelectFolder: (folder: Folder) => void;
  selectedFolderPath?: string;
  level: number;
}

const FolderIcon: React.FC<{ folderPath: string }> = ({ folderPath }) => {
    const topLevelPath = folderPath.split('/')[0];
    switch (topLevelPath) {
        case 'Inbox': return <InboxIcon />;
        case 'Sent': return <SentIcon />;
        case 'Drafts': return <DraftsIcon />;
        case 'Trash': return <TrashIcon />;
        case 'Spam': return <SpamIcon />;
        default: return <InboxIcon />;
    }
};

const FolderItem: React.FC<FolderItemProps> = ({ folder, onSelectFolder, selectedFolderPath, level }) => {
  const [isExpanded, setIsExpanded] = useState(folder.path === 'Projects');

  const hasChildren = folder.children && folder.children.length > 0;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleSelect = () => {
    onSelectFolder(folder);
    if (hasChildren && !isExpanded) setIsExpanded(true);
  }

  return (
    <li>
      <button
        onClick={handleSelect}
        className={`w-full flex items-center justify-between pr-2 py-2 text-left rounded-lg text-sm font-medium transition-colors duration-150 group ${
          selectedFolderPath === folder.path
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200'
            : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
        style={{ paddingLeft: `${0.75 + level * 1.5}rem` }}
      >
        <div className="flex items-center flex-1 min-w-0">
          {hasChildren ? (
            <span onClick={handleToggleExpand} className="mr-1 p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
                {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </span>
          ) : (
            <span className="w-8"></span> 
          )}
          <FolderIcon folderPath={folder.path} />
          <span className="ml-3 truncate">{folder.name}</span>
        </div>
        {folder.unreadCount > 0 && (
          <span className="px-2 py-0.5 text-xs font-semibold text-white bg-primary-600 rounded-full ml-2 flex-shrink-0">
            {folder.unreadCount}
          </span>
        )}
      </button>
      {hasChildren && isExpanded && (
        <ul className="pl-0">
          {folder.children.map((childFolder) => (
            <FolderItem
              key={childFolder.path}
              folder={childFolder}
              onSelectFolder={onSelectFolder}
              selectedFolderPath={selectedFolderPath}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default React.memo(FolderItem);