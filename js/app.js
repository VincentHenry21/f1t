/* ============ F1T · app ============ */
(function(){
"use strict";
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
/* storage that never throws (private mode, opaque origins) */
const store = {
  get(k){ try{ return window.localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ window.localStorage.setItem(k,v); }catch(e){} },
  del(k){ try{ window.localStorage.removeItem(k); }catch(e){} }
};
const I = () => window.F1T_I18N[S.lang] || window.F1T_I18N.en;
const t = (k,p) => { let s = (I()[k] !== undefined ? I()[k] : (window.F1T_I18N.en[k] || k));
  if(p) for(const key in p) s = String(s).split("{"+key+"}").join(p[key]); return s; };
const ic = (n,s) => window.f1tIcon(n, s || 20);

const S = {
  lang: store.get("f1t_lang") || "en",
  theme: store.get("f1t_theme") || "dark",
  profile: null, day: null, dateKey: window.F1T_todayKey(),
  user: null, guest: store.get("f1t_guest")==="1",
  view: "splash", obStep: 0, ob: {},
  homeWeek: 0, statsWeek: 0,
};
function applyTheme(){
  document.documentElement.dataset.theme = S.theme === "dark" ? "dark" : "light";
  try{ store.set("f1t_theme", S.theme); }catch(e){}
}

/* ---------- helpers ---------- */
function yangonNow(){ return new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Yangon"})); }
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.remove("hidden");
  clearTimeout(el._t); el._t=setTimeout(()=>el.classList.add("hidden"),2200); }
function show(view){
  S.view=view;
  $$(".view").forEach(v=>{ v.classList.remove("active"); v.classList.remove("enter"); clearTimeout(v._enterT); });
  const vv=$("#view-"+view);
  vv.classList.add("active");
  /* entrance stagger plays once per tab switch, never on re-renders */
  vv.classList.add("enter");
  vv._enterT=setTimeout(()=>vv.classList.remove("enter"),700);
  $("#tabbar").classList.toggle("hidden", !["home","coach","stats","rewards","profile","settings"].includes(view));
  $$("#tabbar .tab[data-goto]").forEach(b=>b.classList.toggle("on", b.dataset.goto===view));
  moveBubble();
  window.scrollTo(0,0);
  if(view==="home") renderHome();
  if(view==="coach") renderCoach();
  if(view==="stats") renderStats();
  if(view==="settings") renderSettings();
  if(view==="rewards") renderRewards();
  if(view==="profile") renderProfile();
  initTilt($("#view-"+view));
}
function applyI18n(){
  document.documentElement.lang = S.lang==="my"?"my":"en";
  $$("[data-i18n]").forEach(el=>{ el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-ph]").forEach(el=>{ el.placeholder = t(el.dataset.i18nPh); });
  $("#auth-lang").textContent = S.lang==="en" ? "မြန်မာ" : "English";
  if(typeof sheetTitleKey!=="undefined" && !$("#sheet").classList.contains("hidden"))
    $("#sheet-title").textContent=t(sheetTitleKey);
  if(["home","stats","rewards","profile"].includes(S.view)) show(S.view);
}
function fmt(n){ return n.toLocaleString("en-US"); }

/* ---------- profile / day ---------- */
async function loadAll(){
  S.profile = window.F1TFB.loadProfile();
  if(!store.get("f1t_lang") && S.profile && S.profile.lang){ S.lang=S.profile.lang; }
  const remote = await window.F1TFB.pullProfile();
  if(remote && !S.profile){ S.profile = remote; await window.F1TFB.saveProfile(remote); }
  S.day = window.F1TFB.loadDay(S.dateKey);
  const rday = await window.F1TFB.pullDay(S.dateKey);
  if(rday && (!S.day || !S.day.kcal)){ S.day = Object.assign(window.F1TFB.blankDay(), rday); }
}
function saveDay(){ window.F1TFB.saveDay(S.dateKey, S.day); }
/* realtime subscriptions */
let unsubDay=null, unsubProfile=null;
function stopLive(){ try{ if(unsubDay)unsubDay(); }catch(e){} try{ if(unsubProfile)unsubProfile(); }catch(e){} unsubDay=unsubProfile=null; }
function resubDay(){
  try{ if(unsubDay)unsubDay(); }catch(e){} unsubDay=null;
  if(S.guest || !window.F1TFB.ready) return;
  unsubDay=window.F1TFB.subDay(S.dateKey, d=>{
    S.day=Object.assign(window.F1TFB.blankDay(), d);
    if(["home","stats"].includes(S.view)) show(S.view);
  });
}
function subscribeLive(){
  stopLive();
  if(S.guest || !window.F1TFB.ready) return;
  unsubProfile=window.F1TFB.subProfile(p=>{ S.profile=Object.assign({},S.profile,p);
    if(S.view==="profile") renderProfile(); });
  resubDay();
}
function dayKeys(n){ // last n date keys ending today, oldest first
  const out=[]; const now=yangonNow();
  for(let i=n-1;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i); out.push(window.F1T_todayKey(d)); }
  return out;
}
function streak(){
  let s=0; const now=yangonNow();
  for(let i=0;i<60;i++){ const d=new Date(now); d.setDate(d.getDate()-i);
    const k=window.F1T_todayKey(d);
    const day = k===S.dateKey ? S.day : window.F1TFB.loadDay(k);
    if(day && day.kcal>0) s++; else break;
  }
  try{ /* premium streak-restore bonus */
    const b=JSON.parse(localStorage.getItem("f1t_streak_bonus")||"null");
    if(b&&Date.now()<b.until) s+=b.days;
  }catch(e){}
  return s;
}

/* ---------- auth ---------- */
let authMode="login";
function initAuth(){
  $$(".auth-tab").forEach(b=>b.onclick=()=>{
    authMode=b.dataset.mode;
    $$(".auth-tab").forEach(x=>x.classList.toggle("active",x===b));
    $("#auth-name-row").classList.toggle("hidden", authMode==="login");
    $("#auth-go").textContent = t(authMode);
  });
  $("#auth-lang").onclick=()=>{ S.lang = S.lang==="en"?"my":"en"; store.set("f1t_lang",S.lang); applyI18n(); };
  $("#auth-go").onclick=doAuth;
  $("#auth-google").onclick=async()=>{
    $("#auth-err").classList.add("hidden");
    try{ await window.F1TFB.google(); /* redirects to Google, returns via boot() */ }
    catch(e){ authErr(googleErrMsg(e)); }
  };
  $("#auth-guest").onclick=()=>{ S.guest=true; store.set("f1t_guest","1"); enter(); };
}
function authErr(m){ const e=$("#auth-err"); e.textContent=m; e.classList.remove("hidden"); }
function googleErrMsg(e){
  const c=(e&&e.code)||"";
  if(c==="auth/unauthorized-domain") return t("errDomain");
  if(c==="auth/operation-not-allowed") return t("errGoogleOff");
  if(c==="auth/network-request-failed") return t("errNetwork");
  if(c==="auth/popup-blocked"||c==="auth/popup-closed-by-user") return t("authFail");
  return t("authFail");
}
async function doAuth(){
  const em=$("#auth-email").value.trim(), pw=$("#auth-pass").value;
  if(!em||!pw){ authErr(t("needEmailPass")); return; }
  $("#auth-err").classList.add("hidden");
  try{
    let u;
    if(authMode==="signup"){ u=await window.F1TFB.signUp(em,pw,$("#auth-name").value.trim()); }
    else{ u=await window.F1TFB.signIn(em,pw); }
    afterLogin(u);
  }catch(e){ authErr(t("authFail")); }
}
async function afterLogin(u){
  S.user=u; S.guest=false; store.del("f1t_guest");
  await loadAll();
  try{ await window.F1TFB.pushLocalToCloud(); }catch(e){}
  enter();
}
async function enter(){
  if(!S.day){ await loadAll(); }
  await loadHealth(); subscribeLive();
  if(!S.profile){ startOnboarding(); }
  else show("home");
}

/* ---------- onboarding ---------- */
function startOnboarding(){ S.obStep=0; S.ob={}; show("onboarding"); renderOb(); }
function renderOb(){
  const dots=$$(".ob-steps span"); dots.forEach((d,i)=>d.classList.toggle("on",i<=S.obStep));
  const b=$("#ob-body"); const o=S.ob;
  if(S.obStep===0){
    b.innerHTML=`<div class="glass-card ob-card"><h2>${t("ob1t")}</h2><p>${t("ob1p")}</p>
      <div class="field"><label>${t("name")}</label><input id="ob-name" value="${o.name||""}" placeholder="${t("namePh")}"></div>
      <div class="ob-nav"><button class="btn-lime" id="ob-next">${t("next")}</button></div></div>`;
    $("#ob-next").onclick=()=>{ o.name=$("#ob-name").value.trim()||t("guest"); S.obStep=1; renderOb(); };
  }else if(S.obStep===1){
    b.innerHTML=`<div class="glass-card ob-card"><h2>${t("ob2t")}</h2><p>${t("ob2p")}</p>
      <div class="field"><label>${t("age")}</label><input id="ob-age" type="number" inputmode="numeric" value="${o.age||""}" placeholder="18"></div>
      <div class="field"><label>${t("sex")}</label><div class="seg" id="ob-sex">
        <button data-v="male" class="${o.sex==="male"?"on":""}">${t("male")}</button>
        <button data-v="female" class="${(!o.sex||o.sex==="female")?"on":""}">${t("female")}</button></div></div>
      <div class="field"><label>${t("height")}</label><input id="ob-h" type="number" inputmode="numeric" value="${o.h||""}" placeholder="170"></div>
      <div class="field"><label>${t("weightNow")}</label><input id="ob-w" type="number" inputmode="numeric" value="${o.w||""}" placeholder="65"></div>
      <div class="ob-nav"><button class="btn-back" id="ob-back">${t("back")}</button><button class="btn-lime" id="ob-next">${t("next")}</button></div></div>`;
    $("#ob-sex").onclick=e=>{ if(e.target.dataset.v){ o.sex=e.target.dataset.v;
      $$("#ob-sex button").forEach(x=>x.classList.toggle("on",x===e.target)); } };
    $("#ob-back").onclick=()=>{ S.obStep=0; renderOb(); };
    $("#ob-next").onclick=()=>{ o.age=+$("#ob-age").value||18; o.h=+$("#ob-h").value||170; o.w=+$("#ob-w").value||65;
      o.sex=o.sex||"female"; S.obStep=2; renderOb(); };
  }else{
    const goals=[["lose","target",t("lose"),t("loseS")],["maintain","scale",t("maintain"),t("maintainS")],["gain","dumbbell",t("gain"),t("gainS")]];
    b.innerHTML=`<div class="glass-card ob-card"><h2>${t("ob3t")}</h2><p>${t("ob3p")}</p>
      ${goals.map(g=>`<button class="goal-opt ${o.goal===g[0]?"on":""}" data-v="${g[0]}"><span class="g-ico">${ic(g[1],26)}</span><span><b>${g[2]}</b><small>${g[3]}</small></span></button>`).join("")}
      <div class="field" style="margin-top:14px"><label>${t("active")}</label><div class="seg" id="ob-act">
        <button data-v="1" class="${o.active?"on":""}">${t("yesActive")}</button>
        <button data-v="0" class="${!o.active?"on":""}">${t("noActive")}</button></div></div>
      <div class="glass-card" style="padding:16px;text-align:center;margin-bottom:6px">
        <div style="font-size:12px;font-weight:700;color:var(--ink2)">${t("yourTarget")}</div>
        <div style="font-size:38px;font-weight:800" id="ob-target">--</div>
        <div style="font-size:12px;font-weight:700;color:var(--ink2)">${t("kcal")} / ${t("days")}</div>
      </div>
      <div class="accept-row"><input type="checkbox" id="ob-accept">
        <span>${t("acceptRules")} <button type="button" id="ob-rules">${t("rulesTitle")}</button></span></div>
      <div class="ob-nav"><button class="btn-back" id="ob-back">${t("back")}</button><button class="btn-lime" id="ob-done">${t("letsGo")}</button></div></div>`;
    const upd=()=>{ o.target=window.F1T_calcTarget(o.sex,o.age,o.h,o.w,o.goal||"maintain",!!o.active);
      $("#ob-target").textContent=fmt(o.target); };
    b.onclick=e=>{
      const g=e.target.closest(".goal-opt"); if(g){ o.goal=g.dataset.v;
        $$(".goal-opt").forEach(x=>x.classList.toggle("on",x===g)); upd(); }
      const a=e.target.closest("#ob-act button"); if(a){ o.active=a.dataset.v==="1";
        $$("#ob-act button").forEach(x=>x.classList.toggle("on",x===a)); upd(); }
    };
    o.goal=o.goal||"maintain"; upd();
    $("#ob-back").onclick=()=>{ S.obStep=1; renderOb(); };
    $("#ob-rules").onclick=e=>{ e.stopPropagation(); openRules(); };
    $("#ob-done").onclick=async()=>{
      if(!$("#ob-accept").checked){ toast(t("mustAccept")); return; }
      S.profile={name:o.name,age:o.age,sex:o.sex,h:o.h,w:o.w,goal:o.goal,active:!!o.active,targetKcal:o.target,lang:S.lang,created:Date.now(),policyAccepted:Date.now()};
      await window.F1TFB.saveProfile(S.profile);
      toast(t("targetUpdated")); show("home");
    };
  }
}

/* ---------- APPLE HEALTH ---------- */
function renderHealthCard(){
  if(!S.user) return "";
  const h=S.health;
  if(!h){
    return `<div class="glass-card health-card"><div class="h-top"><span class="h-ico">${ic("health",20)}</span><b>Apple Health</b></div>
      <div class="h-setup">${t("healthSetup")}</div></div>`;
  }
  const km=(h.distanceM/1000).toFixed(1);
  return `<div class="glass-card health-card"><div class="h-top"><span class="h-ico">${ic("health",20)}</span><b>Apple Health</b>
      <span class="h-sync">${ic("sync",12)} ${h.syncedAt||""}</span></div>
    <div class="h-row">
      <div><b>${fmt(h.steps||0)}</b><small>${t("steps")}</small></div>
      <div><b>${Math.round(h.activeKcal||0)}</b><small>${t("kcal")}</small></div>
      <div><b>${km}</b><small>km</small></div>
    </div>
    ${h.steps&&!S.day.steps?`<button class="btn-glass full" id="use-health-steps">${t("useHealthSteps")}</button>`:""}
  </div>`;
}
async function loadHealth(){
  S.health=null;
  if(!S.user || !window.F1TFB.ready) return;
  try{
    const doc=await window.F1TFB.pullHealth(S.dateKey);
    if(doc&&doc.steps!=null){
      S.health={steps:Math.round(doc.steps),activeKcal:doc.activeKcal||0,distanceM:doc.distanceM||0,
        syncedAt:doc.updatedAt||""};
    }
  }catch(e){}
}

/* ---------- notifications ---------- */
function notifItems(){
  const items=[]; const d=S.day||{}, p=S.profile||{};
  let st=0; try{ st=streak(); }catch(e){}
  if(!(d.kcal>0)) items.push({icon:"utensils",tone:"warn",title:t("ntLogTitle"),body:t("ntLogBody")});
  else if(st>=2) items.push({icon:"flame",tone:"good",title:t("ntStreakTitle",{n:st}),body:t("ntStreakBody")});
  try{
    const an=window.F1T_ANALYSIS.dayInsights(d,p);
    an.filter(x=>x.tone==="warn"||x.tone==="bad").slice(0,2).forEach(x=>items.push({icon:"activity",tone:x.tone,title:x.title,body:x.body}));
  }catch(e){}
  try{
    const won=badges().filter(b=>b.won).length, seen=+store.get("f1t_badges_seen")||0;
    if(won>seen) items.push({icon:"trophy",tone:"good",title:t("ntBadgeTitle"),body:t("ntBadgeBody",{n:won-seen})});
  }catch(e){}
  try{ items.push({icon:"zap",tone:"info",title:t("tipTitle"),body:t("tip"+window.F1T_ANALYSIS.tipOfDay(S.dateKey))}); }catch(e){}
  try{ (S._envRem||[]).forEach(r=>items.push({icon:r.icon,tone:"info",title:t("env_title"),body:t(r.key)})); }catch(e){}
  return items;
}
function notifSig(items){ return S.dateKey+":"+items.map(i=>i.title).join("|"); }
function refreshBell(){
  const items=notifItems(); const dot=$("#home-bell .dot"); if(!dot) return;
  dot.style.display = (items.length && store.get("f1t_notif_read")!==notifSig(items)) ? "block" : "none";
}
function openNotif(){
  const items=notifItems(); const sig=notifSig(items);
  const toneIcon={good:"check",warn:"bell",info:"zap",bad:"x"};
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t("notifications")}</h2>
    ${items.length?`<div class="insights">`+items.map(n=>`
      <div class="glass-card insight ${n.tone}"><span class="i-ico">${ic(toneIcon[n.tone]||"bell",18)}</span>
      <div><b>${n.title}</b><p>${n.body}</p></div></div>`).join("")+`</div>`
    :`<div class="empty-note">${t("notifEmpty")}</div>`}
    <button class="btn-lime" id="nt-ok">${t("done")}</button></div></div>`;
  try{ store.set("f1t_badges_seen",String(badges().filter(b=>b.won).length)); }catch(e){}
  store.set("f1t_notif_read",sig);
  $("#nt-ok").onclick=()=>{ closeModal(); refreshBell(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback"){ closeModal(); refreshBell(); } };
}

/* ---------- date switching ---------- */
async function switchDate(key){
  S.dateKey=key; S.homeWeek=0;
  S.day=window.F1TFB.loadDay(key);
  try{ const r=await window.F1TFB.pullDay(key); if(r&&(!S.day||!S.day.kcal)) S.day=Object.assign(window.F1TFB.blankDay(),r); }catch(e){}
  if(!S.day) S.day=window.F1TFB.blankDay();
  refreshBell(); resubDay(); show(S.view);
}
function weekKeys(offset){ // 7 keys ending (today - 7*offset), oldest first
  const out=[]; const now=yangonNow();
  for(let i=6;i>=0;i--){ const d=new Date(now); d.setDate(d.getDate()-i-(offset||0)*7); out.push(window.F1T_todayKey(d)); }
  return out;
}
let pickYM=null;
function openDatePicker(){
  const now=yangonNow(); pickYM=[now.getFullYear(),now.getMonth()]; drawPicker();
}
function drawPicker(){
  const y=pickYM[0], m=pickYM[1];
  const months=[t("jan"),t("feb"),t("mar"),t("apr"),t("may"),t("jun"),t("jul"),t("aug"),t("sep"),t("oct"),t("nov"),t("dec")];
  const dows=[t("mon"),t("tue"),t("wed"),t("thu"),t("fri"),t("sat"),t("sun")];
  const startDow=(new Date(y,m,1).getDay()+6)%7, dim=new Date(y,m+1,0).getDate();
  const todayK=window.F1T_todayKey();
  let cells="";
  for(let i=0;i<startDow;i++) cells+=`<span class="pk-empty"></span>`;
  for(let d=1;d<=dim;d++){ const k=window.F1T_todayKey(new Date(y,m,d));
    cells+=`<button class="pk-day ${k===S.dateKey?"sel":""} ${k===todayK?"today":""}" data-k="${k}">${d}</button>`; }
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <div class="pk-head"><button id="pk-prev">‹</button><b>${months[m]} ${y}</b><button id="pk-next">›</button></div>
    <div class="pk-grid">${dows.map(d=>`<span class="pk-dow">${d}</span>`).join("")}${cells}</div>
    <button class="btn-lime" id="pk-today">${t("today")}</button></div></div>`;
  $("#pk-prev").onclick=()=>{ let mm=m-1,yy=y; if(mm<0){mm=11;yy--;} pickYM=[yy,mm]; drawPicker(); };
  $("#pk-next").onclick=()=>{ let mm=m+1,yy=y; if(mm>11){mm=0;yy++;} pickYM=[yy,mm]; drawPicker(); };
  $("#pk-today").onclick=()=>{ closeModal(); switchDate(window.F1T_todayKey()); };
  $$("#modal-root .pk-day").forEach(b=>b.onclick=()=>{ closeModal(); switchDate(b.dataset.k); });
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openWeekPick(){
  const opts=[[0,t("week")],[1,t("lastWeek")],[2,t("twoWeeksAgo")]];
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t("weekView")}</h2>
    <div class="wk-list">${opts.map(o=>`
      <button class="goal-opt ${S.statsWeek===o[0]?"on":""}" data-w="${o[0]}">
        <span class="g-ico">${ic("calendar",22)}</span><span><b>${o[1]}</b></span></button>`).join("")}</div>
    </div></div>`;
  $$("#modal-root .goal-opt").forEach(b=>b.onclick=()=>{ S.statsWeek=+b.dataset.w; closeModal(); renderStats(); });
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}

/* ---------- HOME ---------- */
function greeting(){
  const h=yangonNow().getHours();
  return h<12?t("hiMorning"):h<17?t("hiAfternoon"):t("hiEvening");
}
/* ---------- SUMMARY (home) ---------- */
function ringSVG(pct,color,size){
  size=size||76; const r=(size-14)/2, c=2*Math.PI*r, off=c*(1-Math.min(1,Math.max(0,pct)));
  const h=size/2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="var(--track)" stroke-width="7"/><circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${h} ${h})"/></svg>`;
}
function mealScore(x){
  let s=5; const k=x.kcal||0;
  if(k>0&&k<=700) s+=1.5; else if(k>900) s-=1.5;
  s+=Math.min(2.5, ((x.p||0)*4/Math.max(1,k))*10);
  return Math.max(1,Math.min(10,Math.round(s*10)/10));
}
function fmtTime(ts){
  try{ return new Date(ts).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}); }catch(e){ return ""; }
}
function renderHome(){
  const p=S.profile||{}, d=S.day||{};
  const C=window.F1T_COACH, A=window.F1T_ANALYSIS;
  const nm=(p.name||t("guest"));
  let st=0; try{ st=streak(); }catch(e){}
  /* header: streak + actions */
  $("#view-home .home-head").innerHTML=`
    <div class="streak-pill">${ic("flame",15)}<b>${st}</b></div>
    <div class="head-ico">
      <button class="ico-btn" id="home-cal" type="button" aria-label="calendar">${ic("calendar",19)}</button>
      <button class="ico-btn" id="home-bell" type="button" aria-label="notifications">${ic("bell",19)}<span class="dot"></span></button>
      ${avatarHTML(p)}
    </div>`;
  $("#home-cal").onclick=openDatePicker;
  $("#home-bell").onclick=openNotif;
  /* score + rings */
  const score=C?C.dailyScore(d,p):0;
  const target=p.targetKcal||2000;
  const mt=A?A.macroTargets(p):{p:100,c:250,f:65};
  const rings=[
    {lab:t("kcal"), pct:(d.kcal||0)/target, val:fmt(d.kcal||0), unit:t("kcal"), color:"#aefe02"},
    {lab:t("protein"), pct:(d.p||0)/mt.p, val:Math.round(d.p||0), unit:"g", color:"#34d968"},
    {lab:t("carbs"), pct:(d.c||0)/mt.c, val:Math.round(d.c||0), unit:"g", color:"#7ce79b"},
  ];
  /* coach notifications */
  const yD=new Date(yangonNow()); yD.setDate(yD.getDate()-1);
  const yK=window.F1T_todayKey(yD);
  const prevDay=yK===S.dateKey?d:window.F1TFB.loadDay(yK);
  const dinnerKcal=Math.max(300, Math.round(target-(d.kcal||0)));
  const notifs=C?C.notifications(d,prevDay,p,t,{dinnerKcal:dinnerKcal}):[];
  const dismissed=S._dismissed||{};
  /* food journal */
  const entries=[];
  ["breakfast","lunch","dinner","snacks"].forEach(m=>((d.meals||{})[m]||[]).forEach(x=>entries.push(x)));
  entries.sort((a,b)=>(a.at||0)-(b.at||0));
  const dots=entries.filter(x=>x.at).map(x=>{
    const dt=new Date(x.at); const pct=Math.min(100,(dt.getHours()*60+dt.getMinutes())/14.4);
    return `<i style="left:${pct.toFixed(1)}%"></i>`; }).join("");
  /* weight sparkline */
  const wts=dayKeys(14).map(k=>{ const dd=k===S.dateKey?d:window.F1TFB.loadDay(k); return dd&&dd.weight?dd.weight:null; });
  const wvals=wts.filter(v=>v!=null);
  let spark="";
  if(wvals.length>1){
    const mn=Math.min(...wvals), mx=Math.max(...wvals), rg=Math.max(0.5,mx-mn);
    const pts=wvals.map((v,i)=>`${(i/(wvals.length-1)*100).toFixed(1)},${(34-(v-mn)/rg*28).toFixed(1)}`).join(" ");
    spark=`<svg class="w-spark" viewBox="0 0 100 38" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#aefe02" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }
  /* score ring dial */
  const SR_C=2*Math.PI*88;
  const prevScore=(S._lastScore==null?0:S._lastScore); S._lastScore=score;
  const srOff0=(SR_C*(1-Math.min(1,Math.max(0,prevScore))/10)).toFixed(1);
  const srOff1=(SR_C*(1-Math.min(1,Math.max(0,score))/10)).toFixed(1);
  let srTicks="";
  for(let i=0;i<12;i++){ const a=i*Math.PI/6-Math.PI/2;
    srTicks+=`<line x1="${(110+100*Math.cos(a)).toFixed(1)}" y1="${(110+100*Math.sin(a)).toFixed(1)}" x2="${(110+107*Math.cos(a)).toFixed(1)}" y2="${(110+107*Math.sin(a)).toFixed(1)}" class="sr-tick"/>`; }
  $("#home-body").innerHTML=`
    <div class="score-dial">
      <div class="sr-glow"></div>
      <svg viewBox="0 0 220 220" class="score-svg" aria-hidden="true">
        <defs><linearGradient id="srg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#dcff70"/><stop offset="1" stop-color="#7fc400"/>
        </linearGradient></defs>
        <g>${srTicks}</g>
        <circle cx="110" cy="110" r="88" class="sr-track"/>
        <circle cx="110" cy="110" r="88" class="sr-fill" id="score-arc"
          stroke-dasharray="${SR_C.toFixed(1)}" stroke-dashoffset="${srOff0}"
          data-off="${srOff1}" transform="rotate(-90 110 110)"/>
      </svg>
      <div class="sr-center"><div class="score-num" id="score-num">${prevScore.toFixed(1)}</div><div class="score-label">${t("dailyScore")}</div></div>
    </div>
    <div id="env-mount"></div>
    <div class="glass-card rings-card">${rings.map(r=>`
      <div class="mring"><div class="mring-top">${ringSVG(r.pct,r.color)}<b>${Math.round(Math.min(1,Math.max(0,r.pct))*100)}%</b></div>
      <div class="mlab">${r.lab}</div><div class="mval">${r.val} ${r.unit}</div></div>`).join("")}</div>
    <div id="coach-notifs">${notifs.map((n,i)=>dismissed[S.dateKey+":"+i]?"":`
      <div class="coach-notif"><div class="cn-head"><span class="cn-ico">F</span><b>${t("coach")}</b><button class="cn-x" data-x="${i}">×</button></div>
      <p>${n.text}</p>
      <div class="cn-actions">${n.actions.map((a,j)=>`<button data-ni="${i}" data-ai="${j}">${a.label}</button>`).join("")}</div></div>`).join("")}</div>
    <div class="glass-card journal-card">
      <div class="jc-head"><b>${t("foodJournal")}</b><span class="jc-go">↗</span></div>
      <div class="j-timeline"><div class="j-line"></div>${dots}</div>
      <div class="j-times"><span>00:00</span><span>12:00</span><span>23:59</span></div>
      <div class="j-list">${entries.length?entries.map(x=>{ const sc=mealScore(x);
          const col=sc>=7?"#aefe02":sc>=4?"#34d968":"#ff6b62";
          return `<div class="j-entry"><span class="j-score" style="color:${col}">${sc.toFixed(1)}</span>
            <span class="j-name">${x.name||t("snacks")}</span><span class="j-time">${x.at?fmtTime(x.at):""}</span></div>`; }).join("")
        :`<div class="empty-note">${t("noEntries")}</div>`}</div>
    </div>
    <div class="glass-card weight-card">
      <div class="jc-head"><b>${t("weightKg")}</b><button class="jc-go" id="w-log">↗</button></div>
      <div class="w-big">${p.w||"--"}<small> kg</small></div>${spark}
    </div>
    ${renderCoachCard()}`;
  $$("#coach-notifs .cn-x").forEach(b=>b.onclick=()=>{ S._dismissed=S._dismissed||{}; S._dismissed[S.dateKey+":"+b.dataset.x]=1; renderHome(); });
  $$("#coach-notifs [data-ai]").forEach(b=>b.onclick=()=>{ const n=notifs[+b.dataset.ni]; if(n) coachAsk(n.actions[+b.dataset.ai].prompt); });
  const cc=$("#coach-card"); if(cc) cc.onclick=openCoachPlan;
  const wl=$("#w-log"); if(wl) wl.onclick=openWeight;
  /* score dial animation: arc sweeps + number counts from previous value */
  const arc=$("#score-arc");
  if(arc) requestAnimationFrame(()=>requestAnimationFrame(()=>{ arc.style.strokeDashoffset=arc.dataset.off; }));
  const sn=$("#score-num");
  if(sn) countUp(sn, score, 1000, v=>v.toFixed(1), prevScore);
  refreshBell();
  renderEnv();
}

/* ---------- environment: real-time weather + adaptive recommendations ---------- */
async function renderEnv(){
  const mount=$("#env-mount"); if(!mount) return;
  const E=window.F1T_ENV; if(!E) return;
  const d=S.day||{}, p=S.profile||{};
  try{
    const geo=await E.getLocation();
    if(!geo){
      mount.innerHTML=`<button class="glass-card env-wrap depth-3d" id="env-enable" style="width:100%;text-align:left">
        <span class="env-top"><span class="env-ic">${ic("pin",24)}</span>
        <span class="env-tx"><b>${t("env_title")}</b><small>${t("env_tap")}</small></span></span></button>`;
      const b=$("#env-enable");
      if(b) b.onclick=async()=>{ const g=await E.getLocation(true);
        if(g) renderEnv(); else toast(t("env_denied")); };
      return;
    }
    const wx=await E.getWeather(geo.lat, geo.lon);
    if(!wx){
      mount.innerHTML=`<div class="glass-card env-wrap depth-3d"><span class="env-top"><span class="env-ic">${ic("cloudSun",24)}</span>
        <span class="env-tx"><b>${t("env_title")}</b><small>${t("env_na")}</small></span></span></div>`;
      return;
    }
    const name=await E.placeName(geo.lat, geo.lon);
    const cond=E.conditionOf(wx.weather_code);
    const bpm=d.bpm||null;
    let bmi=null; try{ if(p.w&&p.h) bmi=p.w/((p.h/100)*(p.h/100)); }catch(e){}
    const recs=E.buildRecs(wx, bpm, {bmi:bmi, goal:p.goal});
    const A=window.F1T_ANALYSIS;
    const wTarget=A?A.waterTarget(p):Math.round((p.w||65)*35);
    let hadWo=false;
    try{ hadWo=(d.exercise||0)>0 || (window.F1T_WORKOUT&&window.F1T_WORKOUT.workoutsSince(1).length>0); }catch(e){}
    S._envRem=E.checkReminders({wx:wx, waterMl:d.water||0, waterTarget:wTarget, hadWorkout:hadWo});
    const wTxt=recs.workout.slice(0,2).map(k=>t(k)).join(" · ");
    const eTxt=recs.eat.slice(0,1).map(k=>t(k)).join("");
    mount.innerHTML=`<div class="glass-card env-wrap depth-3d tilt" id="env-card">
      <div class="env-top"><span class="env-ic">${ic(E.condIcon(cond),26)}</span>
        <span class="env-tx"><b>${(name||t("env_title")).replace(/</g,"&lt;")}</b>
        <small>${t("wx_"+cond)}${wx.relative_humidity_2m!=null?" · "+wx.relative_humidity_2m+"%":""}</small></span>
        <span class="env-temp">${Math.round(wx.temperature_2m)}°</span></div>
      ${(wTxt||eTxt)?`<div class="env-rec">
        ${wTxt?`<div>${ic("dumbbell",15)}<span>${wTxt}</span></div>`:""}
        ${eTxt?`<div>${ic("utensils",15)}<span>${eTxt}</span></div>`:""}
      </div>`:""}</div>`;
    initTilt(mount);
    refreshBell();
  }catch(e){ /* weather is best-effort; never break home */ }
}

/* ---------- AI COACH ---------- */
let CHAT=[];
function chatLoad(){ try{ CHAT=JSON.parse(store.get("f1t_chat")||"[]"); }catch(e){ CHAT=[]; } }
function chatSave(){ try{ store.set("f1t_chat", JSON.stringify(CHAT.slice(-30))); }catch(e){} }
function chatHTML(){
  return CHAT.map(m=> m.r==="user"
    ? `<div class="msg user"><div class="bubble">${m.x.replace(/</g,"&lt;")}</div></div>`
    : `<div class="msg bot"><span class="m-ico">${ic("zap",14)}</span><div class="bubble">${m.x.replace(/</g,"&lt;").replace(/\n/g,"<br>")}</div></div>`
  ).join("");
}
function renderCoach(){
  chatLoad();
  const chatting=CHAT.length>1;
  const chips=[["chipWorkout","chipWorkoutP"],["chipMeals","chipMealsP"],["chipForm","chipFormP"],["chipEnergy","chipEnergyP"]];
  const waves=Array.from({length:28},(_,i)=>`<i style="animation-delay:${(i*0.07).toFixed(2)}s"></i>`).join("");
  $("#coach-body").innerHTML=`
  <div class="coach-wrap${chatting?" chatting":""}">
    <div class="coach-top"><div class="coach-pill"><span class="cp-orb"></span>
      <span class="cp-tx"><b>F1T ${t("coach")}</b><small>${t("coachAiTag")}</small></span></div></div>
    <div class="coach-orbzone">
      <div class="coach-orb" id="coach-orb"><div class="orb-glow"></div><div class="orb-core"></div><div class="orb-sheen"></div></div>
      <div class="coach-hi">${t("coachHi")}</div>
      <div class="coach-ask">${t("coachHelp")}</div>
    </div>
    <div class="chat-log" id="chat-log">${chatHTML()||""}</div>
    <div class="persona-row" id="persona-row"></div>
    <div class="chat-chips">${chips.map(c=>`<button data-cp="${c[1]}">${ic("zap",13)}${t(c[0])}</button>`).join("")}</div>
    <div class="coach-bar">
      <button class="cb-mic" id="c-mic" aria-label="voice">${ic("mic",20)}</button>
      <input id="chat-in" placeholder="${t("askCoach")}" autocomplete="off">
      <button class="cb-send" id="chat-send" aria-label="send">${ic("send",18)}</button>
    </div>
  </div>
  <div class="voice-ov hidden" id="voice-ov">
    <div class="vo-orb"><div class="orb-core"></div></div>
    <div class="vo-waves">${waves}</div>
    <div class="vo-time" id="vo-time">00:00</div>
    <div class="vo-label">${t("voiceListening")}</div>
    <button class="vo-close" id="vo-close" aria-label="close">×</button>
  </div>`;
  const log=$("#chat-log");
  if(!CHAT.length){ CHAT.push({r:"bot",x:t("coachWelcome")}); chatSave(); log.innerHTML=chatHTML(); }
  log.scrollTop=log.scrollHeight;
  const send=()=>{ const inp=$("#chat-in"), v=inp.value.trim(); if(!v) return; inp.value=""; askCoach(v); };
  $("#chat-send").onclick=send;
  $("#chat-in").onkeydown=e=>{ if(e.key==="Enter") send(); };
  $("#c-mic").onclick=openVoice;
  $$("#coach-body [data-cp]").forEach(b=>b.onclick=()=>askCoach(t(b.dataset.cp)));
  if(window.F1T_PREMIUM) F1T_PREMIUM.paintPersonas();
}
function coachAsk(prompt){ show("coach"); setTimeout(()=>askCoach(prompt),350); }
async function askCoach(text){
  const log=$("#chat-log"); if(!log) return;
  const orb=$("#coach-orb"); if(orb) orb.classList.add("thinking");
  CHAT.push({r:"user",x:text}); chatSave(); log.innerHTML=chatHTML();
  const th=document.createElement("div"); th.className="msg bot";
  th.innerHTML=`<span class="m-ico">${ic("zap",14)}</span><div class="bubble"><i>${t("coachThinking")}</i></div>`;
  log.appendChild(th); log.scrollTop=log.scrollHeight;
  try{
    const reply=await coachReply(text);
    CHAT.push({r:"bot",x:reply});
  }catch(e){ CHAT.push({r:"bot",x:t("coachOffline")}); }
  chatSave(); log.innerHTML=chatHTML(); log.scrollTop=log.scrollHeight;
  if(orb) orb.classList.remove("thinking");
}
/* ---------- voice input ---------- */
let voTimer=null, voRec=null;
function openVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast(t("voiceNoSupport")); return; }
  const ov=$("#voice-ov"); if(!ov) return;
  ov.classList.remove("hidden");
  const tt=$("#vo-time"); let s=0; tt.textContent="00:00";
  clearInterval(voTimer);
  voTimer=setInterval(()=>{ s++;
    tt.textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); },1000);
  const close=()=>{ ov.classList.add("hidden"); clearInterval(voTimer);
    try{ if(voRec) voRec.stop(); }catch(e){} voRec=null; };
  $("#vo-close").onclick=close;
  try{
    voRec=new SR();
    voRec.lang=(S.lang==="my")?"my-MM":"en-US";
    voRec.interimResults=false; voRec.maxAlternatives=1;
    voRec.onresult=e=>{
      const txt=e.results[0][0].transcript||"";
      close();
      if(txt.trim()) askCoach(txt.trim());
    };
    voRec.onerror=()=>close();
    voRec.onend=()=>close();
    voRec.start();
  }catch(e){ close(); }
}
function coachSystem(){
  const p=S.profile||{}, d=S.day||{};
  const plan=window.F1T_COACH?window.F1T_COACH.plan(p):null;
  const n=plan?plan.nutrition:null;
  const FP=window.F1T_PREMIUM;
  const intro=FP?FP.sysFor(FP.persona()):
    "You are F1T Coach, an expert fitness and nutrition coach inside the F1T calorie tracker app. "+
    "Reply concisely (under 120 words unless asked for detail), practical and encouraging. Use metric units. "+
    "Never diagnose medical conditions; suggest a professional for health concerns. ";
  return intro+
    "User profile: name="+(p.name||"friend")+", age="+(p.age||"?")+", height="+(p.h||"?")+"cm, weight="+(p.w||"?")+
    "kg, goal="+(p.goal||"maintain")+", daily target="+(p.targetKcal||2000)+"kcal. "+
    "Today so far: "+(d.kcal||0)+"kcal, protein "+(d.p||0)+"g, carbs "+(d.c||0)+"g, fat "+(d.f||0)+
    "g, water "+(d.water||0)+"ml, steps "+(d.steps||0)+", exercise "+(d.exercise||0)+"h. "+
    (n?("Their daily plan: "+n.protein+"g protein, "+n.carbs+"g carbs, "+n.fat+"g fat. "):"")+
    "Today is "+new Date().toDateString()+".";
}
async function coachReply(text){
  const msgs=[{role:"system",content:coachSystem()}];
  CHAT.slice(-10).forEach(m=>msgs.push({role:m.r==="user"?"user":"assistant",content:m.x}));
  msgs.push({role:"user",content:text});
  const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),45000);
  try{
    const r=await fetch("https://text.pollinations.ai/",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:msgs,model:"openai"}),signal:ctl.signal});
    if(!r.ok) throw new Error("ai "+r.status);
    const out=(await r.text()).trim();
    if(!out) throw new Error("empty");
    return out;
  }finally{ clearTimeout(to); }
}

/* ---------- STATS ---------- */
/* ---------- HEALTH ANALYSIS ---------- */
function renderAnalysis(){
  const p=S.profile||{}, d=S.day||{};
  const A=window.F1T_ANALYSIS, an=A.analyzeDay(d,p,t);
  const bmi=A.bmi(p.h,p.w);
  const catKey={underweight:"bmiUnder",healthy:"bmiHealthy",overweight:"bmiOver",obese:"bmiObese"};
  const catTone={underweight:"warn",healthy:"good",overweight:"warn",obese:"bad"};
  let bmiHtml="";
  if(bmi){
    const pos=Math.min(100,Math.max(0,(bmi.value-14)/(36-14)*100));
    bmiHtml=`<div class="bmi-block">
      <div class="bmi-top"><div><b>${bmi.value.toFixed(1)}</b><small>${t("bmi")}</small></div>
        <span class="pill ${catTone[bmi.cat]}">${t(catKey[bmi.cat])}</span></div>
      <div class="bmi-bar"><i style="left:${pos}%"></i></div>
      <div class="bmi-range">${t("bmiRange")}: ${Math.round(bmi.lo)} - ${Math.round(bmi.hi)} ${t("kg")}</div>
      <div class="bmi-note">${t("bmiNote")}</div></div>`;
  }
  const mRow=(label,m,icon)=>{ const pct=Math.min(100,Math.round(m.a/m.t*100));
    const tone=pct<70?"warn":pct<=125?"good":"info";
    return `<div class="macro-row"><span class="m-ico2">${ic(icon,16)}</span>
      <div class="m-mid"><div class="m-lab"><b>${label}</b><span>${t("ofTarget",{a:m.a,b:m.t})}</span></div>
      <div class="m-bar ${tone}"><i style="width:${pct}%"></i></div></div></div>`; };
  const totG=an.macros.p.a+an.macros.c.a+an.macros.f.a;
  const seg=(v,c)=>{ const p=totG?Math.round(v/totG*100):0; return p?`<i class="${c}" style="width:${p}%"></i>`:""; };
  const toneIcon={good:"check",warn:"bell",info:"zap",bad:"x"};
  const cards=an.insights.map(n=>`<div class="glass-card insight ${n.tone}">
    <span class="i-ico">${ic(n.icon,20)}</span>
    <div><b>${n.title}</b><p>${n.body}</p></div></div>`).join("");
  return `<div class="glass-card analysis-card">
      <div class="a-head"><span class="a-ico">${ic("activity",18)}</span><b>${t("analysis")}</b></div>
      ${bmiHtml}
      <div class="macro-block">
        ${mRow(t("protein"),an.macros.p,"meat")}
        ${mRow(t("carbs"),an.macros.c,"bread")}
        ${mRow(t("fat"),an.macros.f,"droplet")}
      </div>
      ${totG?`<div class="segbar">${seg(an.macros.p.a,"sp")}${seg(an.macros.c.a,"sc")}${seg(an.macros.f.a,"sf")}</div>
      <div class="seg-leg"><span><span class="cl-dot" style="background:#16a34a"></span>${t("protein")}</span><span><span class="cl-dot" style="background:#aefe02"></span>${t("carbs")}</span><span><span class="cl-dot" style="background:#0d7a2c"></span>${t("fat")}</span></div>`:""}
      </div></div>
    <div class="insights">${cards}</div>`;
}

function renderStats(){
  if(S.statsTab==="workouts"){ renderWorkoutStats(); return; }
  const p=S.profile||{}, target=p.targetKcal||2000;
  const keys=weekKeys(S.statsWeek||0); const dows=[t("mon"),t("tue"),t("wed"),t("thu"),t("fri"),t("sat"),t("sun")];
  const dowOf=k=>{ const dt=new Date(k+"T12:00:00+06:30"); return dows[(dt.getDay()+6)%7]; };
  const vals=keys.map(k=>{ const dd=k===S.dateKey?S.day:window.F1TFB.loadDay(k); return dd?dd.kcal:0; });
  const max=Math.max(target,...vals,1);
  const wkLabel=(S.statsWeek||0)===0? t("week") : (S.statsWeek===1? t("lastWeek") : t("twoWeeksAgo"));
  const bars=vals.map((v,i)=>{ const pct=Math.round(v/target*100);
    return `<div class="bar-c"><span class="pct">${v?pct+"%":""}</span>
      <div class="bar ${v>=target*0.9?"fill":""}" style="height:${Math.max(6,Math.round(v/max*150))}px"></div>
      <span class="dl">${dowOf(keys[i])}</span></div>`; }).join("");
  const d=S.day; const cups=Math.floor(d.water/250);
  const drops=Array.from({length:8},(_,i)=>`<i class="${i<Math.min(8,cups)?"on":""}">${ic("droplet",13)}</i>`).join("");
  const exHist=dayKeys(14).map(k=>{ const dd=k===S.dateKey?d:window.F1TFB.loadDay(k); return dd?(dd.exercise||0):0; });
  const exMax=Math.max(1,...exHist);
  const spark=exHist.map(v=>4+Math.round(v/exMax*36));
  $("#stats-body").innerHTML=`
    <div class="seg-sm wo-segmain"><button data-st="nutrition" class="on">${t("nutrition")}</button><button data-st="workouts">${t("workouts")}</button></div>
    <div class="glass-card stat-hero"><div class="s-label">${t("calories")} · ${wkLabel}</div>
      <div class="cal-ring-wrap">
        <div class="cal-ring"><svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" style="stroke:var(--track)" stroke-width="12"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="url(#calg)" stroke-width="12" stroke-linecap="round"
            stroke-dasharray="${2*Math.PI*52}" stroke-dashoffset="${(2*Math.PI*52)*(1-Math.min(1,d.kcal/target))}"/>
          <defs><linearGradient id="calg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#aefe02"/><stop offset="1" stop-color="#16a34a"/></linearGradient></defs></svg>
          <div class="rv"><b>${fmt(d.kcal)}</b><small>${t("eaten")}</small></div></div>
        <div class="cal-legend">
          <div class="cl-row"><span class="cl-dot" style="background:#e5484d"></span>${t("eaten")}<b>${fmt(d.kcal)}</b></div>
          <div class="cl-row"><span class="cl-dot" style="background:#16a34a"></span>${t("left")}<b>${fmt(Math.max(0,target-d.kcal))}</b></div>
          <div class="cl-row"><span class="cl-dot" style="background:#9ca3af"></span>${t("target")}<b>${fmt(target)}</b></div>
        </div></div>
      <div class="bars">${bars}</div></div>
    ${renderAnalysis()}
    <div class="stat-grid">
      <div class="glass-card stat-tile" id="st-exercise"><div class="t-top"><span class="t-ico">${ic("activity",15)}</span>${t("exercise")}</div>
        <div class="spark">${spark.map(h=>`<i style="height:${h}px"></i>`).join("")}</div>
        <div class="t-big">${(d.exercise||0).toFixed(1)} <small>${t("hours")}</small></div></div>
      <div class="glass-card stat-tile" id="st-bpm"><div class="t-top"><span class="t-ico">${ic("heart",15)}</span>${t("bpm")}</div>
        <svg class="pulse" width="100%" height="44" viewBox="0 0 120 44" preserveAspectRatio="none">
          <polyline points="0,26 14,26 20,26 24,10 28,40 32,26 46,26 52,18 56,34 60,26 78,26 84,8 90,42 96,26 120,26"
            fill="none" stroke="#e63b30" stroke-width="2.5" stroke-linecap="round"/></svg>
        <div class="t-big">${d.bpm?d.bpm:"--"} <small>${t("bpm")}</small></div></div>
      <div class="glass-card stat-tile" id="st-weight"><div class="t-top"><span class="t-ico">${ic("scale",15)}</span>${t("weight")}</div>
        <div class="t-big">${p.w||"--"} <small>${t("kg")}</small></div></div>
      <div class="glass-card stat-tile" id="st-water"><div class="t-top"><span class="t-ico">${ic("droplet",15)}</span>${t("water")}</div>
        <div class="t-big">${cups} <small>${t("cups")}</small></div>
        <div class="drop-row">${drops}</div></div>
    </div>`;
  $("#st-exercise").onclick=openExercise;
  $("#st-bpm").onclick=openBpm;
  $("#st-weight").onclick=openWeight;
  $("#st-water").onclick=openWater;
  $$("#stats-body .wo-segmain button").forEach(b=>b.onclick=()=>{ S.statsTab=b.dataset.st; renderStats(); });
}

/* ---------- REWARDS ---------- */
function badges(){
  const d=S.day, p=S.profile||{}, target=p.targetKcal||2000;
  const st=streak();
  const bfastStreak=(()=>{ let s=0; const now=yangonNow();
    for(let i=0;i<30;i++){ const dt=new Date(now); dt.setDate(dt.getDate()-i); const k=window.F1T_todayKey(dt);
      const dd=k===S.dateKey?d:window.F1TFB.loadDay(k);
      if(dd&&dd.meals&&dd.meals.breakfast&&dd.meals.breakfast.length) s++; else break; } return s; })();
  return [
    {n:t("b1n"),d:t("b1d"),ic:"pencil",won:st>=1},
    {n:t("b2n"),d:t("b2d"),ic:"flame",won:st>=3},
    {n:t("b3n"),d:t("b3d"),ic:"droplet",won:Math.floor(d.water/250)>=8},
    {n:t("b4n"),d:t("b4d"),ic:"footprints",won:d.steps>=10000},
    {n:t("b5n"),d:t("b5d"),ic:"target",won:d.kcal>0&&Math.abs(d.kcal-target)/target<=0.1},
    {n:t("b6n"),d:t("b6d"),ic:"sunrise",won:bfastStreak>=5},
  ];
}
function renderRewards(){
  const st=streak(); const bs=badges();
  $("#rewards-body").innerHTML=`
    <div class="glass-card streak-card"><div class="flame">${ic("flame",44)}</div><b>${st}</b><span>${t("dayStreak")}</span>
      <div style="margin-top:8px;font-size:13px">${t("keepGoing")}</div>
      ${window.F1T_PREMIUM&&F1T_PREMIUM.isPremium()?`<button class="btn-lime sm" id="st-restore" style="margin-top:10px">${t("restoreStreak")}</button>`:""}</div>
    <div class="badge-grid">${bs.map(b=>`<div class="glass-card badge ${b.won?"won":""}">
      <span class="b-ico">${ic(b.won?b.ic:"lock",30)}</span><b>${b.n}</b><small>${b.d}</small></div>`).join("")}</div>`;
  const rb=$("#st-restore");
  if(rb) rb.onclick=()=>{
    if(!F1T_PREMIUM.canRestore()){ toast(t("restoreCool")); return; }
    if(F1T_PREMIUM.doRestore()){ toast(t("streakRestored")); renderRewards(); }
  };
}

/* ---------- MENU ---------- */
function renderProfile(){
  const p=S.profile||{};
  const who = S.user ? (S.user.displayName||S.user.email) : (S.guest? t("guest") : t("notSignedIn"));
  const A=window.F1T_ANALYSIS, bmi=A?A.bmi(p.h,p.w):null;
  let st=0; try{ st=streak(); }catch(e){}
  $("#profile-body").innerHTML=`
    <div class="glass-card prof-card" id="prof-edit"><div class="avatar-wrap">${avatarHTML(p)}
      <button class="avatar-edit" id="av-edit" aria-label="customize">${ic("pencil",15)}</button></div>
      <div style="flex:1;min-width:0"><b>${p.name||t("guest")} ${window.F1T_PREMIUM&&F1T_PREMIUM.isPremium()?F1T_PREMIUM.badgeHTML():""}</b>${(()=>{const parts=[p.accountName||who];if(p.birthday)parts.push(fmtBD(p.birthday));if(p.age!=null)parts.push(t("age")+" "+p.age);if(p.sign)parts.push(t(p.sign));return `<small>${parts.join(" · ")}</small>`;})()}</div>
      <span class="chev">›</span></div>
    <div class="glass-card body-card">
      <div class="plan-row"><span>${t("bodyStatus")}</span><b>${bmi?bmi.value.toFixed(1)+" · "+t(BMI_CATKEY[bmi.cat]):"--"}</b></div>
      <div class="plan-row"><span>${t("goal")}</span><b class="hl">${t(p.goal||"maintain")}</b></div>
    </div>
    <div class="glass-card p-stats">
      <div><b>${bmi?bmi.value.toFixed(1):"--"}</b><small>${t("bmi")}</small></div>
      <div><b>${fmt(p.targetKcal||2000)}</b><small>${t("kcal")}${t("perDay")}</small></div>
      <div><b>${st}</b><small>${t("dayStreak")}</small></div></div>
    <div class="menu-list">
      <button class="glass-card menu-row" id="m-stats"><span class="mr-ico">${ic("chart",20)}</span><span class="mr-t">${t("progress")}</span><span class="chev">›</span></button>
      <button class="glass-card menu-row" id="m-rewards"><span class="mr-ico">${ic("trophy",20)}</span><span class="mr-t">${t("rewards")}</span><span class="chev">›</span></button>
      <button class="glass-card menu-row" id="m-goals"><span class="mr-ico">${ic("target",20)}</span><span class="mr-t">${t("editGoals")}</span><span class="mr-sub">${fmt(p.targetKcal||2000)} ${t("kcal")}</span><span class="chev">›</span></button>
      <button class="glass-card menu-row" id="m-premium"><span class="mr-ico">${ic("crown",20)}</span><span class="mr-t">${t("f1tPremium")}</span>${window.F1T_PREMIUM&&F1T_PREMIUM.isPremium()?F1T_PREMIUM.badgeHTML():""}<span class="chev">›</span></button>
      <button class="glass-card menu-row" id="m-board"><span class="mr-ico">${ic("trophy",20)}</span><span class="mr-t">${t("scoreboard")}</span><span class="chev">›</span></button>
    </div>`;
  $("#prof-edit").onclick=openEditProfile;
  $("#av-edit").onclick=e=>{ e.stopPropagation(); openAvatarSheet(); };
  $("#m-goals").onclick=openGoals;
  $("#m-premium").onclick=()=>window.F1T_PREMIUM&&F1T_PREMIUM.openPremiumHub();
  $("#m-board").onclick=()=>window.F1T_PREMIUM&&F1T_PREMIUM.openScoreboard();
  $("#m-rewards").onclick=()=>show("rewards");
  $("#m-stats").onclick=()=>show("stats");
}

/* ---------- SETTINGS (own tab) ---------- */
function renderSettings(){
  $("#settings-body").innerHTML=`
    <div class="glass-card set-card">
      <div class="menu-row theme-row" id="m-theme"><div class="theme-top"><span class="mr-ico">${ic("sun",20)}</span><span class="mr-t">${t("appearance")}</span></div>
        <span class="seg-sm theme-seg"><button data-th="light" class="${S.theme!=="dark"?"on":""}">${t("lightMode")}</button><button data-th="dark" class="${S.theme==="dark"?"on":""}">${t("darkMode")}</button></span></div>
      <button class="menu-row" id="m-lang"><span class="mr-ico">${ic("globe",20)}</span><span class="mr-t">${t("language")}</span><span class="mr-sub">${t("langName")}</span><span class="chev">›</span></button>
      <div class="set-sub">${t("permissions")}</div>
      ${["camera","motion","loc","cal"].map(k=>`
      <button class="menu-row perm-row" data-perm="${k}"><span class="mr-ico">${ic(k==="camera"?"camera":k==="motion"?"activity":k==="loc"?"pin":"calendar",20)}</span>
        <span class="mr-t">${t(k==="camera"?"allowCamera":k==="motion"?"allowMotion":k==="loc"?"perm_location":"allowCalendar")}</span>
        <span class="pill ${permState()[k]?"good":""}">${permState()[k]?t("allowed"):t("notAllowed")}</span></button>`).join("")}
      <button class="menu-row" id="m-export"><span class="mr-ico">${ic("calendar",20)}</span><span class="mr-t">${t("exportCal")}</span><span class="chev">›</span></button>
      <button class="menu-row" id="m-terms"><span class="mr-ico">${ic("doc",20)}</span><span class="mr-t">${t("rulesTitle")}</span><span class="chev">›</span></button>
      <button class="menu-row" id="m-guide"><span class="mr-ico">${ic("book",20)}</span><span class="mr-t">${t("guideTitle")}</span><span class="chev">›</span></button>
    </div>
    <div class="menu-list">
      <button class="glass-card menu-row" id="m-install"><span class="mr-ico">${ic("smartphone",20)}</span><span class="mr-t">${t("installApp")}</span><span class="chev">›</span></button>
      <button class="glass-card menu-row danger" id="m-logout"><span class="mr-ico">${ic("logout",20)}</span><span class="mr-t">${t("logout")}</span></button>
    </div>
    <div class="empty-note">${t("version")}</div>
    <div class="empty-note profile-copy">${t("copyright")}</div>`;
  $("#m-lang").onclick=openLangSheet;
  $("#m-terms").onclick=openRules;
  $("#m-guide").onclick=openGuide;
  $("#m-export").onclick=exportICS;
  $$("#settings-body .perm-row").forEach(b=>b.onclick=()=>requestPerm(b.dataset.perm));
  $("#m-theme").onclick=e=>{ const b=e.target.closest("[data-th]"); if(!b) return;
    S.theme=b.dataset.th; applyTheme();
    $$("#m-theme [data-th]").forEach(x=>x.classList.toggle("on",x===b)); };
  $("#m-install").onclick=()=>openInfo(t("installApp"), t("installHow"));
  $("#m-logout").onclick=()=>{
    $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
      <h2>${t("logout")}</h2><p style="text-align:center;color:var(--ink2);font-weight:600;margin-bottom:18px">${t("confirmLogout")}</p>
      <div class="ob-nav"><button class="btn-back" id="lg-cancel">${t("cancel")}</button>
      <button class="btn-lime" id="lg-ok">${t("logout")}</button></div></div></div>`;
    $("#lg-cancel").onclick=closeModal;
    $("#lg-ok").onclick=async()=>{ stopLive(); await window.F1TFB.signOut(); store.del("f1t_guest"); location.reload(); };
    $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
  };
}
function permState(){ try{ return Object.assign({camera:false,motion:false,cal:false,loc:false}, JSON.parse(store.get("f1t_perm")||"{}")); }catch(e){ return {camera:false,motion:false,cal:false,loc:false}; } }
async function requestPerm(kind){
  let ok=false;
  try{
    if(kind==="camera"){ const st=await navigator.mediaDevices.getUserMedia({video:true}); st.getTracks().forEach(x=>x.stop()); ok=true; }
    else if(kind==="motion"){
      if(typeof DeviceMotionEvent!=="undefined" && DeviceMotionEvent.requestPermission){ ok=(await DeviceMotionEvent.requestPermission())==="granted"; }
      else ok=true;
    }
    else if(kind==="loc"){ const g=await window.F1T_ENV.getLocation(true); ok=!!g; }
    else if(kind==="cal"){ ok=!permState().cal; }
  }catch(e){ ok=false; }
  const ps=permState(); ps[kind]=ok; store.set("f1t_perm", JSON.stringify(ps));
  if($("#settings-body .perm-row")) renderSettings(); else renderProfile();
  toast(ok?t("allowed"):t("notAllowed"));
}
function setLang(L){
  S.lang=L; store.set("f1t_lang",L); document.documentElement.lang=L;
  if(S.profile){ S.profile.lang=L; window.F1TFB.saveProfile(S.profile); }
  applyI18n();
}
let sheetTitleKey="logTitle";
function openLangSheet(){
  const langs=[["en","English"],["my","မြန်မာ"],["th","ไทย"],["zh","中文"],["ja","日本語"]];
  sheetTitleKey="language"; $("#sheet-title").textContent=t("language");
  $("#sheet-grid").innerHTML=langs.map(l=>`<button class="sheet-opt" data-lang="${l[0]}"><span style="font-size:22px;font-weight:800">${l[1].slice(0,2)}</span>${l[1]}${S.lang===l[0]?" ✓":""}</button>`).join("");
  $("#sheet").classList.remove("hidden"); $("#sheet-backdrop").classList.remove("hidden");
  $$("#sheet-grid [data-lang]").forEach(b=>b.onclick=()=>{ closeSheet(); setLang(b.dataset.lang); });
}
function exportICS(){
  const keys=dayKeys(7), lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//F1T//Coach//EN"];
  keys.forEach(k=>{
    const d=window.F1TFB.loadDay(k); if(!d||!d.kcal) return;
    const dt=k.replace(/-/g,"");
    const desc=`${d.kcal} kcal`+(d.exercise?`, ${d.exercise}h exercise`:"");
    lines.push("BEGIN:VEVENT","UID:"+dt+"@f1t","DTSTAMP:"+dt+"T000000Z","DTSTART:"+dt,
      "SUMMARY:F1T log - "+desc.replace(/,/g,"\\,").replace(/:/g,"\\:"),"END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const blob=new Blob([lines.join("\r\n")],{type:"text/calendar"});
  const file=new File([blob],"f1t-week.ics",{type:"text/calendar"});
  const done=()=>{ const ps=permState(); ps.cal=true; store.set("f1t_perm", JSON.stringify(ps));
    renderProfile(); toast(t("calExported")); };
  if(navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({files:[file],title:"F1T week"}).then(done).catch(()=>{});
  }else{
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download="f1t-week.ics"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),4000); done();
  }
}
function openEditProfile(){
  const p=S.profile||{}; let goal=p.goal||"maintain";
  const signs=["signAries","signTaurus","signGemini","signCancer","signLeo","signVirgo",
               "signLibra","signScorpio","signSagittarius","signCapricorn","signAquarius","signPisces"];
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t("editProfile")}</h2>
    <div class="field"><label>${t("username")}</label><input id="ep-name" maxlength="40" value="${(p.name||"").replace(/"/g,"&quot;")}"></div>
    <div class="field"><label>${t("accountName")}</label><input id="ep-acc" maxlength="60" value="${(p.accountName||"").replace(/"/g,"&quot;")}"></div>
    <div class="field"><label>${t("birthday")}</label><input id="ep-bd" type="date" value="${p.birthday||""}"></div>
    <div class="field"><label>${t("age")}</label><input id="ep-age" type="number" inputmode="numeric" min="5" max="120" value="${p.age!=null?p.age:""}"></div>
    <div class="field"><label>${t("sign")}</label><select id="ep-sign">${signs.map(sg=>`<option value="${sg}" ${p.sign===sg?"selected":""}>${t(sg)}</option>`).join("")}</select></div>
    <div class="field"><label>${t("goal")}</label><div class="seg-sm" id="ep-goal">
      ${["lose","maintain","gain"].map(g=>`<button data-g="${g}" class="${goal===g?"on":""}">${t(g)}</button>`).join("")}</div></div>
    <button class="btn-lime" id="ep-save">${t("save")}</button></div></div>`;
  $("#ep-bd").onchange=e=>{ const v=e.target.value;
    if(v){ const pm=v.split("-").map(Number); const a=ageFrom(v); if(a!=null) $("#ep-age").value=a;
      $("#ep-sign").value=zodiacSign(pm[1],pm[2]); } };
  $$("#ep-goal button").forEach(b=>b.onclick=()=>{ goal=b.dataset.g;
    $$("#ep-goal button").forEach(x=>x.classList.toggle("on",x===b)); });
  $("#ep-save").onclick=async()=>{
    p.name=$("#ep-name").value.trim(); p.accountName=$("#ep-acc").value.trim();
    p.birthday=$("#ep-bd").value||null;
    p.age=$("#ep-age").value===""?null:Math.max(5,Math.min(120,+$("#ep-age").value||0));
    p.sign=$("#ep-sign").value; p.goal=goal;
    try{ await window.F1TFB.saveProfile(p); }catch(e){}
    if(p.accountName && !S.guest){ try{ await window.F1TFB.setDisplayName(p.accountName); }catch(e){} }
    closeModal(); renderProfile(); toast(t("saved"));
  };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openInfo(title, body){
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${title}</h2><p style="font-weight:500;color:var(--ink2);line-height:1.6;margin-bottom:16px">${body}</p>
    <button class="btn-lime" id="m-ok">${t("done")}</button></div></div>`;
  $("#m-ok").onclick=closeModal; $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openRules(){
  const secs=[1,2,3,4,5,6,7,8,9,10].map(i=>`
    <div class="rr-sec"><b>${t("rr"+i+"t")}</b><p>${t("rr"+i+"b")}</p></div>`).join("");
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal modal-tall"><div class="sheet-grip"></div>
    <h2>${ic("doc",22)} ${t("rulesTitle")}</h2>
    <div class="rr-body">${secs}</div>
    <div class="rr-copy">${t("copyright")}</div>
    <button class="btn-lime" id="m-ok">${t("done")}</button></div></div>`;
  $("#m-ok").onclick=closeModal; $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openGuide(){
  const secs=[1,2,3,4,5,6,7].map(i=>`
    <div class="rr-sec"><b>${t("gd"+i+"t")}</b><p>${t("gd"+i+"b")}</p></div>`).join("");
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal modal-tall"><div class="sheet-grip"></div>
    <h2>${ic("book",22)} ${t("guideTitle")}</h2>
    <div class="rr-body">${secs}</div>
    <button class="btn-lime" id="m-ok">${t("done")}</button></div></div>`;
  $("#m-ok").onclick=closeModal; $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openGoals(){
  const p=S.profile||{};
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t("editGoals")}</h2>
    <div class="field"><label>${t("target")} (${t("kcal")})</label><input id="g-kcal" type="number" inputmode="numeric" value="${p.targetKcal||2000}"></div>
    <div class="field"><label>${t("weightNow")}</label><input id="g-w" type="number" inputmode="numeric" value="${p.w||""}"></div>
    <button class="btn-lime" id="g-save">${t("save")}</button></div></div>`;
  $("#g-save").onclick=async()=>{ S.profile.targetKcal=+$("#g-kcal").value||2000;
    if($("#g-w").value) S.profile.w=+$("#g-w").value;
    await window.F1TFB.saveProfile(S.profile); closeModal(); toast(t("targetUpdated")); renderProfile(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function closeModal(){
  const root=$("#modal-root"), m=root.querySelector(".modal"), b=root.querySelector(".mback");
  if(!m){ root.innerHTML=""; return; }
  m.classList.add("m-out"); if(b) b.classList.add("mback-out");
  setTimeout(()=>{ root.innerHTML=""; },190);
}

const BMI_CATKEY={underweight:"bmiUnder",healthy:"bmiHealthy",overweight:"bmiOver",obese:"bmiObese"};
function zodiacSign(mo,da){
  const S=["signCapricorn","signAquarius","signPisces","signAries","signTaurus","signGemini",
           "signCancer","signLeo","signVirgo","signLibra","signScorpio","signSagittarius"];
  const last=[19,18,20,19,20,20,22,22,22,22,21,21];
  return S[da<=last[mo-1] ? mo-1 : mo%12];
}
function ageFrom(bd){
  try{ const b=new Date(bd+"T00:00:00"), n=new Date();
    let a=n.getFullYear()-b.getFullYear(); const m=n.getMonth()-b.getMonth();
    if(m<0||(m===0&&n.getDate()<b.getDate())) a--; return a>0?a:null;
  }catch(e){ return null; }
}
function fmtBD(bd){
  try{ return new Date(bd+"T00:00:00").toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}); }
  catch(e){ return bd; }
}
/* ---------- COACH PLAN ---------- */
function renderCoachCard(){
  if(!window.F1T_COACH) return "";
  const plan=window.F1T_COACH.plan(S.profile||{});
  const td=window.F1T_COACH.today(plan);
  const wname=td.key==="rest"?t("restDay"):t(td.key);
  const n=plan.nutrition;
  return `<div class="glass-card coach-card" id="coach-card">
    <span class="cc-ico">${ic("activity",22)}</span>
    <div class="cc-mid"><div class="cc-label">${t("coachPlan")}</div>
      <b>${t("todayWorkout")}: ${wname}${td.mins?" · "+t("minutes",{n:td.mins}):""}</b>
      <span>${t("carbs")||"Carbs"} ${n.carbs}g · ${t("protein")} ${n.protein}g · ${t("fat")} ${n.fat}g</span></div>
    <span class="cc-go">›</span></div>`;
}
function openCoachPlan(){
  const plan=window.F1T_COACH.plan(S.profile||{});
  const n=plan.nutrition, b=plan.body;
  const dows=[t("mon"),t("tue"),t("wed"),t("thu"),t("fri"),t("sat"),t("sun")];
  const todayIdx=(new Date().getDay()+6)%7;
  const bmiTxt=b.bmi?`${b.bmi.value.toFixed(1)} (${t(BMI_CATKEY[b.bmi.cat])})`:"--";
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t("coachPlan")}</h2>
    <div class="plan-sec"><div class="plan-head">${t("bodyStructure")}</div>
      <div class="plan-row"><span>BMI</span><b>${bmiTxt}</b></div>
      <div class="plan-row"><span>${t("healthyRange")}</span><b>${b.lo}–${b.hi} kg</b></div>
      <div class="plan-row"><span>${t("targetWeight")}</span><b class="hl">${b.targetW} kg</b></div></div>
    <div class="plan-sec"><div class="plan-head">${t("workoutSchedule")} · ${t(n.planKey)}</div>
      ${plan.workouts.map((w,i)=>`<div class="plan-row ${i===todayIdx?"today":""}">
        <span>${dows[i]}</span><b>${w.key==="rest"?t("restDay"):t(w.key)}</b>
        <small>${w.mins?t("minutes",{n:w.mins}):"—"}</small></div>`).join("")}</div>
    <div class="plan-sec"><div class="plan-head">${t("nutritionPlan")}</div>
      <div class="plan-row"><span>${t("eatStyle")}</span><b>${t(n.style)}</b></div>
      <div class="plan-row"><span>${t("protein")}</span><b>${n.protein}g</b></div>
      <div class="plan-row"><span>${t("carbs")}</span><b class="hl">${n.carbs}g</b></div>
      <div class="plan-row"><span>${t("fat")}</span><b>${n.fat}g</b></div>
      <div class="plan-row"><span>${t("preWorkout")}</span><b>${n.preCarb}g ${t("carbs")}</b></div>
      <div class="plan-row"><span>${t("postWorkout")}</span><b>${n.postProt}g ${t("protein")}</b></div>
      <p class="plan-tip">${t("carbsWhy")}</p><p class="plan-tip">${t("proteinWhy")}</p></div>
    <p class="coach-note">${t("coachNote")}</p>
    <button class="btn-lime" id="cp-ok">${t("done")}</button></div></div>`;
  $("#cp-ok").onclick=closeModal; $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}

