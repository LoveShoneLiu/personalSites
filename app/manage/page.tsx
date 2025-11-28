'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginModal from "@/components/LoginModal";
import { parseTags, serializeTags } from "@/lib/utils";
import RichTextEditor from "@/components/RichTextEditor";
import styles from "./page.module.scss";

type Post = {
  id: number;
  title: string;
  description: string | null;
  content: string;
  imageUrl: string | null;
  tags: string | null;
  link: string | null;
  isPublished: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export default function ManagePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [link, setLink] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loggedIn = sessionStorage.getItem("adminLoggedIn") === "true";
    setIsLoggedIn(loggedIn);
    
    if (!loggedIn) {
      setShowLoginModal(true);
      setLoading(false);
    } else {
      fetchPosts();
    }
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/posts");
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    fetchPosts();
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminLoggedIn");
    sessionStorage.removeItem("adminUsername");
    setIsLoggedIn(false);
    setShowLoginModal(true);
  };

  const handleNewPost = () => {
    setEditingPost(null);
    setTitle("");
    setDescription("");
    setContent("");
    setImageUrl("");
    setTags([]);
    setTagInput("");
    setLink("");
    setIsPublished(true);
    setShowEditor(true);
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setTitle(post.title);
    setDescription(post.description || "");
    setContent(post.content);
    setImageUrl(post.imageUrl || "");
    setTags(parseTags(post.tags));
    setTagInput("");
    setLink(post.link || "");
    setIsPublished(post.isPublished);
    setShowEditor(true);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Title and content are required");
      return;
    }

    setSaving(true);

    try {
      const postData = {
        title: title.trim(),
        description: description.trim() || null,
        content: content.trim(),
        imageUrl: imageUrl.trim() || null,
        tags: serializeTags(tags),
        link: link.trim() || null,
        isPublished,
      };

      let response;
      if (editingPost) {
        response = await fetch(`/api/posts/${editingPost.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postData),
        });
      } else {
        response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postData),
        });
      }

      if (!response.ok) {
        throw new Error("Failed to save post");
      }

      await fetchPosts();
      setShowEditor(false);
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }

      await fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post");
    }
  };

  if (!isLoggedIn) {
    return (
      <>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleLoginSuccess}
        />
        <div className={styles.loginRequired}>
          <div className={styles.loginIcon}>🔒</div>
          <h2>Login Required</h2>
          <p>Please login to access the admin panel</p>
          <button
            className={styles.loginButton}
            onClick={() => setShowLoginModal(true)}
          >
            Login
          </button>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.managePage}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Blog Management</h1>
            <p className={styles.subtitle}>Create and manage your blog posts</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.newButton} onClick={handleNewPost}>
              ✏️ New Post
            </button>
            <button className={styles.logoutButton} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {showEditor ? (
          <div className={styles.editor}>
            <div className={styles.editorHeader}>
              <h2>{editingPost ? "Edit Post" : "New Post"}</h2>
              <button
                className={styles.closeEditor}
                onClick={() => setShowEditor(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.form}>
              <div className={styles.formGroup}>
                <label>Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the post"
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Image URL</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Tags</label>
                <div className={styles.tagInput}>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a tag and press Enter"
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className={styles.addTagButton}
                  >
                    Add
                  </button>
                </div>
                <div className={styles.tags}>
                  {tags.map((tag, idx) => (
                    <span key={idx} className={styles.tag}>
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)}>✕</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>External Link</label>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://example.com"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Content *</label>
                <RichTextEditor value={content} onChange={setContent} />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                  />
                  <span>Publish immediately</span>
                </label>
              </div>

              <div className={styles.formActions}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setShowEditor(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className={styles.saveButton}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingPost ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.postsList}>
            {posts.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📝</div>
                <h3>No posts yet</h3>
                <p>Create your first blog post to get started</p>
                <button className={styles.newButton} onClick={handleNewPost}>
                  Create Post
                </button>
              </div>
            ) : (
              <div className={styles.postsGrid}>
                {posts.map((post) => (
                  <div key={post.id} className={styles.postCard}>
                    <div className={styles.postHeader}>
                      <h3 className={styles.postTitle}>{post.title}</h3>
                      <span
                        className={`${styles.status} ${
                          post.isPublished ? styles.published : styles.draft
                        }`}
                      >
                        {post.isPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                    {post.description && (
                      <p className={styles.postDescription}>{post.description}</p>
                    )}
                    <div className={styles.postMeta}>
                      {post.tags && parseTags(post.tags).length > 0 && (
                        <div className={styles.postTags}>
                          {parseTags(post.tags).slice(0, 3).map((tag, idx) => (
                            <span key={idx} className={styles.postTag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={styles.postActions}>
                      <button
                        className={styles.editButton}
                        onClick={() => handleEditPost(post)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(post.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

