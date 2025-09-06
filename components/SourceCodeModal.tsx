
import React from 'react';
import useFocusTrap from '../hooks/useFocusTrap';

interface SourceCodeModalProps {
  emailBody: string;
  onClose: () => void;
}

const SourceCodeModal: React.FC<SourceCodeModalProps> = ({ emailBody, onClose }) => {
  const modalRef = useFocusTrap<HTMLDivElement>();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-60" aria-modal="true" role="dialog">
      <div ref={modalRef} className="flex flex-col w-full max-w-3xl h-3/4 bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <header className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b rounded-t-lg dark:bg-gray-700 dark:border-gray-600">
          <h2 className="text-lg font-semibold" id="source-code-modal-title">Email Source Code</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl leading-none" aria-label="Close">&times;</button>
        </header>
        <div className="p-4 flex-1 overflow-auto">
          <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-md whitespace-pre-wrap break-all">
            <code className="font-mono text-gray-800 dark:text-gray-300">
                {emailBody}
            </code>
          </pre>
        </div>
        <footer className="flex justify-end px-4 py-3 bg-gray-100 border-t dark:bg-gray-700 dark:border-gray-600 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default React.memo(SourceCodeModal);