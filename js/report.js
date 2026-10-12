/* ============ F1T v12 · Weekly Report ============
   Infographic health report for the last 7 days, built from REAL records.
   Renders a print-optimized view; the user saves it as PDF through the
   system print dialog (the honest client-side route on a static host).
   Python/WeasyPrint was used to prototype and verify the layout. */
window.F1T_REPORT = (() => {
  "use strict";
  const S = window.F1T_STORE, UI = window.F1T_UI;
  const t = k => window.F1T_t(k);

  function last7(){
    const out = [];
    for(let i=6;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i);
      const k = S.todayKey(d);
      out.push({ key:k, d, day:S.getDay(k) });
    }
    return out;
  }

  function open(){
    const days = last7();
    const hasData = days.some(x => x.day.kcal>0 || (x.day.water||0)>0);
    const w = window.open("", "_blank");
    if(!w){ UI.toast(t("popupBlocked")); return; }
    const p = S.getProfile() || {};
    const tot = days.reduce((a,x)=>({ k:a.k+x.day.kcal, p:a.p+x.day.p, w:a.w+(x.day.water||0) }), {k:0,p:0,w:0});
    const wos = S.getWorkouts().filter(x => x.ts >= Date.now()-7*864e5);
    const vol = wos.reduce((a,wo)=>a+(wo.exercises||[]).reduce((b,ex)=>b+(ex.sets||[]).reduce((c,s)=>c+(s.kg||0)*(s.reps||0),0),0),0);
    const maxK = Math.max(1, ...days.map(x=>x.day.kcal));
    const bars = days.map(x=>{
      const h = Math.round(x.day.kcal/maxK*90);
      const dl = x.d.toLocaleDateString(undefined,{weekday:"short"});
      return `<div class="rbar"><div class="rbar-fill" style="height:${h}px"></div><small>${dl}</small><b>${Math.round(x.day.kcal)}</b></div>`;
    }).join("");
    const wHist = (S.read("f1t_weights",[])||[]).slice(-7);
    const wStart = wHist[0] ? wHist[0].w : null, wEnd = wHist[wHist.length-1] ? wHist[wHist.length-1].w : null;
    const wDelta = (wStart!=null && wEnd!=null) ? (wEnd-wStart).toFixed(1) : null;

    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf8"><title>F1T ${t("weeklyReport")}</title>
<style>
*{box-sizing:border-box;margin:0}body{font-family:-apple-system,"Segoe UI",sans-serif;background:#fff;color:#111;padding:32px;max-width:720px;margin:0 auto}
.h{display:flex;align-items:center;gap:12px;border-bottom:3px solid #aefe02;padding-bottom:16px;margin-bottom:20px}
.h .mk{width:46px;height:46px;border-radius:12px;background:#aefe02;color:#0b0c0e;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:18px}
h1{font-size:26px}h2{font-size:17px;margin:22px 0 10px}.sub{color:#666;font-size:13px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}
.kpi{background:#f4f4f2;border-radius:12px;padding:12px;text-align:center}
.kpi small{display:block;color:#777;font-size:11px;font-weight:700;text-transform:uppercase}
.kpi b{font-size:21px}.kpi b.g{color:#16a34a}
.bars{display:flex;align-items:flex-end;gap:8px;height:150px;background:#f7f7f5;border-radius:12px;padding:12px 12px 6px}
.rbar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px}
.rbar-fill{width:70%;background:#aefe02;border-radius:6px 6px 0 0;min-height:3px}
.rbar small{font-size:10px;color:#888}.rbar b{font-size:11px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
td,th{padding:8px;border-bottom:1px solid #eee;text-align:right}td:first-child,th:first-child{text-align:left}
.note{font-size:11px;color:#999;margin-top:24px;border-top:1px solid #eee;padding-top:12px}
@media print{.noprint{display:none}}
</style></head><body>
<div class="h"><div class="mk">F1</div><div><h1>F1T ${t("weeklyReport")}</h1>
<div class="sub">${UI.esc(p.name||"")} · ${days[0].d.toLocaleDateString()} – ${days[6].d.toLocaleDateString()}</div></div></div>
${hasData?`
<div class="kpis">
<div class="kpi"><small>${t("kcal")}</small><b>${Math.round(tot.k/7)}</b><small>/day</small></div>
<div class="kpi"><small>${t("protein")}</small><b>${Math.round(tot.p/7)}g</b><small>/day</small></div>
<div class="kpi"><small>${t("water")}</small><b>${(tot.w/7000).toFixed(1)}L</b><small>/day</small></div>
<div class="kpi"><small>${t("workouts")}</small><b class="g">${wos.length}</b></div>
</div>
<h2>${t("kcal")} · 7 ${t("days")}</h2><div class="bars">${bars}</div>
<h2>${t("workouts")}</h2>
<table><tr><th></th><th>${t("sessions")}</th><th>${t("volume")}</th><th>${t("weightChange")}</th></tr>
<tr><td>${t("week")}</td><td>${wos.length}</td><td>${Math.round(vol).toLocaleString()} kg</td><td>${wDelta!=null?(wDelta>0?"+":"")+wDelta+" kg":"–"}</td></tr></table>
`:`<p class="sub">${t("noReportData")}</p>`}
<p class="note">${t("reportNote")}</p>
<div class="noprint" style="margin-top:16px"><button onclick="window.print()" style="padding:12px 28px;border-radius:99px;border:0;background:#aefe02;font-weight:800;font-size:15px">${t("savePdf")}</button></div>
</body></html>`);
    w.document.close();
  }

  return { open };
})();
