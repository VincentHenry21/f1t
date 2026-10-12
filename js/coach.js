/* ============ F1T · Coach API ============
   Personalized per-user plan: body structure, workout schedule,
   eating style + carbs + nutrition. Computed from the user's profile
   (height, weight, age, goal, calorie target). Works offline. */
(function(){
"use strict";
const C = {};

/* 7-day templates, index 0 = Monday. [workoutKey, minutes] */
const TPL = {
  lose:  [["wHIIT",30],["wStrength",40],["wCardio",40],["rest",0],["wHIIT",30],["wCardio",45],["wWalk",30]],
  gain:  [["wPush",45],["wPull",45],["rest",0],["wLegs",50],["wPush",45],["wCardio",25],["rest",0]],
  maintain:[["wCardio",30],["wStrength",40],["rest",0],["wHIIT",25],["wWalk",30],["wStrength",40],["rest",0]]
};

C.plan = function(p){
  p = p || {};
  const A = window.F1T_ANALYSIS;
  const h = p.h || 170, w = p.w || 65, goal = p.goal || "maintain";
  const b = A ? A.bmi(h, w) : null;
  const mt = A ? A.macroTargets(p) : {p:104, c:250, f:58};
  const water = A ? A.waterTarget(p) : 2275;

  /* --- body structure --- */
  let targetW = w, note = "";
  if(b){
    if(goal === "lose") targetW = Math.min(w, b.hi);
    else if(goal === "gain") targetW = Math.max(w, b.lo);
    else targetW = Math.min(Math.max(w, b.lo), b.hi);
    targetW = Math.round(targetW * 2) / 2;
  }
  const body = { bmi: b, lo: b ? Math.round(b.lo*10)/10 : null,
    hi: b ? Math.round(b.hi*10)/10 : null, targetW: targetW };

  /* --- workout schedule --- */
  const tpl = TPL[goal] || TPL.maintain;
  const workouts = tpl.map(function(d, i){ return { day: i, key: d[0], mins: d[1] }; });

  /* --- nutrition --- */
  const style = goal === "lose" ? "eatLose" : goal === "gain" ? "eatGain" : "eatMaintain";
  const planKey = goal === "lose" ? "planLose" : goal === "gain" ? "planGain" : "planMaintain";
  const nutrition = {
    style: style, planKey: planKey,
    protein: mt.p, carbs: mt.c, fat: mt.f, water: water,
    preCarb: Math.round(mt.c * 0.18), postProt: Math.round(mt.p * 0.3)
  };

  return { body: body, workouts: workouts, nutrition: nutrition, goal: goal };
};

/* today's workout from the plan (0=Monday index) */
C.today = function(plan){
  const jsDay = new Date().getDay(); // 0=Sun
  const idx = (jsDay + 6) % 7;       // 0=Mon
  return plan.workouts[idx];
};

/* Daily Score 0-10 from the day's data. */
C.dailyScore = function(day, profile){
  day = day || {}; profile = profile || {};
  const A = window.F1T_ANALYSIS;
  const target = profile.targetKcal || 2000;
  const mt = A ? A.macroTargets(profile) : {p:100, c:250, f:65};
  const wt = A ? A.waterTarget(profile) : 2000;
  let s = 0;
  s += ["breakfast","lunch","dinner"].filter(m=>((day.meals||{})[m]||[]).length>0).length; // 0-3
  if(day.kcal>0){ s += Math.abs(day.kcal-target)/target<=0.15 ? 2 : 1; }
  const pr = day.p||0;
  s += pr>=mt.p*0.8 ? 1.5 : pr>=mt.p*0.4 ? 0.75 : 0;
  const w = day.water||0;
  s += w>=wt*0.8 ? 1 : w>=wt*0.4 ? 0.5 : 0;
  const st = day.steps||0;
  s += st>=8000 ? 1.5 : st>=4000 ? 0.75 : 0;
  if((day.exercise||0)>0) s += 1;
  return Math.min(10, Math.round(s*10)/10);
};

/* Coach notification cards: rule-based insights with AI follow-up actions.
   Each: {text, actions:[{label, prompt}]}. Prompts are sent to the AI coach. */
C.notifications = function(day, prevDay, profile, t, ctx){
  day = day||{}; prevDay=prevDay||{}; profile=profile||{}; ctx=ctx||{};
  const out=[];
  const A = window.F1T_ANALYSIS;
  const mt = A ? A.macroTargets(profile) : {p:100,c:250,f:65};
  const hour = new Date().getHours();
  // late dinner yesterday
  const yd = ((prevDay.meals||{}).dinner||[]);
  const late = yd.find(x=>{ const h=new Date(x.at||0).getHours(); return h>=20; });
  if(late){
    const hh=new Date(late.at).getHours(), mm=String(new Date(late.at).getMinutes()).padStart(2,"0");
    out.push({ text: t("ntLateMeal",{t:hh+":"+mm}),
      actions:[{label:t("ntWhyTime"),prompt:t("ntWhyTimeP")},{label:t("ntPlanDinner"),prompt:t("ntPlanDinnerP",{n:ctx.dinnerKcal||500})}] });
  }
  // low protein in the afternoon/evening
  if(hour>=14 && (day.p||0) < mt.p*0.4 && (day.kcal||0)>0){
    out.push({ text: t("ntLowProtein",{a:Math.round(day.p||0),b:mt.p}),
      actions:[{label:t("ntProteinIdeas"),prompt:t("ntProteinIdeasP")}] });
  }
  // low water in the evening
  const wt = A ? A.waterTarget(profile) : 2000;
  if(hour>=18 && (day.water||0) < wt*0.3){
    out.push({ text: t("ntLowWater"),
      actions:[{label:t("ntHydrationTips"),prompt:t("ntHydrationTipsP")}] });
  }
  // no exercise for 3 days
  if(!(day.exercise>0)){
    out.push({ text: t("ntMove"),
      actions:[{label:t("ntQuickWorkout"),prompt:t("ntQuickWorkoutP")}] });
  }
  return out.slice(0,2);
};

window.F1T_COACH = C;
})();
