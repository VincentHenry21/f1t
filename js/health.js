/* ============ F1T v12 · Health ============
   Water / steps / weight logging sheets + health analysis engine.
   Every number is computed from real profile + day records. No fake data.
   Evidence base: WHO BMI cutoffs; ISSN protein 1.4-2.0 g/kg; AMDR ranges;
   ~35 ml/kg water; 7700 kcal ~= 1 kg body weight. */
window.F1T_HEALTH = (() => {
"use strict";
const S = window.F1T_STORE, UI = window.F1T_UI;
const t = (k, p) => window.F1T_t(k, p);
const icon = (n, s) => window.f1tIcon(n, s || 20);
const esc = s => UI.esc(s);

/* ================= engine ================= */

/* BMI with WHO categories + healthy weight range for the height.
   Note: Asian populations see risk rise at lower cutoffs; the standard
   bands are shown with the screening-tool note below. */
function bmi(hCm, wKg){
  if(!hCm || !wKg || hCm <= 0 || wKg <= 0) return null;
  const v = wKg / Math.pow(hCm / 100, 2);
  let cat = "obese";
  if(v < 18.5) cat = "underweight";
  else if(v < 25) cat = "healthy";
  else if(v < 30) cat = "overweight";
  const lo = 18.5 * Math.pow(hCm / 100, 2), hi = 24.9 * Math.pow(hCm / 100, 2);
  return { value: v, cat: cat, lo: lo, hi: hi };
}

/* Daily calorie target. Uses the onboarding target when present;
   otherwise Mifflin-St Jeor from real profile data, goal-adjusted.
   Returns {value, estimated} or null when inputs are missing. */
function calorieTarget(p){
  if(p.targetKcal > 0) return { value: Math.round(p.targetKcal), estimated: false };
  const w = p.w, h = p.h, age = p.age;
  if(!w || !h || w <= 0 || h <= 0) return null;
  const a = age > 0 ? age : 30;
  let bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === "female" ? -161 : 5);
  const tdee = bmr * (p.active ? 1.55 : 1.375);
  const adj = p.goal === "lose" ? -500 : p.goal === "gain" ? 300 : 0;
  return { value: Math.round((tdee + adj) / 10) * 10, estimated: true };
}

/* Goal-aware macro targets in grams. */
function macroTargets(p, target){
  const w = p.w || 65;
  const perKg = p.goal === "lose" ? 2.0 : p.goal === "gain" ? 1.8 : 1.6;
  const prot = Math.round(perKg * w);
  const fat = Math.round(0.9 * w);
  const carbKcal = Math.max(0, target - prot * 4 - fat * 9);
  const carb = Math.max(130, Math.round(carbKcal / 4)); // ~130g brain minimum
  return { p: prot, c: carb, f: fat };
}

function waterTargetMl(wKg){ return wKg > 0 ? Math.round(wKg * 35) : 0; }

/* Weight history: localStorage f1t_weights as [{d:"YYYY-MM-DD", w:kg}]. */
function getWeights(){
  const ws = S.read("f1t_weights", []);
  return Array.isArray(ws) ? ws.filter(e => e && e.d && e.w > 0).sort((a, b) => a.d < b.d ? -1 : 1) : [];
}
function pushWeight(d, w){
  const ws = getWeights().filter(e => e.d !== d);
  ws.push({ d: d, w: w });
  ws.sort((a, b) => a.d < b.d ? -1 : 1);
  S.write("f1t_weights", ws.slice(-90));
}
function latestWeight(){
  const ws = getWeights();
  if(ws.length) return ws[ws.length - 1].w;
  const p = S.getProfile();
  return p && p.w > 0 ? p.w : 0;
}

/* Deterministic daily tip index (hash of the date key, not random). */
function tipIndex(dateKey){
  let h = 0;
  for(const ch of dateKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 7;
}

/* Insight cards from today's real log. Tones: good (lime) / info (neutral). */
function analyze(d, p, target, mt, wt){
  const ins = [];
  const push = (ic, title, body, tone) => ins.push({ icon: ic, title: title, body: body, tone: tone || "info" });
  if(d.kcal > 0){
    const pr = mt.p ? d.p / mt.p : 0;
    if(pr < 0.7) push("meat", t("insProteinLow"), t("insProteinLowB", { a: Math.round(d.p), b: mt.p }));
    else if(pr <= 1.25) push("check", t("insProteinGood"), t("insProteinGoodB", { a: Math.round(d.p) }), "good");
    else push("meat", t("insProteinHigh"), t("insProteinHighB", { a: Math.round(d.p), b: mt.p }));
    if(d.f > mt.f * 1.4) push("droplet", t("insFatHigh"), t("insFatHighB", { a: Math.round(d.f), b: mt.f }));
    if(d.c < 130) push("bread", t("insCarbLow"), t("insCarbLowB", { a: Math.round(d.c) }));
    const diff = d.kcal - target;
    const kgWk = Math.abs(diff) * 7 / 7700;
    if(diff < -100) push("flame", t("insCalDef"), t("insCalDefB", { d: Math.round(-diff), w: kgWk.toFixed(1) }), p.goal === "lose" ? "good" : "info");
    else if(diff > 150) push("flame", t("insCalSur"), t("insCalSurB", { d: Math.round(diff), w: kgWk.toFixed(1) }), p.goal === "gain" ? "good" : "info");
    else push("target", t("insCalHit"), t("insCalHitB"), "good");
  } else {
    push("utensils", t("insStart"), t("insStartB"));
  }
  if(wt > 0){
    const wr = d.water / wt;
    if(wr < 0.5) push("droplet", t("insWaterLow"), t("insWaterLowB", { a: (d.water / 1000).toFixed(1), b: (wt / 1000).toFixed(1) }));
    else if(wr >= 1) push("check", t("insWaterGood"), t("insWaterGoodB"), "good");
  }
  if(d.steps >= 10000) push("footprints", t("insStepsGood"), t("insStepsGoodB"), "good");
  else if(d.steps > 0 && d.steps < 5000) push("footprints", t("insStepsLow"), t("insStepsLowB", { a: d.steps.toLocaleString() }), "info");
  return ins;
}

/* ================= small builders ================= */

function secLabel(txt){
  const s = UI.el("div", "", esc(txt));
  s.style.cssText = "font-size:var(--fs-xs);font-weight:800;color:var(--ink-3);text-transform:uppercase;letter-spacing:.05em;margin:var(--sp-4) 0 var(--sp-2)";
  return s;
}
function pill(txt, good){
  const s = UI.el("span", "", esc(txt));
  s.style.cssText = "display:inline-block;padding:.32rem .85rem;border-radius:var(--r-pill);font-size:var(--fs-xs);font-weight:800;white-space:nowrap;" +
    (good ? "color:var(--lime);border:.07rem solid rgba(174,254,2,.45);background:rgba(174,254,2,.08);"
          : "color:var(--ink-2);border:.07rem solid var(--line-2);");
  return s;
}
function bar(pct, color){
  const w = UI.el("div", "");
  w.style.cssText = "height:.55rem;border-radius:var(--r-pill);background:var(--surface);overflow:hidden";
  const f = UI.el("div", "");
  f.style.cssText = "height:100%;width:" + Math.max(0, Math.min(100, pct)) + "%;background:" + (color || "var(--lime)") + ";border-radius:var(--r-pill);transition:width var(--dur-2) var(--ease)";
  w.appendChild(f);
  return w;
}
function sheetTitle(icName, txt){
  const h = UI.el("h3", "");
  h.style.cssText = "display:flex;align-items:center;gap:.6rem";
  h.innerHTML = icon(icName, 22) + "<span>" + esc(txt) + "</span>";
  return h;
}
function bigReadout(){
  const w = UI.el("div", "");
  w.style.cssText = "text-align:center;margin:var(--sp-3) 0 var(--sp-2)";
  w.innerHTML = '<b style="font-size:var(--fs-hero);font-variant-numeric:tabular-nums;letter-spacing:-.02em"></b> <small class="muted" style="font-size:var(--fs-md);font-weight:700"></small>';
  return {
    el: w,
    set(v, unit){ w.querySelector("b").textContent = v; w.querySelector("small").textContent = unit; }
  };
}
function errBox(){
  const e = UI.el("div", "errbox", "");
  e.style.display = "none";
  return { el: e, show(m){ e.textContent = m; e.style.display = "block"; }, hide(){ e.style.display = "none"; } };
}

/* ================= sheets ================= */

function openWater(){
  const key = S.todayKey();
  const day = S.getDay(key);
  const w = latestWeight();
  const target = waterTargetMl(w);
  const MAX = 4000, STEP = 250;
  let ml = Math.round((day.water || 0) / STEP) * STEP;

  UI.sheet((body, close) => {
    body.appendChild(sheetTitle("droplet", t("logWater")));
    const ro = bigReadout(); body.appendChild(ro.el);

    const range = document.createElement("input");
    range.type = "range"; range.min = "0"; range.max = String(MAX); range.step = String(STEP);
    range.value = String(ml); range.setAttribute("aria-label", t("logWater"));
    range.style.cssText = "width:100%;accent-color:var(--lime);min-height:var(--touch-min)";
    body.appendChild(range);

    const cap = UI.el("p", "muted", "");
    cap.style.cssText = "text-align:center;font-size:var(--fs-sm);margin:var(--sp-2) 0";
    body.appendChild(cap);

    const paint = () => {
      ro.set(ml.toLocaleString(), t("waterMl"));
      cap.textContent = target > 0 ? t("waterOf", { a: (ml / 1000).toFixed(1), b: (target / 1000).toFixed(1) }) : t("oneCup");
    };

    const row = UI.el("div", "row-2", "");
    row.style.marginTop = "var(--sp-2)";
    const minus = UI.btn("− 250", { kind: "ghost", block: false });
    minus.setAttribute("aria-label", "−250 ml");
    minus.addEventListener("click", () => { ml = Math.max(0, ml - STEP); range.value = String(ml); paint(); });
    const plus = UI.btn(t("addCup"), { kind: "lime", block: false });
    plus.addEventListener("click", () => { ml = Math.min(MAX, ml + STEP); range.value = String(ml); paint(); });
    row.appendChild(minus); row.appendChild(plus);
    body.appendChild(row);

    range.addEventListener("input", () => { ml = +range.value; paint(); });
    paint();

    const save = UI.btn(t("save"), { kind: "lime" });
    save.style.marginTop = "var(--sp-4)";
    save.addEventListener("click", async () => {
      save.setBusy(true);
      day.water = ml;
      await S.saveDay(key, day);
      save.setBusy(false);
      UI.toast(t("logged"));
      close();
    });
    body.appendChild(save);
  });
}

function openSteps(){
  const key = S.todayKey();
  const day = S.getDay(key);

  UI.sheet((body, close) => {
    body.appendChild(sheetTitle("footprints", t("logSteps")));
    const inp = UI.input({ type: "number", inputmode: "numeric", value: day.steps ? String(day.steps) : "" });
    inp.placeholder = "0";
    inp.setAttribute("aria-label", t("logSteps"));
    body.appendChild(UI.field(t("stepsToWalk"), inp));

    const quick = UI.btn(t("addK"), { kind: "ghost" });
    quick.style.marginBottom = "var(--sp-3)";
    quick.addEventListener("click", () => {
      inp.value = String(Math.min(999999, (parseInt(inp.value, 10) || 0) + 1000));
    });
    body.appendChild(quick);

    const err = errBox(); body.appendChild(err.el);

    const save = UI.btn(t("save"), { kind: "lime" });
    save.addEventListener("click", async () => {
      const v = Math.round(+inp.value || 0);
      if(v < 0 || v > 999999){ err.show(t("stepsInvalid")); return; }
      err.hide(); save.setBusy(true);
      day.steps = v;
      await S.saveDay(key, day);
      save.setBusy(false);
      UI.toast(t("logged"));
      close();
    });
    body.appendChild(save);
  });
}

function openWeight(){
  const key = S.todayKey();
  const day = S.getDay(key);
  const MIN = 20, MAX = 400, STEP = 0.5;
  let v = latestWeight() || 70;
  v = Math.min(MAX, Math.max(MIN, v));

  UI.sheet((body, close) => {
    body.appendChild(sheetTitle("scale", t("logWeight")));
    const ro = bigReadout(); body.appendChild(ro.el);

    const range = document.createElement("input");
    range.type = "range"; range.min = String(MIN); range.max = String(MAX); range.step = String(STEP);
    range.value = String(v); range.setAttribute("aria-label", t("logWeight"));
    range.style.cssText = "width:100%;accent-color:var(--lime);min-height:var(--touch-min)";
    body.appendChild(range);

    const inp = UI.input({ type: "number", inputmode: "decimal", value: String(v) });
    inp.setAttribute("aria-label", t("weight"));
    body.appendChild(UI.field(t("weight") + " (" + t("kg") + ")", inp));

    const err = errBox(); body.appendChild(err.el);

    const paint = nv => { ro.set(nv, t("kg")); };
    const syncFromSlider = () => { v = +range.value; paint(v); if(document.activeElement !== inp) inp.value = String(v); err.hide(); };
    range.addEventListener("input", syncFromSlider);
    inp.addEventListener("input", () => {
      const nv = parseFloat(inp.value);
      if(nv >= MIN && nv <= MAX){ v = nv; range.value = String(nv); paint(nv); err.hide(); }
    });
    paint(v);

    const save = UI.btn(t("save"), { kind: "lime" });
    save.style.marginTop = "var(--sp-2)";
    save.addEventListener("click", async () => {
      const nv = parseFloat(inp.value);
      if(!(nv >= MIN && nv <= MAX)){ err.show(t("weightInvalid")); return; }
      err.hide(); save.setBusy(true);
      day.weight = nv;
      await S.saveDay(key, day);
      const p = S.getProfile() || {};
      p.w = nv;
      await S.saveProfile(p);
      pushWeight(key, nv);
      save.setBusy(false);
      UI.toast(t("logged"));
      close();
    });
    body.appendChild(save);
  });
}

/* ================= analysis ================= */

function macroRow(label, a, tg){
  const pct = tg > 0 ? Math.round(a / tg * 100) : 0;
  const w = UI.el("div", "");
  w.style.marginBottom = "var(--sp-2)";
  const top = UI.el("div", "");
  top.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;font-size:var(--fs-sm);margin-bottom:.35rem";
  top.innerHTML = "<b>" + esc(label) + "</b>";
  const sub = UI.el("span", "muted", esc(t("ofTarget", { a: Math.round(a), b: tg })));
  top.appendChild(sub);
  w.appendChild(top);
  w.appendChild(bar(pct));
  return w;
}

function insightCard(n){
  const c = UI.card("");
  c.style.cssText = "display:flex;gap:var(--sp-3);align-items:flex-start;margin-bottom:var(--sp-2);text-align:left";
  const ic = UI.el("span", "", icon(n.icon, 20));
  ic.style.cssText = "flex:none;margin-top:.15rem;color:" + (n.tone === "good" ? "var(--lime)" : "var(--ink-2)");
  const tx = UI.el("div", "");
  tx.style.cssText = "min-width:0";
  const b = UI.el("b", "", esc(n.title));
  b.style.display = "block";
  const p = UI.el("p", "muted", esc(n.body));
  p.style.margin = ".25rem 0 0";
  tx.appendChild(b); tx.appendChild(p);
  c.appendChild(ic); c.appendChild(tx);
  return c;
}

function sparkline(weights){
  const W = 300, H = 72, P = 8;
  const ws = weights.map(e => e.w);
  const min = Math.min.apply(null, ws), max = Math.max.apply(null, ws), span = (max - min) || 1;
  const pts = weights.map((e, i) => {
    const x = P + i * (W - 2 * P) / Math.max(1, weights.length - 1);
    const y = H - P - (e.w - min) / span * (H - 2 * P);
    return { x: x.toFixed(1), y: y.toFixed(1) };
  });
  const line = pts.map(p => p.x + "," + p.y).join(" ");
  const dots = pts.map(p => '<circle cx="' + p.x + '" cy="' + p.y + '" r="3.2" style="fill:var(--lime)"/>').join("");
  return '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto;display:block" role="img" aria-label="' + esc(t("trendTitle")) + '">' +
    '<polyline points="' + line + '" style="fill:none;stroke:var(--lime);stroke-width:2.5" stroke-linecap="round" stroke-linejoin="round"/>' + dots + "</svg>";
}

function renderAnalysis(el){
  el.innerHTML = "";
  const key = S.todayKey();
  const d = S.getDay(key);
  const p = S.getProfile();
  const w = latestWeight();

  if(!p && !w){
    el.appendChild(UI.empty(t("analysisNoProfile"), t("analysisNoProfileB"), t("logWeight"), openWeight));
    return;
  }
  const prof = Object.assign({}, p || {}, w ? { w: w } : {});

  /* ---- BMI card ---- */
  el.appendChild(secLabel(t("bmi")));
  const bmiCard = UI.card("");
  const b = (prof.h > 0 && w > 0) ? bmi(prof.h, w) : null;
  if(b){
    const catKey = { underweight: "bmiUnder", healthy: "bmiHealthy", overweight: "bmiOver", obese: "bmiObese" };
    const top = UI.el("div", "");
    top.style.cssText = "display:flex;justify-content:space-between;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2);flex-wrap:wrap";
    const val = UI.el("div", "");
    val.innerHTML = '<b style="font-size:var(--fs-2xl);font-variant-numeric:tabular-nums">' + b.value.toFixed(1) + '</b> <small class="muted">' + esc(t("bmi")) + "</small>";
    top.appendChild(val);
    top.appendChild(pill(t(catKey[b.cat]), b.cat === "healthy"));
    bmiCard.appendChild(top);
    const track = UI.el("div", "");
    track.style.cssText = "position:relative;height:.55rem;border-radius:var(--r-pill);background:var(--surface);margin-bottom:var(--sp-2)";
    const pos = Math.min(100, Math.max(0, (b.value - 14) / (36 - 14) * 100));
    const dot = UI.el("div", "");
    dot.style.cssText = "position:absolute;top:50%;left:" + pos + "%;width:.95rem;height:.95rem;border-radius:50%;background:var(--lime);transform:translate(-50%,-50%);box-shadow:var(--sh-glow)";
    track.appendChild(dot);
    bmiCard.appendChild(track);
    const rg = UI.el("p", "muted", esc(t("bmiRange")) + ": " + Math.round(b.lo) + " - " + Math.round(b.hi) + " " + esc(t("kg")));
    rg.style.cssText = "font-size:var(--fs-sm);margin:0 0 .4rem";
    const nt = UI.el("p", "muted", esc(t("bmiNote")));
    nt.style.cssText = "font-size:var(--fs-xs);margin:0";
    bmiCard.appendChild(rg); bmiCard.appendChild(nt);
  } else if(!w){
    bmiCard.appendChild(UI.el("p", "muted", esc(t("analysisNoProfileB"))));
    const btn = UI.btn(t("logWeight"), { kind: "lime" });
    btn.style.marginTop = "var(--sp-3)";
    btn.addEventListener("click", openWeight);
    bmiCard.appendChild(btn);
  } else {
    bmiCard.appendChild(UI.el("p", "muted", esc(t("heightNeeded"))));
  }
  el.appendChild(bmiCard);

  /* ---- targets card ---- */
  const tg = calorieTarget(prof);
  el.appendChild(secLabel(t("targetsTitle")));
  const tCard = UI.card("");
  if(tg && w > 0){
    const mt = macroTargets(prof, tg.value);
    const head = UI.el("div", "");
    head.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--sp-3);flex-wrap:wrap;gap:.4rem";
    head.innerHTML = "<b>" + esc(t("calTarget")) + "</b>";
    const tv = UI.el("span", "", "");
    tv.innerHTML = '<b style="font-size:var(--fs-xl);font-variant-numeric:tabular-nums">' + tg.value.toLocaleString() + '</b> <small class="muted">' + esc(t("kcal")) + "</small>" +
      (tg.estimated ? ' <small class="muted">' + esc(t("estMark")) + "</small>" : "");
    head.appendChild(tv);
    tCard.appendChild(head);
    tCard.appendChild(macroRow(t("protein"), d.p, mt.p));
    tCard.appendChild(macroRow(t("carbs"), d.c, mt.c));
    tCard.appendChild(macroRow(t("fat"), d.f, mt.f));
  } else {
    tCard.appendChild(UI.el("p", "muted", esc(t("analysisNoProfileB"))));
    const btn = UI.btn(t("logWeight"), { kind: "lime" });
    btn.style.marginTop = "var(--sp-3)";
    btn.addEventListener("click", openWeight);
    tCard.appendChild(btn);
  }
  el.appendChild(tCard);

  /* ---- hydration card ---- */
  const wt = waterTargetMl(w);
  el.appendChild(secLabel(t("hydTitle")));
  const hCard = UI.card("");
  if(wt > 0){
    const pct = Math.round(d.water / wt * 100);
    const top = UI.el("div", "");
    top.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--sp-2)";
    top.innerHTML = "<b>" + esc(t("waterOf", { a: (d.water / 1000).toFixed(1), b: (wt / 1000).toFixed(1) })) + "</b>" +
      '<span class="muted" style="font-size:var(--fs-sm)">' + pct + "%</span>";
    hCard.appendChild(top);
    hCard.appendChild(bar(pct));
  } else {
    hCard.appendChild(UI.el("p", "muted", esc(t("analysisNoProfileB"))));
  }
  el.appendChild(hCard);

  /* ---- pace card (only from real logged calories) ---- */
  if(d.kcal > 0 && tg){
    el.appendChild(secLabel(t("paceTitle")));
    const pCard = UI.card("");
    const diff = d.kcal - tg.value;
    const kgWk = Math.abs(diff) * 7 / 7700;
    let txt, tone = "info";
    if(diff < -100){ txt = t("insCalDefB", { d: Math.round(-diff), w: kgWk.toFixed(1) }); tone = prof.goal === "lose" ? "good" : "info"; }
    else if(diff > 150){ txt = t("insCalSurB", { d: Math.round(diff), w: kgWk.toFixed(1) }); tone = prof.goal === "gain" ? "good" : "info"; }
    else { txt = t("paceEven"); tone = "good"; }
    const row = UI.el("div", "");
    row.style.cssText = "display:flex;gap:var(--sp-3);align-items:flex-start";
    const ic = UI.el("span", "", icon("flame", 20));
    ic.style.cssText = "flex:none;margin-top:.15rem;color:" + (tone === "good" ? "var(--lime)" : "var(--ink-2)");
    const tx = UI.el("div", "");
    tx.innerHTML = "<b>" + esc(t(diff < -100 ? "insCalDef" : diff > 150 ? "insCalSur" : "insCalHit")) + "</b>";
    const pb = UI.el("p", "muted", esc(txt));
    pb.style.margin = ".25rem 0 0";
    tx.appendChild(pb);
    row.appendChild(ic); row.appendChild(tx);
    pCard.appendChild(row);
    el.appendChild(pCard);
  }

  /* ---- insight cards ---- */
  if(tg && w > 0){
    const mt = macroTargets(prof, tg.value);
    const list = analyze(d, prof, tg.value, mt, wt);
    if(list.length){
      el.appendChild(secLabel(t("analysis")));
      list.forEach(n => el.appendChild(insightCard(n)));
    }
  }

  /* ---- weight trend (real history only) ---- */
  const hist = getWeights();
  el.appendChild(secLabel(t("trendTitle")));
  const trCard = UI.card("");
  if(hist.length >= 2){
    const last = hist.slice(-14);
    trCard.innerHTML = sparkline(last);
    const first = last[0], fin = last[last.length - 1];
    const dv = fin.w - first.w;
    const dl = UI.el("p", "muted", esc(t("trendDelta", { s: dv >= 0 ? "+" : "−", v: Math.abs(dv).toFixed(1), d: fin.d.slice(5).replace("-", "/") })));
    dl.style.cssText = "font-size:var(--fs-sm);margin:var(--sp-2) 0 0;text-align:center";
    trCard.appendChild(dl);
  } else {
    trCard.appendChild(UI.el("p", "muted", esc(t("noWeightHist"))));
  }
  el.appendChild(trCard);

  /* ---- daily tip (deterministic by date) ---- */
  el.appendChild(secLabel(t("tipTitle")));
  const tipCard = UI.card("");
  tipCard.style.cssText = "border-color:rgba(174,254,2,.25)";
  const tipRow = UI.el("div", "");
  tipRow.style.cssText = "display:flex;gap:var(--sp-3);align-items:flex-start";
  const tic = UI.el("span", "", icon("zap", 20));
  tic.style.cssText = "flex:none;margin-top:.15rem;color:var(--lime)";
  const ttx = UI.el("p", "", esc(t("tip" + tipIndex(key))));
  ttx.style.margin = "0";
  tipRow.appendChild(tic); tipRow.appendChild(ttx);
  tipCard.appendChild(tipRow);
  el.appendChild(tipCard);
}

return { openWater, openSteps, openWeight, renderAnalysis };
})();
