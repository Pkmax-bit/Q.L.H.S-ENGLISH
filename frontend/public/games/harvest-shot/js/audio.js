// PROTOTYPE - AudioBus (layered WebAudio)
(function (global) {
  function createAudioBus() {
    let ctx = null;
    let master = null;
    let sfxGain = null;
    let ambGain = null;
    let muted = false;
    let volume = 0.7;
    let ambNodes = [];
    let ambSeason = null;
    let stepCooldown = 0;

    function ensure() {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        sfxGain = ctx.createGain();
        ambGain = ctx.createGain();
        sfxGain.connect(master);
        ambGain.connect(master);
        master.connect(ctx.destination);
        applyVol();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    function applyVol() {
      if (!master) return;
      master.gain.value = muted ? 0 : volume;
      if (ambGain) ambGain.gain.value = muted ? 0 : 0.45;
    }

    function env(g, t0, a, d, peak) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    }

    function tone(freq, dur, type, peak, dest, slide) {
      if (muted) return;
      const c = ensure();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slide != null) o.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur);
      env(g, c.currentTime, 0.01, dur, peak);
      o.connect(g); g.connect(dest || sfxGain);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    }

    function noiseBurst(dur, peak, filterFreq) {
      if (muted) return;
      const c = ensure();
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const filt = c.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = filterFreq || 1200;
      const g = c.createGain();
      env(g, c.currentTime, 0.005, dur, peak);
      src.connect(filt); filt.connect(g); g.connect(sfxGain);
      src.start();
    }

    function stopAmbient() {
      for (const n of ambNodes) {
        try { n.stop?.(); n.disconnect?.(); } catch (_) {}
      }
      ambNodes = [];
      ambSeason = null;
    }

    function startAmbient(seasonId, gainMul) {
      ensure();
      if (ambSeason === seasonId && ambNodes.length) return;
      stopAmbient();
      ambSeason = seasonId;
      const c = ctx;
      const base = c.createOscillator();
      const g1 = c.createGain();
      base.type = "sine";
      base.frequency.value = seasonId === "winter" ? 90 : seasonId === "festival" ? 140 : 110;
      g1.gain.value = 0.03 * (gainMul || 1);
      const lfo = c.createOscillator();
      const lfoG = c.createGain();
      lfo.frequency.value = 0.15;
      lfoG.gain.value = 8;
      lfo.connect(lfoG); lfoG.connect(base.frequency);
      base.connect(g1); g1.connect(ambGain);
      base.start(); lfo.start();
      ambNodes.push(base, lfo);

      // wind noise
      const len = c.sampleRate * 2;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const wind = c.createBufferSource();
      wind.buffer = buf; wind.loop = true;
      const wf = c.createBiquadFilter();
      wf.type = "lowpass";
      wf.frequency.value = seasonId === "rain" ? 800 : 400;
      const wg = c.createGain();
      wg.gain.value = (seasonId === "rain" ? 0.04 : 0.02) * (gainMul || 1);
      wind.connect(wf); wf.connect(wg); wg.connect(ambGain);
      wind.start();
      ambNodes.push(wind);

      if (seasonId === "spring" || seasonId === "summer") {
        const chirp = () => {
          if (ambSeason !== seasonId || muted) return;
          tone(1800 + Math.random() * 800, 0.08, "sine", 0.02, ambGain);
          setTimeout(chirp, 2000 + Math.random() * 4000);
        };
        setTimeout(chirp, 1000);
      }
    }

    const SFX = {
      shoot() { noiseBurst(0.07, 0.12, 900); tone(160, 0.06, "sawtooth", 0.05, null, 70); },
      correct() { tone(523, 0.07, "triangle", 0.1); setTimeout(() => tone(659, 0.07, "triangle", 0.09), 60); setTimeout(() => tone(784, 0.12, "triangle", 0.1), 130); },
      streak() { tone(880, 0.06, "sine", 0.08); setTimeout(() => tone(1175, 0.14, "sine", 0.1), 70); },
      wrong() { tone(220, 0.12, "sawtooth", 0.08, null, 90); noiseBurst(0.1, 0.06, 400); },
      harvest() { tone(440, 0.06, "triangle", 0.08); setTimeout(() => tone(660, 0.08, "triangle", 0.07), 70); setTimeout(() => tone(880, 0.1, "sine", 0.06), 140); },
      plant() { tone(300, 0.1, "sine", 0.07, null, 480); },
      water() { noiseBurst(0.15, 0.08, 2000); tone(600, 0.12, "sine", 0.04); },
      click() { tone(700, 0.04, "square", 0.04); },
      hit() { noiseBurst(0.1, 0.14, 300); tone(120, 0.1, "sawtooth", 0.1, null, 50); },
      hurt() { tone(140, 0.2, "sawtooth", 0.1, null, 50); },
      win() { tone(523, 0.1, "sine", 0.09); setTimeout(() => tone(659, 0.1, "sine", 0.09), 100); setTimeout(() => tone(784, 0.22, "sine", 0.1), 200); },
      lose() { tone(280, 0.2, "triangle", 0.08, null, 100); },
      tick() { tone(1100, 0.025, "square", 0.03); },
      timeup() { tone(200, 0.28, "sawtooth", 0.1, null, 70); },
      footstep() {
        if (stepCooldown > 0) return;
        stepCooldown = 0.28;
        noiseBurst(0.05, 0.04, 180);
      },
    };

    return {
      ensure,
      SFX,
      setMuted(m) { muted = m; applyVol(); },
      isMuted() { return muted; },
      setVolume(v) { volume = Math.max(0, Math.min(1, v)); applyVol(); },
      getVolume() { return volume; },
      startAmbient,
      stopAmbient,
      fadeAmbientForLesson(inLesson) {
        if (!ambGain) return;
        ambGain.gain.linearRampToValueAtTime(inLesson || muted ? 0.05 : 0.45, (ctx?.currentTime || 0) + 0.3);
      },
      tick(dt) { if (stepCooldown > 0) stepCooldown -= dt; },
    };
  }

  global.HS_AUDIO = { createAudioBus };
})(typeof window !== "undefined" ? window : globalThis);
