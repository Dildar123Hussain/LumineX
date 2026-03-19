import { createClient } from "@supabase/supabase-js";
const URL = process.env.REACT_APP_SUPABASE_URL || "https://your-project.supabase.co";
const ANON = process.env.REACT_APP_SUPABASE_ANON || "your-anon-key";

export const supabase = createClient(URL, ANON, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
});

// ── In-memory cache ────────────────────────────────────────────────────────
const CACHE = new Map();
const TTL = { short: 30_000, medium: 60_000, long: 300_000 };

export const cache = {
  get: (k) => { const e = CACHE.get(k); if (!e) return null; if (Date.now() - e.ts > e.ttl) { CACHE.delete(k); return null; } return e.data; },
  set: (k, data, ttl = TTL.medium) => { CACHE.set(k, { data, ts: Date.now(), ttl }); return data; },
  del: (k) => CACHE.delete(k),
  bust: (pat) => { for (const k of CACHE.keys()) if (k.includes(pat)) CACHE.delete(k); },
  clear: () => CACHE.clear(),
};

// ── Auth API ────────────────────────────────────────────────────────────────
export const authAPI = {
  async signUp({ email, password, username, displayName }) {
    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");
    const taken = await profileAPI.checkUsername(username);
    if (taken) throw new Error("Username is already taken");
    const { data, error } = await supabase.auth.signUp({
      email, password, options: {
        // This helps Supabase link the metadata immediately
        data: { username: username.toLowerCase(), display_name: displayName }
      }
    });
    if (error) throw error;
    console.log(data, 'eee', error)
    return data;
  },

  async signIn({ email, password }) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  },

  async signOut() { cache.clear(); return supabase.auth.signOut(); },

  async resetPassword(email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email address");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) throw error;
  },

  async updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  getSession: async () => (await supabase.auth.getSession()).data.session,
};

// ── Profile API ─────────────────────────────────────────────────────────────
export const profileAPI = {
  async getById(id) {
    const cached = cache.get(`profile:${id}`);
    if (cached) return cached;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (error) throw error;
    return cache.set(`profile:${id}`, data);
  },

  async getByUsername(username) {
    const cached = cache.get(`profile:u:${username}`);
    if (cached) return cached;
    const { data, error } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).single();
    if (error) throw error;
    return cache.set(`profile:u:${username}`, data);
  },

  async checkUsername(username) {
    const { data } = await supabase.from("profiles").select("id").eq("username", username.toLowerCase()).maybeSingle();
    return !!data;
  },

  async update(id, updates) {
    const { data, error } = await supabase.from("profiles").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    cache.bust(`profile:${id}`);
    return data;
  },

  async uploadAvatar(userId, file) {
    const ext = file.name.split(".").pop();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await profileAPI.update(userId, { avatar_url: publicUrl });
    return publicUrl;
  },

  async search(q) {
    const { data, error } = await supabase.from("profiles")
      .select("id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified,followers_count")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(20);
    if (error) throw error;
    return data || [];
  },
};

// ── Follow API ──────────────────────────────────────────────────────────────
export const followAPI = {
  async isFollowing(followerId, followingId) {
    if (!followerId) return false;
    const k = `follow:${followerId}:${followingId}`;
    const cached = cache.get(k);
    if (cached !== null) return cached;
    const { data } = await supabase.from("follows").select("id").eq("follower_id", followerId).eq("following_id", followingId).maybeSingle();
    return cache.set(k, !!data, TTL.short);
  },

  async follow(followerId, followingId) {
    const { error } = await supabase.from("follows").insert({ follower_id: followerId, following_id: followingId });
    if (error) throw error;
    cache.bust(`follow:${followerId}`);
    cache.bust(`profile:${followerId}`);
    cache.bust(`profile:${followingId}`);
    // Create notification
    await notifAPI.create({ userId: followingId, actorId: followerId, type: "follow" }).catch(() => { });
  },

  async unfollow(followerId, followingId) {
    const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
    if (error) throw error;
    cache.bust(`follow:${followerId}`);
    cache.bust(`profile:${followerId}`);
    cache.bust(`profile:${followingId}`);
  },

  async getFollowers(userId) {
    const { data, error } = await supabase.from("follows")
      .select("profiles!follows_follower_id_fkey(id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified,followers_count)")
      .eq("following_id", userId);
    if (error) throw error;
    return (data || []).map(d => d.profiles).filter(Boolean);
  },

  async getFollowing(userId) {
    const { data, error } = await supabase.from("follows")
      .select("profiles!follows_following_id_fkey(id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified,followers_count)")
      .eq("follower_id", userId);
    if (error) throw error;
    return (data || []).map(d => d.profiles).filter(Boolean);
  },

  async getFollowingIds(userId) {
    const k = `followingIds:${userId}`;
    const cached = cache.get(k);
    if (cached) return cached;
    const { data } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
    return cache.set(k, (data || []).map(d => d.following_id), TTL.short);
  },
};

