import React, { useState, useEffect, useContext } from "react";
import { Save, Eye, EyeOff, Moon, Sun, Copy, Check } from "lucide-react";
import api from "../../api/api";
import { UserContext } from "../../context/UserContext";
import { useToast } from "../../hooks/useToast";

const Toggle = ({ checked, onChange, icon, label, desc }) => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"var(--admin-card)",border:"1px solid var(--admin-border)",borderRadius:12,marginBottom:8}}>
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <span style={{fontSize:"1.1rem"}}>{icon}</span>
      <div>
        <div style={{fontWeight:600,fontSize:".875rem",color:"var(--admin-text)"}}>{label}</div>
        {desc && <div style={{fontSize:".75rem",color:"var(--admin-muted)",marginTop:2}}>{desc}</div>}
      </div>
    </div>
    <button onClick={()=>onChange(!checked)} style={{width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",background:checked?"var(--admin-accent)":"#cbd5e1",position:"relative",transition:"background .2s",flexShrink:0}}>
      <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:4,left:checked?24:4,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
    </button>
  </div>
);

const Section = ({ icon, title, children }) => (
  <div style={{background:"var(--admin-card)",border:"1px solid var(--admin-border)",borderRadius:16,padding:20,marginBottom:20}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:14,borderBottom:"1px solid var(--admin-border)"}}>
      <span style={{fontSize:"1.1rem"}}>{icon}</span>
      <h3 style={{margin:0,fontSize:".95rem",fontWeight:700,color:"var(--admin-text)"}}>{title}</h3>
    </div>
    {children}
  </div>
);

