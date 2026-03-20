import { useState, useEffect, useRef, useCallback } from "react";
import { C, Avatar, VipBadge, VerifiedBadge, fmtNum, fmtTime, timeAgo, AppIcon } from "../ui/index";
import { useApp } from "../../context/AppContext";
import { useIsMobile, useVideoLike } from "../../hooks/index";
import { videoAPI, historyAPI, likeAPI, supabase } from "../../lib/supabase";
import { DEMO_VIDEOS } from "../../data/theme";
import CommentSection from "./CommentSection";
import ControlsBar from "./ControlsBar";

function SeekFlash({ seekFlash, arcProg }) {
  if (!seekFlash) return null;
  const C2 = 188.5;
  const arc = Math.min((arcProg / 100) * C2, C2);
  const Panel = ({ side, active, icon }) => (
    <div style={{ position: "absolute", [side]: 0, top: 0, bottom: 0, width: "32%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: active ? `linear-gradient(to ${side === "left" ? "right" : "left"},rgba(255,255,255,.13),transparent)` : "transparent", transition: "background .15s", pointerEvents: "none" }}>
      {active && (
        <div style={{ position: "relative", width: 68, height: 68 }}>
          <svg width={68} height={68} style={{ transform: `rotate(-90deg)${side === "right" ? " scaleX(-1)" : ""}` }}>
            <circle cx={34} cy={34} r={28} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth={4} />
            <circle cx={34} cy={34} r={28} fill="none" stroke="white" strokeWidth={4} strokeLinecap="round" strokeDasharray={`${arc * (28 / 30)} ${C2 * (28 / 30)}`} style={{ transition: "stroke-dasharray .25s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "white", letterSpacing: .3 }}>10s</span>
          </div>
        </div>
      )}
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20, animation: "fadeIn .12s" }}>
      <Panel side="left" active={seekFlash === "bwd"} icon="⏪" />
      <Panel side="right" active={seekFlash === "fwd"} icon="⏩" />
      {seekFlash === "2x" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "rgba(0,0,0,.82)", border: `2px solid ${C.accent}`, borderRadius: 14, padding: "12px 28px", fontSize: 22, fontWeight: 900, color: C.accent, letterSpacing: 3 }}>2× SPEED</div>
        </div>
      )}
    </div>
  );
}

