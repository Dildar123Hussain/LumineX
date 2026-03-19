import { useState, useRef } from "react";
import { C, Modal, Btn, Input, Spinner } from "../ui/index";
import { useApp } from "../../context/AppContext";
import { videoAPI } from "../../lib/supabase";
import { CATEGORIES } from "../../data/theme";

export default function UploadModal() {
  const { uploadModal,setUploadModal,session,profile,showToast } = useApp();
  const [step,setStep] = useState(1);
  const [videoFile,setVideoFile] = useState(null);
  const [thumbFile,setThumbFile] = useState(null);
  const [thumbPrev,setThumbPrev] = useState(null);
  const [videoPrev,setVideoPrev] = useState(null);
  const [pct,setPct] = useState(0);
  const [form,setForm] = useState({title:"",description:"",category:"Cinematic",tags:"",is_vip:false});
  const [errors,setErrors] = useState({});
  const vInput = useRef(null);
  const tInput = useRef(null);
  if(!uploadModal) return null;

  const close=()=>{ setUploadModal(false); setStep(1); setVideoFile(null); setThumbFile(null); setThumbPrev(null); setVideoPrev(null); setPct(0); setForm({title:"",description:"",category:"Cinematic",tags:"",is_vip:false}); };

  const onVideo=e=>{ const f=e.target.files[0]; if(!f) return; if(!f.type.startsWith("video/")){showToast("Please select a video file","error");return;} if(f.size>500*1024*1024){showToast("Video must be under 500MB","error");return;} setVideoFile(f); setVideoPrev(URL.createObjectURL(f)); if(!form.title) setForm(p=>({...p,title:f.name.replace(/\.[^.]+$/,"").replace(/[_-]/g," ")})); setStep(2); };
  const onThumb=e=>{ const f=e.target.files[0]; if(!f) return; setThumbFile(f); setThumbPrev(URL.createObjectURL(f)); };

  const validate=()=>{ const e={}; if(!form.title.trim()||form.title.length<3) e.title="Title must be at least 3 characters"; return e; };

  const submit=async()=>{
    const e=validate(); setErrors(e); if(Object.keys(e).length) return;
    setStep(3); setPct(0);
    const interval=setInterval(()=>setPct(p=>{ if(p>=90){clearInterval(interval);return 90;} return p+Math.random()*10; }),400);
    try {
      const tags=form.tags.split(",").map(t=>t.trim().toLowerCase()).filter(Boolean);
      await videoAPI.upload({ userId:session.user.id,file:videoFile,thumbnail:thumbFile,title:form.title,description:form.description,category:form.category,tags,isVip:form.is_vip&&!!profile?.is_vip });
      clearInterval(interval); setPct(100);
      setTimeout(()=>setStep(4),400);
    } catch(err) { clearInterval(interval); showToast(err.message||"Upload failed","error"); setStep(2); }
  };

  return (
    <Modal onClose={close} maxWidth={560}>
      <h2 style={{ fontSize:20,fontWeight:900,marginBottom:20,fontFamily:"'Syne',sans-serif",color:C.text }}>{step===4?"🎬 Upload Complete!":"📤 Upload Video"}</h2>

      {step===1&&(
        <div onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.background=`${C.accent}08`;}}
          onDragLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.bg3;}}
          onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.bg3;const f=e.dataTransfer.files[0];if(f)onVideo({target:{files:[f]}});}}
          onClick={()=>vInput.current?.click()}
          style={{ border:`2px dashed ${C.border}`,borderRadius:16,padding:"48px 24px",textAlign:"center",cursor:"pointer",transition:"all .2s",background:C.bg3 }}>
          <div style={{ fontSize:52,marginBottom:12 }}>🎬</div>
          <div style={{ fontSize:16,fontWeight:700,marginBottom:6,color:C.text }}>Drop your video here</div>
          <div style={{ fontSize:13,color:C.muted,marginBottom:20 }}>or click to browse · MP4, MOV, AVI · up to 500MB</div>
          <div style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"10px 24px",borderRadius:99,background:`linear-gradient(135deg,${C.accent},${C.accent2})`,color:"white",fontSize:14,fontWeight:700 }}>📤 Choose File</div>
          <input ref={vInput} type="file" accept="video/*" onChange={onVideo} style={{ display:"none" }}/>
        </div>
      )}

      {step===2&&(
        <div>
          <div style={{ display:"flex",gap:14,marginBottom:20,alignItems:"flex-start" }}>
            {videoPrev&&<video src={videoPrev} muted style={{ width:140,aspectRatio:"16/9",objectFit:"cover",borderRadius:10,flexShrink:0 }}/>}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12,color:C.muted,marginBottom:6 }}>Thumbnail (optional)</div>
              {thumbPrev?<div style={{ position:"relative" }}>
                <img src={thumbPrev} style={{ width:"100%",aspectRatio:"16/9",objectFit:"cover",borderRadius:10 }}/>
                <button onClick={()=>{setThumbFile(null);setThumbPrev(null);}} style={{ position:"absolute",top:4,right:4,background:"rgba(0,0,0,.7)",border:"none",borderRadius:"50%",width:24,height:24,color:"white",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
              </div>:
              <div onClick={()=>tInput.current?.click()} style={{ width:"100%",aspectRatio:"16/9",background:C.bg3,border:`2px dashed ${C.border}`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,color:C.muted,transition:"border-color .2s" }} onMouseEnter={e=>e.currentTarget.style.borderColor=C.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>+ Add thumbnail</div>}
              <input ref={tInput} type="file" accept="image/*" onChange={onThumb} style={{ display:"none" }}/>
            </div>
          </div>
          <Input label="Title *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Enter a descriptive title" error={errors.title}/>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block",fontSize:11,fontWeight:700,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:.5 }}>Description</label>
            <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Tell viewers about your video…" rows={3} style={{ width:"100%",background:C.bg3,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,fontFamily:"inherit",fontSize:14,padding:"10px 12px",outline:"none",resize:"none",transition:"border-color .2s" }} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block",fontSize:11,fontWeight:700,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:.5 }}>Category</label>
            <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{ width:"100%",background:C.bg3,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.text,fontFamily:"inherit",fontSize:14,padding:"11px 12px",outline:"none",cursor:"pointer" }}>
              {CATEGORIES.map(c=><option key={c.name} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <Input label="Tags (comma separated)" value={form.tags} onChange={e=>setForm(p=>({...p,tags:e.target.value}))} placeholder="vlog, travel, adventure" hint="Add up to 10 tags"/>
          {profile?.is_vip&&(
            <label style={{ display:"flex",alignItems:"center",gap:10,marginBottom:20,cursor:"pointer" }}>
              <div onClick={()=>setForm(p=>({...p,is_vip:!p.is_vip}))} style={{ width:44,height:24,borderRadius:12,transition:"background .2s",background:form.is_vip?C.accent:C.bg4,position:"relative",flexShrink:0 }}>
                <div style={{ position:"absolute",top:2,left:form.is_vip?20:2,width:20,height:20,borderRadius:"50%",background:"white",transition:"left .2s" }}/>
              </div>
              <div><div style={{ fontSize:13,fontWeight:600,color:C.text }}>👑 VIP-only content</div><div style={{ fontSize:11,color:C.muted }}>Only VIP subscribers can watch</div></div>
            </label>
          )}
          <div style={{ display:"flex",gap:10 }}>
            <Btn onClick={()=>setStep(1)} variant="secondary" style={{flex:1}}>← Back</Btn>
            <Btn onClick={submit} style={{flex:2}}>Upload Video 🚀</Btn>
          </div>
        </div>
      )}

      {step===3&&(
        <div style={{ textAlign:"center",padding:"20px 0" }}>
          <div style={{ fontSize:48,marginBottom:20 }}>📤</div>
          <div style={{ fontSize:16,fontWeight:700,marginBottom:6,color:C.text }}>Uploading your video…</div>
          <div style={{ fontSize:13,color:C.muted,marginBottom:24 }}>{form.title}</div>
          <div style={{ background:C.bg3,borderRadius:99,height:8,marginBottom:10,overflow:"hidden" }}>
            <div style={{ height:"100%",borderRadius:99,transition:"width .4s ease",background:`linear-gradient(90deg,${C.accent},${C.accent2})`,width:`${pct}%` }}/>
          </div>
          <div style={{ fontSize:13,color:C.muted }}>{Math.round(pct)}%</div>
        </div>
      )}

      {step===4&&(
        <div style={{ textAlign:"center",padding:"16px 0" }}>
          <div style={{ fontSize:64,marginBottom:16 }}>🎬</div>
          <p style={{ fontSize:14,color:C.muted,marginBottom:24,lineHeight:1.7 }}>Your video <strong style={{color:C.text}}>"{form.title}"</strong> has been uploaded successfully!</p>
          <Btn onClick={close} fullWidth size="lg">Done →</Btn>
        </div>
      )}
    </Modal>
  );
}
