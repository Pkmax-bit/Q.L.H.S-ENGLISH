// PROTOTYPE - NOT FOR PRODUCTION - game.js
(function () {
  "use strict";

  if (typeof THREE === "undefined" || typeof HS_CONTENT === "undefined") {
    console.error("[Harvest Shot] Missing THREE or HS_CONTENT — abort init");
    return;
  }

  const {
    SEASONS, CROPS,
    NORMAL_CROPS, VIP_CROPS, VIP_COLS, VIP_ROWS, VIP_SPACING, VIP_ORIGIN,
    COLS, SPACING, MAX_ROWS, SAVE_KEY,
  } = HS_CONTENT;

  let FILL_STAGES = (HS_CONTENT.FILL_STAGES || []).map((s) => ({ ...s, questions: (s.questions || []).map((q) => ({ ...q, wrong: [...(q.wrong || [])] })) }));
  let VOCAB_STAGES = (HS_CONTENT.VOCAB_STAGES || []).map((s) => ({ ...s, words: (s.words || []).map((w) => ({ ...w })) }));
  let BOSS_DEFS = (HS_CONTENT.BOSS_DEFS || []).map((b) => ({
    ...b,
    questions: b.questions ? b.questions.map((q) => ({ ...q, wrong: [...(q.wrong || [])] })) : undefined,
    words: b.words ? b.words.map((w) => ({ ...w })) : undefined,
  }));

  const PASS_RATIO = 0.7;

  const audio = HS_AUDIO.createAudioBus();
  let kenneyDress = null;
  const burstParticles = [];

  // ========== STATE ==========
  let mode = "menu";
  let playerName = "";
  let accountPlayerName = ""; // tên từ tài khoản QLHS khi chơi trong shop
  let coins = 0;
  const inventory = {};
  for (const k of Object.keys(CROPS)) inventory[k] = 0;
  let selectedCrop = "fast";
  let rows = 3;
  let seasonIndex = 0;
  let seasonAutoT = 0;
  const SEASON_AUTO_SEC = 90;
  const completed = new Set();
  const unlockedVip = new Set();
  const beatenBoss = new Set();
  let seenTutorial = false;
  let muted = false;
  let volume = 0.7;
  let lastDaily = "";

  let lessonType = null;
  let lessonStage = null;
  let qIndex = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let built = "";
  let targetWord = "";
  let targetMeta = null;
  let letterMisses = 0;
  let floating = [];
  let bossHp = 0;
  let bossMaxHp = 0;
  let playerHp = 3;
  let shieldStreak = 0;
  let bossMesh = null;
  let pendingExplain = false;
  let lessonTimeLeft = 0;
  let questionTimeLimit = 14;
  let timerRunning = false;
  let lessonElapsed = 0;
  let lessonStreak = 0;
  let maxStreak = 0;
  let bestStreak = 0;
  let reviewQueue = [];

  let locked = false;
  let toastTimer = 0;
  const touchUi = document.getElementById("touch-ui");
  const preferTouch = (() => {
    try {
      if (window.matchMedia("(pointer: coarse)").matches) return true;
      if (window.matchMedia("(hover: none)").matches && navigator.maxTouchPoints > 0) return true;
      return false;
    } catch (_) {
      return "ontouchstart" in window && navigator.maxTouchPoints > 0;
    }
  })();
  let touchDriving = false;
  let lookDragging = false;
  let lookLastX = 0;
  let lookLastY = 0;
  const stickVec = { x: 0, y: 0 };
  let stickPointerId = null;

  // ========== DOM ==========
  const startEl = document.getElementById("start");
  const lessonsEl = document.getElementById("lessons");
  const shopEl = document.getElementById("shop");
  const resultEl = document.getElementById("result");
  const progressEl = document.getElementById("progress");
  const tutorialEl = document.getElementById("tutorial");
  const crosshair = document.getElementById("crosshair");
  const hudFarm = document.getElementById("hud-farm");
  const hudLesson = document.getElementById("hud-lesson");
  const toastEl = document.getElementById("toast");
  const builtEl = document.getElementById("built-word");
  const canvas = document.getElementById("c");

  // ========== THREE / WORLD ==========
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 90);
  const renderer = HS_WORLD.setupRenderer(THREE, canvas);
  const world = HS_WORLD.createWorld(THREE, scene, {
    COLS, SPACING, VIP_COLS, VIP_ROWS, VIP_SPACING, VIP_ORIGIN,
  });
  const plantKit = HS_PLANTS.createPlantKit(THREE);

  function spawnBurst(pos, color = 0xffe566, count = 14) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 5, 4),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.65,
          roughness: 0.4,
        })
      );
      m.position.copy(pos);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4.5,
        2 + Math.random() * 3.5,
        (Math.random() - 0.5) * 4.5
      );
      vfxGroup.add(m);
      burstParticles.push({ mesh: m, vel, life: 0.55 + Math.random() * 0.35 });
    }
  }

  function updateBursts(dt) {
    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const p = burstParticles[i];
      p.life -= dt;
      p.vel.y -= 9 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.scale.multiplyScalar(0.96);
      if (p.life <= 0) {
        vfxGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        burstParticles.splice(i, 1);
      }
    }
  }

  const plantGroup = new THREE.Group();
  scene.add(plantGroup);
  const floatGroup = new THREE.Group();
  scene.add(floatGroup);
  const bossGroup = new THREE.Group();
  scene.add(bossGroup);
  const vfxGroup = new THREE.Group();
  scene.add(vfxGroup);

  const gunGroup = new THREE.Group();
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.45, roughness: 0.45 });
  const gunWood = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.85 });
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.5), gunMat);
  gunBody.position.set(0.28, -0.22, -0.55);
  gunBody.castShadow = true;
  const gunGrip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.12), gunWood);
  gunGrip.position.set(0.28, -0.38, -0.4);
  gunGrip.rotation.x = 0.35;
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.038, 0.42, 10), gunMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0.28, -0.18, -0.92);
  const gunSight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0x111111 }));
  gunSight.position.set(0.28, -0.1, -0.72);
  const gunMuzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.06, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.35 })
  );
  gunMuzzle.rotation.x = Math.PI / 2;
  gunMuzzle.position.set(0.28, -0.18, -1.12);
  gunGroup.add(gunBody, gunGrip, gunBarrel, gunSight, gunMuzzle);
  camera.add(gunGroup);
  scene.add(camera);

  const slots = [];
  const keys = Object.create(null);
  let yaw = 0;
  let pitch = 0;
  const euler = new THREE.Euler(0, 0, 0, "YXZ");
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(0, 0);
  const playerPos = new THREE.Vector3(0, 1.6, 6);
  const direction = new THREE.Vector3();

  // ========== SAVE ==========
  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function serializePlots() {
    const out = [];
    for (const s of slots) {
      if (!s.crop) continue;
      const season = SEASONS[seasonIndex];
      const growMs = CROPS[s.crop].growMs / season.growMul;
      const age = Math.min(1, Math.max(0, (performance.now() - s.plantedAt) / growMs));
      out.push({
        ix: s.ix, iz: s.iz, vip: !!s.vipZone,
        crop: s.crop, age, watered: !!s.watered, ripe: !!s.ripe,
      });
    }
    return out;
  }

  function buildSavePayload() {
    return {
      playerName: accountPlayerName || playerName,
      coins, inventory: { ...inventory }, selectedCrop, rows, seasonIndex,
      completed: [...completed], unlockedVip: [...unlockedVip], beatenBoss: [...beatenBoss],
      seenTutorial, muted, volume, lastDaily, bestStreak, plots: serializePlots(),
    };
  }

  function isEmbedded() {
    try {
      return !!(window.parent && window.parent !== window);
    } catch (_) {
      return false;
    }
  }

  function postToHost(msg) {
    if (!isEmbedded()) return;
    try {
      window.parent.postMessage({ source: "harvest-shot", ...msg }, window.location.origin);
    } catch (_) { /* ignore */ }
  }

  function applyAccountPlayerName(name) {
    const n = String(name || "").trim().slice(0, 40);
    if (!n) return;
    accountPlayerName = n;
    playerName = n;
  }

  function applySaveData(data) {
    if (!data || typeof data !== "object") return false;
    if (!accountPlayerName) {
      playerName = String(data.playerName || "").slice(0, 40);
    } else {
      playerName = accountPlayerName;
    }
    coins = Math.max(0, Number(data.coins) || 0);
    if (data.inventory && typeof data.inventory === "object") {
      for (const k of Object.keys(inventory)) {
        inventory[k] = Math.max(0, Number(data.inventory[k]) || 0);
      }
    }
    if (data.selectedCrop && CROPS[data.selectedCrop]) selectedCrop = data.selectedCrop;
    rows = Math.min(MAX_ROWS, Math.max(3, Number(data.rows) || 3));
    seasonIndex = Math.max(0, Math.min(SEASONS.length - 1, Number(data.seasonIndex) || 0));
    completed.clear();
    (data.completed || []).forEach((id) => completed.add(id));
    unlockedVip.clear();
    (data.unlockedVip || []).forEach((id) => unlockedVip.add(id));
    beatenBoss.clear();
    (data.beatenBoss || []).forEach((id) => beatenBoss.add(id));
    if (beatenBoss.has("b1") || unlockedVip.has("corn")) unlockedVip.add("grape");
    if (beatenBoss.has("b3") || unlockedVip.has("crystal")) unlockedVip.add("moon");
    seenTutorial = !!data.seenTutorial;
    muted = !!data.muted;
    const volNum = Number(data.volume);
    volume = Math.max(0, Math.min(1, Number.isFinite(volNum) ? volNum : 0.7));
    lastDaily = String(data.lastDaily || "");
    bestStreak = Math.max(0, Number(data.bestStreak) || 0);
    pendingPlots = Array.isArray(data.plots) ? data.plots : null;
    audio.setMuted(muted);
    audio.setVolume(volume);
    const volSliderEl = document.getElementById("vol-slider");
    if (volSliderEl) volSliderEl.value = String(volume);
    return true;
  }

  function saveGame() {
    const payload = buildSavePayload();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (_) { /* private mode */ }
    postToHost({ type: "save", payload });
    audio.setMuted(muted);
    audio.setVolume(volume);
  }

  let pendingPlots = null;

  function loadGame() {
    try {
      let raw = localStorage.getItem(SAVE_KEY);
      if (!raw) raw = localStorage.getItem("harvestShot_save_v2");
      if (!raw) raw = localStorage.getItem("harvestShot_save_v1");
      if (!raw) return false;
      const data = JSON.parse(raw);
      return applySaveData(data);
    } catch (_) {
      return false;
    }
  }

  function applyContentPack(payload) {
    if (!payload || typeof payload !== "object") return;
    if (Array.isArray(payload.fillStages) && payload.fillStages.length) {
      FILL_STAGES = payload.fillStages;
    }
    if (Array.isArray(payload.vocabStages) && payload.vocabStages.length) {
      VOCAB_STAGES = payload.vocabStages;
    }
    if (Array.isArray(payload.bossDefs) && payload.bossDefs.length) {
      BOSS_DEFS = payload.bossDefs;
    }
    try { buildLessonLists(); } catch (_) { /* early */ }
    console.info("[HS] content pack applied", FILL_STAGES.length, VOCAB_STAGES.length, BOSS_DEFS.length);
  }

  function stageLen() {
    if (!lessonStage) return 1;
    if (lessonType === "fill") return Math.max(1, (lessonStage.questions || []).length);
    if (lessonType === "vocab") return Math.max(1, (lessonStage.words || []).length);
    if (lessonStage.questions) return Math.max(1, lessonStage.questions.length);
    if (lessonStage.words) return Math.max(1, lessonStage.words.length);
    return 1;
  }

  function stageTimerSec() {
    if (lessonStage?.timerMs) return Math.max(5, Number(lessonStage.timerMs) / 1000);
    return lessonType === "vocab" ? 16 : 14;
  }

  function lessonPassed() {
    return correctCount / stageLen() >= PASS_RATIO;
  }

  function finishIfDone(loadNext) {
    if (qIndex >= stageLen()) finishLesson(lessonPassed());
    else loadNext();
  }

  function requestCloudSave() {
    return new Promise((resolve) => {
      if (!isEmbedded()) {
        resolve({ payload: null, playerName: null });
        return;
      }
      let done = false;
      const finish = (result) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        window.removeEventListener("message", onMsg);
        resolve(result);
      };
      const timer = setTimeout(() => finish({ payload: null, playerName: null }), 2800);
      function onMsg(ev) {
        if (ev.origin !== window.location.origin) return;
        const d = ev.data;
        if (!d || d.source !== "qlhs-shop" || d.type !== "cloud-save") return;
        finish({ payload: d.payload || null, playerName: d.playerName || null });
      }
      window.addEventListener("message", onMsg);
      postToHost({ type: "ready" });
    });
  }

  function restorePlots() {
    if (!pendingPlots) return;
    for (const p of pendingPlots) {
      if (!p || !CROPS[p.crop]) continue;
      const slot = slots.find((s) => s.ix === p.ix && s.iz === p.iz && !!s.vipZone === !!p.vip);
      if (!slot || slot.crop) continue;
      plantAt(slot, p.crop, p.ripe ? 1 : (Number(p.age) || 0));
      slot.watered = !!p.watered;
    }
    pendingPlots = null;
  }

  function clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem("harvestShot_save_v2");
      localStorage.removeItem("harvestShot_save_v1");
    } catch (_) {}
    postToHost({ type: "clear-save" });
  }

  function controlsActive() {
    if (preferTouch) return touchDriving;
    // Farm desktop: free cursor so HUD buttons work; still can move / harvest
    if (mode === "farm") return true;
    return locked;
  }

  function setTouchUiVisible(on) {
    if (!touchUi) return;
    if (on && preferTouch) {
      touchUi.classList.add("on");
      const plantBtn = document.getElementById("touch-plant");
      const waterBtn = document.getElementById("touch-water");
      const hint = document.getElementById("touch-hint");
      const farmOnly = mode === "farm";
      if (plantBtn) plantBtn.style.display = farmOnly ? "" : "none";
      if (waterBtn) waterBtn.style.display = farmOnly ? "" : "none";
      if (hint) hint.style.display = farmOnly ? "" : "none";
    } else {
      touchUi.classList.remove("on");
    }
  }

  function releaseControls() {
    touchDriving = false;
    lookDragging = false;
    stickVec.x = 0;
    stickVec.y = 0;
    stickPointerId = null;
    const knob = document.getElementById("stick-knob");
    if (knob) {
      knob.style.left = "34px";
      knob.style.top = "34px";
    }
    setTouchUiVisible(false);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function requestControls() {
    if (preferTouch) {
      touchDriving = true;
      setTouchUiVisible(true);
      return;
    }
    // Farm: keep cursor free so menu / seed buttons are clickable
    if (mode === "farm") {
      if (document.pointerLockElement) document.exitPointerLock();
      locked = false;
      return;
    }
    try {
      canvas.requestPointerLock();
    } catch (_) { /* ignore */ }
  }

  function isHudClickTarget(el) {
    if (!el || !el.closest) return false;
    return !!el.closest(
      "#farm-actions, #seed-bar, .panel, #season-badge, #audio-dock, #hint, .screen, #tutorial, #touch-ui, button, input, a"
    );
  }

  function refreshStartScreen() {
    const input = document.getElementById("player-name-input");
    const welcome = document.getElementById("start-welcome");
    const label = document.querySelector('label[for="player-name-input"]');
    if (accountPlayerName) {
      playerName = accountPlayerName;
      input.value = accountPlayerName;
      input.readOnly = true;
      input.style.opacity = "0.85";
      input.style.cursor = "default";
      if (label) label.textContent = "Tên nông dân (tài khoản học sinh)";
      welcome.textContent = `Chào ${accountPlayerName}! Tiến độ lưu trên tài khoản của bạn.`;
    } else if (playerName) {
      input.readOnly = false;
      input.style.opacity = "";
      input.style.cursor = "";
      if (label) label.textContent = "Tên nông dân của bạn";
      input.value = playerName;
      welcome.textContent = `Chào lại, ${playerName}! Tiến độ đã lưu trên máy này.`;
    } else {
      input.readOnly = false;
      input.style.opacity = "";
      input.style.cursor = "";
      if (label) label.textContent = "Tên nông dân của bạn";
      input.value = "";
      welcome.textContent = "Đặt tên để lưu tiến độ học & nông trại trên máy này.";
    }
    document.getElementById("mute-btn").textContent = muted ? "🔇 Tắt" : "🔊 Âm";
  }

  function checkDailyLogin() {
    const today = todayStr();
    if (lastDaily !== today) {
      const pack = CROPS.fast.pack || 1;
      inventory.fast += pack;
      lastDaily = today;
      saveGame();
      showToast(`+${pack} hạt Pepper (đăng nhập ngày)!`, true);
    }
  }

  // ========== UTILS ==========
  function showToast(msg, good = true) {
    toastEl.textContent = msg;
    toastEl.className = "show " + (good ? "good" : "bad");
    toastTimer = 1.6;
  }

  function showShopFlash(msg, good = true) {
    const el = document.getElementById("shop-flash");
    if (!el) return;
    el.textContent = msg;
    el.className = good ? "" : "bad";
  }

  function shuffle(a) {
    const x = [...a];
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ========== TIMER ==========
  function updateTimerUi() {
    const el = document.getElementById("ls-timer");
    const ring = document.getElementById("timer-ring");
    const sec = Math.max(0, Math.ceil(lessonTimeLeft));
    el.textContent = `⏱ ${sec}s`;
    el.classList.remove("warn", "danger");
    if (sec <= 3) el.classList.add("danger");
    else if (sec <= 5) el.classList.add("warn");
    if (ring) {
      const pct = Math.max(0, Math.min(1, lessonTimeLeft / questionTimeLimit));
      ring.style.display = timerRunning ? "block" : "none";
      ring.style.borderTopColor = sec <= 3 ? "#ff6b5a" : sec <= 5 ? "#ffe566" : "#9dff7a";
      ring.style.opacity = String(0.45 + pct * 0.5);
      ring.style.transform = `rotate(${(1 - pct) * 360}deg)`;
    }
  }

  function startQuestionTimer(seconds = questionTimeLimit) {
    lessonTimeLeft = seconds;
    timerRunning = true;
    updateTimerUi();
  }

  function stopLessonTimer() {
    timerRunning = false;
    const ring = document.getElementById("timer-ring");
    if (ring) ring.style.display = "none";
  }

  function updateStreakUi() {
    const el = document.getElementById("ls-streak");
    if (el) el.textContent = String(lessonStreak);
  }

  function onQuestionTimeUp() {
    if (!timerRunning) return;
    stopLessonTimer();
    audio.SFX.timeup();
    showToast(`Hết ${Math.round(questionTimeLimit)}s!`, false);
    resetLessonStreak();
    if (pendingExplain) return;

    if (mode === "fill") {
      wrongCount++;
      document.getElementById("ls-wrong").textContent = String(wrongCount);
      const item = lessonStage.questions[qIndex];
      if (item) reviewQueue.push(`${item.q} → ${item.a}`);
      qIndex++;
      finishIfDone(loadFillQuestion);
      return;
    }

    if (mode === "vocab") {
      wrongCount++;
      document.getElementById("ls-wrong").textContent = String(wrongCount);
      if (targetMeta) reviewQueue.push(`${targetWord} = ${targetMeta.vi}`);
      qIndex++;
      finishIfDone(loadVocabWord);
      return;
    }

    if (mode === "boss") {
      damagePlayer();
      if (playerHp > 0) setTimeout(loadBossRound, 350);
    }
  }

  function resetLessonStreak() {
    lessonStreak = 0;
    updateStreakUi();
  }

  function onLessonCorrect() {
    lessonStreak++;
    if (lessonStreak > maxStreak) maxStreak = lessonStreak;
    if (maxStreak > bestStreak) {
      bestStreak = maxStreak;
      saveGame();
    }
    updateStreakUi();
    if (lessonStreak >= 3) {
      coins += 5;
      audio.SFX.streak();
      showToast(`Streak ×${lessonStreak}! +5¢`, true);
    }
  }

  // ========== SLOTS / PLANTS ==========
  function plotOrigin() {
    return new THREE.Vector3(-((COLS - 1) * SPACING) / 2, 0, -4 - ((rows - 1) * SPACING) / 2);
  }

  function slotWorldPos(ix, iz) {
    const o = plotOrigin();
    return new THREE.Vector3(o.x + ix * SPACING, 0.34, o.z + iz * SPACING);
  }

  function vipSlotWorldPos(ix, iz) {
    return new THREE.Vector3(
      VIP_ORIGIN.x + ix * VIP_SPACING,
      0.36,
      VIP_ORIGIN.z + iz * VIP_SPACING
    );
  }

  function addSlot(ix, iz, opts = {}) {
    const isVip = !!opts.vip;
    const pos = isVip ? vipSlotWorldPos(ix, iz) : slotWorldPos(ix, iz);
    const dirt = new THREE.Group();
    const mound = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.58, 0.14, 14),
      new THREE.MeshStandardMaterial({ color: isVip ? 0x5b2c6f : 0x3d2817, roughness: 0.95 })
    );
    mound.receiveShadow = true;
    mound.castShadow = true;
    dirt.add(mound);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.035, 6, 18),
      new THREE.MeshStandardMaterial({
        color: isVip ? 0x7d3c98 : 0x5c4030,
        roughness: 0.9,
        emissive: isVip ? 0xf1c40f : 0x000000,
        emissiveIntensity: isVip ? 0.15 : 0,
      })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.06;
    dirt.add(rim);
    for (let p = 0; p < 5; p++) {
      const pebble = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 + Math.random() * 0.02, 5, 4),
        new THREE.MeshStandardMaterial({ color: isVip ? 0x6c3483 : 0x6b5b4a, roughness: 1, flatShading: true })
      );
      const a = (p / 5) * Math.PI * 2 + Math.random() * 0.2;
      pebble.position.set(Math.cos(a) * 0.35, 0.08, Math.sin(a) * 0.35);
      dirt.add(pebble);
    }
    dirt.position.set(pos.x, 0.28, pos.z);
    scene.add(dirt);
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.44, 24),
      new THREE.MeshBasicMaterial({
        color: isVip ? 0xf1c40f : 0xa8c070,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isVip ? 0.55 : 0.35,
        depthWrite: false,
      })
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(pos.x, 0.4, pos.z);
    scene.add(marker);
    slots.push({
      ix, iz, pos, dirt, marker,
      vipZone: isVip,
      crop: null, plantedAt: 0, ripe: false, stage: null,
      mesh: null, glow: null, watered: false,
    });
  }

  function initSlots() {
    for (let iz = 0; iz < rows; iz++) for (let ix = 0; ix < COLS; ix++) addSlot(ix, iz);
    for (let iz = 0; iz < VIP_ROWS; iz++) for (let ix = 0; ix < VIP_COLS; ix++) addSlot(ix, iz, { vip: true });
    world.resizePlot(rows);
  }

  function clearPlant(slot, opts = {}) {
    if (slot.mesh) {
      plantGroup.remove(slot.mesh);
      slot.mesh.traverse((o) => {
        o.geometry?.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
    if (slot.glow) scene.remove(slot.glow);
    slot.crop = null;
    slot.ripe = false;
    slot.mesh = null;
    slot.glow = null;
    slot.stage = null;
    if (!opts.keepWatered) slot.watered = false;
    slot.marker.material.opacity = slot.vipZone ? 0.55 : 0.35;
  }

  function growthStage(growthT, ripe) {
    if (ripe || growthT >= 1) return "ripe";
    if (growthT >= 0.45) return "grow";
    return "sprout";
  }

  function plantAt(slot, type, ageRatio = 0, opts = {}) {
    const keepWatered = !!opts.keepWatered;
    const wasWatered = slot.watered;
    const keepPlantedAt = opts.plantedAt;
    clearPlant(slot, { keepWatered });
    const def = CROPS[type];
    const season = SEASONS[seasonIndex];
    const ripe = ageRatio >= 1;
    const growthT = ripe ? 1 : Math.max(0, ageRatio);
    const stage = growthStage(growthT, ripe);
    const mesh = plantKit.makePlantMesh(type, ripe, growthT);
    mesh.position.copy(slot.pos);
    mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    plantGroup.add(mesh);
    const glow = new THREE.PointLight(def.color, ripe ? (def.vip ? 1.8 : 1.1) : 0, 3.5);
    glow.position.set(slot.pos.x, 1, slot.pos.z);
    scene.add(glow);
    const growMs = def.growMs / season.growMul;
    slot.crop = type;
    slot.plantedAt = keepPlantedAt != null ? keepPlantedAt : (performance.now() - growMs * ageRatio);
    slot.ripe = ripe;
    slot.stage = stage;
    slot.mesh = mesh;
    slot.glow = glow;
    if (keepWatered) slot.watered = wasWatered;
    slot.marker.material.opacity = 0.05;
  }

  function spawnZoneFlash(slot, ok) {
    const g = new THREE.Group();
    g.position.set(slot.pos.x, 0.35, slot.pos.z);
    if (ok) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.52, 24),
        new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      g.add(ring);
    } else {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.85 });
      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), mat);
      bar1.rotation.y = Math.PI / 4;
      const bar2 = bar1.clone();
      bar2.rotation.y = -Math.PI / 4;
      g.add(bar1, bar2);
    }
    vfxGroup.add(g);
    const t0 = performance.now();
    (function anim() {
      const t = (performance.now() - t0) / 500;
      if (t >= 1) {
        vfxGroup.remove(g);
        g.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
        return;
      }
      g.scale.setScalar(1 + t * 0.5);
      g.children.forEach((c) => { if (c.material) c.material.opacity = (ok ? 0.9 : 0.85) * (1 - t); });
      requestAnimationFrame(anim);
    })();
  }

  // ========== SEASON ==========
  function applySeason() {
    const s = SEASONS[seasonIndex];
    world.applySeason(s, renderer);
    document.getElementById("season-name").textContent = s.name;
    document.getElementById("season-dot").style.background = s.color;
    if (mode === "farm") showToast(`Mùa: ${s.name}`, true);
  }

  function nextSeason() {
    seasonIndex = (seasonIndex + 1) % SEASONS.length;
    seasonAutoT = 0;
    applySeason();
    if (mode === "farm") {
      const s = SEASONS[seasonIndex];
      audio.stopAmbient();
      audio.startAmbient(s.id, s.ambientGain);
    }
    saveGame();
  }

  // ========== LABELS / FLOATERS ==========
  function makeLabelTexture(text, bg) {
    const c = document.createElement("canvas");
    c.width = 384;
    c.height = 160;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg;
    roundRect(ctx, 12, 20, 360, 120, 20);
    ctx.fill();
    ctx.strokeStyle = "#ffffffcc";
    ctx.lineWidth = 6;
    ctx.stroke();
    const t = text.length > 14 ? text.slice(0, 13) + "…" : text;
    ctx.font = "bold 56px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(t, 194, 84);
    ctx.fillStyle = "#fff";
    ctx.fillText(t, 192, 80);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function clearFloating() {
    for (const f of floating) {
      floatGroup.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.map?.dispose();
      f.mesh.material.dispose();
    }
    floating = [];
  }

  function spawnFlyer(text, value, bg, speedMul = 1) {
    const mat = new THREE.MeshBasicMaterial({ map: makeLabelTexture(text, bg), transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.05), mat);
    const ang = Math.random() * Math.PI * 2;
    const rad = 4 + Math.random() * 7;
    mesh.position.set(Math.cos(ang) * rad, 1.2 + Math.random() * 2.2, -4 + Math.sin(ang) * rad);
    mesh.scale.setScalar(0.01);
    floatGroup.add(mesh);
    floating.push({
      mesh, value,
      vel: new THREE.Vector3((Math.random() - 0.5) * 3.5 * speedMul, (Math.random() - 0.5) * 1.2 * speedMul, (Math.random() - 0.5) * 3.5 * speedMul),
      bob: Math.random() * 10,
      spawnT: 0,
    });
  }

  function flashFlyer(f, ok) {
    const bg = ok ? "#1a7a3a" : "#8a2020";
    f.mesh.material.map?.dispose();
    f.mesh.material.map = makeLabelTexture(String(f.value), bg);
    f.mesh.material.needsUpdate = true;
  }

  // ========== BOSS MESH ==========
  function clearBossMesh() {
    while (bossGroup.children.length) {
      const c = bossGroup.children[0];
      bossGroup.remove(c);
      c.traverse?.((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    }
    bossMesh = null;
  }

  function spawnBossMesh(kind) {
    clearBossMesh();
    const g = new THREE.Group();
    const lamb = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
    if (kind === "b1") {
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12), lamb(0x6bcb4a));
      body.scale.set(1.8, 0.7, 0.7);
      body.castShadow = true;
      g.add(body);
      for (let i = 0; i < 5; i++) {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(0.5 - i * 0.05, 10, 8), lamb(0x5aaa3a));
        seg.position.x = -1.2 - i * 0.7;
        g.add(seg);
      }
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffee00 }));
      eye.position.set(1.0, 0.3, 0.4);
      g.add(eye);
    } else if (kind === "b2") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 1.4), lamb(0x7f8c8d));
      body.position.y = 1.2;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.2), lamb(0x95a5a6));
      head.position.y = 2.8;
      g.add(head);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), new THREE.MeshBasicMaterial({ color: 0xff3333 }));
      eye.position.set(0, 2.9, 0.65);
      g.add(eye);
    } else {
      const body = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.2, 5), lamb(0x8e44ad));
      body.position.y = 1.4;
      body.castShadow = true;
      g.add(body);
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1), lamb(0x9b59b6));
      wingL.position.set(-1.4, 1.6, 0);
      wingL.rotation.z = 0.4;
      g.add(wingL);
      const wingR = wingL.clone();
      wingR.position.x = 1.4;
      wingR.rotation.z = -0.4;
      g.add(wingR);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffee55 }));
      eye.position.set(0.35, 2.0, 0.7);
      g.add(eye);
    }
    g.position.set(0, 0.2, -10);
    bossGroup.add(g);
    bossMesh = g;
  }

  // ========== HUD / SHOP ==========
  function updateFarmHud() {
    const name = playerName || "Nông dân";
    document.getElementById("hud-player-name").textContent = name;
    const portrait = document.getElementById("player-portrait");
    if (portrait) portrait.textContent = (name.trim()[0] || "?").toUpperCase();
    document.getElementById("coins").textContent = String(Math.floor(coins));
    document.getElementById("plots").textContent = String(slots.filter((s) => !s.vipZone).length);
    document.getElementById("shop-money").textContent = `Coins: ${Math.floor(coins)}`;
    const lines = Object.keys(CROPS).map((k) => {
      const c = CROPS[k];
      if (c.vip && !unlockedVip.has(k) && inventory[k] <= 0) return null;
      return `${c.label || c.name}: ${inventory[k]}`;
    }).filter(Boolean);
    document.getElementById("seed-counts").textContent = lines.join(" · ") || "Chưa có hạt — hãy học bài!";
    buildSeedBar();
    buildShop();
  }

  function buildSeedBar() {
    const bar = document.getElementById("seed-bar");
    bar.innerHTML = "";
    const keysCrop = [...NORMAL_CROPS, ...VIP_CROPS];
    keysCrop.forEach((k) => {
      const c = CROPS[k];
      if (c.vip && !unlockedVip.has(k) && inventory[k] <= 0) return;
      const btn = document.createElement("button");
      btn.type = "button";
      const title = c.label || c.name;
      btn.innerHTML = `<span class="seed-name">${title}</span><span class="seed-qty">×${inventory[k]}</span>`;
      btn.title = `${c.name} — bấm để chọn, rồi E để trồng`;
      btn.setAttribute("aria-label", `${title}, còn ${inventory[k]} hạt`);
      if (c.vip) btn.style.background = "#6a3a8a";
      if (selectedCrop === k) btn.classList.add("on");
      btn.disabled = inventory[k] <= 0 && selectedCrop !== k;
      btn.onclick = (e) => {
        e.stopPropagation();
        if (inventory[k] <= 0 && !unlockedVip.has(k) && c.vip) return;
        selectedCrop = k;
        showToast(c.vip ? `VIP: ${title} → trồng ở VIP Garden` : `Chọn: ${title}`, true);
        buildSeedBar();
      };
      bar.appendChild(btn);
    });
  }

  function buildShop() {
    const n = document.getElementById("shop-normal");
    const v = document.getElementById("shop-vip");
    n.innerHTML = "";
    v.innerHTML = "";
    for (const k of NORMAL_CROPS) {
      const c = CROPS[k];
      const row = document.createElement("div");
      row.className = "shop-row";
      row.innerHTML = `<div class="info"><b>${c.label || c.name} ×${c.pack}</b><div style="font-size:12px;opacity:.75">${c.name} · thu ${c.coins}¢ · đất thường</div></div><div class="price">${c.shop}¢</div>`;
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "Mua";
      btn.onclick = () => buySeed(k);
      row.appendChild(btn);
      n.appendChild(row);
    }
    for (const k of VIP_CROPS) {
      const c = CROPS[k];
      const row = document.createElement("div");
      row.className = "shop-row";
      if (!unlockedVip.has(k)) {
        row.innerHTML = `<div class="info"><b>${c.label || c.name}</b><div style="font-size:12px;opacity:.75">Chưa mở — đánh boss · chỉ trồng VIP Garden</div></div><div class="price">🔒</div>`;
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.disabled = true;
        btn.textContent = "Khóa";
        row.appendChild(btn);
      } else if (c.shop <= 0) {
        row.innerHTML = `<div class="info"><b>${c.label || c.name}</b><div style="font-size:12px;opacity:.75">Boss only · VIP Garden · có ${inventory[k]}</div></div><div class="price">—</div>`;
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.disabled = true;
        btn.textContent = "Boss";
        row.appendChild(btn);
      } else {
        row.innerHTML = `<div class="info"><b>${c.label || c.name} ×${c.pack}</b><div style="font-size:12px;opacity:.75">VIP Garden · thu ${c.coins}¢</div></div><div class="price">${c.shop}¢</div>`;
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = "Mua";
        btn.onclick = () => buySeed(k);
        row.appendChild(btn);
      }
      v.appendChild(row);
    }
  }

  function buySeed(k) {
    const c = CROPS[k];
    if (c.vip && !unlockedVip.has(k)) {
      showShopFlash("Chưa mở khóa VIP — đánh boss trước!", false);
      showToast("Chưa mở VIP", false);
      audio.SFX.wrong();
      return;
    }
    if (c.shop <= 0) {
      showShopFlash("Không bán loại này", false);
      showToast("Không mua được", false);
      return;
    }
    if (coins < c.shop) {
      showShopFlash(`Thiếu coins (cần ${c.shop}¢, đang có ${Math.floor(coins)}¢)`, false);
      showToast("Thiếu coins — học bài!", false);
      audio.SFX.wrong();
      return;
    }
    coins -= c.shop;
    inventory[k] += c.pack;
    const msg = `Đã mua ${c.name} ×${c.pack} (−${c.shop}¢) · Còn ${Math.floor(coins)}¢`;
    showShopFlash(msg, true);
    showToast(`Mua thành công: +${c.pack} ${c.name}`, true);
    audio.SFX.correct();
    updateFarmHud();
    buildShop();
    saveGame();
  }

  function countCompletedLessons() {
    let n = 0;
    for (const s of FILL_STAGES) if (completed.has(s.id)) n++;
    for (const s of VOCAB_STAGES) if (completed.has(s.id)) n++;
    return n;
  }

  function bossUnlocked(b) {
    if (b.unlockNeed === 0 || b.unlockNeed == null) return true;
    if (typeof b.unlockNeed === "number") return countCompletedLessons() >= b.unlockNeed;
    return beatenBoss.has(b.unlockNeed);
  }

  function refreshProgressScreen() {
    if (!progressEl) return;
    const fillDone = FILL_STAGES.filter((s) => completed.has(s.id)).length;
    const vocabDone = VOCAB_STAGES.filter((s) => completed.has(s.id)).length;
    const bossDone = BOSS_DEFS.filter((b) => beatenBoss.has(b.id)).length;
    const fillTotal = FILL_STAGES.length;
    const vocabTotal = VOCAB_STAGES.length;
    const bossTotal = BOSS_DEFS.length;
    const lessonDone = fillDone + vocabDone;
    const lessonTotal = fillTotal + vocabTotal;
    const totalParts = lessonTotal + bossTotal;
    const totalDone = lessonDone + bossDone;
    const pct = totalParts ? Math.round((totalDone / totalParts) * 100) : 0;

    const setBar = (id, ratio) => {
      const el = document.getElementById(id);
      if (el) el.style.width = `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`;
    };

    document.getElementById("prog-player-line").textContent =
      playerName ? `Nông dân: ${playerName}` : "Chưa đặt tên — tiến độ vẫn lưu trên máy này";
    document.getElementById("prog-fill").textContent = `${fillDone} / ${fillTotal}`;
    document.getElementById("prog-vocab").textContent = `${vocabDone} / ${vocabTotal}`;
    document.getElementById("prog-boss").textContent = `${bossDone} / ${bossTotal}`;
    document.getElementById("prog-streak").textContent = String(bestStreak);
    document.getElementById("prog-total").textContent = `${pct}% hoàn thành`;
    document.getElementById("prog-coins-line").textContent =
      `Coins: ${Math.floor(coins)} · Đất thường: ${rows}×${COLS} · VIP đã mở: ${unlockedVip.size}`;

    setBar("prog-fill-bar", fillTotal ? fillDone / fillTotal : 0);
    setBar("prog-vocab-bar", vocabTotal ? vocabDone / vocabTotal : 0);
    setBar("prog-total-bar", totalParts ? totalDone / totalParts : 0);

    const today = todayStr();
    const dailyEl = document.getElementById("prog-daily");
    if (lastDaily === today) {
      dailyEl.textContent = `Daily hôm nay: đã nhận (+${CROPS.fast.pack || 1} Pepper)`;
    } else {
      dailyEl.textContent = "Daily: vào nông trại để nhận thưởng ngày";
    }

    const bossLines = BOSS_DEFS.map((b) => {
      if (beatenBoss.has(b.id)) return `✓ ${b.name}`;
      if (bossUnlocked(b)) return `○ ${b.name} (sẵn sàng)`;
      return `🔒 ${b.name}`;
    });
    document.getElementById("prog-boss-list").textContent = bossLines.join(" · ");

    const vipNames = [...unlockedVip].map((k) => (CROPS[k] ? CROPS[k].name : k));
    document.getElementById("prog-vip-list").textContent =
      vipNames.length ? vipNames.join(", ") : "Chưa mở — thắng boss để nhận hạt VIP";
  }

  function openProgress(fromStart) {
    releaseControls();
    progressEl.dataset.fromStart = fromStart ? "1" : "";
    refreshProgressScreen();
    progressEl.classList.add("open");
  }

  function closeProgress() {
    progressEl.classList.remove("open");
    const fromStart = progressEl.dataset.fromStart === "1";
    progressEl.dataset.fromStart = "";
    if (fromStart) {
      startEl.classList.add("open");
    } else if (mode === "farm" || mode === "menu") {
      enterFarm();
    }
  }

  function buildLessonLists() {
    const fillList = document.getElementById("fill-list");
    const vocabList = document.getElementById("vocab-list");
    const bossList = document.getElementById("boss-list");
    fillList.innerHTML = "";
    vocabList.innerHTML = "";
    bossList.innerHTML = "";
    FILL_STAGES.forEach((s, i) => {
      const done = completed.has(s.id);
      const row = document.createElement("div");
      row.className = "lvl";
      row.innerHTML = `<div class="meta"><div class="name">${done ? "✓ " : ""}${s.title}</div><div class="desc">10 câu điền từ</div></div><div class="reward">+${s.reward}¢</div>`;
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = done ? "Chơi lại" : "Học";
      btn.onclick = () => startFill(i);
      row.appendChild(btn);
      fillList.appendChild(row);
    });
    VOCAB_STAGES.forEach((s, i) => {
      const done = completed.has(s.id);
      const row = document.createElement("div");
      row.className = "lvl";
      row.innerHTML = `<div class="meta"><div class="name">${done ? "✓ " : ""}${s.title}</div><div class="desc">10 từ · bắn chữ</div></div><div class="reward">+${s.reward}¢</div>`;
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = done ? "Chơi lại" : "Học";
      btn.onclick = () => startVocab(i);
      row.appendChild(btn);
      vocabList.appendChild(row);
    });
    BOSS_DEFS.forEach((b, i) => {
      const open = bossUnlocked(b);
      const done = beatenBoss.has(b.id);
      const row = document.createElement("div");
      row.className = "lvl";
      const need = b.unlockNeed === 0 ? "Mở sẵn"
        : typeof b.unlockNeed === "number" ? `Cần ${b.unlockNeed} màn thường`
        : "Cần thắng boss trước";
      row.innerHTML = `<div class="meta"><div class="name">${done ? "✓ " : ""}${b.name}</div><div class="desc">${open ? "Sẵn sàng · " + need : need}</div></div>`;
      const btn = document.createElement("button");
      btn.className = "btn boss";
      btn.textContent = open ? (done ? "Đánh lại" : "Khiêu chiến") : "Khóa";
      btn.disabled = !open;
      btn.onclick = () => startBoss(i);
      row.appendChild(btn);
      bossList.appendChild(row);
    });
  }

  // ========== MODES ==========
  function setFarmVisible(vis) {
    world.setFarmVisible(vis);
    plantGroup.visible = vis;
    for (const s of slots) {
      s.dirt.visible = vis;
      s.marker.visible = vis;
    }
    if (vis) clearBossMesh();
  }

  function enterFarm() {
    mode = "farm";
    clearFloating();
    clearBossMesh();
    setFarmVisible(true);
    applySeason();
    const s = SEASONS[seasonIndex];
    audio.startAmbient(s.id, s.ambientGain);
    audio.fadeAmbientForLesson(false);
    hudFarm.style.display = "block";
    hudLesson.style.display = "none";
    builtEl.style.display = "none";
    document.getElementById("boss-hp-wrap").style.display = "none";
    document.getElementById("player-hp").style.display = "none";
    crosshair.style.display = "block";
    startEl.classList.remove("open");
    lessonsEl.classList.remove("open");
    shopEl.classList.remove("open");
    resultEl.classList.remove("open");
    if (progressEl) progressEl.classList.remove("open");
    playerPos.set(0, 1.6, 6);
    checkDailyLogin();
    updateFarmHud();
    if (!seenTutorial) {
      seenTutorial = true;
      saveGame();
      document.getElementById("tut-text").textContent =
        "Bấm các nút bên trái (Học bài / Cửa hàng…). Chọn hạt ở thanh dưới. Đất giữa = cây thường · VIP (phải) = cây ★. E trồng · F tưới · LMB thu hoạch · Giữ chuột phải để nhìn. Mobile: kéo nhìn, stick đi.";
      tutorialEl.classList.add("open");
    } else {
      requestControls();
    }
  }

  function openLessons() {
    releaseControls();
    buildLessonLists();
    lessonsEl.classList.add("open");
  }

  function openShop() {
    releaseControls();
    showShopFlash("Chọn hạt để mua — thông báo hiện ngay bên dưới", true);
    updateFarmHud();
    buildShop();
    shopEl.classList.add("open");
  }

  function beginLessonCommon(type, stage) {
    lessonType = type;
    lessonStage = stage;
    qIndex = 0;
    correctCount = 0;
    wrongCount = 0;
    built = "";
    letterMisses = 0;
    shieldStreak = 0;
    reviewQueue = [];
    pendingExplain = false;
    lessonStreak = 0;
    maxStreak = 0;
    lessonElapsed = 0;
    mode = type;
    lessonsEl.classList.remove("open");
    setFarmVisible(false);
    audio.stopAmbient();
    audio.fadeAmbientForLesson(true);
    if (world.setLessonSky) world.setLessonSky();
    else {
      scene.background = new THREE.Color(0x2a3a4a);
      scene.fog = new THREE.Fog(0x2a3a4a, 20, 50);
    }
    hudFarm.style.display = "none";
    hudLesson.style.display = "block";
    crosshair.style.display = "block";
    document.getElementById("ls-stage").textContent = stage.title || stage.name;
    document.getElementById("ls-correct").textContent = "0";
    document.getElementById("ls-wrong").textContent = "0";
    document.getElementById("lesson-stats").style.display = "block";
    document.getElementById("ls-vi").style.display = "none";
    document.getElementById("ls-vi").textContent = "";
    document.getElementById("result-vi").style.display = "none";
    document.getElementById("result-vi").textContent = "";
    updateStreakUi();
    audio.ensure();
    playerPos.set(0, 1.6, 8);
    yaw = 0;
    pitch = 0;
    requestControls();
  }

  function setProg(cur, total) {
    document.getElementById("ls-prog").innerHTML =
      `${cur} / ${total} · Streak: <span id="ls-streak">${lessonStreak}</span>`;
    document.getElementById("prog-fill").style.width = `${(cur / total) * 100}%`;
  }

  function startFill(index) {
    beginLessonCommon("fill", FILL_STAGES[index]);
    builtEl.style.display = "none";
    document.getElementById("boss-hp-wrap").style.display = "none";
    document.getElementById("player-hp").style.display = "none";
    if (!sessionStorage.getItem("tutFill")) {
      sessionStorage.setItem("tutFill", "1");
      releaseControls();
      stopLessonTimer();
      document.getElementById("tut-text").textContent =
        "Đọc câu tiếng Anh (không hiện nghĩa Việt khi đang làm). Mỗi câu có thời gian giới hạn. Bắn đáp án bay đúng. Cần ≥70% đúng để đạt bài. Nghĩa Việt hiện SAU khi xong.";
      tutorialEl.classList.add("open");
      tutorialEl.dataset.resume = "fill";
    } else loadFillQuestion();
  }

  function startVocab(index) {
    beginLessonCommon("vocab", VOCAB_STAGES[index]);
    builtEl.style.display = "block";
    document.getElementById("boss-hp-wrap").style.display = "none";
    document.getElementById("player-hp").style.display = "none";
    if (!sessionStorage.getItem("tutVocab")) {
      sessionStorage.setItem("tutVocab", "1");
      releaseControls();
      stopLessonTimer();
      document.getElementById("tut-text").textContent =
        "Bắn chữ cái theo đúng thứ tự. Mỗi từ có thời gian giới hạn. Sai 3 lần hoặc hết giờ sẽ sang từ khác. Cần ≥70% đúng để đạt bài.";
      tutorialEl.classList.add("open");
      tutorialEl.dataset.resume = "vocab";
    } else loadVocabWord();
  }

  function startBoss(index) {
    const b = BOSS_DEFS[index];
    if (!bossUnlocked(b)) return;
    beginLessonCommon("boss", b);
    bossHp = b.hp;
    bossMaxHp = b.hp;
    playerHp = b.playerHp;
    shieldStreak = 0;
    spawnBossMesh(b.id);
    document.getElementById("boss-hp-wrap").style.display = "block";
    document.getElementById("boss-name-label").textContent = b.name + " HP";
    document.getElementById("boss-hp-fill").style.width = "100%";
    document.getElementById("player-hp").style.display = "block";
    document.getElementById("p-hp").textContent = String(playerHp);
    builtEl.style.display = b.mode === "vocab_rush" ? "block" : "none";
    loadBossRound();
  }

  function loadFillQuestion() {
    clearFloating();
    const item = lessonStage.questions[qIndex];
    document.getElementById("ls-q").textContent = item.q;
    document.getElementById("ls-vi").style.display = "none";
    document.getElementById("ls-vi").textContent = "";
    document.getElementById("ls-hint").textContent = item.hint ? `Phát âm: ${item.hint}` : "";
    const total = stageLen();
    setProg(qIndex + 1, total);
    questionTimeLimit = stageTimerSec();
    startQuestionTimer(questionTimeLimit);
    for (const o of shuffle([item.a, ...item.wrong])) spawnFlyer(o, o, "#2f4a6a");
  }

  function loadVocabWord() {
    clearFloating();
    targetMeta = lessonStage.words[qIndex];
    targetWord = targetMeta.w;
    built = "";
    letterMisses = 0;
    document.getElementById("ls-q").textContent = `Ghép từ (${targetWord.length} chữ)`;
    document.getElementById("ls-vi").style.display = "block";
    document.getElementById("ls-vi").textContent = `Nghĩa: ${targetMeta.vi}`;
    document.getElementById("ls-hint").textContent = `${targetMeta.ipa} · gợi ý: ${targetWord[0]}${"·".repeat(targetWord.length - 1)}`;
    const total = stageLen();
    setProg(qIndex + 1, total);
    updateBuiltDisplay();
    questionTimeLimit = stageTimerSec();
    startQuestionTimer(questionTimeLimit);
    const letters = targetWord.split("");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const decoys = [];
    while (decoys.length < 6) decoys.push(alphabet[Math.floor(Math.random() * 26)]);
    for (const ch of shuffle([...letters, ...decoys])) spawnFlyer(ch, ch, "#3a2a5a");
  }

  function updateBuiltDisplay() {
    let out = "";
    for (let i = 0; i < targetWord.length; i++) out += (built[i] || "_") + " ";
    builtEl.textContent = out.trim();
  }

  function loadBossRound() {
    clearFloating();
    const b = lessonStage;
    if (b.mode === "fill_burst" || b.mode === "shield_fill") {
      const item = b.questions[qIndex % b.questions.length];
      document.getElementById("ls-q").textContent = item.q;
      document.getElementById("ls-vi").style.display = "none";
      document.getElementById("ls-vi").textContent = "";
      document.getElementById("ls-hint").textContent = (item.hint || "") + (b.mode === "shield_fill" ? " · Cần 2 phát đúng liên tiếp!" : "");
      setProg(bossMaxHp - bossHp, bossMaxHp);
      questionTimeLimit = 14;
      startQuestionTimer(questionTimeLimit);
      for (const o of shuffle([item.a, ...item.wrong])) spawnFlyer(o, o, "#4a2a2a", 1.15);
    } else {
      targetMeta = b.words[qIndex % b.words.length];
      targetWord = targetMeta.w;
      built = "";
      letterMisses = 0;
      document.getElementById("ls-q").textContent = `Boss từ: ${targetWord.length} chữ`;
      document.getElementById("ls-vi").style.display = "block";
      document.getElementById("ls-vi").textContent = targetMeta.vi;
      document.getElementById("ls-hint").textContent = targetMeta.ipa + (qIndex >= 3 ? " · Phase 2: nhanh hơn!" : "");
      setProg(bossMaxHp - bossHp, bossMaxHp);
      updateBuiltDisplay();
      questionTimeLimit = 16;
      startQuestionTimer(questionTimeLimit);
      const speed = qIndex >= 3 ? 1.8 : 1.3;
      const letters = targetWord.split("");
      const decoys = [];
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      while (decoys.length < 8) decoys.push(alphabet[Math.floor(Math.random() * 26)]);
      for (const ch of shuffle([...letters, ...decoys])) spawnFlyer(ch, ch, "#5a1a6a", speed);
    }
  }

  function updateBossHpUi() {
    document.getElementById("boss-hp-fill").style.width = `${(bossHp / bossMaxHp) * 100}%`;
    document.getElementById("p-hp").textContent = String(playerHp);
  }

  function damagePlayer() {
    playerHp--;
    updateBossHpUi();
    audio.SFX.hurt();
    showToast(`Bạn bị thương! HP ${playerHp}`, false);
    resetLessonStreak();
    if (playerHp <= 0) finishLesson(false);
  }

  function damageBoss(n = 1) {
    bossHp = Math.max(0, bossHp - n);
    updateBossHpUi();
    audio.SFX.hit();
    if (bossMesh) {
      bossMesh.rotation.z = 0.2;
      setTimeout(() => { if (bossMesh) bossMesh.rotation.z = 0; }, 120);
    }
    if (bossHp <= 0) finishBoss(true);
    else {
      qIndex++;
      if (lessonStage.mode === "vocab_rush" && qIndex === 3) showToast("Phase 2 — nhanh hơn!", true);
      setTimeout(loadBossRound, 400);
    }
  }

  function starsFromWrong(w) {
    if (w <= 1) return "★★★";
    if (w <= 4) return "★★☆";
    return "★☆☆";
  }

  function finishBoss(win) {
    stopLessonTimer();
    clearFloating();
    releaseControls();
    const b = lessonStage;
    const used = lessonElapsed;
    if (win) {
      audio.SFX.win();
      beatenBoss.add(b.id);
      let msg = `Thắng ${b.name}!\nThời gian: ${formatTime(used)}\nStreak max: ${maxStreak}\n`;
      if (b.rewardCrop) {
        unlockedVip.add(b.rewardCrop);
        inventory[b.rewardCrop] = (inventory[b.rewardCrop] || 0) + b.rewardSeeds;
        msg += `Mở khóa ${CROPS[b.rewardCrop].name} +${b.rewardSeeds} hạt!\n`;
        if (b.id === "b1") {
          unlockedVip.add("grape");
          inventory.grape = (inventory.grape || 0) + 1;
          msg += "Bonus: Grape VIP +1!\n";
        }
        if (b.id === "b3") {
          unlockedVip.add("moon");
          inventory.moon = (inventory.moon || 0) + 1;
          msg += "Bonus: Moonbloom VIP +1!\n";
        }
      }
      if (b.rewardCrops) {
        for (const c of b.rewardCrops) {
          unlockedVip.add(c);
          inventory[c] = (inventory[c] || 0) + b.rewardSeeds;
          msg += `Mở khóa ${CROPS[c].name} +${b.rewardSeeds} hạt!\n`;
        }
        if (b.id === "b2") unlockedVip.add("grape");
      }
      coins += 80;
      msg += "+80 coins";
      document.getElementById("result-title").textContent = "Boss bị hạ!";
      document.getElementById("result-stars").textContent = "★★★";
      document.getElementById("result-body").textContent = msg;
      if (b.questions) {
        const viEl = document.getElementById("result-vi");
        viEl.style.display = "block";
        viEl.textContent = "Nghĩa tiếng Việt:\n" + b.questions.map((q, i) => `${i + 1}. ${q.a} — ${q.vi || ""}`).join("\n");
      } else {
        document.getElementById("result-vi").style.display = "none";
      }
    } else {
      audio.SFX.lose();
      document.getElementById("result-title").textContent = "Thua boss";
      document.getElementById("result-stars").textContent = "☆☆☆";
      document.getElementById("result-body").textContent =
        `Thời gian: ${formatTime(used)} · Streak max: ${maxStreak}\nThử lại sau khi ôn bài thường nhé!`;
      document.getElementById("result-vi").style.display = "none";
    }
    resultEl.classList.add("open");
    mode = "menu";
    updateFarmHud();
    saveGame();
  }

  function finishLesson(success) {
    if (mode === "boss") { finishBoss(success); return; }
    stopLessonTimer();
    clearFloating();
    releaseControls();

    const used = lessonElapsed;
    const total = stageLen();
    const avgQ = qIndex > 0 ? (used / qIndex).toFixed(1) : "—";
    let timeBonus = 0;
    if (success && wrongCount === 0) timeBonus = 10;

    const reward = success
      ? lessonStage.reward + timeBonus
      : Math.max(5, Math.floor(lessonStage.reward * correctCount / total));
    if (success) {
      completed.add(lessonStage.id);
      audio.SFX.win();
      showToast(`Đạt bài! (${correctCount}/${total})`, true);
    } else {
      audio.SFX.lose();
      showToast(`Chưa đạt (${correctCount}/${total} · cần ≥${Math.ceil(total * PASS_RATIO)})`, false);
    }
    coins += reward;
    document.getElementById("result-title").textContent = success
      ? "Đạt bài học!"
      : (qIndex < total ? "Đã thoát" : "Chưa đạt bài");
    document.getElementById("result-stars").textContent = success ? starsFromWrong(wrongCount) : "☆☆☆";
    let body = `${lessonStage.title}\nĐúng ${correctCount}/${total} · Sai ${wrongCount}\nThời gian: ${formatTime(used)} · ~${avgQ}s/câu · Streak max: ${maxStreak}`;
    if (timeBonus > 0) body += ` · Perfect +${timeBonus}¢`;
    body += `\n+${reward} coins`;
    if (!success) body += `\nCần ≥ ${Math.ceil(total * PASS_RATIO)}/${total} đúng để mở khóa màn.`;
    if (success && reviewQueue.length) body += `\n\nÔn lại (sai):\n${reviewQueue.slice(0, 3).join("\n")}`;
    document.getElementById("result-body").textContent = body;

    const viEl = document.getElementById("result-vi");
    if (lessonType === "fill" && lessonStage.questions) {
      viEl.style.display = "block";
      viEl.textContent = "Nghĩa tiếng Việt (xem sau khi học):\n" + lessonStage.questions.map((q, i) =>
        `${i + 1}. ${q.q.replace("___", q.a)} → ${q.a}\n   ${q.vi || ""}`
      ).join("\n");
    } else {
      viEl.style.display = "none";
    }

    resultEl.classList.add("open");
    mode = "menu";
    updateFarmHud();
    saveGame();
  }

  function explainThen(nextFn, correctAnswer) {
    pendingExplain = true;
    document.getElementById("ls-hint").textContent = `Đáp án đúng: ${correctAnswer}`;
    showToast(`Đáp án: ${correctAnswer}`, false);
    setTimeout(() => {
      pendingExplain = false;
      nextFn();
    }, 1500);
  }

  // ========== SHOOT / FARM ACTIONS ==========
  function shoot() {
    if (!controlsActive() || pendingExplain) return;
    gunGroup.position.z = 0.05;
    setTimeout(() => { gunGroup.position.z = 0; }, 50);
    audio.SFX.shoot();
    raycaster.setFromCamera(ndc, camera);

    if (mode === "fill" || mode === "vocab" || mode === "boss") {
      const meshes = floating.map((f) => f.mesh);
      const hits = raycaster.intersectObjects(meshes, false);
      if (!hits.length) { showToast("Miss", false); return; }
      const f = floating.find((x) => x.mesh === hits[0].object);
      if (!f) return;

      if (mode === "fill") {
        const item = lessonStage.questions[qIndex];
        const ok = f.value === item.a;
        flashFlyer(f, ok);
        if (ok) {
          audio.SFX.correct();
          onLessonCorrect();
          stopLessonTimer();
          correctCount++;
          document.getElementById("ls-correct").textContent = String(correctCount);
          showToast("Correct!", true);
          if (floating[0]) spawnBurst(floating[0].mesh.position.clone(), 0x9dff7a, 16);
          else spawnBurst(new THREE.Vector3(0, 1.2, -2), 0x9dff7a, 12);
          qIndex++;
          setTimeout(() => finishIfDone(loadFillQuestion), 350);
        } else {
          audio.SFX.wrong();
          resetLessonStreak();
          stopLessonTimer();
          wrongCount++;
          document.getElementById("ls-wrong").textContent = String(wrongCount);
          reviewQueue.push(`${item.q} → ${item.a}`);
          explainThen(() => {
            qIndex++;
            finishIfDone(loadFillQuestion);
          }, item.a);
        }
        return;
      }

      if (mode === "vocab") {
        const need = targetWord[built.length];
        if (f.value === need) {
          flashFlyer(f, true);
          built += f.value;
          updateBuiltDisplay();
          floatGroup.remove(f.mesh);
          floating = floating.filter((x) => x !== f);
          showToast(f.value, true);
          if (built === targetWord) {
            audio.SFX.correct();
            onLessonCorrect();
            stopLessonTimer();
            correctCount++;
            document.getElementById("ls-correct").textContent = String(correctCount);
            showToast(targetWord + "!", true);
            qIndex++;
            setTimeout(() => finishIfDone(loadVocabWord), 450);
          }
        } else {
          audio.SFX.wrong();
          resetLessonStreak();
          flashFlyer(f, false);
          letterMisses++;
          wrongCount++;
          document.getElementById("ls-wrong").textContent = String(wrongCount);
          showToast(`Sai! (${letterMisses}/3)`, false);
          builtEl.style.transform = "translateX(-50%) rotate(-3deg)";
          setTimeout(() => { builtEl.style.transform = "translateX(-50%)"; }, 150);
          if (letterMisses >= 3) {
            stopLessonTimer();
            reviewQueue.push(`${targetWord} = ${targetMeta.vi}`);
            qIndex++;
            setTimeout(() => finishIfDone(loadVocabWord), 400);
          }
        }
        return;
      }

      const b = lessonStage;
      if (b.mode === "fill_burst" || b.mode === "shield_fill") {
        const item = b.questions[qIndex % b.questions.length];
        const ok = f.value === item.a;
        flashFlyer(f, ok);
        if (ok) {
          audio.SFX.correct();
          onLessonCorrect();
          stopLessonTimer();
          if (b.mode === "shield_fill") {
            shieldStreak++;
            showToast(`Combo ${shieldStreak}/2`, true);
            if (shieldStreak >= 2) {
              shieldStreak = 0;
              damageBoss(1);
            } else {
              setTimeout(loadBossRound, 300);
            }
          } else {
            showToast("Hit!", true);
            damageBoss(1);
          }
        } else {
          audio.SFX.wrong();
          resetLessonStreak();
          stopLessonTimer();
          shieldStreak = 0;
          damagePlayer();
          setTimeout(loadBossRound, 400);
        }
        return;
      }

      const need = targetWord[built.length];
      if (f.value === need) {
        flashFlyer(f, true);
        built += f.value;
        updateBuiltDisplay();
        floatGroup.remove(f.mesh);
        floating = floating.filter((x) => x !== f);
        if (built === targetWord) {
          audio.SFX.correct();
          onLessonCorrect();
          stopLessonTimer();
          showToast(targetWord + "!", true);
          damageBoss(1);
        }
      } else {
        audio.SFX.wrong();
        resetLessonStreak();
        flashFlyer(f, false);
        damagePlayer();
      }
      return;
    }

    if (mode === "farm") {
      const fruits = [];
      for (const s of slots) {
        if (!s.mesh) continue;
        s.mesh.traverse((o) => { if (o.userData.isFruit) fruits.push(o); });
      }
      const hits = raycaster.intersectObjects(fruits, false);
      if (!hits.length) { showToast("Miss", false); return; }
      const fruit = hits[0].object;
      let found = null;
      for (const s of slots) {
        if (!s.mesh) continue;
        let hit = false;
        s.mesh.traverse((o) => { if (o === fruit) hit = true; });
        if (hit) { found = s; break; }
      }
      if (!found) return;
      if (!found.ripe) { showToast("Chưa chín!", false); return; }
      const season = SEASONS[seasonIndex];
      const def = CROPS[found.crop];
      let gained = def.coins * season.payoutMul;
      if (def.vip) gained *= season.vipMul;
      gained = Math.round(gained);
      coins += gained;
      audio.SFX.harvest();
      plantKit.harvestBurst(scene, found.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), def.color);
      const burstAt = found.pos.clone().add(new THREE.Vector3(0, 0.7, 0));
      if (season.seedBonusChance && Math.random() < season.seedBonusChance) {
        inventory[found.crop] = (inventory[found.crop] || 0) + 1;
        showToast(`+${gained}¢ + hạt bonus!`, true);
        spawnBurst(burstAt, 0xffe566, 18);
      } else {
        showToast(`+${gained}¢`, true);
        spawnBurst(burstAt, 0xffc107, 12);
      }
      clearPlant(found);
      updateFarmHud();
      saveGame();
    }
  }

  function lookingAtSlot() {
    raycaster.setFromCamera(ndc, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.34);
    const point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, point)) return null;
    let best = 1.25;
    let nearest = null;
    for (const s of slots) {
      const d = point.distanceTo(new THREE.Vector3(s.pos.x, 0.34, s.pos.z));
      if (d < best) { best = d; nearest = s; }
    }
    return nearest;
  }

  let lastFarmHint = "";
  function updateFarmAimHint() {
    const hintEl = document.querySelector("#hud-farm #hint");
    if (!hintEl) return;
    for (const s of slots) {
      if (!s.marker?.material) continue;
      const base = s.vipZone ? 0.55 : 0.35;
      s.marker.material.opacity = base;
      s.marker.scale.setScalar(1);
    }
    const crop = CROPS[selectedCrop];
    const label = crop?.label || crop?.name || selectedCrop;
    if (!controlsActive()) {
      const msg = "Click nút menu bên trái · chọn hạt dưới · giữ chuột phải để nhìn";
      if (msg !== lastFarmHint) { hintEl.textContent = msg; lastFarmHint = msg; }
      return;
    }
    const s = lookingAtSlot();
    let msg = `E trồng ${label} · F tưới · LMB thu · VIP ★ bên phải`;
    if (s) {
      if (s.marker?.material) {
        s.marker.material.opacity = 0.95;
        s.marker.scale.setScalar(1.25);
      }
      if (!s.crop) {
        if (inventory[selectedCrop] <= 0) msg = "Hết hạt — học bài hoặc mở cửa hàng";
        else if (crop?.vip && !s.vipZone) msg = `★ ${label} chỉ trồng ở VIP Garden (phải)`;
        else if (!crop?.vip && s.vipZone) msg = "Ô VIP chỉ cho cây VIP ★";
        else msg = `E · Trồng ${label}${s.vipZone ? " ★" : ""}`;
      } else if (s.ripe) {
        msg = "LMB · Thu hoạch";
      } else if (!s.watered) {
        msg = "F · Tưới cây đang lớn";
      } else {
        msg = "Đang lớn… chờ chín rồi thu (LMB)";
      }
    }
    if (msg !== lastFarmHint) {
      hintEl.textContent = msg;
      lastFarmHint = msg;
    }
  }

  function tryPlant(slot) {
    if (slot.crop) { showToast("Đã có cây", false); return; }
    if (inventory[selectedCrop] <= 0) {
      showToast("Hết hạt — học bài hoặc mua!", false);
      return;
    }
    const crop = CROPS[selectedCrop];
    if (crop.vip && !slot.vipZone) {
      spawnZoneFlash(slot, false);
      showToast("Cây VIP chỉ trồng ở VIP Garden (bên phải)!", false);
      return;
    }
    if (!crop.vip && slot.vipZone) {
      spawnZoneFlash(slot, false);
      showToast("Ô VIP chỉ dành cho cây VIP!", false);
      return;
    }
    inventory[selectedCrop]--;
    plantAt(slot, selectedCrop, 0);
    if (slot.vipZone && crop.vip) spawnZoneFlash(slot, true);
    audio.SFX.plant();
    showToast(`Trồng ${crop.label || crop.name}${slot.vipZone ? " ★" : ""}`, true);
    updateFarmHud();
    saveGame();
  }

  function tryWater(slot) {
    if (!slot || !slot.crop || slot.ripe || slot.watered) {
      showToast("Không thể tưới ô này", false);
      return;
    }
    const season = SEASONS[seasonIndex];
    const def = CROPS[slot.crop];
    const growMs = def.growMs / season.growMul;
    const elapsed = performance.now() - slot.plantedAt;
    const remaining = growMs - elapsed;
    if (remaining <= 0) return;
    slot.plantedAt -= remaining * 0.3;
    slot.watered = true;
    audio.SFX.water();
    const splash = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.45, 20),
      new THREE.MeshBasicMaterial({ color: 0x3498db, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    splash.rotation.x = -Math.PI / 2;
    splash.position.set(slot.pos.x, 0.32, slot.pos.z);
    vfxGroup.add(splash);
    const t0 = performance.now();
    (function anim() {
      const t = (performance.now() - t0) / 400;
      if (t >= 1) {
        vfxGroup.remove(splash);
        splash.geometry.dispose();
        splash.material.dispose();
        return;
      }
      splash.scale.setScalar(1 + t);
      splash.material.opacity = 0.8 * (1 - t);
      requestAnimationFrame(anim);
    })();
    showToast("Đã tưới! −30% thời gian", true);
    saveGame();
  }

  function repositionNormalSlots() {
    for (const s of slots) {
      if (s.vipZone) continue;
      s.pos = slotWorldPos(s.ix, s.iz);
      s.dirt.position.set(s.pos.x, 0.28, s.pos.z);
      s.marker.position.set(s.pos.x, 0.38, s.pos.z);
      if (s.mesh) {
        s.mesh.position.x = s.pos.x;
        s.mesh.position.z = s.pos.z;
        s.mesh.position.y = s.pos.y;
      }
      if (s.glow) s.glow.position.set(s.pos.x, 1, s.pos.z);
    }
    world.resizePlot(rows);
  }

  // ========== EVENTS ==========
  function wireEvents() {
    document.getElementById("btn-start").onclick = () => {
      audio.SFX.click();
      audio.ensure();
      if (accountPlayerName) {
        playerName = accountPlayerName;
      } else {
        const name = document.getElementById("player-name-input").value.trim().slice(0, 40);
        if (!name) {
          showToast("Hãy nhập tên của bạn!", false);
          document.getElementById("player-name-input").focus();
          return;
        }
        playerName = name;
      }
      saveGame();
      enterFarm();
    };

    document.getElementById("btn-back-web").onclick = () => {
      audio.SFX.click();
      if (isEmbedded()) {
        postToHost({ type: "exit" });
        return;
      }
      // Standalone: về shop app nếu cùng origin
      try {
        window.location.href = "/shop";
      } catch (_) {
        window.history.back();
      }
    };

    document.getElementById("player-name-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("btn-start").click();
    });

    const closeLessons = () => { audio.SFX.click(); lessonsEl.classList.remove("open"); enterFarm(); };
    const btnLessonsX = document.getElementById("btn-lessons-x");
    if (btnLessonsX) btnLessonsX.onclick = closeLessons;
    const closeShop = () => { audio.SFX.click(); shopEl.classList.remove("open"); enterFarm(); };
    document.getElementById("btn-shop-close").onclick = closeShop;
    document.getElementById("btn-shop-x").onclick = closeShop;
    const closeResult = () => { audio.SFX.click(); resultEl.classList.remove("open"); enterFarm(); };
    document.getElementById("btn-result-ok").onclick = closeResult;
    const btnResultX = document.getElementById("btn-result-x");
    if (btnResultX) btnResultX.onclick = closeResult;
    const closeProg = () => { audio.SFX.click(); closeProgress(); };
    document.getElementById("btn-progress-close").onclick = closeProg;
    const btnProgX = document.getElementById("btn-progress-x");
    if (btnProgX) btnProgX.onclick = closeProg;
    document.getElementById("ui-lessons").onclick = (e) => { e.stopPropagation(); audio.SFX.click(); openLessons(); };
    document.getElementById("ui-shop").onclick = (e) => { e.stopPropagation(); audio.SFX.click(); openShop(); };
    document.getElementById("ui-season").onclick = (e) => { e.stopPropagation(); audio.SFX.click(); nextSeason(); };
    document.getElementById("ui-progress").onclick = (e) => { e.stopPropagation(); audio.SFX.click(); openProgress(false); };

    function dismissTutorial() {
      if (!tutorialEl.classList.contains("open")) return false;
      tutorialEl.classList.remove("open");
      const r = tutorialEl.dataset.resume;
      tutorialEl.dataset.resume = "";
      audio.SFX.click();
      requestControls();
      if (r === "fill") loadFillQuestion();
      else if (r === "vocab") loadVocabWord();
      return true;
    }

    document.getElementById("tut-ok").onclick = () => { dismissTutorial(); };
    const btnTutX = document.getElementById("btn-tut-x");
    if (btnTutX) btnTutX.onclick = () => { dismissTutorial(); };

    document.getElementById("buy-land").onclick = () => {
      if (rows >= MAX_ROWS) {
        showShopFlash("Đất đã mở tối đa!", false);
        showToast("Đất tối đa", false);
        audio.SFX.wrong();
        return;
      }
      if (coins < 50) {
        showShopFlash(`Thiếu coins (cần 50¢, đang có ${Math.floor(coins)}¢)`, false);
        showToast("Thiếu coins", false);
        audio.SFX.wrong();
        return;
      }
      coins -= 50;
      const newRow = rows;
      rows++;
      for (let ix = 0; ix < COLS; ix++) addSlot(ix, newRow);
      repositionNormalSlots();
      const msg = `Đã mở đất ${rows}×${COLS} (−50¢) · Còn ${Math.floor(coins)}¢`;
      showShopFlash(msg, true);
      showToast(`Mua thành công: đất ${rows}×${COLS}`, true);
      audio.SFX.correct();
      updateFarmHud();
      saveGame();
    };

    document.getElementById("mute-btn").onclick = (e) => {
      e.stopPropagation();
      muted = !muted;
      audio.setMuted(muted);
      e.currentTarget.textContent = muted ? "🔇 Tắt" : "🔊 Âm";
      if (!muted) audio.SFX.click();
      saveGame();
    };

    const volSlider = document.getElementById("vol-slider");
    if (volSlider) {
      volSlider.value = String(Number.isFinite(volume) ? volume : 0.7);
      volSlider.oninput = () => {
        const v = Number(volSlider.value);
        volume = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
        audio.setVolume(volume);
        saveGame();
      };
      volSlider.onchange = volSlider.oninput;
    }

    document.addEventListener("pointerlockchange", () => {
      locked = document.pointerLockElement === canvas;
      if (locked) setTouchUiVisible(false);
    });

    document.addEventListener("mousemove", (e) => {
      if (locked) {
        yaw -= e.movementX * 0.0022;
        pitch -= e.movementY * 0.0022;
        pitch = Math.max(-1.35, Math.min(1.35, pitch));
        return;
      }
      if (lookDragging && mode === "farm" && !preferTouch) {
        yaw -= e.movementX * 0.003;
        pitch -= e.movementY * 0.003;
        pitch = Math.max(-1.35, Math.min(1.35, pitch));
      }
    });

    document.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || preferTouch) return;
      if (isHudClickTarget(e.target)) return;
      if (locked) {
        shoot();
        return;
      }
      if (mode === "farm" && controlsActive()) shoot();
    });

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    // --- Touch / pointer look on canvas ---
    canvas.addEventListener("pointerdown", (e) => {
      // Farm desktop: hold right mouse to look (left free for HUD + harvest)
      if (!preferTouch && mode === "farm" && e.button === 2) {
        lookDragging = true;
        lookLastX = e.clientX;
        lookLastY = e.clientY;
        try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
        return;
      }
      if (!preferTouch || !touchDriving) return;
      if (e.target !== canvas) return;
      lookDragging = true;
      lookLastX = e.clientX;
      lookLastY = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!lookDragging) return;
      if (!preferTouch && mode === "farm") {
        const dx = e.clientX - lookLastX;
        const dy = e.clientY - lookLastY;
        lookLastX = e.clientX;
        lookLastY = e.clientY;
        yaw -= dx * 0.0035;
        pitch -= dy * 0.0035;
        pitch = Math.max(-1.35, Math.min(1.35, pitch));
        return;
      }
      if (!touchDriving) return;
      const dx = e.clientX - lookLastX;
      const dy = e.clientY - lookLastY;
      lookLastX = e.clientX;
      lookLastY = e.clientY;
      yaw -= dx * 0.0045;
      pitch -= dy * 0.0045;
      pitch = Math.max(-1.35, Math.min(1.35, pitch));
    });
    const endLook = (e) => {
      if (!lookDragging) return;
      lookDragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    canvas.addEventListener("pointerup", endLook);
    canvas.addEventListener("pointercancel", endLook);

    // Virtual stick
    const stickZone = document.getElementById("stick-zone");
    const stickKnob = document.getElementById("stick-knob");
    const updateStick = (clientX, clientY) => {
      if (!stickZone || !stickKnob) return;
      const rect = stickZone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const maxR = rect.width * 0.38;
      const len = Math.hypot(dx, dy) || 1;
      if (len > maxR) { dx = (dx / len) * maxR; dy = (dy / len) * maxR; }
      stickKnob.style.left = `${34 + dx}px`;
      stickKnob.style.top = `${34 + dy}px`;
      stickVec.x = dx / maxR;
      stickVec.y = dy / maxR;
    };
    const resetStick = () => {
      stickVec.x = 0;
      stickVec.y = 0;
      stickPointerId = null;
      if (stickKnob) {
        stickKnob.style.left = "34px";
        stickKnob.style.top = "34px";
      }
    };
    if (stickZone) {
      stickZone.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        stickPointerId = e.pointerId;
        try { stickZone.setPointerCapture(e.pointerId); } catch (_) {}
        updateStick(e.clientX, e.clientY);
      });
      stickZone.addEventListener("pointermove", (e) => {
        if (stickPointerId !== e.pointerId) return;
        e.preventDefault();
        updateStick(e.clientX, e.clientY);
      });
      const endStick = (e) => {
        if (stickPointerId !== e.pointerId && stickPointerId != null) return;
        resetStick();
      };
      stickZone.addEventListener("pointerup", endStick);
      stickZone.addEventListener("pointercancel", endStick);
    }

    const touchFire = document.getElementById("touch-fire");
    const touchPlant = document.getElementById("touch-plant");
    const touchWater = document.getElementById("touch-water");
    if (touchFire) {
      touchFire.onclick = (e) => {
        e.stopPropagation();
        shoot();
      };
    }
    if (touchPlant) {
      touchPlant.onclick = (e) => {
        e.stopPropagation();
        if (mode !== "farm" || !controlsActive()) return;
        const s = lookingAtSlot();
        if (s) tryPlant(s);
        else showToast("Nhìn ô đất trống", false);
      };
    }
    if (touchWater) {
      touchWater.onclick = (e) => {
        e.stopPropagation();
        if (mode !== "farm" || !controlsActive()) return;
        const s = lookingAtSlot();
        if (s) tryWater(s);
        else showToast("Nhìn cây đang lớn", false);
      };
    }

    document.addEventListener("keydown", (e) => {
      keys[e.code] = true;
      if (e.code === "Escape") {
        if (mode === "fill" || mode === "vocab" || mode === "boss") finishLesson(false);
        return;
      }
      // F / Enter đóng hướng dẫn "Đã hiểu"
      if ((e.code === "KeyF" || e.code === "Enter") && tutorialEl.classList.contains("open")) {
        e.preventDefault();
        dismissTutorial();
        return;
      }
      if (mode !== "farm") return;
      if (e.code === "KeyL") openLessons();
      if (e.code === "KeyB") openShop();
      if (e.code === "KeyM") nextSeason();
      const num = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7"].indexOf(e.code);
      if (num >= 0) {
        const k = NORMAL_CROPS[num];
        if (k) {
          selectedCrop = k;
          showToast(CROPS[k].name, true);
          buildSeedBar();
        }
      }
      if (e.code === "KeyE" && controlsActive()) {
        const s = lookingAtSlot();
        if (s) tryPlant(s);
        else showToast("Nhìn ô đất trống", false);
      }
      if (e.code === "KeyF" && controlsActive()) {
        const s = lookingAtSlot();
        if (s) tryWater(s);
        else showToast("Nhìn cây đang lớn", false);
      }
    });

    document.addEventListener("keyup", (e) => { keys[e.code] = false; });

    addEventListener("resize", () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });
  }

  // ========== LOOP ==========
  const clock = new THREE.Clock();

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    audio.tick(dt);

    euler.set(pitch, yaw, 0);
    camera.quaternion.setFromEuler(euler);

    if (mode === "farm") {
      seasonAutoT += dt;
      if (seasonAutoT >= SEASON_AUTO_SEC) nextSeason();
    }

    if (timerRunning && (mode === "fill" || mode === "vocab" || mode === "boss")) {
      lessonElapsed += dt;
      const prev = Math.ceil(lessonTimeLeft);
      lessonTimeLeft -= dt;
      const cur = Math.ceil(lessonTimeLeft);
      if (cur !== prev && cur <= 3 && cur > 0) audio.SFX.tick();
      updateTimerUi();
      if (lessonTimeLeft <= 0) {
        lessonTimeLeft = 0;
        onQuestionTimeUp();
      }
    }

    let moving = false;
    if (controlsActive() && (mode === "farm" || mode === "fill" || mode === "vocab" || mode === "boss")) {
      direction.set(0, 0, 0);
      if (keys.KeyW) direction.z -= 1;
      if (keys.KeyS) direction.z += 1;
      if (keys.KeyA) direction.x -= 1;
      if (keys.KeyD) direction.x += 1;
      if (Math.abs(stickVec.x) > 0.12 || Math.abs(stickVec.y) > 0.12) {
        direction.x += stickVec.x;
        direction.z += stickVec.y;
      }
      if (direction.lengthSq() > 0) {
        moving = true;
        direction.normalize();
        const yq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yq);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yq);
        playerPos.addScaledVector(forward, -direction.z * 7 * dt);
        playerPos.addScaledVector(right, direction.x * 7 * dt);
        playerPos.x = THREE.MathUtils.clamp(playerPos.x, -14, 14);
        playerPos.z = THREE.MathUtils.clamp(playerPos.z, -16, 12);
      }
      camera.position.copy(playerPos);
    }

    if (mode === "farm" && moving) audio.SFX.footstep();

    if (mode === "farm") {
      const s = SEASONS[seasonIndex];
      world.updateParticles(dt, s, performance.now() * 0.001);
      updateBursts(dt);
      if (kenneyDress?.update) kenneyDress.update(dt);
    }

    const now = performance.now() * 0.001;
    for (const f of floating) {
      f.spawnT += dt;
      const sc = Math.min(1, f.spawnT * 4);
      f.mesh.scale.setScalar(sc);
      f.mesh.position.addScaledVector(f.vel, dt);
      f.mesh.position.y += Math.sin(now * 2 + f.bob) * 0.012;
      const dx = f.mesh.position.x;
      const dz = f.mesh.position.z + 4;
      if (Math.hypot(dx, dz) > 11) { f.vel.x *= -1; f.vel.z *= -1; }
      if (f.mesh.position.y < 0.8 || f.mesh.position.y > 4) f.vel.y *= -1;
      f.mesh.quaternion.copy(camera.quaternion);
    }

    if (bossMesh && mode === "boss") {
      bossMesh.position.y = 0.2 + Math.sin(now * 2) * 0.15;
      bossMesh.rotation.y = Math.sin(now * 0.5) * 0.2;
    }

    if (mode === "farm") {
      const tnow = performance.now();
      const season = SEASONS[seasonIndex];
      updateFarmAimHint();
      for (const s of slots) {
        if (!s.crop || !s.mesh) continue;
        const def = CROPS[s.crop];
        const growMs = def.growMs / season.growMul;
        const t = Math.min((tnow - s.plantedAt) / growMs, 1);
        const stage = growthStage(t, t >= 1);
        if (stage !== s.stage) {
          const cropType = s.crop;
          const plantedAt = s.plantedAt;
          const watered = s.watered;
          plantAt(s, cropType, t, { keepWatered: true, plantedAt });
          s.watered = watered;
        }
        if (s.ripe && s.mesh) {
          s.mesh.position.y = s.pos.y + Math.sin(tnow * 0.006 + s.ix) * 0.04;
          s.mesh.traverse((o) => {
            if (o.isMesh && o.userData.isFruit && o.material && "emissiveIntensity" in o.material) {
              o.material.emissiveIntensity = 0.28 + Math.sin(tnow * 0.004 + s.ix) * 0.18;
            }
          });
          if (s.glow) s.glow.intensity = (def.vip ? 1.6 : 1.0) * (0.85 + Math.sin(tnow * 0.004) * 0.2);
        }
      }
    }

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.className = "";
    }

    renderer.render(scene, camera);
  }

  async function init() {
    window.addEventListener("message", (ev) => {
      if (ev.origin !== window.location.origin) return;
      const d = ev.data;
      if (!d || d.source !== "qlhs-shop") return;
      if (d.type === "content-pack") applyContentPack(d.payload);
    });

    loadGame();
    const cloud = await requestCloudSave();
    if (cloud.playerName) applyAccountPlayerName(cloud.playerName);
    if (cloud.payload) applySaveData(cloud.payload);
    else if (accountPlayerName) playerName = accountPlayerName;
    refreshStartScreen();
    initSlots();
    restorePlots();
    wireEvents();
    applySeason();
    buildLessonLists();
    updateFarmHud();
    if (typeof HS_MODELS !== "undefined") {
      HS_MODELS.enhance(THREE, scene, world).then((dress) => {
        kenneyDress = dress;
      });
    }
    tick();
  }

  init();
})();