export default function AdminSettings() {
  const { adminTheme, setAdminTheme, user, setUser } = useContext(UserContext);
  const { showToast, ToastEl } = useToast();

  // Profile — pre-filled from UserContext
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Secret key
  const [secretKey, setSecretKey] = useState("UHC-ADMIN-2024");
  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  // Toggles
  const [noScreenshot, setNoScreenshot] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [quizTimer, setQuizTimer] = useState(true);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [globalAnnouncement, setGlobalAnnouncement] = useState("");
  const [allowGuestAccess, setAllowGuestAccess] = useState(false);
  const [disableFeed, setDisableFeed] = useState(false);
  // Superadmin feature flags
  const [disableQuiz, setDisableQuiz] = useState(false);
  const [disableLibrary, setDisableLibrary] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("");

  // Contact & Social
  const [contactInfo, setContactInfo] = useState({ email:"",phone:"",whatsapp:"",facebook:"",tiktok:"",instagram:"",twitter:"",youtube:"" });

  // Sync profile fields if user context updates
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  // Load all settings from backend
  useEffect(() => {
    const load = async () => {
      try {
        const keys = ["noScreenshot","maintenanceMode","quizTimer","registrationOpen","globalAnnouncement","allowGuestAccess","disableFeed","disableQuiz","disableLibrary","heroImageUrl","contactInfo"];
        const results = await Promise.allSettled(keys.map(k => api.get(`settings/${k}`)));
        const map = {};
        results.forEach((r, i) => { if (r.status==="fulfilled" && r.value.data?.value != null) map[keys[i]] = r.value.data.value; });
        if (map.noScreenshot != null) setNoScreenshot(map.noScreenshot);
        if (map.maintenanceMode != null) setMaintenanceMode(map.maintenanceMode);
        if (map.quizTimer != null) setQuizTimer(map.quizTimer);
        if (map.registrationOpen != null) setRegistrationOpen(map.registrationOpen);
        if (map.globalAnnouncement != null) setGlobalAnnouncement(map.globalAnnouncement);
        if (map.allowGuestAccess != null) setAllowGuestAccess(map.allowGuestAccess);
        if (map.disableFeed != null) setDisableFeed(map.disableFeed);
        if (map.disableQuiz != null) setDisableQuiz(map.disableQuiz);
        if (map.disableLibrary != null) setDisableLibrary(map.disableLibrary);
        if (map.heroImageUrl) setHeroImageUrl(map.heroImageUrl);
        if (map.contactInfo) setContactInfo(prev => ({ ...prev, ...map.contactInfo }));
      } catch {}
    };
    load();
  }, []);

  const saveProfile = async () => {
    if (password && password !== confirmPass) { showToast("Passwords do not match", "error"); return; }
    if (password && password.length < 6) { showToast("Password must be at least 6 characters", "error"); return; }
    setSavingProfile(true);
    try {
      const payload = { name, email };
      if (password) payload.password = password;
      const res = await api.put("auth/admin-profile", payload);
      setUser(res.data); // update context + localStorage
      setPassword(""); setConfirmPass("");
      showToast("Profile saved successfully");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save profile", "error");
    } finally { setSavingProfile(false); }
  };



  const saveSecurity = async () => {
    try {
      await Promise.all([
        api.post("settings", { key:"noScreenshot", value:noScreenshot }),
        api.post("settings", { key:"quizTimer", value:quizTimer }),
      ]);
      showToast("Security settings saved");
    } catch { showToast("Failed to save security settings", "error"); }
  };

  const saveSystem = async () => {
    try {
      await Promise.all([
        api.post("settings", { key:"maintenanceMode", value:maintenanceMode }),
        api.post("settings", { key:"registrationOpen", value:registrationOpen }),
        api.post("settings", { key:"allowGuestAccess", value:allowGuestAccess }),
        api.post("settings", { key:"disableFeed", value:disableFeed }),
        api.post("settings", { key:"disableQuiz", value:disableQuiz }),
        api.post("settings", { key:"disableLibrary", value:disableLibrary }),
        api.post("settings", { key:"heroImageUrl", value:heroImageUrl }),
        api.post("settings", { key:"globalAnnouncement", value:globalAnnouncement }),
      ]);
      showToast("System settings saved");
    } catch { showToast("Failed to save system settings", "error"); }
  };

  const saveContactInfo = async () => {
    try {
      await api.post("settings", { key:"contactInfo", value:contactInfo });
      showToast("Contact information saved");
    } catch { showToast("Failed to save contact info", "error"); }
  };

  const clearLogsFromDB = async () => {
    if (!window.confirm("This will permanently delete all activity logs from the database. Continue?")) return;
    try {
      await api.delete("admin/activity/logs/clear");
      showToast("All logs cleared from database");
    } catch { showToast("Failed to clear logs", "error"); }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(secretKey).then(() => { setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000); });
  };

  const passStrength = (p) => {
    if (!p) return null;
    if (p.length < 6) return { label:"Too short", color:"#ef4444" };
    if (p.length < 8 || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label:"Weak", color:"#f59e0b" };
    if (p.length >= 10 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) return { label:"Strong", color:"#16a34a" };
    return { label:"Fair", color:"#4255ff" };
  };
  const strength = passStrength(password);

  return (
    <div className="admin-page" style={{maxWidth:720}}>
      {ToastEl}

      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:"1.4rem",fontWeight:800,color:"var(--admin-text)",margin:0}}>⚙️ Settings</h1>
        <p style={{fontSize:".82rem",color:"var(--admin-muted)",margin:"4px 0 0"}}>Manage admin preferences and system configuration</p>
      </div>

      {/* Admin Profile Card */}
      <div style={{background:"linear-gradient(135deg,var(--admin-accent),#8b5cf6)",borderRadius:16,padding:24,marginBottom:20,display:"flex",alignItems:"center",gap:20}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem",fontWeight:800,color:"white",flexShrink:0}}>
          {user?.name?.[0]?.toUpperCase()||"A"}
        </div>
        <div>
          <div style={{fontSize:"1.2rem",fontWeight:800,color:"white"}}>{user?.name||"Admin"}</div>
          <div style={{fontSize:".82rem",color:"rgba(255,255,255,0.8)",marginTop:2}}>{user?.email}</div>
          <div style={{marginTop:8,display:"flex",gap:8}}>
            <span style={{background:"rgba(255,255,255,0.2)",color:"white",fontSize:".7rem",fontWeight:700,padding:"2px 10px",borderRadius:20}}>
              {user?.role==="superadmin"?"⭐ Superadmin":"🛡️ Administrator"}
            </span>
            {user?.lastLogin && (
              <span style={{background:"rgba(255,255,255,0.15)",color:"white",fontSize:".7rem",padding:"2px 10px",borderRadius:20}}>
                Last login: {new Date(user.lastLogin).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Appearance */}
      <Section icon="✨" title="Appearance">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:"var(--admin-card)",border:"1px solid var(--admin-border)",borderRadius:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:"1.1rem"}}>{adminTheme==="dark"?<Moon size={18}/>:<Sun size={18}/>}</span>
            <div>
              <div style={{fontWeight:600,fontSize:".875rem",color:"var(--admin-text)"}}>Dark Mode</div>
              <div style={{fontSize:".75rem",color:"var(--admin-muted)",marginTop:2}}>Switch between light and dark themes</div>
            </div>
          </div>
          <button onClick={()=>setAdminTheme(adminTheme==="light"?"dark":"light")}
            style={{width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",background:adminTheme==="dark"?"var(--admin-accent)":"#cbd5e1",position:"relative",transition:"background .2s",flexShrink:0}}>
            <div style={{width:18,height:18,borderRadius:"50%",background:"white",position:"absolute",top:4,left:adminTheme==="dark"?24:4,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
          </button>
        </div>
      </Section>

      {/* Admin Profile */}
      <Section icon="👤" title="Admin Profile">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <label style={{fontSize:".78rem",color:"var(--admin-muted)",fontWeight:600,display:"block",marginBottom:6}}>DISPLAY NAME</label>
            <input className="admin-input" style={{width:"100%",boxSizing:"border-box"}} value={name} onChange={e=>setName(e.target.value)}/>
          </div>
          <div>
            <label style={{fontSize:".78rem",color:"var(--admin-muted)",fontWeight:600,display:"block",marginBottom:6}}>EMAIL</label>
            <input className="admin-input" style={{width:"100%",boxSizing:"border-box"}} type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
          </div>
          <div>
            <label style={{fontSize:".78rem",color:"var(--admin-muted)",fontWeight:600,display:"block",marginBottom:6}}>NEW PASSWORD</label>
            <div style={{position:"relative"}}>
              <input className="admin-input" style={{width:"100%",boxSizing:"border-box",paddingRight:44}} type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Leave blank to keep current"/>
              <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--admin-muted)"}}>
                {showPass?<EyeOff size={16}/>:<Eye size={16}/>}
              </button>
            </div>
            {strength && <div style={{fontSize:".75rem",fontWeight:600,color:strength.color,marginTop:4}}>Password strength: {strength.label}</div>}
          </div>
          {password && (
            <div>
              <label style={{fontSize:".78rem",color:"var(--admin-muted)",fontWeight:600,display:"block",marginBottom:6}}>CONFIRM PASSWORD</label>
              <input className="admin-input" style={{width:"100%",boxSizing:"border-box",borderColor:confirmPass&&confirmPass!==password?"#ef4444":undefined}} type="password" value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} placeholder="Re-enter new password"/>
            </div>
          )}
          <button className="admin-btn primary" style={{alignSelf:"flex-end"}} onClick={saveProfile} disabled={savingProfile}>
            <Save size={14}/> {savingProfile?"Saving…":"Save Profile"}
          </button>
        </div>
      </Section>

      {/* Security */}
      <Section icon="🛡️" title="Security & Quiz Controls">
        <Toggle checked={noScreenshot} onChange={setNoScreenshot} icon={noScreenshot?"📵":"📸"} label="No-Screenshot Mode" desc="Blocks screenshots during quizzes. Applies watermark and blur on tab switch."/>
        <Toggle checked={quizTimer} onChange={setQuizTimer} icon="⏱️" label="Quiz Timer" desc="Show per-question countdown timer during quizzes"/>
        <button className="admin-btn primary" style={{marginTop:12}} onClick={saveSecurity}><Save size={14}/> Save Security Settings</button>
        {noScreenshot && (
          <div style={{padding:"12px 16px",background:"rgba(66,85,255,0.06)",borderRadius:10,border:"1px solid rgba(66,85,255,0.2)",fontSize:".82rem",color:"var(--admin-accent)",marginTop:8}}>
            ✅ No-Screenshot mode is <strong>ACTIVE</strong>. Students have screenshot protection & blur-on-tab-switch.
          </div>
        )}
      </Section>

      {/* Recovery Key */}
      <Section icon="🔑" title="Admin Recovery Secret Key">
        <div style={{padding:"10px 14px",background:"rgba(66,85,255,0.06)",borderRadius:10,border:"1px solid rgba(66,85,255,0.2)",fontSize:".8rem",color:"#4255ff",marginBottom:14,lineHeight:1.6}}>
          🔐 This key is required to access the <strong>/admin-recovery</strong> page. Share only with authorised admins.
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{position:"relative"}}>
            <input className="admin-input" style={{width:"100%",boxSizing:"border-box",paddingRight:90,fontFamily:"monospace",fontSize:"1rem",letterSpacing:".08em"}} type={showKey?"text":"password"} value={secretKey} onChange={e=>setSecretKey(e.target.value)}/>
            <div style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",display:"flex",gap:4}}>
              <button onClick={()=>setShowKey(k=>!k)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--admin-muted)"}}>{showKey?<EyeOff size={15}/>:<Eye size={15}/>}</button>
              <button onClick={copyKey} style={{background:"none",border:"none",cursor:"pointer",fontSize:".75rem",color:"var(--admin-accent)",fontWeight:700,display:"flex",alignItems:"center",gap:3}}>
                {keyCopied?<><Check size={13}/>Copied</>:<><Copy size={13}/>Copy</>}
              </button>
            </div>
          </div>
          <button className="admin-btn primary" style={{alignSelf:"flex-start"}} onClick={()=>{ localStorage.setItem("adminSecretKey",secretKey); showToast("Secret key saved"); }}><Save size={14}/> Save Secret Key</button>
        </div>
      </Section>

      {/* Notifications */}
      <Section icon="🔔" title="Notification Preferences">
        <Toggle checked={emailNotif} onChange={setEmailNotif} icon="📧" label="Email Notifications" desc="Receive alerts for new signups and quiz completions"/>
        <Toggle checked={smsNotif} onChange={setSmsNotif} icon="📱" label="SMS Notifications" desc="Receive critical alerts via SMS"/>
        <button className="admin-btn primary" style={{marginTop:8}} onClick={()=>showToast("Notification settings saved")}><Save size={14}/> Save Notifications</button>
      </Section>

      {/* Contact & Social */}
      <Section icon="🌐" title="Contact & Social Links">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {[["SUPPORT EMAIL","email","support@universalhealth.com"],["PHONE NUMBER","phone","+1 234 567 8900"],["WHATSAPP","whatsapp","+1 234 567 8900"],["FACEBOOK","facebook","https://facebook.com/..."],["TIKTOK","tiktok","https://tiktok.com/@..."],["INSTAGRAM","instagram","https://instagram.com/..."],["TWITTER (X)","twitter","https://twitter.com/..."],["YOUTUBE","youtube","https://youtube.com/..."]].map(([lbl,key,ph])=>(
            <div key={key}>
              <label style={{fontSize:".78rem",color:"var(--admin-muted)",fontWeight:600,display:"block",marginBottom:6}}>{lbl}</label>
              <input className="admin-input" style={{width:"100%",boxSizing:"border-box"}} placeholder={ph} value={contactInfo[key]||""} onChange={e=>setContactInfo(p=>({...p,[key]:e.target.value}))}/>
            </div>
          ))}
        </div>
        <button className="admin-btn primary" style={{marginTop:16}} onClick={saveContactInfo}><Save size={14}/> Save Contact Info</button>
      </Section>

      {/* System */}
      <Section icon="🖥️" title="System Configuration">
        <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} icon="🔧" label="Maintenance Mode" desc="Temporarily disable user access to the platform"/>
        <Toggle checked={registrationOpen} onChange={setRegistrationOpen} icon="📝" label="Open Registration" desc="Allow new users to sign up"/>
        <Toggle checked={allowGuestAccess} onChange={setAllowGuestAccess} icon="👀" label="Allow Guest Access" desc="Allow unregistered users to view public resources"/>
        <Toggle checked={disableFeed} onChange={setDisableFeed} icon="🔇" label="Disable Social Feed" desc="Hide the community feed from all users temporarily"/>

        {/* Superadmin-only: page toggles */}
        {user?.role === "superadmin" && (
          <>
            <div style={{margin:"16px 0 10px",fontSize:".75rem",fontWeight:700,color:"var(--admin-muted)",textTransform:"uppercase",letterSpacing:".06em"}}>⭐ Superadmin — Page Controls</div>
            <Toggle checked={disableQuiz} onChange={setDisableQuiz} icon="🧠" label="Disable Quiz / Questions Page" desc="Shows a 'under development' screen to all users on the Quiz page"/>
            <Toggle checked={disableLibrary} onChange={setDisableLibrary} icon="📚" label="Disable Library Page" desc="Shows a 'under development' screen to all users on the Library page"/>

            {/* Hero Image */}
            <div style={{marginTop:16}}>
              <label style={{fontSize:".78rem",color:"var(--admin-muted)",fontWeight:700,display:"block",marginBottom:6}}>🖼️ LANDING PAGE HERO IMAGE URL</label>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <input className="admin-input" style={{flex:1,boxSizing:"border-box"}} placeholder="https://res.cloudinary.com/... or any image URL" value={heroImageUrl} onChange={e=>setHeroImageUrl(e.target.value)}/>
                {heroImageUrl && <img src={heroImageUrl} alt="preview" onError={e=>e.target.style.display='none'} style={{width:56,height:56,objectFit:"cover",borderRadius:8,border:"1px solid var(--admin-border)",flexShrink:0}}/>}
              </div>
              <div style={{fontSize:".73rem",color:"var(--admin-muted)",marginTop:4}}>Paste any direct image URL. Hit 'Save System Settings' to apply on the landing page.</div>
            </div>
            {(disableQuiz || disableLibrary) && (
              <div style={{padding:"10px 14px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:10,fontSize:".8rem",color:"#d97706",marginTop:6}}>
                ⚠️ {[disableQuiz&&"Quiz",disableLibrary&&"Library"].filter(Boolean).join(" & ")} page{disableQuiz&&disableLibrary?"s are":" is"} currently <strong>disabled</strong> for all users.
              </div>
            )}
          </>
        )}
        <div style={{marginTop:16}}>
          <label style={{fontSize:".78rem",color:"var(--admin-muted)",fontWeight:600,display:"block",marginBottom:6}}>GLOBAL ANNOUNCEMENT BANNER</label>
          <input className="admin-input" style={{width:"100%",boxSizing:"border-box"}} placeholder="e.g., Server maintenance scheduled for midnight..." value={globalAnnouncement} onChange={e=>setGlobalAnnouncement(e.target.value)}/>
          <div style={{fontSize:".75rem",color:"var(--admin-muted)",marginTop:4}}>Displayed across the top of the platform if not empty.</div>
        </div>
        {maintenanceMode && (
          <div style={{padding:"12px 16px",background:"rgba(239,68,68,0.1)",borderRadius:10,border:"1px solid rgba(239,68,68,0.3)",fontSize:".82rem",color:"#ef4444",marginTop:12}}>
            ⚠️ <strong>Maintenance Mode is ON.</strong> Regular users cannot access the platform.
          </div>
        )}
        <button className="admin-btn primary" style={{marginTop:16}} onClick={saveSystem}><Save size={14}/> Save System Settings</button>
      </Section>

      {/* Danger Zone */}
      <Section icon="⚠️" title="Danger Zone">
        <div style={{padding:"14px 16px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontWeight:600,fontSize:".875rem",color:"#ef4444"}}>Clear All Activity Logs</div>
            <div style={{fontSize:".75rem",color:"var(--admin-muted)",marginTop:2}}>Permanently removes all admin activity records from the database</div>
          </div>
          <button className="admin-btn danger sm" onClick={clearLogsFromDB}>Clear Logs</button>
        </div>
      </Section>
    </div>
  );
}