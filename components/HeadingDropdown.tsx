'use client';

import { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import styles from './HeadingDropdown.module.scss';

interface HeadingDropdownProps {
  editor: Editor;
}

const HeadingDropdown = ({ editor }: HeadingDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'H1';
    if (editor.isActive('heading', { level: 2 })) return 'H2';
    if (editor.isActive('heading', { level: 3 })) return 'H3';
    if (editor.isActive('heading', { level: 4 })) return 'H4';
    return 'Paragraph';
  };

  const headings = [
    { level: null, label: 'Paragraph', icon: 'P' },
    { level: 1, label: 'Heading 1', icon: 'H1' },
    { level: 2, label: 'Heading 2', icon: 'H2' },
    { level: 3, label: 'Heading 3', icon: 'H3' },
    { level: 4, label: 'Heading 4', icon: 'H4' },
  ];

  const handleSelect = (level: number | null) => {
    if (level === null) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run();
    }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentHeading = getCurrentHeading();

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.dropdownButton} ${editor.isActive('heading') ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{currentHeading}</span>
        <span className={styles.chevron}>▼</span>
      </button>
      {isOpen && (
        <div className={styles.dropdownMenu}>
          {headings.map((heading) => (
            <button
              key={heading.label}
              type="button"
              className={`${styles.menuItem} ${
                (heading.level === null && !editor.isActive('heading'))
                || (heading.level !== null && editor.isActive('heading', { level: heading.level }))
                  ? styles.isSelected
                  : ''
              }`}
              onClick={() => handleSelect(heading.level)}
            >
              <span className={styles.menuIcon}>{heading.icon}</span>
              <span className={styles.menuLabel}>{heading.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HeadingDropdown;
