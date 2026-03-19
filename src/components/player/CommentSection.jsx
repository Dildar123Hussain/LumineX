import { useState, useEffect, useRef, useCallback } from "react";
import { C, Avatar, Spinner, timeAgo, fmtNum } from "../ui/index";
import { useApp } from "../../context/AppContext";
import { commentAPI } from "../../lib/supabase";
import { DUMMY_COMMENTS } from "../../data/theme";



function LikeBtn({ liked, count, onToggle, small }) {
  const [bounce, setBounce] = useState(false);
  const h = () => { onToggle(); setBounce(true); setTimeout(() => setBounce(false), 300); };
  return (
    <button onClick={h} style={{
      display: "flex", alignItems: "center", gap: 4,
      background: liked ? `${C.accent3}18` : "none",
      border: `1px solid ${liked ? "var(--accent3)55" : "transparent"}`,
      borderRadius: 20, padding: small ? "2px 7px" : "4px 10px",
      cursor: "pointer", transition: "all .2s",
      transform: bounce ? "scale(1.25)" : "scale(1)",
    }}>
      <span style={{ fontSize: small ? 12 : 14, transform: bounce ? "scale(1.3)" : "scale(1)", transition: "transform .2s", display: "block" }}>{liked ? "❤️" : "🤍"}</span>
      {count > 0 && <span style={{ fontSize: small ? 10 : 11, color: liked ? C.accent3 : C.muted, fontWeight: 600 }}>{fmtNum(count)}</span>}
    </button>
  );
}


function nestComments(allComments) {
  const map = {};
  const roots = [];

  // 1. Map everything first
  allComments.forEach(c => {
    map[c.id] = { ...c, replies: [] };
  });

  // 2. Link them
  allComments.forEach(c => {
    const parentId = c.parent_id || c.parentId;
    if (parentId) {
      // Find the "Root" parent (the one with no parent itself)
      let root = map[parentId];
      while (root && (root.parent_id || root.parentId)) {
        root = map[root.parent_id || root.parentId];
      }

      if (root) {
        root.replies.push(map[c.id]);
      } else {
        // Fallback: if root not found, treat as top level
        roots.push(map[c.id]);
      }
    } else {
      roots.push(map[c.id]);
    }
  });

  // Sort replies by date so the thread flows naturally
  roots.forEach(root => {
    root.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  });

  return roots;
}

