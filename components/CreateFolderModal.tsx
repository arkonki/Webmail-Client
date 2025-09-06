
import React, { useState } from 'react';
import { Folder } from '../types';
import useFocusTrap from '../hooks/useFocusTrap';

interface CreateFolderModalProps {
  folders: Folder[];
  onClose: () => void;
  onCreate: (folderName: string, parentPath: string | null) => void;
}

const flattenFoldersForSelect = (folders: Folder[], level = 0): { folder: Folder, level: number }[] => {
    let flatList: { folder: Folder, level: number }[] = [];
    folders.forEach(folder => {
        flatList.push({ folder, level });
        if (folder.children && folder.children.length > 0) {
            flatList = flatList.concat(flattenFoldersForSelect(folder.children, level + 1));
        }
    });
    return flatList;
};

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ folders, onClose, onCreate }) => {
  const [folderName, setFolderName] = useState('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const modalRef = useFocusTrap<HTMLFormElement>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreate(folderName.trim(), parentPath);
    }
  };

  const folderOptions = flattenFoldersForSelect(folders);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" aria-modal="true" role="dialog">
      <form ref={modalRef} onSubmit={handleSubmit} className="flex flex-col w-full max-w-md bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <header className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b rounded-t-lg dark:bg-gray-700 dark:border-gray-600">
          <h2 className="text-lg font-semibold" id="create-folder-modal-title">Create New Folder</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl leading-none" aria-label="Close">&times;</button>
        </header>
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Folder Name
            </label>
            <input
              id="folderName"
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="parentFolder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <select
              id="parentFolder"
              value={parentPath || ''}
              onChange={(e) => setParentPath(e.target.value || null)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">(top level)</option>
              {folderOptions.map(({ folder, level }) => (
                <option key={folder.path} value={folder.path}>
                  {'\u00A0'.repeat(level * 4)}{folder.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <footer className="flex justify-end px-4 py-3 bg-gray-100 border-t dark:bg-gray-700 dark:border-gray-600 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 mr-2 font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!folderName.trim()}
            className="px-6 py-2 font-semibold text-white rounded-md bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            Create
          </button>
        </footer>
      </form>
    </div>
  );
};

export default React.memo(CreateFolderModal);