function AutoPlayCountdown({ seconds, onPlay, onCancel }) {
  return (
    <div style={{ position: "absolute", bottom: 70, right: 16, zIndex: 30, background: "rgba(0,0,0,.88)", border: `1px solid ${C.accent}44`, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, animation: "fadeIn .3s ease" }}>
      <div style={{ position: "relative", width: 36, height: 36 }}>
        <svg width={36} height={36} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={18} cy={18} r={14} fill="none" stroke={C.border} strokeWidth={3} />
          <circle cx={18} cy={18} r={14} fill="none" stroke={C.accent} strokeWidth={3} strokeLinecap="round" strokeDasharray={`${(seconds / 5) * 87.96} 87.96`} style={{ transition: "stroke-dasharray 1s linear" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.accent }}>{seconds}</div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Up Next</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Auto-playing…</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onPlay} style={{ background: C.accent, border: "none", borderRadius: 6, color: "white", padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Play Now</button>
        <button onClick={onCancel} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
      </div>
    </div>
  );
}

export default function PlayerModal({ video: initVideo, onClose }) {
  const { session, profile, setAuthModal, showToast, setActiveProfile, setPlayer, setTab } = useApp();

  const isMobile = useIsMobile();
  const wrapRef = useRef(null);
  const vRef = useRef(null);
  const ctrlTimer = useRef(null);
  const lpRef = useRef(null);
  const touchX0 = useRef(null);
  const touchT0 = useRef(null);
  const flashTimer = useRef(null);
  const autoTimer = useRef(null);

  // ── viewIncremented ref declared BEFORE any useEffect that uses it ──
  const viewIncremented = useRef(false);

const [video, setVideo] = useState(() => {
    // 1. Check if we have a newer version saved in memory
    const cached = sessionStorage.getItem(`video_${initVideo.id}`);
    const latestData = cached ? JSON.parse(cached) : initVideo;
    
    return {
      ...latestData,
      views: Number(latestData.views_count ?? latestData.views ?? 0),
    };
  });

  const [related, setRelated] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(1);
  const [prog, setProg] = useState(0);
  const [curTime, setCurTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [showCtrl, setShowCtrl] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [is2x, setIs2x] = useState(false);
  const [seekFlash, setSeekFlash] = useState(null);
  const [arcProg, setArcProg] = useState(0);
  const [isFS, setIsFS] = useState(false);
  const [captionLang, setCaptionLang] = useState("off");
  const [saved, setSaved] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState(null);
  const [isBuffering, setIsBuffering] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(4);

  const { liked, count: likeCount, toggle: toggleLike } = useVideoLike(video.id, false, video.likes_count);

  // ═══════════════════════════════════════════════════════════════
  // FIX: Fetch FRESH view count from DB when player opens.
  // This is READ-ONLY — no increment. Just gets the real current
  // number so the player doesn't show a stale value from the feed.
  // If DB has 99, player shows 99 immediately on open.
  // ═══════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════
  // Reset increment tracker when video changes (related video play)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    viewIncremented.current = false;
  }, [video.id]);

  // ═══════════════════════════════════════════════════════════════
  // THE ONLY INCREMENT — fires once after 3s of actual playback.
  // viewIncremented.current prevents it from firing twice.
  // After incrementing: updates local state + broadcasts to
  // all VideoCards on the home/profile screen via custom event.
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!playing || viewIncremented.current) return;
    const timer = setTimeout(async () => {
      try {
    const newViewCount = await videoAPI.incrementViews(video.id);
const updatedVideo = { ...video, views: newViewCount, views_count: newViewCount };

// Save to memory so the Home Page and Player stay in sync
sessionStorage.setItem(`video_${video.id}`, JSON.stringify(updatedVideo));

setVideo(updatedVideo);
window.dispatchEvent(new CustomEvent("video_view_updated", {
  detail: { videoId: video.id, views: newViewCount },
}));
        viewIncremented.current = true;
      } catch (err) {
        console.error("Failed to increment view:", err);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [playing, video.id]);

  // ═══════════════════════════════════════════════════════════════
  // Keep player in sync if another tab/VideoCard fires the event
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const handler = (e) => {
      if (e.detail.videoId === video.id) {
        setVideo(prev => ({ ...prev, views: e.detail.views }));
      }
    };
    window.addEventListener("video_view_updated", handler);
    return () => window.removeEventListener("video_view_updated", handler);
  }, [video.id]);

  // Load related videos
  useEffect(() => {
    setDisplayLimit(4);
    setRelated(DEMO_VIDEOS.filter(v => v.id !== video.id));
    videoAPI.getFeed({ limit: 100 })
      .then(data => { if (data?.length) setRelated(data.filter(v => v.id !== video.id)); })
      .catch(() => {});
  }, [video.id]);

  // Watch history
  useEffect(() => {
    if (session?.user?.id && video?.id) {
      const timer = setTimeout(() => {
        historyAPI.addToHistory(session.user.id, video.id);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [video.id, session?.user?.id]);

  // Video element events
  useEffect(() => {
    const v = vRef.current; if (!v) return;
    setIsBuffering(true); setBuffered(0); setProg(0); setCurTime(0); setDur(0);
    const tryPlay = () => v.play().then(() => setPlaying(true)).catch(() => {});
    if (v.readyState >= 2) tryPlay(); else v.addEventListener("canplay", tryPlay, { once: true });
    const upd = () => { setCurTime(v.currentTime); setDur(v.duration || 0); setProg(v.duration ? (v.currentTime / v.duration) * 100 : 0); };
    const onWaiting  = () => setIsBuffering(true);
    const onPlay2    = () => setIsBuffering(false);
    const onSeeking  = () => setIsBuffering(true);
    const onSeeked   = () => setIsBuffering(false);
    const onProgress = () => { if (v.buffered.length && v.duration) setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100); };
    const onEnded    = () => startAutoCountdown();
    v.addEventListener("timeupdate",    upd);       v.addEventListener("loadedmetadata", upd);
    v.addEventListener("waiting",       onWaiting); v.addEventListener("playing",        onPlay2);
    v.addEventListener("seeking",       onSeeking); v.addEventListener("seeked",         onSeeked);
    v.addEventListener("progress",      onProgress); v.addEventListener("ended",          onEnded);
    return () => {
      v.removeEventListener("timeupdate",    upd);       v.removeEventListener("loadedmetadata", upd);
      v.removeEventListener("waiting",       onWaiting); v.removeEventListener("playing",        onPlay2);
      v.removeEventListener("seeking",       onSeeking); v.removeEventListener("seeked",         onSeeked);
      v.removeEventListener("progress",      onProgress); v.removeEventListener("ended",          onEnded);
      clearTimeout(ctrlTimer.current); clearTimeout(flashTimer.current); clearInterval(autoTimer.current);
    };
  }, [video.id, video.video_url]);

  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  useEffect(() => { if (!session) return; likeAPI.isSaved(session.user.id, video.id).then(setSaved); }, [session, video.id]);
  useEffect(() => {
    const fn = () => setIsFS(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener("fullscreenchange",       fn);
    document.addEventListener("webkitfullscreenchange", fn);
    return () => {
      document.removeEventListener("fullscreenchange",       fn);
      document.removeEventListener("webkitfullscreenchange", fn);
    };
  }, []);

  const startAutoCountdown = useCallback(() => {
    if (!related.length) return;
    setAutoCountdown(5); let count = 5;
    autoTimer.current = setInterval(() => {
      count--; setAutoCountdown(count);
      if (count <= 0) {
        clearInterval(autoTimer.current); setAutoCountdown(null);
        const next = related[0];
        if (next) { setVideo({ ...next, views: Number(next.views_count ?? next.views) || 0 }); setProg(0); setCurTime(0); setDur(0); }
      }
    }, 1000);
  }, [related]);

  const cancelAuto = useCallback(() => { clearInterval(autoTimer.current); setAutoCountdown(null); }, []);

  const playNext = useCallback(() => {
    cancelAuto();
    const next = related[0];
    if (next) { setVideo({ ...next, views: Number(next.views_count ?? next.views) || 0 }); setProg(0); setCurTime(0); setDur(0); }
  }, [related, cancelAuto]);

  const playRelated = useCallback(v => {
    cancelAuto();
    setVideo({ ...v, views: Number(v.views_count ?? v.views) || 0 });
    setProg(0); setCurTime(0); setDur(0);
    wrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [cancelAuto]);

  const revealCtrl = useCallback(() => {
    setShowCtrl(true); clearTimeout(ctrlTimer.current);
    ctrlTimer.current = setTimeout(() => setShowCtrl(false), 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const v = vRef.current; if (!v) return;
    if (v.paused) { v.play().then(() => setPlaying(true)).catch(() => {}); revealCtrl(); }
    else { v.pause(); setPlaying(false); setShowCtrl(true); clearTimeout(ctrlTimer.current); }
  }, [revealCtrl]);

  const seekBy = useCallback(secs => {
    const v = vRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + secs));
    const pct = v.duration ? Math.min((Math.abs(secs) / v.duration) * 100 * 6, 100) : 40;
    clearTimeout(flashTimer.current); setArcProg(0); setSeekFlash(secs > 0 ? "fwd" : "bwd");
    requestAnimationFrame(() => requestAnimationFrame(() => setArcProg(pct)));
    flashTimer.current = setTimeout(() => { setSeekFlash(null); setArcProg(0); }, 800);
    revealCtrl();
  }, [revealCtrl]);

  const enterFS = useCallback(() => {
    const el = wrapRef.current; if (!el) return;
    try { if (window.screen.orientation?.lock) window.screen.orientation.lock("landscape").catch(() => {}); } catch (e) {}
    const req = el.requestFullscreen || el.webkitRequestFullscreen; if (req) req.call(el).catch(() => {});
  }, []);

  const exitFS = useCallback(() => {
    try { if (window.screen.orientation?.unlock) window.screen.orientation.unlock(); } catch (e) {}
    const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) ex.call(document).catch(() => {});
  }, []);

  const toggleFS = useCallback(() => { if (isFS) exitFS(); else enterFS(); revealCtrl(); }, [isFS, enterFS, exitFS, revealCtrl]);

  useEffect(() => {
    const h = e => {
      if (e.key === "Escape") { if (isFS) exitFS(); else onClose(); return; }
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowRight") seekBy(10);
      if (e.key === "ArrowLeft")  seekBy(-10);
      if (e.key === "f" || e.key === "F") toggleFS();
      if (e.key === "n" || e.key === "N") playNext();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const handleTouchStart = e => {
    touchX0.current = e.touches[0].clientX; touchT0.current = Date.now();
    lpRef.current = setTimeout(() => {
      const v = vRef.current; if (!v) return;
      v.playbackRate = 2; setSpeed(2); setIs2x(true);
      clearTimeout(flashTimer.current); setSeekFlash("2x");
      flashTimer.current = setTimeout(() => setSeekFlash(null), 900);
    }, 600);
  };

  const handleTouchEnd = e => {
    clearTimeout(lpRef.current);
    if (is2x) { const v = vRef.current; if (v) v.playbackRate = 1; setSpeed(1); setIs2x(false); return; }
    const elapsed = Date.now() - (touchT0.current || 0);
    const dx = e.changedTouches[0].clientX - (touchX0.current || 0);
    if (elapsed < 500 && Math.abs(dx) < 10) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.changedTouches[0].clientX - rect.left;
      const third = rect.width / 3;
      if (x < third) seekBy(-10); else if (x > third * 2) seekBy(10); else togglePlay();
    }
    revealCtrl();
  };

  const handleShare = async () => {
    const shareData = {
      title: video.title || "Check out this video on LumineX",
      text: `Watch ${video.title} on LumineX`,
      url: `${window.location.origin}?v=${video.id}`,
    };
    try {
      if (navigator.share) { await navigator.share(shareData); showToast("Thanks for sharing!", "success"); }
      else { await navigator.clipboard.writeText(shareData.url); showToast("Link copied to clipboard! 📋", "success"); }
    } catch (error) {
      if (error.name !== "AbortError") showToast("Could not share link", "error");
    }
  };

  const handleDownload = () => {
    const a = document.createElement("a"); a.href = video.video_url;
    a.download = video.title + ".mp4"; a.target = "_blank"; a.click();
    showToast("Download started!", "success");
  };

  const handleSave = async () => {
    if (!session) { setAuthModal("login"); return; }
    const next = !saved; setSaved(next);
    await likeAPI.toggleSave(session.user.id, video.id, saved);
    showToast(next ? "❤️ Saved!" : "Removed from saved", "success");
  };

  const controlProps = {
    playing, muted, vol, prog, dur, curTime, speed, isFS, isMobile,
    showCtrl, vRef, captionLang, onCaptionChange: setCaptionLang,
    buffered, isBuffering,
    togglePlay, seekBy, toggleFS,
    setSpeedTo: s => { const v = vRef.current; if (v) v.playbackRate = s; setSpeed(s); },
    onMute:   () => { const v = vRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); },
    onVolume: n  => { setVol(n); if (vRef.current) { vRef.current.volume = n; vRef.current.muted = n === 0; setMuted(n === 0); } },
  };

  const pf = video.profiles || {};

  const handleProfileClick = (e) => {
    if (e) e.stopPropagation();
    const profileData = video?.user || pf;
    if (onClose) onClose(); else setPlayer(null);
    window.scrollTo(0, 0);
    setActiveProfile(profileData);
    setTab(`profile`);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, overflowY: "auto", animation: "fadeIn .15s ease" }}>
      {/* Top bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--headerBg)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, padding: isMobile ? "10px 12px" : "10px 20px", height: 52 }}>
        <button onClick={onClose} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: "50%", width: 34, height: 34, color: C.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        <AppIcon size={24} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.text }}>{video.title}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{pf.display_name || pf.username || ""}</div>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 340px", maxWidth: "100%", paddingBottom: isMobile ? 80 : 0 }}>

        {/* LEFT: Player + info + comments */}
        <div style={{ minWidth: 0 }}>
          {/* Player */}
          <div
            ref={wrapRef}
            onMouseMove={revealCtrl}
            onMouseLeave={() => { if (playing) { clearTimeout(ctrlTimer.current); ctrlTimer.current = setTimeout(() => setShowCtrl(false), 600); } }}
            style={{ position: "relative", background: "#000", width: "100%", aspectRatio: isFS ? "unset" : "16/9", userSelect: "none", ...(isFS ? { position: "fixed", inset: 0, zIndex: 99999 } : {}) }}
          >
            <video
              ref={vRef}
              src={video.video_url}
              playsInline
              onPlay={()  => setPlaying(true)}
              onPause={() => setPlaying(false)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              onClick={!isMobile ? togglePlay : undefined}
              onTouchStart={isMobile ? handleTouchStart : undefined}
              onTouchEnd={isMobile ? handleTouchEnd : undefined}
              onTouchMove={isMobile ? () => clearTimeout(lpRef.current) : undefined}
            >
              {captionLang !== "off" && video.caption_url && <track src={video.caption_url} kind="subtitles" label="English" default />}
            </video>

            {/* Buffering spinner */}
            {isBuffering && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 15, pointerEvents: "none" }}>
                <div style={{ position: "relative", width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid rgba(255,255,255,.1)" }} />
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid transparent", borderTopColor: C.accent, borderRightColor: C.accent2, animation: "spin .8s linear infinite" }} />
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: `linear-gradient(135deg,${C.accent},${C.accent2})`, boxShadow: `0 0 12px ${C.accent}` }} />
                </div>
              </div>
            )}

            {!playing && !isBuffering && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 10 }}>
                <div style={{ width: 76, height: 76, borderRadius: "50%", background: `${C.accent}cc`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: `0 0 60px ${C.accent}88`, animation: "pulseRing 1.8s infinite" }}>▶</div>
              </div>
            )}

            <SeekFlash seekFlash={seekFlash} arcProg={arcProg} />
            {is2x && <div style={{ position: "absolute", top: 14, right: 14, zIndex: 25, background: C.accent, color: "white", fontWeight: 800, fontSize: 12, padding: "4px 12px", borderRadius: 8 }}>2× SPEED</div>}

            {isMobile && showCtrl && !is2x && !seekFlash && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", pointerEvents: "none", zIndex: 8 }}>
                {[{ icon: "↺", l: "10" }, {}, { icon: "↻", l: "10" }].map((item, i) => (
                  <div key={i} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.icon && (
                      <div style={{ background: "rgba(0,0,0,.45)", borderRadius: 40, width: 46, height: 46, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,.14)" }}>
                        <span style={{ fontSize: 14 }}>{item.icon}</span>
                        <span style={{ fontSize: 8, color: "rgba(255,255,255,.7)", fontWeight: 700 }}>{item.l}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {autoCountdown !== null && <AutoPlayCountdown seconds={autoCountdown} onPlay={playNext} onCancel={cancelAuto} />}
            <ControlsBar {...controlProps} />
          </div>

          {/* Info section */}
          <div style={{ padding: isMobile ? "14px 12px" : "18px 20px" }}>
            <h1 style={{ fontSize: isMobile ? 16 : 21, fontWeight: 800, lineHeight: 1.35, marginBottom: 12, fontFamily: "'Syne',sans-serif", color: C.text }}>{video.title}</h1>

            <div
              onClick={handleProfileClick}
              style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all 0.2s ease", padding: "4px 8px", marginLeft: "-8px", borderRadius: "8px" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = 0.8; const n = e.currentTarget.querySelector(".profile-name-text"); if (n) n.style.textDecoration = "underline"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = 1;   const n = e.currentTarget.querySelector(".profile-name-text"); if (n) n.style.textDecoration = "none"; }}
            >
              <Avatar profile={pf} size={isMobile ? 34 : 42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="profile-name-text" style={{ fontSize: 14, fontWeight: 700, color: C.text, transition: "color 0.2s" }}>
                    {pf.display_name || pf.username || video.channel}
                  </span>
                  {pf.is_verified && <VerifiedBadge />}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>{fmtNum(pf.followers_count || 0)} followers</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* video.views is always the live value — updated by fresh fetch on open + increment after 3s */}
                <span style={{ fontSize: 11, color: C.muted }}>👁 {fmtNum(video.views)}</span>
                <span style={{ fontSize: 11, color: C.muted }}>· {timeAgo(video.created_at)}</span>
                {video.is_vip && <VipBadge />}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, marginTop: 12 }}>
              {[
                { icon: liked ? "❤️" : "🤍", label: fmtNum(likeCount), active: liked, color: C.accent3, onClick: toggleLike },
                { icon: "🔖", label: saved ? "Saved" : "Save", active: saved, color: C.accent, onClick: handleSave },
                { icon: "🔗", label: "Share", color: C.accent2, onClick: handleShare },
                { icon: "📥", label: "Download", color: C.muted, onClick: handleDownload },
              ].map(btn => <ActionBtn key={btn.label} {...btn} />)}
            </div>

            {video.description && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, padding: "12px 14px", background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden", maxHeight: descExpanded ? "none" : 64, position: "relative" }}>
                  {video.description}
                  {!descExpanded && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 32, background: `linear-gradient(transparent,${C.bg3})` }} />}
                </div>
                <span onClick={() => setDescExpanded(v => !v)} style={{ fontSize: 12, color: C.accent, cursor: "pointer", fontWeight: 600, marginTop: 4, display: "inline-block" }}>
                  {descExpanded ? "Show less ↑" : "Show more ↓"}
                </span>
              </div>
            )}

            {video.tags?.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                {video.tags.map(t => <span key={t} style={{ padding: "4px 10px", background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, color: C.muted }}>#{t}</span>)}
              </div>
            )}

            {isMobile && (
              <div style={{ marginBottom: 24 }}>
                <RelatedList videos={related.slice(0, displayLimit)} onPlay={playRelated} isMobile />
                {related.length > displayLimit && (
                  <button onClick={() => setDisplayLimit(p => p + 20)} style={loadMoreButtonStyle}>
                    Show More Videos
                  </button>
                )}
              </div>
            )}

            <CommentSection videoId={video.id} videoOwnerId={pf.id} />
          </div>
        </div>

        {/* RIGHT: Related (desktop sticky) */}
        {!isMobile && (
          <div style={{ borderLeft: `1px solid ${C.border}`, height: "calc(100vh - 52px)", position: "sticky", top: 52, overflowY: "auto", scrollbarWidth: "none", padding: "16px 16px 24px" }}>
            <RelatedList videos={related.slice(0, displayLimit)} onPlay={playRelated} isMobile={false} />
            {related.length > displayLimit && (
              <button
                onClick={() => setDisplayLimit(p => p + 20)}
                style={loadMoreButtonStyle}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)";      e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)"; }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.97)"}
                onMouseUp={e =>   e.currentTarget.style.transform = "scale(1.02)"}
              >
                Show More Videos
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, active, color, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${active || hov ? color : C.border}`, background: active || hov ? color + "1a" : C.bg3, color: active || hov ? color : C.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}
    >
      {icon} {label}
    </button>
  );
}

function RelatedList({ videos, onPlay, isMobile }) {
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 800, paddingBottom: 12, marginBottom: 4, borderBottom: `1px solid ${C.border}`, fontFamily: "'Syne',sans-serif", display: "flex", alignItems: "center", justifyContent: "space-between", color: C.text }}>
        <span>Up Next</span>
        {!isMobile && <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>Press N for next</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "1fr", gap: isMobile ? 10 : 4, marginTop: 8 }}>
        {videos.map((v, idx) => <RelatedCard key={v.id} video={v} index={idx} onPlay={onPlay} isMobile={isMobile} />)}
      </div>
    </>
  );
}

function RelatedCard({ video: v, index, onPlay, isMobile }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onPlay(v)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 0 : 10, padding: isMobile ? 0 : "8px 6px", borderRadius: 10, cursor: "pointer", background: hov ? C.bg3 : "transparent", transition: "background .2s", borderBottom: isMobile ? "none" : `1px solid ${C.border}22` }}
    >
      <div style={{ position: "relative", flexShrink: 0, width: isMobile ? "100%" : 120, aspectRatio: "16/9" }}>
        <img
          src={v.thumbnail_url || `https://picsum.photos/640/360?random=${String(v.id).charCodeAt?.(0) || index + 1}`}
          alt={v.title}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: isMobile ? "10px 10px 0 0" : 8 }}
        />
        {v.is_vip && <div style={{ position: "absolute", top: 4, left: 4 }}><VipBadge small /></div>}
        {v.duration && <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,.85)", color: "white", fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4 }}>{v.duration}</div>}
        {index === 0 && <div style={{ position: "absolute", top: 4, right: 4, background: C.accent, color: "white", fontSize: 8, fontWeight: 800, padding: "2px 6px", borderRadius: 4, letterSpacing: .5 }}>NEXT</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: isMobile ? "7px 8px 8px" : 0 }}>
        <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 600, lineHeight: 1.4, marginBottom: 3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", color: C.text }}>{v.title}</div>
        <div style={{ fontSize: 10, color: C.accent, fontWeight: 600, marginBottom: 2 }}>{v.profiles?.display_name || v.channel || "Unknown"}</div>
        <div style={{ fontSize: 9, color: C.muted }}>{fmtNum(v.views_count ?? v.views ?? 0)} views</div>
      </div>
    </div>
  );
}

const loadMoreButtonStyle = {
  width: "100%", padding: "14px 0", marginTop: "20px",
  background: `linear-gradient(135deg, ${C.accent}, ${C.accent2 || C.accent + "dd"})`,
  border: "none", borderRadius: "14px", color: "white",
  fontSize: "14px", fontWeight: "800", textTransform: "uppercase",
  letterSpacing: "1px", cursor: "pointer",
  boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  fontFamily: "inherit", display: "flex", alignItems: "center",
  justifyContent: "center", outline: "none",
};