function CommentInput({ videoId, parentId, placeholder, compact, autoFocus, onSuccess, onCancel, videoOwnerId }) {
  const { session, setAuthModal, profile } = useApp();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);

  const submit = async () => {
    if (!session) { setAuthModal("login"); return; }
    if (!text.trim()) return;
    setLoading(true);

    try {
      /**
       * FIX: Extract the username from the placeholder.
       * If the placeholder is "Reply to @username...", this splits by '@' 
       * and removes the trailing dots.
       */
      const replyTo = parentId && placeholder?.includes('@')
        ? placeholder.split('@')[1].replace('...', '').trim()
        : null;

      const data = await commentAPI.add({
        videoId,
        userId: session.user.id,
        body: text.trim(),
        parentId,
        videoOwnerId,
        reply_to_user: replyTo // Pass the extracted username to the API
      });

      setText("");
      setFocused(false);
      onSuccess?.(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!session && !compact) return (
    <div onClick={() => setAuthModal("login")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.bg3, border: `1px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", transition: "border-color .2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.bg4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
      <div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Sign in to comment</div><div style={{ fontSize: 11, color: C.muted }}>Join the conversation →</div></div>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: compact ? 8 : 10, alignItems: "flex-start" }}>
      {!compact && session && <Avatar profile={profile || { username: session.user.email?.split("@")[0] || "?" }} size={36} />}
      <div style={{ flex: 1 }}>
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { if (!text.trim()) setFocused(false); }}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
            if (e.key === "Escape") { setText(""); onCancel?.(); }
          }}
          placeholder={placeholder || "Add a comment…"}
          rows={focused ? 3 : 1}
          style={{
            width: "100%",
            background: C.bg3,
            border: `1.5px solid ${focused ? C.accent : C.border}`,
            borderRadius: 10,
            color: C.text,
            fontFamily: "inherit",
            fontSize: compact ? 12 : 13,
            padding: "10px 12px",
            outline: "none",
            resize: "none",
            transition: "all .2s",
            boxShadow: focused ? `0 0 0 3px ${C.accent}1a` : "none",
            lineHeight: 1.5
          }}
        />
        {(focused || text) && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8, alignItems: "center" }}>
            <span style={{ fontSize: 10, color: C.muted, marginRight: "auto" }}>Ctrl+Enter to post</span>
            <button
              onClick={() => { setText(""); setFocused(false); onCancel?.(); }}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "none", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!text.trim() || loading}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: text.trim() ? `linear-gradient(135deg,${C.accent},${C.accent2})` : C.bg3,
                color: text.trim() ? "white" : C.muted,
                fontSize: 12,
                cursor: text.trim() ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                fontWeight: 700,
                transition: "all .2s",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid white", borderTopColor: "transparent", animation: "spin .7s linear infinite" }} />
                  Posting...
                </>
              ) : "Post"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, videoId, videoOwnerId, likedIds, onLikeToggle, onDelete, onNewComment, depth = 0 }) {
  const { session, setActiveProfile, setTab,setPlayer,setIsPlaying } = useApp();
  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const pf = comment.profiles || {};
  const isRoot = depth === 0;

const handleProfileClick = (e, profileData) => {
  e.preventDefault();
  const identifier = profileData.username || profileData.id;
  if (identifier) {
    // This MUST match the startsWith("profile:") check in App.jsx
    setTab(`profile:${identifier}`); 
  }
};

  return (
    <div style={{ marginBottom: isRoot ? 16 : 8, paddingLeft: isRoot ? 0 : 44 }}>

 
      <div style={{ display: "flex", gap: 12, alignItems: 'flex-start' }}>
        <Avatar profile={pf} size={isRoot ? 32 : 24} />

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 700, marginRight: 6, color: C.text, cursor: 'pointer' }} onClick={(e) => handleProfileClick(e, pf)}>
              {pf.username}
            </span>

            {/* CLICKABLE MENTION */}
            {comment.reply_to_user && (
              <span
                onClick={(e) => handleProfileClick(e, { username: comment.reply_to_user })}
                style={{
                  color: C.accent,
                  fontWeight: 600,
                  marginRight: 6,
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
              >
                @{comment.reply_to_user}
              </span>
            )}

            <span style={{ color: C.text }}>{comment.body}</span>
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 4, alignItems: "center", opacity: 0.8 }}>
            <span style={{ fontSize: 11, color: C.muted }}>{timeAgo(comment.created_at)}</span>
            {comment.likes_count > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{comment.likes_count} likes</span>}
            <button
              onClick={() => setReplying(!replying)}
              style={{ background: 'none', border: 'none', color: C.muted, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
            >
              Reply
            </button>
            {session?.user?.id === comment.user_id && (
              <button onClick={() => onDelete(comment.id)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 11, cursor: 'pointer' }}>Delete</button>
            )}
          </div>

          {replying && (
            <div style={{ marginTop: 10 }}>
              <CommentInput
                videoId={videoId}
                parentId={comment.id}
                placeholder={`Reply to @${pf.username}...`}
                compact autoFocus
                onSuccess={data => {
                  setReplying(false);
                  setShowReplies(true);
                  // Ensure we pass the username for the mention
                  onNewComment({ ...data, reply_to_user: pf.username }, comment.id);
                }}
              />
            </div>
          )}

          {/* Rendering Replies logic remains the same... */}
          {isRoot && comment.replies?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {!showReplies ? (
                <button
                  onClick={() => setShowReplies(true)}
                  style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                >
                  <div style={{ width: 20, height: 1, background: C.border }} />
                  View {comment.replies.length} replies
                </button>
              ) : (
                <>
                  {comment.replies.map(reply => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      depth={1}
                      {...{ videoId, videoOwnerId, likedIds, onLikeToggle, onDelete, onNewComment }}
                    />
                  ))}
                  <button onClick={() => setShowReplies(false)} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, marginTop: 4, cursor: 'pointer', paddingLeft: 44 }}>
                    Hide replies
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ paddingTop: 4 }}>
          <LikeBtn liked={likedIds.includes(comment.id)} onToggle={() => onLikeToggle(comment.id, likedIds.includes(comment.id))} small />
        </div>
      </div>
    </div>
  );
}

export default function CommentSection({ videoId, videoOwnerId }) {
  const { session } = useApp();
  const [comments, setComments] = useState([]);
  const [likedIds, setLikedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [showCount, setShowCount] = useState(8);
  const subRef = useRef(null);

  const loadDummy = useCallback(() => {
    const dummies = DUMMY_COMMENTS.map(c => ({ ...c, video_id: videoId }));
    setComments(dummies);
    setLoading(false);
  }, [videoId]);


  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await commentAPI.getForVideo(videoId);



      // 1. Convert the flat database array into a tree structure
      const nestedData = nestComments(data);

      // 2. Filter dummies
      const dbIds = new Set(data.map(c => c.id));
      const dummies = DUMMY_COMMENTS
        .filter(c => !dbIds.has(c.id))
        .map(c => ({ ...c, video_id: videoId }));

      // 3. Update state with the merged tree
      setComments([...nestedData, ...dummies]);

      if (session && data.length > 0) {
        const allCommentIds = data.map(c => c.id);
        const liked = await commentAPI.getLikedIds(session.user.id, allCommentIds);
        setLikedIds(liked);
      }
    } catch (e) {
      console.error("Load error:", e);
      loadDummy();
    } finally {
      setLoading(false);
    }
  }, [videoId, session, loadDummy]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    subRef.current = commentAPI.subscribeToVideo(videoId, () => load());
    return () => { subRef.current?.unsubscribe(); };
  }, [videoId, load]);

  const handleLike = async (commentId, currentlyLiked) => {
    if (!session) return;
    setLikedIds(prev => currentlyLiked ? prev.filter(id => id !== commentId) : [...prev, commentId]);
    setComments(prev => updateCount(prev, commentId, currentlyLiked ? -1 : 1));
    await commentAPI.toggleLike(session.user.id, commentId, currentlyLiked);
  };

  const handleDelete = async (commentId) => {
    if (!session) return;
    setComments(prev => removeComment(prev, commentId));
    await commentAPI.delete(commentId, session.user.id);
  };

  // Optimistic add — shows immediately without reload
  const handleNewComment = useCallback((newComment, parentId = null) => {
    if (parentId) {
      setComments(prev => addReply(prev, parentId, newComment));
    } else {
      setComments(prev => [{ ...newComment, replies: [] }, ...prev]);
    }
  }, []);

  const sorted = [...comments].sort((a, b) =>
    sort === "top" ? (b.likes_count - a.likes_count) : (new Date(b.created_at) - new Date(a.created_at))
  );
  const displayed = sorted.slice(0, showCount);
  const totalReplies = comments.reduce((s, c) => s + (c.replies?.length || 0), 0);

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
        <div>
          <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: C.text }}>💬 Comments</span>
          <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 600, background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 99, padding: "2px 10px", color: C.muted }}>
            {comments.length + totalReplies}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["newest", "top"].map(s => (
            <button key={s} onClick={() => setSort(s)} style={{ padding: "5px 12px", borderRadius: 99, border: "none", background: sort === s ? C.accent : C.bg3, color: sort === s ? "white" : C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .2s", textTransform: "capitalize" }}>
              {s === "newest" ? "🕐 Newest" : "🔝 Top"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <CommentInput videoId={videoId} videoOwnerId={videoOwnerId} onSuccess={data => handleNewComment(data)} />
      </div>
      {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spinner /></div>
        : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>No comments yet</div>
            <div style={{ fontSize: 12 }}>Be the first to share your thoughts!</div>
          </div>
        ) : (
          <>
            <div>{displayed.map(c => <CommentItem key={c.id} comment={c} videoId={videoId} videoOwnerId={videoOwnerId} likedIds={likedIds} onLikeToggle={handleLike} onDelete={handleDelete} onNewComment={handleNewComment} />)}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }}>
              {showCount < comments.length && <button onClick={() => setShowCount(n => n + 6)} style={{ padding: "9px 22px", borderRadius: 99, border: `1px solid ${C.border}`, background: C.bg3, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}>Load more ↓</button>}
              {showCount > 8 && <button onClick={() => setShowCount(8)} style={{ padding: "9px 22px", borderRadius: 99, border: `1px solid ${C.border}`, background: "none", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Show less ↑</button>}
            </div>
          </>
        )}
    </div>
  );
}

function updateCount(comments, id, delta) {
  return comments.map(c => {
    if (c.id === id) return { ...c, likes_count: Math.max(0, (c.likes_count || 0) + delta) };
    if (c.replies?.length) return { ...c, replies: updateCount(c.replies, id, delta) };
    return c;
  });
}
function removeComment(comments, id) {
  return comments.filter(c => c.id !== id).map(c => c.replies?.length ? { ...c, replies: removeComment(c.replies, id) } : c);
}
function addReply(comments, parentId, reply) {
  return comments.map(c => {
    // If the comment IS the top-level parent, or the comment contains the reply chain
    if (c.id === parentId || (c.replies && c.replies.some(r => r.id === parentId))) {
      return { ...c, replies: [...(c.replies || []), { ...reply, replies: [] }] };
    }
    return c;
  });
}
