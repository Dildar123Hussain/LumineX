import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { C, SectionHeader, HScroll, FilterChip, Skeleton, EmptyState, fmtNum, VerifiedBadge } from "../components/ui/index";
import { useApp } from "../context/AppContext";
import { videoAPI, followAPI, likeAPI, historyAPI, supabase } from "../lib/supabase";
import { useIsMobile, useInfiniteScroll } from "../hooks/index";
import VideoCard from "../components/VideoCard";
import { DEMO_VIDEOS, CATEGORIES } from "../data/theme";


const MultiplexAdUnit = () => (
  <div className="ad-grid-container" style={{
    gridColumn: '1 / -1',
    margin: '20px 0',
    padding: '10px',
    background: '#1a1a1a',
    borderRadius: '12px',
    border: '1px solid #333'
  }}>
    <span style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' }}>
      Recommended for You
    </span>
    <div id="ad-slot-12345"></div>
  </div>
);

// ── Animated Category Card ────────────────────────────────────────────────────
function CategoryCard({ cat, onClick }) {
  const [hov, setHov] = useState(false);
  const [ripple, setRipple] = useState(false);
  const handleClick = () => { setRipple(true); setTimeout(() => setRipple(false), 600); onClick(); };
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={handleClick}
      style={{
        background: hov ? cat.color + "18" : C.card,
        border: `1.5px solid ${hov ? cat.color + "88" : C.border}`,
        borderRadius: 16, padding: "18px 14px", textAlign: "center", cursor: "pointer",
        transition: "all .3s cubic-bezier(0.34,1.2,0.64,1)",
        transform: hov ? "translateY(-6px) scale(1.04)" : "none",
        boxShadow: hov ? `0 16px 40px rgba(0,0,0,.5), 0 0 30px ${cat.color}22` : `0 2px 8px rgba(0,0,0,.2)`,
        position: "relative", overflow: "hidden",
      }}>
      {ripple && <div style={{ position: "absolute", inset: 0, background: cat.color + "22", animation: "fadeIn .3s ease", borderRadius: 16 }} />}
      {hov && <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%,${cat.color}18 0%,transparent 70%)`, pointerEvents: "none" }} />}
      <div style={{ fontSize: 32, marginBottom: 10, transition: "transform .3s", transform: hov ? "scale(1.2) rotate(-5deg)" : "scale(1)", display: "inline-block", position: "relative", zIndex: 1 }}>{cat.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: hov ? cat.color : C.text, marginBottom: 3, transition: "color .3s", position: "relative", zIndex: 1 }}>{cat.name}</div>
      <div style={{ fontSize: 10, color: C.muted, position: "relative", zIndex: 1 }}>{cat.count} videos</div>
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: `translateX(-50%) scaleX(${hov ? 1 : 0})`, width: "80%", height: 2, background: `linear-gradient(90deg,${cat.color},${cat.color}88)`, transition: "transform .3s ease", borderRadius: "99px 99px 0 0" }} />
    </div>
  );
}

// ── Mobile category row ───────────────────────────────────────────────────────
function MobileCategoryStrip({ onSelect }) {
  return (
    <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4, marginBottom: 20 }}>
      {CATEGORIES.map(cat => (
        <div key={cat.name} onClick={() => onSelect(cat.name)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0, cursor: "pointer" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: cat.color + "22", border: `1.5px solid ${cat.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, transition: "transform .2s" }}
            onTouchStart={e => e.currentTarget.style.transform = "scale(0.92)"} onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}>
            {cat.icon}
          </div>
          <span style={{ fontSize: 9, color: C.muted, fontWeight: 600, letterSpacing: .3 }}>{cat.name}</span>
        </div>
      ))}
    </div>
  );
}

