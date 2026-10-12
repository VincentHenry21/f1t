/* ============ F1T · Workout engine ============ */
(function(){
"use strict";

/* muscle groups */
const MUSCLES=[
  {id:"chest",    ic:"muscle-chest"},
  {id:"back",     ic:"muscle-back"},
  {id:"shoulders",ic:"muscle-shoulder"},
  {id:"biceps",   ic:"muscle-bicep"},
  {id:"triceps",  ic:"muscle-tricep"},
  {id:"legs",     ic:"muscle-leg"},
  {id:"abs",      ic:"muscle-abs"},
];
const FRONT_MUSCLES=["chest","shoulders","biceps","abs","legs"];
const BACK_MUSCLES=["back","shoulders","triceps","legs"];

/* exercise database: id, muscle, type (reps|time), met */
const EXERCISES=[
  // chest
  {id:"pushup",m:"chest",type:"reps",met:8,en:"Push-up"},
  {id:"bench",m:"chest",type:"reps",met:6,en:"Bench Press"},
  {id:"incline",m:"chest",type:"reps",met:6,en:"Incline Dumbbell Press"},
  {id:"fly",m:"chest",type:"reps",met:5,en:"Chest Fly"},
  {id:"dips",m:"chest",type:"reps",met:8,en:"Dips"},
  // back
  {id:"pullup",m:"back",type:"reps",met:8,en:"Pull-up"},
  {id:"row",m:"back",type:"reps",met:6,en:"Bent-over Row"},
  {id:"latpull",m:"back",type:"reps",met:6,en:"Lat Pulldown"},
  {id:"deadlift",m:"back",type:"reps",met:8,en:"Deadlift"},
  {id:"cablerow",m:"back",type:"reps",met:5,en:"Seated Cable Row"},
  // shoulders
  {id:"ohp",m:"shoulders",type:"reps",met:6,en:"Overhead Press"},
  {id:"lateral",m:"shoulders",type:"reps",met:5,en:"Lateral Raise"},
  {id:"frontraise",m:"shoulders",type:"reps",met:5,en:"Front Raise"},
  {id:"arnold",m:"shoulders",type:"reps",met:6,en:"Arnold Press"},
  {id:"shrug",m:"shoulders",type:"reps",met:4,en:"Shrugs"},
  // biceps
  {id:"curl",m:"biceps",type:"reps",met:4,en:"Bicep Curl"},
  {id:"hammer",m:"biceps",type:"reps",met:4,en:"Hammer Curl"},
  {id:"conc",m:"biceps",type:"reps",met:4,en:"Concentration Curl"},
  {id:"chinup",m:"biceps",type:"reps",met:7,en:"Chin-up"},
  // triceps
  {id:"tdip",m:"triceps",type:"reps",met:7,en:"Tricep Dip"},
  {id:"ohext",m:"triceps",type:"reps",met:4,en:"Overhead Extension"},
  {id:"pushdown",m:"triceps",type:"reps",met:4,en:"Pushdown"},
  {id:"diamond",m:"triceps",type:"reps",met:8,en:"Diamond Push-up"},
  // legs
  {id:"squat",m:"legs",type:"reps",met:7,en:"Squat"},
  {id:"lunge",m:"legs",type:"reps",met:6,en:"Lunge"},
  {id:"legpress",m:"legs",type:"reps",met:6,en:"Leg Press"},
  {id:"rdl",m:"legs",type:"reps",met:6,en:"Romanian Deadlift"},
  {id:"calf",m:"legs",type:"reps",met:4,en:"Calf Raise"},
  {id:"legcurl",m:"legs",type:"reps",met:4,en:"Leg Curl"},
  // abs
  {id:"crunch",m:"abs",type:"reps",met:5,en:"Crunch"},
  {id:"plank",m:"abs",type:"time",met:5,en:"Plank"},
  {id:"rtwist",m:"abs",type:"reps",met:6,en:"Russian Twist"},
  {id:"legraise",m:"abs",type:"reps",met:6,en:"Leg Raise"},
  {id:"mtn",m:"abs",type:"time",met:10,en:"Mountain Climber"},
  {id:"situp",m:"abs",type:"reps",met:6,en:"Sit-up"},
];

/* ---------- storage ---------- */
const LS_KEY="f1t_workouts";
function loadAll(){
  try{ return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); }
  catch(e){ return []; }
}
function saveAll(list){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(list)); }catch(e){}
}
function dateKey(ts){
  const d=new Date(ts);
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), dd=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}
function todayKey(){ return dateKey(Date.now()); }

