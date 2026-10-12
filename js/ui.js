/* ============ F1T v12 · UI components ============
   Reusable components built from design tokens. Every component is
   state-driven: loading only during real ops, success only after real
   success, disabled only when the action is truly unavailable. */
window.F1T_UI = (() => {
  "use strict";

  function el(tag, cls, html){
    const e = document.createElement(tag);
    if(cls) e.className = cls;
    if(html != null) e.innerHTML = html;
    return e;
  }
  function esc(s){
    return String(s==null?"":s).replace(/[&<>"']/g, c =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }

  /* ---------- buttons: loading/disabled reflect real state ---------- */
  function btn(label, opts){
    opts = opts || {};
    const b = el("button", "btn"+(opts.kind?" btn-"+opts.kind:"")+(opts.block===false?"":" btn-block"));
    b.innerHTML = `<span class="btn-tx">${esc(label)}</span>`;
    if(opts.icon && window.f1tIcon) b.insertAdjacentHTML("afterbegin", window.f1tIcon(opts.icon, 18));
    if(opts.onClick) b.addEventListener("click", opts.onClick);
    b.setBusy = on => { b.disabled = !!on; b.classList.toggle("busy", !!on); };
    b.setLabel = t => { b.querySelector(".btn-tx").textContent = t; };
    return b;
  }

  /* ---------- cards ---------- */
  function card(cls){ return el("div", "card "+(cls||"")); }

  /* ---------- bottom sheet: real open/close, focus-safe ---------- */
  function sheet(build){
    const root = document.getElementById("sheet-root");
    root.innerHTML = "";
    const back = el("div", "sheet-back");
    const sh = el("div", "sheet");
    sh.appendChild(el("div", "sheet-grip"));
    const body = el("div", "sheet-body");
    sh.appendChild(body);
    root.appendChild(back); root.appendChild(sh);
    const close = () => {
      sh.classList.add("out"); back.classList.add("out");
      setTimeout(()=>{ root.innerHTML=""; }, 200);
    };
    back.addEventListener("click", close);
    build(body, close);
    requestAnimationFrame(()=>{ back.classList.add("on"); sh.classList.add("on"); });
    return { close, body };
  }

  /* ---------- fields ---------- */
  function field(label, input){
    const w = el("label", "field");
    w.appendChild(el("span", "field-lb", esc(label)));
    w.appendChild(input);
    return w;
  }
  function input(opts){
    opts = opts || {};
    const i = el("input", "inp");
    i.type = opts.type || "text";
    if(opts.placeholder) i.placeholder = opts.placeholder;
    if(opts.value != null) i.value = opts.value;
    if(opts.inputmode) i.inputMode = opts.inputmode;
    return i;
  }

  /* ---------- segmented control ---------- */
  function seg(options, cur, onPick){
    const w = el("div", "seg");
    options.forEach(o => {
      const b = el("button", "seg-b"+(o.v===cur?" on":""), esc(o.t));
      b.addEventListener("click", ()=>{ onPick(o.v); });
      w.appendChild(b);
    });
    return w;
  }

  /* ---------- honest states ---------- */
  function stateBox(kind, title, sub, actionLabel, onAction){
    const w = el("div", "state state-"+kind);
    w.innerHTML = `<b>${esc(title)}</b>${sub?`<p>${esc(sub)}</p>`:""}`;
    if(actionLabel && onAction){
      const b = btn(actionLabel, { kind:"lime" });
      b.addEventListener("click", onAction);
      w.appendChild(b);
    }
    return w;
  }
  const loading = label => stateBox("loading", label || "Loading…");
  const empty = (t, s, al, fn) => stateBox("empty", t, s, al, fn);
  const errorBox = (t, s, al, fn) => stateBox("error", t, s, al, fn);

  /* ---------- toast: only for real events ---------- */
  let toastT = null;
  function toast(msg){
    let t = document.getElementById("toast");
    if(!t){ t = el("div", "toast"); t.id = "toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(()=>t.classList.remove("on"), 2600);
  }

  /* ---------- confirm dialog (real choice, no fake) ---------- */
  function confirmDlg(title, sub, okLabel, onOk){
    const { close, body } = sheet((b, c) => {
      b.appendChild(el("h3", "", esc(title)));
      if(sub) b.appendChild(el("p", "muted", esc(sub)));
      const row = el("div", "row-2");
      const cancel = btn("Cancel", { kind:"ghost" });
      cancel.addEventListener("click", c);
      const ok = btn(okLabel, { kind:"lime" });
      ok.addEventListener("click", ()=>{ c(); onOk(); });
      row.appendChild(cancel); row.appendChild(ok);
      b.appendChild(row);
    });
    return close;
  }

  return { el, esc, btn, card, sheet, field, input, seg,
    loading, empty, errorBox, toast, confirmDlg };
})();