// ── Hero banner ───────────────────────────────────────────────────────────────
function HeroBanner() {
  const { playVideo } = useApp();
  const isMobile = useIsMobile();
  const [idx, setIdx] = useState(0);
  const heroes = useMemo(() => DEMO_VIDEOS.filter(v => v.likes_count > 50000).slice(0, 5), []);
  const item = heroes[idx];
  useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % heroes.length), 5000); return () => clearInterval(t); }, [heroes.length]);
  if (!item) return null;
  return (
    <div style={{ position: "relative", willChange: "contents", borderRadius: isMobile ? 0 : 20, overflow: "hidden", marginBottom: 24, height: isMobile ? 220 : 320, background: C.bg3, marginLeft: isMobile ? -12 : 0, marginRight: isMobile ? -12 : 0 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${item.thumbnail_url})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.8, transition: "background-image 1s ease-in-out" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(3,3,8,.95) 0%,rgba(3,3,8,.5) 60%,transparent 100%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: isMobile ? 16 : 32 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>🔥 Featured</div>
        <h2 style={{ fontSize: isMobile ? 18 : 26, fontWeight: 900, marginBottom: 8, maxWidth: 480, color: C.text }}>{item.title}</h2>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{item.channel} · {fmtNum(item.views || 0)} views</div>
        <button onClick={() => playVideo(item)} style={{ alignSelf: 'flex-start', padding: "11px 28px", borderRadius: 999, background: `linear-gradient(135deg,${C.accent},${C.accent2})`, border: "none", color: "white", fontWeight: 700, cursor: "pointer" }}>▶ Watch Now</button>
      </div>
    </div>
  );
}

// ── Video grid with Multiplex Ad Injection ────────────────────────────────────
function VideoGrid({ videos, loading, isMobile }) {
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(260px, 1fr))",
    gap: isMobile ? 10 : 14,
  };

  if (loading && videos.length === 0) return (
    <div style={gridStyle}>
      {Array(6).fill(0).map((_, i) => (
        <div key={i}>
          <Skeleton width="100%" height={0} style={{ aspectRatio: "16/9", marginBottom: 8, height: "unset" }} />
          <Skeleton width="60%" height={12} style={{ marginBottom: 6 }} />
          <Skeleton width="40%" height={10} />
        </div>
      ))}
    </div>
  );

  return (
    <div style={gridStyle}>
      {videos.map((v, index) => (
        <React.Fragment key={v.id || index}>
          <VideoCard video={v} />
          {!isMobile && index === 3 && <MultiplexAdUnit />}
          {isMobile && index === 5 && <MultiplexAdUnit />}
          {isMobile && index === videos.length - 1 && videos.length > 6 && <MultiplexAdUnit />}
        </React.Fragment>
      ))}
    </div>
  );
}

