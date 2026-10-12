/* ============ F1T v12 · Meals ============
   Meal logging (bottom sheet) + food journal timeline.
   All state is real: every entry writes to F1T_STORE and updates the
   day totals. No fake states, no simulated saves, no placeholders. */
window.F1T_MEALS = (() => {
  "use strict";
  const S = window.F1T_STORE, UI = window.F1T_UI;
  const t = k => (typeof window.F1T_t === "function" ? window.F1T_t(k) : k);
  const MEALS = ["breakfast", "lunch", "dinner", "snacks"];
  const FOODS = () => window.F1T_FOODS || [];
  const icon = (n, s) => window.f1tIcon ? window.f1tIcon(n, s || 22) : "";
  const lang = () => document.documentElement.lang || "en";
  const foodName = f => lang() === "my" ? (f.my || f.en) : (f.en || f.my);
  const entryName = e => lang() === "my" ? (e.name_my || e.name_en) : (e.name_en || e.name_my);
  const r1 = v => Math.round(v * 10) / 10;
  const uid = () => "m" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  const macroLine = o => "P " + o.p + "g · C " + o.c + "g · F " + o.f + "g";

  /* ---------- module styles (self-contained, design tokens only) ---------- */
  const CSS = [
    ".ml-search{display:flex;align-items:center;gap:.5rem;background:var(--surface);",
    "border:.07rem solid var(--line-2);border-radius:var(--r-md);padding:0 .9rem;margin-bottom:var(--sp-2)}",
    ".ml-search .inp{border:0;background:transparent;padding:.85rem 0}",
    ".ml-search .inp:focus{box-shadow:none}",
    ".ml-search-ico{color:var(--ink-3);display:flex;flex:none}",
    ".ml-list{display:flex;flex-direction:column;gap:.4rem;max-height:16rem;overflow-y:auto;margin-bottom:var(--sp-3)}",
    ".ml-food{display:flex;align-items:center;gap:.8rem;width:100%;text-align:left;background:var(--card);",
    "border:.07rem solid var(--line);border-radius:var(--r-md);padding:.7rem .9rem;min-height:var(--touch-min);color:var(--ink)}",
    ".ml-food:active{border-color:var(--lime)}",
    ".ml-fico{color:var(--lime);display:flex;flex:none}",
    ".ml-finfo{flex:1;min-width:0}",
    ".ml-finfo b{display:block;font-size:var(--fs-md);font-weight:700;line-height:1.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".ml-finfo small{color:var(--ink-2);font-size:var(--fs-sm);line-height:1.5}",
    ".ml-fkcal{font-weight:800;white-space:nowrap}",
    ".ml-fkcal small{color:var(--ink-2);font-weight:600}",
    ".ml-none{color:var(--ink-2);text-align:center;padding:1.2rem;font-size:var(--fs-sm);line-height:1.6}",
    ".ml-comp{margin-bottom:var(--sp-3)}",
    ".ml-hint{color:var(--ink-2);font-size:var(--fs-sm);line-height:1.6;margin:0}",
    ".ml-picked-name{font-weight:800;font-size:var(--fs-md);line-height:1.6;display:block;margin-bottom:.2rem}",
    ".ml-picked{display:flex;align-items:center;gap:.8rem;margin-bottom:.4rem}",
    ".ml-steplab{font-size:var(--fs-sm);font-weight:700;color:var(--ink-2);margin:.6rem 0 .2rem}",
    ".ml-stepper{display:flex;align-items:center;gap:.8rem}",
    ".ml-step{width:2.75rem;height:2.75rem;border-radius:50%;background:var(--surface);",
    "border:.07rem solid var(--line-2);color:var(--ink);font-size:1.3rem;font-weight:800;",
    "display:flex;align-items:center;justify-content:center;flex:none}",
    ".ml-step:active{background:var(--lime);color:#0d0d0d}",
    ".ml-qty{min-width:3rem;text-align:center;font-weight:800;font-size:var(--fs-lg)}",
    ".ml-kcalprev{color:var(--ink-2);font-size:var(--fs-sm);margin-left:auto;white-space:nowrap}",
    ".ml-photo-row{display:flex;align-items:center;gap:.7rem;margin:.8rem 0;flex-wrap:wrap}",
    ".ml-thumb{width:3.5rem;height:3.5rem;border-radius:var(--r-sm);object-fit:cover;border:.07rem solid var(--line-2)}",
    ".ml-rm{background:none;border:0;color:var(--red);font-size:var(--fs-sm);font-weight:700;padding:.5rem}",
    ".ml-err{color:var(--red);font-size:var(--fs-sm);font-weight:600;margin:.4rem 0;line-height:1.5}",
    ".ml-total{display:flex;justify-content:space-between;align-items:center;background:var(--card);",
    "border:.07rem solid var(--line);border-radius:var(--r-md);padding:.8rem 1rem;margin-bottom:var(--sp-2);font-weight:700}",
    ".ml-total b{color:var(--lime);font-size:var(--fs-lg)}",
    ".ml-custom-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem}",
    ".ml-sec{margin-bottom:var(--sp-4)}",
    ".ml-sec-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:var(--sp-2)}",
    ".ml-sec-h b{font-size:var(--fs-md);line-height:1.6}",
    ".ml-sec-h span{color:var(--lime);font-weight:800;font-size:var(--fs-sm);white-space:nowrap}",
    ".ml-entry{display:flex;align-items:center;gap:.8rem;background:var(--card);",
    "border:.07rem solid var(--line);border-radius:var(--r-md);padding:.6rem .8rem;margin-bottom:.45rem}",
    ".ml-eico{width:2.75rem;height:2.75rem;flex:none;display:flex;align-items:center;justify-content:center;",
    "background:var(--surface);border-radius:var(--r-sm);color:var(--lime);overflow:hidden}",
    ".ml-ethumb{width:100%;height:100%;object-fit:cover}",
    ".ml-einfo{flex:1;min-width:0}",
    ".ml-einfo b{display:block;font-size:var(--fs-md);line-height:1.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".ml-einfo small{color:var(--ink-2);font-size:var(--fs-sm);line-height:1.5}",
    ".ml-ekcal{font-weight:800;white-space:nowrap}",
    ".ml-del{flex:none;width:2.5rem;height:2.5rem;border-radius:50%;background:transparent;",
    "border:.07rem solid var(--line);color:var(--red);display:flex;align-items:center;justify-content:center}",
    ".ml-del:active{background:var(--red);color:#fff;border-color:var(--red)}",
    ".ml-custbtn{margin-bottom:var(--sp-3)}",
  ].join("\n");
  if(!document.getElementById("f1t-meals-css")){
    const st = document.createElement("style");
    st.id = "f1t-meals-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function defaultMeal(){
    const h = new Date().getHours();
    return h < 10 ? "breakfast" : h < 15 ? "lunch" : h < 21 ? "dinner" : "snacks";
  }
  function mealArr(day, meal){
    if(!day.meals) day.meals = { breakfast:[], lunch:[], dinner:[], snacks:[] };
    if(!day.meals[meal]) day.meals[meal] = [];
    return day.meals[meal];
  }
  function num(v, emptyAs){
    if(v == null) return NaN;
    const s = String(v).trim();
    if(s === "") return emptyAs;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }
  function fmtQty(q){ return Number.isInteger(q) ? String(q) : q.toFixed(1); }

  /* downscale a photo so entries stay light in storage */
  function downscale(file, maxSize){
    return new Promise(res => {
      try{
        if(!file || !file.type || file.type.indexOf("image/") !== 0) return res(null);
        const img = new Image();
        img.onload = () => {
          try{
            const max = maxSize || 480;
            let w = img.width, h = img.height;
            if(!w || !h) return res(null);
            if(w > max || h > max){ const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
            const c = document.createElement("canvas");
            c.width = w; c.height = h;
            c.getContext("2d").drawImage(img, 0, 0, w, h);
            try{ URL.revokeObjectURL(img.src); }catch(e){}
            res(c.toDataURL("image/jpeg", 0.72));
          }catch(e){ res(null); }
        };
        img.onerror = () => res(null);
        img.src = URL.createObjectURL(file);
      }catch(e){ res(null); }
    });
  }

  /* ================= logger sheet ================= */
  function openLogger(meal){
    if(MEALS.indexOf(meal) < 0) meal = defaultMeal();
    const dk = S.todayKey();
    const state = {
      meal, mode:"pick", picked:null, qty:1, photo:null,
      custom:{ name:"", kcal:"", p:"", c:"", f:"" },
    };

    UI.sheet((body, close) => {
      const head = UI.el("h3");
      const segWrap = UI.el("div");
      const comp = UI.el("div", "card ml-comp");
      const totalBar = UI.el("div", "ml-total");
      body.appendChild(head); body.appendChild(segWrap); body.appendChild(comp);

      /* search */
      const sWrap = UI.el("div", "ml-search");
      const sIco = UI.el("span", "ml-search-ico", icon("search", 18));
      const q = UI.input({ placeholder:t("searchFood") });
      q.setAttribute("aria-label", t("searchFood"));
      sWrap.appendChild(sIco); sWrap.appendChild(q);
      body.appendChild(sWrap);
      const list = UI.el("div", "ml-list");
      body.appendChild(list);

      /* custom toggle */
      const custBtn = UI.btn(t("customFood"), { kind:"ghost", icon:"pencil" });
      custBtn.classList.add("ml-custbtn");
      custBtn.addEventListener("click", () => {
        state.mode = state.mode === "custom" ? "pick" : "custom";
        if(state.mode === "custom") state.picked = null;
        paintComp();
      });
      body.appendChild(custBtn);
      body.appendChild(totalBar);

      function paintHead(){
        head.textContent = t(state.meal) + " · " + t("addFood");
      }
      function paintSeg(){
        segWrap.innerHTML = "";
        segWrap.appendChild(UI.seg(
          MEALS.map(m => ({ v:m, t:t(m) })),
          state.meal,
          v => { state.meal = v; paintHead(); paintSeg(); paintTotal(); }
        ));
      }
      function paintTotal(){
        const day = S.getDay(dk);
        const arr = ((day.meals || {})[state.meal]) || [];
        const kcal = arr.reduce((a, e) => a + (+e.kcal || 0), 0);
        totalBar.innerHTML = "";
        totalBar.appendChild(UI.el("span", "", UI.esc(t("mealTotal"))));
        totalBar.appendChild(UI.el("b", "", Math.round(kcal) + " " + UI.esc(t("kcal"))));
      }

      function paintList(query){
        const ql = (query || "").toLowerCase();
        const res = FOODS().filter(f => {
          if(!ql) return true;
          return ((f.en || "") + " " + (f.my || "")).toLowerCase().indexOf(ql) >= 0;
        }).slice(0, 40);
        list.innerHTML = "";
        if(!res.length){
          list.appendChild(UI.el("div", "ml-none", UI.esc(t("noFoodMatch"))));
          return;
        }
        res.forEach(f => {
          const b = UI.el("button", "ml-food");
          b.innerHTML =
            '<span class="ml-fico">' + icon(f.ic || "utensils", 22) + "</span>" +
            '<span class="ml-finfo"><b>' + UI.esc(foodName(f)) + "</b>" +
            "<small>" + UI.esc(macroLine(f)) + "</small></span>" +
            '<span class="ml-fkcal">' + f.kcal + "<small> " + UI.esc(t("kcal")) + "</small></span>";
          b.addEventListener("click", () => {
            state.mode = "pick"; state.picked = f; state.qty = 1;
            paintComp();
            if(comp.scrollIntoView) comp.scrollIntoView({ block:"nearest", behavior:"smooth" });
          });
          list.appendChild(b);
        });
      }

      function photoRow(){
        const row = UI.el("div", "ml-photo-row");
        const fi = document.createElement("input");
        fi.type = "file"; fi.accept = "image/*";
        fi.setAttribute("capture", "environment");
        fi.hidden = true;
        const take = UI.btn(t("takePhoto"), { kind:"ghost", icon:"camera", block:false });
        take.addEventListener("click", () => fi.click());
        row.appendChild(take); row.appendChild(fi);
        if(state.photo){
          const th = UI.el("img", "ml-thumb");
          th.src = state.photo; th.alt = "";
          const rm = UI.el("button", "ml-rm", UI.esc(t("removePhoto")));
          rm.addEventListener("click", () => { state.photo = null; paintComp(); });
          row.appendChild(th); row.appendChild(rm);
        }
        fi.addEventListener("change", async () => {
          const f = fi.files && fi.files[0];
          fi.value = "";
          if(!f) return;
          take.setBusy(true);
          try{
            const url = await downscale(f, 480);
            if(url){ state.photo = url; paintComp(); }
            else UI.toast(t("photoFail"));
          }finally{
            take.setBusy(false);
          }
        });
        return row;
      }

      function stepper(onChange){
        const wrap = UI.el("div", "ml-stepper");
        const minus = UI.el("button", "ml-step", "−");
        minus.setAttribute("aria-label", t("servings"));
        const qv = UI.el("span", "ml-qty");
        const plus = UI.el("button", "ml-step", "+");
        plus.setAttribute("aria-label", t("servings"));
        const prev = UI.el("span", "ml-kcalprev");
        const paint = () => {
          qv.textContent = fmtQty(state.qty);
          prev.textContent = "= " + Math.round(onChange.peek() * state.qty) + " " + t("kcal");
        };
        minus.addEventListener("click", () => { state.qty = Math.max(0.5, r1(state.qty - 0.5)); paint(); });
        plus.addEventListener("click", () => { state.qty = Math.min(20, r1(state.qty + 0.5)); paint(); });
        wrap.appendChild(minus); wrap.appendChild(qv); wrap.appendChild(plus); wrap.appendChild(prev);
        paint();
        return wrap;
      }

      function paintComp(){
        comp.innerHTML = "";
        if(state.mode === "custom"){
          comp.appendChild(UI.el("b", "ml-picked-name", UI.esc(t("customFood"))));
          const nm = UI.input({ placeholder:t("foodName") });
          nm.value = state.custom.name;
          nm.setAttribute("aria-label", t("foodName"));
          nm.addEventListener("input", () => { state.custom.name = nm.value; hideErr(); });
          comp.appendChild(UI.field(t("foodName"), nm));
          const kc = UI.input({ type:"number", inputmode:"decimal", placeholder:"0" });
          kc.value = state.custom.kcal;
          kc.setAttribute("aria-label", t("calories"));
          kc.addEventListener("input", () => { state.custom.kcal = kc.value; hideErr(); });
          comp.appendChild(UI.field(t("calories") + " (" + t("kcal") + ")", kc));
          const grid = UI.el("div", "ml-custom-grid");
          [["p", t("protein")], ["c", t("carbs")], ["f", t("fat")]].forEach(([k, lb]) => {
            const i = UI.input({ type:"number", inputmode:"decimal", placeholder:"0" });
            i.value = state.custom[k];
            i.setAttribute("aria-label", lb);
            i.addEventListener("input", () => { state.custom[k] = i.value; hideErr(); });
            grid.appendChild(UI.field(lb, i));
          });
          comp.appendChild(grid);
        }else if(state.picked){
          const f = state.picked;
          const top = UI.el("div", "ml-picked");
          top.innerHTML = '<span class="ml-fico">' + icon(f.ic || "utensils", 24) + "</span>" +
            '<span class="ml-finfo"><b>' + UI.esc(foodName(f)) + "</b>" +
            "<small>" + UI.esc(macroLine(f)) + "</small></span>";
          comp.appendChild(top);
        }else{
          comp.appendChild(UI.el("p", "ml-hint", UI.esc(t("searchFood"))));
          return;
        }
        comp.appendChild(UI.el("div", "ml-steplab", UI.esc(t("servings"))));
        const peek = state.mode === "custom"
          ? () => { const k = num(state.custom.kcal, NaN); return Number.isFinite(k) ? k : 0; }
          : () => state.picked.kcal;
        comp.appendChild(stepper({ peek }));
        comp.appendChild(photoRow());
        const err = UI.el("div", "ml-err");
        err.hidden = true;
        comp.appendChild(err);
        const add = UI.btn(t("add"), { kind:"lime", icon:"plus" });
        add.addEventListener("click", () => {
          if(state.mode === "custom") doAddCustom(add, err);
          else doAddPick(add);
        });
        comp.appendChild(add);

        function hideErr(){ err.hidden = true; }
      }

      async function persist(entry, btn){
        btn.setBusy(true);
        try{
          const day = S.getDay(dk);
          mealArr(day, state.meal).push(entry);
          day.kcal = Math.max(0, Math.round((+day.kcal || 0) + entry.kcal));
          day.p = Math.max(0, r1((+day.p || 0) + entry.p));
          day.c = Math.max(0, r1((+day.c || 0) + entry.c));
          day.f = Math.max(0, r1((+day.f || 0) + entry.f));
          await S.saveDay(dk, day);
          UI.toast(t("logged"));
          state.picked = null; state.qty = 1; state.photo = null;
          state.mode = "pick"; state.custom = { name:"", kcal:"", p:"", c:"", f:"" };
        }finally{
          btn.setBusy(false);
        }
        paintComp(); paintTotal();
      }

      async function doAddPick(btn){
        const f = state.picked;
        if(!f) return;
        const q = state.qty;
        await persist({
          id:uid(), name_en:f.en, name_my:f.my,
          kcal:Math.round(f.kcal * q), p:r1(f.p * q), c:r1(f.c * q), f:r1(f.f * q),
          qty:q, photo:state.photo, at:Date.now(), custom:false,
        }, btn);
      }

      async function doAddCustom(btn, err){
        const name = state.custom.name.trim();
        const kcal = num(state.custom.kcal, NaN);
        const p = num(state.custom.p, 0), c = num(state.custom.c, 0), f = num(state.custom.f, 0);
        const validMacro = v => Number.isFinite(v) && v >= 0 && v <= 100000;
        if(!name || !Number.isFinite(kcal) || kcal <= 0 || kcal > 100000 ||
           !validMacro(p) || !validMacro(c) || !validMacro(f)){
          err.textContent = t("needNameKcal");
          err.hidden = false;
          return;
        }
        err.hidden = true;
        const q = state.qty;
        await persist({
          id:uid(), name_en:name, name_my:name,
          kcal:Math.round(kcal * q), p:r1(p * q), c:r1(c * q), f:r1(f * q),
          qty:q, photo:state.photo, at:Date.now(), custom:true,
        }, btn);
      }

      q.addEventListener("input", () => paintList(q.value.trim()));
      paintHead(); paintSeg(); paintList(""); paintComp(); paintTotal();
    });
  }

  /* ================= food journal ================= */
  function entryRow(meal, e, dk){
    const row = UI.el("div", "ml-entry");
    const left = UI.el("span", "ml-eico");
    if(e.photo){
      const im = UI.el("img", "ml-ethumb");
      im.src = e.photo; im.alt = "";
      left.appendChild(im);
    }else{
      left.innerHTML = icon("utensils", 20);
    }
    const info = UI.el("span", "ml-einfo");
    const nm = UI.el("b", "", UI.esc(entryName(e)));
    const bits = [];
    if(e.qty && e.qty !== 1) bits.push(fmtQty(e.qty) + " ×");
    bits.push(macroLine(e));
    if(e.custom) bits.push(t("customTag"));
    const sub = UI.el("small", "", UI.esc(bits.join(" · ")));
    info.appendChild(nm); info.appendChild(sub);
    const kc = UI.el("span", "ml-ekcal", String(Math.round(+e.kcal || 0)));
    const del = UI.el("button", "ml-del", icon("x", 16));
    del.setAttribute("aria-label", t("delEntryQ"));
    del.addEventListener("click", () => {
      UI.confirmDlg(t("delEntryQ"), entryName(e), t("del"), async () => {
        const day = S.getDay(dk);
        const arr = ((day.meals || {})[meal]) || [];
        const ix = arr.findIndex(x => x.id === e.id);
        if(ix < 0) return;
        const gone = arr[ix];
        arr.splice(ix, 1);
        day.kcal = Math.max(0, Math.round((+day.kcal || 0) - (+gone.kcal || 0)));
        day.p = Math.max(0, r1((+day.p || 0) - (+gone.p || 0)));
        day.c = Math.max(0, r1((+day.c || 0) - (+gone.c || 0)));
        day.f = Math.max(0, r1((+day.f || 0) - (+gone.f || 0)));
        await S.saveDay(dk, day);
        UI.toast(t("entryDeleted"));
      });
    });
    row.appendChild(left); row.appendChild(info); row.appendChild(kc); row.appendChild(del);
    return row;
  }

  function renderDayMeals(el, dateKey){
    const dk = dateKey || S.todayKey();
    if(el._mlUnsub){ try{ el._mlUnsub(); }catch(e){} el._mlUnsub = null; }
    const render = () => {
      const day = S.getDay(dk);
      const meals = day.meals || {};
      el.innerHTML = "";
      let any = false;
      MEALS.forEach(m => {
        const arr = meals[m] || [];
        if(!arr.length) return;
        any = true;
        const sec = UI.el("section", "ml-sec");
        const sub = arr.reduce((a, e) => a + (+e.kcal || 0), 0);
        const head = UI.el("div", "ml-sec-h");
        head.appendChild(UI.el("b", "", UI.esc(t(m))));
        head.appendChild(UI.el("span", "", Math.round(sub) + " " + UI.esc(t("kcal"))));
        sec.appendChild(head);
        arr.forEach(e => sec.appendChild(entryRow(m, e, dk)));
        el.appendChild(sec);
      });
      if(!any) el.appendChild(UI.empty(t("noMeals")));
    };
    el._mlUnsub = S.on("f1t_day_" + dk, render);
    render();
  }

  return { openLogger, renderDayMeals };
})();
