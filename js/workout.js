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

/* ---------- body SVG muscle map ---------- */
function bodySVG(trained, side){
  // trained: Set of muscle ids to highlight
  const on=m=>trained.has(m)?' class="mz on"':' class="mz"';
  const lime="#aefe02";
  let inner="";
  if(side==="front"){
    inner=`
    <circle cx="60" cy="16" r="10" class="bz"/>
    <rect x="53" y="26" width="14" height="10" rx="4" class="bz"/>
    <ellipse cx="60" cy="76" rx="23" ry="44" class="bz"/>
    <rect x="26" y="40" width="11" height="62" rx="5.5" class="bz"/>
    <rect x="83" y="40" width="11" height="62" rx="5.5" class="bz"/>
    <circle cx="31.5" cy="106" r="6" class="bz"/><circle cx="88.5" cy="106" r="6" class="bz"/>
    <rect x="45" y="118" width="12" height="82" rx="6" class="bz"/>
    <rect x="63" y="118" width="12" height="82" rx="6" class="bz"/>
    <ellipse cx="60" cy="206" rx="9" ry="4" class="bz"/><ellipse cx="60" cy="206" rx="9" ry="4" class="bz"/>
    <ellipse cx="50" cy="58"${on("chest")} rx="10" ry="8"/>
    <ellipse cx="70" cy="58"${on("chest")} rx="10" ry="8"/>
    <circle cx="31.5" cy="44"${on("shoulders")} r="8"/>
    <circle cx="88.5" cy="44"${on("shoulders")} r="8"/>
    <ellipse cx="31.5" cy="68"${on("biceps")} rx="5.5" ry="11"/>
    <ellipse cx="88.5" cy="68"${on("biceps")} rx="5.5" ry="11"/>
    <rect x="51" y="82" width="18" height="30" rx="7"${on("abs")}/>
    <ellipse cx="51" cy="148"${on("legs")} rx="7.5" ry="20"/>
    <ellipse cx="69" cy="148"${on("legs")} rx="7.5" ry="20"/>`;
  }else{
    inner=`
    <circle cx="60" cy="16" r="10" class="bz"/>
    <rect x="53" y="26" width="14" height="10" rx="4" class="bz"/>
    <ellipse cx="60" cy="76" rx="23" ry="44" class="bz"/>
    <rect x="26" y="40" width="11" height="62" rx="5.5" class="bz"/>
    <rect x="83" y="40" width="11" height="62" rx="5.5" class="bz"/>
    <circle cx="31.5" cy="106" r="6" class="bz"/><circle cx="88.5" cy="106" r="6" class="bz"/>
    <rect x="45" y="118" width="12" height="82" rx="6" class="bz"/>
    <rect x="63" y="118" width="12" height="82" rx="6" class="bz"/>
    <ellipse cx="60" cy="72"${on("back")} rx="15" ry="22"/>
    <circle cx="31.5" cy="44"${on("shoulders")} r="8"/>
    <circle cx="88.5" cy="44"${on("shoulders")} r="8"/>
    <ellipse cx="31.5" cy="68"${on("triceps")} rx="5.5" ry="11"/>
    <ellipse cx="88.5" cy="68"${on("triceps")} rx="5.5" ry="11"/>
    <ellipse cx="51" cy="114"${on("legs")} rx="8" ry="9"/>
    <ellipse cx="69" cy="114"${on("legs")} rx="8" ry="9"/>
    <ellipse cx="51" cy="150"${on("legs")} rx="7.5" ry="18"/>
    <ellipse cx="69" cy="150"${on("legs")} rx="7.5" ry="18"/>`;
  }
  return `<svg viewBox="0 0 120 214" class="bodymap" aria-hidden="true"><style>
    .bodymap .bz{fill:#2b332b}.bodymap .mz{fill:#3a443a;transition:fill .4s}
    .bodymap .mz.on{fill:${lime};filter:drop-shadow(0 0 6px ${lime}66)}
    [data-theme="light"] .bodymap .bz{fill:#dfe3df}
    [data-theme="light"] .bodymap .mz{fill:#cfd6cf}
    [data-theme="light"] .bodymap .mz.on{fill:#7fc400}
  </style>${inner}</svg>`;
}

window.F1T_WORKOUT={
  MUSCLES, FRONT_MUSCLES, BACK_MUSCLES, EXERCISES,
  loadAll, saveWorkout, workoutsOn, workoutsSince,
  rangeStats, statsFor, levelFor, levelProgress, streak, weekStreak, estKcal,
  bodySVG, dateKey, todayKey,
};
})();
