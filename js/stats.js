/* ============ F1T v12 · Stats / Home ============
   Summary dashboard built ONLY from real records:
   profile, day logs (f1t_day_*), workouts (f1t_workouts), weight history.
   No invented values, no fake skeletons: every chart reads the store,
   every empty state names the action that fills it. */
window.F1T_STATS = (() => {
  "use strict";
  const S = window.F1T_STORE, UI = window.F1T_UI;
  const t = k => window.F1T_t(k);
  const ic = (n, s) => window.f1tIcon ? window.f1tIcon(n, s || 20) : "";
  const fmt = n => Math.round(n || 0).toLocaleString("en-US");

  /* ---------- targets (goal-aware, deterministic) ---------- */
  function macroTargets(p){
    const w = p.w || 65;
    const perKg = p.goal === "lose" ? 2.0 : p.goal === "gain" ? 1.8 : 1.6;
    const prot = Math.round(perKg * w);
    const fat = Math.round(0.9 * w);
    const target = p.targetKcal || 2000;
    const carb = Math.max(130, Math.round(Math.max(0, target - prot * 4 - fat * 9) / 4));
    return { p: prot, c: carb, f: fat };
  }
  function waterTarget(p){ return Math.round((p.w || 65) * 35); } // ml

  /* ---------- Daily Score 0-10 engine + honest breakdown ----------
     meals 0-3 · calorie adherence 0-2 · protein 0-1.5 · water 0-1 ·
     steps 0-1.5 · workout 0-1. The parts list is shown under the hero
     so the user sees the real inputs, never a magic number. */
  function dailyScore(day, p){
    day = day || {}; p = p || {};
    const target = p.targetKcal || 2000;
    const mt = macroTargets(p), wt = waterTarget(p);
    const parts = [];
    const meals = ["breakfast", "lunch", "dinner"]
      .filter(m => ((day.meals || {})[m] || []).length > 0).length;
    parts.push({ k: "scMeals", detail: meals + "/3", pts: meals, max: 3 });
    let calPts = 0;
    if(day.kcal > 0) calPts = Math.abs(day.kcal - target) / target <= 0.15 ? 2 : 1;
    parts.push({ k: "scCal", detail: fmt(day.kcal) + " / " + fmt(target) + " " + t("kcal"),
      pts: calPts, max: 2 });
    const pr = day.p || 0;
    const pPts = pr >= mt.p * 0.8 ? 1.5 : pr >= mt.p * 0.4 ? 0.75 : 0;
    parts.push({ k: "scProtein", detail: Math.round(pr) + " / " + mt.p + " g",
      pts: pPts, max: 1.5 });
    const w = day.water || 0;
    const wPts = w >= wt * 0.8 ? 1 : w >= wt * 0.4 ? 0.5 : 0;
    parts.push({ k: "scWater", detail: (w / 1000).toFixed(1) + " / " + (wt / 1000).toFixed(1) + " L",
      pts: wPts, max: 1 });
    const st = day.steps || 0;
    const sPts = st >= 8000 ? 1.5 : st >= 4000 ? 0.75 : 0;
    parts.push({ k: "scSteps", detail: fmt(st), pts: sPts, max: 1.5 });
    const wo = (day.exercise || 0) > 0;
    parts.push({ k: "scWorkout", detail: wo ? t("workoutDone") : t("notYet"),
      pts: wo ? 1 : 0, max: 1 });
    const score = Math.min(10, Math.round(parts.reduce((s, x) => s + x.pts, 0) * 10) / 10);
    return { score, parts };
  }

  /* ---------- small builders ---------- */
  function avatar(p, size){
    size = size || 46;
    if(p.photo){
      const img = document.createElement("img");
      img.src = p.photo; img.alt = "";
      img.style.cssText = "width:" + size + "px;height:" + size + "px;border-radius:50%;object-fit:cover;flex:none";
      return img;
    }
    const d = UI.el("div", "", UI.esc(((p.name || t("guest")).trim().charAt(0) || "•").toUpperCase()));
    d.style.cssText = "width:" + size + "px;height:" + size + "px;border-radius:50%;flex:none;" +
      "display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;" +
      "background:hsl(" + ((p.color || 0) * 72) + ",60%,38%)";
    return d;
  }
  function ringSVG(pct, color, size, sw){
    size = size || 150; sw = sw || 12;
    const r = (size - sw) / 2, c = 2 * Math.PI * r;
    const off = c * (1 - Math.min(1, Math.max(0, pct)));
    const h = size / 2;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true">' +
      '<circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" stroke="var(--track,#2a2a2e)" stroke-width="' + sw + '"/>' +
      '<circle cx="' + h + '" cy="' + h + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + sw +
      '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) +
      '" transform="rotate(-90 ' + h + ' ' + h + ')"/></svg>';
  }
  function openMealLogger(){ if(window.F1T_MEALS && F1T_MEALS.openLogger) F1T_MEALS.openLogger(); }
  function openWaterLogger(){ if(window.F1T_HEALTH && F1T_HEALTH.openWater) F1T_HEALTH.openWater(); }
  function openWeightLogger(){ if(window.F1T_HEALTH && F1T_HEALTH.openWeight) F1T_HEALTH.openWeight(); }
  function openWorkout(){ if(window.F1T_WORKOUT && F1T_WORKOUT.open) F1T_WORKOUT.open(); }

  /* ---------- 1. header ---------- */
  function renderHead(box, p){
    const h = new Date().getHours();
    const gk = h < 12 ? "hiMorning" : h < 18 ? "hiAfternoon" : "hiEvening";
    const wrap = UI.el("div", "home-head");
    wrap.style.cssText = "display:flex;align-items:center;gap:var(--sp-3);margin-bottom:var(--sp-3)";
    const tx = UI.el("div", "");
    tx.style.cssText = "flex:1;min-width:0";
    const dateStr = new Date().toLocaleDateString(undefined,
      { weekday: "long", month: "long", day: "numeric" });
    tx.innerHTML = '<div style="font-size:var(--fs-sm);color:var(--ink-2)">' + UI.esc(dateStr) + '</div>' +
      '<h2 style="margin:.15rem 0 0;font-size:var(--fs-xl)">' + UI.esc(t(gk)) + '</h2>' +
      '<div style="font-weight:700">' + UI.esc(p.name || t("guest")) + '</div>';
    wrap.appendChild(tx);
    wrap.appendChild(avatar(p, 48));
    box.appendChild(wrap);
  }

  /* ---------- 2. Daily Score hero ---------- */
  function renderScore(box, day, p){
    const { score, parts } = dailyScore(day, p);
    const card = UI.card("glass");
    card.style.cssText = "text-align:center;margin-bottom:var(--sp-3)";
    const hero = UI.el("div", "");
    hero.style.cssText = "position:relative;display:inline-block;margin:var(--sp-2) 0";
    hero.innerHTML = ringSVG(score / 10, "var(--lime)", 168, 14) +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
      '<b style="font-size:2.6rem;line-height:1">' + score.toFixed(1) + '</b>' +
      '<span style="font-size:var(--fs-sm);color:var(--ink-2)">/ 10 · ' + UI.esc(t("dailyScore")) + '</span></div>';
    card.appendChild(hero);
    card.appendChild(UI.el("div", "muted small",
      UI.esc(t("howScored")) + " · " + UI.esc(t("today"))));
    const list = UI.el("div", "");
    list.style.cssText = "text-align:left;margin-top:var(--sp-2);display:grid;gap:.35rem";
    parts.forEach(x => {
      const row = UI.el("div", "");
      row.style.cssText = "display:flex;align-items:baseline;gap:.6rem;font-size:var(--fs-sm)";
      row.innerHTML = '<span style="flex:1;color:var(--ink-2)">' + UI.esc(t(x.k)) + '</span>' +
        '<span>' + UI.esc(x.detail) + '</span>' +
        '<b style="min-width:3.2rem;text-align:right;color:var(--lime)">' +
        x.pts + ' / ' + x.max + '</b>';
      list.appendChild(row);
    });
    card.appendChild(list);
    box.appendChild(card);
  }

  /* ---------- 3. calorie ring + macro bar ---------- */
  function renderMacros(box, day, p){
    const target = p.targetKcal || 2000;
    const mt = macroTargets(p);
    const eaten = day.kcal || 0;
    const over = eaten > target;
    const card = UI.card("");
    card.style.cssText = "margin-bottom:var(--sp-3)";
    const top = UI.el("div", "");
    top.style.cssText = "display:flex;gap:var(--sp-4);align-items:center;flex-wrap:wrap";
    const rw = UI.el("div", "ring-wrap");
    rw.style.cssText = "margin:0";
    rw.innerHTML = '<div style="position:relative">' +
      ringSVG(eaten / target, over ? "#e5484d" : "var(--lime)", 132, 13) +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">' +
      '<b style="font-size:1.5rem">' + fmt(eaten) + '</b>' +
      '<span style="font-size:var(--fs-xs);color:var(--ink-2)">' + UI.esc(t("eaten")) + '</span></div></div>';
    top.appendChild(rw);
    const leg = UI.el("div", "");
    leg.style.cssText = "flex:1;min-width:9rem;display:grid;gap:.45rem;font-size:var(--fs-sm)";
    const dot = c => '<span style="display:inline-block;width:.6rem;height:.6rem;border-radius:50%;background:' + c + ';margin-right:.45rem"></span>';
    leg.innerHTML =
      '<div>' + dot("var(--lime)") + UI.esc(t("eaten")) + ' <b>' + fmt(eaten) + '</b></div>' +
      '<div>' + dot(over ? "#e5484d" : "var(--green)") +
        (over ? UI.esc(t("overBy", { n: fmt(eaten - target) + " " + t("kcal") }))
              : UI.esc(t("leftToGo", { n: fmt(target - eaten) + " " + t("kcal") }))) + '</div>' +
      '<div>' + dot("var(--ink-3)") + UI.esc(t("target")) + ' <b>' + fmt(target) + '</b></div>';
    top.appendChild(leg);
    card.appendChild(top);
    // macro segmented bar: one segment per macro, fill = adherence vs own target
    const segs = [
      { k: "protein", a: day.p || 0, tg: mt.p, c: "#34d968" },
      { k: "carbs",   a: day.c || 0, tg: mt.c, c: "#7ce79b" },
      { k: "fat",     a: day.f || 0, tg: mt.f, c: "var(--lime)" },
    ];
    const bar = UI.el("div", "");
    bar.style.cssText = "margin-top:var(--sp-3);display:grid;gap:.55rem";
    segs.forEach(sg => {
      const pct = Math.min(100, Math.round(sg.a / sg.tg * 100));
      const row = UI.el("div", "");
      row.innerHTML =
        '<div style="display:flex;justify-content:space-between;font-size:var(--fs-sm);margin-bottom:.25rem">' +
        '<span>' + UI.esc(t(sg.k)) + '</span><span><b>' + Math.round(sg.a) + '</b> / ' + sg.tg + ' g</span></div>' +
        '<div style="height:.55rem;border-radius:99px;background:var(--track,#2a2a2e);overflow:hidden">' +
        '<div style="height:100%;width:' + pct + '%;border-radius:99px;background:' + sg.c + '"></div></div>';
      bar.appendChild(row);
    });
    card.appendChild(bar);
    box.appendChild(card);
  }

  /* ---------- 4. quick actions (only for wired modules) ---------- */
  function renderActions(box){
    const acts = [
      { icon: "utensils", label: t("logMeal"), ok: !!(window.F1T_MEALS && F1T_MEALS.openLogger), fn: openMealLogger },
      { icon: "droplet",  label: t("logWater"), ok: !!(window.F1T_HEALTH && F1T_HEALTH.openWater), fn: openWaterLogger },
      { icon: "dumbbell", label: t("startWorkout"), ok: !!(window.F1T_WORKOUT && F1T_WORKOUT.open), fn: openWorkout },
    ].filter(a => a.ok);
    if(!acts.length) return;
    const row = UI.el("div", "chips");
    row.style.cssText = "margin-bottom:var(--sp-3)";
    acts.forEach(a => {
      const b = UI.el("button", "chip", ic(a.icon, 16) + '<span style="margin-left:.4rem">' + UI.esc(a.label) + '</span>');
      b.addEventListener("click", a.fn);
      row.appendChild(b);
    });
    box.appendChild(row);
  }

  /* ---------- 5. 7-day calorie chart ---------- */
  function renderWeek(box, target){
    const card = UI.card("");
    card.style.cssText = "margin-bottom:var(--sp-3)";
    card.appendChild(UI.el("b", "", UI.esc(t("weekCal"))));
    const keys = [], vals = [];
    for(let i = 6; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = S.todayKey(d); keys.push(k);
      vals.push(S.getDay(k).kcal || 0);
    }
    if(!vals.some(v => v > 0)){
      card.appendChild(UI.empty(t("noWeekData"), null,
        (window.F1T_MEALS && F1T_MEALS.openLogger) ? t("logFirstMeal") : null,
        (window.F1T_MEALS && F1T_MEALS.openLogger) ? openMealLogger : undefined));
      box.appendChild(card);
      return;
    }
    const max = Math.max(target, ...vals, 1);
    const dows = [t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat"), t("sun")];
    const chart = UI.el("div", "bar-chart");
    vals.forEach(v => {
      const b = UI.el("div", "bar" + (v >= target * 0.9 ? "" : " dim"));
      b.style.height = Math.max(4, Math.round(v / max * 100)) + "%";
      b.title = fmt(v) + " " + t("kcal");
      chart.appendChild(b);
    });
    card.appendChild(chart);
    const labs = UI.el("div", "");
    labs.style.cssText = "display:flex;gap:.4rem;margin-top:.3rem";
    keys.forEach(k => {
      const dt = new Date(k + "T12:00:00");
      const s = UI.el("span", "", UI.esc(dows[(dt.getDay() + 6) % 7]));
      s.style.cssText = "flex:1;text-align:center;font-size:var(--fs-xs);color:var(--ink-3)";
      labs.appendChild(s);
    });
    card.appendChild(labs);
    box.appendChild(card);
  }

  /* ---------- 6. streak pill + month calendar ---------- */
  function renderCalendar(box){
    const card = UI.card("");
    card.style.cssText = "margin-bottom:var(--sp-3)";
    const head = UI.el("div", "");
    head.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-2)";
    head.appendChild(UI.el("b", "", UI.esc(t("monthWorkouts"))));
    let streak = 0;
    try{ streak = window.F1T_SCORE ? F1T_SCORE.calcStreak() : 0; }catch(e){}
    const pill = UI.el("div", "",
      ic("flame", 15) + '<b style="margin:0 .3rem">' + streak + '</b><span>' + UI.esc(t("dayStreak")) + '</span>');
    pill.style.cssText = "display:inline-flex;align-items:center;font-size:var(--fs-sm);font-weight:700;" +
      "background:var(--card-2);border:1px solid var(--line);border-radius:99px;padding:.35rem .8rem;color:var(--lime)";
    head.appendChild(pill);
    card.appendChild(head);
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const wdays = new Set();
    (S.getWorkouts() || []).forEach(w => {
      if(w.ts){ try{ wdays.add(S.todayKey(new Date(w.ts))); }catch(e){} }
    });
    const grid = UI.el("div", "cal-grid");
    grid.style.cssText = "margin:0";
    for(let i = 0; i < lead; i++) grid.appendChild(UI.el("span", "cal-d", ""));
    const todayK = S.todayKey();
    for(let d = 1; d <= days; d++){
      const k = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      const c = UI.el("span", "cal-d" + (wdays.has(k) ? " has" : ""), String(d));
      if(k === todayK) c.style.boxShadow = "inset 0 0 0 1px var(--lime)";
      grid.appendChild(c);
    }
    card.appendChild(grid);
    box.appendChild(card);
  }

  /* ---------- 7. food journal ---------- */
  function renderJournalFallback(box, day){
    const order = ["breakfast", "lunch", "dinner", "snacks"];
    let any = false;
    order.forEach(mk => {
      const items = ((day.meals || {})[mk] || []);
      if(!items.length) return;
      any = true;
      const sec = UI.el("div", "meal-sec");
      const head = UI.el("div", "meal-head",
        "<b>" + UI.esc(t(mk)) + "</b><span>" + fmt(items.reduce((s, x) => s + (x.kcal || 0), 0)) + " " + UI.esc(t("kcal")) + "</span>");
      sec.appendChild(head);
      items.forEach(x => {
        const row = UI.el("div", "meal-item");
        const nm = x.name || x.id || "";
        row.innerHTML = '<span style="flex:1;min-width:0">' + UI.esc(nm) + '</span>' +
          '<b>' + fmt(x.kcal) + ' ' + UI.esc(t("kcal")) + '</b>';
        sec.appendChild(row);
      });
      box.appendChild(sec);
    });
    if(!any){
      box.appendChild(UI.empty(t("noEntries"), null,
        (window.F1T_MEALS && F1T_MEALS.openLogger) ? t("addFood") : null,
        (window.F1T_MEALS && F1T_MEALS.openLogger) ? openMealLogger : undefined));
    }
  }
  function renderJournal(box, day){
    const card = UI.card("");
    card.style.cssText = "margin-bottom:var(--sp-3)";
    card.appendChild(UI.el("b", "", UI.esc(t("foodJournal"))));
    const M = window.F1T_MEALS;
    if(M && typeof M.renderDayMeals === "function"){
      try{ M.renderDayMeals(card); return void box.appendChild(card); }
      catch(e){ /* fall through to the real-data fallback */ }
    }
    renderJournalFallback(card, day);
    box.appendChild(card);
  }

  /* ---------- 8. weight sparkline ---------- */
  function weightHistory(){
    const arr = S.read("f1t_weights", null);
    if(Array.isArray(arr) && arr.length){
      return arr
        .map(e => ({ w: +(e.w != null ? e.w : e.weight) }))
        .filter(e => e.w > 0);
    }
    const out = [];
    for(let i = 29; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const day = S.getDay(S.todayKey(d));
      if(day && day.weight) out.push({ w: +day.weight });
    }
    return out;
  }
  function renderWeight(box){
    const card = UI.card("");
    card.style.cssText = "margin-bottom:var(--sp-3)";
    const head = UI.el("div", "");
    head.style.cssText = "display:flex;align-items:baseline;justify-content:space-between;margin-bottom:var(--sp-2)";
    head.appendChild(UI.el("b", "", UI.esc(t("weightHistory"))));
    card.appendChild(head);
    const hist = weightHistory();
    if(hist.length < 2){
      card.appendChild(UI.empty(t("noWeightData"), null,
        (window.F1T_HEALTH && F1T_HEALTH.openWeight) ? t("logWeightFirst") : null,
        (window.F1T_HEALTH && F1T_HEALTH.openWeight) ? openWeightLogger : undefined));
      box.appendChild(card);
      return;
    }
    const ws = hist.map(h => h.w);
    const mn = Math.min(...ws), mx = Math.max(...ws), rg = Math.max(0.5, mx - mn);
    const pts = ws.map((v, i) =>
      (i / (ws.length - 1) * 100).toFixed(1) + "," + (32 - (v - mn) / rg * 26).toFixed(1)).join(" ");
    const last = ws[ws.length - 1], chg = last - ws[0];
    const svg = '<svg viewBox="0 0 100 38" preserveAspectRatio="none" style="width:100%;height:4.5rem;display:block" aria-hidden="true">' +
      '<polyline points="' + pts + '" fill="none" stroke="var(--lime)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const cap = UI.el("div", "");
    cap.style.cssText = "display:flex;justify-content:space-between;font-size:var(--fs-sm);color:var(--ink-2);margin-top:.3rem";
    const chgTxt = (chg >= 0 ? "+" : "") + chg.toFixed(1) + " " + t("kg");
    const chgColor = chg > 0 ? "#e5484d" : chg < 0 ? "var(--green)" : "var(--ink-2)";
    cap.innerHTML = '<span><b style="color:var(--ink)">' + last.toFixed(1) + '</b> ' + UI.esc(t("kg")) + '</span>' +
      '<span style="color:' + chgColor + '">' + UI.esc(chgTxt) + ' · ' + hist.length + ' ' + UI.esc(t("days")) + '</span>';
    card.insertAdjacentHTML("beforeend", svg);
    card.appendChild(cap);
    box.appendChild(card);
  }

  /* ---------- main ---------- */
  function renderHome(sc){
    sc.innerHTML = "";
    const box = UI.el("div", "home");
    const p = S.getProfile() || {};
    const day = S.getDay(S.todayKey());
    renderHead(box, p);
    renderScore(box, day, p);
    renderMacros(box, day, p);
    renderActions(box);
    renderWeek(box, p.targetKcal || 2000);
    renderCalendar(box);
    renderJournal(box, day);
    renderWeight(box);
    sc.appendChild(box);
  }

  return { renderHome, dailyScore, macroTargets, waterTarget };
})();
