
import { useEffect, useRef } from 'react';

const useFocusTrap = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);

  useEffect(() => {
    const trapElement = ref.current;
    if (!trapElement) return;

    const focusableElements = trapElement.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [contenteditable], [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) { // Shift+Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else { // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    // Set initial focus
    firstElement.focus();

    trapElement.addEventListener('keydown', handleKeyDown);

    return () => {
      trapElement.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return ref;
};

export default useFocusTrap;