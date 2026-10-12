/* ============ F1T · health analysis engine ============
   Evidence-based body metrics + nutrition analysis.
   Protein: ISSN 1.4-2.0 g/kg active (up to ~2.3-3.1 in deficit);
   BMI: WHO cutoffs; AMDR carbs 45-65% / protein 10-35% / fat 20-35%;
   water: ~35 ml/kg; 7700 kcal ≈ 1 kg body weight. */
(function(){
const A = {};

/* BMI: WHO categories. Note: Asian populations see risk rise at lower
   cutoffs (often 23 / 27.5); we flag the standard bands + a note. */
A.bmi = function(hCm, wKg){
  if(!hCm || !wKg) return null;
  const v = wKg / Math.pow(hCm/100, 2);
  let cat = "obese";
  if(v < 18.5) cat = "underweight";
  else if(v < 25) cat = "healthy";
  else if(v < 30) cat = "overweight";
  const lo = 18.5 * Math.pow(hCm/100, 2), hi = 24.9 * Math.pow(hCm/100, 2);
  return { value: v, cat: cat, lo: lo, hi: hi };
};

/* Daily macro targets (grams), goal-aware. */
A.macroTargets = function(p){
  const w = p.w || 65;
  const perKg = p.goal === "lose" ? 2.0 : p.goal === "gain" ? 1.8 : 1.6;
  const prot = Math.round(perKg * w);
  const fat = Math.round(0.9 * w);
  const target = p.targetKcal || 2000;
  const carbKcal = Math.max(0, target - prot*4 - fat*9);
  const carb = Math.max(130, Math.round(carbKcal/4)); // 130g brain minimum
  return { p: prot, c: carb, f: fat };
};

A.waterTarget = function(p){ return Math.round((p.w || 65) * 35); }; // ml

/* Analyze one day. Returns {macros, balance, hydration, insights[]}. */
A.analyzeDay = function(day, profile, t){
  const mt = A.macroTargets(profile);
  const target = profile.targetKcal || 2000;
  const wt = A.waterTarget(profile);
  const ins = [];
  const push = (icon, title, body, tone) => ins.push({icon, title, body, tone: tone || "info"});

  // protein
  const pr = mt.p ? day.p / mt.p : 0;
  if(day.kcal > 0){
    if(pr < 0.7) push("meat", t("insProteinLow"), t("insProteinLowB", {a: Math.round(day.p), b: mt.p}), "warn");
    else if(pr <= 1.25) push("check", t("insProteinGood"), t("insProteinGoodB", {a: Math.round(day.p)}), "good");
    else push("meat", t("insProteinHigh"), t("insProteinHighB", {a: Math.round(day.p), b: mt.p}), "info");
    // fat
    if(day.f > mt.f * 1.4) push("droplet", t("insFatHigh"), t("insFatHighB", {a: Math.round(day.f), b: mt.f}), "warn");
    // carbs floor
    if(day.c < 130) push("bread", t("insCarbLow"), t("insCarbLowB", {a: Math.round(day.c)}), "warn");
    // calorie balance
    const diff = day.kcal - target;
    const kgWk = Math.abs(diff) * 7 / 7700;
    if(diff < -100) push("flame", t("insCalDef"), t("insCalDefB", {d: Math.round(-diff), w: kgWk.toFixed(1)}), profile.goal === "lose" ? "good" : "info");
    else if(diff > 150) push("flame", t("insCalSur"), t("insCalSurB", {d: Math.round(diff), w: kgWk.toFixed(1)}), profile.goal === "gain" ? "good" : "warn");
    else push("target", t("insCalHit"), t("insCalHitB"), "good");
  } else {
    push("utensils", t("insStart"), t("insStartB"), "info");
  }
  // water
  const wr = day.water / wt;
  if(wr < 0.5) push("droplet", t("insWaterLow"), t("insWaterLowB", {a: (day.water/1000).toFixed(1), b: (wt/1000).toFixed(1)}), "warn");
  else if(wr >= 1) push("check", t("insWaterGood"), t("insWaterGoodB"), "good");
  // steps
  if(day.steps >= 10000) push("footprints", t("insStepsGood"), t("insStepsGoodB"), "good");
  else if(day.steps > 0 && day.steps < 5000) push("footprints", t("insStepsLow"), t("insStepsLowB", {a: day.steps.toLocaleString()}), "info");

  return {
    macros: { p: {a: Math.round(day.p), t: mt.p}, c: {a: Math.round(day.c), t: mt.c}, f: {a: Math.round(day.f), t: mt.f} },
    balance: { kcal: day.kcal, target: target, diff: day.kcal - target },
    hydration: { ml: day.water, target: wt },
    insights: ins
  };
};

/* Weekly rollup for the last 7 day-docs. */
A.weekly = function(days, profile){
  const ds = days.filter(Boolean);
  if(!ds.length) return null;
  const avg = k => Math.round(ds.reduce((s,d)=>s+(d[k]||0),0)/ds.length);
  const target = profile.targetKcal || 2000;
  const adhered = ds.filter(d=>d.kcal>0 && Math.abs(d.kcal-target)/target<=0.15).length;
  return { avgKcal: avg("kcal"), avgSteps: avg("steps"), avgWater: avg("water"),
           days: ds.length, adherence: adhered, target: target };
};

/* Rotating evidence-based tip (original wording). */
A.tipOfDay = function(dateKey){
  let h = 0; for(const ch of dateKey) h = (h*31 + ch.charCodeAt(0)) >>> 0;
  return h % 7;
};

window.F1T_ANALYSIS = A;
})();
