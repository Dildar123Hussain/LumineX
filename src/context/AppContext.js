import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase, authAPI, profileAPI, notifAPI } from "../lib/supabase";

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [player, setPlayer] = useState(null);
  const [search, setSearch] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("home");
  const [authModal, setAuthModal] = useState(null);
  const [vipModal, setVipModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [theme, setThemeState] = useState(() => localStorage.getItem("lx_theme") || "dark");
  const toastTimer = useRef(null);
  const [activeProfile, setActiveProfile] = useState(null);


  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("light");
    else root.classList.remove("light");
    localStorage.setItem("lx_theme", theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    document.documentElement.classList.add("theme-transition");
    setThemeState(t => t === "dark" ? "light" : "dark");
    setTimeout(() => document.documentElement.classList.remove("theme-transition"), 400);
  }, []);

  // Auth init
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setAuthReady(true); setNotifCount(0); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Notification subscription
  useEffect(() => {
    if (!session?.user?.id) return;
    notifAPI.getUnreadCount(session.user.id).then(setNotifCount).catch(() => { });
    const sub = notifAPI.subscribe(session.user.id, () => {
      setNotifCount(c => c + 1);
    });
    return () => sub?.unsubscribe();
  }, [session?.user?.id]);

  const loadProfile = async (id) => {
    try {
      const p = await profileAPI.getById(id);
      setProfile(p);
    } catch (e) {
      console.error("Profile load:", e);
    } finally {
      setAuthReady(true);
    }
  };

    const showToast = useCallback((msg, type = "info") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);



useEffect(() => {
  // This listener is the "bridge" between your phone and laptop
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth Event:", event); // Debug to see the magic happen
    setSession(session);

    // If a session appears (from phone verification) or user signs in
    if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION')) {
      setAuthModal(null); // This will close the modal on your laptop!
    }
  });

  return () => subscription.unsubscribe();
}, []);


  const playVideo = useCallback((video) => {
    if (video.is_vip && !profile?.is_vip) { setVipModal(true); return; }
    setPlayer(video);
  }, [profile]);

  const signOut = useCallback(async () => {
    await authAPI.signOut();
    setSession(null); setProfile(null); setNotifCount(0);
    showToast("Signed out", "success");
  }, [showToast]);

  const refreshProfile = useCallback(() => {
    if (session?.user?.id) loadProfile(session.user.id);
  }, [session]);

  return (
    <Ctx.Provider value={{
      session, profile, authReady,
      player, setPlayer, playVideo,activeProfile,setActiveProfile,
      search, setSearch,
      toast, showToast,setTab,
      tab,
      authModal, setAuthModal,
      vipModal, setVipModal,
      uploadModal, setUploadModal,
      notifOpen, setNotifOpen,
      notifCount, setNotifCount,
      theme, toggleTheme,
      signOut, refreshProfile, loadProfile,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => useContext(Ctx);
