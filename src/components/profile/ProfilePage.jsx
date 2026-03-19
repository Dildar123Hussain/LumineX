import { useState, useEffect, useCallback, useRef } from "react";
import { C, Avatar, VerifiedBadge, VipBadge, Spinner, Btn, Input, Modal, Skeleton, fmtNum, timeAgo } from "../ui/index";
import { useApp } from "../../context/AppContext";
import { profileAPI, followAPI, videoAPI, vipAPI, likeAPI } from "../../lib/supabase";
import { useFollow, useIsMobile } from "../../hooks/index";
import { AVATARS } from "../../data/theme";
import VideoCard from "../VideoCard";

// --- 1. Top-Level Skeleton Helper ---
const ProfileGridSkeleton = ({ isMobile }) => (
  <div style={{ 
    display: "grid", 
    gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", 
    gap: isMobile ? 10 : 16 
  }}>
    {Array(6).fill(0).map((_, i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width="100%" style={{ aspectRatio: '16/9', borderRadius: 12, height: 'auto' }} />
        <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
        <Skeleton width="40%" height={10} />
      </div>
    ))}
  </div>
);

// --- 2. Main ProfilePage Component ---
export default function ProfilePage({ userId, passedData }) {
  const { session, profile: myProfile, activeProfile, refreshProfile, showToast, setTab } = useApp();
  const isMobile = useIsMobile();
  
  const [profile, setProfile] = useState(passedData || null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("videos");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [initFollowing, setInitFollowing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showFollow, setShowFollow] = useState(null);

  const isOwn = session?.user?.id === userId ||
    (myProfile && (myProfile.username === userId || myProfile.id === userId));

  const { following: isFollowing, toggle: toggleFollow, loading: followLoading } = useFollow(userId, initFollowing, profile, setProfile);

  // Fetch Profile Metadata (Bio, Stats, Follow Status)
  const loadMetadata = useCallback(async () => {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
      const p = isUUID ? await profileAPI.getById(userId) : await profileAPI.getByUsername(userId);

      if (p) {
        setProfile(p);
        if (session && session.user.id !== p.id) {
          const status = await followAPI.isFollowing(session.user.id, p.id);
          setInitFollowing(status);
        }
      }
    } catch (e) { console.error("Profile load error:", e); }
  }, [userId, session]);

  // Initial Sync Logic
  useEffect(() => {
    setVideos([]);
    if (passedData) setProfile(passedData);
    else if (isOwn && myProfile) setProfile(myProfile);
    else if (activeProfile && (activeProfile.username === userId || activeProfile.id === userId)) setProfile(activeProfile);
    
    loadMetadata();
  }, [userId, loadMetadata]);

  // Add this alongside your other useEffects
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && profile?.id) {
      // Refresh data when user comes back to this tab
      setLoading(true);
      const apiCall = activeTab === "saved" 
        ? likeAPI.getSaved(profile.id)
        : videoAPI.getFeed({ userId: profile.id, limit: 24 });

      apiCall.then(data => {
        setVideos(data || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
}, [activeTab, profile?.id]);


  // Tab-Specific Video Fetcher
  useEffect(() => {
    if (!profile?.id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = activeTab === "saved" 
          ? await likeAPI.getSaved(profile.id)
          : await videoAPI.getFeed({ userId: profile.id, limit: 24 });
        setVideos(data || []);
      } catch (err) { console.error("Fetch error:", err); }
      finally { setTimeout(() => setLoading(false), 300); }
    };
    fetchData();
  }, [activeTab, profile?.id]);

  // Global Event Listeners (Views & Saves)
  useEffect(() => {
    const handleViewUpdate = (e) => {
      const { videoId, views } = e.detail;
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, views_count: views, views: views } : v));
    };
    const handleSaveUpdate = (e) => {
      const { videoId, isSaved } = e.detail;
      if (activeTab === "saved" && !isSaved) {
        setVideos(prev => prev.filter(v => v.id !== videoId));
      }
    };
    window.addEventListener('video_view_updated', handleViewUpdate);
    window.addEventListener('video_save_updated', handleSaveUpdate);
    return () => {
      window.removeEventListener('video_view_updated', handleViewUpdate);
      window.removeEventListener('video_save_updated', handleSaveUpdate);
    };
  }, [activeTab]);

  // Follow Lists Loader
  useEffect(() => {
    followAPI.getFollowers(userId).then(setFollowers).catch(() => {});
    followAPI.getFollowing(userId).then(setFollowing).catch(() => {});
  }, [userId]);

  if (loading && !profile) return <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spinner size={36} /></div>;
  if (!profile && !loading) return <div style={{ textAlign: "center", padding: 80, color: C.muted }}>User not found</div>;

  const tabs = [
    { id: "videos", icon: "🎬", label: "Videos" },
    ...(isOwn ? [{ id: "saved", icon: "🔖", label: "Saved" }] : []),
  ];

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: isMobile ? "0 0 80px" : "20px 0 40px" }}>
      {/* Profile Header */}
      <div style={{ background: `linear-gradient(135deg,${C.bg2},${C.bg3})`, borderRadius: isMobile ? 0 : 20, padding: isMobile ? "20px 16px" : "32px 36px", marginBottom: 24, border: `1px solid ${C.border}`, position: "relative", overflow: "hidden" }}>
         <div style={{ position: "relative", display: "flex", gap: isMobile ? 16 : 28, alignItems: "flex-start" }}>
            <div style={{ width: isMobile ? 80 : 110, height: isMobile ? 80 : 110, borderRadius: "50%", padding: 3, background: `linear-gradient(135deg,${C.accent},${C.accent2},${C.accent3})` }}>
              <Avatar profile={profile} size={isMobile ? 74 : 104} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: C.text, margin: 0 }}>{profile.display_name || profile.username}</h1>
                {profile.is_verified && <VerifiedBadge size={18} />}
                {profile.is_vip && <VipBadge />}
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>@{profile.username}</div>
              {profile.bio && <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.6, marginBottom: 16 }}>{profile.bio}</p>}
              
              <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
                <div onClick={() => setShowFollow("followers")} style={{ cursor: "pointer" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{fmtNum(profile.followers_count || 0)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>FOLLOWERS</div>
                </div>
                <div onClick={() => setShowFollow("following")} style={{ cursor: "pointer" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{fmtNum(profile.following_count || 0)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>FOLLOWING</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {isOwn ? (
                  <>
                    <Btn onClick={() => setEditOpen(true)} size="sm" variant="secondary">✏️ Edit Profile</Btn>
                    {!profile.is_vip && <Btn onClick={() => { vipAPI.upgrade(userId).then(() => { showToast("🎉 You're VIP!", "success"); refreshProfile(); }).catch(e => showToast(e.message, "error")); }} variant="ghost" size="sm">👑 VIP</Btn>}
                  </>
                ) : (
                  <Btn onClick={toggleFollow} loading={followLoading} size="sm" variant={isFollowing ? "secondary" : "primary"}>
                    {isFollowing ? "✓ Following" : "+ Follow"}
                  </Btn>
                )}
              </div>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: "12px", background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: activeTab === t.id ? C.accent : C.muted, borderBottom: `2px solid ${activeTab === t.id ? C.accent : "transparent"}`, transition: ".2s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      {/* Videos grid section */}
{(activeTab === "videos" || activeTab === "saved") && (
  <div style={{ minHeight: '400px', marginTop: 10 }}>
    {loading ? (
      <ProfileGridSkeleton isMobile={isMobile} />
    ) : (videos.length === 0 && !loading) ? ( // <--- WRITTEN HERE
      <div style={{ 
        textAlign: "center", 
        padding: "80px 20px", 
        color: C.muted, 
        border: `1px dashed ${C.border}`, 
        borderRadius: 20 
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>
          {activeTab === "saved" ? "🔖" : "🎬"}
        </div>
        <div style={{ fontWeight: 700 }}>
          {activeTab === "saved" ? "No saved videos" : "No uploads yet"}
        </div>
        <p style={{ fontSize: 13, marginTop: 8 }}>
          {isOwn ? "Items you interact with will appear here." : "This gallery is currently empty."}
        </p>
      </div>
    ) : (
      /* --- ACTUAL VIDEO GRID --- */
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)", 
        gap: 12 
      }}>
        {videos.map(v => (
          <VideoCard key={v.id} video={v} compact={isMobile} showViews={true} />
        ))}
      </div>
    )}
  </div>
)}

      {/* Modals */}
      {editOpen && <EditModal profile={profile} onClose={() => setEditOpen(false)} onSave={p => { setProfile(p); setEditOpen(false); refreshProfile(); }} />}
      {showFollow && <Modal onClose={() => setShowFollow(null)} maxWidth={400}><h3 style={{ marginBottom: 16 }}>{showFollow === "followers" ? "Followers" : "Following"}</h3><FollowList users={showFollow === "followers" ? followers : following} /></Modal>}
    </div>
  );
}

// --- 3. Sub-Component: EditModal ---
function EditModal({ profile, onClose, onSave }) {
  const { session, showToast } = useApp();
  const [form, setForm] = useState({ display_name: profile.display_name || "", username: profile.username || "", bio: profile.bio || "", avatarId: "" });
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
      let updates = { display_name: form.display_name, bio: form.bio, username: form.username.toLowerCase() };
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
      <h3 style={{ marginBottom: 20 }}>Edit Profile</h3>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <Avatar profile={{ ...profile, avatar_url: avatarPrev, avatar_emoji: form.avatarId ? AVATARS.find(a => a.id === form.avatarId)?.emoji : profile.avatar_emoji }} size={80} />
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
          {AVATARS.slice(0, 5).map(av => (
            <div key={av.id} onClick={() => setForm({ ...form, avatarId: av.id })} style={{ cursor: "pointer", fontSize: 20, padding: 5, border: form.avatarId === av.id ? `2px solid ${C.accent}` : "none", borderRadius: "50%" }}>{av.emoji}</div>
          ))}
        </div>
        <label style={{ color: C.accent, cursor: "pointer", fontSize: 12, marginTop: 10, display: "block" }}>
          📷 Change Photo
          <input type="file" hidden onChange={e => { setAvatarFile(e.target.files[0]); setAvatarPrev(URL.createObjectURL(e.target.files[0])); setForm({ ...form, avatarId: "" }); }} />
        </label>
      </div>
      <Input label="Display Name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
      <Input label="Username" value={form.username} error={!usernameOk && "Taken"} onChange={e => { setForm({ ...form, username: e.target.value }); checkUser(e.target.value); }} />
      <textarea placeholder="Bio" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} style={{ width: "100%", background: C.bg3, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, minHeight: 80, marginTop: 10 }} />
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <Btn onClick={onClose} variant="secondary" style={{ flex: 1 }}>Cancel</Btn>
        <Btn onClick={save} loading={loading} style={{ flex: 1 }}>Save</Btn>
      </div>
    </Modal>
  );
}

// --- 4. Sub-Component: FollowList ---
function FollowList({ users }) {
  const { setTab } = useApp();
  if (!users?.length) return <div style={{ textAlign: "center", padding: 20, color: C.muted }}>None yet</div>;
  return (
    <div style={{ maxHeight: 400, overflowY: "auto" }}>
      {users.map(u => (
        <div key={u.id} onClick={() => setTab(`profile:${u.id}`)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
          <Avatar profile={u} size={40} />
          <div>
            <div style={{ fontWeight: 700, color: C.text }}>{u.display_name || u.username}</div>
            <div style={{ fontSize: 12, color: C.muted }}>@{u.username}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