/* save a finished workout; also mirrors into the day doc for cloud sync */
function saveWorkout(w){
  w.id=w.id||("w"+Date.now());
  w.date=w.date||todayKey();
  const list=loadAll(); list.push(w); saveAll(list);
  try{
    if(window.F1TFB){
      const day=window.F1TFB.loadDay(w.date)||{};
      day.workouts=day.workouts||[];
      day.workouts.push(w);
      day.exercise=Math.round(((day.exercise||0)+w.durationMin/60)*10)/10;
      window.F1TFB.saveDay(w.date, day);
    }
  }catch(e){}
  return w;
}
function workoutsOn(key){ return loadAll().filter(w=>w.date===key); }
function workoutsSince(days){
  const cutoff=Date.now()-days*864e5;
  return loadAll().filter(w=>w.ts>=cutoff);
}

/* ---------- stats ---------- */
function statsFor(list){
  const s={count:list.length, minutes:0, volume:0, kcal:0, byMuscle:{}, days:{}};
  list.forEach(w=>{
    s.minutes+=w.durationMin||0; s.kcal+=w.kcal||0;
    s.days[w.date]=true;
    (w.exercises||[]).forEach(ex=>{
      s.byMuscle[ex.muscle]=(s.byMuscle[ex.muscle]||0)+1;
      (ex.sets||[]).forEach(set=>{ s.volume+=(set.kg||0)*(set.reps||0); });
    });
  });
  s.minutes=Math.round(s.minutes); s.volume=Math.round(s.volume); s.kcal=Math.round(s.kcal);
  s.dayCount=Object.keys(s.days).length;
  return s;
}
function rangeStats(range){
  // range: week|month|year|all
  const days=range==="week"?7:range==="month"?30:range==="year"?365:36500;
  return statsFor(workoutsSince(days));
}
function levelFor(total){
  if(total>=50) return "elite";
  if(total>=30) return "pro";
  if(total>=15) return "athlete";
  if(total>=5)  return "contender";
  return "rookie";
}
function levelProgress(total){
  const steps=[0,5,15,30,50];
  let cur=0;
  for(let i=0;i<steps.length;i++){ if(total>=steps[i]) cur=i; }
  const next=steps[cur+1];
  return { level:levelFor(total), cur:steps[cur], next:next||null,
    pct: next? Math.min(100,Math.round((total-steps[cur])/(next-steps[cur])*100)) : 100 };
}
/* consecutive-day workout streak ending today/yesterday */
function streak(){
  const days=new Set(loadAll().map(w=>w.date));
  let n=0; const d=new Date();
  if(!days.has(dateKey(d.getTime()))) d.setDate(d.getDate()-1);
  while(days.has(dateKey(d.getTime()))){ n++; d.setDate(d.getDate()-1); }
  return n;
}
/* week streak: consecutive ISO weeks with >=1 workout */
function weekStreak(){
  const weeks=new Set(loadAll().map(w=>{
    const d=new Date(w.ts); const d2=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
    const day=(d2.getUTCDay()+6)%7; d2.setUTCDate(d2.getUTCDate()-day+3);
    const first=new Date(Date.UTC(d2.getUTCFullYear(),0,4));
    const fday=(first.getUTCDay()+6)%7; first.setUTCDate(first.getUTCDate()-fday+3);
    return d2.getUTCFullYear()+"-W"+Math.round((d2-first)/(7*864e5)+1);
  }));
  let n=0; const now=new Date();
  const wk=y=>{ const d2=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
    d2.setUTCDate(d2.getUTCDate()+y*7); const day=(d2.getUTCDay()+6)%7; d2.setUTCDate(d2.getUTCDate()-day+3);
    const first=new Date(Date.UTC(d2.getUTCFullYear(),0,4)); const fday=(first.getUTCDay()+6)%7;
    first.setUTCDate(first.getUTCDate()-fday+3);
    return d2.getUTCFullYear()+"-W"+Math.round((d2-first)/(7*864e5)+1); };
  if(!weeks.has(wk(0)) && !weeks.has(wk(-1))) return 0;
  let off=weeks.has(wk(0))?0:-1;
  while(weeks.has(wk(off))){ n++; off--; }
  return n;
}
/* kcal estimate: avg MET * weight * hours */
function estKcal(durationMin, exercises, weightKg){
  let met=0, n=0;
  (exercises||[]).forEach(ex=>{
    const e=EXERCISES.find(x=>x.id===ex.exId);
    if(e){ met+=e.met; n++; }
  });
  const avg=n?met/n:6;
  return Math.round(avg*(weightKg||70)*(durationMin/60));
}

