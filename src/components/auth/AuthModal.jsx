import { useState, useRef, useEffect } from "react";
import { C, Logo, AppIcon, Input, Btn, Spinner, validateEmail } from "../ui/index";
import { useApp } from "../../context/AppContext";
import { authAPI, profileAPI } from "../../lib/supabase";
import { AVATARS } from "../../data/theme";

export default function AuthModal() {
  const { authModal, setAuthModal, showToast } = useApp();
  if (!authModal) return null;
  const onClose = () => setAuthModal(null);
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:"fixed",inset:0,zIndex:9500,background:"rgba(0,0,0,.85)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto",animation:"fadeIn .2s" }}>
      <div style={{ width:"100%",maxWidth:440,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:24,padding:"32px 28px",position:"relative",boxShadow:"0 40px 80px rgba(0,0,0,.7)",animation:"scaleIn .25s cubic-bezier(0.34,1.2,0.64,1)" }}>
        <div style={{ position:"absolute",inset:0,borderRadius:24,overflow:"hidden",pointerEvents:"none" }}>
          <div style={{ position:"absolute",top:-40,left:-40,width:200,height:200,borderRadius:"50%",background:`${C.accent}0d`,filter:"blur(40px)" }}/>
          <div style={{ position:"absolute",bottom:-40,right:-40,width:200,height:200,borderRadius:"50%",background:`${C.accent2}0d`,filter:"blur(40px)" }}/>
        </div>
        <button onClick={onClose} style={{ position:"absolute",top:14,right:14,zIndex:9999,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:"50%",width:32,height:32,color:C.muted,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"auto" }}>✕</button>
        <div style={{ textAlign:"center",marginBottom:24,position:"relative" }}>
          <div style={{ display:"flex",justifyContent:"center",marginBottom:12 }}><AppIcon size={40}/></div>
          <Logo size={22}/>
        </div>
        <div style={{ position:"relative" }}>
          {authModal==="login"  && <LoginForm  onSwitch={setAuthModal} onClose={onClose}/>}
          {authModal==="signup" && <SignupForm onSwitch={setAuthModal} onClose={onClose}/>}
          {authModal==="forgot" && <ForgotForm onSwitch={setAuthModal}/>}
        </div>
      </div>
    </div>
  );
}

function SocialDivider({label="or continue with"}) {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,margin:"16px 0" }}>
      <div style={{ flex:1,height:1,background:C.border }}/>
      <span style={{ fontSize:11,color:C.muted }}>{label}</span>
      <div style={{ flex:1,height:1,background:C.border }}/>
    </div>
  );
}