const FILTERS = [
  { label: "All", value: "all" }, { label: "🔥 Hot", value: "hot" }, { label: "✨ New", value: "new" },
  { label: "👑 VIP", value: "vip" }, { label: "Free", value: "free" },
];

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW REQUEST NOTIFICATION TOAST
// Shows at top-right (desktop) or top (mobile) when someone sends a follow req
// ─────────────────────────────────────────────────────────────────────────────
function FollowRequestToast({ requests, onAccept, onReject, isMobile }) {
  if (!requests || requests.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: isMobile ? 60 : 70,
      right: isMobile ? 0 : 20,
      left: isMobile ? 0 : "auto",
      zIndex: 99999,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      padding: isMobile ? "0 12px" : 0,
      pointerEvents: "none",
    }}>
      {requests.map((req) => (
        <div
          key={req.id}
          style={{
            background: "rgba(15,15,25,0.97)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${C.accent}44`,
            borderRadius: 16,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${C.accent}22`,
            animation: "slideInRight 0.35s cubic-bezier(0.34,1.2,0.64,1)",
            pointerEvents: "all",
            maxWidth: isMobile ? "100%" : 360,
            width: isMobile ? "100%" : "auto",
          }}
        >
          {/* Avatar */}
          <img
            src={req.sender_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.sender_username}`}
            alt={req.sender_username}
            style={{
              width: 42, height: 42, borderRadius: "50%",
              border: `2px solid ${C.accent}`,
              flexShrink: 0, objectFit: "cover",
            }}
          />

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>
              Follow Request
            </div>
            <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ color: C.accent, fontWeight: 600 }}>
                {req.sender_display_name || req.sender_username}
              </span>{" "}
              wants to follow you
            </div>
          </div>

          {/* Accept / Reject buttons */}
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => onAccept(req)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: `linear-gradient(135deg, ${C.accent}, ${C.accent2 || C.accent})`,
                border: "none",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "transform 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              ✓ Accept
            </button>
            <button
              onClick={() => onReject(req)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.07)",
                border: `1px solid ${C.border}`,
                color: C.muted,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "transform 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(${isMobile ? "0" : "60px"}) translateY(${isMobile ? "-20px" : "0"}); }
          to   { opacity: 1; transform: translateX(0) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER FOLLOW CARD
// KEY FIX: receives `initialFollowed` so it never shows wrong state on mount
function UserFollowCard({ user, initialFollowed = false, initialRequested = false }) {
  const { session, setTab, setActiveProfile, setAuthModal, showToast } = useApp();
  const [hov, setHov] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followed, setFollowed] = useState(initialFollowed);

  // Now this line will work because initialRequested is defined above
  const [requestSent, setRequestSent] = useState(initialRequested);
  const isMobile = useIsMobile();
  const username = user.username || "Anonymous";
  const avatar = user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  const fanCount = user.followers_count || 0;

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!session) { setAuthModal("login"); return; }
    if (loading || followed) return;

    const isCancelling = requestSent;

    // --- OPTIMISTIC UI ---
    setRequestSent(!isCancelling);
    setLoading(true);

    try {
      if (isCancelling) {
        // 1. Capture the response from your new API
        const result = await followAPI.cancelFollowRequest(session.user.id, user.id);
        showToast("Follow request withdrawn", "info");
        // 2. Check the custom success flag
        if (!result.success) {
          // ROLLBACK: Something went wrong (e.g., they already accepted)
          setRequestSent(true);
          showToast(result.message || "Could not cancel request", "error");
          return; // Exit early
        }

        showToast("Request cancelled", "success");
      } else {
        // For sendFollowRequest, ensure it also follows a similar {success} pattern
        // or check for error return values
        await followAPI.sendFollowRequest(session.user.id, user.id);
        showToast(`Follow request sent to ${username} 📨`, "success");
      }
    } catch (err) {
      // This handles network crashes or database being down
      console.error("Follow error:", err);
      setRequestSent(isCancelling);
      showToast("Connection error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };


  const goToProfile = () => {
    setActiveProfile(user);
    setTab(`profile:${username}`);
  };

  // ─── Label Logic ──────────────────────────────────────────────────────────
  let btnLabel = "+ Follow";
  if (loading) btnLabel = "...";
  else if (followed) btnLabel = "✓ Following";
  else if (requestSent) {
    btnLabel = (!isMobile && hov) ? "✕ Cancel" : "⏳ Requested";
  }

  const isDestructiveHov = !isMobile && hov && requestSent;

  const btnBg = followed
    ? C.bg3
    : requestSent
      ? (isDestructiveHov ? "rgba(255, 59, 48, 0.15)" : "rgba(255,255,255,0.07)")
      : `linear-gradient(135deg, ${C.accent}, ${C.accent2 || C.accent})`;

  const textColor = isDestructiveHov
    ? "#ff3b30"
    : (followed || requestSent ? C.muted : "white");

  return (
    <div
      onMouseEnter={() => !isMobile && setHov(true)}
      onMouseLeave={() => !isMobile && setHov(false)}
      onClick={() => {
        setActiveProfile(user);
        setTab(`profile:${username}`);
      }}
      style={{
        flexShrink: 0,
        width: isMobile ? 140 : 130,
        padding: "16px 12px",
        background: hov && !isMobile ? C.bg3 : C.bg2,
        borderRadius: 20,
        border: `1px solid ${hov && !isMobile ? C.accent + "66" : C.border}`,
        textAlign: "center",
        cursor: "pointer",
        transition: "transform 0.3s ease, background 0.3s ease",
        transform: hov && !isMobile ? "translateY(-5px)" : "none",
      }}
    >
      {/* Avatar Section */}
      <div style={{ position: "relative", marginBottom: 10, display: "inline-block" }}>
        <img
          src={avatar}
          style={{
            width: 64, height: 64, borderRadius: "50%",
            border: `2px solid ${followed ? "#4caf50" : C.accent}`,
            padding: 2, objectFit: "cover"
          }}
        />
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {user.display_name || username}
      </div>

      <button
        onClick={handleFollow}
        onMouseEnter={() => !isMobile && setHov(true)}
        onMouseLeave={() => !isMobile && setHov(false)}
        disabled={loading || followed}
        style={{
          width: "100%",
          padding: isMobile ? "8px 0" : "6px 0", // Use padding to control height
          borderRadius: 12,
          background: btnBg,
          border: (followed || requestSent) ? `1px solid ${isDestructiveHov ? '#ff3b30' : C.border}` : "none",
          color: textColor,

          // Set the actual size you want instead of scaling
          fontSize: isMobile ? "14px" : "12px",
          fontWeight: 800,

          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          whiteSpace: "nowrap",
          gap: "6px",

          // Remove these:
          // transform: ... 
          // transformOrigin: ...

          cursor: (loading || followed) ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          touchAction: "manipulation",
          outline: "none",
        }}
      >
        {btnLabel}
      </button>
    </div>
  );
}


function UserSuggestions() {
  const { setTab, session, authLoading } = useApp();

  const [ready, setReady] = useState(false);
  const [creators, setCreators] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  // 1. ADD THIS STATE
  const [pendingIds, setPendingIds] = useState(new Set());

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    const fetch = async () => {
      try {
        const currentUserId = session?.user?.id || null;

        const [allCreators, followingArr, pendingReqsArr] = await Promise.all([
          followAPI.getRandomCreators(30),
          currentUserId ? followAPI.getFollowingIds(currentUserId) : Promise.resolve([]),
          currentUserId
            ? supabase.from("follow_requests").select("recipient_id").eq("sender_id", currentUserId).eq("status", "pending")
            : Promise.resolve({ data: [] })
        ]);

        if (cancelled) return;

        const followingSet = new Set(followingArr);
        const pendingSet = new Set((pendingReqsArr.data || []).map(r => r.recipient_id));

        const filtered = allCreators
          .filter(u => u.id !== currentUserId && !followingSet.has(u.id))
          .slice(0, 20);

        setCreators(filtered);
        setFollowingIds(followingSet);
        // 2. SET THE STATE HERE
        setPendingIds(pendingSet);
      } catch (err) {
        console.error("Error fetching creators:", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [authLoading, session?.user?.id]);

  if (authLoading || !ready) return <Skeleton width="100%" height={180} />;
  if (creators.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <SectionHeader title="🌟 Suggested Creators" action={() => setTab("channels")} actionLabel="See all" />
      <div style={{ display: "flex", gap: 15, overflowX: "auto", scrollbarWidth: "none", padding: "10px 0" }}>
        {creators.map(user => (
          <UserFollowCard
            key={user.id}
            user={user}
            initialFollowed={followingIds.has(user.id)}
            // 3. PASS THE PROP HERE
            initialRequested={pendingIds.has(user.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW REQUEST MANAGER (hook)
// Subscribes to Supabase realtime on `follow_requests` table for the logged-in
// user.  When a request arrives → shows toast.  Accept → inserts into
// `follows`, increments followers_count on both sides, deletes the request.
// Reject → just deletes the request.
// ─────────────────────────────────────────────────────────────────────────────
function useFollowRequests(session, showToast) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const isMobile = useIsMobile();

  // On mount: load any already-pending requests for this user
  useEffect(() => {
    if (!session?.user?.id) return;

    const loadPending = async () => {
      try {
        const { data, error } = await supabase
          .from("follow_requests")
          .select(`
            id,
            sender_id,
            created_at,
            profiles!follow_requests_sender_id_fkey (
              id, username, display_name, avatar_url
            )
          `)
          .eq("recipient_id", session.user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const shaped = (data || []).map(r => ({
          id: r.id,
          sender_id: r.sender_id,
          sender_username: r.profiles?.username,
          sender_display_name: r.profiles?.display_name,
          sender_avatar: r.profiles?.avatar_url,
        }));
        setPendingRequests(shaped);
      } catch (err) {
        console.error("Failed to load pending follow requests:", err);
      }
    };

    loadPending();
  }, [session?.user?.id]);

  // Realtime subscription — fires when a new row is inserted into follow_requests
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`follow_requests:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "follow_requests",
          filter: `recipient_id=eq.${session.user.id}`,
        },
        async (payload) => {
          // Fetch sender profile for the toast
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, username, display_name, avatar_url")
              .eq("id", payload.new.sender_id)
              .single();

            const newReq = {
              id: payload.new.id,
              sender_id: payload.new.sender_id,
              sender_username: profile?.username,
              sender_display_name: profile?.display_name,
              sender_avatar: profile?.avatar_url,
            };

            setPendingRequests(prev => {
              // Avoid duplicates
              if (prev.find(r => r.id === newReq.id)) return prev;
              return [newReq, ...prev];
            });
          } catch (err) {
            console.error("Error fetching sender profile for notification:", err);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  // Accept: create follow row, increment counters, notify sender, delete request
  const handleAccept = useCallback(async (req) => {
    if (!session?.user?.id) return;

    // Optimistic: remove from list immediately
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));

    try {
      // 1. Insert into follows table
      await supabase.from("follows").upsert({
        follower_id: req.sender_id,
        following_id: session.user.id,
        created_at: new Date().toISOString(),
      }, { onConflict: "follower_id,following_id" });

      // 2. Increment followers_count on recipient (current user)
      await supabase.rpc("increment_followers", { user_id: session.user.id });

      // 3. Increment following_count on sender
      await supabase.rpc("increment_following", { user_id: req.sender_id });

      // 4. Notify sender via a notifications table (if it exists)
      await supabase.from("notifications").insert({
        recipient_id: req.sender_id,
        sender_id: session.user.id,
        type: "follow_accepted",
        message: "accepted your follow request",
        read: false,
        created_at: new Date().toISOString(),
      }).catch(() => { }); // non-critical

      // 5. Delete the request
      await supabase.from("follow_requests").delete().eq("id", req.id);

      showToast(`✅ You are now connected with ${req.sender_display_name || req.sender_username}!`, "success");
    } catch (err) {
      console.error("Accept follow error:", err);
      showToast("Failed to accept request", "error");
      // Restore on failure
      setPendingRequests(prev => [req, ...prev]);
    }
  }, [session?.user?.id, showToast]);

  // Reject: just delete the request row
  const handleReject = useCallback(async (req) => {
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    try {
      await supabase.from("follow_requests").delete().eq("id", req.id);
      showToast(`Declined request from ${req.sender_display_name || req.sender_username}`, "success");
    } catch (err) {
      console.error("Reject follow error:", err);
      // Restore on failure
      setPendingRequests(prev => [req, ...prev]);
    }
  }, []);

  return { pendingRequests, handleAccept, handleReject, isMobile };
}


// ─────────────────────────────────────────────────────────────────────────────
// HOME PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage({ tab }) {
  const { session, playVideo, setTab, showToast, authLoading } = useApp();
  const isMobile = useIsMobile();
  const [videos, setVideos] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [catFilter, setCatFilter] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;
  const loaderRef = useRef(null); // Add this near your other state declarations




  // ── Follow request system ─────────────────────────────────────────────────
  const { pendingRequests, handleAccept, handleReject } = useFollowRequests(session, showToast);

  // ── Pop-under ad (2 hr cap) ───────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalClick = () => {
      const lastAdTime = localStorage.getItem('last_pop_time');
      const now = Date.now();
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      if (!lastAdTime || (now - parseInt(lastAdTime)) > TWO_HOURS) {
        const DIRECT_AD_URL = 'https://your-direct-ad-link.com';
        const adWindow = window.open(DIRECT_AD_URL, '_blank');
        if (adWindow) {
          window.focus();
          localStorage.setItem('last_pop_time', now.toString());
          window.removeEventListener('click', handleGlobalClick);
        }
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab, catFilter, filter]);

  useEffect(() => {
    const handleSaveUpdate = (e) => {
      const { videoId, isSaved } = e.detail;
      if (tab === "saved" && !isSaved) {
        setVideos(prev => prev.filter(v => v.id !== videoId));
      }
    };
    window.addEventListener('video_save_updated', handleSaveUpdate);
    return () => window.removeEventListener('video_save_updated', handleSaveUpdate);
  }, [tab]);

  const loadVideos = useCallback(async (reset = false) => {

    if ((loading || (!hasMore && !reset)) && !reset) return;

    setLoading(true);
    if (reset) {
      setPage(0);
      setHasMore(true);
    }
    try {
      const nextPage = reset ? 0 : page;
      let data = [];

      // ─── Special Tabs (History/Saved) ───
      if (tab === "history") {
        if (session?.user?.id) data = await historyAPI.getHistory(session.user.id);
        setVideos(data);
        setHasMore(false);
        setLoading(false);
        return;
      }

      if (tab === "saved") {
        if (session?.user?.id) data = await likeAPI.getSaved(session.user.id);
        setVideos(data);
        setHasMore(false);
        setLoading(false);
        return;
      }


      // For "trending" specifically, we pass null for user ID to get global trends
      const userIdForFeed = tab === "home" ? (session?.user?.id || null) : null;

      data = await videoAPI.getSmartFeed(userIdForFeed, nextPage, LIMIT);

      // Apply category filter if one is selected
      const filtered = (data || []).filter(v => !catFilter || v.category === catFilter);

      if (reset) {
        setVideos(filtered);
        setPage(1); // Reset page to 1 for the next load
      } else {
        setVideos(prev => [...prev, ...filtered]);
        setPage(p => p + 1);
      }

      // If we got fewer than LIMIT, there is no more data
      setHasMore(data?.length === LIMIT);
    } catch (err) {
      console.error("Smart Feed Load error:", err);
      // Fallback to demo data if RPC fails
      if (reset) setVideos(DEMO_VIDEOS.slice(0, LIMIT));
    } finally {
      setLoading(false);
    }
  }, [tab, page, session, catFilter, loading,hasMore,showToast]);


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // If the loader comes into view AND we aren't already loading AND there's more data
        if (entries[0].isIntersecting && hasMore && !loading && tab !== "history" && tab !== "saved") {
          loadVideos(false);
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the loader is visible
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [loadVideos, hasMore, loading, tab]);


useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadVideos(true);
    
    // Pre-fetch small trending list for the horizontal scroller on Home
    if (tab === "home") {
      videoAPI.getTrending(18).then(setTrending).catch(() => setTrending([]));
    }
  }, [tab, catFilter]);

  const displayed = useMemo(() => {
    let v = [...videos];
    if (filter === "hot") v = v.filter(x => (x.likes_count || 0) > 20000);
    if (filter === "new") v = v.filter(x => new Date(x.created_at) > new Date(Date.now() - 7 * 86400000));
    if (filter === "vip") v = v.filter(x => x.is_vip);
    if (filter === "free") v = v.filter(x => !x.is_vip);
    return v;
  }, [videos, filter]);

  const handleDeleteHistory = async (e, historyId) => {
    e.stopPropagation();
    const { error } = await historyAPI.deleteHistoryItem(historyId);
    if (!error) setVideos(prev => prev.filter(v => v.historyId !== historyId));
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear your entire watch history?")) {
      const { error } = await historyAPI.clearAllHistory(session.user.id);
      if (!error) setVideos([]);
    }
  };

  return (
    <div>
      {/* ── Follow Request Notification Toasts ─────────────────────────── */}
      <FollowRequestToast
        requests={pendingRequests}
        onAccept={handleAccept}
        onReject={handleReject}
        isMobile={isMobile}
      />

      {tab === "home" && !catFilter && <HeroBanner />}

      {catFilter && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: C.bg3, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>📂 {catFilter}</span>
          <button onClick={() => setCatFilter(null)} style={{ marginLeft: "auto", background: C.accent, border: "none", borderRadius: 999, color: "white", padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Clear ✕</button>
        </div>
      )}

      {tab === "home" && !catFilter && (
        <>
          <UserSuggestions />

          {trending.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <SectionHeader title="🔥 Trending Now" />
              <HScroll hideArrows={isMobile}>
                {trending.map(v => <VideoCard key={v.id} video={v} cardWidth={isMobile ? 200 : 260} />)}
              </HScroll>
            </div>
          )}
        </>
      )}

      {tab === "home" && !catFilter && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeader title="🏷 Browse Categories" action={() => setTab("categories")} actionLabel="All categories" />
          {isMobile ? <MobileCategoryStrip onSelect={setCatFilter} /> :
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10 }}>
              {CATEGORIES.slice(0, 8).map(cat => <CategoryCard key={cat.name} cat={cat} onClick={() => setCatFilter(cat.name)} />)}
            </div>
          }
        </div>
      )}

      <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginBottom: 20 }}>
        {FILTERS.map(f => <FilterChip key={f.value} label={f.label} active={filter === f.value} onClick={() => setFilter(f.value)} />)}
      </div>

      <div style={{
        marginTop: isMobile && tab !== "home" ? 20 : 0,
        padding: isMobile ? "0 4px" : 0,
      }}>
        <SectionHeader
          title={
            tab === "history" ? "🕒 Watch History" :
              tab === "trending" ? "🔥 Trending Videos" :
                tab === "saved" ? "❤️ Saved Videos" :
                  catFilter ? `📂 ${catFilter}` : "🎬 All Videos"
          }
          action={tab === "history" && videos.length > 0 ? handleClearAll : null}
          actionLabel={tab === "history" && videos.length > 0 ? "Clear All" : null}
        />
      </div>

      {!loading && displayed.length === 0 ? (
        <EmptyState
          emoji={tab === "saved" ? "💔" : tab === "history" ? "🕒" : "🔍"}
          title={tab === "saved" ? "No saved videos" : tab === "history" ? "No history yet" : "No videos found"}
        />
      ) : (
        <>
          {tab === "history" ? (
            <>
              {loading && videos.length === 0 ? (
                <VideoGrid videos={[]} loading={true} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: isMobile ? '10px' : '20px' }}>
                  {displayed.map((video) => (
                    <div
                      key={video.historyId || video.id}
                      style={{ position: 'relative', cursor: 'pointer' }}
                      onClick={() => playVideo(video)}
                    >
                      <button
                        onClick={(e) => handleDeleteHistory(e, video.historyId)}
                        style={{
                          position: 'absolute', top: 8, left: 8, zIndex: 10,
                          background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                          width: 28, height: 28, color: 'white', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', transition: 'transform 0.2s',
                        }}
                      >
                        ✕
                      </button>
                      <VideoCard video={video} />
                      <div style={{ marginTop: '8px', padding: '0 4px' }}>
                        <div style={{ fontSize: '12px', color: C.text, fontWeight: '600', marginBottom: 4 }}>{video.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: C.muted }}>
                          <span>{fmtNum(video.views || 0)} views</span>
                          <span>{video.watched_at ? new Date(video.watched_at).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <VideoGrid videos={displayed} loading={loading && videos.length === 0} isMobile={isMobile} />
          )}

          {/* Replace the old loadMore button section with this */}
          {tab !== "history" && tab !== "saved" && (
            <div
              ref={loaderRef}
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "40px 0",
                minHeight: "100px"
              }}
            >
              {loading && (
                <div style={{ display: "flex", gap: 8 }}>
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: C.accent,
                        animation: `pulse 1.2s ${i * .2}s infinite`
                      }}
                    />
                  ))}
                </div>
              )}
              {!hasMore && videos.length > 0 && (
                <p style={{ color: C.muted, fontSize: 13, fontWeight: 600 }}>
                  ✨ You've caught up with everything!
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
