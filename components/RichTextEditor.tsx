'use client';

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import styles from "./RichTextEditor.module.scss";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
};

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
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
      Image,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // 同步外部 value（编辑已存在文章时）
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, false);
    }
    if (!value && current !== "<p></p>") {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
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
  };

  const addImage = () => {
    const url = window.prompt("Image URL");
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

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


