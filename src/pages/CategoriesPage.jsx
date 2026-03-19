import { useState } from "react";
import { C, SectionHeader } from "../components/ui/index";
import { useApp } from "../context/AppContext";
import { useIsMobile } from "../hooks/index";
import { CATEGORIES } from "../data/theme";

export default function CategoriesPage() {
  const { setTab } = useApp();
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: "block",
      width: "100%",
      overflow: "visible",
      minHeight: "600px",
      clear: "both"
    }}>
      <SectionHeader title="🏷 All Categories" />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3,1fr)" : "repeat(auto-fill,minmax(140px,1fr))", gap: isMobile ? 8 : 12 }}>
        {CATEGORIES.map(cat => <CatCard key={cat.name} cat={cat} onClick={() => setTab(`cat:${cat.name}`)} isMobile={isMobile} />)}
      </div>
    </div>
  );
}

function CatCard({ cat, onClick, isMobile }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? cat.color + "18" : C.card, border: `1.5px solid ${hov ? cat.color + "88" : C.border}`,
        borderRadius: 16, padding: isMobile ? "14px 8px" : "22px 14px", textAlign: "center", cursor: "pointer",
        transition: "all .3s cubic-bezier(0.34,1.2,0.64,1)",
        transform: hov ? "translateY(-5px) scale(1.03)" : "none",
        boxShadow: hov ? `0 14px 30px rgba(0,0,0,.5),0 0 25px ${cat.color}22` : "0 2px 8px rgba(0,0,0,.2)",
        position: "relative", overflow: "hidden",
      }}>
      {hov && !isMobile && (
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%,${cat.color}15 0%,transparent 70%)`, pointerEvents: "none" }} />
      )}
      <div style={{ fontSize: isMobile ? 26 : 34, marginBottom: 8, transition: "transform .3s", transform: hov ? "scale(1.18) rotate(-4deg)" : "scale(1)", display: "inline-block", position: "relative", zIndex: 1 }}>{cat.icon}</div>
      <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: hov ? cat.color : C.text, marginBottom: 3, transition: "color .3s", position: "relative", zIndex: 1 }}>{cat.name}</div>
      <div style={{ fontSize: 9, color: C.muted, position: "relative", zIndex: 1 }}>{cat.count}</div>
      {!isMobile && <div style={{ position: "absolute", bottom: 0, left: "50%", transform: `translateX(-50%) scaleX(${hov ? 1 : 0})`, width: "80%", height: 2, background: `linear-gradient(90deg,${cat.color},${cat.color}88)`, transition: "transform .3s ease", borderRadius: "99px 99px 0 0" }} />}
    </div>
  );
}
