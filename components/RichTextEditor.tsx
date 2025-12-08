'use client';

import { useEffect, useCallback, useRef, useState } from "react";
import { EditorContent, useEditor, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { ImageResize } from "./ImageResizeExtension";
import styles from "./RichTextEditor.module.scss";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
};

// 将文件转换为 base64 data URL
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const [mounted, setMounted] = useState(false);
  
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
      }),
      ImageResize.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file && editorRef.current) {
              fileToDataUrl(file).then((src) => {
                editorRef.current?.chain().focus().setImage({ src }).run();
              });
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          
          if (file.type.indexOf('image') !== -1 && editorRef.current) {
            event.preventDefault();
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            
            fileToDataUrl(file).then((src) => {
              if (coordinates && editorRef.current) {
                editorRef.current.chain().focus().setImage({ src }).run();
              }
            });
            return true;
          }
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  // 更新 editor ref
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  // 同步外部 value（编辑已存在文章时）
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    if (!value && current !== "<p></p>") {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter URL");
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const src = await fileToDataUrl(file);
          editor.chain().focus().setImage({ src }).run();
        } catch (error) {
          console.error('Error loading image:', error);
          alert('图片加载失败，请重试');
        }
      }
    };
    input.click();
  }, [editor]);

  // 在客户端挂载之前不渲染
  if (!mounted || !editor) {
    return (
      <div className={styles.editorWrapper}>
        <div className={styles.editorBody}>
          <div className={styles.loadingPlaceholder}>加载编辑器...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={editor.isActive("heading", { level: 1 }) ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            H1
          </button>
          <button
            type="button"
            className={editor.isActive("heading", { level: 2 }) ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </button>
          <button
            type="button"
            className={editor.isActive("heading", { level: 3 }) ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={editor.isActive("bold") ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            B
          </button>
          <button
            type="button"
            className={editor.isActive("italic") ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            I
          </button>
          <button
            type="button"
            className={editor.isActive("underline") ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            U
          </button>
          <button
            type="button"
            className={editor.isActive("strike") ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            S
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={editor.isActive("bulletList") ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            • List
          </button>
          <button
            type="button"
            className={editor.isActive("orderedList") ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </button>
          <button
            type="button"
            className={editor.isActive("blockquote") ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            ❝
          </button>
          <button
            type="button"
            className={editor.isActive("codeBlock") ? styles.active : ""}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            {"</>"}
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={editor.isActive("link") ? styles.active : ""}
            onClick={setLink}
          >
            Link
          </button>
          <button type="button" onClick={addImage}>
            Image
          </button>
        </div>

        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
          >
            ⤺
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
          >
            ⤻
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >
            Clear
          </button>
        </div>
      </div>

      <div className={styles.editorBody}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}


