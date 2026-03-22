import React,{ useState, useEffect, useCallback, useMemo, useRef } from "react";
import { C, SectionHeader, HScroll, FilterChip, Skeleton, EmptyState, fmtNum, VerifiedBadge } from "../components/ui/index";
import { useApp } from "../context/AppContext";
import { videoAPI, followAPI, likeAPI, historyAPI } from "../lib/supabase"; // Ensure historyAPI is imported
import { useIsMobile, useInfiniteScroll } from "../hooks/index";
import VideoCard from "../components/VideoCard";
import { DEMO_VIDEOS, CATEGORIES } from "../data/theme";


const MultiplexAdUnit = () => (
  <div className="ad-grid-container" style={{ 
    gridColumn: '1 / -1', // Spans across all columns in your CSS grid
    margin: '20px 0',
    padding: '10px',
    background: '#1a1a1a', // Matches LumineX dark theme
    borderRadius: '12px',
    border: '1px solid #333'
  }}>
    <span style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' }}>
      Recommended for You
    </span>
    {/* INSERT YOUR AD NETWORK SCRIPT HERE */}
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

// ── Video grid with Multiplex Ad Injection ──────────────────────────────────
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
          
          {/* DESKTOP: Show after first row (4th item) */}
          {!isMobile && index === 3 && <MultiplexAdUnit />}

          {/* MOBILE: Show after the first 6 videos so it's not at the very bottom */}
          {/* This ensures the user sees an ad before they stop scrolling */}
          {isMobile && index === 5 && <MultiplexAdUnit />}

          {/* Optional: Show at the very end as well for extra revenue */}
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


// ── User Follow Card ─────────────────────────────────────────────────────────
// ── User Follow Card (Fixed & Database Linked) ───────────────────────────────
function UserFollowCard({ user }) {
  const { session, setTab, setActiveProfile, setAuthModal, showToast } = useApp();
  
  // Initialize 'followed' state. In a perfect setup, you'd check this via an API on mount.
  const [followed, setFollowed] = useState(false);
  const [hov, setHov] = useState(false);
  const [loading, setLoading] = useState(false);

  // Clean data from DB
  const username = user.username || "Anonymous";
  const avatar = user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  const fanCount = user.followers_count || 0;

  const handleFollow = async (e) => {
    e.stopPropagation(); // Prevent clicking the card/going to profile
    
    // 1. Check if user is logged in
    if (!session) {
      setAuthModal("login");
      return;
    }

    setLoading(true);
    try {
      // 2. Call your actual Supabase API
      // Assumes followAPI.toggleFollow(followerId, followingId)
      const isNowFollowing = !followed;
      await followAPI.toggleFollow(session.user.id, user.id);
      setFollowed(isNowFollowing);
      showToast(isNowFollowing ? `Following ${username}` : `Unfollowed ${username}`, "success");
    } catch (err) {
      console.error("Follow error:", err);
      showToast("Could not update follow status", "error");
    } finally {
      setLoading(false);
    }
  };


  const goToProfile = () => {
    setActiveProfile(user);
    setTab(`profile:${username}`);
  };

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={goToProfile}
      style={{
        flexShrink: 0,
        width: 130,
        padding: "20px 10px",
        background: hov ? C.bg3 : C.bg2,
        borderRadius: 20,
        border: `1px solid ${hov ? C.accent + "66" : C.border}`,
        textAlign: "center",
        cursor: "pointer",
        transition: "all 0.3s ease",
        transform: hov ? "translateY(-5px)" : "none",
        boxShadow: hov ? `0 10px 20px rgba(0,0,0,0.4)` : "none",
      }}
    >
      <div style={{ position: "relative", marginBottom: 12, display: "inline-block" }}>
        <img
          src={avatar}
          style={{
            width: 70, height: 70, borderRadius: "50%",
            border: `2px solid ${followed ? C.green : C.accent}`,
            padding: 3,
            transition: "all 0.3s ease",
            transform: hov ? "scale(1.1)" : "scale(1)",
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
        {user.display_name || user.username || "unknown"}
      </div>
      
      <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>
        {fmtNum(fanCount)} fans
      </div>

      <button
        onClick={handleFollow}
        disabled={loading}
        style={{
          width: "100%",
          padding: "6px 0",
          borderRadius: 10,
          background: followed ? C.bg3 : `linear-gradient(135deg, ${C.accent}, ${C.accent2})`,
          border: followed ? `1px solid ${C.border}` : "none",
          color: followed ? C.muted : "white",
          fontSize: 11,
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? "..." : (followed ? "✓ Following" : "+ Follow")}
      </button>
    </div>
  );
}

function UserSuggestions() {
  const { setTab, session, authLoading } = useApp();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. If auth is still checking, do absolutely nothing yet
    if (authLoading) return;

    const fetchCreators = async () => {
      try {
        const data = await followAPI.getRandomCreators(20);
        setCreators(data);
      } catch (err) {
        console.error("Error fetching creators:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCreators();
  }, [authLoading]); // Only depend on authLoading to prevent multiple API calls

  // 2. STRICTOR LOADING CHECK: 
  // Don't even try to process creators until authLoading is false
  if (authLoading || loading) {
    return (
      <div style={{ height: 180, marginBottom: 32 }}>
        <Skeleton width="100%" height="100%" />
      </div>
    );
  }

  // 3. FILTER IN RENDER: 
  // This ensures that even if 'creators' state contains 'you', 
  // it is filtered out visually before the first pixel is drawn.
  const filteredCreators = creators.filter(user => user.id !== session?.user?.id);

  if (filteredCreators.length === 0) return null;
//console.log('all',creators,'filteredCreators',filteredCreators)
  return (
    <div style={{ marginBottom: 32 }}>
      <SectionHeader
        title="🌟 Suggested Creators"
        action={() => setTab("channels")}
        actionLabel="See all"
      />

      <div style={{
        display: "flex",
        gap: 15,
        overflowX: "auto",
        scrollbarWidth: "none",
        padding: "10px 0"
      }}>
        {/* 4. Use the filtered list here */}
        {filteredCreators.map(user => (
          <UserFollowCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}


export default function HomePage({ tab }) {
  const { session, playVideo, setTab } = useApp();
  const isMobile = useIsMobile();
  const [videos, setVideos] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [catFilter, setCatFilter] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 10;


  // --- OPTIMIZED AD SYSTEM LOGIC (2 HOUR CAP + DIRECT LINK FIX) ---
  useEffect(() => {
    const handleGlobalClick = () => {
      const lastAdTime = localStorage.getItem('last_pop_time');
      const now = Date.now();
      const TWO_HOURS = 2 * 60 * 60 * 1000;

      // Only trigger if 2 hours have passed
      if (!lastAdTime || (now - parseInt(lastAdTime)) > TWO_HOURS) {

        /** * FIX: Use a DIRECT Link here. 
         * Avoid "link lockers" or "smart links" that redirect 5 times.
         * A direct affiliate/offer link ensures the 'Back' button works.
         */
        const DIRECT_AD_URL = 'https://your-direct-ad-link.com';

        // 1. Open the direct ad in a new tab
        const adWindow = window.open(DIRECT_AD_URL, '_blank');

        if (adWindow) {
          // 2. Immediate Feedback: Keep the user on LumineX
          // On mobile, this ensures the browser doesn't "freeze" on a white redirect page
          window.focus();

          // 3. Save timestamp to prevent spamming the user
          localStorage.setItem('last_pop_time', now.toString());

          // 4. Cleanup: Remove listener so subsequent clicks don't open more ads
          window.removeEventListener('click', handleGlobalClick);

          console.log("Direct Ad served. Navigation history preserved.");
        }
      }
    };

    // Attach listener to the window
    window.addEventListener('click', handleGlobalClick);

    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);


  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab, catFilter, filter]);

  useEffect(() => {
    const handleSaveUpdate = (e) => {
      // 1. Extract the data from the event
      const { videoId, isSaved } = e.detail;

      // 2. Check if we are currently looking at the "saved" tab
      // Note: Ensure 'tab' is the state variable you use for navigation
      if (tab === "saved" && !isSaved) {
        // 3. Filter out the video from the local state immediately
        setVideos(prev => prev.filter(v => v.id !== videoId));
      }
    };

    // 4. Set up the listener
    window.addEventListener('video_save_updated', handleSaveUpdate);

    // 5. Clean up
    return () => {
      window.removeEventListener('video_save_updated', handleSaveUpdate);
    };
  }, [tab]); // Critical: dependency on 'tab' so it knows current view

  const loadVideos = useCallback(async (reset = false) => {
    setLoading(true);
    if (reset) setVideos([]);
    try {
      const nextPage = reset ? 0 : page;
      let data = [];

      // 1. History Tab Logic
      if (tab === "history") {
        if (reset) setPage(0);
        if (session?.user?.id) {
          data = await historyAPI.getHistory(session.user.id);
        }
        setVideos(data);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // 2. Saved Tab Logic
      if (tab === "saved") {
        if (session?.user?.id) {
          data = await likeAPI.getSaved(session.user.id);
        }
        setVideos(data);
        setHasMore(false);
        setLoading(false);
        return;
      }

      // 3. Trending Tab Logic
      if (tab === "trending") {
        data = await videoAPI.getTrending(LIMIT).catch(() => DEMO_VIDEOS.slice(0, LIMIT));
      }
      // 4. Default Feed Logic
      else {
        let followingIds = null;
        if (session?.user?.id && tab === "home") {
          followingIds = await followAPI.getFollowingIds(session.user.id).catch(() => null);
        }
        data = await videoAPI.getFeed({
          page: nextPage,
          limit: LIMIT,
          followingIds: followingIds?.length ? followingIds : null
        }).catch(() => DEMO_VIDEOS.slice(nextPage * LIMIT, (nextPage + 1) * LIMIT));
      }

      const filtered = (data || []).filter(v => !catFilter || v.category === catFilter);

      if (reset)

        setVideos(filtered);

      else setVideos(prev => [...prev, ...filtered]);

      setHasMore(data?.length === LIMIT);
      if (!reset) setPage(p => p + 1);

    } catch (err) {
      console.error("Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [tab, page, session, catFilter]);

  useEffect(() => {
    setPage(0); setHasMore(true); loadVideos(true);
    if (tab === "home") {
      videoAPI.getTrending(8).then(setTrending).catch(() => setTrending(DEMO_VIDEOS.slice(0, 8)));
    }
  }, [tab, catFilter]);

  const loadMore = useCallback(() => { if (!loading && hasMore) loadVideos(false); }, [loading, hasMore, loadVideos]);

  const displayed = useMemo(() => {
    let v = [...videos];
    if (filter === "hot") v = v.filter(x => (x.likes_count || 0) > 20000);
    if (filter === "new") v = v.filter(x => new Date(x.created_at) > new Date(Date.now() - 7 * 86400000));
    if (filter === "vip") v = v.filter(x => x.is_vip);
    if (filter === "free") v = v.filter(x => !x.is_vip);
    return v;
  }, [videos, filter]);



  // Inside export default function HomePage() { ...
  const handleDeleteHistory = async (e, historyId) => {
    e.stopPropagation();
    const { error } = await historyAPI.deleteHistoryItem(historyId);
    if (!error) {
      // We update 'videos' because 'displayed' is a useMemo based on 'videos'
      setVideos(prev => prev.filter(v => v.historyId !== historyId));
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear your entire watch history?")) {
      const { error } = await historyAPI.clearAllHistory(session.user.id);
      if (!error) setVideos([]);
    }
  };

  return (
    <div>
      {tab === "home" && !catFilter && <HeroBanner />}

      {catFilter && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: C.bg3, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>📂 {catFilter}</span>
          <button onClick={() => setCatFilter(null)} style={{ marginLeft: "auto", background: C.accent, border: "none", borderRadius: 999, color: "white", padding: "4px 12px", fontSize: 12, cursor: "pointer" }}>Clear ✕</button>
        </div>
      )}

      {tab === "home" && !catFilter && (
        <>
          {/* ── NEW SECTION ADDED HERE ── */}
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
        // Adds extra space at the top ONLY on mobile when not on the home tab
        marginTop: isMobile && tab !== "home" ? 20 : 0,
        padding: isMobile ? "0 4px" : 0
      }}>
        <SectionHeader
          title={
            tab === "history" ? "🕒 Watch History" :
              tab === "trending" ? "🔥 Trending Videos" :
                tab === "saved" ? "❤️ Saved Videos" :
                  catFilter ? `📂 ${catFilter}` : "🎬 All Videos"
          }
          // Fixed: Ensure action only shows for history and when there's actually content
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
              {/* Show Skeletons if loading and we have no videos yet */}
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
                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteHistory(e, video.historyId)}
                        style={{
                          position: 'absolute', top: 8, left: 8, zIndex: 10,
                          background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                          width: 28, height: 28, color: 'white', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', transition: 'transform 0.2s'
                        }}
                      >
                        ✕
                      </button>
                      <VideoCard video={video} />
                      <div style={{ marginTop: '8px', padding: '0 4px' }}>
                        <div style={{ fontSize: '12px', color: C.text, fontWeight: '600', marginBottom: 4 }}>{video.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: C.muted }}>
                          <span> {fmtNum(video.views || 0)} views</span>
                          <span>{video.watched_at ? new Date(video.watched_at).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <VideoGrid videos={displayed} loading={loading && videos.length === 0} isMobile={isMobile}/>
          )}

          {hasMore && !loading && tab !== "history" && tab !== "saved" && (
            <div style={{ display: "flex", justifyContent: "center", padding: "28px 16px" }}>
              <button onClick={loadMore} style={{ padding: "12px 32px", borderRadius: 999, background: C.accent, color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}>
                Load More Videos
              </button>
            </div>
          )}

          {loading && videos.length > 0 && (
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
