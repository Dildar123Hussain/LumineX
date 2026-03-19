import { C } from "../ui/index";
import { useApp } from "../../context/AppContext";
import { useIsMobile } from "../../hooks/index";

const TABS=[{id:"home",label:"🏠 Home"},{id:"trending",label:"🔥 Trending"},{id:"new",label:"✨ New"},{id:"categories",label:"🏷 Categories"},{id:"channels",label:"📺 Channels"},{id:"saved",label:"❤️ Saved"},{id:"history",label:"🕐 History"},{id:"vip",label:"💎 VIP"}];
const MOB=[{id:"home",icon:"🏠",label:"Home"},{id:"trending",icon:"🔥",label:"Hot"},{id:"search",icon:"🔍",label:"Search"},{id:"saved",icon:"❤️",label:"Saved"},{id:"vip",icon:"💎",label:"VIP"}];

export default function NavTabs() {
  const { tab,setTab,setSearch } = useApp();
  const isMobile = useIsMobile();

  if (isMobile) return (
    <nav style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:900,background:"var(--headerBg)",backdropFilter:"blur(24px)",borderTop:`1px solid ${C.border}`,display:"flex",height:58,paddingBottom:"env(safe-area-inset-bottom)" }}>
      {MOB.map(t=>(
        <button key={t.id} onClick={()=>t.id==="search"?setSearch(true):setTab(t.id)} style={{ flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,color:tab===t.id?C.accent:C.muted,transition:"all .2s",fontSize:12,fontWeight:tab===t.id?700:500,fontFamily:"inherit",position:"relative" }}>
          <span style={{ fontSize:20,lineHeight:1 }}>{t.icon}</span>
          <span style={{ fontSize:9,letterSpacing:.3 }}>{t.label}</span>
          {tab===t.id&&t.id!=="search"&&<div style={{ position:"absolute",bottom:0,width:32,height:2,background:C.accent,borderRadius:2 }}/>}
        </button>
      ))}
    </nav>
  );

  return (
    <nav style={{ background:C.bg2,borderBottom:`1px solid ${C.border}`,position:"sticky",top:60,zIndex:900,overflowX:"auto",scrollbarWidth:"none" }}>
      <div style={{ maxWidth:1400,margin:"0 auto",display:"flex",padding:"0 20px",gap:2,minWidth:"max-content" }}>
        {TABS.map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"12px 18px",fontSize:12,fontWeight:700,color:tab===t.id?C.accent:C.muted,borderBottom:`2px solid ${tab===t.id?C.accent:"transparent"}`,cursor:"pointer",whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:.6,transition:"color .2s,border-color .2s" }}>{t.label}</div>
        ))}
      </div>
    </nav>
  );
}
