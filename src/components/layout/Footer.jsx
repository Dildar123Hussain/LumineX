import { useState } from "react";
import { C, Logo, AppIcon } from "../ui/index";
import { useApp } from "../../context/AppContext";
import { useIsMobile } from "../../hooks/index";

const LINKS = {
  Platform: [
    { label: "Home", tab: "home" },
    { label: "Trending", tab: "trending" },
    { label: "Categories", tab: "categories" },
    { label: "Channels", tab: "channels" },
    { label: "VIP Access", tab: "vip" },
  ],
  Account: [
    { label: "Sign Up", auth: "signup" },
    { label: "Login", auth: "login" },
    { label: "My Profile", profile: true },
    { label: "Upload Video", upload: true },
    { label: "Saved Videos", tab: "saved" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "DMCA", href: "#" },
    { label: "18 U.S.C. § 2257", href: "#" },
  ],
  Support: [
    { label: "Help Center", href: "#" },
    { label: "Contact Us", href: "#" },
    { label: "Report Content", href: "#" },
    { label: "Advertise", href: "#" },
    { label: "Become a Creator", href: "#" },
  ],
};

const SOCIALS = [
  { icon: "𝕏", label: "Twitter / X", href: "#", color: "#e7e9ea" },
  { icon: "f", label: "Facebook", href: "#", color: "#1877F2" },
  { icon: "in", label: "Instagram", href: "#", color: "#E1306C" },
  { icon: "▶", label: "YouTube", href: "#", color: "#FF0000" },
  { icon: "t", label: "TikTok", href: "#", color: "#69C9D0" },
  { icon: "d", label: "Discord", href: "#", color: "#5865F2" },
];

const BADGES = [
  { icon: "🔒", text: "SSL Secured" },
  { icon: "✅", text: "18+ Verified" },
  { icon: "🛡️", text: "Safe Payments" },
  { icon: "⚡", text: "99.9% Uptime" },
];

