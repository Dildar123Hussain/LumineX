import { useState, useEffect, useCallback, useRef, useId } from "react";
import {
  C, Avatar, VerifiedBadge, VipBadge, Spinner, Btn, Input,
  Modal, Skeleton, fmtNum, timeAgo,
} from "../ui/index";
import { useApp } from "../../context/AppContext";
import { profileAPI, followAPI, videoAPI, vipAPI, likeAPI } from "../../lib/supabase";
import { useFollow, useIsMobile } from "../../hooks/index";
import { AVATARS } from "../../data/theme";
import VideoCard from "../VideoCard";

/* ─────────────────────────────────────────────────────────────
   SKELETON GRID
───────────────────────────────────────────────────────────── */
const ProfileGridSkeleton = ({ isMobile }) => (
  <div style={{
    display: "grid",
    gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)",
    gap: isMobile ? 10 : 16,
  }}>
    {Array(6).fill(0).map((_, i) => (
      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton width="100%" style={{ aspectRatio: "16/9", borderRadius: 12, height: "auto" }} />
        <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={10} />
      </div>
    ))}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   FOLLOW LIST — Instagram-style, each user clickable
───────────────────────────────────────────────────────────── */
function FollowList({ users, onClose }) {
  const { setTab, setActiveProfile } = useApp();
  const isMobile = useIsMobile();

  const handleClick = (u) => {
    setActiveProfile(u);
    setTab(`profile:${u.username || u.id}`);
    onClose?.(); // close modal on navigate
  };

  if (!users?.length) return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>No users yet</div>
    </div>
  );

  return (
    <div style={{ maxHeight: isMobile ? "60vh" : 480, overflowY: "auto" }}>
      {users.map(u => (
        <div
          key={u.id}
          onClick={() => handleClick(u)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 4px",
            borderBottom: `1px solid ${C.border}`,
            cursor: "pointer",
            borderRadius: 10,
            transition: "background .18s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.bg3}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Avatar profile={u} size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
                {u.display_name || u.username}
              </span>
              {u.is_verified && <VerifiedBadge size={13} />}
              {u.is_vip && <VipBadge small />}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>@{u.username}</div>
            {u.followers_count != null && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                {fmtNum(u.followers_count)} followers
              </div>
            )}
          </div>
          <span style={{ fontSize: 20, color: C.muted, flexShrink: 0 }}>›</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PROFILE PAGE
───────────────────────────────────────────────────────────── */
export default function ProfilePage({ userId, passedData, onClose }) {
  const {
    session, profile: myProfile, activeProfile,
    refreshProfile, showToast, setTab, setActiveProfile,
  } = useApp();
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState(passedData || null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("videos");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [initFollowing, setInitFollowing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showFollow, setShowFollow] = useState(null); // "followers" | "following" | null

  // Optimized isOwn logic
  const isOwn = !!(
    session?.user?.id &&
    (
      userId === session.user.id ||
      userId === myProfile?.username ||
      userId === myProfile?.display_name || // Added: check if the string is your username
      profile?.id === session.user.id
    )
  );

  //console.log('userid',userId,'myprofil',myProfile,'ses',session.user)

  const { following: isFollowing, toggle: toggleFollow, loading: followLoading } =
    useFollow(userId, initFollowing, profile, setProfile);

  /* ── Load profile + follow status ── */
  /* ── Load profile + follow status ── */
  const loadMetadata = useCallback(async () => {
    if (!userId) return;
    if (isOwn && myProfile && !profile) {
    setProfile(myProfile);
    return;
  }

    try {
      // 1. Clean the ID: Remove '@' and whitespace
      const cleanId = userId.startsWith('@') ? userId.slice(1).trim() : userId.trim();

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanId);

      const p = isUUID
        ? await profileAPI.getById(cleanId)
        : await profileAPI.getByUsername(cleanId);

      if (p) {
        setProfile(p);
        if (session?.user?.id && session.user.id !== p.id) {
          const status = await followAPI.isFollowing(session.user.id, p.id);
          setInitFollowing(status);
        }
      } else {
        // 2. Handle User Not Found: Clear profile so UI shows "User not found"
        setProfile(null);
      }
    } catch (e) {
      console.error("Profile load error:", e);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId, session]);

  /* ── Initial sync ── */
  useEffect(() => {
    setVideos([]);
    setActiveTab("videos");
    if (passedData) setProfile(passedData);
    else if (isOwn && myProfile) setProfile(myProfile);
    else if (activeProfile &&
      (activeProfile.username === userId || activeProfile.id === userId)) {
      setProfile(activeProfile);
    }
    loadMetadata();
  }, [userId, loadMetadata]);

  /* ── Tab data fetcher ── */
  // Line 150
  useEffect(() => {
    if (!profile?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === "saved") {
          // Double security check: If not owner, clear videos and stop
          if (!isOwn) {
            setVideos([]);
            setLoading(false);
            return;
          }
          const data = await likeAPI.getSaved(profile.id);
          setVideos(data || []);
        } else {
          // Default: Load public uploads
          const data = await videoAPI.getFeed({ userId: profile.id, limit: 24 });
          setVideos(data || []);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setTimeout(() => setLoading(false), 200);
      }
    };
    fetchData();
  }, [activeTab, profile?.id, isOwn]); // Adding isOwn as dependency

  /* ── Real-time view / save updates ── */
  useEffect(() => {
    const handleViewUpdate = (e) => {
      const { videoId, views } = e.detail;
      setVideos(prev =>
        prev.map(v => v.id === videoId ? { ...v, views_count: views, views } : v)
      );
    };
    const handleSaveUpdate = (e) => {
      const { videoId, isSaved } = e.detail;
      if (activeTab === "saved" && !isSaved) {
        setVideos(prev => prev.filter(v => v.id !== videoId));
      }
    };
    window.addEventListener("video_view_updated", handleViewUpdate);
    window.addEventListener("video_save_updated", handleSaveUpdate);
    return () => {
      window.removeEventListener("video_view_updated", handleViewUpdate);
      window.removeEventListener("video_save_updated", handleSaveUpdate);
    };
  }, [activeTab]);

  /* ── Load follow lists ── */
  useEffect(() => {
    if (!userId) return;
    followAPI.getFollowers(userId).then(setFollowers).catch(() => { });
    followAPI.getFollowing(userId).then(setFollowing).catch(() => { });
  }, [userId]);

  /* ── Visibility refresh ── */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && profile?.id) {
        setLoading(true);
        const call = (activeTab === "saved" && isOwn)
          ? likeAPI.getSaved(profile.id)
          : videoAPI.getFeed({ userId: profile.id, limit: 24 });
        call.then(d => { setVideos(d || []); setLoading(false); }).catch(() => setLoading(false));
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [activeTab, profile?.id, isOwn]);

  if (loading && !profile) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
      <Spinner size={36} />
    </div>
  );
  if (!profile && !loading) return (
    <div style={{ textAlign: "center", padding: 80, color: C.muted }}>User not found</div>
  );

  // Line 183
  const tabs = [
    { id: "videos", icon: "🎬", label: "Videos" },
    // This ensures the object only exists in the array if isOwn is true
    ...(isOwn ? [{ id: "saved", icon: "🔖", label: "Saved" }] : []),
  ];

  return (
    <div style={{
      maxWidth: 940, margin: "0 auto",
      padding: isMobile ? "0 0 80px" : "20px 0 40px",
      position: 'relative'
    }}>

      {/* ── ATTRACTIVE CLOSE BUTTON ── */}
      <button
        onClick={onClose}
        style={{
          position: isMobile ? "fixed" : "absolute",
          top: isMobile ? 56 : 10,
          right: isMobile ? 10 : -10, // Pulls it slightly out of the container on desktop
          zIndex: 1000,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: `1px solid ${C.border}`,
          background: "rgba(20, 20, 20, 0.6)",
          backdropFilter: "blur(10px)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 18,
          transition: "all 0.2s ease",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.background = C.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.background = "rgba(20, 20, 20, 0.6)";
        }}
      >
        ✕
      </button>
      {/* ── PROFILE HEADER ── */}
      <div style={{
        background: `linear-gradient(135deg,${C.bg2},${C.bg3})`,
        borderRadius: isMobile ? 0 : 20,
        padding: isMobile ? "20px 16px" : "32px 36px",
        marginBottom: 20,
        border: `1px solid ${C.border}`,
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div aria-hidden style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `${C.accent}12`, filter: "blur(50px)", pointerEvents: "none" }} />
        <div aria-hidden style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: `${C.accent2}0e`, filter: "blur(50px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", gap: isMobile ? 14 : 28, alignItems: "flex-start" }}>

          {/* Avatar with gradient ring */}
          <div style={{
            width: isMobile ? 80 : 110, height: isMobile ? 80 : 110,
            borderRadius: "50%", padding: 3, flexShrink: 0,
            background: `linear-gradient(135deg,${C.accent},${C.accent2},${C.accent3 || C.accent})`,
          }}>
            <Avatar profile={profile} size={isMobile ? 74 : 104} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name + badges */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
              <h1 style={{ fontSize: isMobile ? 19 : 26, fontWeight: 900, color: C.text, margin: 0, lineHeight: 1.2 }}>
                {profile.display_name || profile.username}
              </h1>
              {profile.is_verified && <VerifiedBadge size={isMobile ? 15 : 18} />}
              {profile.is_vip && <VipBadge />}
            </div>

            <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>@{profile.username}</div>

            {profile.bio && (
              <p style={{ fontSize: 13, color: C.textSub || C.muted, lineHeight: 1.6, marginBottom: 14, maxWidth: 480 }}>
                {profile.bio}
              </p>
            )}

            {/* ── Stats: followers / following / videos — all clickable ── */}
            <div style={{
              display: "flex",
              gap: isMobile ? 18 : 32,
              marginBottom: 16,
              flexWrap: "wrap",
            }}>
              {/* Followers */}
              <button
                onClick={() => setShowFollow("followers")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, textAlign: "left",
                  transition: "opacity .2s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.75}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: C.text, lineHeight: 1 }}>
                  {fmtNum(profile.followers_count || 0)}
                </div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: .5, textTransform: "uppercase", marginTop: 2 }}>
                  Followers
                </div>
              </button>

              {/* Following */}
              <button
                onClick={() => setShowFollow("following")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, textAlign: "left",
                  transition: "opacity .2s",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.75}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}
              >
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: C.text, lineHeight: 1 }}>
                  {fmtNum(profile.following_count || 0)}
                </div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: .5, textTransform: "uppercase", marginTop: 2 }}>
                  Following
                </div>
              </button>

              {/* Videos count */}
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 900, color: C.text, lineHeight: 1 }}>
                  {fmtNum(profile.videos_count || videos.length || 0)}
                </div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: .5, textTransform: "uppercase", marginTop: 2 }}>
                  Videos
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {isOwn ? (
                <>
                  <Btn onClick={() => setEditOpen(true)} size="sm" variant="secondary">
                    ✏️ Edit Profile
                  </Btn>
                  {!profile.is_vip && (
                    <Btn
                      onClick={() =>
                        vipAPI.upgrade(userId)
                          .then(() => { showToast("🎉 You're VIP!", "success"); refreshProfile(); })
                          .catch(e => showToast(e.message, "error"))
                      }
                      variant="ghost" size="sm"
                    >
                      👑 Go VIP
                    </Btn>
                  )}
                </>
              ) : (
                <Btn
                  onClick={toggleFollow}
                  loading={followLoading}
                  size="sm"
                  variant={isFollowing ? "secondary" : "primary"}
                  style={{
                    minWidth: 110,
                    background: isFollowing
                      ? C.bg3
                      : `linear-gradient(135deg,${C.accent},${C.accent2})`,
                  }}
                >
                  {isFollowing ? "✓ Following" : "+ Follow"}
                </Btn>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{
        display: "flex",
        borderBottom: `1px solid ${C.border}`,
        marginBottom: 20,
        overflowX: "auto",
        scrollbarWidth: "none",
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, minWidth: 80,
              padding: isMobile ? "10px 8px" : "13px 16px",
              background: "none", border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: isMobile ? 13 : 14,
              color: activeTab === t.id ? C.accent : C.muted,
              borderBottom: `2px solid ${activeTab === t.id ? C.accent : "transparent"}`,
              transition: ".2s", whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── VIDEO GRID ── */}
      {(activeTab === "videos" || activeTab === "saved") && (
        <div style={{ minHeight: 300, marginTop: 8 }}>
          {loading ? (
            <ProfileGridSkeleton isMobile={isMobile} />
          ) : videos.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "70px 20px", color: C.muted,
              border: `1px dashed ${C.border}`, borderRadius: 20,
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>
                {activeTab === "saved" ? "🔖" : "🎬"}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>
                {activeTab === "saved" ? "No saved videos" : "No uploads yet"}
              </div>
              <p style={{ fontSize: 13, marginTop: 8 }}>
                {isOwn
                  ? "Items you interact with will appear here."
                  : "This gallery is currently empty."}
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)",
              gap: isMobile ? 10 : 14,
            }}>
              {videos.map(v => (
                <VideoCard key={v.id} video={v} compact={isMobile} showViews />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editOpen && (
        <EditModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={p => { setProfile(p); setEditOpen(false); refreshProfile(); }}
        />
      )}

      {/* ── FOLLOWERS / FOLLOWING MODAL ── */}
      {showFollow && (
        <Modal onClose={() => setShowFollow(null)} maxWidth={440}>
          {/* Modal header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ display: "flex", gap: 0 }}>
              {["followers", "following"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setShowFollow(tab)}
                  style={{
                    padding: "8px 18px",
                    background: "none", border: "none",
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                    fontFamily: "inherit",
                    color: showFollow === tab ? C.text : C.muted,
                    borderBottom: `2px solid ${showFollow === tab ? C.accent : "transparent"}`,
                    transition: ".2s",
                  }}
                >
                  {tab === "followers"
                    ? `Followers (${fmtNum(followers.length)})`
                    : `Following (${fmtNum(following.length)})`}
                </button>
              ))}
            </div>
          </div>

          <FollowList
            users={showFollow === "followers" ? followers : following}
            onClose={() => setShowFollow(null)}
          />
        </Modal>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   EDIT MODAL
───────────────────────────────────────────────────────────── */
function EditModal({ profile, onClose, onSave }) {
  const { session, showToast } = useApp();
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    display_name: profile.display_name || "",
    username: profile.username || "",
    bio: profile.bio || "",
    avatarId: "",
  });
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPrev, setAvatarPrev] = useState(profile.avatar_url);
  const [usernameOk, setUsernameOk] = useState(true);
  const uTimer = useRef(null);

  const checkUser = val => {
    if (val === profile.username) { setUsernameOk(true); return; }
    clearTimeout(uTimer.current);
    uTimer.current = setTimeout(async () => {
      const taken = await profileAPI.checkUsername(val.toLowerCase());
      setUsernameOk(!taken);
    }, 500);
  };

  const save = async () => {
    if (!usernameOk) return;
    setLoading(true);
    try {
      let updates = {
        display_name: form.display_name,
        bio: form.bio,
        username: form.username.toLowerCase(),
      };
      if (avatarFile) {
        const url = await profileAPI.uploadAvatar(session.user.id, avatarFile);
        updates.avatar_url = url;
      }
      if (form.avatarId) {
        const av = AVATARS.find(a => a.id === form.avatarId);
        if (av) { updates.avatar_emoji = av.emoji; updates.avatar_bg = av.bg; updates.avatar_url = null; }
      }
      const updated = await profileAPI.update(session.user.id, updates);
      onSave(updated);
      showToast("Profile updated!", "success");
    } catch (e) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginBottom: 20, fontFamily: "'Syne',sans-serif" }}>Edit Profile</h3>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Avatar
          profile={{
            ...profile,
            avatar_url: avatarPrev,
            avatar_emoji: form.avatarId
              ? AVATARS.find(a => a.id === form.avatarId)?.emoji
              : profile.avatar_emoji,
          }}
          size={80}
        />
        <div style={{
          display: "flex", gap: 8, justifyContent: "center",
          marginTop: 12, flexWrap: "wrap",
        }}>
          {AVATARS.slice(0, 8).map(av => (
            <div
              key={av.id}
              onClick={() => setForm({ ...form, avatarId: av.id })}
              style={{
                cursor: "pointer", fontSize: 22, padding: 6,
                border: form.avatarId === av.id
                  ? `2px solid ${C.accent}`
                  : "2px solid transparent",
                borderRadius: "50%",
                background: form.avatarId === av.id ? `${C.accent}18` : "transparent",
                transition: "all .2s",
              }}
            >
              {av.emoji}
            </div>
          ))}
        </div>
        <label style={{
          color: C.accent, cursor: "pointer", fontSize: 12,
          marginTop: 10, display: "inline-block", fontWeight: 600,
        }}>
          📷 Upload Photo
          <input
            type="file" hidden accept="image/*"
            onChange={e => {
              setAvatarFile(e.target.files[0]);
              setAvatarPrev(URL.createObjectURL(e.target.files[0]));
              setForm({ ...form, avatarId: "" });
            }}
          />
        </label>
      </div>
      <Input
        label="Display Name"
        value={form.display_name}
        onChange={e => setForm({ ...form, display_name: e.target.value })}
      />
      <Input
        label="Username"
        value={form.username}
        error={!usernameOk ? "Username already taken" : undefined}
        onChange={e => { setForm({ ...form, username: e.target.value }); checkUser(e.target.value); }}
      />
      <textarea
        placeholder="Bio"
        value={form.bio}
        onChange={e => setForm({ ...form, bio: e.target.value })}
        style={{
          width: "100%", background: C.bg3, color: C.text,
          border: `1px solid ${C.border}`, borderRadius: 10,
          padding: 12, minHeight: 90, marginTop: 10,
          fontSize: 13, lineHeight: 1.6, resize: "vertical",
          fontFamily: "inherit", outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <Btn onClick={onClose} variant="secondary" style={{ flex: 1 }}>Cancel</Btn>
        <Btn onClick={save} loading={loading} style={{ flex: 1 }}>Save Changes</Btn>
      </div>
    </Modal>
  );
}