/* ---------- SHEET + LOGGING ---------- */
function openSheet(){
  sheetTitleKey="logTitle"; $("#sheet-title").textContent=t("logTitle");
  const opts=[["meal","utensils",t("logMeal")],["water","droplet",t("logWater")],["weight","scale",t("logWeight")],["steps","footprints",t("logSteps")],["exercise","activity",t("exercise")],["camera","camera",t("takePhoto")]];
  $("#sheet-grid").innerHTML=opts.map(o=>`<button class="sheet-opt" data-k="${o[0]}"><span>${ic(o[1],26)}</span>${o[2]}</button>`).join("");
  $("#sheet").classList.remove("hidden"); $("#sheet-backdrop").classList.remove("hidden");
  $$("#sheet-grid .sheet-opt").forEach(b=>b.onclick=()=>{ closeSheet();
    const k=b.dataset.k;
    if(k==="meal") openMealPicker("snacks");
    if(k==="water") openWater();
    if(k==="weight") openWeight();
    if(k==="steps") openSteps();
    if(k==="exercise") openWorkoutHub();
    if(k==="camera") openCamera();
  });
}
function closeSheet(){
  const sh=$("#sheet"), bd=$("#sheet-backdrop");
  sh.classList.add("sh-out"); bd.classList.add("mback-out");
  setTimeout(()=>{ sh.classList.add("hidden"); bd.classList.add("hidden");
    sh.classList.remove("sh-out"); bd.classList.remove("mback-out"); },190);
}

