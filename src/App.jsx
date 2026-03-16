import { useState, useEffect, useRef, useCallback } from "react";
import { loadData, saveData, subscribeToRealtime } from "./supabase.js";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const USERS = [
  { id: "ido",   name: "עידו",  emoji: "🦁", color: "#FF6B6B", role: "kid" },
  { id: "yotam", name: "יותם",  emoji: "🐊", color: "#4ECDC4", role: "kid" },
  { id: "itai",  name: "איתי",  emoji: "🚀", color: "#FFE66D", role: "kid" },
  { id: "asaf",  name: "אסף",   emoji: "👨‍💼", color: "#A78BFA", role: "parent", pin: "1234" },
  { id: "anna",  name: "אנה",   emoji: "👩‍💼", color: "#F9A8D4", role: "parent", pin: "5678" },
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
    {id:"shower",      name:"ניקוי מקלחת",               pts:6},
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
    {id:"clean-oven",  name:"ניקוי תנור",                 pts:8},
    {id:"clean-fridge-deep",name:"ניקוי מקרר מבפנים",    pts:7},
    {id:"ac-filter",   name:"ניקוי פילטרים של מזגן",      pts:7},
  ]},
  { id:"carpets", icon:"🛋️", title:"שטיחים ווילונות", chores:[
    {id:"wash-curtains",name:"כביסת וילונות",             pts:6},
    {id:"vac-carpet",  name:"שאיבת שטיחים",              pts:5},
    {id:"clean-carpet",name:"ניקוי שטיחים",              pts:6},
  ]},
  { id:"grocery", icon:"🛒", title:"קניות", chores:[
    {id:"sort-grocery",name:"סידור קניות מהמכולת",        pts:4},
    {id:"fridge-items",name:"הכנסת מוצרים למקרר",         pts:3},
    {id:"pantry-items",name:"הכנסת מוצרים לארונות מטבח",  pts:3},
  ]},
  { id:"dog",     icon:"🐕", title:"הכלב", chores:[
    {id:"dog-walk",    name:"לקחת את הכלב לסיבוב",        pts:6},
    {id:"dog-food",    name:"להאכיל את הכלב",             pts:3},
    {id:"dog-water",   name:"להחליף מים לכלב",            pts:2},
  ]},
];

const CAREERS = [
  { icon:"🧹", title:"עוזר ניקיון",    pts:0   },
  { icon:"⭐", title:"כוכב עוזר",      pts:30  },
  { icon:"🏆", title:"אלוף הבית",      pts:80  },
  { icon:"🧑‍🍳", title:"שף ניקיון",     pts:150 },
  { icon:"🦸", title:"גיבור הבית",     pts:250 },
  { icon:"👑", title:"מלך/מלכת הבית", pts:400 },
];

