import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  C, SectionHeader, HScroll, FilterChip, Skeleton,
  EmptyState, fmtNum, VerifiedBadge,
} from "../components/ui/index";
import { useApp } from "../context/AppContext";
import { videoAPI, followAPI, likeAPI, historyAPI, supabase } from "../lib/supabase";
import { useIsMobile } from "../hooks/index";
import VideoCard from "../components/VideoCard";

// ─────────────────────────────────────────────────────────────────────────────
// AD UNITS (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const MultiplexAdUnit = () => (
  <div style={{
    gridColumn: '1 / -1', margin: '20px 0', padding: '10px',
    background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333',
  }}>
    <span style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' }}>
      Recommended for You
    </span>
    <div id="ad-slot-12345" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY ICON MAP  — maps category name → emoji for display
// ─────────────────────────────────────────────────────────────────────────────
const CAT_ICONS = {
  music: "🎵", gaming: "🎮", sports: "⚽", news: "📰", comedy: "😂",
  education: "📚", technology: "💻", travel: "✈️", food: "🍕",
  fitness: "💪", fashion: "👗", beauty: "💄", science: "🔬",
  movies: "🎬", art: "🎨", business: "💼", health: "❤️",
  politics: "🏛️", nature: "🌿", animals: "🐾", diy: "🔧",
  finance: "💰", lifestyle: "☀️", kids: "🧒", cooking: "👨‍🍳",
};
const catIcon = (name = "") => CAT_ICONS[name.toLowerCase()] || "📂";
const catColor = (name = "") => {
  const palette = ["#7c6bfa", "#f472b6", "#34d399", "#60a5fa", "#fbbf24", "#fb7185", "#a78bfa", "#2dd4bf"];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return palette[h % palette.length];
};

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", background: C.bg3, border: `1px solid ${C.border}` }}>
      <Skeleton width="100%" height={0} style={{ aspectRatio: "16/9", height: "unset" }} />
      <div style={{ padding: 10 }}>
        <Skeleton width="80%" height={12} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={10} />
      </div>
    </div>
  );
}

function SkeletonUserCard() {
  return (
    <div style={{ flexShrink: 0, width: 130, padding: "20px 10px", background: C.bg3, borderRadius: 20, border: `1px solid ${C.border}`, textAlign: "center" }}>
      <Skeleton width={70} height={70} style={{ borderRadius: "50%", margin: "0 auto 12px" }} />
      <Skeleton width="70%" height={12} style={{ margin: "0 auto 8px" }} />
      <Skeleton width="50%" height={10} style={{ margin: "0 auto 12px" }} />
      <Skeleton width="100%" height={28} style={{ borderRadius: 10 }} />
    </div>
  );
}

function SkeletonCategoryChip() {
  return <Skeleton width={80} height={32} style={{ borderRadius: 20, flexShrink: 0 }} />;
}

