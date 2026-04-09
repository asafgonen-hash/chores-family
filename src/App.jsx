import { useState, useEffect, useRef, useCallback } from "react";
import { loadData, saveData, subscribeToRealtime, uploadProofPhoto } from "./supabase.js";

// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────────
const DS = {
  bg: "#000000", surface: "#111111", surface2: "#1a1a1a",
  border: "rgba(255,255,255,0.07)", text: "#ffffff",
  muted: "#666666", dim: "#333333", accent: "#00D4AA",
  // Brushing section specific
  brushBg: "#0a0f0e",
  brushBorder: "rgba(0,212,170,0.15)",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const USERS = [
  { id:"ido",   name:"עידו",  color:"#FF453A", role:"kid"    },
  { id:"yotam", name:"יותם",  color:"#30D158", role:"kid"    },
  { id:"itai",  name:"איתי",  color:"#FFD60A", role:"kid"    },
  { id:"asaf",  name:"אסף",   color:"#0A84FF", role:"parent", pin:"1234" },
  { id:"anna",  name:"אנה",   color:"#FF375F", role:"parent", pin:"5678" },
];

// Brushing chores are SEPARATE from categories now
const BRUSH_CHORES = [
  { id:"brush-morning", name:"צחצוח בוקר", icon:"🌅", pts:0, requiresPhoto:true, tracking:true },
  { id:"brush-evening", name:"צחצוח ערב",  icon:"🌙", pts:0, requiresPhoto:true, tracking:true },
];

const CHORE_CATEGORIES = [
  { id:"room",    icon:"🛏️", title:"סידור חדרים", chores:[
    {id:"make-bed",    name:"סידור מיטות",              pts:3},
    {id:"pillows",     name:"יישור שמיכות וכריות",       pts:2},
    {id:"toys",        name:"החזרת צעצועים למקום",        pts:2},
    {id:"books",       name:"החזרת ספרים למקום",          pts:2},
    {id:"clothes-r",   name:"החזרת בגדים למקום",          pts:2},
    {id:"pickup",      name:"איסוף חפצים מפוזרים",        pts:3},
  ]},
  { id:"dishes",  icon:"🍽️", title:"כלים ומדיח", chores:[
    {id:"wash-dishes", name:"שטיפת כלים בכיור",           pts:5},
    {id:"load-dw",     name:"סידור כלים במדיח",           pts:4},
    {id:"run-dw",      name:"הפעלת מדיח",                 pts:2},
    {id:"empty-dw",    name:"ריקון מדיח",                 pts:4},
    {id:"put-dishes",  name:"החזרת כלים לארונות",          pts:3},
  ]},
  { id:"kitchen", icon:"🧽", title:"ניקוי מטבח", chores:[
    {id:"wipe-counter",name:"ניגוב שיש במטבח",            pts:3},
    {id:"wipe-stove",  name:"ניגוב כיריים",               pts:4},
    {id:"wipe-table",  name:"ניגוב שולחן אוכל",           pts:3},
    {id:"wipe-work",   name:"ניגוב משטחי עבודה",          pts:2},
  ]},
  { id:"trash",   icon:"🗑️", title:"אשפה", chores:[
    {id:"trash-kit",   name:"פינוי פח אשפה במטבח",        pts:3},
    {id:"trash-house", name:"פינוי פחי אשפה בבית",        pts:4},
    {id:"trash-bags",  name:"החלפת שקיות בפחים",          pts:3},
  ]},
  { id:"floors",  icon:"🧹", title:"רצפות", chores:[
    {id:"sweep",       name:"טאטוא רצפה",                 pts:4},
    {id:"vacuum",      name:"שאיבת אבק",                  pts:5},
    {id:"mop",         name:"שטיפת רצפה",                 pts:6},
  ]},
  { id:"laundry", icon:"👕", title:"כביסה", chores:[
    {id:"dirty-bin",   name:"השלכת בגדים לסל כביסה",      pts:2},
    {id:"wash-machine",name:"הפעלת מכונת כביסה",          pts:3},
    {id:"take-out",    name:"הוצאת כביסה מהמכונה",        pts:3},
    {id:"hang",        name:"תליית כביסה",                pts:5},
    {id:"take-down",   name:"הורדת כביסה מהמתקן",         pts:4},
    {id:"fold",        name:"קיפול כביסה",                pts:5},
    {id:"put-clothes", name:"סידור כביסה בארונות",         pts:4},
  ]},
  { id:"dust",    icon:"🪣", title:"אבק", chores:[
    {id:"dust-furn",   name:"ניגוב אבק מרהיטים",          pts:4},
    {id:"dust-shelf",  name:"ניגוב אבק ממדפים",           pts:3},
    {id:"dust-table",  name:"ניגוב אבק משולחנות",         pts:3},
  ]},
  { id:"bath",    icon:"🚿", title:"חדר רחצה", chores:[
    {id:"toilet",      name:"ניקוי אסלה",                 pts:5},
    {id:"sink-bath",   name:"ניקוי כיור בחדר רחצה",       pts:4},
    {id:"mirror",      name:"ניקוי מראה בחדר רחצה",       pts:3},
    {id:"shower",      name:"ניקוי מקלחת",                pts:6},
    {id:"bathtub",     name:"ניקוי אמבטיה",               pts:6},
  ]},
  { id:"linens",  icon:"🛁", title:"החלפות", chores:[
    {id:"bed-linens",  name:"החלפת מצעים במיטות",         pts:6},
    {id:"towels",      name:"החלפת מגבות",                pts:3},
  ]},
  { id:"fridge",  icon:"🧊", title:"מקרר", chores:[
    {id:"check-fridge",name:"בדיקת מקרר",                 pts:2},
    {id:"throw-food",  name:"זריקת אוכל פג תוקף",         pts:3},
    {id:"wipe-fridge", name:"ניגוב מדפים במקרר",          pts:4},
  ]},
  { id:"windows", icon:"🪟", title:"חלונות", chores:[
    {id:"clean-win",   name:"ניקוי חלונות",               pts:6},
    {id:"clean-shut",  name:"ניקוי תריסים",               pts:5},
  ]},
  { id:"closets", icon:"👗", title:"ארונות", chores:[
    {id:"sort-closet", name:"סידור ארונות בגדים",         pts:6},
    {id:"sort-clothes",name:"מיון בגדים בארון",           pts:5},
    {id:"kit-closet",  name:"סידור ארונות מטבח",          pts:5},
  ]},
  { id:"deep",    icon:"🔧", title:"ניקוי מעמיק", chores:[
    {id:"clean-oven",        name:"ניקוי תנור",           pts:8},
    {id:"clean-fridge-deep", name:"ניקוי מקרר מבפנים",   pts:7},
    {id:"ac-filter",         name:"ניקוי פילטרים מזגן",  pts:7},
  ]},
  { id:"carpets", icon:"🛋️", title:"שטיחים ווילונות", chores:[
    {id:"wash-curtains",name:"כביסת וילונות",             pts:6},
    {id:"vac-carpet",   name:"שאיבת שטיחים",              pts:5},
    {id:"clean-carpet", name:"ניקוי שטיחים",              pts:6},
  ]},
  { id:"grocery", icon:"🛒", title:"קניות", chores:[
    {id:"sort-grocery",name:"סידור קניות מהמכולת",        pts:4},
    {id:"fridge-items",name:"הכנסת מוצרים למקרר",         pts:3},
    {id:"pantry-items",name:"הכנסת מוצרים לארונות מטבח",  pts:3},
  ]},
  { id:"dog",     icon:"🐕", title:"הכלב", chores:[
    {id:"dog-walk",  name:"לקחת את הכלב לסיבוב",          pts:6},
    {id:"dog-food",  name:"להאכיל את הכלב",               pts:3},
    {id:"dog-water", name:"להחליף מים לכלב",              pts:2},
  ]},
];

// All chores flat list (includes brush chores for scoring/lookup)
const ALL_CHORES_FLAT = [
  ...BRUSH_CHORES,
  ...CHORE_CATEGORIES.flatMap(c => c.chores),
];

const CAREERS = [
  { title:"עוזר ניקיון",    pts:0   },
  { title:"כוכב עוזר",      pts:30  },
  { title:"אלוף הבית",      pts:80  },
  { title:"שף ניקיון",      pts:150 },
  { title:"גיבור הבית",     pts:250 },
  { title:"מלך/מלכת הבית", pts:400 },
];

const BADGES = [
  { id:"first",  icon:"🎯", title:"מתחיל",       cond: s => s.totalDone >= 1 },
  { id:"ten",    icon:"🔟", title:"10 משימות",    cond: s => s.totalDone >= 10 },
  { id:"speed",  icon:"⚡", title:"מהיר",         cond: s => s.fastCount >= 3 },
  { id:"dog",    icon:"🐕", title:"חבר הכלב",    cond: s => (s.catCounts?.dog||0) >= 3 },
  { id:"dishes", icon:"🍽️", title:"גאון הכלים",  cond: s => (s.catCounts?.dishes||0) >= 5 },
  { id:"star",   icon:"💫", title:"סופר-כוכב",   cond: s => s.score >= 100 },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const timeAgo = ts => {
  const d = Date.now()-ts;
  if (d < 60000) return "עכשיו";
  if (d < 3600000) return `לפני ${Math.floor(d/60000)} דקות`;
  if (d < 86400000) return `לפני ${Math.floor(d/3600000)} שעות`;
  return `לפני ${Math.floor(d/86400000)} ימים`;
};
const getUserScore = (uid, log, bonus) =>
  log.filter(e=>e.userId===uid).reduce((s,e)=>s+(e.pts||0),0) + (bonus[uid]||0);
const countToday = (uid, choreId, log) => {
  const today = new Date().toDateString();
  return log.filter(e=>e.userId===uid&&e.choreId===choreId&&new Date(e.ts).toDateString()===today).length;
};
const getLastDaysLog = (log, days=7) => log.filter(e=>e.ts>=Date.now()-days*86400000);

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function Logo({ size=32 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 120 120" fill="none">
      <defs>
        <radialGradient id="logoBg" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#0d1117"/><stop offset="100%" stopColor="#000"/>
        </radialGradient>
        <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.2"/><stop offset="100%" stopColor="#00D4AA" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="logoRingA" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4AA"/><stop offset="50%" stopColor="#0A84FF"/><stop offset="100%" stopColor="#BF5AF2"/>
        </linearGradient>
        <linearGradient id="logoRingB" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FF453A"/><stop offset="100%" stopColor="#FF9F0A"/>
        </linearGradient>
        <filter id="logoGlowF"><feGaussianBlur stdDeviation="2.5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#logoBg)"/>
      <circle cx="60" cy="58" r="38" fill="url(#logoGlow)"/>
      <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5"/>
      <circle cx="60" cy="60" r="42" fill="none" stroke="url(#logoRingA)" strokeWidth="5" strokeLinecap="round"
        strokeDasharray="195 264" strokeDashoffset="-20" transform="rotate(-90 60 60)" filter="url(#logoGlowF)"/>
      <circle cx="60" cy="60" r="33" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="4"/>
      <circle cx="60" cy="60" r="33" fill="none" stroke="url(#logoRingB)" strokeWidth="4" strokeLinecap="round"
        strokeDasharray="145 207" strokeDashoffset="-40" transform="rotate(-90 60 60)" filter="url(#logoGlowF)"/>
      <path d="M60 28 L78 46 L42 46 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinejoin="round"/>
      <rect x="44" y="46" width="32" height="26" rx="2" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <rect x="54" y="58" width="12" height="14" rx="3" fill="url(#logoRingA)" opacity="0.7"/>
      <rect x="47" y="50" width="8" height="7" rx="1.5" fill="rgba(0,212,170,0.25)" stroke="rgba(0,212,170,0.4)" strokeWidth="0.8"/>
      <rect x="65" y="50" width="8" height="7" rx="1.5" fill="rgba(10,132,255,0.25)" stroke="rgba(10,132,255,0.4)" strokeWidth="0.8"/>
    </svg>
  );
}

// ─── CROP MODAL ───────────────────────────────────────────────────────────────
function CropModal({ src, user, onSave, onCancel }) {
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const [scale,    setScale]    = useState(1);
  const [offset,   setOffset]   = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart  = useRef(null);
  const SIZE = 280;

  useEffect(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img || !img.complete) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE/2, SIZE/2, SIZE/2, 0, Math.PI*2);
    ctx.clip();
    const w = img.naturalWidth  * scale;
    const h = img.naturalHeight * scale;
    const x = (SIZE - w) / 2 + offset.x;
    const y = (SIZE - h) / 2 + offset.y;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(SIZE/2, SIZE/2, SIZE/2 - 1.5, 0, Math.PI*2);
    ctx.strokeStyle = user.color;
    ctx.lineWidth   = 3;
    ctx.stroke();
  }, [scale, offset, user.color]);

  const onPointerDown = e => {
    setDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = e => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };
  const onPointerUp = () => setDragging(false);

  const handleSave = () => {
    const out = document.createElement("canvas");
    out.width = out.height = 300;
    const ctx = out.getContext("2d");
    ctx.save();
    ctx.beginPath();
    ctx.arc(150, 150, 150, 0, Math.PI*2);
    ctx.clip();
    const img = imgRef.current;
    const ratio = 300 / SIZE;
    const w = img.naturalWidth  * scale;
    const h = img.naturalHeight * scale;
    const x = (SIZE - w) / 2 + offset.x;
    const y = (SIZE - h) / 2 + offset.y;
    ctx.drawImage(img, x*ratio, y*ratio, w*ratio, h*ratio);
    ctx.restore();
    onSave(out.toDataURL("image/jpeg", 0.85));
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.93)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20}}>
      <div style={{background:"#111",borderRadius:24,padding:"24px 20px",maxWidth:340,width:"100%",border:`1px solid ${user.color}44`,textAlign:"center"}}>
        <div style={{fontSize:"0.9rem",fontWeight:700,color:user.color,marginBottom:4}}>✂️ חתוך תמונה</div>
        <div style={{fontSize:"0.72rem",color:"#555",marginBottom:16}}>גרור להזזה · גלגל לזום</div>
        <img ref={imgRef} src={src} style={{display:"none"}} onLoad={()=>{
          const img = imgRef.current;
          const s = Math.max(SIZE/img.naturalWidth, SIZE/img.naturalHeight);
          setScale(s); setOffset({x:0,y:0});
        }}/>
        <canvas ref={canvasRef} width={SIZE} height={SIZE}
          style={{borderRadius:"50%",cursor:dragging?"grabbing":"grab",touchAction:"none",userSelect:"none",boxShadow:`0 0 0 4px ${user.color}33, 0 20px 40px rgba(0,0,0,.6)`}}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          onWheel={e=>{e.preventDefault();setScale(s=>Math.min(Math.max(s-e.deltaY*0.001,0.3),6));}}
        />
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0 18px"}}>
          <span style={{fontSize:"0.8rem"}}>🔍</span>
          <input type="range" min="30" max="600" value={Math.round(scale*100)}
            onChange={e=>setScale(parseInt(e.target.value)/100)}
            style={{flex:1,accentColor:user.color}}/>
          <span style={{fontSize:"0.72rem",color:"#555",minWidth:36}}>{Math.round(scale*100)}%</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={handleSave} style={{flex:1,background:user.color,border:"none",borderRadius:12,color:"#000",fontFamily:"-apple-system,sans-serif",fontWeight:700,fontSize:"0.9rem",padding:"11px",cursor:"pointer"}}>✓ שמור</button>
          <button onClick={onCancel} style={{background:"rgba(255,255,255,.06)",border:"none",borderRadius:12,color:"#666",fontFamily:"-apple-system,sans-serif",fontSize:"0.9rem",padding:"11px 16px",cursor:"pointer"}}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Avatar({ user, photo, size=48, onClick, editable=false }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0,cursor:onClick?"pointer":"default"}}
      onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div style={{width:size,height:size,borderRadius:"50%",overflow:"hidden",
        border:`2px solid ${hover&&editable?user.color:user.color+"44"}`,
        background:`${user.color}12`,
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"border-color .2s, box-shadow .2s",
        boxShadow:hover&&editable?`0 0 14px ${user.color}44`:"none"}}>
        {photo
          ? <img src={photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          : <span style={{fontFamily:"-apple-system,sans-serif",fontSize:size*0.38,fontWeight:800,color:user.color,userSelect:"none"}}>{user.name[0]}</span>
        }
      </div>
      {editable && (
        <div style={{position:"absolute",bottom:-1,left:-1,width:size*0.36,height:size*0.36,borderRadius:"50%",
          background:hover?user.color:"#1a1a1a",border:`1.5px solid #000`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.16,transition:"background .2s"}}>
          {hover?"✓":"📷"}
        </div>
      )}
    </div>
  );
}

