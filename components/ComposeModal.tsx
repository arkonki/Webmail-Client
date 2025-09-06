
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { sendEmail } from '../services/mailService';
import { TrashIcon } from './icons/TrashIcon';
import { FileIcon } from './icons/FileIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { SignatureIcon } from './icons/SignatureIcon';
import { useAuth } from '../hooks/useAuth';
import { ComposeInitialData } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';
import useFocusTrap from '../hooks/useFocusTrap';
import { DRAFT_STORAGE_KEY_BASE, SIGNATURE_STORAGE_KEY_BASE } from '../constants';
import DOMPurify from 'dompurify';

interface Draft {
    to: string;
    subject: string;
    body: string;
    attachmentNames: string[];
}

interface AttachmentWrapper {
    file: File;
    previewUrl?: string;
}

const ComposeModal: React.FC<{ onClose: () => void; initialData?: ComposeInitialData | null; }> = ({ onClose, initialData }) => {
  const { user } = useAuth();
  const DRAFT_KEY = `${DRAFT_STORAGE_KEY_BASE}_${user?.email || 'default'}`;
  const SIGNATURE_KEY = `${SIGNATURE_STORAGE_KEY_BASE}_${user?.email || 'default'}`;

  const [savedDraft, setSavedDraft] = useLocalStorage<Draft | null>(DRAFT_KEY, null);

  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentWrapper[]>([]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const modalRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    // Sanitize any initial content before setting it.
    const initialBodyContent = initialData?.body ? DOMPurify.sanitize(initialData.body) : (savedDraft?.body ? DOMPurify.sanitize(savedDraft.body) : '');
    
    setTo(initialData?.to || savedDraft?.to || '');
    setSubject(initialData?.subject || savedDraft?.subject || '');
    setBody(initialBodyContent);
    
    if (bodyRef.current) {
        bodyRef.current.innerHTML = initialBodyContent;
    }
  }, [initialData, savedDraft]);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentBody = bodyRef.current?.innerHTML || '';
      if (to || subject || currentBody || attachments.length > 0) {
        setSavedDraft({
          to,
          subject,
          body: DOMPurify.sanitize(currentBody), // Sanitize on write
          attachmentNames: attachments.map(att => att.file.name),
        });
      } else {
        setSavedDraft(null);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [to, subject, attachments, setSavedDraft]);

  useEffect(() => {
    return () => attachments.forEach(att => att.previewUrl && URL.revokeObjectURL(att.previewUrl));
  }, [attachments]);

  const handleSend = async () => {
    if (!to || !subject) {
      alert('Please fill in To and Subject fields.');
      return;
    }
    setIsSending(true);
    await sendEmail({ to, subject, body: DOMPurify.sanitize(bodyRef.current?.innerHTML || '') });
    setSavedDraft(null);
    setIsSending(false);
    onClose();
  };
  
  const handleDiscard = () => {
    setSavedDraft(null);
    onClose();
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newAttachmentWrappers = newFiles.map(file => ({ file, previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }));
      setAttachments(prev => [...prev, ...newAttachmentWrappers]);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (fileNameToRemove: string) => {
    setAttachments(prev => prev.filter(att => att.file.name !== fileNameToRemove));
  };

  const handleCommand = (e: React.MouseEvent, command: string) => {
    e.preventDefault();
    document.execCommand(command);
    bodyRef.current?.focus();
  };

  const handleInsertSignature = () => {
    const rawSignature = localStorage.getItem(SIGNATURE_KEY);
    const editor = bodyRef.current;
    if (!rawSignature || !editor) return;

    const sanitizedSignature = DOMPurify.sanitize(rawSignature);
    const signatureBlock = `<br><br>-- <br>${sanitizedSignature}`;
    // Check against sanitized content to prevent re-inserting
    if (editor.innerHTML.includes(sanitizedSignature)) return;

    editor.innerHTML += signatureBlock;
    editor.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    if (sel) {
      range.selectNodeContents(editor);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-0 sm:p-4 bg-black bg-opacity-50" aria-modal="true" role="dialog">
      <div ref={modalRef} className="flex flex-col w-full max-w-2xl h-full sm:h-3/4 bg-white rounded-t-lg shadow-xl dark:bg-gray-800">
        <header className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b rounded-t-lg dark:bg-gray-700 dark:border-gray-600">
          <h2 className="text-lg font-semibold" id="compose-modal-title">{subject || 'New Message'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl leading-none" aria-label="Close">&times;</button>
        </header>
        <div className="flex flex-col p-4 space-y-2 flex-1 min-h-0">
          <input type="email" placeholder="To" value={to} onChange={e => setTo(e.target.value)} className="w-full p-2 border-b bg-transparent focus:outline-none focus:border-primary-500 dark:border-gray-600" aria-label="Recipients" />
          <input type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-2 border-b bg-transparent focus:outline-none focus:border-primary-500 dark:border-gray-600" aria-label="Subject" />
          <div ref={bodyRef} contentEditable dangerouslySetInnerHTML={{ __html: body }} className="w-full flex-1 p-2 bg-transparent resize-none focus:outline-none overflow-y-auto" data-placeholder="Compose your email..." />
           {attachments.length > 0 && (
                <div className="px-1 py-2 border-t dark:border-gray-600">
                    <div className="flex flex-wrap gap-4 p-2 max-h-32 overflow-y-auto">
                        {attachments.map((att, index) => (
                            <div key={index} className="relative group w-24 h-24 flex-shrink-0">
                                {att.previewUrl ? <img src={att.previewUrl} alt={att.file.name} className="w-full h-full object-cover rounded-md border dark:border-gray-600" />
                                : <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-md p-2 border dark:border-gray-600"><FileIcon /><span className="text-xs text-center break-all w-full mt-1 line-clamp-2">{att.file.name}</span></div>}
                                <div className="absolute top-0 right-0 -m-1"><button onClick={() => handleRemoveAttachment(att.file.name)} className="bg-gray-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100" aria-label={`Remove ${att.file.name}`}>&times;</button></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
        <footer className="flex items-center justify-between px-4 py-3 bg-gray-100 border-t dark:bg-gray-700 dark:border-gray-600">
          <div className="flex items-center gap-2">
            <button onClick={handleSend} disabled={isSending} className="px-6 py-2 font-semibold text-white rounded-md bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 dark:disabled:bg-primary-800">{isSending ? 'Sending...' : 'Send'}</button>
            <label className="p-2 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600" title="Attach files">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <input type="file" multiple onChange={handleAttachmentChange} className="hidden" />
            </label>
            <button onMouseDown={e => { e.preventDefault(); handleInsertSignature(); }} className="p-2 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600" title="Insert Signature"><SignatureIcon /></button>
            <button onMouseDown={e => handleCommand(e, 'undo')} className="p-2 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600" title="Undo (Ctrl+Z)"><UndoIcon /></button>
            <button onMouseDown={e => handleCommand(e, 'redo')} className="p-2 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600" title="Redo (Ctrl+Y)"><RedoIcon /></button>
          </div>
          <button onClick={handleDiscard} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" aria-label="Discard draft" title="Discard draft"><TrashIcon /></button>
        </footer>
      </div>
    </div>
  );
};

export default ComposeModal;