function SkeletonCategoryCard() {
  return (
    <div style={{ borderRadius: 16, padding: "18px 14px", background: C.bg3, border: `1px solid ${C.border}`, textAlign: "center" }}>
      <Skeleton width={40} height={40} style={{ borderRadius: "50%", margin: "0 auto 10px" }} />
      <Skeleton width="60%" height={12} style={{ margin: "0 auto 6px" }} />
      <Skeleton width="40%" height={10} style={{ margin: "0 auto" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY CARD (desktop grid)
// ─────────────────────────────────────────────────────────────────────────────
function CategoryCard({ name, onClick }) {
  const [hov, setHov] = useState(false);
  const color = catColor(name);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        background: hov ? color + "18" : C.card,
        border: `1.5px solid ${hov ? color + "88" : C.border}`,
        borderRadius: 16, padding: "18px 14px", textAlign: "center", cursor: "pointer",
        transition: "all .3s cubic-bezier(0.34,1.2,0.64,1)",
        transform: hov ? "translateY(-6px) scale(1.04)" : "none",
        boxShadow: hov ? `0 16px 40px rgba(0,0,0,.5),0 0 30px ${color}22` : `0 2px 8px rgba(0,0,0,.2)`,
        position: "relative", overflow: "hidden",
      }}
    >
      {hov && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%,${color}18 0%,transparent 70%)`, pointerEvents: "none" }} />}
      <div style={{ fontSize: 32, marginBottom: 10, transition: "transform .3s", transform: hov ? "scale(1.2) rotate(-5deg)" : "scale(1)", display: "inline-block", position: "relative", zIndex: 1 }}>
        {catIcon(name)}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: hov ? color : C.text, marginBottom: 3, transition: "color .3s", position: "relative", zIndex: 1, textTransform: "capitalize" }}>{name}</div>
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: `translateX(-50%) scaleX(${hov ? 1 : 0})`, width: "80%", height: 2, background: `linear-gradient(90deg,${color},${color}88)`, transition: "transform .3s ease", borderRadius: "99px 99px 0 0" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE CATEGORY STRIP  (horizontal scroll)
// ─────────────────────────────────────────────────────────────────────────────
function MobileCategoryStrip({ categories, loading, selectedCat, onSelect }) {
  if (loading) return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4, marginBottom: 8 }}>
      {Array(8).fill(0).map((_, i) => <SkeletonCategoryChip key={i} />)}
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4, marginBottom: 8 }}>
      {categories.map(name => {
        const color = catColor(name);
        const active = selectedCat === name;
        return (
          <div
            key={name} onClick={() => onSelect(name)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              flexShrink: 0, cursor: "pointer",
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: active ? color + "44" : color + "22",
              border: `1.5px solid ${active ? color : color + "44"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, transition: "all .2s",
              boxShadow: active ? `0 0 12px ${color}66` : "none",
            }}
              onTouchStart={e => e.currentTarget.style.transform = "scale(0.92)"}
              onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {catIcon(name)}
            </div>
            <span style={{ fontSize: 9, color: active ? color : C.muted, fontWeight: active ? 700 : 600, letterSpacing: .3, textTransform: "capitalize" }}>{name}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO BANNER  (pulls from trending data, no static dependency)
// ─────────────────────────────────────────────────────────────────────────────
function HeroBanner({ items }) {
  const { playVideo } = useApp();
  const isMobile = useIsMobile();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!items?.length) return;
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items?.length]);

  if (!items?.length) return (
    <div style={{ borderRadius: isMobile ? 0 : 20, overflow: "hidden", marginBottom: 24, height: isMobile ? 220 : 320, background: C.bg3, marginLeft: isMobile ? -12 : 0, marginRight: isMobile ? -12 : 0 }}>
      <Skeleton width="100%" height="100%" />
    </div>
  );

  const item = items[idx % items.length];
  return (
    <div style={{ position: "relative", borderRadius: isMobile ? 0 : 20, overflow: "hidden", marginBottom: 24, height: isMobile ? 220 : 320, background: C.bg3, marginLeft: isMobile ? -12 : 0, marginRight: isMobile ? -12 : 0 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${item.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.8, transition: "background-image .8s ease" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(3,3,8,.95) 0%,rgba(3,3,8,.5) 60%,transparent 100%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: isMobile ? 16 : 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>🔥 Featured</div>
        <h2 style={{ fontSize: isMobile ? 18 : 26, fontWeight: 900, marginBottom: 8, maxWidth: 480, color: C.text, lineHeight: 1.3 }}>{item.title}</h2>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
          {item.profiles?.display_name || item.channel || "Creator"} · {fmtNum(item.views || item.views || 0)} views
        </div>
        <button onClick={() => playVideo(item)} style={{ alignSelf: "flex-start", padding: "11px 28px", borderRadius: 999, background: `linear-gradient(135deg,${C.accent},${C.accent2})`, border: "none", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
          ▶ Watch Now
        </button>
      </div>
      {/* Dot indicators */}
      <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
        {items.map((_, i) => (
          <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 3, background: i === idx ? C.accent : "rgba(255,255,255,.3)", transition: "all .3s", cursor: "pointer" }} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO GRID  (unchanged ad injection logic)
// ─────────────────────────────────────────────────────────────────────────────
function VideoGrid({ videos, loading, isMobile }) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(260px,1fr))",
    gap: isMobile ? 10 : 14,
  };

  if (loading && !videos.length) return (
    <div style={gridStyle}>
      {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  return (
    <div style={gridStyle}>
      {videos.map((v, i) => (
        <React.Fragment key={v.id || i}>
          <VideoCard video={v} />
          {!isMobile && i === 3 && <MultiplexAdUnit />}
          {isMobile && i === 5 && <MultiplexAdUnit />}
          {isMobile && i === videos.length - 1 && videos.length > 6 && <MultiplexAdUnit />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW REQUEST TOAST
// ─────────────────────────────────────────────────────────────────────────────
function FollowRequestToast({ requests, onAccept, onReject, isMobile }) {
  if (!requests?.length) return null;
  return (
    <div style={{ position: "fixed", top: isMobile ? 60 : 70, right: isMobile ? 0 : 20, left: isMobile ? 0 : "auto", zIndex: 99999, display: "flex", flexDirection: "column", gap: 10, padding: isMobile ? "0 12px" : 0, pointerEvents: "none" }}>
      {requests.map(req => (
        <div key={req.id} style={{
          background: "rgba(15,15,25,0.97)", backdropFilter: "blur(20px)",
          border: `1px solid ${C.accent}44`, borderRadius: 16, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: `0 8px 32px rgba(0,0,0,.6),0 0 0 1px ${C.accent}22`,
          animation: "slideInToast 0.35s cubic-bezier(0.34,1.2,0.64,1)",
          pointerEvents: "all", maxWidth: isMobile ? "100%" : 360, width: isMobile ? "100%" : "auto",
        }}>
          <img src={req.sender_avatar} alt="" style={{ width: 42, height: 42, borderRadius: "50%", border: `2px solid ${C.accent}`, flexShrink: 0, objectFit: "cover" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>Follow Request</div>
            <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ color: C.accent, fontWeight: 600 }}>{req.sender_display_name || req.sender_username}</span>{" "}wants to follow you
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={() => onAccept(req)} style={{ padding: "6px 12px", borderRadius: 8, background: `linear-gradient(135deg,${C.accent},${C.accent2 || C.accent})`, border: "none", color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>✓ Accept</button>
            <button onClick={() => onReject(req)} style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,.07)", border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
          </div>
        </div>
      ))}
      <style>{`@keyframes slideInToast{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}

function UserFollowCard({ user, initialFollowed = false, initialRequested = false }) {
  const { session, setTab, setActiveProfile, setAuthModal, showToast } = useApp();

  // Use state for UI updates
  const [followed, setFollowed] = useState(initialFollowed);
  const [requested, setRequested] = useState(initialRequested);
  const [loading, setLoading] = useState(false);
  const [hov, setHov] = useState(false);
  const isMobile = useIsMobile();
  const username = user.username || "Anonymous";
  const avatar = user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  const handleFollow = async (e) => {
    // CRITICAL: Prevent event bubbling immediately
    e.preventDefault();
    e.stopPropagation();

    if (!session) return setAuthModal("login");
    if (loading || followed) return;

    // --- STEP 1: PURE OPTIMISTIC UPDATE ---
    // We toggle the requested state BEFORE any other logic
    const willBeRequested = !requested;
    setRequested(willBeRequested);

    // We don't wait for 'setLoading' to render to start the API call
    setLoading(true);

    try {
      if (!willBeRequested) {
        // Was requested, now canceling
        const res = await followAPI.cancelFollowRequest(session.user.id, user.id);
        if (res && res.success === false) {
          setRequested(true);
          showToast(res.message || "Failed to cancel", "error");
        }
      } else {
        // Was not requested, now sending
        await followAPI.sendFollowRequest(session.user.id, user.id);
      }
    } catch (err) {
      // REVERT ONLY ON ERROR
      setRequested(!willBeRequested);
      showToast("Connection error", "error");
    } finally {
      setLoading(false);
    }
  };

  // Pre-calculate styles to avoid "jank" during render
  const btnLabel = followed
    ? "✓ Following"
    : requested
      ? "⏳ Requested"
      : loading
        ? "..."
        : "+ Follow";

  const btnBg = followed ? C.bg3 : requested ? "rgba(255,255,255,.1)" : `linear-gradient(135deg,${C.accent},${C.accent2 || C.accent})`;

  return (
    <div
      onMouseEnter={() => !isMobile && setHov(true)} // Disable hov state on mobile
      onMouseLeave={() => !isMobile && setHov(false)}
      onClick={() => { setActiveProfile(user); setTab(`profile:${username}`); }}
      style={{
        flexShrink: 0, width: 130, padding: "20px 10px",
        background: (!isMobile && hov) ? C.bg3 : C.bg2, // Conditional background
        borderRadius: 20,
        border: `1px solid ${(!isMobile && hov) ? C.accent + "66" : C.border}`, // Conditional border
        textAlign: "center", cursor: "pointer",
        transition: "transform 0.2s ease, background 0.2s ease",
        // Remove translateY and scale on mobile
        transform: (!isMobile && hov) ? "translateY(-5px)" : "none",
        // Remove shadow on mobile
        boxShadow: (!isMobile && hov) ? "0 10px 20px rgba(0,0,0,.4)" : "none",
      }}
    >
      <div style={{ position: "relative", marginBottom: 12, display: "inline-block" }}>
        <img
          src={avatar}
          alt={username}
          style={{
            width: 70, height: 70, borderRadius: "50%",
            border: `2px solid ${followed ? "#4caf50" : C.accent}`,
            padding: 3, transition: "all 0.3s",
            // Remove avatar zoom on mobile
            transform: (!isMobile && hov) ? "scale(1.1)" : "scale(1)",
            objectFit: "cover"
          }}
        />
        {user.is_verified && (
          <div style={{ position: "absolute", bottom: 0, right: 0, background: C.bg, borderRadius: "50%", padding: 2 }}>
            <VerifiedBadge size={14} />
          </div>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {user.display_name || username}
      </div>

      <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>
        {fmtNum(user.followers_count || 0)} fans
      </div>

      <button
        onClick={handleFollow}
        disabled={loading || followed}
        style={{
          width: "100%", padding: "6px 0", borderRadius: 10, background: btnBg,
          border: (followed || requested) ? `1px solid ${C.border}` : "none",
          color: (followed || requested) ? C.muted : "white",
          fontSize: 11, fontWeight: 700,
          cursor: (loading || followed) ? "not-allowed" : "pointer",
          transition: "background 0.1s ease",
          opacity: loading ? 0.7 : 1,
          fontFamily: "inherit"
        }}
      >
        {btnLabel}
      </button>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
function UserSuggestions({ onSeeAll }) {
  const { session, authLoading } = useApp();
  const [ready, setReady] = useState(false);
  const [creators, setCreators] = useState([]);
  const [followingSet, setFollowingSet] = useState(new Set());
  const [requestedSet, setRequestedSet] = useState(new Set());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // START public fetch immediately, don't wait for auth
        const creatorsPromise = followAPI.getRandomCreators(30);

        // Only fetch private data if we actually have a session
        const uid = session?.user?.id;
        const followingPromise = uid ? followAPI.getFollowingIds(uid) : Promise.resolve([]);
        const pendingPromise = uid
          ? supabase.from("follow_requests")
            .select("recipient_id")
            .eq("sender_id", uid)
            .eq("status", "pending")
            .then(r => (r.data || []).map(x => x.recipient_id))
          : Promise.resolve([]);

        const [allCreators, followingIds, pendingReqs] = await Promise.all([
          creatorsPromise,
          followingPromise,
          pendingPromise
        ]);

        if (cancelled) return;

        const fSet = new Set(followingIds);
        const rSet = new Set(pendingReqs);
        const filtered = allCreators
          .filter(u => u.id !== uid && !fSet.has(u.id))
          .slice(0, 20);

        setCreators(filtered);
        setFollowingSet(fSet);
        setRequestedSet(rSet);
      } catch (err) {
        console.error("UserSuggestions load error:", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    // Only run if auth check is finished OR if we already have a session
    if (!authLoading || session?.user) {
      load();
    }

    return () => { cancelled = true; };
  }, [authLoading, session?.user?.id]);

  if (authLoading || !ready) return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 13, fontWeight: 800, paddingBottom: 12, marginBottom: 4, borderBottom: `1px solid ${C.border}`, color: C.text }}>🌟 Suggested Creators</div>
      <div style={{ display: "flex", gap: 15, overflowX: "auto", scrollbarWidth: "none", padding: "10px 0" }}>
        {Array(5).fill(0).map((_, i) => <SkeletonUserCard key={i} />)}
      </div>
    </div>
  );

  if (!creators.length) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionHeader title="🌟 Suggested Creators" action={onSeeAll} actionLabel="See all" />
      <div style={{ display: "flex", gap: 15, overflowX: "auto", scrollbarWidth: "none", padding: "10px 0" }}>
        {creators.map(user => (
          <UserFollowCard
            key={user.id}
            user={user}
            initialFollowed={followingSet.has(user.id)}
            initialRequested={requestedSet.has(user.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useFollowRequests HOOK  — realtime incoming follow request management
// ─────────────────────────────────────────────────────────────────────────────
function useFollowRequests(session, showToast) {
  const [pendingRequests, setPendingRequests] = useState([]);

  // Load existing pending on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    followAPI.getPendingRequests(session.user.id).then(setPendingRequests).catch(() => { });
  }, [session?.user?.id]);

  // Realtime subscription
  useEffect(() => {
    if (!session?.user?.id) return;
    const ch = followAPI.subscribeToFollowRequests(session.user.id, (newReq) => {
      setPendingRequests(prev => prev.find(r => r.id === newReq.id) ? prev : [newReq, ...prev]);
    });
    return () => supabase.removeChannel(ch);
  }, [session?.user?.id]);

  const handleAccept = useCallback(async (req) => {
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    try {
      await followAPI.acceptFollowRequest(req.id, req.sender_id, session.user.id);
      showToast(`✅ Now connected with ${req.sender_display_name || req.sender_username}!`, "success");
    } catch (err) {
      setPendingRequests(prev => [req, ...prev]);
      showToast("Failed to accept request", "error");
    }
  }, [session?.user?.id, showToast]);

  const handleReject = useCallback(async (req) => {
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    try {
      await followAPI.rejectFollowRequest(req.id);
    } catch { setPendingRequests(prev => [req, ...prev]); }
  }, []);

  return { pendingRequests, handleAccept, handleReject };
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER CHIPS
// ─────────────────────────────────────────────────────────────────────────────
const CONTENT_FILTERS = [
  { label: "All", value: "all" },
  { label: "🔥 Hot", value: "hot" },
  { label: "✨ New", value: "new" },
  { label: "👑 VIP", value: "vip" },
  { label: "Free", value: "free" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage({ tab }) {
  const { session, playVideo, setTab, showToast, authLoading } = useApp();
  const isMobile = useIsMobile();

  // ── Video state ───────────────────────────────────────────────────────────
  const [videos, setVideos] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState("all");
  const [catFilter, setCatFilter] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 12;

  // ── Category state (fetched from DB) ─────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // ── Infinite scroll sentinel ──────────────────────────────────────────────
  const sentinelRef = useRef(null);

  // ── Follow request system ─────────────────────────────────────────────────
  const { pendingRequests, handleAccept, handleReject } = useFollowRequests(session, showToast);

  // ── Pop-under ad (2 hr cap, unchanged) ────────────────────────────────────
  useEffect(() => {
    const handleGlobalClick = () => {
      const last = localStorage.getItem('last_pop_time');
      const now = Date.now();
      if (!last || (now - parseInt(last)) > 2 * 60 * 60 * 1000) {
        const win = window.open('https://your-direct-ad-link.com', '_blank');
        if (win) { window.focus(); localStorage.setItem('last_pop_time', now.toString()); window.removeEventListener('click', handleGlobalClick); }
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // ── Scroll to top on tab/filter change ────────────────────────────────────
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab, catFilter]); // Removed 'filter' from here

  // ── Saved video update event ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (tab === "saved" && !e.detail.isSaved) setVideos(prev => prev.filter(v => v.id !== e.detail.videoId));
    };
    window.addEventListener('video_save_updated', handler);
    return () => window.removeEventListener('video_save_updated', handler);
  }, [tab]);

  // ── Fetch categories from DB ──────────────────────────────────────────────
  useEffect(() => {
    setCategoriesLoading(true);
    videoAPI.getCategories()
      .then(cats => setCategories(cats))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, []);

  // ── Fetch trending for hero banner ────────────────────────────────────────
  useEffect(() => {
    if (tab === "home") {
      videoAPI.getTrending(8).then(setTrending).catch(() => { });
    }
  }, [tab]);

  const loadVideos = useCallback(async (reset = false) => {
    const isFirstLoad = reset;
    if (isFirstLoad) setLoading(true);
    else setLoadingMore(true);

    try {
      const nextPage = reset ? 0 : page;
      let data = [];

      // 1. HANDLE PRIVATE TABS (History / Saved)
      // These do not use the Universal Feed because they are private collections
      if (tab === "history") {
        if (session?.user?.id) {
          data = await historyAPI.getHistory(session.user.id);
        }
        setVideos(data);
        setHasMore(false);
        return;
      }

      if (tab === "saved") {
        if (session?.user?.id) {
          data = await likeAPI.getSaved(session.user.id);
        }
        setVideos(data);
        setHasMore(false);
        return;
      }

      // 2. UNIVERSAL FEED LOGIC (Home / Trending / New / Search)
      // This calls your PostgreSQL RPC which handles: 
      // Friends First -> Viral Fill -> Category Filter -> Content Filter (VIP/Hot/etc)
      data = await videoAPI.getUniversalFeed(
        session?.user?.id || null, // If null, the SQL automatically skips "Friends" tiers
        nextPage,
        LIMIT,
        catFilter, // Unique category from your DB
        filter     // 'all', 'hot', 'new', 'vip', 'free'
      );

      // 3. UPDATE STATE
      if (reset) {
        setVideos(data);
        setPage(1); // Next page will be 1
      } else {
        setVideos(prev => [...prev, ...data]);
        setPage(p => p + 1);
      }

      // If we got fewer videos than the LIMIT, we've reached the end
      setHasMore(data.length === LIMIT);

    } catch (err) {
      console.error("loadVideos error:", err);
      showToast("Failed to load feed", "error");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tab, page, session, catFilter, filter, LIMIT, showToast]);


  // Reset + reload when tab, catFilter, or the sub-filter changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    loadVideos(true);
  }, [tab, catFilter, filter]); // Added 'filter' here

  // ── IntersectionObserver for infinite scroll ──────────────────────────────
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loading && !loadingMore) loadVideos(false); },
      { rootMargin: "300px" }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, loadingMore, loadVideos]);

  // ── Client-side filter (hot/new/vip/free) applied to already-loaded videos ─
  // Replace the complex useMemo with a simple assignment
  const displayed = videos;

  // History handlers
  const handleDeleteHistory = async (e, historyId) => {
    e.stopPropagation();
    const { error } = await historyAPI.deleteHistoryItem(historyId);
    if (!error) setVideos(prev => prev.filter(v => v.historyId !== historyId));
  };
  const handleClearAll = async () => {
    if (window.confirm("Clear your entire watch history?")) {
      const { error } = await historyAPI.clearAllHistory(session.user.id);
      if (!error) setVideos([]);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Follow request toasts */}
      <FollowRequestToast requests={pendingRequests} onAccept={handleAccept} onReject={handleReject} isMobile={isMobile} />

      {/* Hero banner — only on home with no category filter */}
      {tab === "home" && !catFilter && <HeroBanner items={trending} />}

      {/* Active category badge */}
      {catFilter && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: C.bg3, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 20 }}>{catIcon(catFilter)}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text, textTransform: "capitalize" }}>{catFilter}</span>
          <button onClick={() => setCatFilter(null)} style={{ marginLeft: "auto", background: C.accent, border: "none", borderRadius: 999, color: "white", padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Clear ✕</button>
        </div>
      )}

      {tab === "home" && !catFilter && (
        <>
          {/* Suggested creators */}
          <UserSuggestions onSeeAll={() => setTab("channels")} />

          {/* Trending horizontal scroll */}
          {trending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <SectionHeader title="🔥 Trending Now" action={() => setTab("trending")} actionLabel="See all" />
              <HScroll hideArrows={isMobile}>
                {trending.map(v => <VideoCard key={v.id} video={v} cardWidth={isMobile ? 200 : 260} />)}
              </HScroll>
            </div>
          )}
        </>
      )}

      {/* Categories section — always DB-driven */}
      {tab === "home" && !catFilter && (
        <div style={{ marginBottom: 10 }}>
          <SectionHeader title="🏷 Browse Categories" action={() => { }} actionLabel="" />
          {isMobile
            ? <MobileCategoryStrip categories={categories} loading={categoriesLoading} selectedCat={catFilter} onSelect={cat => setCatFilter(cat === catFilter ? null : cat)} />
            : categoriesLoading
              ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10 }}>{Array(8).fill(0).map((_, i) => <SkeletonCategoryCard key={i} />)}</div>
              : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10 }}>
                {categories.slice(0, 12).map(name => (
                  <CategoryCard key={name} name={name} onClick={() => setCatFilter(name === catFilter ? null : name)} />
                ))}
              </div>
          }
        </div>
      )}

      {/* Category chips row — "All" and first item removed */}
      {categories.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginBottom: 8, paddingBottom: 4 }}>

          {/* 1. Re-added the "All" chip here */}
          <div
            onClick={() => setCatFilter(null)} // Setting to null shows all videos
            style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 20, cursor: "pointer",
              background: !catFilter ? C.accent + "33" : C.bg3,
              color: !catFilter ? C.accent : C.muted,
              border: `1px solid ${!catFilter ? C.accent : C.border}`,
              fontSize: 12, fontWeight: !catFilter ? 700 : 500,
              display: "flex", alignItems: "center", gap: 5,
              transition: "all .2s", whiteSpace: "nowrap",
            }}
          >
            <span>🎬</span>
            <span>All</span>
          </div>

          {/* 2. Your existing map (ensure .slice(1) is removed if you want the first DB item back) */}
          {(categoriesLoading ? [] : categories).map(name => {
            const active = catFilter === name;
            const color = catColor(name);
            return (
              <div key={name} onClick={() => setCatFilter(active ? null : name)} style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                background: active ? color + "33" : C.bg3,
                color: active ? color : C.muted,
                border: `1px solid ${active ? color : C.border}`,
                fontSize: 12, fontWeight: active ? 700 : 500,
                display: "flex", alignItems: "center", gap: 5,
                transition: "all .2s", whiteSpace: "nowrap",
              }}>
                <span>{catIcon(name)}</span>
                <span style={{ textTransform: "capitalize" }}>{name}</span>
              </div>
            );
          })}

          {categoriesLoading && Array(6).fill(0).map((_, i) => <SkeletonCategoryChip key={i} />)}
        </div>
      )}

      {/* Content filter chips (All / Hot / New / VIP / Free) */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginBottom: 20, marginTop: isMobile ? -10 : 0 }}>
        {CONTENT_FILTERS.map(f => (
          <FilterChip key={f.value} label={f.label} active={filter === f.value} onClick={() => setFilter(f.value)} />
        ))}
      </div>

      {/* Section header */}
      <div style={{ marginTop: isMobile && tab !== "home" ? 20 : 0, padding: isMobile ? "0 4px" : 0 }}>
        <SectionHeader
          title={
            tab === "history" ? "🕒 Watch History" :
              tab === "trending" ? "🔥 Trending Videos" :
                tab === "new" ? "✨ New Videos" :
                  tab === "saved" ? "❤️ Saved Videos" :
                    catFilter ? `${catIcon(catFilter)} ${catFilter}` : "🎬 All Videos"
          }
          action={tab === "history" && videos.length > 0 ? handleClearAll : null}
          actionLabel={tab === "history" && videos.length > 0 ? "Clear All" : null}
        />
      </div>

      {/* Empty state */}
      {!loading && displayed.length === 0 ? (
        <EmptyState
          emoji={tab === "saved" ? "💔" : tab === "history" ? "🕒" : "🔍"}
          title={tab === "saved" ? "No saved videos" : tab === "history" ? "No history yet" : "No videos found"}
        />
      ) : (
        <>
          {tab === "history" ? (
            loading && !videos.length
              ? <VideoGrid videos={[]} loading={true} isMobile={isMobile} />
              : <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill,minmax(280px,1fr))", gap: isMobile ? 10 : 20 }}>
                {displayed.map(video => (
                  <div key={video.historyId || video.id} style={{ position: "relative", cursor: "pointer" }} onClick={() => playVideo(video)}>
                    <button onClick={e => handleDeleteHistory(e, video.historyId)} style={{ position: "absolute", top: 8, left: 8, zIndex: 10, background: "rgba(0,0,0,.7)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✕</button>
                    <VideoCard video={video} />
                    <div style={{ marginTop: 8, padding: "0 4px" }}>
                      <div style={{ fontSize: 12, color: C.text, fontWeight: 600, marginBottom: 4 }}>{video.title}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted }}>
                        <span>{fmtNum(video.views || 0)} views</span>
                        <span>{video.watched_at ? new Date(video.watched_at).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          ) : (
            <VideoGrid videos={displayed} loading={loading && !videos.length} isMobile={isMobile} />
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} style={{ height: 1 }} />

          {/* Loading more indicator */}
          {loadingMore && (
            <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, animation: `pulse 1.2s ${i * .2}s infinite` }} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