export default function Footer() {
  const { setTab, setAuthModal, profile, session, setUploadModal } = useApp();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [subDone, setSubDone] = useState(false);
  const [hovSocial, setHovSocial] = useState(null);

  const handleLink = (item) => {
    if (item.tab) setTab(item.tab);
    if (item.auth) setAuthModal(item.auth);
    if (item.upload) setUploadModal(true);
    if (item.profile && session && profile) setTab(`profile:${profile.id}`);
    else if (item.profile && !session) setAuthModal("login");
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setSubDone(true);
    setEmail("");
    setTimeout(() => setSubDone(false), 4000);
  };



  return (
    <footer style={{
      background: `linear-gradient(180deg, ${C.bg2} 0%, ${C.bg} 100%)`,
      borderTop: `1px solid ${C.border}`,
      marginTop: 60,
      paddingBottom: isMobile ? 70 : 0, // space for mobile nav bar
    }}>

      {/* ── Top accent line ── */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${C.accent}, ${C.accent2}, ${C.accent3}, ${C.accent})`, backgroundSize: "200% 100%", animation: "gradShift 4s ease infinite" }} />

      {/* ── Newsletter banner ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.accent}15, ${C.accent2}10, ${C.accent3}10)`,
        borderBottom: `1px solid ${C.border}`,
        padding: isMobile ? "28px 16px" : "36px 40px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", justifyContent: "space-between" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, fontFamily: "'Syne',sans-serif", color: C.text, marginBottom: 6 }}>
              Stay in the loop 🔔
            </div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
              Get notified about new content, VIP deals, and creator updates.
            </div>
          </div>
          <form onSubmit={handleSubscribe} style={{ display: "flex", gap: 8, flex: 1, minWidth: 280, maxWidth: 420 }}>
            {subDone ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", background: `${C.green}18`, border: `1.5px solid ${C.green}44`, borderRadius: 12, fontSize: 13, color: C.green, fontWeight: 600 }}>
                ✓ Subscribed! Thanks for joining.
              </div>
            ) : (
              <>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{ flex: 1, background: C.bg3, border: `1.5px solid ${C.border}`, borderRadius: 12, color: C.text, fontFamily: "inherit", fontSize: 13, padding: "11px 16px", outline: "none", transition: "border-color .2s" }}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                <button type="submit" style={{
                  background: `linear-gradient(135deg, ${C.accent}, ${C.accent2})`,
                  border: "none", borderRadius: 12, color: "white",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                  padding: "11px 20px", cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all .2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "none"}
                >
                  Subscribe →
                </button>
              </>
            )}
          </form>
        </div>
      </div>

      {/* ── Main links grid ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "36px 16px 28px" : "52px 40px 36px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr 1fr", gap: isMobile ? "32px 20px" : 32 }}>

          {/* Brand column */}
          <div style={{ gridColumn: isMobile ? "1 / -1" : "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <AppIcon size={36} />
              <Logo size={22} />
            </div>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, marginBottom: 20, maxWidth: 240 }}>
              The next-generation video streaming platform. Discover, share, and enjoy premium content from creators worldwide.
            </p>

            {/* Social icons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} title={s.label}
                  onMouseEnter={() => setHovSocial(s.label)}
                  onMouseLeave={() => setHovSocial(null)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: hovSocial === s.label ? s.color + "22" : C.bg3,
                    border: `1px solid ${hovSocial === s.label ? s.color + "66" : C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 900, color: hovSocial === s.label ? s.color : C.muted,
                    transition: "all .2s",
                    textDecoration: "none",
                    transform: hovSocial === s.label ? "translateY(-2px)" : "none",
                  }}>
                  {s.icon}
                </a>
              ))}
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
              {BADGES.map(b => (
                <div key={b.text} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  background: C.bg3, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: "4px 10px",
                  fontSize: 10, color: C.muted, fontWeight: 600, whiteSpace: "nowrap",
                }}>
                  <span>{b.icon}</span>{b.text}
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 14 }}>
                {group}
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
                {items.map(item => {
                  // 1. Check if the item is Login or Sign Up AND a session exists
                  const isDisabled = (item.label === "Login" || item.label === "Sign Up") && session;

                  return (
                    <li key={item.label}>
                      {item.href ? (
                        <a href={item.href} style={{ fontSize: 13, color: C.muted, textDecoration: "none", transition: "color .15s", display: "inline-block" }}
                          onMouseEnter={e => e.currentTarget.style.color = C.text}
                          onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                          {item.label}
                        </a>
                      ) : (
                        <span
                          // 2. Disable click logic
                          onClick={() => !isDisabled && handleLink(item)}
                          style={{
                            fontSize: 13,
                            // 3. Conditional styling for both Login and Sign Up
                            color: isDisabled ? C.border : C.muted,
                            cursor: isDisabled ? "not-allowed" : "pointer",
                            transition: "color .15s",
                            display: "inline-block",
                            opacity: isDisabled ? 0.5 : 1
                          }}
                          onMouseEnter={e => {
                            if (!isDisabled) e.currentTarget.style.color = C.text;
                          }}
                          onMouseLeave={e => {
                            if (!isDisabled) e.currentTarget.style.color = C.muted;
                          }}>
                          {item.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

            </div>
          ))}
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${C.border}, transparent)` }} />
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "20px 16px" : "22px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
          © {new Date().getFullYear()} LumineX. All rights reserved.<br />
          <span style={{ fontSize: 11 }}>
            All content on this site is for adults 18+.{" "}
            <a href="#" style={{ color: C.accent, textDecoration: "none" }}>18 U.S.C. § 2257 Statement</a>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {/* Age badge */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.accent}, ${C.accent3})`,
            fontSize: 10, fontWeight: 900, color: "white",
            boxShadow: `0 0 12px ${C.accent}44`,
          }}>18+</div>

          {/* App stores (decorative) */}

        </div>
      </div>

    </footer>
  );
}
