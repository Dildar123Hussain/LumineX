import { useState, useRef, useEffect } from "react";
import { C, Avatar, VipBadge, VerifiedBadge, fmtNum, timeAgo } from "./ui/index";
import { useApp } from "../context/AppContext";
import { useIsMobile, useVideoLike } from "../hooks/index";
import { likeAPI } from "../lib/supabase";

export default function VideoCard({ video, cardWidth, compact, showViews, showChannel = true }) {
  const { setTab, playVideo, setActiveProfile } = useApp();
  const isMobile = useIsMobile();
  const vRef = useRef(null);
  const timerRef = useRef(null);
  const lpRef = useRef(null);
  const tickRef = useRef(null);

  const [active, setActive] = useState(false);
  const [hov, setHov] = useState(false);
  const [prog, setProg] = useState(0);
  const [lpProg, setLpProg] = useState(0);
  const [lpOn, setLpOn] = useState(false);



  const { liked, count: likeCount, toggle: toggleLike } = useVideoLike(video.id, false, video.likes_count);

  // Inside VideoCard.jsx
  const { session, showToast } = useApp();
  const [saved, setSaved] = useState(false);

  // Add an effect to check if the video is already saved when the card loads
  useEffect(() => {
    if (session?.user?.id) {
      likeAPI.isSaved(session.user.id, video.id).then(setSaved);
    }
  }, [video.id, session?.user?.id]);

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    if (!session) return showToast("Please login to save videos", "info");

    try {
      const nextSavedState = !saved; // What the state will become
      await likeAPI.toggleSave(session.user.id, video.id, saved);

      // 1. Update local state
      setSaved(nextSavedState);

      // 2. ─── BROADCAST THE UPDATE ───
      window.dispatchEvent(new CustomEvent('video_save_updated', {
        detail: { videoId: video.id, isSaved: nextSavedState }
      }));

      showToast(nextSavedState ? "Video saved!" : "Removed from saved", "success");
    } catch (err) {
      showToast("Failed to update saved videos", "error");
    }
  };


  // Add this inside your VideoCard component
  useEffect(() => {
    const handleGlobalSaveUpdate = (e) => {
      if (e.detail.videoId === video.id) {
        setSaved(e.detail.isSaved);
      }
    };

    window.addEventListener('video_save_updated', handleGlobalSaveUpdate);
    return () => window.removeEventListener('video_save_updated', handleGlobalSaveUpdate);
  }, [video.id]);


  function play() {
    const v = vRef.current; if (!v) return;
    v.muted = true; v.volume = 0; v.currentTime = 0;
    v.play().then(() => setActive(true)).catch(() => { });
  }
  function stop() {
    const v = vRef.current; if (!v) return;
    v.pause(); v.currentTime = 0; setActive(false); setProg(0);
  }

  function onEnter() { if (isMobile) return; setHov(true); timerRef.current = setTimeout(play, 350); }
  function onLeave() { if (isMobile) return; clearTimeout(timerRef.current); setHov(false); stop(); }

  function onTouchStart(e) {
    if (!isMobile) return; e.preventDefault(); setLpOn(true); setLpProg(0);
    const t0 = Date.now();
    tickRef.current = setInterval(() => setLpProg(Math.min((Date.now() - t0) / 6, 100)), 16);
    lpRef.current = setTimeout(() => { clearInterval(tickRef.current); setLpOn(false); setHov(true); play(); }, 600);
  }
  function onTouchEnd() {
    if (!isMobile) return; clearTimeout(lpRef.current); clearInterval(tickRef.current);
    setLpOn(false); setLpProg(0); if (!active) setHov(false);
  }

  useEffect(() => {
    const v = vRef.current; if (!v) return;
    const fn = () => v.duration && setProg((v.currentTime / v.duration) * 100);
    v.addEventListener("timeupdate", fn);
    return () => v.removeEventListener("timeupdate", fn);
  }, []);

  useEffect(() => () => { clearTimeout(timerRef.current); clearTimeout(lpRef.current); clearInterval(tickRef.current); }, []);

  const pf = video.profiles || { username: video.channel || "Unknown" };


  const handleProfileClick = (e) => {
    e.stopPropagation();
    window.scrollTo(0, 0);
    setActiveProfile(pf); // 'pf' is the user data from the card
    setTab(`profile:${pf.username}`);
  };


  // ... after other hooks like useVideoLike ...
  const [currentViews, setCurrentViews] = useState(video.views_count || video.views || 0);

  useEffect(() => {
    const handleUpdate = (e) => {
      // If this specific video was just watched, update the count
      if (e.detail.videoId === video.id) {
        setCurrentViews(e.detail.views);
      }
    };

    window.addEventListener('video_view_updated', handleUpdate);
    return () => window.removeEventListener('video_view_updated', handleUpdate);
  }, [video.id]);

  return (
    <div onClick={() => !lpOn && playVideo(video)} onMouseEnter={onEnter} onMouseLeave={onLeave}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchMove={onTouchEnd}
      style={{
        background: hov ? C.cardH : C.card, borderRadius: 14, overflow: "hidden", cursor: "pointer",
        border: `1px solid ${hov ? "var(--accent)44" : C.border}`,
        transform: hov ? "translateY(-5px) scale(1.015)" : "none",
        transition: "all .3s ease",
        boxShadow: hov ? `0 20px 50px rgba(0,0,0,.5),0 0 40px var(--accent)12` : `0 2px 12px rgba(0,0,0,.2)`,
        width: cardWidth || "100%", flexShrink: cardWidth ? 0 : undefined,
        scrollSnapAlign: cardWidth ? "start" : undefined, position: "relative",
      }}>

      {/* Media */}
      <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden", background: "#111" }}>
        {!active && (
          <img src={video.thumbnail_url || `https://picsum.photos/640/360?random=${String(video.id).charCodeAt(0) || 1}`} alt={video.title} loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: hov ? "scale(1.06)" : "scale(1)", transition: "transform .5s ease", zIndex: 1 }} />
        )}


        {hov && (
          <video ref={vRef} src={video.video_url} muted playsInline loop
            onCanPlay={e => { e.target.muted = true; e.target.volume = 0; e.target.play().then(() => setActive(true)).catch(() => { }); }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 2, opacity: active ? 1 : 0, transition: "opacity .4s" }} />
        )}

        <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", background: "linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 50%)", opacity: hov ? 1 : 0, transition: "opacity .3s" }} />

        {hov && !active && (
          <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--accent)cc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "white", boxShadow: "0 0 0 8px var(--accent)33", animation: "pulseRing 1.5s infinite" }}>▶</div>
          </div>
        )}

        {isMobile && lpOn && (
          <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={76} height={76} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={38} cy={38} r={32} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth={4} />
              <circle cx={38} cy={38} r={32} fill="none" stroke="var(--accent)" strokeWidth={4} strokeLinecap="round" strokeDasharray={`${lpProg * 2.01} 201`} />
            </svg>
            <span style={{ position: "absolute", fontSize: 24 }}>▶</span>
          </div>
        )}

        {isMobile && active && (
          <button onClick={e => { e.stopPropagation(); stop(); setHov(false); }} style={{ position: "absolute", top: 8, right: 8, zIndex: 12, background: "rgba(0,0,0,.8)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "white", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>⏹</button>
        )}

        <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, zIndex: 5 }}>
          {video.is_vip && <VipBadge small />}
        </div>

        <div style={{ position: "absolute", bottom: 8, right: 8, zIndex: 5, background: "rgba(0,0,0,.85)", color: "white", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>{video.duration || ""}</div>

        {!compact && (
          <button
            onClick={e => { e.stopPropagation(); handleSaveToggle(e) }}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 15,
              background: "rgba(0,0,0,0.7)",
              border: "none",
              borderRadius: "50%",
              width: 30,
              height: 30,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: hov || saved ? 1 : 0,
              transition: "opacity .2s, transform .2s",
              transform: saved ? "scale(1.2)" : "scale(1)",
              color: saved ? C.accent : "white"
            }}
          >
            {saved ? "🔖" : "📑"}
          </button>
        )}

        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,.1)", zIndex: 6, opacity: active ? 1 : 0 }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg,${C.accent},${C.accent2})`, width: `${prog}%`, transition: "width .12s linear" }} />
        </div>

        {/* ─── Updated Condition to check for showViews AND isMobile ─── */}
        {showViews && isMobile && (
          <div style={{
            position: 'absolute',
            top: compact ? 4 : 8,
            right: compact ? 4 : 42,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            padding: '3px 8px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            zIndex: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            pointerEvents: 'none'
          }}>

            <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
              {fmtNum(currentViews)}
            </span>
          </div>
        )}

      </div>

      {!compact && showChannel && (
        <div style={{ padding: "10px 12px 12px" }}>
          <div onClick={handleProfileClick} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>

            <Avatar profile={pf} size={32} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.4, marginBottom: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{video.title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.muted }}>
                <div
                  onClick={handleProfileClick}
                  className="user-link"
                  style={{
                    color: C.accent,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "color 0.2s ease",
                    padding: isMobile ? "4px 0" : "0",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = C.accent2}
                  onMouseLeave={(e) => e.currentTarget.style.color = C.accent}
                >
                  {pf.display_name || pf.username}
                  {pf.is_verified && <VerifiedBadge size={11} />}
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{fmtNum(video.views || 0)} views · {timeAgo(video.created_at)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
