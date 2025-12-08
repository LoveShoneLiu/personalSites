'use client';

import { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/core';
import styles from './ListDropdown.module.scss';

interface ListDropdownProps {
  editor: Editor;
}

export default function ListDropdown({ editor }: ListDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getCurrentList = () => {
    if (editor.isActive('bulletList')) return 'Bullet List';
    if (editor.isActive('orderedList')) return 'Ordered List';
    if (editor.isActive('taskList')) return 'Task List';
    return 'List';
  };

  const lists = [
    { type: 'bullet', label: 'Bullet List', icon: '•' },
    { type: 'ordered', label: 'Ordered List', icon: '1.' },
    { type: 'task', label: 'Task List', icon: '☐' },
  ];

  const handleSelect = (type: string) => {
    // 先关闭当前活动的列表
    if (editor.isActive('bulletList')) {
      editor.chain().focus().toggleBulletList().run();
    }
    if (editor.isActive('orderedList')) {
      editor.chain().focus().toggleOrderedList().run();
    }
    if (editor.isActive('taskList')) {
      editor.chain().focus().toggleTaskList().run();
    }

    // 切换选中的列表类型
    if (type === 'bullet') {
      editor.chain().focus().toggleBulletList().run();
    } else if (type === 'ordered') {
      editor.chain().focus().toggleOrderedList().run();
    } else if (type === 'task') {
      editor.chain().focus().toggleTaskList().run();
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

  const currentList = getCurrentList();
  const isListActive = editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList');

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        type="button"
        className={`${styles.dropdownButton} ${isListActive ? styles.active : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{currentList}</span>
        <span className={styles.chevron}>▼</span>
      </button>
      {isOpen && (
        <div className={styles.dropdownMenu}>
          {lists.map((list) => {
            const isActive =
              (list.type === 'bullet' && editor.isActive('bulletList')) ||
              (list.type === 'ordered' && editor.isActive('orderedList')) ||
              (list.type === 'task' && editor.isActive('taskList'));

            return (
              <button
                key={list.type}
                type="button"
                className={`${styles.menuItem} ${isActive ? styles.isSelected : ''}`}
                onClick={() => handleSelect(list.type)}
              >
                <span className={styles.menuIcon}>{list.icon}</span>
                <span className={styles.menuLabel}>{list.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

