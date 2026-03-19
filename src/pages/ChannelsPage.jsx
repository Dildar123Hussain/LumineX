import { useState } from "react";
import { C, SectionHeader, fmtNum } from "../components/ui/index";
import { useApp } from "../context/AppContext";
import { useFollow, useIsMobile } from "../hooks/index";

const MOCK_CHANNELS = [
  {id:"ch1",username:"naturelens",    display_name:"NatureLens",        is_verified:true, followers_count:284000,bio:"4K nature & wildlife",    avatar_emoji:"🌿",avatar_bg:"linear-gradient(135deg,#10b981,#06b6d4)"},
  {id:"ch2",username:"urbanfilms",    display_name:"UrbanFilms",        is_verified:true, followers_count:156000,bio:"City vibes & street art",  avatar_emoji:"🏙️",avatar_bg:"linear-gradient(135deg,#6366f1,#8b5cf6)"},
  {id:"ch3",username:"wildcapture",   display_name:"WildCapture",       is_verified:false,followers_count:92000, bio:"Extreme sports & stunts", avatar_emoji:"🤿",avatar_bg:"linear-gradient(135deg,#ef4444,#f97316)"},
  {id:"ch4",username:"skylens",       display_name:"SkyLens",           is_verified:true, followers_count:341000,bio:"Aerial & drone footage",   avatar_emoji:"🚁",avatar_bg:"linear-gradient(135deg,#3b82f6,#6366f1)"},
  {id:"ch5",username:"beatlab",       display_name:"BeatLab",           is_verified:true, followers_count:218000,bio:"Music production & EDM",   avatar_emoji:"🎵",avatar_bg:"linear-gradient(135deg,#ec4899,#a855f7)"},
  {id:"ch6",username:"oceanvault",    display_name:"OceanVault",        is_verified:false,followers_count:67000, bio:"Deep sea exploration",     avatar_emoji:"🐋",avatar_bg:"linear-gradient(135deg,#0ea5e9,#2563eb)"},
  {id:"ch7",username:"fitlife",       display_name:"FitLife",           is_verified:true, followers_count:189000,bio:"Workouts & nutrition",      avatar_emoji:"💪",avatar_bg:"linear-gradient(135deg,#10b981,#16a34a)"},
  {id:"ch8",username:"autovault",     display_name:"AutoVault",         is_verified:true, followers_count:423000,bio:"Cars, reviews & joyrides",  avatar_emoji:"🏎️",avatar_bg:"linear-gradient(135deg,#64748b,#334155)"},
  {id:"ch9",username:"techden",       display_name:"TechDen",           is_verified:false,followers_count:134000,bio:"Tech reviews & setups",     avatar_emoji:"💻",avatar_bg:"linear-gradient(135deg,#a78bfa,#6366f1)"},
  {id:"ch10",username:"foodvault",    display_name:"FoodVault",         is_verified:true, followers_count:256000,bio:"Street food & recipes",      avatar_emoji:"🍜",avatar_bg:"linear-gradient(135deg,#f59e0b,#ef4444)"},
  {id:"ch11",username:"blender",      display_name:"Blender Foundation",is_verified:true, followers_count:891000,bio:"Open source animation",      avatar_emoji:"🎬",avatar_bg:"linear-gradient(135deg,#f97316,#fbbf24)"},
  {id:"ch12",username:"cosmostv",     display_name:"CosmosTV",          is_verified:true, followers_count:312000,bio:"Space & astronomy",           avatar_emoji:"🚀",avatar_bg:"linear-gradient(135deg,#1e293b,#4c1d95)"},
];

export default function ChannelsPage() {
  const isMobile = useIsMobile();
  return (
    <div>
      <SectionHeader title="📺 Top Channels"/>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill,minmax(180px,1fr))", gap: isMobile ? 10 : 14 }}>
        {MOCK_CHANNELS.map(ch => <ChannelCard key={ch.id} channel={ch}/>)}
      </div>
    </div>
  );
}

function ChannelCard({ channel }) {
  const { setTab } = useApp();
  const [hov, setHov] = useState(false);
  const { following, toggle, loading } = useFollow(channel.id, false);
  return (
    <div style={{ background: C.card, border: `1px solid ${hov ? C.accent + "44" : C.border}`, borderRadius: 16, padding: "20px 14px", textAlign: "center", transition: "all .25s", transform: hov ? "translateY(-3px)" : "none" }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div onClick={() => setTab(`profile:${channel.id}`)} style={{ cursor: "pointer", marginBottom: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: channel.avatar_bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 10px" }}>{channel.avatar_emoji}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          {channel.display_name}{channel.is_verified && <svg width={12} height={12} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="8" fill="#3b82f6"/><path d="M4.5 8L7 10.5L11.5 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>{fmtNum(following ? (channel.followers_count || 0) + 1 : channel.followers_count || 0)} followers</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.4 }}>{channel.bio}</div>
      </div>
      <button onClick={toggle} disabled={loading} style={{ width: "100%", padding: "8px", borderRadius: 10, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all .2s", border: `1px solid ${following ? C.accent : C.border}`, background: following ? `${C.accent}22` : "transparent", color: following ? C.accent : C.muted, opacity: loading ? .6 : 1 }}>
        {following ? "✓ Following" : "+ Follow"}
      </button>
    </div>
  );
}