// ─── RING ─────────────────────────────────────────────────────────────────────
function Ring({ value, max, color, size=64, sw=6 }) {
  const r = (size-sw*2)/2, circ = 2*Math.PI*r, dash = Math.min(value/max,1)*circ;
  return (
    <div style={{position:"relative",width:size,height:size}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:size*0.22,fontWeight:700,color:DS.text,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</span>
        <span style={{fontSize:size*0.13,color:DS.muted}}>נק'</span>
      </div>
    </div>
  );
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function useConfetti() {
  const canvasRef = useRef(null), particles = useRef([]), rafRef = useRef(null);
  const animate = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.current.forEach(p => {
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.rot+=p.rotV; p.life-=p.decay;
      if(p.life<=0) return;
      ctx.save(); ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
      ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2); ctx.restore();
    });
    particles.current = particles.current.filter(p=>p.life>0);
    if (particles.current.length>0) rafRef.current = requestAnimationFrame(animate);
    else rafRef.current = null;
  }, []);
  const pop = useCallback(() => {
    const colors = ["#FF453A","#30D158","#FFD60A","#0A84FF","#00D4AA","#fff"];
    for(let i=0;i<45;i++) particles.current.push({
      x:Math.random()*window.innerWidth, y:window.innerHeight*0.4+Math.random()*window.innerHeight*0.3,
      vx:(Math.random()-.5)*8, vy:(Math.random()-2)*6, size:4+Math.random()*7,
      color:colors[Math.floor(Math.random()*colors.length)],
      life:1, decay:0.016+Math.random()*0.014, rot:Math.random()*360, rotV:(Math.random()-.5)*8,
    });
    if (!rafRef.current) rafRef.current = requestAnimationFrame(animate);
  }, [animate]);
  useEffect(() => {
    const resize = () => { if(canvasRef.current){canvasRef.current.width=window.innerWidth;canvasRef.current.height=window.innerHeight;} };
    resize(); window.addEventListener("resize",resize);
    return () => window.removeEventListener("resize",resize);
  }, []);
  return { canvasRef, pop };
}