const BADGES = [
  { id:"first",  icon:"🎯", title:"מתחיל",       cond: s => s.totalDone >= 1 },
  { id:"ten",    icon:"🔟", title:"10 משימות",    cond: s => s.totalDone >= 10 },
  { id:"speed",  icon:"⚡", title:"מהיר",         cond: s => s.fastCount >= 3 },
  { id:"dog",    icon:"🐕", title:"חבר הכלב",    cond: s => (s.catCounts?.dog||0) >= 3 },
  { id:"dishes", icon:"🍽️", title:"גאון הכלים",  cond: s => (s.catCounts?.dishes||0) >= 5 },
  { id:"star",   icon:"💫", title:"סופר-כוכב",   cond: s => s.score >= 100 },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const timeAgo = ts => {
  const d = Date.now() - ts;
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

// ─── CONFETTI ────────────────────────────────────────────────────────────────
function useConfetti() {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const rafRef    = useRef(null);

  const animate = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.current.forEach(p => {
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.rot+=p.rotV; p.life-=p.decay;
      if(p.life<=0) return;
      ctx.save(); ctx.globalAlpha=p.life; ctx.fillStyle=p.color;
      ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2);
      ctx.restore();
    });
    particles.current = particles.current.filter(p=>p.life>0);
    if (particles.current.length>0) rafRef.current = requestAnimationFrame(animate);
    else rafRef.current = null;
  }, []);

  const pop = useCallback(() => {
    const colors = ["#FF6B6B","#4ECDC4","#FFE66D","#A78BFA","#F9A8D4","#fff"];
    for(let i=0;i<45;i++) particles.current.push({
      x:Math.random()*window.innerWidth, y:window.innerHeight*0.3+Math.random()*window.innerHeight*0.4,
      vx:(Math.random()-.5)*8, vy:(Math.random()-2)*6,
      size:4+Math.random()*7, color:colors[Math.floor(Math.random()*colors.length)],
      life:1, decay:0.016+Math.random()*0.014, rot:Math.random()*360, rotV:(Math.random()-.5)*8,
    });
    if (!rafRef.current) rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  useEffect(() => {
    const resize = () => {
      if(canvasRef.current){canvasRef.current.width=window.innerWidth;canvasRef.current.height=window.innerHeight;}
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return { canvasRef, pop };
}

// ─── PIN MODAL ────────────────────────────────────────────────────────────────
function PinModal({ user, onSuccess, onCancel }) {
  const [pin, setPin]     = useState("");
  const [error, setError] = useState(false);

  const tryPin = p => {
    if (p === user.pin) { onSuccess(); }
    else { setError(true); setPin(""); setTimeout(()=>setError(false), 1200); }
  };
  const press = k => {
    if (k==="⌫") { setPin(p=>p.slice(0,-1)); return; }
    if (k==="" || pin.length>=4) return;
    const np = pin+k;
    setPin(np);
    if (np.length===4) setTimeout(()=>tryPin(np), 120);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
      <div style={{background:"#1a1a2e",borderRadius:24,padding:"32px 28px",maxWidth:320,width:"100%",border:`2px solid ${user.color}`,textAlign:"center"}}>
        <div style={{fontSize:"3rem",marginBottom:12}}>{user.emoji}</div>
        <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.4rem",color:user.color,marginBottom:6}}>{user.name}</div>
        <div style={{color:"#7a7a99",fontSize:"0.85rem",marginBottom:20}}>הכנס קוד PIN להורה</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{width:44,height:54,borderRadius:12,background:"#0f0f1a",border:`2px solid ${error?"#FF6B6B":pin.length>i?user.color:"rgba(255,255,255,.1)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",color:user.color,transition:"border-color .2s"}}>
              {pin.length>i?"●":""}
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
            <button key={i} onClick={()=>press(String(k))} disabled={k===""} style={{padding:"14px 0",borderRadius:12,border:"1px solid rgba(255,255,255,.1)",background:k===""?"transparent":"rgba(255,255,255,.05)",color:"#f0f0ff",fontSize:"1.2rem",fontFamily:"'Heebo',sans-serif",cursor:k===""?"default":"pointer",fontWeight:700}}>
              {k}
            </button>
          ))}
        </div>
        {error && <div style={{color:"#FF6B6B",fontSize:"0.85rem",marginBottom:10}}>קוד שגוי, נסה שוב</div>}
        <button onClick={onCancel} style={{background:"none",border:"none",color:"#7a7a99",cursor:"pointer",fontSize:"0.85rem",fontFamily:"'Heebo',sans-serif"}}>ביטול</button>
      </div>
    </div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg }) {
  return (
    <div style={{position:"fixed",bottom:30,left:"50%",transform:`translateX(-50%) translateY(${msg?"0":"100px"})`,background:"#1e293b",color:"#fff",padding:"12px 24px",borderRadius:30,fontWeight:600,fontSize:"0.9rem",transition:"transform .35s cubic-bezier(.4,2,.6,1)",zIndex:999,whiteSpace:"nowrap",boxShadow:"0 8px 30px rgba(0,0,0,.4)",fontFamily:"'Heebo',sans-serif"}}>
      {msg||"‎"}
    </div>
  );
}

// ─── SYNC INDICATOR ──────────────────────────────────────────────────────────
function SyncDot({ saving }) {
  return (
    <div style={{position:"fixed",top:14,left:16,zIndex:200,display:"flex",alignItems:"center",gap:6,fontSize:"0.72rem",color:"#7a7a99",fontFamily:"'Heebo',sans-serif"}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:saving?"#FFE66D":"#4ECDC4",boxShadow:saving?"0 0 6px #FFE66D":"0 0 6px #4ECDC4",transition:"background .3s"}}/>
      {saving ? "שומר..." : "מסונכרן"}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ log, bonus, onSwitchUser }) {
  const kids     = USERS.filter(u=>u.role==="kid");
  const sorted   = [...kids].sort((a,b)=>getUserScore(b.id,log,bonus)-getUserScore(a.id,log,bonus));
  const weekLog  = getLastDaysLog(log,7);
  const weekCounts = Object.fromEntries(kids.map(k=>[k.id,weekLog.filter(e=>e.userId===k.id).length]));
  const lastEntry  = log[log.length-1];
  const lastUser   = lastEntry?USERS.find(u=>u.id===lastEntry.userId):null;
  const maxWeek    = Math.max(...Object.values(weekCounts),1);
  const medals     = ["🥇","🥈","🥉"];

  return (
    <div style={{padding:"24px 20px 80px",maxWidth:900,margin:"0 auto"}}>
      <div style={{textAlign:"center",padding:"32px 0 24px"}}>
        <h1 style={{fontFamily:"'Fredoka One',cursive",fontSize:"clamp(2rem,6vw,3rem)",background:"linear-gradient(135deg,#FF6B6B,#FFE66D,#4ECDC4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>🏠 משימות הבית</h1>
        <p style={{color:"#7a7a99",marginTop:6}}>מי המנצח השבוע?</p>
      </div>

      {lastUser && (
        <div style={{background:"#1a1a2e",borderRadius:16,padding:"14px 18px",border:"1px solid rgba(255,255,255,.08)",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:"1.6rem"}}>{lastUser.emoji}</span>
          <div>
            <div style={{fontSize:"0.75rem",color:"#7a7a99"}}>המשימה האחרונה</div>
            <div style={{fontWeight:700,color:lastUser.color}}>{lastUser.name}</div>
            <div style={{fontSize:"0.75rem",color:"#7a7a99"}}>{lastEntry.choreTitle} · {timeAgo(lastEntry.ts)}</div>
          </div>
          <div style={{marginRight:"auto",fontFamily:"'Fredoka One',cursive",fontSize:"1.4rem",color:lastUser.color}}>+{lastEntry.pts}</div>
        </div>
      )}

      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",marginBottom:14,marginTop:28}}>🏆 טבלת מובילים</div>
      <div style={{display:"grid",gap:12,marginBottom:28}}>
        {sorted.map((u,i)=>{
          const sc=getUserScore(u.id,log,bonus); const wk=weekCounts[u.id];
          return (
            <div key={u.id} onClick={()=>onSwitchUser(u.id)} style={{background:"#1a1a2e",borderRadius:18,padding:"16px 20px",display:"flex",alignItems:"center",gap:16,border:`1px solid ${i===0?u.color+"55":"rgba(255,255,255,.08)"}`,cursor:"pointer",transition:"transform .15s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateX(-4px)"}
              onMouseLeave={e=>e.currentTarget.style.transform=""}>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.8rem",width:40,textAlign:"center",color:["#FFD700","#C0C0C0","#CD7F32"][i]||"#7a7a99"}}>{medals[i]||i+1}</div>
              <div style={{width:52,height:52,borderRadius:"50%",background:`${u.color}22`,border:`2px solid ${u.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.8rem",flexShrink:0}}>{u.emoji}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,color:u.color}}>{u.name}</div>
                <div style={{fontSize:"0.8rem",color:"#7a7a99"}}>{wk} משימות השבוע · {log.filter(e=>e.userId===u.id).length} סה"כ</div>
              </div>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.6rem",color:u.color,textAlign:"left"}}>{sc}<br/><span style={{fontSize:"0.7rem",fontFamily:"'Heebo',sans-serif",color:"#7a7a99"}}>נקודות</span></div>
            </div>
          );
        })}
      </div>

      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",marginBottom:14}}>📊 פעילות השבוע</div>
      <div style={{background:"#1a1a2e",borderRadius:18,padding:20,border:"1px solid rgba(255,255,255,.08)",marginBottom:28}}>
        <div style={{fontSize:"0.85rem",color:"#7a7a99"}}>משימות לפי ילד</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:100,marginTop:12}}>
          {kids.map(k=>{const cnt=weekCounts[k.id];const h=Math.round((cnt/maxWeek)*90);return(
            <div key={k.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{fontSize:"0.72rem",fontWeight:700,color:k.color}}>{cnt}</div>
              <div style={{width:"100%",height:h||4,borderRadius:"6px 6px 0 0",background:k.color,transition:"height .5s"}}/>
              <div style={{fontSize:"0.7rem",color:"#7a7a99"}}>{k.name}</div>
            </div>
          );})}
        </div>
      </div>

      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",marginBottom:14}}>⚡ פעילות אחרונה</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
        {[...log].reverse().slice(0,8).map((e,i)=>{
          const u=USERS.find(u=>u.id===e.userId);
          return(
            <div key={i} style={{background:"#1a1a2e",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,border:"1px solid rgba(255,255,255,.08)",fontSize:"0.9rem"}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:u?.color,flexShrink:0}}/>
              <span style={{fontSize:"1.1rem"}}>{u?.emoji}</span>
              <div><span style={{fontWeight:600,color:u?.color}}>{u?.name}</span><span style={{color:"#7a7a99"}}> · </span>{e.choreTitle}{e.duration&&<span style={{fontSize:"0.75rem",color:"#7a7a99"}}> ⏱ {e.duration} דק'</span>}</div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2,marginRight:"auto"}}>
                <span style={{fontWeight:700,color:u?.color,fontSize:"0.85rem"}}>+{e.pts}</span>
                <span style={{color:"#7a7a99",fontSize:"0.78rem",whiteSpace:"nowrap"}}>{timeAgo(e.ts)}</span>
              </div>
            </div>
          );
        })}
        {log.length===0&&<div style={{textAlign:"center",color:"#7a7a99",padding:"40px 20px"}}><div style={{fontSize:"3rem",marginBottom:12}}>😴</div>עדיין אין משימות. בואו נתחיל!</div>}
      </div>

      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",marginBottom:14}}>📈 סטטיסטיקות</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:12}}>
        {[
          {emoji:"✅",val:log.length,lbl:'משימות שבוצעו'},
          {emoji:"⭐",val:kids.reduce((s,k)=>s+getUserScore(k.id,log,bonus),0),lbl:'נקודות סה"כ'},
          {emoji:"🔥",val:weekLog.length,lbl:"השבוע"},
          {emoji:"⏱",val:log.filter(e=>e.duration).reduce((s,e)=>s+e.duration,0),lbl:"דקות עבודה"},
        ].map((s,i)=>(
          <div key={i} style={{background:"#1a1a2e",borderRadius:16,padding:"18px 16px",border:"1px solid rgba(255,255,255,.08)",textAlign:"center"}}>
            <div style={{fontSize:"2rem"}}>{s.emoji}</div>
            <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.8rem",margin:"6px 0 2px"}}>{s.val}</div>
            <div style={{fontSize:"0.78rem",color:"#7a7a99"}}>{s.lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── REWARDS DISPLAY (KID) ────────────────────────────────────────────────────
function KidRewards({ user, rewards, log, bonus, onRedeemReward }) {
  const score = getUserScore(user.id, log, bonus);
  if (!rewards || rewards.length === 0) return null;

  return (
    <div style={{marginBottom:28}}>
      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",marginBottom:14}}>🎁 פרסים</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
        {rewards.map(r=>{
          const redeemed = (r.redeemedBy||[]).filter(x=>x.uid===user.id).length;
          const canRedeem = score >= r.pts;
          const pct = Math.min(100, Math.round((score/r.pts)*100));
          return (
            <div key={r.id} style={{background:"#1a1a2e",borderRadius:18,padding:16,border:`2px solid ${canRedeem?user.color:"rgba(255,255,255,.08)"}`,display:"flex",flexDirection:"column",gap:8,transition:"all .2s",opacity:canRedeem?1:0.7}}>
              <div style={{fontSize:"2.2rem",textAlign:"center"}}>{r.emoji||"🎁"}</div>
              <div style={{fontWeight:700,fontSize:"0.9rem",textAlign:"center"}}>{r.title}</div>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.1rem",textAlign:"center",color:canRedeem?user.color:"#7a7a99"}}>{r.pts} נק'</div>
              {!canRedeem && (
                <div style={{background:"rgba(255,255,255,.05)",borderRadius:8,height:6,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:user.color,borderRadius:8,transition:"width .5s"}}/>
                </div>
              )}
              {!canRedeem && <div style={{fontSize:"0.7rem",color:"#555",textAlign:"center"}}>עוד {r.pts-score} נק'</div>}
              {canRedeem && (
                <button onClick={()=>onRedeemReward(r.id,user.id)} style={{background:user.color,border:"none",borderRadius:10,color:"#000",fontFamily:"'Heebo',sans-serif",fontWeight:700,fontSize:"0.85rem",padding:"8px",cursor:"pointer"}}>
                  🎉 מימוש!
                </button>
              )}
              {redeemed>0 && <div style={{fontSize:"0.7rem",color:"#4ECDC4",textAlign:"center"}}>מומש {redeemed} פעמים ✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── KID PAGE ─────────────────────────────────────────────────────────────────
function KidPage({ user, log, onLogChore, rewards, onRedeemReward }) {
  const [openCats,    setOpenCats]    = useState({});
  const [activeChore, setActiveChore] = useState(null);
  const [selectedTime,setSelectedTime]= useState(null);
  const [customTime,  setCustomTime]  = useState("");

  const score    = getUserScore(user.id, log, {});
  const ulog     = log.filter(e=>e.userId===user.id);
  const career   = [...CAREERS].reverse().find(c=>score>=c.pts)||CAREERS[0];
  const catCounts= {};
  ulog.forEach(e=>{catCounts[e.catId]=(catCounts[e.catId]||0)+1;});
  const fastCount  = ulog.filter(e=>e.duration&&e.duration<=5).length;
  const userStats  = {totalDone:ulog.length,score,fastCount,catCounts};

  const toggleCat = id => setOpenCats(p=>({...p,[id]:!p[id]}));
  const openTimeLog = (chore, catId) => {
    if (activeChore?.choreId===chore.id) {setActiveChore(null);setSelectedTime(null);setCustomTime("");return;}
    setActiveChore({choreId:chore.id,catId});
    setSelectedTime(null); setCustomTime("");
    setOpenCats(p=>({...p,[catId]:true}));
  };
  const confirm = duration => {
    if(!activeChore) return;
    onLogChore(user.id,activeChore.choreId,activeChore.catId,duration);
    setActiveChore(null);setSelectedTime(null);setCustomTime("");
  };

  return (
    <div style={{padding:"24px 20px 80px",maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:18,paddingBottom:20}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:`${user.color}22`,border:`3px solid ${user.color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.2rem",boxShadow:`0 0 24px -6px ${user.color}`}}>{user.emoji}</div>
        <div>
          <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.8rem",color:user.color}}>{user.name}</h2>
          <p style={{color:"#7a7a99",fontSize:"0.9rem"}}>{career.icon} {career.title}</p>
        </div>
        <div style={{marginRight:"auto",textAlign:"left",fontFamily:"'Fredoka One',cursive",fontSize:"2.4rem",color:user.color}}>
          {score}<br/><small style={{fontSize:"0.8rem",fontFamily:"'Heebo',sans-serif",color:"#7a7a99"}}>נקודות</small>
        </div>
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
        {BADGES.map(b=>{const earned=b.cond(userStats);return(
          <div key={b.id} style={{background:"#1a1a2e",border:`1px solid ${earned?user.color:"rgba(255,255,255,.08)"}`,borderRadius:20,padding:"5px 12px",fontSize:"0.78rem",fontWeight:600,color:earned?user.color:"#7a7a99"}}>{b.icon} {b.title}</div>
        );})}
      </div>

      <KidRewards user={user} rewards={rewards||[]} log={log} bonus={{}} onRedeemReward={onRedeemReward}/>

      {CHORE_CATEGORIES.map(cat=>{
        const doneInCat=cat.chores.filter(c=>countToday(user.id,c.id,log)>0).length;
        const isOpen=openCats[cat.id];
        return(
          <div key={cat.id} style={{marginBottom:12}}>
            <div onClick={()=>toggleCat(cat.id)} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"10px 14px",background:"#1a1a2e",borderRadius:12,border:"1px solid rgba(255,255,255,.08)",userSelect:"none"}}
              onMouseEnter={e=>e.currentTarget.style.background="#1e1e35"}
              onMouseLeave={e=>e.currentTarget.style.background="#1a1a2e"}>
              <span style={{fontSize:"1.2rem"}}>{cat.icon}</span>
              <span style={{fontWeight:700,flex:1}}>{cat.title}</span>
              <span style={{fontSize:"0.78rem",color:doneInCat>0?user.color:"#7a7a99"}}>{doneInCat}/{cat.chores.length}</span>
              <span style={{color:"#7a7a99",transition:"transform .2s",transform:isOpen?"rotate(180deg)":""}}>▼</span>
            </div>
            {isOpen&&(
              <div style={{display:"flex",flexDirection:"column",gap:6,padding:"6px 4px 2px"}}>
                {cat.chores.map(chore=>{
                  const timesToday=countToday(user.id,chore.id,log);
                  const lastLog=[...log].reverse().find(e=>e.userId===user.id&&e.choreId===chore.id);
                  const isActive=activeChore?.choreId===chore.id;
                  return(
                    <div key={chore.id}>
                      <div onClick={()=>openTimeLog(chore,cat.id)} style={{display:"flex",alignItems:"center",gap:10,background:isActive?"rgba(255,255,255,.08)":"rgba(255,255,255,.03)",borderRadius:10,padding:"10px 14px",cursor:"pointer",border:`1px solid ${isActive?user.color:timesToday>0?user.color+"55":"transparent"}`,transition:"all .2s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.07)"}
                        onMouseLeave={e=>e.currentTarget.style.background=isActive?"rgba(255,255,255,.08)":"rgba(255,255,255,.03)"}>
                        <div style={{width:24,height:24,borderRadius:7,border:`2px solid ${timesToday>0?user.color:"rgba(255,255,255,.2)"}`,background:timesToday>0?user.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"0.72rem",fontWeight:800,color:"#000"}}>{timesToday>0?timesToday:""}</div>
                        <span style={{flex:1,fontSize:"0.9rem",color:"#f0f0ff"}}>{chore.name}</span>
                        {lastLog?.duration&&<span style={{fontSize:"0.72rem",color:"#7a7a99"}}>⏱ {lastLog.duration}ד'</span>}
                        <span style={{fontSize:"0.72rem",fontWeight:700,background:"rgba(255,255,255,.08)",borderRadius:8,padding:"2px 7px",color:user.color}}>{chore.pts}⭐</span>
                      </div>
                      {isActive&&(
                        <div style={{background:"#16213e",borderRadius:12,padding:"12px 14px",marginTop:4,border:`1px solid ${user.color}`}}>
                          <div style={{fontSize:"0.82rem",color:"#7a7a99",marginBottom:8}}>⏱ כמה זמן לקח לך?</div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                            {[2,5,10,15,20,30].map(m=>(
                              <button key={m} onClick={()=>setSelectedTime(m)} style={{padding:"5px 12px",borderRadius:20,background:selectedTime===m?user.color:"rgba(255,255,255,.06)",border:`1px solid ${selectedTime===m?user.color:"rgba(255,255,255,.1)"}`,color:selectedTime===m?"#000":"#f0f0ff",fontFamily:"'Heebo',sans-serif",fontSize:"0.82rem",cursor:"pointer"}}>{m} דק'</button>
                            ))}
                          </div>
                          <div style={{display:"flex",gap:6,marginBottom:8}}>
                            <input type="number" placeholder="זמן אחר (דקות)" value={customTime} onChange={e=>setCustomTime(e.target.value)} style={{flex:1,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,color:"#f0f0ff",padding:"6px 10px",fontFamily:"'Heebo',sans-serif",fontSize:"0.85rem"}}/>
                            <button onClick={()=>confirm(customTime?parseInt(customTime):selectedTime)} style={{background:user.color,border:"none",borderRadius:8,color:"#000",fontFamily:"'Heebo',sans-serif",fontWeight:700,fontSize:"0.85rem",padding:"7px 16px",cursor:"pointer"}}>אישור ✓</button>
                          </div>
                          <button onClick={()=>confirm(null)} style={{background:"none",border:"1px solid rgba(255,255,255,.1)",borderRadius:20,color:"#7a7a99",fontFamily:"'Heebo',sans-serif",fontSize:"0.8rem",padding:"4px 12px",cursor:"pointer"}}>דלג על זמן</button>
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

      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",margin:"28px 0 14px"}}>📋 היסטוריה אחרונה</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[...ulog].reverse().slice(0,8).map((e,i)=>(
          <div key={i} style={{background:"#1a1a2e",borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,border:"1px solid rgba(255,255,255,.08)",fontSize:"0.9rem"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:user.color,flexShrink:0}}/>
            <div style={{flex:1}}>{e.choreTitle}{e.duration&&<span style={{fontSize:"0.72rem",color:"#7a7a99"}}> ⏱ {e.duration} דקות</span>}</div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
              <span style={{fontWeight:700,color:user.color,fontSize:"0.85rem"}}>+{e.pts}</span>
              <span style={{color:"#7a7a99",fontSize:"0.78rem"}}>{timeAgo(e.ts)}</span>
            </div>
          </div>
        ))}
        {ulog.length===0&&<div style={{textAlign:"center",color:"#7a7a99",padding:"40px 20px"}}><div style={{fontSize:"3rem",marginBottom:12}}>📋</div>עדיין לא בוצעו משימות</div>}
      </div>
    </div>
  );
}

// ─── PARENT PAGE ──────────────────────────────────────────────────────────────
function ParentPage({ user, log, bonus, onAdjustBonus, onSwitchUser, onEditEntry, onDeleteEntry, rewards, onAddReward, onDeleteReward, onRedeemReward }) {
  const kids   = USERS.filter(u=>u.role==="kid");
  const weekLog = getLastDaysLog(log,7);
  const [editingIdx, setEditingIdx] = useState(null);
  const [newReward, setNewReward] = useState({title:"",pts:"",emoji:"🎁"});
  const [addingReward, setAddingReward] = useState(false);
  const REWARD_EMOJIS = ["🎁","🍦","🎮","🎬","🍕","🎠","🚗","✈️","🎪","💰","📱","🏆","🌟","🎯","🎲"];

  return (
    <div style={{padding:"24px 20px 80px",maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:18,paddingBottom:20}}>
        <div style={{width:72,height:72,borderRadius:"50%",background:`${user.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.2rem"}}>{user.emoji}</div>
        <div>
          <h2 style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.8rem",color:user.color}}>{user.name} — הורה 👀</h2>
          <p style={{color:"#7a7a99",fontSize:"0.9rem"}}>ניהול ניקודים וצפייה בביצועים</p>
        </div>
      </div>

      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",marginBottom:14}}>👦 סיכום ילדים</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14,marginBottom:28}}>
        {kids.map(k=>{
          const sc=getUserScore(k.id,log,bonus); const wk=weekLog.filter(e=>e.userId===k.id).length;
          return(
            <div key={k.id} onClick={()=>onSwitchUser(k.id)} style={{background:"#1a1a2e",borderRadius:18,padding:20,border:`1px solid ${k.color}33`,textAlign:"center",cursor:"pointer",transition:"transform .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 8px 30px rgba(0,0,0,.3)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
              <div style={{fontSize:"2.5rem",marginBottom:8}}>{k.emoji}</div>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:k.color}}>{k.name}</div>
              <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"2rem",color:k.color,margin:"4px 0"}}>{sc}</div>
              <div style={{fontSize:"0.78rem",color:"#7a7a99"}}>⭐ נקודות · {wk} השבוע</div>
            </div>
          );
        })}
      </div>

      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",marginBottom:14}}>🎛 נקודות בונוס</div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
        {kids.map(k=>(
          <div key={k.id} style={{background:"#1a1a2e",borderRadius:14,padding:"14px 18px",border:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{fontSize:"1.4rem"}}>{k.emoji}</span>
            <span style={{fontWeight:600,color:k.color,flex:1,minWidth:60}}>{k.name}</span>
            {[-10,-5,-1].map(n=>(
              <button key={n} onClick={()=>onAdjustBonus(k.id,n)} style={{width:36,height:36,borderRadius:"50%",border:"none",background:"rgba(255,100,100,.15)",color:"#FF6B6B",fontSize:"0.82rem",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:700}}>{n}</button>
            ))}
            <span style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.3rem",color:k.color,minWidth:44,textAlign:"center"}}>{bonus[k.id]||0}</span>
            {[1,5,10].map(n=>(
              <button key={n} onClick={()=>onAdjustBonus(k.id,n)} style={{width:36,height:36,borderRadius:"50%",border:"none",background:"rgba(100,255,200,.15)",color:"#4ECDC4",fontSize:"0.82rem",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontWeight:700}}>+{n}</button>
            ))}
          </div>
        ))}
      </div>

      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",marginBottom:14}}>🌟 תמונות קריירה — לפי ניקוד</div>
      {kids.map(k=>{
        const sc=getUserScore(k.id,log,bonus);
        return(
          <div key={k.id} style={{marginBottom:24}}>
            <div style={{fontWeight:700,color:k.color,marginBottom:10}}>{k.emoji} {k.name} · {sc} נקודות</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:12}}>
              {CAREERS.map(c=>{const unlocked=sc>=c.pts;return(
                <div key={c.pts} style={{background:"#1a1a2e",borderRadius:16,padding:"16px 12px",textAlign:"center",border:`2px solid ${unlocked?k.color:"rgba(255,255,255,.08)"}`,opacity:unlocked?1:.4,transition:"all .2s"}}>
                  <div style={{fontSize:"2.5rem"}}>{c.icon}</div>
                  <div style={{fontSize:"0.75rem",fontWeight:700,marginTop:6}}>{c.title}</div>
                  <div style={{fontSize:"0.68rem",color:"#7a7a99"}}>{c.pts===0?"התחלה":c.pts+" נק'"} {unlocked?"✅":""}</div>
                </div>
              );})}
            </div>
          </div>
        );
      })}

      {/* ── REWARDS MANAGEMENT ── */}
      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",marginBottom:14}}>🎁 ניהול פרסים</div>

      {/* Existing rewards */}
      {(rewards||[]).length>0&&(
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
          {(rewards||[]).map(r=>{
            const totalRedeemed=(r.redeemedBy||[]).length;
            return(
              <div key={r.id} style={{background:"#1a1a2e",borderRadius:14,padding:"12px 16px",border:"1px solid rgba(255,255,255,.08)",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <span style={{fontSize:"1.6rem"}}>{r.emoji||"🎁"}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700}}>{r.title}</div>
                  <div style={{fontSize:"0.78rem",color:"#7a7a99"}}>{r.pts} נקודות · מומש {totalRedeemed} פעמים</div>
                  {(r.redeemedBy||[]).length>0&&(
                    <div style={{fontSize:"0.72rem",color:"#4ECDC4",marginTop:2}}>
                      {[...r.redeemedBy].reverse().slice(0,3).map((x,i)=>{
                        const u=USERS.find(u=>u.id===x.uid);
                        return <span key={i} style={{marginLeft:8}}>{u?.emoji} {u?.name} · {timeAgo(x.ts)}</span>;
                      })}
                    </div>
                  )}
                </div>
                {/* Manual redeem per kid */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {kids.map(k=>{
                    const sc=getUserScore(k.id,log,bonus);
                    const canRedeem=sc>=r.pts;
                    return(
                      <button key={k.id} onClick={()=>canRedeem&&onRedeemReward(r.id,k.id)} title={canRedeem?`מימוש עבור ${k.name}`:`${k.name} חסר ${r.pts-sc} נק'`} style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${canRedeem?k.color:"rgba(255,255,255,.1)"}`,background:"transparent",fontSize:"1rem",cursor:canRedeem?"pointer":"default",opacity:canRedeem?1:0.4}}>{k.emoji}</button>
                    );
                  })}
                </div>
                <button onClick={()=>onDeleteReward(r.id)} style={{background:"rgba(255,80,80,.12)",border:"1px solid rgba(255,80,80,.2)",borderRadius:8,color:"#FF6B6B",padding:"5px 10px",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:"0.8rem"}}>🗑️</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new reward */}
      {!addingReward?(
        <button onClick={()=>setAddingReward(true)} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.04)",border:"1px dashed rgba(255,255,255,.15)",borderRadius:14,padding:"12px 18px",cursor:"pointer",color:"#7a7a99",fontFamily:"'Heebo',sans-serif",fontSize:"0.9rem",width:"100%",marginBottom:28}}>
          ＋ הוסף פרס חדש
        </button>
      ):(
        <div style={{background:"#1a1a2e",borderRadius:14,padding:16,border:`1px solid ${user.color}`,marginBottom:28}}>
          <div style={{fontWeight:700,marginBottom:12,color:user.color}}>פרס חדש</div>
          {/* Emoji picker */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
            {REWARD_EMOJIS.map(e=>(
              <button key={e} onClick={()=>setNewReward(p=>({...p,emoji:e}))} style={{width:36,height:36,borderRadius:8,border:`2px solid ${newReward.emoji===e?user.color:"rgba(255,255,255,.1)"}`,background:newReward.emoji===e?user.color+"22":"transparent",fontSize:"1.2rem",cursor:"pointer"}}>{e}</button>
            ))}
          </div>
          <input
            placeholder="שם הפרס (למשל: גלידה, זמן מסך, כסף...)"
            value={newReward.title}
            onChange={e=>setNewReward(p=>({...p,title:e.target.value}))}
            style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,color:"#f0f0ff",padding:"10px 12px",fontFamily:"'Heebo',sans-serif",fontSize:"0.9rem",marginBottom:10,direction:"rtl"}}
          />
          <input
            type="number"
            placeholder="כמה נקודות צריך?"
            value={newReward.pts}
            onChange={e=>setNewReward(p=>({...p,pts:e.target.value}))}
            style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:10,color:"#f0f0ff",padding:"10px 12px",fontFamily:"'Heebo',sans-serif",fontSize:"0.9rem",marginBottom:12,direction:"rtl"}}
          />
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{
              if(!newReward.title||!newReward.pts) return;
              onAddReward({title:newReward.title,pts:parseInt(newReward.pts),emoji:newReward.emoji});
              setNewReward({title:"",pts:"",emoji:"🎁"});
              setAddingReward(false);
            }} style={{flex:1,background:user.color,border:"none",borderRadius:10,color:"#000",fontFamily:"'Heebo',sans-serif",fontWeight:700,fontSize:"0.9rem",padding:"10px",cursor:"pointer"}}>
              ✓ שמור פרס
            </button>
            <button onClick={()=>setAddingReward(false)} style={{background:"rgba(255,255,255,.06)",border:"none",borderRadius:10,color:"#7a7a99",fontFamily:"'Heebo',sans-serif",fontSize:"0.9rem",padding:"10px 16px",cursor:"pointer"}}>
              ביטול
            </button>
          </div>
        </div>
      )}

      <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:"#7a7a99",marginBottom:14}}>📋 כל הפעילות — עריכה</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[...log].map((e,origIdx)=>({...e,origIdx})).reverse().map(({origIdx,...e})=>{
          const u=USERS.find(u=>u.id===e.userId);
          const isEditing=editingIdx===origIdx;
          return(
            <div key={origIdx} style={{background:"#1a1a2e",borderRadius:14,padding:"12px 16px",border:`1px solid ${isEditing?user.color:"rgba(255,255,255,.08)"}`,fontSize:"0.9rem"}}>
              {/* Row */}
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:u?.color,flexShrink:0}}/>
                <span style={{fontSize:"1.1rem"}}>{u?.emoji}</span>
                <div style={{flex:1}}>
                  <span style={{fontWeight:600,color:u?.color}}>{u?.name}</span>
                  <span style={{color:"#7a7a99"}}> · </span>
                  <span>{e.choreTitle}</span>
                  {e.duration&&<span style={{fontSize:"0.75rem",color:"#7a7a99"}}> ⏱ {e.duration}ד'</span>}
                  <div style={{fontSize:"0.72rem",color:"#555",marginTop:2}}>{timeAgo(e.ts)}</div>
                </div>
                <div style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:u?.color}}>+{e.pts}</div>
                <button onClick={()=>setEditingIdx(isEditing?null:origIdx)} style={{background:isEditing?"rgba(255,100,100,.15)":"rgba(255,255,255,.06)",border:"none",borderRadius:8,color:isEditing?"#FF6B6B":"#7a7a99",padding:"5px 10px",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:"0.8rem"}}>
                  {isEditing?"✕ סגור":"✏️ עריכה"}
                </button>
              </div>
              {/* Edit panel */}
              {isEditing&&(
                <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",flexDirection:"column",gap:10}}>
                  {/* Change points */}
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:"0.82rem",color:"#7a7a99",minWidth:80}}>נקודות:</span>
                    {[-5,-2,-1,1,2,5].map(n=>(
                      <button key={n} onClick={()=>onEditEntry(origIdx,"pts",e.pts+n)} style={{padding:"4px 10px",borderRadius:8,border:"none",background:n>0?"rgba(100,255,200,.12)":"rgba(255,100,100,.12)",color:n>0?"#4ECDC4":"#FF6B6B",fontFamily:"'Heebo',sans-serif",fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>{n>0?"+":""}{n}</button>
                    ))}
                    <span style={{fontFamily:"'Fredoka One',cursive",fontSize:"1.2rem",color:u?.color,marginRight:"auto"}}>{e.pts}</span>
                  </div>
                  {/* Change duration */}
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:"0.82rem",color:"#7a7a99",minWidth:80}}>זמן (דק'):</span>
                    {[2,5,10,15,20,30].map(m=>(
                      <button key={m} onClick={()=>onEditEntry(origIdx,"duration",m)} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${e.duration===m?u?.color:"rgba(255,255,255,.1)"}`,background:e.duration===m?u?.color+"22":"transparent",color:e.duration===m?u?.color:"#7a7a99",fontFamily:"'Heebo',sans-serif",fontSize:"0.78rem",cursor:"pointer"}}>{m}</button>
                    ))}
                    <button onClick={()=>onEditEntry(origIdx,"duration",null)} style={{padding:"4px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"#555",fontFamily:"'Heebo',sans-serif",fontSize:"0.78rem",cursor:"pointer"}}>ללא</button>
                  </div>
                  {/* Delete */}
                  <button onClick={()=>{onDeleteEntry(origIdx);setEditingIdx(null);}} style={{alignSelf:"flex-start",background:"rgba(255,80,80,.12)",border:"1px solid rgba(255,80,80,.2)",borderRadius:8,color:"#FF6B6B",padding:"6px 14px",cursor:"pointer",fontFamily:"'Heebo',sans-serif",fontSize:"0.82rem",fontWeight:700}}>🗑️ מחק רשומה זו</button>
                </div>
              )}
            </div>
          );
        })}
        {log.length===0&&<div style={{textAlign:"center",color:"#7a7a99",padding:40}}>עדיין אין פעילות</div>}
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
  const [rewards,     setRewards]     = useState([]); // [{id,title,pts,emoji,redeemedBy:[{uid,ts}]}]
  const [toast,       setToast]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [pinTarget,   setPinTarget]   = useState(null);
  const { canvasRef, pop }            = useConfetti();
  const toastTimer  = useRef(null);
  const saveTimer   = useRef(null);
  const stateRef    = useRef({log:[], bonus:{ido:0,yotam:0,itai:0}, rewards:[]});

  // ── Initial load ──
  useEffect(()=>{
    loadData()
      .then(data=>{
        if(data){
          setLog(data.log||[]);
          setBonus(data.bonus||{ido:0,yotam:0,itai:0});
          setRewards(data.rewards||[]);
          stateRef.current = data;
        }
      })
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[]);

  // ── Poll every 8s so other devices see updates ──
  useEffect(()=>{
    const stop = subscribeToRealtime(data=>{
      // Only update if data actually changed (compare log length as quick check)
      if(data.log?.length !== stateRef.current.log?.length ||
         JSON.stringify(data.bonus) !== JSON.stringify(stateRef.current.bonus)){
        setLog(data.log||[]);
        setBonus(data.bonus||{ido:0,yotam:0,itai:0});
        setRewards(data.rewards||[]);
        stateRef.current = data;
      }
    });
    return stop;
  },[]);

  // ── Debounced save ──
  const persist = useCallback((nextLog, nextBonus, nextRewards)=>{
    const r = nextRewards !== undefined ? nextRewards : stateRef.current.rewards||[];
    stateRef.current = {log:nextLog, bonus:nextBonus, rewards:r};
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async ()=>{
      try { await saveData({log:nextLog,bonus:nextBonus,rewards:r}); }
      catch(e){ console.error("Save error",e); }
      finally { setSaving(false); }
    }, 600);
  },[]);

  const showToast = msg=>{
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=>setToast(""),2800);
  };

  const switchUser = uid=>{
    const user=USERS.find(u=>u.id===uid);
    if(user?.role==="parent"){setPinTarget(user);return;}
    setCurrentUser(uid);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const handlePinSuccess = ()=>{
    setCurrentUser(pinTarget.id);
    setPinTarget(null);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const handleLogChore = (uid, choreId, catId, duration)=>{
    const chore=CHORE_CATEGORIES.flatMap(c=>c.chores).find(c=>c.id===choreId);
    if(!chore) return;
    const entry={userId:uid,choreId,catId,choreTitle:chore.name,pts:chore.pts,duration:duration||null,ts:Date.now()};
    setLog(prev=>{
      const next=[...prev,entry];
      persist(next, stateRef.current.bonus);
      return next;
    });
    showToast(`✅ ${chore.name} · +${chore.pts} נקודות!`);
    pop();
  };

  const handleAdjustBonus = (uid, amount)=>{
    setBonus(prev=>{
      const next={...prev,[uid]:(prev[uid]||0)+amount};
      persist(stateRef.current.log, next);
      return next;
    });
    showToast(`${amount>0?"+":""}${amount} נקודות ל${USERS.find(u=>u.id===uid)?.name}`);
  };

  const handleEditEntry = (idx, field, value)=>{
    setLog(prev=>{
      const next = prev.map((e,i)=> i===idx ? {...e,[field]:value} : e);
      persist(next, stateRef.current.bonus);
      return next;
    });
    showToast(`✏️ רשומה עודכנה`);
  };

  const handleDeleteEntry = (idx)=>{
    setLog(prev=>{
      const next = prev.filter((_,i)=> i!==idx);
      persist(next, stateRef.current.bonus);
      return next;
    });
    showToast(`🗑️ רשומה נמחקה`);
  };

  const handleAddReward = (reward)=>{
    const next = [...stateRef.current.rewards||[], {...reward, id: Date.now().toString(), redeemedBy:[]}];
    setRewards(next);
    persist(stateRef.current.log, stateRef.current.bonus, next);
    showToast(`🎁 פרס "${reward.title}" נוסף!`);
  };
  const handleDeleteReward = (rid)=>{
    const next = (stateRef.current.rewards||[]).filter(r=>r.id!==rid);
    setRewards(next);
    persist(stateRef.current.log, stateRef.current.bonus, next);
    showToast(`🗑️ פרס נמחק`);
  };
  const handleRedeemReward = (rid, uid)=>{
    const next = (stateRef.current.rewards||[]).map(r=>
      r.id===rid ? {...r, redeemedBy:[...(r.redeemedBy||[]), {uid, ts:Date.now()}]} : r
    );
    setRewards(next);
    persist(stateRef.current.log, stateRef.current.bonus, next);
    const reward = next.find(r=>r.id===rid);
    const kid = USERS.find(u=>u.id===uid);
    showToast(`🎉 ${kid?.name} מימש: ${reward?.title}!`);
    pop();
  };

  const user = USERS.find(u=>u.id===currentUser);

  if(loading) return(
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f0f1a",color:"#7a7a99",fontFamily:"'Heebo',sans-serif",flexDirection:"column",gap:16}}>
      <div style={{fontSize:"3rem",animation:"spin 1s linear infinite"}}>⭐</div>
      <div>טוען נתונים...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{background:"#0f0f1a",minHeight:"100vh",color:"#f0f0ff",fontFamily:"'Heebo',sans-serif",direction:"rtl"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0;}
        input:focus,button{outline:none;}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:3px;}
      `}</style>

      <SyncDot saving={saving}/>

      {/* NAV */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:"rgba(15,15,26,.95)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,.08)",padding:"0 20px",display:"flex",alignItems:"center",overflowX:"auto",scrollbarWidth:"none"}}>
        {[{id:"dash",label:"🏠 דשבורד",color:"#fff"},...USERS.map(u=>({id:u.id,label:`${u.emoji} ${u.name}`,color:u.color}))].map(tab=>(
          <button key={tab.id} onClick={()=>switchUser(tab.id)} style={{flexShrink:0,padding:"14px 16px",background:"none",border:"none",borderBottom:`3px solid ${currentUser===tab.id?tab.color:"transparent"}`,color:currentUser===tab.id?tab.color:"#7a7a99",fontFamily:"'Heebo',sans-serif",fontSize:"0.88rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",transition:"all .2s"}}>
            {tab.label}
          </button>
        ))}
      </nav>

      {currentUser==="dash"  && <Dashboard log={log} bonus={bonus} onSwitchUser={switchUser}/>}
      {user?.role==="kid"    && <KidPage   user={user} log={log} onLogChore={handleLogChore} rewards={rewards} onRedeemReward={handleRedeemReward}/>}
      {user?.role==="parent" && <ParentPage user={user} log={log} bonus={bonus} onAdjustBonus={handleAdjustBonus} onSwitchUser={switchUser} onEditEntry={handleEditEntry} onDeleteEntry={handleDeleteEntry} rewards={rewards} onAddReward={handleAddReward} onDeleteReward={handleDeleteReward} onRedeemReward={handleRedeemReward}/>}

      {pinTarget && <PinModal user={pinTarget} onSuccess={handlePinSuccess} onCancel={()=>setPinTarget(null)}/>}
      <Toast msg={toast}/>
      <canvas ref={canvasRef} style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:998}}/>
    </div>
  );
}
