
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import useLocalStorage from '../hooks/useLocalStorage';
import useFocusTrap from '../hooks/useFocusTrap';
import { SIGNATURE_STORAGE_KEY_BASE } from '../constants';
import DOMPurify from 'dompurify';

const SignatureModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
  const { user } = useAuth();
  const SIGNATURE_KEY = `${SIGNATURE_STORAGE_KEY_BASE}_${user?.email || 'default'}`;
  const [signature, setSignature] = useLocalStorage(SIGNATURE_KEY, '');
  const editorRef = useRef<HTMLDivElement>(null);
  const modalRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    if (editorRef.current) {
      // Sanitize the signature from localStorage before rendering it for editing
      editorRef.current.innerHTML = DOMPurify.sanitize(signature);
    }
  }, []); // Run only on mount

  const handleSave = () => {
    // The content is sanitized on its way out to storage as well for good measure.
    setSignature(DOMPurify.sanitize(editorRef.current?.innerHTML || ''));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" aria-modal="true" role="dialog">
      <div ref={modalRef} className="flex flex-col w-full max-w-lg bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <header className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b rounded-t-lg dark:bg-gray-700 dark:border-gray-600">
          <h2 className="text-lg font-semibold" id="signature-modal-title">Edit Email Signature</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl leading-none" aria-label="Close">&times;</button>
        </header>
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Create your signature below. It can be inserted into new emails.</p>
          <div
            ref={editorRef}
            contentEditable
            dangerouslySetInnerHTML={{ __html: signature }}
            className="w-full h-40 p-2 border rounded-md bg-white dark:bg-gray-900 dark:border-gray-600 resize-y overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Signature editor"
          />
        </div>
        <footer className="flex justify-end px-4 py-3 bg-gray-100 border-t dark:bg-gray-700 dark:border-gray-600 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 mr-2 font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 font-semibold text-white rounded-md bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">Save</button>
        </footer>
      </div>
    </div>
  );
};

export default React.memo(SignatureModal);