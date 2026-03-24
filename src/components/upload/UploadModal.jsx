import { useState, useRef, useEffect } from "react";
import { C, Modal, Btn, Input, Spinner } from "../ui/index";
import { useApp } from "../../context/AppContext";

const SPORTS_CATEGORIES = [
  { name: "Football/Soccer", icon: "⚽" },
  { name: "Basketball", icon: "🏀" },
  { name: "Cricket", icon: "🏏" },
  { name: "Tennis", icon: "🎾" },
  { name: "Boxing/MMA", icon: "🥊" },
  { name: "E-Sports", icon: "🎮" },
  { name: "Other", icon: "📁" }
];

export default function UploadModal() {
  const { uploadModal, setUploadModal } = useApp();
  
  const [step, setStep] = useState(1); 
  const [videoFile, setVideoFile] = useState(null);
  const [videoPrev, setVideoPrev] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [form, setForm] = useState({ title: "", category: "", description: "" });
  const [errors, setErrors] = useState({});
  const vInput = useRef(null);

  // Auto-disappear success message after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
        close();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  if (!uploadModal) return null;

  const close = () => {
    setUploadModal(false);
    setStep(1);
    setVideoFile(null);
    setVideoPrev(null);
    setForm({ title: "", category: "", description: "" });
    setErrors({});
  };

  const onVideoSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setVideoFile(f);
    setVideoPrev(URL.createObjectURL(f));
    // Clean up filename for the title
    setForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ") }));
    setStep(2);
  };

  const handleSubmit = async () => {
    // Mandatory Validation
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.category) e.category = "Please select a category";
    
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setErrors({});
    setIsUploading(true);

    // Dummy Upload Logic (Simulated)
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsUploading(false);
    setShowSuccess(true);
  };

  return (
    <Modal onClose={close} maxWidth={480}>
      <div style={{ position: "relative", minHeight: 300 }}>
        
        {/* Step 1: File Selection */}
        {step === 1 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <h2 style={headerStyle}>Upload Video</h2>
            <div onClick={() => vInput.current?.click()} style={dropzoneStyle}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📤</div>
              <p style={{ fontWeight: 700, color: C.text }}>Select video to upload</p>
              <p style={{ fontSize: 12, color: C.muted }}>MP4 or MOV up to 500MB</p>
              <input ref={vInput} type="file" accept="video/*" onChange={onVideoSelect} style={{ display: "none" }} />
            </div>
          </div>
        )}

        {/* Step 2: Form & Details */}
        {step === 2 && !showSuccess && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2 style={headerStyle}>Complete Details</h2>
            
            {/* Video Preview Holder */}
            <div style={previewBoxStyle}>
              <video src={videoPrev} muted style={videoElementStyle} />
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p style={previewLabelStyle}>Selected File</p>
                <p style={fileNameStyle}>{videoFile?.name}</p>
              </div>
              <Btn size="sm" variant="secondary" onClick={() => setStep(1)}>Change</Btn>
            </div>

            <Input 
              label="Video Title *" 
              value={form.title} 
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} 
              placeholder="Give your video a name"
              error={errors.title}
            />

            <div>
              <label style={labelStyle}>Category *</label>
              <select 
                style={{ ...selectStyle, borderColor: errors.category ? "#ff4d4d" : C.border }}
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              >
                <option value="">-- Select Sport Type --</option>
                {SPORTS_CATEGORIES.map(s => (
                  <option key={s.name} value={s.name}>{s.icon} {s.name}</option>
                ))}
              </select>
              {errors.category && <p style={errorStyle}>{errors.category}</p>}
            </div>

            <Btn onClick={handleSubmit} loading={isUploading} fullWidth>
              {isUploading ? "Uploading..." : "Submit Video"}
            </Btn>
          </div>
        )}

        {/* Success Popup (Full Modal Overlay) */}
        {showSuccess && (
          <div style={successOverlayStyle}>
            <div style={{ fontSize: 50 }}>🎉</div>
            <h2 style={{ color: "white", marginTop: 10 }}>Upload Successful!</h2>
            <p style={{ color: "rgba(255,255,255,0.8)" }}>Your video has been posted.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// --- Styles ---
const headerStyle = { fontSize: 20, fontWeight: 900, marginBottom: 20, textAlign: "center", color: C.text };
const dropzoneStyle = { border: `2px dashed ${C.border}`, borderRadius: 16, padding: "50px 20px", background: C.bg3, cursor: "pointer" };
const previewBoxStyle = { display: "flex", alignItems: "center", gap: 12, background: C.bg2, padding: 10, borderRadius: 12, border: `1px solid ${C.border}` };
const videoElementStyle = { width: 70, height: 40, borderRadius: 4, objectFit: "cover", background: "#000" };
const previewLabelStyle = { fontSize: 10, color: C.muted, fontWeight: 800, textTransform: "uppercase" };
const fileNameStyle = { fontSize: 12, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const labelStyle = { display: "block", fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, textTransform: "uppercase" };
const selectStyle = { width: "100%", background: C.bg3, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, padding: "12px", fontSize: 14, outline: "none" };
const errorStyle = { color: "#ff4d4d", fontSize: 11, marginTop: 4, fontWeight: 600 };
const successOverlayStyle = {
  position: "absolute", top: -20, left: -20, right: -20, bottom: -20,
  background: C.accent, borderRadius: 16, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", zIndex: 100, textAlign: "center"
};
