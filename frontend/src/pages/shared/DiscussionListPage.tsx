import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../components/ui";
import {
  AnimatedWrapper,
  StaggeredList,
} from "../../components/shared/AnimatedComponents";
import { Button, Card, Modal } from "../../components/ui";
import { PlusCircleIcon } from "../../components/Icons";
import { api } from "../../services/api";

const DiscussionListPage = () => {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [discussionPosts, setDiscussionPosts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user ID (handle both _id and id)
  const currentUserId = currentUser?._id || currentUser?.id;

  // Fetch discussion posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const posts = await api.getPosts();

        // Sort posts by creation date (newest first)
        const sortedPosts = (posts || []).sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setDiscussionPosts(sortedPosts);
      } catch (err) {
        console.error("Failed to fetch discussion posts:", err);
        setError("Failed to load discussions. Please try again later.");
        setDiscussionPosts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.getUsers();
        setUsers(response || []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };

    fetchUsers();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPostTitle.trim() || !newPostContent.trim()) {
      addToast("Title and content cannot be empty.", "error");
      return;
    }

    if (!currentUserId) {
      addToast("You must be logged in to create a post.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await api.addPost({
        title: newPostTitle,
        content: newPostContent,
        authorId: currentUserId,
      } as any);

      const newPost = {
        ...created,
        id: created._id || created.id,
        _id: created._id || created.id,
      };

      setDiscussionPosts((prev) => [newPost, ...prev]);
      addToast("Post created successfully!", "success");

      // Reset form and close modal
      setIsModalOpen(false);
      setNewPostTitle("");
      setNewPostContent("");
    } catch (err) {
      console.error("Failed to create post:", err);
      addToast("Failed to create post. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center border-b-4 border-black pb-4">
        <h2 className="text-4xl font-black uppercase text-black">Discussions</h2>
        <Button onClick={() => setIsModalOpen(true)} className="px-6 py-4 text-lg">
          <PlusCircleIcon className="w-6 h-6 mr-2 inline-block" /> New Post
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <div className="w-12 h-12 border-8 border-[var(--nb-blue)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 bg-red-100 border-4 border-black font-black uppercase text-xl">
            {error}
          </div>
        ) : discussionPosts.length > 0 ? (
          <StaggeredList className="space-y-6">
            {discussionPosts.map((post) => {
              const postId = post._id || post.id;
              const author = users.find(
                (u) => (u._id || u.id) === post.authorId
              );

              return (
                <div
                  key={postId}
                  className="p-6 border-4 border-black bg-white shadow-[var(--shadow-sm)] flex flex-col md:flex-row justify-between items-start md:items-center hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all gap-4"
                >
                  <div
                    className="cursor-pointer max-w-full md:max-w-[70%]"
                    onClick={() => navigate(`/discussions/${postId}`)}
                  >
                    <h3 className="text-2xl font-black uppercase text-black hover:underline mb-2">
                      {post.title}
                    </h3>
                    <p className="text-sm font-bold capitalize text-black opacity-80 bg-[var(--nb-yellow)] inline-block px-2 border-2 border-black">
                      By {author?.name || "Unknown"} on{" "}
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-center p-3 border-4 border-black bg-[var(--nb-pink)]">
                      <p className="font-black text-2xl text-black">
                        {post.replies?.length || 0}
                      </p>
                      <p className="text-xs font-black uppercase text-black opacity-80">Replies</p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/discussions/${postId}?reply=1`)}
                      className="whitespace-nowrap bg-white border-4 border-black text-black text-lg py-3 px-6 shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              );
            })}
          </StaggeredList>
        ) : (
          <p className="text-center py-16 text-xl font-black uppercase text-black opacity-60">
            No discussions yet. Be the first to start one!
          </p>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create a New Post"
      >
        <form onSubmit={handleCreatePost} className="space-y-6">
          <div>
            <label
              htmlFor="post-title"
              className="block text-sm font-black uppercase mb-2 text-black"
            >
              Title
            </label>
            <input
              type="text"
              id="post-title"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              className="w-full p-4 border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all bg-white"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label
              htmlFor="post-content"
              className="block text-sm font-black uppercase mb-2 text-black"
            >
              Content
            </label>
            <textarea
              id="post-content"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={6}
              className="w-full p-4 border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all bg-white"
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
              className="px-8 py-3 text-lg bg-white border-4 border-black text-black shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="px-8 py-3 text-lg border-4 border-black bg-[var(--nb-yellow)] text-black shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
              {isSubmitting ? "Creating..." : "Create Post"}
            </Button>
          </div>
        </form>
      </Modal>
    </AnimatedWrapper>
  );
};

export default DiscussionListPage;