function openMealPicker(meal){
  const foodName=f=> S.lang==="my"? f.my : f.en;
  const renderList=q=>{
    const list=window.F1T_FOODS.filter(f=>!q||foodName(f).toLowerCase().includes(q.toLowerCase())).slice(0,30);
    $("#food-list").innerHTML=list.map(f=>`<button class="food-row" data-id="${f.id}">
      <span class="f-ico">${ic(f.ic,22)}</span><span class="f-info"><b>${foodName(f)}</b><small>P ${f.p}g · C ${f.c}g · F ${f.f}g</small></span>
      <span class="f-kcal">${f.kcal}</span></button>`).join("") ||
      `<div class="empty-note">${t("noMeals")}</div>`;
    $$("#food-list .food-row").forEach(b=>b.onclick=()=>addFood(meal, window.F1T_FOODS.find(f=>f.id===b.dataset.id)));
  };
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t(meal)} · ${t("addFood")}</h2>
    <input class="search" id="food-q" placeholder="${t("searchFood")}">
    <div id="food-list"></div>
    <div class="or"><span>${t("or")}</span></div>
    <div class="field"><label>${t("customFood")} · ${t("foodName")}</label><input id="cf-name" placeholder="${t("foodName")}"></div>
    <div class="qty-row"><input id="cf-kcal" type="number" inputmode="numeric" placeholder="${t("calories")} (${t("kcal")})">
      <button class="btn-lime" id="cf-add" style="width:auto;padding:14px 26px">${t("add")}</button></div>
    </div></div>`;
  renderList("");
  $("#food-q").oninput=e=>renderList(e.target.value);
  $("#cf-add").onclick=()=>{ const n=$("#cf-name").value.trim(), k=+$("#cf-kcal").value||0;
    if(!n||!k) return; addFood(meal,{id:"c"+Date.now(),en:n,my:n,kcal:k,p:0,c:0,f:0,ic:"utensils"}); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function addFood(meal,f){
  S.day.meals[meal].push({id:f.id,name:f.en,name_my:f.my,kcal:f.kcal,p:f.p,c:f.c,f:f.f,ic:f.ic||"utensils",at:Date.now()});
  S.day.kcal+=f.kcal; S.day.p+=f.p; S.day.c+=f.c; S.day.f+=f.f;
  saveDay(); closeModal(); successPop(); toast(t("logged")); renderHome();
}
function openWater(){
  const MAX=4000, STEP=250;
  let ml=Math.round((S.day.water||0)/STEP)*STEP;
  const ticks=[0,1000,2000,3000,4000].map(v=>`<span>${v>=1000?(v/1000)+"k":v}</span>`).join("");
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2 class="rch-title">${t("drinkWater")}.</h2>
    <div class="rch-val"><b id="w-n">${ml}</b><small>ml</small></div>
    <div class="rch-track" id="rch-track">
      <div class="rch-ticks">${ticks}</div>
      <div class="rch-fill" id="rch-fill"></div>
    </div>
    <p class="gslider-cap">1 ${t("cups").replace(/s$/,"")} = 250 ml</p>
    <button class="btn-lime" id="w-save">${t("save")}</button></div></div>`;
  const track=$("#rch-track"), fill=$("#rch-fill"), num=$("#w-n");
  const paint=()=>{ fill.style.width=(ml/MAX*100)+"%"; num.textContent=ml; };
  const setFromEvent=e=>{
    const r=track.getBoundingClientRect();
    const x=(e.touches&&e.touches[0]?e.touches[0].clientX:e.clientX)-r.left;
    ml=Math.min(MAX,Math.max(0,Math.round(x/r.width*MAX/STEP)*STEP));
    paint();
  };
  let drag=false;
  track.addEventListener("pointerdown",e=>{ drag=true; track.setPointerCapture(e.pointerId); setFromEvent(e); });
  track.addEventListener("pointermove",e=>{ if(drag) setFromEvent(e); });
  track.addEventListener("pointerup",()=>{ drag=false; });
  track.addEventListener("pointercancel",()=>{ drag=false; });
  requestAnimationFrame(()=>requestAnimationFrame(paint));
  $("#w-save").onclick=()=>{ S.day.water=ml; saveDay(); closeModal(); successPop(); toast(t("logged")); renderHome(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openWeight(){
  const startW=S.profile.w||70;
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("scale",22)} ${t("logWeight")}</h2>
    <div class="gslider-val"><b id="wt-big">${startW}</b> <small>${t("kg")}</small></div>
    <div class="gslider-row" id="wt-slider"></div>
    <div class="field"><label>${t("weight")} (${t("kg")})</label><input id="wt-v" type="number" inputmode="decimal" value="${S.profile.w||""}"></div>
    <button class="btn-lime" id="wt-save">${t("save")}</button></div></div>`;
  const sl=initGlassSlider($("#wt-slider"),{min:30,max:150,step:.5,value:startW,label:t("logWeight"),
    display:v=>{ $("#wt-big").textContent=v; const i=$("#wt-v"); if(document.activeElement!==i) i.value=v; }});
  $("#wt-v").addEventListener("input",e=>{ const v=parseFloat(e.target.value);
    if(v>=30&&v<=150){ sl.set(v); $("#wt-big").textContent=v; } });
  $("#wt-save").onclick=async()=>{ const v=+$("#wt-v").value; if(v>0){ S.profile.w=v; S.day.weight=v; saveDay();
    await window.F1TFB.saveProfile(S.profile); } closeModal(); successPop(); toast(t("logged")); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openSteps(){
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("footprints",22)} ${t("logSteps")}</h2>
    <div class="field"><label>${t("stepsToWalk")}</label><input id="st-v" type="number" inputmode="numeric" value="${S.day.steps||""}"></div>
    <button class="btn-lime" id="st-save">${t("save")}</button></div></div>`;
  $("#st-save").onclick=()=>{ S.day.steps=+$("#st-v").value||0; saveDay(); closeModal(); successPop(); toast(t("logged")); renderHome(); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
/* ---------- customizable avatar ---------- */
const AV_COLORS=["#22c55e","#aefe02","#16a34a","#e5484d","#1a1a1a"];
function avatarHTML(p,extra){
  p=p||{};
  if(p.avatarImg) return `<div class="avatar ${extra||""}"><img class="avatar-img" src="${p.avatarImg}" alt=""></div>`;
  const col=p.avatarColor||"#22c55e";
  const ch=((p.name||"F")[0]||"F").toUpperCase();
  const dark=col==="#aefe02"?"color:#0d0d0d;":"";
  return `<div class="avatar ${extra||""}" style="background:${col};${dark}">${ch}</div>`;
}
function openAvatarSheet(){
  const p=S.profile||{};
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("user",22)} ${t("avatarPhoto")}</h2>
    <div style="display:flex;justify-content:center;margin-bottom:8px"><div class="avatar-wrap" style="transform:scale(1.4);margin:12px">${avatarHTML(p)}</div></div>
    <div class="av-colors">${AV_COLORS.map(c=>`<button data-c="${c}" class="${(p.avatarColor||"#22c55e")===c?"on":""}" style="background:${c}"></button>`).join("")}</div>
    <div class="sheet-grid" style="margin-top:14px">
      <button class="sheet-opt" id="av-take">${ic("camera",22)}${t("takePhoto")}</button>
      <button class="sheet-opt" id="av-upload">${ic("upload",22)}${t("uploadPhoto")}</button>
      ${p.avatarImg?`<button class="sheet-opt" id="av-remove">${ic("x",22)}${t("removePhoto")}</button>`:""}
    </div>
    <input type="file" id="av-file" accept="image/*" class="hidden">
    <button class="btn-lime" id="m-ok" style="margin-top:14px">${t("done")}</button></div></div>`;
  const save=async()=>{ await window.F1TFB.saveProfile(S.profile); openAvatarSheet(); renderProfile(); };
  $$("#modal-root .av-colors button").forEach(b=>b.onclick=()=>{ S.profile.avatarColor=b.dataset.c; save(); });
  $("#av-take").onclick=()=>{ const f=$("#av-file"); f.setAttribute("capture","user"); f.click(); };
  $("#av-upload").onclick=()=>{ const f=$("#av-file"); f.removeAttribute("capture"); f.click(); };
  $("#av-file").onchange=async e=>{
    const file=e.target.files[0]; if(!file) return;
    const url=await downscalePhoto(file,160);
    if(url){ S.profile.avatarImg=url; await window.F1TFB.saveProfile(S.profile); }
    openAvatarSheet(); renderProfile();
  };
  const rm=$("#av-remove"); if(rm) rm.onclick=()=>{ delete S.profile.avatarImg; save(); };
  $("#m-ok").onclick=closeModal; $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function downscalePhoto(file,maxSize){
  return new Promise(res=>{
    try{
      const img=new Image();
      img.onload=()=>{
        const max=maxSize||640; let w=img.width,h=img.height;
        if(w>max||h>max){ const r=Math.min(max/w,max/h); w=Math.round(w*r); h=Math.round(h*r); }
        const c=document.createElement("canvas"); c.width=w||1; c.height=h||1;
        c.getContext("2d").drawImage(img,0,0,c.width,c.height);
        try{ URL.revokeObjectURL(img.src); }catch(e){}
        res(c.toDataURL("image/jpeg",0.72));
      };
      img.onerror=()=>res(null);
      img.src=URL.createObjectURL(file);
    }catch(e){ res(null); }
  });
}
function openCamera(){
  let meal="snacks", photo=null;
  const meals=["breakfast","lunch","dinner","snacks"];
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("camera",22)} ${t("takePhoto")}</h2>
    <div class="cam-preview" id="cam-prev"><span>${ic("camera",40)}</span></div>
    <input type="file" id="cam-file" accept="image/*" capture="environment" class="hidden">
    <div class="seg-sm" style="margin-bottom:12px">${meals.map(m=>`<button data-m="${m}" class="${m===meal?"on":""}">${t(m)}</button>`).join("")}</div>
    <div class="field"><label>${t("foodName")}</label><input id="cam-name" placeholder="${t("foodName")}"></div>
    <div class="qty-row"><input id="cam-kcal" type="number" inputmode="numeric" placeholder="${t("calories")} (${t("kcal")})">
      <button class="btn-lime" id="cam-save" style="width:auto;padding:14px 26px">${t("add")}</button></div>
    <button class="btn-glass full" id="cam-snap">${t("takePhoto")}</button></div></div>`;
  $$("#modal-root .seg-sm button").forEach(b=>b.onclick=()=>{ meal=b.dataset.m;
    $$("#modal-root .seg-sm button").forEach(x=>x.classList.toggle("on",x===b)); });
  $("#cam-snap").onclick=()=>$("#cam-file").click();
  $("#cam-file").onchange=async e=>{
    const f=e.target.files&&e.target.files[0]; if(!f) return;
    const url=await downscalePhoto(f);
    if(url){ photo=url; $("#cam-prev").innerHTML=`<img src="${url}" alt="">`; $("#cam-snap").textContent=t("retake"); }
  };
  $("#cam-save").onclick=()=>{
    const n=$("#cam-name").value.trim()||t("takePhoto"), k=+$("#cam-kcal").value||0;
    if(!k||!photo) return;
    S.day.meals[meal].push({id:"p"+Date.now(),name:n,name_my:n,kcal:k,p:0,c:0,f:0,ic:"camera",photo,at:Date.now()});
    S.day.kcal+=k; saveDay(); closeModal(); successPop(); toast(t("logged")); renderHome();
  };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openExercise(){
  let h=S.day.exercise||0;
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("activity",22)} ${t("logExercise")}</h2>
    <div class="gslider-val"><b id="ex-n">${h.toFixed(1)}</b> <small>${t("hours")}</small></div>
    <div class="gslider-row" id="ex-slider"></div>
    <button class="btn-lime" id="ex-save">${t("save")}</button></div></div>`;
  initGlassSlider($("#ex-slider"),{min:0,max:24,step:.5,value:h,label:t("logExercise"),
    display:v=>{ h=v; $("#ex-n").textContent=v.toFixed(1); }});
  $("#ex-save").onclick=()=>{ S.day.exercise=h; saveDay(); closeModal(); successPop(); toast(t("logged")); show(S.view); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}
function openBpm(){
  let v=S.day.bpm||70;
  const draw=()=>{ $("#bp-n").textContent=v; };
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("heart",22)} ${t("logBpm")}</h2><p style="text-align:center;color:var(--ink2);font-weight:600">${t("bpm")}</p>
    <div class="stepper"><button id="bp-m">−</button><b id="bp-n">${v}</b><button id="bp-p">+</button></div>
    <button class="btn-lime" id="bp-save">${t("save")}</button></div></div>`;
  $("#bp-m").onclick=()=>{ v=Math.max(40,v-1); draw(); };
  $("#bp-p").onclick=()=>{ v=Math.min(220,v+1); draw(); };
  $("#bp-save").onclick=()=>{ S.day.bpm=v; saveDay(); closeModal(); successPop(); toast(t("logged")); show(S.view); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}

/* ---------- boot ---------- */
function initNav(){
  $$("[data-goto]").forEach(b=>{ if(b.id!=="tab-add") b.onclick=()=>show(b.dataset.goto); });
  $("#tab-add").onclick=openSheet;
  $("#sheet-close").onclick=closeSheet;
  $("#sheet-backdrop").onclick=closeSheet;
  /* designed icons */
  const tg={home:"home",coach:"chat",profile:"user",settings:"gear"};
  $$("#tabbar .tab[data-goto] .t-ico").forEach(el=>{ el.innerHTML=ic(tg[el.closest(".tab").dataset.goto]||"home",22); });
  $("#tab-add .t-ico").innerHTML=ic("plus",30);
  $$(".page-head .back").forEach(b=>{ b.innerHTML=ic("chevL",22); });
  $$(".page-head .more").forEach(b=>{ b.innerHTML=ic("more",20); b.onclick=openWeekPick; });
}
async function boot(){
  applyTheme(); applyI18n(); initAuth(); initNav();
  let redirErr=null;
  try{ await window.F1TFB.redirectResult(); }catch(e){ redirErr=e; }
  setTimeout(async()=>{
    let landed=false;
    window.F1TFB.onAuth(async u=>{
      if(landed) return; landed=true;
      S.user=u||null;
      if(u || S.guest){
        if(u){ S.guest=false; try{ store.del("f1t_guest"); }catch(e){} }
        await loadAll();
        if(u){ try{ await window.F1TFB.pushLocalToCloud(); }catch(e){} }
        enter();
      }
      else { show("auth"); if(redirErr) authErr(googleErrMsg(redirErr)); }
    });
    // fallback if firebase unavailable
    setTimeout(async()=>{ if(!landed){ landed=true;
      if(S.guest){ await loadAll(); enter(); }
      else { show("auth"); if(redirErr) authErr(googleErrMsg(redirErr)); } } }, 3500);
  }, 900);
  if(navigator.serviceWorker && navigator.serviceWorker.register){ try{ navigator.serviceWorker.register("sw.js").catch(()=>{}); }catch(e){} }
}
document.addEventListener("DOMContentLoaded", boot);
window.F1T={state:S,show,applyLang:applyI18n,t,ic:(n,s)=>window.f1tIcon(n,s)};

/* ================= WORKOUT (v8) ================= */
const WO = () => window.F1T_WORKOUT;

/* ---------- hub: start workout or quick log ---------- */
function openWorkoutHub(){
  const rs=S.restSec||45;
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${ic("dumbbell",22)} ${t("workout")}</h2>
    <button class="wo-hub" id="wo-start"><span class="wo-hub-ic">${ic("play",26)}</span>
      <span class="wo-hub-tx"><b>${t("startWorkout")}</b><small>${t("startWorkoutSub")}</small></span><span class="chev">›</span></button>
    <button class="wo-hub" id="wo-quick"><span class="wo-hub-ic">${ic("clock",26)}</span>
      <span class="wo-hub-tx"><b>${t("quickLog")}</b><small>${t("quickLogSub")}</small></span><span class="chev">›</span></button>
    <div class="gslider-val" style="font-size:26px"><b id="rs-n">${rs}</b> <small>s · ${t("rest")}</small></div>
    <div class="gslider-row" id="rs-slider"></div>
    <button class="btn-glass full" id="wo-cancel">${t("cancel")}</button></div></div>`;
  initGlassSlider($("#rs-slider"),{min:15,max:180,step:15,value:rs,red:true,label:t("rest"),
    display:v=>{ S.restSec=v; $("#rs-n").textContent=v; }});
  $("#wo-start").onclick=openMusclePicker;
  $("#wo-quick").onclick=()=>{ closeModal(); openExercise(); };
  $("#wo-cancel").onclick=closeModal;
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}

/* ---------- muscle picker ---------- */
function openMusclePicker(){
  const sel=new Set(); let side="front";
  const draw=()=>{
    const list=side==="front"?WO().FRONT_MUSCLES:WO().BACK_MUSCLES;
    $("#wo-mpills").innerHTML=list.map(m=>{
      const on=sel.has(m);
      return `<button class="wo-pill ${on?"on":""}" data-m="${m}">
        <span class="wo-ck">${on?ic("check",13):""}</span>${ic(WO().MUSCLES.find(x=>x.id===m).ic,20)}${t("muscle_"+m)}</button>`;
    }).join("");
    $("#wo-bodymap").innerHTML=WO().bodySVG(sel,side);
    $$("#wo-mpills .wo-pill").forEach(b=>b.onclick=()=>{ const m=b.dataset.m;
      sel.has(m)?sel.delete(m):sel.add(m); draw(); });
    $("#wo-done").style.display=sel.size?"":"none";
  };
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal modal-tall"><div class="sheet-grip"></div>
    <h2>${t("targetMuscle")}</h2><p class="wo-sub">${t("selectMuscles")}</p>
    <div class="seg-sm wo-seg"><button data-s="front" class="on">${t("frontSide")}</button><button data-s="back">${t("backSide")}</button></div>
    <div class="wo-picker"><div id="wo-bodymap" class="wo-map"></div>
      <div id="wo-mpills" class="wo-pills"></div></div>
    <button class="btn-lime" id="wo-done" style="display:none">${t("finished")}</button></div></div>`;
  draw();
  $$(".wo-seg button").forEach(b=>b.onclick=()=>{ side=b.dataset.s;
    $$(".wo-seg button").forEach(x=>x.classList.toggle("on",x===b)); draw(); });
  $("#wo-done").onclick=()=>openExercisePicker(sel);
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}

/* ---------- exercise picker ---------- */
function openExercisePicker(selMuscles){
  const picked=[];
  const pool=WO().EXERCISES.filter(e=>!selMuscles.size||selMuscles.has(e.m));
  const draw=q=>{
    const rows=pool.filter(e=>!q||e.en.toLowerCase().includes(q.toLowerCase()));
    $("#wo-exlist").innerHTML=rows.map(e=>{
      const on=picked.includes(e.id);
      return `<button class="food-row wo-exrow ${on?"on":""}" data-id="${e.id}">
        <span class="f-ico">${ic("dumbbell",20)}</span>
        <span class="f-info"><b>${e.en}</b><small>${t("muscle_"+e.m)}</small></span>
        <span class="wo-add">${on?ic("check",18):"+"}</span></button>`;
    }).join("")||`<div class="empty-note">${t("noResults")}</div>`;
    $$("#wo-exlist .wo-exrow").forEach(b=>b.onclick=()=>{ const id=b.dataset.id;
      const i=picked.indexOf(id); i>=0?picked.splice(i,1):picked.push(id); draw($("#wo-search").value); });
    $("#wo-gobtn").style.display=picked.length?"":"none";
    $("#wo-count").textContent=picked.length?` (${picked.length})`:"";
  };
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal modal-tall"><div class="sheet-grip"></div>
    <h2>${t("addExercises")}<span id="wo-count"></span></h2>
    <input class="search" id="wo-search" placeholder="${t("searchExercises")}" autocomplete="off">
    <div id="wo-exlist" class="wo-exlist"></div>
    <button class="btn-lime" id="wo-gobtn" style="display:none">${t("start")}</button></div></div>`;
  draw("");
  $("#wo-search").oninput=e=>draw(e.target.value);
  $("#wo-gobtn").onclick=()=>openActiveWorkout(picked.map(id=>WO().EXERCISES.find(e=>e.id===id)));
  $("#mback").onclick=e=>{ if(e.target.id==="mback") closeModal(); };
}

/* ---------- active workout ---------- */
let WO_SESS=null, WO_IV=null;
function woElapsed(){
  const s=WO_SESS; if(!s) return 0;
  return Date.now()-s.startTs-s.paused-(s.pauseStart?Date.now()-s.pauseStart:0);
}
function woFmt(ms){
  const s=Math.max(0,Math.floor(ms/1000));
  return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
}
function openActiveWorkout(exList){
  WO_SESS={ startTs:Date.now(), paused:0, pauseStart:0,
    exercises:exList.map(e=>({exId:e.id,name:e.en,muscle:e.m,sets:[{kg:"",reps:"",done:false}]})) };
  renderActiveWorkout();
  clearInterval(WO_IV);
  WO_IV=setInterval(()=>{ const el=$("#wo-timer"); if(el) el.textContent=woFmt(woElapsed()); },500);
}
function setRowHTML(ex,xi,si,set){
  const isTime=WO().EXERCISES.find(e=>e.id===ex.exId)?.type==="time";
  return `<div class="wo-set ${set.done?"done":""}">
    <span class="wo-setn">${si+1}</span>
    ${isTime?`<input inputmode="numeric" data-x="${xi}" data-s="${si}" data-f="reps" placeholder="${t("secs")}" value="${set.reps}">`
      :`<input inputmode="decimal" data-x="${xi}" data-s="${si}" data-f="kg" placeholder="kg" value="${set.kg}">
        <input inputmode="numeric" data-x="${xi}" data-s="${si}" data-f="reps" placeholder="${t("reps")}" value="${set.reps}">`}
    <button class="wo-setdone" data-x="${xi}" data-s="${si}">${ic("check",16)}</button></div>`;
}
function renderActiveWorkout(){
  const s=WO_SESS; if(!s) return;
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal modal-tall wo-modal"><div class="sheet-grip"></div>
    <div class="wo-top"><div><div class="wo-timer" id="wo-timer">${woFmt(woElapsed())}</div><small>${t("workout")}</small></div>
      <button class="ico-btn" id="wo-pause">${ic(s.pauseStart?"play":"pause",20)}</button></div>
    <div id="wo-exs">${s.exercises.map((ex,xi)=>`
      <div class="wo-ex"><div class="wo-exhead"><b>${ex.name}</b><small>${t("muscle_"+ex.muscle)}</small>
        <button class="wo-rmex" data-x="${xi}" aria-label="remove">×</button></div>
        <div class="wo-sets" id="wo-sets-${xi}">${ex.sets.map((set,si)=>setRowHTML(ex,xi,si,set)).join("")}</div>
        <button class="wo-addset" data-x="${xi}">+ ${t("addSet")}</button></div>`).join("")}</div>
    <button class="btn-glass full" id="wo-addex">+ ${t("addExercises")}</button>
    <button class="btn-lime" id="wo-finish">${t("finishWorkout")}</button></div></div>`;
  // wire inputs
  $$("#wo-exs input").forEach(inp=>inp.onchange=()=>{
    WO_SESS.exercises[+inp.dataset.x].sets[+inp.dataset.s][inp.dataset.f]=inp.value; });
  $$(".wo-setdone").forEach(b=>b.onclick=()=>{
    const ex=WO_SESS.exercises[+b.dataset.x], set=ex.sets[+b.dataset.s];
    set.done=!set.done; renderActiveWorkout(); if(set.done) openRestTimer(S.restSec||45); });
  $$(".wo-addset").forEach(b=>b.onclick=()=>{ WO_SESS.exercises[+b.dataset.x].sets.push({kg:"",reps:"",done:false}); renderActiveWorkout(); });
  $$(".wo-rmex").forEach(b=>b.onclick=()=>{ WO_SESS.exercises.splice(+b.dataset.x,1); renderActiveWorkout(); });
  $("#wo-pause").onclick=()=>{ const s2=WO_SESS;
    if(s2.pauseStart){ s2.paused+=Date.now()-s2.pauseStart; s2.pauseStart=0; }
    else s2.pauseStart=Date.now(); renderActiveWorkout(); };
  $("#wo-addex").onclick=()=>openExercisePickerAdd();
  $("#wo-finish").onclick=finishWorkout;
  $("#mback").onclick=e=>{ if(e.target.id==="mback"){ if(confirm(t("discardWorkout")+"?")){ clearInterval(WO_IV); WO_SESS=null; closeModal(); } } };
}
function openExercisePickerAdd(){
  // simplified add: reuse picker, then merge back into session
  const existing=WO_SESS.exercises.map(e=>e.exId);
  const keep=WO_SESS;
  openExercisePicker(new Set());
  const orig=$("#wo-gobtn").onclick;
  $("#wo-gobtn").onclick=()=>{
    const ids=[...document.querySelectorAll("#wo-exlist .wo-exrow.on")].map(b=>b.dataset.id)
      .filter(id=>!existing.includes(id));
    WO_SESS=keep;
    ids.forEach(id=>{ const e=WO().EXERCISES.find(x=>x.id===id);
      WO_SESS.exercises.push({exId:e.id,name:e.en,muscle:e.m,sets:[{kg:"",reps:"",done:false}]}); });
    renderActiveWorkout();
  };
}
/* rest timer overlay */
function openRestTimer(sec){
  if($("#rest-ov")) $("#rest-ov").remove();
  let left=sec;
  const ov=document.createElement("div"); ov.id="rest-ov";
  ov.innerHTML=`<div class="rest-card"><div class="rest-ring"><svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="10"/>
      <circle id="rest-arc" cx="60" cy="60" r="52" fill="none" stroke="#aefe02" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${2*Math.PI*52}" stroke-dashoffset="0" transform="rotate(-90 60 60)"/></svg>
      <div class="rest-t" id="rest-t">${left}</div></div>
    <div class="rest-label">${t("rest")}</div>
    <div class="rest-btns"><button id="rest-plus">+15s</button><button id="rest-skip" class="on">${t("skip")}</button></div></div>`;
  document.body.appendChild(ov);
  const C=2*Math.PI*52;
  const iv=setInterval(()=>{ left--;
    const te=$("#rest-t"); if(!te){ clearInterval(iv); return; }
    te.textContent=Math.max(0,left);
    const arc=$("#rest-arc"); if(arc) arc.style.strokeDashoffset=C*(1-Math.max(0,left)/sec);
    if(left<=0){ clearInterval(iv); ov.remove(); }
  },1000);
  $("#rest-skip").onclick=()=>{ clearInterval(iv); ov.remove(); };
  $("#rest-plus").onclick=()=>{ left+=15; };
}
function finishWorkout(){
  const s=WO_SESS; if(!s) return;
  clearInterval(WO_IV);
  const durMin=Math.max(1,Math.round(woElapsed()/60000));
  const weight=(S.profile&&S.profile.w)||70;
  const w={ ts:Date.now(), date:WO().todayKey(), durationMin:durMin,
    exercises:s.exercises.filter(e=>e.sets.some(x=>x.done||x.reps||x.kg))
      .map(e=>({exId:e.exId,name:e.name,muscle:e.muscle,
        sets:e.sets.filter(x=>x.done||x.reps||x.kg).map(x=>({kg:parseFloat(x.kg)||0,reps:parseFloat(x.reps)||0}))})) };
  if(!w.exercises.length){ WO_SESS=null; closeModal(); return; }
  w.kcal=WO().estKcal(durMin,w.exercises,weight);
  WO().saveWorkout(w); WO_SESS=null;
  const vol=w.exercises.reduce((a,e)=>a+e.sets.reduce((b,x)=>b+x.kg*x.reps,0),0);
  $("#modal-root").innerHTML=`<div class="mback" id="mback"><div class="modal"><div class="sheet-grip"></div>
    <h2>${t("workoutSummary")}</h2>
    <div class="stat-grid">
      <div class="glass-card stat-tile"><div class="t-top">${ic("clock",20)} ${t("totalTime")}</div><div class="t-big">${durMin}<small> ${t("min")}</small></div></div>
      <div class="glass-card stat-tile"><div class="t-top">${ic("dumbbell",20)} ${t("exercises")}</div><div class="t-big">${w.exercises.length}</div></div>
    </div>
    <div class="glass-card stat-tile" style="margin-top:12px"><div class="t-top">${ic("scale",20)} ${t("totalVolume")}</div><div class="t-big">${fmt(Math.round(vol))}<small> kg</small></div></div>
    <div class="glass-card stat-tile" style="margin-top:12px"><div class="t-top">${ic("zap",20)} ${t("calories")}</div><div class="t-big">${fmt(w.kcal)}<small> kcal</small></div></div>
    <button class="btn-lime" id="wo-ok" style="margin-top:16px">${t("done")}</button></div></div>`;
  $("#wo-ok").onclick=()=>{ closeModal(); successPop(); toast(t("workoutSaved")); show(S.view); };
  $("#mback").onclick=e=>{ if(e.target.id==="mback"){ closeModal(); show(S.view); } };
}

/* ---------- workout statistics ---------- */
function woMonthCal(){
  const W=WO(), now=new Date(), y=now.getFullYear(), m=now.getMonth();
  const days=new Set(W.loadAll().map(w=>w.date));
  const first=new Date(y,m,1), startDow=(first.getDay()+6)%7, dim=new Date(y,m+1,0).getDate();
  const mn=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"][m];
  let cells="";
  for(let i=0;i<startDow;i++) cells+=`<span class="wc-empty"></span>`;
  for(let d=1;d<=dim;d++){
    const k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const isT=k===W.todayKey();
    cells+=`<span class="wc-day ${days.has(k)?"hit":""} ${isT?"today":""}">${d}</span>`;
  }
  return `<div class="wc-head"><b>${t(mn)} ${y}</b></div>
    <div class="wc-grid">${["mo","tu","we","th","fr","sa","su"].map(d=>`<span class="wc-dow">${t(d)}</span>`).join("")}${cells}</div>`;
}
function renderWorkoutStats(){
  const W=WO(), range=S.woRange||"month";
  const st=W.rangeStats(range), total=W.loadAll().length;
  const lp=W.levelProgress(total), ws=W.weekStreak();
  const trained=new Set(Object.keys(st.byMuscle));
  $("#stats-body").innerHTML=`
    <div class="seg-sm wo-segmain"><button data-st="nutrition">${t("nutrition")}</button><button data-st="workouts" class="on">${t("workouts")}</button></div>
    <div class="seg-sm wo-range">${["week","month","year","all"].map(r=>`<button data-r="${r}" class="${r===range?"on":""}">${t("rng_"+r)}</button>`).join("")}</div>
    <div class="stat-grid">
      <div class="glass-card stat-tile xcard-src" data-kind="workouts"><div class="t-top">${ic("dumbbell",20)} ${t("workouts")}</div><div class="t-big">${st.count}</div></div>
      <div class="glass-card stat-tile xcard-src" data-kind="minutes"><div class="t-top">${ic("clock",20)} ${t("totalTime")}</div><div class="t-big">${st.minutes}<small> ${t("min")}</small></div></div>
    </div>
    <div class="glass-card stat-tile xcard-src" data-kind="volume" style="margin-top:12px"><div class="t-top">${ic("scale",20)} ${t("totalVolume")}</div><div class="t-big">${fmt(st.volume)}<small> kg</small></div></div>
    <div class="streak-pill" style="margin:14px auto">${ic("flame",18)}<b>${ws}</b><span>${t("weekStreak")}</span></div>
    <div class="glass-card level-card depth-3d tilt"><div class="lc-label">${t("yourLevel")}</div>
      <div class="lc-level">${t("level_"+lp.level)}</div>
      <div class="lc-barwrap"><div class="lc-bar"><i style="width:${lp.pct}%"></i></div>
        <small>${lp.next?t("nextLevel",{n:lp.next}):t("maxLevel")}</small></div>
      <div class="lc-bodies">${W.bodySVG(trained,"front")}${W.bodySVG(trained,"back")}</div>
      <div class="lc-legend">${["elite","pro","athlete","contender","rookie"].map(l=>`<span><i class="ldot l-${l}"></i>${t("level_"+l)}</span>`).join("")}</div></div>
    <div class="glass-card cal-card">${woMonthCal()}</div>
    ${st.count?"":`<div class="empty-note">${t("noWorkouts")}</div>`}`;
  $$(".wo-segmain button").forEach(b=>b.onclick=()=>{ S.statsTab=b.dataset.st; renderStats(); });
  $$(".wo-range button").forEach(b=>b.onclick=()=>{ S.woRange=b.dataset.r; renderWorkoutStats(); });
  $$("#stats-body .xcard-src").forEach(c=>c.onclick=()=>openWoStatDetail(c.dataset.kind, c));
}


/* ================= v9 · iOS design: glass slider + 3D tilt ================= */

/* Liquid-glass slider. mount: element to fill. opt: {min,max,step,value,red,display,onInput} */
function initGlassSlider(mount, opt){
  mount.innerHTML=`<div class="gslider" role="slider" tabindex="0" aria-valuemin="${opt.min}" aria-valuemax="${opt.max}" aria-label="${opt.label||"slider"}">
    <div class="gslider-fill${opt.red?" red":""}"></div><div class="gslider-thumb"></div></div>`;
  const el=mount.firstChild, fill=el.querySelector(".gslider-fill"), thumb=el.querySelector(".gslider-thumb");
  let val=opt.value;
  const fix=v=>Math.round(v*1000)/1000;
  function render(){
    const pct=(val-opt.min)/(opt.max-opt.min)*100;
    fill.style.width=pct+"%";
    thumb.style.left=`calc(${pct}% - 21px)`;
    el.setAttribute("aria-valuenow",val);
    if(opt.display) opt.display(val);
  }
  function commit(nv){
    nv=fix(Math.round(nv/opt.step)*opt.step);
    nv=Math.max(opt.min,Math.min(opt.max,nv));
    if(nv!==val){ val=nv; render(); opt.onInput&&opt.onInput(nv); }
  }
  function fromX(x){
    const r=el.getBoundingClientRect();
    commit(opt.min+((x-r.left)/r.width)*(opt.max-opt.min));
  }
  el.addEventListener("pointerdown",e=>{
    e.preventDefault();
    try{ el.setPointerCapture(e.pointerId); }catch(_){}
    fromX(e.clientX);
    const mv=ev=>fromX(ev.clientX);
    el.addEventListener("pointermove",mv);
    const done=()=>el.removeEventListener("pointermove",mv);
    el.addEventListener("pointerup",done,{once:true});
    el.addEventListener("pointercancel",done,{once:true});
  });
  el.addEventListener("keydown",e=>{
    let d=0;
    if(e.key==="ArrowRight"||e.key==="ArrowUp") d=opt.step;
    else if(e.key==="ArrowLeft"||e.key==="ArrowDown") d=-opt.step;
    else if(e.key==="Home"){ commit(opt.min); e.preventDefault(); return; }
    else if(e.key==="End"){ commit(opt.max); e.preventDefault(); return; }
    else return;
    commit(fix(val+d)); e.preventDefault();
  });
  render();
  return { get:()=>val, set:v=>commit(v) };
}

/* 3D tilt on hero cards (fine pointers only; CSS gates it) */
/* sliding bubble indicator for the tab bar: measures the active tab and springs to it */
function moveBubble(){
  const bar=$("#tabbar"), b=$("#tab-bubble");
  const act=bar?bar.querySelector('.tab.on[data-goto]'):null;
  if(!bar||!b||!act){ return; }
  const place=()=>{
    const br=bar.getBoundingClientRect(), r=act.getBoundingClientRect();
    if(r.width===0) return;
    const z=act.offsetWidth?r.width/act.offsetWidth:1; /* body zoom compensation */
    b.style.left=Math.max(0,(r.left-br.left)/z-6)+"px";
    b.style.width=(r.width/z+12)+"px";
  };
  requestAnimationFrame(place);
  /* re-measure after the label finishes expanding so the bubble lands exactly */
  clearTimeout(b._t); b._t=setTimeout(place,420);
}
window.addEventListener("resize",()=>{ moveBubble(); });
/* hide the tab bar while the keyboard is open (chat, search, forms) */
document.addEventListener("focusin",e=>{
  if(e.target&&(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")) document.body.classList.add("kb");
});
document.addEventListener("focusout",()=>document.body.classList.remove("kb"));
function initTilt(scope){  if(!window.matchMedia||!matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  (scope||document).querySelectorAll(".tilt").forEach(card=>{
    if(card._tilt) return; card._tilt=true;
    card.addEventListener("pointermove",e=>{
      const r=card.getBoundingClientRect();
      const rx=((e.clientY-r.top)/r.height-.5)*-7;
      const ry=((e.clientX-r.left)/r.width-.5)*9;
      card.style.transform=`perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
    });
    card.addEventListener("pointerleave",()=>{ card.style.transform=""; });
  });
}

/* ================= v9 · Lift-style animations: expandable cards, count-up, success pop ================= */

/* animated number count-up */
function countUp(el, to, dur, format, from){
  dur=dur||900; format=format||(v=>fmt(Math.round(v))); from=(from==null?0:from);
  const t0=performance.now();
  function f(now){
    const p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,3);
    el.textContent=format(from+(to-from)*e);
    if(p<1) requestAnimationFrame(f); else el.textContent=format(to);
  }
  requestAnimationFrame(f);
}

/* expand a card into a detail sheet (FLIP zoom from its rect) */
function expandCard(src, html){
  const r=src.getBoundingClientRect();
  /* zoom-robust: measure everything in pre-zoom px (rects are post-zoom) */
  const z=(src.offsetWidth&&r.width)?r.width/src.offsetWidth:1;
  const rl=r.left/z, rt=r.top/z, rw=r.width/z, rh=r.height/z;
  const vw=document.documentElement.getBoundingClientRect().width/z;
  const vh=document.documentElement.getBoundingClientRect().height/z;
  const back=document.createElement("div"); back.className="xcard-back";
  const card=document.createElement("div"); card.className="xcard";
  card.innerHTML=`<button class="xcard-x" aria-label="close">×</button><div class="xcard-in">${html}</div>`;
  const W=Math.min(480,vw), H=vh;
  const tw=Math.min(W-24,452), th=Math.min(H*0.74,600);
  const tx=(W-tw)/2, ty=Math.max(56,(H-th)/2-30);
  card.style.left=tx+"px"; card.style.top=ty+"px";
  card.style.width=tw+"px"; card.style.height=th+"px";
  const sx=Math.max(.05,rw/tw), sy=Math.max(.05,rh/th);
  const dx=rl-tx, dy=rt-ty;
  const from=`translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
  card.style.transform=from;
  document.body.append(back,card);
  const prevOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  const inner=card.querySelector(".xcard-in");
  inner.style.opacity="0";
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    back.classList.add("on");
    card.style.transition="transform .55s cubic-bezier(.32,.72,.24,1)";
    card.style.transform="translate(0px,0px) scale(1,1)";
    inner.style.transition="opacity .32s ease .16s"; inner.style.opacity="1";
  }));
  let closed=false;
  function close(){
    if(closed) return; closed=true;
    inner.style.transition="opacity .16s ease"; inner.style.opacity="0";
    card.style.transition="transform .45s cubic-bezier(.32,.72,.24,1)";
    card.style.transform=from;
    back.classList.remove("on");
    setTimeout(()=>{ back.remove(); card.remove(); document.body.style.overflow=prevOverflow; },480);
  }
  back.onclick=close;
  card.querySelector(".xcard-x").onclick=close;
  card.addEventListener("keydown",e=>{ if(e.key==="Escape") close(); });
  return {close, card, inner};
}

/* glowing success check pop on log saves */
function successPop(){
  const d=document.createElement("div"); d.className="spop";
  d.innerHTML=`<div class="ck">${ic("check",44)}</div>`;
  document.body.appendChild(d);
  setTimeout(()=>{ d.classList.add("out"); setTimeout(()=>d.remove(),350); },700);
}

/* ---- workout stat detail sheets ---- */
function woVolOne(w){
  return (w.exercises||[]).reduce((a,e)=>a+(e.sets||[]).reduce((b,s)=>b+(+s.kg||0)*(+s.reps||0),0),0);
}
function openWoStatDetail(kind, src){
  const W=WO(), range=S.woRange||"month";
  const st=W.rangeStats(range);
  const all=W.loadAll();
  let big, label, sub, sec;
  if(kind==="workouts"){
    big=st.count; label=t("workouts");
    sub=`${st.minutes} ${t("min")} · ${fmt(st.volume)} kg`;
    const byD={}; W.workoutsSince(30).forEach(w=>{ byD[w.date]=1; });
    let dots="";
    for(let i=29;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const k=W.dateKey(d.getTime());
      dots+=`<i class="${byD[k]?"on":""}${i===0?" today":""}" style="animation-delay:${(29-i)*20}ms"></i>`;
    }
    sec=`<div class="xc-sec"><h4>${t("xd_last30")}</h4><div class="xc-dots">${dots}</div></div>`;
  }else{
    const isMin=kind==="minutes";
    const weeks=[];
    const now=new Date();
    for(let i=7;i>=0;i--){
      const end=new Date(now); end.setDate(end.getDate()-i*7); end.setHours(23,59,59,999);
      const start=new Date(end); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
      const ws=all.filter(w=>w.ts>=start.getTime()&&w.ts<=end.getTime());
      weeks.push({lab:`${start.getDate()}/${start.getMonth()+1}`,
        val:isMin?Math.round(ws.reduce((a,w)=>a+(w.durationMin||0),0)):Math.round(ws.reduce((a,w)=>a+woVolOne(w),0))});
    }
    const mx=Math.max(1,...weeks.map(x=>x.val));
    big=isMin?st.minutes:st.volume; label=isMin?t("totalTime"):t("totalVolume");
    sub=`${st.count} ${t("workouts")} · ${t("xd_avg")} ${fmt(Math.round(big/Math.max(1,weeks.filter(w=>w.val>0).length||1)))}${isMin?" "+t("min"):" kg"}`;
    sec=`<div class="xc-sec"><h4>${t("xd_byWeek")}</h4><div class="xc-bars">${weeks.map((w,i)=>
      `<div class="xc-bcol"><div class="b" style="height:${Math.max(5,Math.round(w.val/mx*104))}px;animation-delay:${i*55}ms"></div><div class="blab">${w.lab}</div></div>`).join("")}</div></div>`;
  }
  const ex=expandCard(src,`
    <div class="xc-big" id="xc-big">0</div>
    <div class="xc-label">${label}</div>
    <div class="xc-sub">${sub}</div>${sec}
    <div class="xc-substats">
      <div class="ss"><b>${st.count}</b><small>${t("workouts")}</small></div>
      <div class="ss"><b>${st.minutes}</b><small>${t("min")}</small></div>
      <div class="ss"><b>${fmt(st.volume)}</b><small>kg</small></div>
    </div>`);
  countUp(ex.card.querySelector("#xc-big"), big, 950, v=>fmt(Math.round(v)));
}


})();