/* ---------- body SVG muscle map (anatomical) ---------- */
function bodySVG(trained, side){
  // trained: Set of muscle ids to highlight
  const on=m=>trained.has(m)?"on":"";
  const uid=side==="front"?"f":"b";
  const base=`
    <ellipse cx="70" cy="15" rx="10.5" ry="12.5" class="bz"/>
    <path d="M63 26 L77 26 L77 35 Q70 39 63 35 Z" class="bz"/>
    <path d="M70 36 C61 36 52 38 47 42 C43 50 42 62 43 74 C44 88 46 100 48 112 C50 124 50 136 52 148 L54 158 L86 158 L88 148 C90 136 90 124 92 112 C94 100 96 88 97 74 C98 62 97 50 93 42 C88 38 79 36 70 36 Z" class="bz"/>
    <path d="M44 42 C38 46 35 56 34 68 C33 82 33 96 34 110 C35 124 36 138 38 150 L48 150 C47 138 46 124 46 110 C46 96 46 82 47 68 C48 56 48 48 47 43 Z" class="bz"/>
    <ellipse cx="43" cy="161" rx="5.5" ry="10" class="bz"/>
    <path d="M52 158 C50 174 49 192 51 208 L69 208 C69 192 68 174 67 158 Z" class="bz"/>
    <path d="M51 208 C50 220 51 232 53 242 L67 242 C68 232 68 220 67 208 Z" class="bz"/>
    <ellipse cx="60" cy="246" rx="8" ry="4.5" class="bz"/>`;
  const delt=`
    <path class="mp" d="M46 40 C39 42 35 49 34 58 C33 66 36 73 41 75 C46 77 51 73 52 66 C53 57 52 46 46 40 Z"/>
    <path class="fib" d="M43 45 C40 53 39 61 40 69 M48 46 C46 54 45 62 46 70"/>`;
  let left="", center="";
  if(side==="front"){
    left=`
    <g class="mz ${on("shoulders")}">${delt}</g>
    <g class="mz ${on("chest")}">
      <path class="mp" d="M68 46 C61 44 52 46 47 52 C44 58 46 66 52 70 C58 74 65 72 68 66 C70 60 70 52 68 46 Z"/>
      <path class="fib" d="M63 50 C59 54 55 59 53 64 M66 53 C62 57 59 61 57 65"/>
    </g>
    <g class="mz ${on("biceps")}">
      <path class="mp" d="M37 72 C34 80 34 90 37 98 C39 102 44 102 46 98 C48 90 48 80 45 72 C42 69 39 69 37 72 Z"/>
      <path class="fib" d="M41 75 C40 83 40 91 41 98"/>
    </g>
    <g class="mz ${on("legs")}">
      <path class="mp" d="M52 160 C50 176 50 194 53 208 L67 208 C68 194 68 176 66 160 Z"/>
      <path class="fib" d="M59 162 C58 178 58 194 59 206 M63 188 C65 194 65 201 63 206"/>
      <path class="mp" d="M55 212 C54 222 54 232 55 241 L63 241 C64 232 64 222 63 212 Z"/>
      <path class="fib" d="M59 214 L59 239"/>
    </g>`;
    center=`
    <g class="mz ${on("abs")}">
      <path class="mp" d="M61 90 Q70 87 79 90 L77 128 Q70 131 63 128 Z"/>
      <path class="fib" d="M62 100 L78 100 M62.5 110 L77.5 110 M63 120 L77 120 M70 89 L70 129"/>
      <path class="mp" d="M59 92 C55 100 55 114 59 124 L63 124 C60 114 60 102 62 94 Z"/>
    </g>`;
  }else{
    left=`
    <g class="mz ${on("shoulders")}">${delt}</g>
    <g class="mz ${on("back")}">
      <path class="mp" d="M46 68 C40 78 38 94 42 110 C45 122 54 130 64 130 C69 130 71 124 69 116 C65 102 59 84 53 72 Z"/>
      <path class="fib" d="M52 75 C48 89 47 105 50 119 M58 79 C55 93 54 107 56 121"/>
    </g>
    <g class="mz ${on("triceps")}">
      <path class="mp" d="M35 72 C32 81 32 92 35 100 C37 104 42 104 44 100 C46 92 46 81 43 72 C40 69 37 69 35 72 Z"/>
      <path class="fib" d="M39 75 C38 84 38 93 39 100"/>
    </g>
    <g class="mz ${on("legs")}">
      <path class="mp" d="M52 160 C48 170 48 184 54 192 C59 198 66 196 68 188 C70 178 68 166 64 160 Z"/>
      <path class="fib" d="M60 165 C58 175 58 185 60 193"/>
      <path class="mp" d="M53 194 C52 199 52 204 53 208 L65 208 C66 204 66 199 65 194 Z"/>
      <path class="fib" d="M59 196 L59 207"/>
      <path class="mp" d="M53 212 C51 222 52 232 56 240 C58 244 62 244 64 240 C67 232 67 222 65 212 Z"/>
      <path class="fib" d="M59 214 C58 224 58 232 59 240"/>
    </g>`;
    center=`
    <g class="mz ${on("back")}">
      <path class="mp" d="M70 36 L50 44 L46 52 L62 60 L66 82 L74 82 L78 60 L94 52 L90 44 Z"/>
      <path class="fib" d="M70 38 L70 80 M57 47 L70 56 M83 47 L70 56"/>
    </g>`;
  }
  return `<svg viewBox="0 0 140 250" class="bodymap" aria-hidden="true">
  <defs>
    <radialGradient id="bmbg" cx="50%" cy="32%" r="75%">
      <stop offset="0" stop-color="#3d434c"/><stop offset=".62" stop-color="#2b3037"/><stop offset="1" stop-color="#1d2126"/>
    </radialGradient>
    <linearGradient id="bmg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#434a54"/><stop offset="1" stop-color="#2f353d"/>
    </linearGradient>
    <radialGradient id="bmgon" cx="50%" cy="38%" r="72%">
      <stop offset="0" stop-color="#e2ff9e"/><stop offset=".55" stop-color="#b8f53c"/><stop offset="1" stop-color="#86cf00"/>
    </radialGradient>
    <radialGradient id="bmbgL" cx="50%" cy="32%" r="75%">
      <stop offset="0" stop-color="#f2f4f6"/><stop offset=".62" stop-color="#dde2e8"/><stop offset="1" stop-color="#c3cad2"/>
    </radialGradient>
    <linearGradient id="bmgL" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ccd2d9"/><stop offset="1" stop-color="#b3bac3"/>
    </linearGradient>
    <radialGradient id="bmgonL" cx="50%" cy="38%" r="72%">
      <stop offset="0" stop-color="#d2fa85"/><stop offset=".55" stop-color="#a4e834"/><stop offset="1" stop-color="#79b800"/>
    </radialGradient>
  </defs>
  <style>
    .bodymap .bz{fill:url(#bmbg)}
    .bodymap .mp{fill:url(#bmg);stroke:rgba(0,0,0,.4);stroke-width:.9}
    .bodymap .fib{fill:none;stroke:rgba(0,0,0,.34);stroke-width:.9;stroke-linecap:round}
    .bodymap .mp{transition:fill .3s,filter .3s}
    .bodymap .mz.on .mp{fill:url(#bmgon);filter:drop-shadow(0 0 7px rgba(174,254,2,.75))}
    .bodymap .mz.on .fib{stroke:rgba(10,20,0,.5)}
    [data-theme="light"] .bodymap .bz{fill:url(#bmbgL)}
    [data-theme="light"] .bodymap .mp{fill:url(#bmgL);stroke:rgba(30,40,50,.22)}
    [data-theme="light"] .bodymap .fib{stroke:rgba(30,40,50,.24)}
    [data-theme="light"] .bodymap .mz.on .mp{fill:url(#bmgonL);filter:drop-shadow(0 0 7px rgba(127,196,0,.6))}
  </style>
  ${base}
  <g id="bm${uid}L">${left}</g>
  <use href="#bm${uid}L" transform="translate(140 0) scale(-1 1)"/>
  ${center}
  </svg>`;
}

window.F1T_WORKOUT={
  MUSCLES, FRONT_MUSCLES, BACK_MUSCLES, EXERCISES,
  loadAll, saveWorkout, workoutsOn, workoutsSince,
  rangeStats, statsFor, levelFor, levelProgress, streak, weekStreak, estKcal,
  bodySVG, dateKey, todayKey,
};
})();
