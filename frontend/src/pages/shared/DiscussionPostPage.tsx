import { useState, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { AnimatedWrapper } from "../../components/shared/AnimatedComponents";
import { useToast, Card, Button } from "../../components/ui";
import { useAppContext } from "../../context/AppContext";
import { api, BASE } from "../../services/api";
import type { DiscussionPost } from "../../types";
import io from "socket.io-client";

const socket = io(`${BASE}/discussion`);

const DiscussionPostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const { users, currentUser } = useAppContext();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  const [post, setPost] = useState<DiscussionPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const author = users.find((u) => (u._id || u.id) === post?.authorId);

  const [replyContent, setReplyContent] = useState("");
  const replyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedPost = await api.getPost(postId!);

        setPost(fetchedPost);
      } catch (error: any) {
        console.error("Failed to fetch post:", error);
        setError(error.message || "Failed to load post.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  useEffect(() => {
    socket.on("newReply", (newReply) => {
      setPost((prevPost) => {
        if (!prevPost) return null;

        return { ...prevPost, replies: [...prevPost.replies, newReply] };
      });
    });

    return () => {
      socket.off("newReply");
    };
  }, []);

  const handleAddReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyContent.trim()) {
      addToast("Reply cannot be empty.", "error");
      return;
    }

    const newReply = {
      authorId: (currentUser!._id || currentUser!.id) as string,
      content: replyContent,
      createdAt: new Date().toISOString(), // Optimistic creation date
      _id: `temp-${Date.now()}`, // Temporary ID for optimistic UI
    };

    // Optimistically update UI

    setReplyContent("");
    addToast("Reply added!", "success");

    try {
      // Send to API
      await api.addReply(postId!, {
        authorId: (currentUser!._id || currentUser!.id) as string,
        content: newReply.content,
      });
      // Re-fetch post to get server-generated _id and accurate createdAt
      // await fetchPost();
    } catch (error) {
      console.error("Failed to add reply:", error);
      addToast("Failed to add reply. Please try again.", "error");
      // Revert optimistic update on error
      setPost((prevPost) => {
        if (!prevPost) return null;
        return {
          ...prevPost,
          replies: prevPost.replies.filter(
            (reply) => reply._id !== newReply._id
          ),
        };
      });
    }
  };

  // If navigated with ?reply=1, focus the reply box
  useEffect(() => {
    if (searchParams.get("reply") === "1" && replyTextareaRef.current) {
      replyTextareaRef.current.focus();
      replyTextareaRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
        <Card>
          <div className="flex justify-center items-center p-12">
            <div className="w-12 h-12 border-8 border-[var(--nb-blue)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </Card>
      </AnimatedWrapper>
    );
  }

  if (error) {
    return (
      <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6 text-red-600 bg-red-100 border-4 border-black font-black uppercase text-xl">
            {error}
        </Card>
      </AnimatedWrapper>
    );
  }

  if (!post || !author) {
    return (
      <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6 text-yellow-800 bg-yellow-100 border-4 border-black font-black uppercase text-xl">
            Post not found or author data missing.
        </Card>
      </AnimatedWrapper>
    );
  }

  return (
    <AnimatedWrapper className="max-w-4xl mx-auto space-y-6">
      <Card className="border-4 border-black p-8 bg-[var(--nb-yellow)] shadow-[var(--shadow-md)]">
        <h2 className="text-4xl font-black uppercase text-black mb-4">{post.title}</h2>
        <p className="text-sm font-bold uppercase text-black opacity-80 bg-white inline-block px-3 py-1 border-2 border-black mb-6">
          Posted by <span className="font-black">{author.name}</span> on{" "}
          {new Date(post.createdAt).toLocaleString()}
        </p>
        <div className="mt-8 text-xl font-bold text-black bg-white p-6 border-4 border-black shadow-inner">
          <p className="whitespace-pre-wrap">{post.content}</p>
        </div>
      </Card>
      <Card className="border-4 border-black p-8 shadow-[var(--shadow-sm)] bg-white mt-8">
        <h3 className="text-3xl font-black uppercase text-black mb-6 border-b-4 border-black pb-4">
          Replies ({post.replies.length})
        </h3>
        <div className="space-y-6">
          {post.replies
            .slice()
            .sort(
              (a, b) =>
                new Date(a.createdAt as any).getTime() -
                new Date(b.createdAt as any).getTime()
            )
            .map((reply) => {
              const replyAuthor = users.find(
                (u) => (u._id || u.id) === reply.authorId
              );
              return (
                <div
                  key={(reply as any)._id || reply.id}
                  className="p-6 border-4 border-black bg-[var(--nb-pink)] group hover:translate-x-1 hover:translate-y-1 transition-all shadow-[4px_4px_0_0_#000]"
                >
                  <p className="text-xl font-bold text-black mb-4 whitespace-pre-wrap">{reply.content}</p>
                  <p className="text-sm font-black uppercase text-black bg-white inline-block px-2 py-1 border-2 border-black">
                    -- {replyAuthor?.name || "Unknown"},{" "}
                    {new Date(reply.createdAt as any).toLocaleString()}
                  </p>
                </div>
              );
            })}
          {post.replies.length === 0 && (
            <p className="text-xl font-black uppercase text-black opacity-60 text-center py-8">
              No replies yet. Be the first to respond!
            </p>
          )}
        </div>
      </Card>
      <Card className="border-4 border-black p-8 shadow-[var(--shadow-sm)] bg-white mt-8 mb-[20vh]">
        <h3 className="text-2xl font-black uppercase text-black mb-6">Add Your Reply</h3>
        <form onSubmit={handleAddReply} className="space-y-6">
          <textarea
            ref={replyTextareaRef}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={4}
            className="w-full p-4 border-4 border-black font-bold focus:outline-none focus:translate-x-[-2px] focus:translate-y-[-2px] focus:shadow-[var(--shadow-sm)] transition-all bg-white"
            placeholder="Share your thoughts..."
          />
          <div className="text-right">
            <Button type="submit" className="px-8 py-4 text-lg border-4 border-black bg-[var(--nb-blue)] text-white shadow-[var(--shadow-sm)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none font-black uppercase">Post Reply</Button>
          </div>
        </form>
      </Card>
    </AnimatedWrapper>
  );
};

export default DiscussionPostPage;