// ─── PIN MODAL ────────────────────────────────────────────────────────────────
function PinModal({ user, onSuccess, onCancel }) {
  const [pin, setPin] = useState(""), [error, setError] = useState(false);
  const tryPin = p => {
    if (p===user.pin) { onSuccess(); }
    else { setError(true); setPin(""); setTimeout(()=>setError(false),1200); }
  };
  const press = k => {
    if (k==="⌫") { setPin(p=>p.slice(0,-1)); return; }
    if (k===""||pin.length>=4) return;
    const np=pin+k; setPin(np);
    if(np.length===4) setTimeout(()=>tryPin(np),120);
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
      <div style={{background:DS.surface,borderRadius:24,padding:"32px 28px",maxWidth:320,width:"100%",border:`1px solid ${user.color}44`,textAlign:"center"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:`${user.color}18`,border:`2px solid ${user.color}44`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontFamily:"-apple-system,sans-serif",fontSize:"1.5rem",fontWeight:800,color:user.color}}>{user.name[0]}</div>
        <div style={{fontSize:"1.1rem",fontWeight:700,color:user.color,marginBottom:4}}>{user.name}</div>
        <div style={{color:DS.muted,fontSize:"0.82rem",marginBottom:20}}>הכנס קוד PIN</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{width:42,height:52,borderRadius:10,background:"#000",border:`2px solid ${error?"#FF453A":pin.length>i?user.color:"rgba(255,255,255,.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",color:user.color,transition:"border-color .2s"}}>
              {pin.length>i?"●":""}
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
            <button key={i} onClick={()=>press(String(k))} disabled={k===""} style={{padding:"13px 0",borderRadius:10,border:"1px solid rgba(255,255,255,.07)",background:k===""?"transparent":"rgba(255,255,255,.04)",color:DS.text,fontSize:"1.1rem",fontFamily:"-apple-system,sans-serif",cursor:k===""?"default":"pointer",fontWeight:600}}>{k}</button>
          ))}
        </div>
        {error && <div style={{color:"#FF453A",fontSize:"0.82rem",marginBottom:10}}>קוד שגוי</div>}
        <button onClick={onCancel} style={{background:"none",border:"none",color:DS.muted,cursor:"pointer",fontSize:"0.82rem",fontFamily:"-apple-system,sans-serif"}}>ביטול</button>
      </div>
    </div>
  );
}

// ─── TOAST & SYNC ─────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div style={{position:"fixed",bottom:30,left:"50%",transform:`translateX(-50%) translateY(${msg?"0":"100px"})`,background:"#1c1c1e",color:DS.text,padding:"11px 22px",borderRadius:24,fontWeight:600,fontSize:"0.85rem",transition:"transform .35s cubic-bezier(.4,2,.6,1)",zIndex:999,whiteSpace:"nowrap",boxShadow:"0 8px 30px rgba(0,0,0,.5)",fontFamily:"-apple-system,sans-serif"}}>
      {msg||"‎"}
    </div>
  );
}
function SyncDot({ saving }) {
  return (
    <div style={{position:"fixed",top:12,left:14,zIndex:200,display:"flex",alignItems:"center",gap:5,fontSize:"0.68rem",color:DS.muted,fontFamily:"-apple-system,sans-serif"}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:saving?"#FFD60A":DS.accent,boxShadow:saving?`0 0 5px #FFD60A`:`0 0 5px ${DS.accent}`,transition:"background .3s"}}/>
      {saving?"שומר...":"מסונכרן"}
    </div>
  );
}

// ─── PHOTO UPLOAD ─────────────────────────────────────────────────────────────
function PhotoUpload({ user, chore, onDone, onSkip }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const handleFile = file => { if(!file) return; setPreview(URL.createObjectURL(file)); setError(""); };
  const handleUpload = async () => {
    const file = inputRef.current?.files?.[0];
    if(!file){ setError("אנא בחר תמונה"); return; }
    setUploading(true);
    try { const url = await uploadProofPhoto(file,user.id,chore.id); onDone(url); }
    catch(e){ setError("שגיאה בהעלאה"); console.error(e); }
    finally { setUploading(false); }
  };
  return (
    <div style={{background:DS.surface2,borderRadius:12,padding:"14px",marginTop:4,border:`1px solid ${user.color}44`}}>
      <div style={{fontSize:"0.82rem",fontWeight:700,marginBottom:10,color:user.color}}>📷 הוכחה — {chore.name}</div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(e.target.files?.[0])}/>
      {!preview ? (
        <div onClick={()=>inputRef.current?.click()} style={{width:"100%",height:120,background:"rgba(255,255,255,.03)",border:`2px dashed ${user.color}66`,borderRadius:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer"}}>
          <span style={{fontSize:"2rem"}}>📸</span>
          <span style={{fontSize:"0.82rem",fontWeight:700,color:user.color}}>צלם / בחר תמונה</span>
        </div>
      ) : (
        <div style={{position:"relative",marginBottom:10}}>
          <img src={preview} alt="preview" style={{width:"100%",borderRadius:10,maxHeight:160,objectFit:"cover"}}/>
          <button onClick={()=>{setPreview(null);if(inputRef.current)inputRef.current.value="";}} style={{position:"absolute",top:6,left:6,background:"rgba(0,0,0,.7)",border:"none",borderRadius:"50%",color:"#fff",width:26,height:26,cursor:"pointer",fontSize:"0.8rem"}}>✕</button>
        </div>
      )}
      {error && <div style={{color:"#FF453A",fontSize:"0.78rem",marginTop:6}}>{error}</div>}
      <div style={{display:"flex",gap:7,marginTop:10}}>
        <button onClick={handleUpload} disabled={!preview||uploading} style={{flex:1,background:preview&&!uploading?user.color:"rgba(255,255,255,.08)",border:"none",borderRadius:10,color:preview&&!uploading?"#000":DS.muted,fontFamily:"-apple-system,sans-serif",fontWeight:700,fontSize:"0.85rem",padding:"10px",cursor:preview&&!uploading?"pointer":"default"}}>
          {uploading?"מעלה...":"✓ שלח הוכחה"}
        </button>
        <button onClick={onSkip} style={{background:"none",border:"1px solid rgba(255,255,255,.08)",borderRadius:10,color:DS.muted,fontFamily:"-apple-system,sans-serif",fontSize:"0.8rem",padding:"10px 14px",cursor:"pointer"}}>דלג</button>
      </div>
    </div>
  );
}

// ─── BRUSH PHOTOS MODAL ───────────────────────────────────────────────────────
function BrushPhotosModal({ user, log, avatars, onClose }) {
  const BRUSH_IDS = ["brush-morning", "brush-evening"];
  const BRUSH_NAMES = { "brush-morning": "בוקר 🌅", "brush-evening": "ערב 🌙" };
  const photos = [...log]
    .filter(e => e.userId===user.id && BRUSH_IDS.includes(e.choreId) && e.photoUrl)
    .reverse().slice(0,12);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:250,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#111",borderRadius:"24px 24px 0 0",padding:"20px 16px 40px",width:"100%",maxWidth:500,maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18,flexShrink:0}}>
          <Avatar user={user} photo={avatars?.[user.id]} size={44}/>
          <div>
            <div style={{fontSize:"1.1rem",fontWeight:700,color:user.color}}>{user.name}</div>
            <div style={{fontSize:"0.72rem",color:"#555"}}>🦷 תמונות צחצוח אחרונות</div>
          </div>
          <button onClick={onClose} style={{marginRight:"auto",background:"rgba(255,255,255,.07)",border:"none",borderRadius:"50%",width:32,height:32,color:"#666",cursor:"pointer",fontSize:"1rem"}}>✕</button>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {photos.length===0 ? (
            <div style={{textAlign:"center",color:"#444",padding:"40px 20px"}}>
              <div style={{fontSize:"3rem",marginBottom:12}}>📷</div>
              <div style={{fontSize:"0.85rem"}}>עדיין אין תמונות צחצוח</div>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {photos.map((e,i)=>(
                <div key={i} style={{position:"relative",borderRadius:12,overflow:"hidden",aspectRatio:"1",background:"#1a1a1a"}}>
                  <img src={e.photoUrl} alt="צחצוח" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,.8))",padding:"8px 6px 5px",fontSize:"0.6rem",color:"#ccc",fontWeight:600}}>
                    {BRUSH_NAMES[e.choreId]}<br/>
                    <span style={{color:"#666",fontWeight:400}}>{new Date(e.ts).toLocaleDateString("he-IL",{day:"numeric",month:"short"})}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BRUSHING SECTION (new standalone component) ──────────────────────────────
function BrushingSection({ user, log, onLogChore }) {
  const [activeChore, setActiveChore] = useState(null);
  const today = new Date().toDateString();

  const getStreak = (choreId) => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const dateStr = d.toDateString();
      const done = log.some(e => e.userId===user.id && e.choreId===choreId && new Date(e.ts).toDateString()===dateStr);
      if (!done) break;
      streak++;
      d.setDate(d.getDate()-1);
    }
    return streak;
  };

  const handleDone = (url) => {
    if (!activeChore) return;
    onLogChore(user.id, activeChore.id, "hygiene", null, url || null);
    setActiveChore(null);
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #071211 0%, #0a1a16 50%, #071211 100%)",
      borderRadius: 20,
      border: "1px solid rgba(0,212,170,0.2)",
      marginBottom: 20,
      overflow: "hidden",
      boxShadow: "0 0 40px rgba(0,212,170,0.05)",
    }}>
      {/* Header strip */}
      <div style={{
        background: "linear-gradient(90deg, rgba(0,212,170,0.12) 0%, rgba(0,212,170,0.04) 100%)",
        borderBottom: "1px solid rgba(0,212,170,0.12)",
        padding: "11px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span style={{fontSize:"1.1rem"}}>🦷</span>
        <span style={{fontSize:"0.72rem",fontWeight:700,color:"#00D4AA",letterSpacing:1.5,textTransform:"uppercase"}}>מעקב צחצוח יומי</span>
        <div style={{marginRight:"auto",fontSize:"0.65rem",color:"rgba(0,212,170,0.5)",background:"rgba(0,212,170,0.08)",borderRadius:20,padding:"2px 10px",border:"1px solid rgba(0,212,170,0.12)"}}>
          {new Date().toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}
        </div>
      </div>

      {/* Cards */}
      <div style={{padding:"14px 14px 4px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {BRUSH_CHORES.map(chore => {
          const doneCount = countToday(user.id, chore.id, log);
          const done = doneCount > 0;
          const streak = getStreak(chore.id);
          const isActive = activeChore?.id === chore.id;
          const lastPhoto = [...log].reverse().find(e => e.userId===user.id && e.choreId===chore.id && e.photoUrl && new Date(e.ts).toDateString()===today);

          return (
            <div key={chore.id}>
              <div
                onClick={() => {
                  if (isActive) { setActiveChore(null); return; }
                  setActiveChore(chore);
                }}
                style={{
                  background: done
                    ? "linear-gradient(135deg, rgba(0,212,170,0.15), rgba(0,212,170,0.06))"
                    : "rgba(255,255,255,0.03)",
                  border: `1.5px solid ${done ? "rgba(0,212,170,0.4)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 16,
                  padding: "14px 12px",
                  cursor: "pointer",
                  transition: "all .2s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Done glow */}
                {done && (
                  <div style={{position:"absolute",top:-20,right:-20,width:60,height:60,borderRadius:"50%",background:"rgba(0,212,170,0.12)",filter:"blur(20px)",pointerEvents:"none"}}/>
                )}

                {/* Icon + status */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:"1.6rem"}}>{chore.icon}</span>
                  <div style={{
                    width:28,height:28,borderRadius:"50%",
                    background: done ? "rgba(0,212,170,0.2)" : "rgba(255,255,255,0.05)",
                    border: `2px solid ${done ? "#00D4AA" : "rgba(255,255,255,0.1)"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"0.85rem",flexShrink:0,
                    transition:"all .3s",
                  }}>
                    {done ? "✓" : ""}
                  </div>
                </div>

                {/* Name */}
                <div style={{fontSize:"0.82rem",fontWeight:700,color: done ? "#00D4AA" : DS.text,marginBottom:4}}>
                  {chore.name}
                </div>

                {/* Streak + photo thumb */}
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {streak > 0 && (
                    <div style={{fontSize:"0.65rem",color:"#FF9F0A",fontWeight:700,background:"rgba(255,159,10,0.1)",borderRadius:8,padding:"2px 7px",border:"1px solid rgba(255,159,10,0.2)"}}>
                      🔥 {streak}
                    </div>
                  )}
                  {lastPhoto && (
                    <img src={lastPhoto.photoUrl} alt="proof"
                      style={{width:22,height:22,borderRadius:6,objectFit:"cover",border:"1px solid rgba(0,212,170,0.3)",marginRight:"auto"}}/>
                  )}
                  {!done && (
                    <div style={{fontSize:"0.6rem",color:DS.muted,marginRight:"auto"}}>טרם בוצע</div>
                  )}
                </div>
              </div>

              {/* Inline photo upload — appears below the card */}
              {isActive && (
                <div style={{marginTop:6,marginBottom:6}}>
                  <PhotoUpload
                    user={user}
                    chore={chore}
                    onDone={handleDone}
                    onSkip={() => handleDone(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Week strip */}
      <div style={{padding:"10px 14px 14px"}}>
        <div style={{background:"rgba(0,0,0,0.3)",borderRadius:12,padding:"10px 12px",border:"1px solid rgba(0,212,170,0.08)"}}>
          <div style={{fontSize:"0.6rem",color:"rgba(0,212,170,0.5)",fontWeight:600,letterSpacing:1,marginBottom:8}}>7 ימים אחרונים</div>
          <div style={{display:"flex",gap:4}}>
            {Array.from({length:7}).map((_,i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6-i));
              const dStr = d.toDateString();
              const morning = log.some(e => e.userId===user.id && e.choreId==="brush-morning" && new Date(e.ts).toDateString()===dStr);
              const evening = log.some(e => e.userId===user.id && e.choreId==="brush-evening" && new Date(e.ts).toDateString()===dStr);
              const both = morning && evening;
              const isToday = dStr === today;
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{
                    width:"100%",height:28,borderRadius:6,
                    background: both ? "rgba(0,212,170,0.35)" : (morning||evening) ? "rgba(0,212,170,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${both ? "rgba(0,212,170,0.5)" : isToday ? "rgba(0,212,170,0.25)" : "rgba(255,255,255,0.06)"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:"0.6rem",
                    transition:"all .3s",
                  }}>
                    {both ? "✓✓" : morning ? "☀️" : evening ? "🌙" : ""}
                  </div>
                  <div style={{fontSize:"0.55rem",color: isToday ? "#00D4AA" : DS.dim,fontWeight: isToday ? 700 : 400}}>
                    {["א","ב","ג","ד","ה","ו","ש"][d.getDay()]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SECTION DIVIDER ─────────────────────────────────────────────────────────
function SectionDivider({ icon, label }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,margin:"22px 0 12px"}}>
      <div style={{height:1,flex:1,background:"linear-gradient(90deg, transparent, rgba(255,255,255,0.08))"}}/>
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:20,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)"}}>
        <span style={{fontSize:"0.85rem"}}>{icon}</span>
        <span style={{fontSize:"0.65rem",fontWeight:700,color:DS.dim,letterSpacing:1.5,textTransform:"uppercase"}}>{label}</span>
      </div>
      <div style={{height:1,flex:1,background:"linear-gradient(90deg, rgba(255,255,255,0.08), transparent)"}}/>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ log, bonus, avatars, onSwitchUser }) {
  const kids = USERS.filter(u=>u.role==="kid");
  const sorted = [...kids].sort((a,b)=>getUserScore(b.id,log,bonus)-getUserScore(a.id,log,bonus));
  const lastEntry = [...log].reverse().find(e=>!["brush-morning","brush-evening"].includes(e.choreId));
  const lastUser = lastEntry?USERS.find(u=>u.id===lastEntry.userId):null;
  const [photosKid, setPhotosKid] = useState(null);
  const today = new Date().toDateString();

  return (
    <div style={{padding:"16px 16px 80px",maxWidth:900,margin:"0 auto",fontFamily:"-apple-system,sans-serif",direction:"rtl",color:DS.text}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <div style={{fontSize:"1.4rem",fontWeight:700,letterSpacing:-0.5}}>משימות הבית</div>
          <div style={{fontSize:"0.72rem",color:DS.muted,marginTop:2}}>
            {new Date().toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"})}
          </div>
        </div>
        <Logo size={40}/>
      </div>

      {/* ══ 1. BRUSHING STATUS ══ */}
      <div style={{background:"linear-gradient(135deg, #071211 0%, #0d1f1b 100%)",borderRadius:16,border:"1px solid rgba(0,212,170,0.2)",padding:"12px 14px",marginBottom:14,boxShadow:"0 0 30px rgba(0,212,170,0.05)"}}>
        <div style={{fontSize:"0.6rem",fontWeight:800,color:"#00D4AA",letterSpacing:1.5,textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
          <span>🦷</span> צחצוח שיניים היום
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {kids.map(k=>{
            const morning=log.some(e=>e.userId===k.id&&e.choreId==="brush-morning"&&new Date(e.ts).toDateString()===today);
            const evening=log.some(e=>e.userId===k.id&&e.choreId==="brush-evening"&&new Date(e.ts).toDateString()===today);
            const both=morning&&evening;
            const lastBrush=[...log].reverse().find(e=>e.userId===k.id&&["brush-morning","brush-evening"].includes(e.choreId));
            return (
              <div key={k.id} onClick={()=>onSwitchUser(k.id)} style={{background:both?"rgba(0,212,170,0.1)":"rgba(0,0,0,0.3)",borderRadius:12,padding:"10px 8px",textAlign:"center",border:`1.5px solid ${both?"rgba(0,212,170,0.4)":morning||evening?"rgba(0,212,170,0.15)":k.color+"22"}`,cursor:"pointer"}}>
                <Avatar user={k} photo={avatars?.[k.id]} size={36}/>
                <div style={{fontSize:"0.75rem",fontWeight:700,color:k.color,margin:"5px 0 2px"}}>{k.name}</div>
                <div style={{fontSize:"0.55rem",color:lastBrush?"rgba(0,212,170,0.6)":"rgba(255,255,255,0.2)",marginBottom:6,fontWeight:600}}>
                  {lastBrush ? timeAgo(lastBrush.ts) : "טרם צחצח"}
                </div>
                <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                  <div style={{fontSize:"0.6rem",padding:"2px 6px",borderRadius:6,fontWeight:700,background:morning?"rgba(0,212,170,0.2)":"rgba(255,255,255,0.04)",color:morning?"#00D4AA":"rgba(255,255,255,0.2)",border:`1px solid ${morning?"rgba(0,212,170,0.4)":"rgba(255,255,255,0.06)"}`}}>🌅 {morning?"✓":"✗"}</div>
                  <div style={{fontSize:"0.6rem",padding:"2px 6px",borderRadius:6,fontWeight:700,background:evening?"rgba(0,212,170,0.2)":"rgba(255,255,255,0.04)",color:evening?"#00D4AA":"rgba(255,255,255,0.2)",border:`1px solid ${evening?"rgba(0,212,170,0.4)":"rgba(255,255,255,0.06)"}`}}>🌙 {evening?"✓":"✗"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ 2. LAST CHORE ══ */}
      {lastUser && (
        <div style={{background:DS.surface,borderRadius:14,padding:"12px 14px",border:`1px solid ${DS.border}`,marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
          <Avatar user={lastUser} photo={avatars?.[lastUser.id]} size={46}/>
          <div>
            <div style={{fontSize:"0.65rem",color:DS.muted}}>המשימה האחרונה</div>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:lastUser.color}}>{lastUser.name} · {lastEntry.choreTitle}</div>
            <div style={{fontSize:"0.65rem",color:DS.dim}}>{timeAgo(lastEntry.ts)}</div>
          </div>
          <div style={{marginRight:"auto",fontSize:"1.1rem",fontWeight:800,color:lastUser.color}}>+{lastEntry.pts}</div>
        </div>
      )}

      {/* ══ 3. LEADERBOARD ══ */}
      <div style={{fontSize:"0.65rem",fontWeight:700,color:DS.dim,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>LEADERBOARD</div>
      <div style={{background:DS.surface,borderRadius:14,border:`1px solid ${DS.border}`,overflow:"hidden",marginBottom:20}}>
        {sorted.map((u,i)=>{
          const sc=getUserScore(u.id,log,bonus);
          return (
            <div key={u.id} style={{padding:"12px 14px",borderBottom:i<sorted.length-1?`1px solid ${DS.border}`:"none",cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.03)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>
                <span style={{fontSize:"0.68rem",color:DS.dim,width:12,fontVariantNumeric:"tabular-nums"}}>{i+1}</span>
                <div onClick={()=>setPhotosKid(u)} style={{cursor:"pointer",flexShrink:0}}>
                  <Avatar user={u} photo={avatars?.[u.id]} size={48}/>
                </div>
                <span style={{flex:1,fontSize:"0.88rem",fontWeight:600}}>{u.name}</span>
                <span onClick={()=>onSwitchUser(u.id)} style={{fontSize:"0.92rem",fontWeight:800,color:u.color,fontVariantNumeric:"tabular-nums",cursor:"pointer"}}>{sc}</span>
                <span style={{fontSize:"0.65rem",color:DS.muted}}>נק'</span>
              </div>
              <div style={{height:3,background:"rgba(255,255,255,.05)",borderRadius:2,overflow:"hidden",marginRight:22}}>
                <div style={{height:"100%",width:`${Math.min((sc/Math.max(...sorted.map(u=>getUserScore(u.id,log,bonus)),1))*100,100)}%`,background:u.color,borderRadius:2,transition:"width .6s"}}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ 4. RECENT ACTIVITY ══ */}
      <div style={{fontSize:"0.65rem",fontWeight:700,color:DS.dim,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>RECENT ACTIVITY</div>
      <div style={{background:DS.surface,borderRadius:14,border:`1px solid ${DS.border}`,padding:"0 14px"}}>
        {[...log].reverse().slice(0,8).map((e,i,arr)=>{
          const u=USERS.find(u=>u.id===e.userId);
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${DS.border}`:"none",fontSize:"0.82rem"}}>
              <Avatar user={u} photo={avatars?.[u?.id]} size={38}/>
              <div style={{flex:1}}>
                <span style={{fontWeight:700,color:u?.color}}>{u?.name}</span>
                <span style={{color:DS.muted}}> · </span>
                <span>{e.choreTitle}</span>
                {e.photoUrl&&<span style={{color:DS.dim}}> 📷</span>}
                {e.duration&&<span style={{fontSize:"0.7rem",color:DS.dim}}> ⏱{e.duration}ד'</span>}
              </div>
              <span style={{fontSize:"0.7rem",fontWeight:700,color:u?.color,fontVariantNumeric:"tabular-nums"}}>+{e.pts}</span>
              <span style={{fontSize:"0.65rem",color:DS.dim,minWidth:36,textAlign:"left"}}>{timeAgo(e.ts)}</span>
            </div>
          );
        })}
        {log.length===0&&<div style={{textAlign:"center",color:DS.muted,padding:"32px 20px",fontSize:"0.85rem"}}>עדיין אין משימות 😴</div>}
      </div>
      {photosKid && <BrushPhotosModal user={photosKid} log={log} avatars={avatars} onClose={()=>setPhotosKid(null)}/>}
    </div>
  );
}

// ─── KID REWARDS ──────────────────────────────────────────────────────────────
function KidRewards({ user, rewards, log, bonus, onRedeemReward }) {
  const score = getUserScore(user.id, log, bonus);
  if (!rewards||rewards.length===0) return null;
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:"0.65rem",fontWeight:700,color:DS.dim,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>REWARDS</div>
      <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
        {rewards.map(r=>{
          const redeemed=(r.redeemedBy||[]).filter(x=>x.uid===user.id).length;
          const canRedeem=score>=r.pts;
          const pct=Math.min(100,Math.round((score/r.pts)*100));
          return (
            <div key={r.id} style={{flexShrink:0,width:130,background:DS.surface,borderRadius:14,padding:12,border:`1px solid ${canRedeem?user.color:DS.border}`,display:"flex",flexDirection:"column",gap:6,opacity:canRedeem?1:0.7}}>
              <div style={{fontSize:"1.8rem",textAlign:"center"}}>{r.emoji||"🎁"}</div>
              <div style={{fontSize:"0.78rem",fontWeight:700,textAlign:"center"}}>{r.title}</div>
              <div style={{fontSize:"0.82rem",fontWeight:800,textAlign:"center",color:canRedeem?user.color:DS.muted,fontVariantNumeric:"tabular-nums"}}>{r.pts} נק'</div>
              {!canRedeem&&(
                <div style={{height:3,background:"rgba(255,255,255,.07)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:user.color,borderRadius:2}}/>
                </div>
              )}
              {!canRedeem&&<div style={{fontSize:"0.65rem",color:DS.dim,textAlign:"center"}}>עוד {r.pts-score}</div>}
              {canRedeem&&<button onClick={()=>onRedeemReward(r.id,user.id)} style={{background:user.color,border:"none",borderRadius:8,color:"#000",fontFamily:"-apple-system,sans-serif",fontWeight:700,fontSize:"0.8rem",padding:"6px",cursor:"pointer"}}>מימוש!</button>}
              {redeemed>0&&<div style={{fontSize:"0.65rem",color:DS.accent,textAlign:"center"}}>✓ {redeemed}×</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── KID PAGE ─────────────────────────────────────────────────────────────────
function KidPage({ user, log, bonus, onLogChore, rewards, onRedeemReward, photo, onPhotoChange }) {
  const [openCats, setOpenCats] = useState({});
  const [activeChore, setActiveChore] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [customTime, setCustomTime] = useState("");
  const inputRef = useRef(null);

  const score = getUserScore(user.id,log,bonus);
  const ulog = log.filter(e=>e.userId===user.id);
  const career = [...CAREERS].reverse().find(c=>score>=c.pts)||CAREERS[0];
  const catCounts={};
  ulog.forEach(e=>{catCounts[e.catId]=(catCounts[e.catId]||0)+1;});
  const fastCount=ulog.filter(e=>e.duration&&e.duration<=5).length;
  const userStats={totalDone:ulog.length,score,fastCount,catCounts};
  const nextReward=[...(rewards||[])].sort((a,b)=>a.pts-b.pts).find(r=>r.pts>score);

  const toggleCat = id => setOpenCats(p=>({...p,[id]:!p[id]}));
  const openTimeLog = (chore,catId) => {
    setActiveChore({choreId:chore.id,catId});
    setSelectedTime(null); setCustomTime("");
    setOpenCats(p=>({...p,[catId]:true}));
  };
  const confirm = (duration,photoUrl) => {
    if(!activeChore) return;
    onLogChore(user.id,activeChore.choreId,activeChore.catId,duration,photoUrl||null);
    setActiveChore(null); setSelectedTime(null); setCustomTime("");
  };
  const [cropSrc, setCropSrc] = useState(null);
  const handleAvatarFile = file => {
    if(!file||!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => setCropSrc(e.target.result);
    reader.readAsDataURL(file);
  };

  return (
    <div style={{padding:"16px 16px 80px",maxWidth:900,margin:"0 auto",fontFamily:"-apple-system,sans-serif",direction:"rtl",color:DS.text}}>
      <input ref={inputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleAvatarFile(e.target.files?.[0])}/>
      {cropSrc && <CropModal src={cropSrc} user={user} onSave={url=>{onPhotoChange(url);setCropSrc(null);}} onCancel={()=>setCropSrc(null)}/>}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
        <Avatar user={user} photo={photo} size={80} editable onClick={()=>inputRef.current?.click()}/>
        <div style={{flex:1}}>
          <div style={{fontSize:"1.3rem",fontWeight:700,letterSpacing:-0.3}}>{user.name}</div>
          <div style={{fontSize:"0.7rem",color:DS.muted,marginTop:1}}>{career.title}</div>
          <div style={{fontSize:"0.6rem",color:DS.dim,marginTop:2}}>לחץ על התמונה לשינוי</div>
        </div>
        <div style={{textAlign:"left"}}>
          <div style={{fontVariantNumeric:"tabular-nums",fontSize:"1.8rem",fontWeight:800,color:user.color,letterSpacing:-1}}>{score}</div>
          <div style={{fontSize:"0.6rem",color:DS.muted,textAlign:"center"}}>נקודות</div>
        </div>
      </div>

      {/* Next reward progress */}
      {nextReward && (
        <div style={{background:DS.surface,borderRadius:12,padding:"11px 14px",border:`1px solid ${DS.border}`,marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
          <div style={{textAlign:"center",flexShrink:0}}>
            <div style={{fontSize:"1.5rem"}}>{nextReward.emoji||"🎁"}</div>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <span style={{fontSize:"0.78rem",fontWeight:600}}>{nextReward.title}</span>
              <span style={{fontSize:"0.68rem",color:DS.muted}}>עוד {nextReward.pts-score} נק'</span>
            </div>
            <div style={{height:4,background:"rgba(255,255,255,.07)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min((score/nextReward.pts)*100,100)}%`,background:user.color,borderRadius:2,transition:"width .6s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}>
              <span style={{fontSize:"0.62rem",color:user.color,fontWeight:700}}>{score}</span>
              <span style={{fontSize:"0.62rem",color:DS.dim}}>{nextReward.pts}</span>
            </div>
          </div>
        </div>
      )}

      {/* Badges */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
        {BADGES.map(b=>{const earned=b.cond(userStats);return(
          <div key={b.id} style={{background:DS.surface,border:`1px solid ${earned?user.color:DS.border}`,borderRadius:14,padding:"4px 10px",fontSize:"0.7rem",fontWeight:600,color:earned?user.color:DS.dim}}>{b.icon} {b.title}</div>
        );})}
      </div>

      {/* Rewards */}
      <KidRewards user={user} rewards={rewards||[]} log={log} bonus={bonus} onRedeemReward={onRedeemReward}/>

      {/* ══════════════════════════════════════════════════
          BRUSHING SECTION — visually separated, teal-tinted
         ══════════════════════════════════════════════════ */}
      <BrushingSection user={user} log={log} onLogChore={onLogChore} />

      {/* ══════════════════════════════════════════════════
          CHORES SECTION — standard house tasks below
         ══════════════════════════════════════════════════ */}
      <SectionDivider icon="🏠" label="משימות הבית" />

      {/* Chore categories — hygiene category is now excluded (brush moved above) */}
      {CHORE_CATEGORIES.map(cat=>{
        const doneInCat=cat.chores.filter(c=>countToday(user.id,c.id,log)>0).length;
        const isOpen=openCats[cat.id];
        return (
          <div key={cat.id} style={{marginBottom:7}}>
            <div onClick={()=>toggleCat(cat.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:DS.surface,borderRadius:isOpen?"12px 12px 0 0":12,border:`1px solid ${DS.border}`,borderBottom:isOpen?"1px solid transparent":"",cursor:"pointer",userSelect:"none"}}
              onMouseEnter={e=>e.currentTarget.style.background="#161616"}
              onMouseLeave={e=>e.currentTarget.style.background=DS.surface}>
              <span style={{fontSize:"1rem"}}>{cat.icon}</span>
              <span style={{flex:1,fontSize:"0.85rem",fontWeight:600}}>{cat.title}</span>
              <div style={{display:"flex",gap:2}}>
                {cat.chores.slice(0,5).map((_,i)=>(
                  <div key={i} style={{width:5,height:5,borderRadius:"50%",background:i<doneInCat?user.color:"rgba(255,255,255,.1)"}}/>
                ))}
              </div>
              <span style={{fontSize:"0.62rem",color:doneInCat>0?user.color:DS.muted}}>{doneInCat}/{cat.chores.length}</span>
              <span style={{color:DS.dim,fontSize:"0.65rem",transition:"transform .2s",transform:isOpen?"rotate(180deg)":""}}>▾</span>
            </div>
            {isOpen&&(
              <div style={{background:DS.surface,borderRadius:"0 0 12px 12px",border:`1px solid ${DS.border}`,borderTop:"none",padding:"3px 0"}}>
                {cat.chores.map((chore,ci)=>{
                  const timesToday=countToday(user.id,chore.id,log);
                  const lastLog=[...log].reverse().find(e=>e.userId===user.id&&e.choreId===chore.id);
                  const isActive=activeChore?.choreId===chore.id;
                  return (
                    <div key={chore.id}>
                      <div onClick={()=>openTimeLog(chore,cat.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderBottom:ci<cat.chores.length-1?`1px solid ${DS.border}`:"none",cursor:"pointer",background:isActive?"rgba(255,255,255,.04)":"transparent"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.04)"}
                        onMouseLeave={e=>e.currentTarget.style.background=isActive?"rgba(255,255,255,.04)":"transparent"}>
                        <div style={{width:22,height:22,borderRadius:7,border:`1.5px solid ${timesToday>0?user.color:"rgba(255,255,255,.12)"}`,background:timesToday>0?user.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"0.62rem",fontWeight:800,color:"#000"}}>{timesToday>0?timesToday:""}</div>
                        <span style={{flex:1,fontSize:"0.82rem"}}>{chore.name}</span>
                        {lastLog?.duration&&<span style={{fontSize:"0.65rem",color:DS.dim}}>⏱{lastLog.duration}ד'</span>}
                        <span style={{fontSize:"0.68rem",fontWeight:700,color:user.color,fontVariantNumeric:"tabular-nums"}}>+{chore.pts}</span>
                      </div>
                      {isActive&&(
                        <div style={{background:DS.surface2,padding:"12px 14px",borderBottom:ci<cat.chores.length-1?`1px solid ${DS.border}`:"none"}}>
                          <div style={{fontSize:"0.78rem",color:DS.muted,marginBottom:8}}>⏱ כמה זמן לקח לך?</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                            {[2,5,10,15,20,30].map(m=>(
                              <button key={m} onClick={()=>setSelectedTime(m)} style={{padding:"5px 11px",borderRadius:18,background:selectedTime===m?user.color:"rgba(255,255,255,.05)",border:`1px solid ${selectedTime===m?user.color:"rgba(255,255,255,.08)"}`,color:selectedTime===m?"#000":DS.text,fontFamily:"-apple-system,sans-serif",fontSize:"0.78rem",cursor:"pointer"}}>{m} דק'</button>
                            ))}
                          </div>
                          <div style={{display:"flex",gap:6,marginBottom:8}}>
                            <input type="number" placeholder="זמן אחר" value={customTime} onChange={e=>setCustomTime(e.target.value)} style={{flex:1,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,color:DS.text,padding:"6px 10px",fontFamily:"-apple-system,sans-serif",fontSize:"0.82rem"}}/>
                            <button onClick={()=>confirm(customTime?parseInt(customTime):selectedTime)} style={{background:user.color,border:"none",borderRadius:8,color:"#000",fontFamily:"-apple-system,sans-serif",fontWeight:700,fontSize:"0.82rem",padding:"7px 14px",cursor:"pointer"}}>✓</button>
                          </div>
                          <button onClick={()=>confirm(null)} style={{background:"none",border:"1px solid rgba(255,255,255,.07)",borderRadius:18,color:DS.muted,fontFamily:"-apple-system,sans-serif",fontSize:"0.75rem",padding:"4px 12px",cursor:"pointer"}}>דלג</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* History */}
      <SectionDivider icon="📋" label="היסטוריה" />
      <div style={{background:DS.surface,borderRadius:14,border:`1px solid ${DS.border}`,padding:"0 14px"}}>
        {[...ulog].reverse().slice(0,8).map((e,i,arr)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<arr.length-1?`1px solid ${DS.border}`:"none",fontSize:"0.8rem"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:user.color,flexShrink:0}}/>
            <div style={{flex:1}}>
              {e.choreTitle}
              {e.duration&&<span style={{fontSize:"0.68rem",color:DS.dim}}> ⏱{e.duration}ד'</span>}
              {e.photoUrl&&<a href={e.photoUrl} target="_blank" rel="noreferrer" style={{display:"inline-block",marginRight:5,verticalAlign:"middle"}}><img src={e.photoUrl} alt="הוכחה" style={{width:26,height:26,borderRadius:5,objectFit:"cover",border:"1px solid rgba(255,255,255,.1)"}}/></a>}
            </div>
            <span style={{fontSize:"0.75rem",fontWeight:700,color:user.color,fontVariantNumeric:"tabular-nums"}}>+{e.pts}</span>
            <span style={{fontSize:"0.62rem",color:DS.dim}}>{timeAgo(e.ts)}</span>
          </div>
        ))}
        {ulog.length===0&&<div style={{textAlign:"center",color:DS.muted,padding:"28px",fontSize:"0.82rem"}}>עדיין לא בוצעו משימות</div>}
      </div>
    </div>
  );
}

// ─── PARENT PAGE ──────────────────────────────────────────────────────────────
function ParentPage({ user, log, bonus, onAdjustBonus, onSwitchUser, onEditEntry, onDeleteEntry, rewards, onAddReward, onDeleteReward, onRedeemReward, avatars }) {
  const kids = USERS.filter(u=>u.role==="kid");
  const weekLog = getLastDaysLog(log,7);
  const [editingIdx, setEditingIdx] = useState(null);
  const [newReward, setNewReward] = useState({title:"",pts:"",emoji:"🎁"});
  const [addingReward, setAddingReward] = useState(false);
  const REWARD_EMOJIS = ["🎁","🍦","🎮","🎬","🍕","🎠","🚗","✈️","🎪","💰","📱","🏆","🌟","🎯","🎲"];

  return (
    <div style={{padding:"16px 16px 80px",maxWidth:900,margin:"0 auto",fontFamily:"-apple-system,sans-serif",direction:"rtl",color:DS.text}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <div style={{width:48,height:48,borderRadius:"50%",background:`${user.color}15`,border:`1.5px solid ${user.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",fontWeight:800,color:user.color}}>{user.name[0]}</div>
        <div>
          <div style={{fontSize:"1.2rem",fontWeight:700}}>{user.name} — הורה</div>
          <div style={{fontSize:"0.7rem",color:DS.muted}}>ניהול ניקודים ופרסים</div>
        </div>
      </div>

      {/* Brushing overview for all kids */}
      <div style={{
        background:"linear-gradient(135deg, #071211, #0a1a16)",
        borderRadius:16,border:"1px solid rgba(0,212,170,0.2)",
        padding:"14px",marginBottom:20,
      }}>
        <div style={{fontSize:"0.65rem",fontWeight:700,color:"#00D4AA",letterSpacing:1.5,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>
          <span>🦷</span> מעקב צחצוח היום
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {kids.map(k => {
            const today = new Date().toDateString();
            const morning = log.some(e => e.userId===k.id && e.choreId==="brush-morning" && new Date(e.ts).toDateString()===today);
            const evening = log.some(e => e.userId===k.id && e.choreId==="brush-evening" && new Date(e.ts).toDateString()===today);
            return (
              <div key={k.id} style={{background:"rgba(0,0,0,0.3)",borderRadius:12,padding:"10px 8px",textAlign:"center",border:`1px solid ${k.color}22`}}>
                <Avatar user={k} photo={avatars?.[k.id]} size={32} style={{margin:"0 auto 6px"}}/>
                <div style={{fontSize:"0.75rem",fontWeight:700,color:k.color,marginTop:4,marginBottom:6}}>{k.name}</div>
                <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                  <div style={{fontSize:"0.6rem",padding:"2px 6px",borderRadius:6,background:morning?"rgba(0,212,170,0.2)":"rgba(255,255,255,0.04)",color:morning?"#00D4AA":DS.dim,border:`1px solid ${morning?"rgba(0,212,170,0.4)":"rgba(255,255,255,0.06)"}`}}>
                    🌅{morning?"✓":"✗"}
                  </div>
                  <div style={{fontSize:"0.6rem",padding:"2px 6px",borderRadius:6,background:evening?"rgba(0,212,170,0.2)":"rgba(255,255,255,0.04)",color:evening?"#00D4AA":DS.dim,border:`1px solid ${evening?"rgba(0,212,170,0.4)":"rgba(255,255,255,0.06)"}`}}>
                    🌙{evening?"✓":"✗"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kid summaries */}
      <div style={{fontSize:"0.65rem",fontWeight:700,color:DS.dim,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>KIDS SUMMARY</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
        {kids.map(k=>{
          const sc=getUserScore(k.id,log,bonus); const wk=weekLog.filter(e=>e.userId===k.id).length;
          return (
            <div key={k.id} onClick={()=>onSwitchUser(k.id)} style={{background:DS.surface,borderRadius:14,padding:"14px 10px",border:`1px solid ${k.color}22`,textAlign:"center",cursor:"pointer",transition:"transform .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,.4)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
              <Avatar user={k} photo={avatars?.[k.id]} size={40}/>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:k.color,marginTop:6}}>{k.name}</div>
              <div style={{fontSize:"1.3rem",fontWeight:800,color:k.color,fontVariantNumeric:"tabular-nums"}}>{sc}</div>
              <div style={{fontSize:"0.62rem",color:DS.muted}}>{wk} השבוע</div>
            </div>
          );
        })}
      </div>

      {/* Bonus */}
      <div style={{fontSize:"0.65rem",fontWeight:700,color:DS.dim,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>BONUS POINTS</div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {kids.map(k=>(
          <div key={k.id} style={{background:DS.surface,borderRadius:12,padding:"12px 14px",border:`1px solid ${DS.border}`,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <Avatar user={k} photo={avatars?.[k.id]} size={30}/>
            <span style={{fontWeight:600,color:k.color,flex:1,fontSize:"0.85rem"}}>{k.name}</span>
            {[-10,-5,-1].map(n=><button key={n} onClick={()=>onAdjustBonus(k.id,n)} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(255,69,58,.12)",color:"#FF453A",fontSize:"0.78rem",cursor:"pointer",fontFamily:"-apple-system,sans-serif",fontWeight:700}}>{n}</button>)}
            <span style={{fontSize:"1.1rem",fontWeight:800,color:k.color,minWidth:36,textAlign:"center",fontVariantNumeric:"tabular-nums"}}>{bonus[k.id]||0}</span>
            {[1,5,10].map(n=><button key={n} onClick={()=>onAdjustBonus(k.id,n)} style={{width:32,height:32,borderRadius:"50%",border:"none",background:"rgba(48,209,88,.12)",color:"#30D158",fontSize:"0.78rem",cursor:"pointer",fontFamily:"-apple-system,sans-serif",fontWeight:700}}>+{n}</button>)}
          </div>
        ))}
      </div>

      {/* Career */}
      <div style={{fontSize:"0.65rem",fontWeight:700,color:DS.dim,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>CAREER STATUS</div>
      {kids.map(k=>{
        const sc=getUserScore(k.id,log,bonus);
        return (
          <div key={k.id} style={{marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <Avatar user={k} photo={avatars?.[k.id]} size={24}/>
              <span style={{fontSize:"0.82rem",fontWeight:700,color:k.color}}>{k.name} · {sc} נקודות</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:8}}>
              {CAREERS.map(c=>{const unlocked=sc>=c.pts;return(
                <div key={c.pts} style={{background:DS.surface,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1px solid ${unlocked?k.color:DS.border}`,opacity:unlocked?1:.35}}>
                  <div style={{fontSize:"0.72rem",fontWeight:700,color:unlocked?k.color:DS.muted}}>{c.title}</div>
                  <div style={{fontSize:"0.6rem",color:DS.dim,marginTop:2}}>{c.pts===0?"התחלה":c.pts+" נק'"}{unlocked?" ✓":""}</div>
                </div>
              );})}
            </div>
          </div>
        );
      })}

      {/* Rewards */}
      <div style={{fontSize:"0.65rem",fontWeight:700,color:DS.dim,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>REWARDS</div>
      {(rewards||[]).length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          {(rewards||[]).map(r=>{
            const totalRedeemed=(r.redeemedBy||[]).length;
            return(
              <div key={r.id} style={{background:DS.surface,borderRadius:12,padding:"11px 14px",border:`1px solid ${DS.border}`,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{fontSize:"1.3rem"}}>{r.emoji||"🎁"}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:"0.85rem"}}>{r.title}</div>
                  <div style={{fontSize:"0.7rem",color:DS.muted}}>{r.pts} נקודות · מומש {totalRedeemed}×</div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  {kids.map(k=>{
                    const sc=getUserScore(k.id,log,bonus); const can=sc>=r.pts;
                    return <button key={k.id} onClick={()=>can&&onRedeemReward(r.id,k.id)} title={can?`מימוש עבור ${k.name}`:`${k.name} חסר ${r.pts-sc} נק'`} style={{width:28,height:28,borderRadius:"50%",border:`1.5px solid ${can?k.color:"rgba(255,255,255,.08)"}`,background:"transparent",cursor:can?"pointer":"default",opacity:can?1:0.3,overflow:"hidden",padding:0}}>
                      {avatars?.[k.id] ? <img src={avatars[k.id]} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:"0.72rem",fontWeight:800,color:k.color}}>{k.name[0]}</span>}
                    </button>;
                  })}
                </div>
                <button onClick={()=>onDeleteReward(r.id)} style={{background:"rgba(255,69,58,.1)",border:"1px solid rgba(255,69,58,.2)",borderRadius:7,color:"#FF453A",padding:"4px 9px",cursor:"pointer",fontFamily:"-apple-system,sans-serif",fontSize:"0.75rem"}}>🗑️</button>
              </div>
            );
          })}
        </div>
      )}
      {!addingReward
        ? <button onClick={()=>setAddingReward(true)} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.03)",border:"1px dashed rgba(255,255,255,.1)",borderRadius:12,padding:"11px 14px",cursor:"pointer",color:DS.muted,fontFamily:"-apple-system,sans-serif",fontSize:"0.85rem",width:"100%",marginBottom:20}}>＋ הוסף פרס חדש</button>
        : <div style={{background:DS.surface,borderRadius:12,padding:14,border:`1px solid ${user.color}44`,marginBottom:20}}>
            <div style={{fontWeight:700,marginBottom:10,color:user.color,fontSize:"0.9rem"}}>פרס חדש</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>
              {REWARD_EMOJIS.map(e=><button key={e} onClick={()=>setNewReward(p=>({...p,emoji:e}))} style={{width:34,height:34,borderRadius:8,border:`1.5px solid ${newReward.emoji===e?user.color:"rgba(255,255,255,.08)"}`,background:newReward.emoji===e?`${user.color}22`:"transparent",fontSize:"1.1rem",cursor:"pointer"}}>{e}</button>)}
            </div>
            <input placeholder="שם הפרס" value={newReward.title} onChange={e=>setNewReward(p=>({...p,title:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:9,color:DS.text,padding:"9px 12px",fontFamily:"-apple-system,sans-serif",fontSize:"0.85rem",marginBottom:8,direction:"rtl"}}/>
            <input type="number" placeholder="כמה נקודות?" value={newReward.pts} onChange={e=>setNewReward(p=>({...p,pts:e.target.value}))} style={{width:"100%",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.08)",borderRadius:9,color:DS.text,padding:"9px 12px",fontFamily:"-apple-system,sans-serif",fontSize:"0.85rem",marginBottom:10,direction:"rtl"}}/>
            <div style={{display:"flex",gap:7}}>
              <button onClick={()=>{if(!newReward.title||!newReward.pts)return;onAddReward({title:newReward.title,pts:parseInt(newReward.pts),emoji:newReward.emoji});setNewReward({title:"",pts:"",emoji:"🎁"});setAddingReward(false);}} style={{flex:1,background:user.color,border:"none",borderRadius:9,color:"#000",fontFamily:"-apple-system,sans-serif",fontWeight:700,fontSize:"0.85rem",padding:"9px",cursor:"pointer"}}>✓ שמור</button>
              <button onClick={()=>setAddingReward(false)} style={{background:"rgba(255,255,255,.05)",border:"none",borderRadius:9,color:DS.muted,fontFamily:"-apple-system,sans-serif",fontSize:"0.85rem",padding:"9px 14px",cursor:"pointer"}}>ביטול</button>
            </div>
          </div>
      }

      {/* Activity log */}
      <div style={{fontSize:"0.65rem",fontWeight:700,color:DS.dim,letterSpacing:1.5,marginBottom:10,textTransform:"uppercase"}}>ACTIVITY LOG</div>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {[...log].map((e,origIdx)=>({...e,origIdx})).reverse().map(({origIdx,...e})=>{
          const u=USERS.find(u=>u.id===e.userId); const isEditing=editingIdx===origIdx;
          return (
            <div key={origIdx} style={{background:DS.surface,borderRadius:12,padding:"11px 14px",border:`1px solid ${isEditing?user.color:DS.border}`,fontSize:"0.82rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <Avatar user={u} photo={avatars?.[u?.id]} size={26}/>
                <div style={{flex:1}}>
                  <span style={{fontWeight:700,color:u?.color}}>{u?.name}</span>
                  <span style={{color:DS.muted}}> · </span>
                  <span>{e.choreTitle}</span>
                  {e.duration&&<span style={{fontSize:"0.7rem",color:DS.dim}}> ⏱{e.duration}ד'</span>}
                  {e.photoUrl&&<a href={e.photoUrl} target="_blank" rel="noreferrer" style={{display:"inline-block",marginRight:4,verticalAlign:"middle"}}><img src={e.photoUrl} alt="📷" style={{width:22,height:22,borderRadius:4,objectFit:"cover",border:"1px solid rgba(255,255,255,.1)"}}/></a>}
                  <div style={{fontSize:"0.65rem",color:DS.dim,marginTop:1}}>{timeAgo(e.ts)}</div>
                </div>
                <span style={{fontSize:"0.85rem",fontWeight:800,color:u?.color,fontVariantNumeric:"tabular-nums"}}>+{e.pts}</span>
                <button onClick={()=>setEditingIdx(isEditing?null:origIdx)} style={{background:isEditing?"rgba(255,69,58,.12)":"rgba(255,255,255,.05)",border:"none",borderRadius:7,color:isEditing?"#FF453A":DS.muted,padding:"4px 9px",cursor:"pointer",fontFamily:"-apple-system,sans-serif",fontSize:"0.75rem"}}>
                  {isEditing?"✕":"✏️"}
                </button>
              </div>
              {isEditing&&(
                <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${DS.border}`,display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:"0.75rem",color:DS.muted,minWidth:60}}>נקודות:</span>
                    {[-5,-2,-1,1,2,5].map(n=><button key={n} onClick={()=>onEditEntry(origIdx,"pts",e.pts+n)} style={{padding:"3px 9px",borderRadius:7,border:"none",background:n>0?"rgba(48,209,88,.12)":"rgba(255,69,58,.12)",color:n>0?"#30D158":"#FF453A",fontFamily:"-apple-system,sans-serif",fontWeight:700,fontSize:"0.78rem",cursor:"pointer"}}>{n>0?"+":""}{n}</button>)}
                    <span style={{fontSize:"1rem",fontWeight:800,color:u?.color,marginRight:"auto",fontVariantNumeric:"tabular-nums"}}>{e.pts}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:"0.75rem",color:DS.muted,minWidth:60}}>זמן:</span>
                    {[2,5,10,15,20,30].map(m=><button key={m} onClick={()=>onEditEntry(origIdx,"duration",m)} style={{padding:"3px 9px",borderRadius:7,border:`1px solid ${e.duration===m?u?.color:"rgba(255,255,255,.08)"}`,background:e.duration===m?`${u?.color}22`:"transparent",color:e.duration===m?u?.color:DS.muted,fontFamily:"-apple-system,sans-serif",fontSize:"0.75rem",cursor:"pointer"}}>{m}</button>)}
                    <button onClick={()=>onEditEntry(origIdx,"duration",null)} style={{padding:"3px 9px",borderRadius:7,border:"1px solid rgba(255,255,255,.07)",background:"transparent",color:DS.dim,fontFamily:"-apple-system,sans-serif",fontSize:"0.75rem",cursor:"pointer"}}>ללא</button>
                  </div>
                  <button onClick={()=>{onDeleteEntry(origIdx);setEditingIdx(null);}} style={{alignSelf:"flex-start",background:"rgba(255,69,58,.1)",border:"1px solid rgba(255,69,58,.2)",borderRadius:8,color:"#FF453A",padding:"5px 12px",cursor:"pointer",fontFamily:"-apple-system,sans-serif",fontSize:"0.78rem",fontWeight:700}}>🗑️ מחק רשומה</button>
                </div>
              )}
            </div>
          );
        })}
        {log.length===0&&<div style={{textAlign:"center",color:DS.muted,padding:32,fontSize:"0.85rem"}}>עדיין אין פעילות</div>}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loading,     setLoading]     = useState(true);
  const [currentUser, setCurrentUser] = useState("dash");
  const [log,         setLog]         = useState([]);
  const [bonus,       setBonus]       = useState({ido:0,yotam:0,itai:0});
  const [rewards,     setRewards]     = useState([]);
  const [avatars,     setAvatars]     = useState({ido:null,yotam:null,itai:null});
  const [toast,       setToast]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [pinTarget,   setPinTarget]   = useState(null);
  const { canvasRef, pop }            = useConfetti();
  const toastTimer = useRef(null), saveTimer = useRef(null);
  const stateRef = useRef({log:[],bonus:{ido:0,yotam:0,itai:0},rewards:[],avatars:{}});


  useEffect(()=>{
    const stop = subscribeToRealtime(data=>{
      if(data.log?.length!==stateRef.current.log?.length||JSON.stringify(data.bonus)!==JSON.stringify(stateRef.current.bonus)){
        setLog(data.log||[]); setBonus(data.bonus||{ido:0,yotam:0,itai:0});
        setRewards(data.rewards||[]); setAvatars(data.avatars||{});
        stateRef.current = data;
      }
    });
    return stop;
  },[]);

  const persist = useCallback((nextLog,nextBonus,nextRewards,nextAvatars)=>{
    const r=nextRewards!==undefined?nextRewards:stateRef.current.rewards||[];
    const av=nextAvatars!==undefined?nextAvatars:stateRef.current.avatars||{};
    stateRef.current={log:nextLog,bonus:nextBonus,rewards:r,avatars:av};
    clearTimeout(saveTimer.current); setSaving(true);
    saveTimer.current=setTimeout(async()=>{
      try{await saveData({log:nextLog,bonus:nextBonus,rewards:r,avatars:av});}
      catch(e){console.error("Save error",e);}
      finally{setSaving(false);}
    },600);
  },[]);

  const showToast=msg=>{setToast(msg);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(""),2800);};

  const switchUser=uid=>{
    const user=USERS.find(u=>u.id===uid);
    if(user?.role==="parent"){setPinTarget(user);return;}
    setCurrentUser(uid); window.scrollTo({top:0,behavior:"smooth"});
  };
  const handlePinSuccess=()=>{setCurrentUser(pinTarget.id);setPinTarget(null);window.scrollTo({top:0,behavior:"smooth"});};

  const handleLogChore=(uid,choreId,catId,duration,photoUrl)=>{
    // Lookup from all chores (includes brush)
    const chore = ALL_CHORES_FLAT.find(c=>c.id===choreId);
    if(!chore) return;
    const entry={userId:uid,choreId,catId,choreTitle:chore.name,pts:chore.pts,duration:duration||null,photoUrl:photoUrl||null,ts:Date.now()};
    setLog(prev=>{const next=[...prev,entry];persist(next,stateRef.current.bonus);return next;});
    showToast(`${entry.photoUrl?"📷":"✅"} ${chore.name}${chore.tracking?"":" · +"+chore.pts+" נקודות"}!`);
    pop();
  };
  const handleAdjustBonus=(uid,amount)=>{
    setBonus(prev=>{const next={...prev,[uid]:(prev[uid]||0)+amount};persist(stateRef.current.log,next);return next;});
    showToast(`${amount>0?"+":""}${amount} נקודות ל${USERS.find(u=>u.id===uid)?.name}`);
  };
  const handleEditEntry=(idx,field,value)=>{
    setLog(prev=>{const next=prev.map((e,i)=>i===idx?{...e,[field]:value}:e);persist(next,stateRef.current.bonus);return next;});
    showToast("✏️ רשומה עודכנה");
  };
  const handleDeleteEntry=idx=>{
    setLog(prev=>{const next=prev.filter((_,i)=>i!==idx);persist(next,stateRef.current.bonus);return next;});
    showToast("🗑️ רשומה נמחקה");
  };
  const handleAddReward=reward=>{
    const next=[...(stateRef.current.rewards||[]),{...reward,id:Date.now().toString(),redeemedBy:[]}];
    setRewards(next); persist(stateRef.current.log,stateRef.current.bonus,next);
    showToast(`🎁 פרס "${reward.title}" נוסף!`);
  };
  const handleDeleteReward=rid=>{
    const next=(stateRef.current.rewards||[]).filter(r=>r.id!==rid);
    setRewards(next); persist(stateRef.current.log,stateRef.current.bonus,next);
    showToast("🗑️ פרס נמחק");
  };
  const handleRedeemReward=(rid,uid)=>{
    const next=(stateRef.current.rewards||[]).map(r=>r.id===rid?{...r,redeemedBy:[...(r.redeemedBy||[]),{uid,ts:Date.now()}]}:r);
    setRewards(next); persist(stateRef.current.log,stateRef.current.bonus,next);
    const reward=next.find(r=>r.id===rid); const kid=USERS.find(u=>u.id===uid);
    showToast(`🎉 ${kid?.name} מימש: ${reward?.title}!`); pop();
  };
  const handleAvatarChange=(uid,dataUrl)=>{
    const next={...(stateRef.current.avatars||{}),[uid]:dataUrl};
    setAvatars(next); persist(stateRef.current.log,stateRef.current.bonus,stateRef.current.rewards,next);
    showToast("📷 תמונה עודכנה!");
  };

  const user = USERS.find(u=>u.id===currentUser);

  if(loading) return (
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#000",color:DS.muted,fontFamily:"-apple-system,sans-serif",flexDirection:"column",gap:14}}>
      <Logo size={56}/>
      <div style={{fontSize:"0.85rem",marginTop:4}}>טוען...</div>
    </div>
  );

  return (
    <div style={{background:DS.bg,minHeight:"100vh",color:DS.text,fontFamily:"-apple-system,sans-serif",direction:"rtl"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        input:focus,button{outline:none;}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:2px;}
        nav { padding-bottom: 0 !important; }
        #root > div > div:not(nav):not([style*="fixed"]) {
          padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important;
        }
      `}</style>

      <SyncDot saving={saving}/>

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(0,0,0,.94)",backdropFilter:"blur(20px) saturate(180%)",borderBottom:"1px solid rgba(255,255,255,.06)",paddingLeft:"max(16px, env(safe-area-inset-left))",paddingRight:"max(16px, env(safe-area-inset-right))",paddingTop:"env(safe-area-inset-top)",display:"flex",alignItems:"center",overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
        <button onClick={()=>switchUser("dash")} style={{flexShrink:0,padding:"13px 4px 13px 0",background:"none",border:"none",borderBottom:`2px solid ${currentUser==="dash"?DS.accent:"transparent"}`,cursor:"pointer",display:"flex",alignItems:"center",gap:7,transition:"all .2s",marginLeft:16}}>
          <Logo size={20}/>
          <span style={{fontSize:"0.82rem",fontWeight:600,color:currentUser==="dash"?DS.accent:DS.muted}}>הבית</span>
        </button>
        {USERS.map(u=>(
          <button key={u.id} onClick={()=>switchUser(u.id)} style={{flexShrink:0,padding:"13px 14px",background:"none",border:"none",borderBottom:`2px solid ${currentUser===u.id?u.color:"transparent"}`,color:currentUser===u.id?u.color:DS.muted,fontFamily:"-apple-system,sans-serif",fontSize:"0.82rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s",display:"flex",alignItems:"center",gap:7}}>
            {avatars?.[u.id]&&u.role==="kid"
              ? <img src={avatars[u.id]} style={{width:18,height:18,borderRadius:"50%",objectFit:"cover",border:`1px solid ${u.color}44`}}/>
              : <div style={{width:18,height:18,borderRadius:"50%",background:`${u.color}18`,border:`1px solid ${u.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.6rem",fontWeight:800,color:u.color}}>{u.name[0]}</div>
            }
            {u.name}
          </button>
        ))}
      </nav>

      {currentUser==="dash"  && <Dashboard log={log} bonus={bonus} avatars={avatars} onSwitchUser={switchUser}/>}
      {user?.role==="kid"    && <KidPage user={user} log={log} bonus={bonus} onLogChore={handleLogChore} rewards={rewards} onRedeemReward={handleRedeemReward} photo={avatars[user.id]} onPhotoChange={url=>handleAvatarChange(user.id,url)}/>}
      {user?.role==="parent" && <ParentPage user={user} log={log} bonus={bonus} onAdjustBonus={handleAdjustBonus} onSwitchUser={switchUser} onEditEntry={handleEditEntry} onDeleteEntry={handleDeleteEntry} rewards={rewards} onAddReward={handleAddReward} onDeleteReward={handleDeleteReward} onRedeemReward={handleRedeemReward} avatars={avatars}/>}

      {pinTarget&&<PinModal user={pinTarget} onSuccess={handlePinSuccess} onCancel={()=>setPinTarget(null)}/>}
      <Toast msg={toast}/>
      <canvas ref={canvasRef} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:998}}/>
    </div>
  );
}
