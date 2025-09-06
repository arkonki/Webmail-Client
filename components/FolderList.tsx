
import React from 'react';
import FolderItem from './FolderItem';
import { PlusIcon } from './icons/PlusIcon';
import { useMailbox } from '../hooks/useMailbox';
import { FolderSkeleton } from './skeletons/FolderSkeleton';

interface FolderListProps {
  onCreateFolder: () => void;
}

const FolderList: React.FC<FolderListProps> = ({ onCreateFolder }) => {
  const { folders, isLoadingFolders, selectFolder, selectedFolder } = useMailbox();

  if (isLoadingFolders) {
    return <FolderSkeleton />;
  }

  return (
    <nav>
      <ul>
        {folders.map((folder) => (
          <FolderItem
            key={folder.path}
            folder={folder}
            onSelectFolder={selectFolder}
            selectedFolderPath={selectedFolder?.path}
            level={0}
          />
        ))}
      </ul>
      <div className="mt-4">
        <button
          onClick={onCreateFolder}
          className="w-full flex items-center px-3 py-2 text-left rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors duration-150"
        >
          <PlusIcon />
          <span className="ml-3">New Folder</span>
        </button>
      </div>
    </nav>
  );
};

export default FolderList;