function GoogleBtn() {
  const { showToast } = useApp();
  const handleGoogle = async () => {
    try { await authAPI.signInWithGoogle(); }
    catch(e) { showToast(e.message||"Google sign in failed","error"); }
  };
  return (
    <button onClick={handleGoogle} style={{ width:"100%",padding:"11px",borderRadius:10,border:`1px solid ${C.border}`,background:C.bg3,color:C.text,fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all .2s" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="#4285F4";e.currentTarget.style.background="#4285F418";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.bg3;}}>
      <svg width={18} height={18} viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      Continue with Google
    </button>
  );
}

function LoginForm({ onSwitch, onClose }) {
  const { showToast } = useApp();
  const [email,setEmail] = useState("");
  const [pass,setPass] = useState("");
  const [errors,setErrors] = useState({});
  const [loading,setLoading] = useState(false);

  const submit = async () => {
    const e={};
    if(!email.trim()) e.email="Email required";
    else if(!validateEmail(email)) e.email="Invalid email format";
    if(!pass) e.pass="Password required";
    setErrors(e); if(Object.keys(e).length) return;
    setLoading(true);
    try { await authAPI.signIn({email,password:pass}); showToast("Welcome back! 🎉","success"); onClose(); }
    catch(err) { showToast(err.message||"Sign in failed","error"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <h2 style={{ fontSize:22,fontWeight:800,marginBottom:4,fontFamily:"'Syne',sans-serif",color:C.text }}>Welcome back 👋</h2>
      <p style={{ fontSize:13,color:C.muted,marginBottom:24 }}>Sign in to continue watching</p>
      <Input label="Email" type="email" icon="📧" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" error={errors.email}/>
      <Input label="Password" type="password" icon="🔒" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Your password" error={errors.pass} onKeyDown={e=>e.key==="Enter"&&submit()}/>
      <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:20,marginTop:-8 }}>
        <span onClick={()=>onSwitch("forgot")} style={{ fontSize:12,color:C.accent,cursor:"pointer",fontWeight:600 }}>Forgot password?</span>
      </div>
      <Btn onClick={submit} loading={loading} fullWidth size="lg">Sign In →</Btn>
      <SocialDivider/>
      <GoogleBtn/>
      <div style={{ textAlign:"center",marginTop:20,fontSize:13,color:C.muted }}>
        No account? <span onClick={()=>onSwitch("signup")} style={{ color:C.accent,cursor:"pointer",fontWeight:700 }}>Create one free</span>
      </div>
    </>
  );
}

function SignupForm({ onSwitch, onClose }) {
  const { showToast } = useApp();
  const [step,setStep] = useState(1);
  const [form,setForm] = useState({ name:"",username:"",email:"",pass:"",confirm:"",dob:"",agree:false,avatarId:"a9" });
  const [errors,setErrors] = useState({});
  const [loading,setLoading] = useState(false);
  const [usernameStatus,setUsernameStatus] = useState(null); // null|"checking"|"ok"|"taken"
  const uTimer = useRef(null);

  const set = k => v => setForm(p=>({...p,[k]:typeof v==="object"&&v.target?(v.target.type==="checkbox"?v.target.checked:v.target.value):v}));

  const checkUsername = val => {
    if(!val||val.length<3) { setUsernameStatus(null); return; }
    setUsernameStatus("checking");
    clearTimeout(uTimer.current);
    uTimer.current = setTimeout(async()=>{
      const taken = await profileAPI.checkUsername(val.toLowerCase());
      setUsernameStatus(taken?"taken":"ok");
    },500);
  };

  const nextStep = () => {
    const e={};
    if(!form.name.trim()||form.name.length<2) e.name="At least 2 characters";
    if(!form.username||form.username.length<3) e.username="At least 3 characters";
    else if(!/^[a-z0-9_]+$/.test(form.username)) e.username="Only a-z, 0-9, underscore";
    else if(usernameStatus==="taken") e.username="Username is taken";
    if(!form.email.trim()) e.email="Email required";
    else if(!validateEmail(form.email)) e.email="Invalid email format";
    setErrors(e); if(!Object.keys(e).length) setStep(2);
  };

  const submit = async () => {
    const e={};
    if(!form.pass||form.pass.length<8) e.pass="At least 8 characters";
    else if(!/[A-Z]/.test(form.pass)) e.pass="Must include uppercase letter";
    else if(!/[0-9]/.test(form.pass)) e.pass="Must include a number";
    if(form.pass!==form.confirm) e.confirm="Passwords don't match";
    if(!form.dob) e.dob="Date of birth required";
    else { const age=(Date.now()-new Date(form.dob))/(365.25*24*3600000); if(age<18) e.dob="Must be 18 or older"; }
    if(!form.agree) e.agree="You must agree to continue";
    setErrors(e); if(Object.keys(e).length) return;
    setLoading(true);
    try {
      const av = AVATARS.find(a=>a.id===form.avatarId)||AVATARS[8];
      await authAPI.signUp({ email:form.email,password:form.pass,username:form.username.toLowerCase(),displayName:form.name });
      showToast("Welcome to LumineX! 🎉","success"); onClose();
    } catch(err) { showToast(err.message||"Sign up failed","error"); }
    finally { setLoading(false); }
  };

  const strength = (() => { let s=0; if(form.pass.length>=8)s++; if(/[A-Z]/.test(form.pass))s++; if(/[0-9]/.test(form.pass))s++; if(/[^A-Za-z0-9]/.test(form.pass))s++; return s; })();
  const strColors = ["","#ef4444","#f59e0b","#3b82f6","var(--green)"];
  const strLabels = ["","Weak","Fair","Good","Strong"];

  return (
    <>
      <h2 style={{ fontSize:22,fontWeight:800,marginBottom:4,fontFamily:"'Syne',sans-serif",color:C.text }}>Create account 🚀</h2>
      <p style={{ fontSize:13,color:C.muted,marginBottom:20 }}>Step {step} of 2</p>
      <div style={{ display:"flex",gap:6,marginBottom:24 }}>
        {[1,2].map(s=><div key={s} style={{ flex:1,height:3,borderRadius:99,background:step>=s?`linear-gradient(90deg,${C.accent},${C.accent2})`:C.border,transition:"background .3s" }}/>)}
      </div>

      {step===1&&(
        <>
          <Input label="Full Name" icon="👤" value={form.name} onChange={set("name")} placeholder="Your name" error={errors.name}/>
          <div>
            <Input label="Username" icon="@" value={form.username}
              onChange={e=>{set("username")(e);checkUsername(e.target.value);}}
              placeholder="unique_username" error={errors.username}
              right={form.username.length>=3?(usernameStatus==="checking"?<Spinner size={14}/>:usernameStatus==="ok"?<span style={{color:C.green,fontSize:13}}>✓</span>:usernameStatus==="taken"?<span style={{color:C.red,fontSize:13}}>✗</span>:null):null}/>
            {form.username.length>=3&&usernameStatus!=="checking"&&(
              <div style={{ fontSize:11,marginTop:-12,marginBottom:8,color:usernameStatus==="ok"?C.green:C.red }}>
                {usernameStatus==="ok"?"✓ Username available":"✗ Username is taken"}
              </div>
            )}
          </div>
          <Input label="Email" type="email" icon="📧" value={form.email} onChange={set("email")} placeholder="you@example.com" error={errors.email}/>
          <SocialDivider label="or sign up with"/>
          <GoogleBtn/>
          <Btn onClick={nextStep} fullWidth size="lg" style={{marginTop:16}}>Continue →</Btn>
        </>
      )}

      {step===2&&(
        <>
          {/* Avatar picker */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.5,marginBottom:10 }}>Choose Avatar</div>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              {AVATARS.map(av=>(
                <div key={av.id} onClick={()=>set("avatarId")(av.id)} title={av.label} style={{ width:40,height:40,borderRadius:"50%",background:av.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer",border:`2px solid ${form.avatarId===av.id?"var(--accent)":"transparent"}`,transform:form.avatarId===av.id?"scale(1.15)":"scale(1)",transition:"all .2s" }}>{av.emoji}</div>
              ))}
            </div>
          </div>
          <Input label="Password" type="password" icon="🔒" value={form.pass} onChange={set("pass")} placeholder="Min 8 chars" error={errors.pass}/>
          {form.pass&&(
            <div style={{ marginTop:-10,marginBottom:14 }}>
              <div style={{ display:"flex",gap:3,marginBottom:4 }}>{[1,2,3,4].map(i=><div key={i} style={{ flex:1,height:3,borderRadius:99,background:i<=strength?strColors[strength]:C.border,transition:"background .3s" }}/>)}</div>
              <span style={{ fontSize:10,color:strColors[strength],fontWeight:600 }}>{strLabels[strength]}</span>
            </div>
          )}
          <Input label="Confirm Password" type="password" icon="🔒" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" error={errors.confirm}/>
          <Input label="Date of Birth" type="date" icon="🎂" value={form.dob} onChange={set("dob")} error={errors.dob} hint="You must be 18+ to use this platform"/>
          <label style={{ display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:errors.agree?4:20 }}>
            <input type="checkbox" checked={form.agree} onChange={set("agree")} style={{ accentColor:"var(--accent)",width:16,height:16,marginTop:2,flexShrink:0 }}/>
            <span style={{ fontSize:12,color:C.muted,lineHeight:1.6 }}>I agree to the <span style={{color:C.accent}}>Terms of Service</span> and <span style={{color:C.accent}}>Privacy Policy</span>. I confirm I am 18+.</span>
          </label>
          {errors.agree&&<div style={{ fontSize:11,color:C.red,marginBottom:14 }}>⚠ {errors.agree}</div>}
          <div style={{ display:"flex",gap:8 }}>
            <Btn onClick={()=>setStep(1)} variant="secondary" style={{flex:1}}>← Back</Btn>
            <Btn onClick={submit} loading={loading} style={{flex:2}}>Create Account 🎉</Btn>
          </div>
        </>
      )}

      <div style={{ textAlign:"center",marginTop:20,fontSize:13,color:C.muted }}>
        Have an account? <span onClick={()=>onSwitch("login")} style={{ color:C.accent,cursor:"pointer",fontWeight:700 }}>Sign in</span>
      </div>
    </>
  );
}

function ForgotForm({ onSwitch }) {
  const { showToast } = useApp();
  const [step,setStep] = useState(1);
  const [email,setEmail] = useState("");
  const [otp,setOtp] = useState(["","","","","",""]);
  const [pass,setPass] = useState("");
  const [confirm,setConfirm] = useState("");
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [timer,setTimer] = useState(60);
  const refs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  useEffect(()=>{
    if(step!==2) return;
    const t=setInterval(()=>setTimer(x=>x>0?x-1:0),1000);
    return ()=>clearInterval(t);
  },[step]);

  const sendCode = async()=>{
    if(!validateEmail(email)) { setError("Enter a valid email address"); return; }
    setError(""); setLoading(true);
    try { await authAPI.resetPassword(email); setStep(2); setTimer(60); showToast("Code sent!","success"); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const verifyOtp=()=>{ if(otp.join("").length<6){setError("Enter all 6 digits");return;} setError(""); setStep(3); };

  const resetPass=async()=>{
    if(pass.length<8){setError("At least 8 characters");return;}
    if(pass!==confirm){setError("Passwords don't match");return;}
    setError(""); setLoading(true);
    try { await authAPI.updatePassword(pass); setStep(4); }
    catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleOtp=(i,val)=>{ const v=val.replace(/\D/,"").slice(-1); const n=[...otp]; n[i]=v; setOtp(n); if(v&&i<5)refs[i+1].current?.focus(); };

  const titles=["","Reset Password","Check Your Email","New Password","Done! 🎉"];
  const subs=["","Enter your registered email","6-digit code sent to "+email,"Choose a strong new password","Password updated successfully!"];

  return (
    <>
      <h2 style={{ fontSize:22,fontWeight:800,marginBottom:4,fontFamily:"'Syne',sans-serif",color:C.text }}>{titles[step]}</h2>
      <p style={{ fontSize:13,color:C.muted,marginBottom:24 }}>{subs[step]}</p>
      {step===1&&(
        <>
          <Input label="Email Address" type="email" icon="📧" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" error={error} hint="We'll send a reset code to this email"/>
          <Btn onClick={sendCode} loading={loading} fullWidth size="lg">Send Reset Code →</Btn>
        </>
      )}
      {step===2&&(
        <>
          <div style={{ display:"flex",gap:8,justifyContent:"center",marginBottom:24 }}>
            {otp.map((v,i)=>(
              <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1} value={v}
                onChange={e=>handleOtp(i,e.target.value)}
                onKeyDown={e=>{if(e.key==="Backspace"&&!v&&i>0)refs[i-1].current?.focus();}}
                style={{ width:44,height:52,textAlign:"center",fontSize:20,fontWeight:800,background:C.bg3,border:`2px solid ${v?"var(--accent)":C.border}`,borderRadius:10,color:C.text,fontFamily:"inherit",outline:"none",transition:"border-color .2s",boxShadow:v?`0 0 0 3px var(--accent)22`:"none" }}/>
            ))}
          </div>
          {error&&<div style={{ fontSize:12,color:C.red,textAlign:"center",marginBottom:14 }}>⚠ {error}</div>}
          <Btn onClick={verifyOtp} fullWidth size="lg">Verify Code</Btn>
          <div style={{ textAlign:"center",marginTop:14,fontSize:12,color:C.muted }}>
            {timer>0?<span>Resend in <strong style={{color:C.accent}}>{timer}s</strong></span>:<span onClick={sendCode} style={{color:C.accent,cursor:"pointer",fontWeight:700}}>Resend code</span>}
          </div>
        </>
      )}
      {step===3&&(
        <>
          <Input label="New Password" type="password" icon="🔒" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Min 8 characters"/>
          <Input label="Confirm Password" type="password" icon="🔒" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat new password"/>
          {error&&<div style={{ fontSize:12,color:C.red,marginBottom:14 }}>⚠ {error}</div>}
          <Btn onClick={resetPass} loading={loading} fullWidth size="lg">Reset Password →</Btn>
        </>
      )}
      {step===4&&(
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:64,marginBottom:16 }}>✅</div>
          <Btn onClick={()=>onSwitch("login")} fullWidth size="lg">Go to Sign In →</Btn>
        </div>
      )}
      {step<4&&<div style={{ textAlign:"center",marginTop:20,fontSize:13,color:C.muted }}><span onClick={()=>onSwitch("login")} style={{ color:C.accent,cursor:"pointer",fontWeight:600 }}>← Back to Sign In</span></div>}
    </>
  );
}
