/* ============ F1T v12 · Anatomy explorer ============
   Real BodyParts3D 4.0 meshes (CC BY 4.0, Database Center for Life Science).
   Never fabricated: every muscle shown comes from the official archive.
   Attribution: "BodyParts3D, © The Database Center for Life Science
   licensed under CC Attribution 4.0 International". */
window.F1T_ANAT = (() => {
  "use strict";
  const UI = window.F1T_UI;

  const THREE_CDN = "https://unpkg.com/three@0.147.0";
  const MANIFEST = "assets/anatomy/manifest.json";

  /* Curated functional metadata (authored; geometry is licensed BP3D data).
     Muscles genuinely absent from the BodyParts3D 4.0 dataset are listed
     in NOT_IN_DATASET and shown honestly, never invented. */
  const META = {
    pec_major:      { fn:"Adducts and medially rotates the arm; drives pushing movements.", ex:["Bench press","Push-ups","Dips"] },
    delt_ant:       { fn:"Flexes and medially rotates the arm (front of the shoulder).", ex:["Overhead press","Front raise","Incline press"] },
    delt_lat:       { fn:"Abducts the arm out to the side.", ex:["Lateral raise","Overhead press","Upright row"] },
    delt_post:      { fn:"Extends and laterally rotates the arm (rear of the shoulder).", ex:["Reverse fly","Face pull","Bent-over row"] },
    biceps:         { fn:"Flexes the elbow and supinates the forearm.", ex:["Barbell curl","Chin-ups","Hammer curls"] },
    triceps:        { fn:"Extends the elbow; the largest muscle of the upper arm.", ex:["Dips","Pushdowns","Overhead extension"] },
    forearm_flex:   { fn:"Flex the wrist and fingers (grip muscles).", ex:["Wrist curls","Farmer's carry","Dead hangs"] },
    forearm_ext:    { fn:"Extend the wrist and fingers.", ex:["Reverse wrist curls","Reverse curls"] },
    ab_wall:        { fn:"Flexes and stabilizes the trunk. Note: BodyParts3D models the abdominal wall as one mesh; rectus abdominis, obliques and transversus abdominis are not separate meshes in this dataset.", ex:["Plank","Crunches","Hanging knee raises"] },
    serratus_ant:   { fn:"Protracts the scapula and supports overhead reaching.", ex:["Push-up plus","Wall slides"] },
    traps:          { fn:"Elevate, retract and rotate the shoulder blades.", ex:["Shrugs","Face pulls","Rows"] },
    rhomboids:      { fn:"Retract the shoulder blades toward the spine.", ex:["Barbell rows","Band pull-aparts"] },
    glute_max:      { fn:"Extends and laterally rotates the hip; powers standing up.", ex:["Hip thrust","Squat","Deadlift"] },
    glute_med:      { fn:"Abducts the hip and stabilizes the pelvis when walking.", ex:["Clamshells","Lateral band walk"] },
    glute_min:      { fn:"Deep hip abductor and pelvic stabilizer.", ex:["Clamshells","Side-lying abduction"] },
    rectus_femoris: { fn:"Extends the knee and flexes the hip (the only quad crossing the hip).", ex:["Squats","Lunges","Leg extension"] },
    vastus_lat:     { fn:"Extends the knee (outer quadriceps).", ex:["Squats","Step-ups","Leg press"] },
    vastus_med:     { fn:"Extends the knee and guides the kneecap (inner quadriceps).", ex:["Squats","Split squats"] },
    vastus_int:     { fn:"Extends the knee (deep quadriceps head under rectus femoris).", ex:["Squats","Leg press"] },
    biceps_femoris: { fn:"Flexes the knee and extends the hip (outer hamstring).", ex:["Romanian deadlift","Leg curl"] },
    semitendinosus: { fn:"Flexes the knee and extends the hip (inner hamstring).", ex:["Leg curl","Romanian deadlift"] },
    semimembranosus:{ fn:"Flexes the knee and extends the hip (deep inner hamstring).", ex:["Leg curl","Good mornings"] },
    adductors:      { fn:"Draw the thighs together (adductor longus, brevis and magnus).", ex:["Copenhagen plank","Sumo squat"] },
    iliopsoas:      { fn:"The strongest hip flexor (psoas major plus iliacus).", ex:["Hanging knee raises","Mountain climbers"] },
    gastroc:        { fn:"Plantarflexes the foot with a straight knee (upper calf).", ex:["Standing calf raise","Jump rope"] },
    soleus:         { fn:"Plantarflexes the foot with a bent knee (deep calf).", ex:["Seated calf raise"] },
    tibialis_ant:   { fn:"Dorsiflexes the foot (front of the shin).", ex:["Toe raises","Heel walks"] },
    sartorius:      { fn:"Flexes, abducts and laterally rotates the hip; flexes the knee.", ex:["Lunges","Step-ups"] },
    tfl:            { fn:"Abducts and flexes the hip; tensions the IT band.", ex:["Clamshells","Lateral walks"] },
    gracilis:       { fn:"Adducts the thigh and assists knee flexion.", ex:["Sumo squat","Adduction work"] },
    brachialis:     { fn:"The workhorse elbow flexor beneath the biceps.", ex:["Hammer curls","Reverse curls"] },
    coracobrachialis:{ fn:"Flexes and adducts the arm at the shoulder.", ex:["Cable fly","Front raise"] },
    levator_scap:   { fn:"Elevates the shoulder blade.", ex:["Shrugs"] },
    teres_major:    { fn:"Adducts and extends the arm.", ex:["Lat pulldown","Straight-arm pulldown"] },
    teres_minor:    { fn:"Laterally rotates the arm (rotator cuff).", ex:["External rotation"] },
    supraspinatus:  { fn:"Initiates arm abduction (rotator cuff).", ex:["Scaption","Full can"] },
    infraspinatus:  { fn:"Laterally rotates the arm (rotator cuff).", ex:["External rotation","Face pull"] },
    erector:        { fn:"Extends and stabilizes the spine (iliocostalis, longissimus, spinalis).", ex:["Back extensions","Deadlift"] },
  };
  const NOT_IN_DATASET = [
    ["Latissimus dorsi", "not present as a named mesh in BodyParts3D 4.0"],
    ["Quadratus lumborum", "not present as a named mesh in BodyParts3D 4.0"],
    ["Rectus abdominis / obliques / transversus abdominis", "BodyParts3D models the abdominal wall as one mesh (see Abdominal wall)"],
  ];

  function loadScript(src, timeoutMs){
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.async = true;
      const to = setTimeout(()=>{ s.remove(); rej(new Error("timeout")); }, timeoutMs||15000);
      s.onload = ()=>{ clearTimeout(to); res(); };
      s.onerror = ()=>{ clearTimeout(to); s.remove(); rej(new Error("load failed")); };
      document.head.appendChild(s);
    });
  }

  function render(sc){
    sc.innerHTML = "";
    const head = UI.el("div","screen-head");
    head.innerHTML = `<div><h1>Body</h1><p class="muted small">Real anatomical meshes. Tap a muscle to inspect it.</p></div>`;
    sc.appendChild(head);
    const mount = UI.el("div","anat-mount");
    sc.appendChild(mount);
    mount.appendChild(UI.loading("Loading 3D anatomy"));

    // shared view state: bootViewer runs outside this closure's scope,
    // so liveness is tracked on an object both sides can see.
    const VS = { torn:false };
    const teardown = () => { VS.torn = true; if(mount._anatDispose) mount._anatDispose(); };

    (async () => {
      if(!navigator.onLine){
        mount.innerHTML = "";
        mount.appendChild(UI.empty("Anatomy needs a connection",
          "The 3D muscle viewer downloads Three.js and the mesh files on first open. Reconnect and try again."));
        return;
      }
      try{
        if(!window.THREE){
          await loadScript(THREE_CDN + "/build/three.min.js");
          await loadScript(THREE_CDN + "/examples/js/controls/OrbitControls.js");
          await loadScript(THREE_CDN + "/examples/js/loaders/GLTFLoader.js");
        }
      }catch(e){
        if(VS.torn) return;
        mount.innerHTML = "";
        mount.appendChild(UI.errorBox("Could not load the 3D engine",
          "The Three.js CDN did not respond. Check your connection and retry.",
          "Retry", ()=>render(sc)));
        return;
      }
      let manifest;
      try{
        const r = await fetch(MANIFEST, { cache:"force-cache" });
        if(!r.ok) throw new Error("manifest "+r.status);
        manifest = await r.json();
      }catch(e){
        if(VS.torn) return;
        mount.innerHTML = "";
        mount.appendChild(UI.errorBox("Anatomy data missing",
          "The muscle mesh files are not installed in this build yet."));
        return;
      }
      if(VS.torn) return;
      bootViewer(mount, manifest, VS);
    })();

    return teardown;
  }

  function bootViewer(mount, manifest, VS){
    mount.innerHTML = "";
    const bar = UI.el("div","anat-bar");
    const viewSeg = UI.seg(
      [{v:"front",t:"Front"},{v:"back",t:"Back"},{v:"left",t:"Left"},{v:"right",t:"Right"}],
      "front", v => { markSeg(viewSeg, v); setView(v); });
    const layerSeg = UI.seg(
      [{v:"all",t:"All"},{v:"superficial",t:"Surface"},{v:"deep",t:"Deep"}],
      "all", v => { markSeg(layerSeg, v); setLayer(v); });
    function markSeg(segEl, v){
      const order = [...segEl.querySelectorAll(".seg-b")];
      const vals = segEl === viewSeg ? ["front","back","left","right"] : ["all","superficial","deep"];
      order.forEach((b,i) => b.classList.toggle("on", vals[i] === v));
    }
    bar.appendChild(viewSeg); bar.appendChild(layerSeg);
    mount.appendChild(bar);
    const vp = UI.el("div","anat-vp");
    mount.appendChild(vp);
    const jobs = [];
    manifest.muscles.forEach(m => {
      m.files.forEach(f => jobs.push({ m, f }));
    });
    const prog = UI.el("div","state state-loading");
    prog.innerHTML = `<b>Loading muscles</b><p>0 / ${jobs.length} meshes</p>`;
    mount.appendChild(prog);
    const credit = UI.el("p","anat-credit");
    credit.innerHTML = `Meshes: <a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noopener">BodyParts3D 4.0, Database Center for Life Science, CC BY 4.0</a>`;
    mount.appendChild(credit);
    const missing = UI.el("div","anat-missing");
    missing.innerHTML = `<b>Not in the BodyParts3D 4.0 dataset:</b><ul>` +
      NOT_IN_DATASET.map(([n,why])=>`<li>${UI.esc(n)}: ${UI.esc(why)}.</li>`).join("") + `</ul>`;
    mount.appendChild(missing);

    const W = () => vp.clientWidth || 320, H = () => 380;
    let renderer;
    try{
      renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    }catch(e){
      mount.innerHTML = "";
      mount.appendChild(UI.errorBox("3D not available",
        "This device or browser could not start WebGL, which the muscle viewer needs."));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
    renderer.setSize(W(), H());
    vp.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, W()/H(), 0.01, 20);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.enablePan = false;
    controls.minDistance = 0.9;
    controls.maxDistance = 4.5;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1d20, 1.05));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(1.5, 2.2, 2.5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xaefe02, 0.25);
    rim.position.set(-2, 1, -2);
    scene.add(rim);

    const root = new THREE.Group();
    root.rotation.x = -Math.PI/2; // BP3D is Z-up; make it Y-up
    root.scale.setScalar(0.001);   // mm -> m
    scene.add(root);

    const matSup = new THREE.MeshStandardMaterial({ color:0xb03a30, roughness:0.62, metalness:0.05, side:THREE.DoubleSide });
    const matDeep = new THREE.MeshStandardMaterial({ color:0x7e2c26, roughness:0.7, metalness:0.05, side:THREE.DoubleSide });
    const matSel = new THREE.MeshStandardMaterial({ color:0xaefe02, roughness:0.4, metalness:0.1, emissive:0x2a3a00, side:THREE.DoubleSide });

    const pickables = [];   // meshes with userData.muscleId
    const muscleGroups = {}; // id -> { group, layer }
    let loaded = 0;
    let failedJobs = 0;
    const loader = new THREE.GLTFLoader();
    const reducedMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* The manifest ships right-side meshes only; the left side is a true
       geometric mirror (BP3D "M" files are mirrors across the sagittal
       plane, i.e. the X axis). Midline meshes are not mirrored. */
    function loadJob(job){
      return new Promise(res => {
        loader.load("assets/anatomy/" + job.f + ".glb",
          gltf => {
            const grp = new THREE.Group();
            gltf.scene.traverse(o => {
              if(o.isMesh){
                o.material = job.m.layer === "deep" ? matDeep : matSup;
                o.userData.muscleId = job.m.id;
                pickables.push(o);
                grp.add(o);
              }
            });
            let entry = muscleGroups[job.m.id];
            if(!entry){
              entry = { group:new THREE.Group(), layer:job.m.layer, meta:job.m };
              muscleGroups[job.m.id] = entry;
              root.add(entry.group);
            }
            const holder = new THREE.Group();
            holder.add(grp);
            if(!job.m.midline){
              const mir = grp.clone(true);
              mir.scale.x = -1;
              mir.traverse(o => { if(o.isMesh) pickables.push(o); });
              holder.add(mir);
            }
            entry.group.add(holder);
            res(true);
          },
          undefined,
          () => { failedJobs++; res(false); });
      });
    }

    (async () => {
      const CHUNK = 8;
      for(let i=0; i<jobs.length; i+=CHUNK){
        await Promise.all(jobs.slice(i, i+CHUNK).map(loadJob));
        loaded = i + Math.min(CHUNK, jobs.length - i);
        const p = prog.querySelector("p");
        if(p) p.textContent = Math.min(loaded, jobs.length) + " / " + jobs.length + " meshes";
      }
      prog.remove();
      if(failedJobs > 0){
        const warn = UI.errorBox(failedJobs + " mesh file(s) failed to load",
          "The rest of the muscles loaded. Reconnect and reopen Body to retry the missing ones.");
        mount.insertBefore(warn, vp.nextSibling);
      }
      frameAll();
      setView("front", true);
    })();

    function frameAll(){
      root.updateMatrixWorld(true); // matrices must be fresh before measuring
      const box = new THREE.Box3();
      pickables.forEach(o => box.expandByObject(o));
      if(box.isEmpty()) return;
      const c = box.getCenter(new THREE.Vector3());
      const s = box.getSize(new THREE.Vector3());
      root.position.sub(c); // center the body at the origin
      controls.target.set(0, 0, 0);
      camera.position.set(0, 0.1, Math.max(s.y, s.x) * 1.9);
      camera.lookAt(0, 0, 0);
    }

    function setView(v, instant){
      const d = camera.position.distanceTo(controls.target) || 2.6;
      const pos = { front:[0,0.1,d], back:[0,0.1,-d], left:[-d,0.1,0], right:[d,0.1,0] }[v] || [0,0.1,d];
      if(reducedMotion || instant){ camera.position.set(...pos); }
      else{
        const from = camera.position.clone(), to = new THREE.Vector3(...pos);
        const t0 = performance.now();
        (function anim(){
          const k = Math.min(1, (performance.now()-t0)/450);
          const e = 1 - Math.pow(1-k, 3);
          camera.position.lerpVectors(from, to, e);
          if(k < 1 && !VS.torn) requestAnimationFrame(anim);
        })();
      }
      camera.lookAt(controls.target);
    }

    function setLayer(v){
      Object.values(muscleGroups).forEach(g => {
        g.group.visible = (v === "all") || (g.layer === v);
      });
    }

    /* tap-to-select (drag threshold so orbiting never selects) */
    const ray = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let downAt = null;
    renderer.domElement.addEventListener("pointerdown", e => { downAt = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener("pointerup", e => {
      if(!downAt) return;
      const dx = e.clientX - downAt[0], dy = e.clientY - downAt[1];
      downAt = null;
      if(dx*dx + dy*dy > 64) return; // it was a drag
      const r = renderer.domElement.getBoundingClientRect();
      ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      const hits = ray.intersectObjects(pickables.filter(o => {
        let p = o; while(p){ if(p.visible === false) return false; p = p.parent; } return true;
      }), false);
      if(hits.length) selectMuscle(hits[0].object.userData.muscleId);
    });

    let selected = null;
    function selectMuscle(id){
      const m = manifest.muscles.find(x => x.id === id);
      if(!m) return;
      if(selected) selected.forEach(o => { if(o.userData.baseMat) o.material = o.userData.baseMat; });
      const grp = muscleGroups[id];
      selected = [];
      if(grp) grp.group.traverse(o => {
        if(o.isMesh){ if(!o.userData.baseMat) o.userData.baseMat = o.material; o.material = matSel; selected.push(o); }
      });
      const meta = META[id] || {};
      UI.sheet((body, close) => {
        body.appendChild(UI.el("h3","", m.name));
        const dl = UI.el("div","anat-dl");
        dl.innerHTML =
          `<div><span>FMA</span><b>${UI.esc(m.fma || "n/a")}</b></div>` +
          `<div><span>Source</span><b>BodyParts3D 4.0 · ${UI.esc((m.files||[]).join(", "))}</b></div>` +
          `<div><span>Layer</span><b>${UI.esc(m.layer === "deep" ? "Deep" : "Superficial")}</b></div>`;
        body.appendChild(dl);
        if(meta.fn) body.appendChild(UI.el("p","", UI.esc(meta.fn)));
        if(meta.ex){
          body.appendChild(UI.el("h4","", "Train it"));
          const ul = UI.el("ul","anat-ex");
          meta.ex.forEach(x => ul.appendChild(UI.el("li","", UI.esc(x))));
          body.appendChild(ul);
        }
        body.appendChild(UI.btn("Done", { kind:"ghost", onClick:close }));
      });
    }

    let raf = 0;
    (function loop(){
      if(VS.torn) return;
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    })();

    function onResize(){ camera.aspect = W()/H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); }
    window.addEventListener("resize", onResize);

    /* teardown: dispose everything (spec requirement) */
    mount._anatDispose = () => {
      VS.torn = true;
      if(window.cancelAnimationFrame) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      pickables.forEach(o => { if(o.geometry) o.geometry.dispose(); });
      [matSup, matDeep, matSel].forEach(m => m.dispose());
      renderer.dispose();
      if(renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }

  /* called by the app shell when leaving the Body view:
     F1T_ANAT.dispose(document.getElementById("screen")) */
  function dispose(sc){
    const m = sc && sc.querySelector ? sc.querySelector(".anat-mount") : null;
    if(m && m._anatDispose) m._anatDispose();
  }

  return { render, dispose };
})();