// ── Video API ────────────────────────────────────────────────────────────────
export const videoAPI = {
  async getFeed({ page = 0, limit = 12, category = null, userId = null, followingIds = null } = {}) {
    let q = supabase.from("videos")
      .select("*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified,followers_count)")
      .order("created_at", { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (category) q = q.eq("category", category);
    if (userId) q = q.eq("user_id", userId);
    // prioritise following if provided
    if (followingIds?.length) {
      q = supabase.from("videos")
        .select("*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified,followers_count)")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);
    }
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  },

  async getTrending(limit = 12) {
    const { data, error } = await supabase.from("videos")
      .select("*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg,is_verified)")
      .order("views", { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  },

  async search(q) {
    const { data, error } = await supabase.from("videos")
      .select("*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg)")
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .limit(20);
    if (error) throw error;
    return data || [];
  },

 // src/lib/supabase.js
async incrementViews(id) {
  const { data, error } = await supabase.rpc("increment_views", { video_id: id });
  if (error) throw error;
  
  // Clear cache so other parts of the app get fresh data on next load
  cache.del(`video:${id}`); 
  
  return data; // This is now the actual number (e.g., 10)
},

  async upload({ userId, file, thumbnail, title, description, category, tags, isVip, duration }) {
    const ext = file.name.split(".").pop();
    const videoPath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("videos").upload(videoPath, file);
    if (upErr) throw upErr;
    const { data: { publicUrl: videoUrl } } = supabase.storage.from("videos").getPublicUrl(videoPath);
    let thumbUrl = null;
    if (thumbnail) {
      const tp = `${userId}/${Date.now()}_thumb.jpg`;
      await supabase.storage.from("thumbnails").upload(tp, thumbnail, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("thumbnails").getPublicUrl(tp);
      thumbUrl = publicUrl;
    }
    const { data, error } = await supabase.from("videos").insert({
      user_id: userId, video_url: videoUrl, thumbnail_url: thumbUrl,
      title, description, category, tags, is_vip: isVip, duration,
    }).select("*, profiles(id,username,display_name,avatar_url)").single();
    if (error) throw error;
    cache.bust("feed:");
    // Notify followers
    await notifAPI.notifyFollowers(userId, "video", data.id).catch(() => { });
    return data;
  },

  async delete(videoId, userId) {
    const { error } = await supabase.from("videos").delete().eq("id", videoId).eq("user_id", userId);
    if (error) throw error;
    cache.bust("feed:");
    cache.del(`video:${videoId}`);
  },
};

// ── Like API ─────────────────────────────────────────────────────────────────
export const likeAPI = {
  async isLiked(userId, videoId) {
    if (!userId) return false;
    const k = `like:${userId}:${videoId}`;
    const c = cache.get(k);
    if (c !== null) return c;
    const { data } = await supabase.from("video_likes").select("id").eq("user_id", userId).eq("video_id", videoId).maybeSingle();
    return cache.set(k, !!data, TTL.short);
  },

  async toggle(userId, videoId, isLiked, videoOwnerId) {
    if (isLiked) {
      await supabase.from("video_likes").delete().eq("user_id", userId).eq("video_id", videoId);
    } else {
      await supabase.from("video_likes").insert({ user_id: userId, video_id: videoId });
      if (videoOwnerId && videoOwnerId !== userId) {
        await notifAPI.create({ userId: videoOwnerId, actorId: userId, type: "like", videoId }).catch(() => { });
      }
    }
    cache.del(`like:${userId}:${videoId}`);
    cache.del(`video:${videoId}`);
  },

async isSaved(userId, videoId) {
    if (!userId) return false;
    // 1. Check Cache first
    const k = `save:${userId}:${videoId}`;
    const c = cache.get(k);
    if (c !== null) return c;

    const { data } = await supabase.from("saved_videos").select("id").eq("user_id", userId).eq("video_id", videoId).maybeSingle();
    
    // 2. Set Cache
    return cache.set(k, !!data, TTL.short);
  },

  async toggleSave(userId, videoId, isSaved) {
    if (isSaved) {
      await supabase.from("saved_videos").delete().eq("user_id", userId).eq("video_id", videoId);
    } else {
      await supabase.from("saved_videos").insert({ user_id: userId, video_id: videoId });
    }
    // 3. Clear Cache on change
    cache.del(`save:${userId}:${videoId}`);
  },

  async getSaved(userId) {
    const { data, error } = await supabase.from("saved_videos")
      .select("videos(*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg))")
      .eq("user_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(d => d.videos).filter(Boolean);
  },

  async getLikedVideoIds(userId, videoIds) {
    if (!userId || !videoIds.length) return [];
    const { data } = await supabase.from("video_likes").select("video_id").eq("user_id", userId).in("video_id", videoIds);
    return (data || []).map(d => d.video_id);
  },
};

// ── Comment API ──────────────────────────────────────────────────────────────
export const commentAPI = {
  async getForVideo(videoId) {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *, 
        profiles:user_id (id, username, display_name, avatar_url, avatar_emoji, avatar_bg)
      `)
      .eq("video_id", videoId)
      // REMOVED: .is("parent_id", null) <- This was the bug!
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async add({ videoId, userId, body, parentId = null, videoOwnerId = null, reply_to_user = null }) {
    // 1. Include reply_to_user in the insert object
    const { data, error } = await supabase.from("comments")
      .insert({
        video_id: videoId,
        user_id: userId,
        body,
        parent_id: parentId,
        reply_to_user: reply_to_user // This ensures it saves to the DB
      })
      .select("*, profiles(id,username,display_name,avatar_url,avatar_emoji,avatar_bg)")
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      throw error;
    }

    // 2. Notify video owner (if not commenting on own video)
    if (videoOwnerId && videoOwnerId !== userId && !parentId) {
      await notifAPI.create({
        userId: videoOwnerId,
        actorId: userId,
        type: "comment",
        videoId,
        commentId: data.id
      }).catch(() => { });
    }

    return data;
  },

  async delete(commentId, userId) {
    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", userId);
    if (error) throw error;
  },

  async toggleLike(userId, commentId, isLiked) {
    if (isLiked) await supabase.from("comment_likes").delete().eq("user_id", userId).eq("comment_id", commentId);
    else await supabase.from("comment_likes").insert({ user_id: userId, comment_id: commentId });
  },

  async getLikedIds(userId, commentIds) {
    if (!userId || !commentIds.length) return [];
    const { data } = await supabase.from("comment_likes").select("comment_id").eq("user_id", userId).in("comment_id", commentIds);
    return (data || []).map(d => d.comment_id);
  },

  subscribeToVideo(videoId, cb) {
    return supabase.channel(`comments:${videoId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `video_id=eq.${videoId}` }, cb)
      .subscribe();
  },
};

// ── Notification API ─────────────────────────────────────────────────────────
export const notifAPI = {
  async getForUser(userId) {
    const { data, error } = await supabase.from("notifications")
      .select("*, actor:profiles!notifications_actor_id_fkey(id,username,display_name,avatar_url,avatar_emoji,avatar_bg), videos(id,title,thumbnail_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    return data || [];
  },

  async create({ userId, actorId, type, videoId = null, commentId = null }) {
    if (userId === actorId) return; // don't self-notify
    await supabase.from("notifications").insert({
      user_id: userId, actor_id: actorId, type,
      video_id: videoId || null,
      comment_id: commentId || null,
    });
  },

  async markRead(userId) {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  },

  async markOneRead(notifId) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", notifId);
  },

  async getUnreadCount(userId) {
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false);
    return count || 0;
  },

  async notifyFollowers(userId, type, videoId = null) {
    // Get all followers and notify them
    const { data } = await supabase.from("follows").select("follower_id").eq("following_id", userId);
    if (!data?.length) return;
    const inserts = data.map(d => ({ user_id: d.follower_id, actor_id: userId, type, video_id: videoId }));
    await supabase.from("notifications").insert(inserts);
  },

  subscribe(userId, cb) {
    return supabase.channel(`notifs:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, cb)
      .subscribe();
  },
};

// ── VIP API ──────────────────────────────────────────────────────────────────
export const vipAPI = {
  async upgrade(userId) {
    const { data, error } = await supabase.from("profiles").update({ is_vip: true }).eq("id", userId).select().single();
    if (error) throw error;
    cache.bust(`profile:${userId}`);
    return data;
  },
};

// ── History API ─────────────────────────────────────────────────────────────
export const historyAPI = {
  async addToHistory(userId, videoId) {
    if (!userId || !videoId) return;
    const { error } = await supabase
      .from("watch_history")
      .upsert(
        { 
          user_id: userId, 
          video_id: videoId, 
          watched_at: new Date().toISOString() 
        },
        { onConflict: 'user_id, video_id' } 
      );
    if (error) console.error("Error updating history:", error.message);
  },

  async getHistory(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("watch_history")
      .select(`
        id,
        watched_at,
        video:video_id (
          id, title, thumbnail_url, video_url, views, category, duration
        )
      `)
      .eq("user_id", userId)
      .order("watched_at", { ascending: false });

    if (error) return [];
    return data.map(item => ({
      ...item.video,
      watched_at: item.watched_at,
      historyId: item.id
    }));
  },

  // NEW: Pure database delete function
  async deleteHistoryItem(historyId) {
    return await supabase.from("watch_history").delete().eq("id", historyId);
  },

  // NEW: Pure database clear function
  async clearAllHistory(userId) {
    return await supabase.from("watch_history").delete().eq("user_id", userId);
  }
};
