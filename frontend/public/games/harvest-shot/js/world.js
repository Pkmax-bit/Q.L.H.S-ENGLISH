// PROTOTYPE - World dressing + season lighting + sky
(function (global) {
  function hexToCss(hex) {
    const h = hex >>> 0;
    const r = (h >> 16) & 255;
    const g = (h >> 8) & 255;
    const b = h & 255;
    return `rgb(${r},${g},${b})`;
  }

  function makeSkyTexture(THREE, topHex, midHex, bottomHex) {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 256;
    const ctx = c.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, hexToCss(topHex));
    grad.addColorStop(0.42, hexToCss(midHex));
    grad.addColorStop(0.72, hexToCss(bottomHex));
    grad.addColorStop(1, hexToCss(bottomHex));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 256);
    // soft clouds
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 8; i++) {
      const y = 40 + i * 14 + (i % 3) * 6;
      ctx.beginPath();
      ctx.ellipse(1 + (i % 2), y, 1.6, 6 + (i % 3), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  function createWorld(THREE, scene, opts) {
    const {
      COLS, SPACING, VIP_COLS, VIP_ROWS, VIP_SPACING, VIP_ORIGIN,
    } = opts;

    const root = new THREE.Group();
    scene.add(root);
    const farmProps = new THREE.Group();
    root.add(farmProps);

    const hemi = new THREE.HemisphereLight(0xe8f4ff, 0x4a6b3a, 0.95);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d4, 1.35);
    sun.position.set(12, 18, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    const fill = new THREE.AmbientLight(0x404860, 0.25);
    scene.add(fill);

    // --- Sky dome (replaces flat scene.background stacking look) ---
    const skyMat = new THREE.MeshBasicMaterial({
      map: makeSkyTexture(THREE, 0x4aa3ff, 0x9fd4ff, 0xd8f0ff),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 20), skyMat);
    sky.name = "sky";
    sky.renderOrder = -10;
    scene.add(sky);
    scene.background = null;

    function groundMat(color) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.95,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
    }

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(38, 48),
      groundMat(0x4a7c3f)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    root.add(ground);

    // Distant hills (single ring — not a second ground plane)
    const hills = new THREE.Mesh(
      new THREE.TorusGeometry(34, 2.2, 8, 40),
      new THREE.MeshStandardMaterial({ color: 0x3d6b3a, roughness: 1, flatShading: true })
    );
    hills.rotation.x = -Math.PI / 2;
    hills.position.y = -0.6;
    hills.receiveShadow = true;
    root.add(hills);

    function woodMat(c) {
      return new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
    }

    // Path — raised enough to avoid z-fight with ground
    const path = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.95 })
    );
    path.position.set(0, 0.03, -1);
    path.receiveShadow = true;
    farmProps.add(path);

    // Stepping stones along path
    for (let i = 0; i < 10; i++) {
      const stone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28 + (i % 3) * 0.05, 0.32, 0.08, 7),
        new THREE.MeshStandardMaterial({ color: 0x9a8b78, roughness: 1, flatShading: true })
      );
      stone.position.set(((i % 2) - 0.5) * 0.55, 0.06, 4 - i * 1.35);
      stone.rotation.y = i * 0.4;
      stone.receiveShadow = true;
      farmProps.add(stone);
    }

    const pathVip = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.06, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.95 })
    );
    pathVip.position.set(3.8, 0.03, -4);
    pathVip.receiveShadow = true;
    farmProps.add(pathVip);

    // Grass tufts
    function grassTuft(x, z) {
      const g = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const blade = new THREE.Mesh(
          new THREE.ConeGeometry(0.03, 0.22 + Math.random() * 0.12, 3),
          new THREE.MeshStandardMaterial({ color: 0x3d8b40, roughness: 0.95, flatShading: true })
        );
        blade.position.set((Math.random() - 0.5) * 0.12, 0.1, (Math.random() - 0.5) * 0.12);
        blade.rotation.z = (Math.random() - 0.5) * 0.4;
        blade.castShadow = true;
        g.add(blade);
      }
      g.position.set(x, 0, z);
      farmProps.add(g);
    }
    function onBeds(x, z) {
      const normal = Math.abs(x) < 5.2 && z > -11.5 && z < 1.0;
      const vip = x > 5.5 && x < 12.2 && z > -10.5 && z < -0.2;
      return normal || vip;
    }
    let grassPlaced = 0;
    let grassTries = 0;
    while (grassPlaced < 28 && grassTries < 120) {
      grassTries++;
      const a = Math.random() * Math.PI * 2;
      const r = 5 + Math.random() * 12;
      const gx = Math.cos(a) * r;
      const gz = Math.sin(a) * r - 4;
      if (onBeds(gx, gz)) continue;
      grassTuft(gx, gz);
      grassPlaced++;
    }

    // Fence — box length along X → yaw = atan2(dz, dx); gate gap on south side
    const postKeys = new Set();
    function addFence(x0, z0, x1, z1, posts) {
      const dx = x1 - x0;
      const dz = z1 - z0;
      for (let i = 0; i <= posts; i++) {
        const t = i / posts;
        const x = x0 + dx * t;
        const z = z0 + dz * t;
        const key = `${x.toFixed(2)},${z.toFixed(2)}`;
        if (postKeys.has(key)) continue;
        postKeys.add(key);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.15, 0.14), woodMat(0x6b4f2a));
        post.position.set(x, 0.55, z);
        post.castShadow = true;
        farmProps.add(post);
        // post cap
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), woodMat(0x5d4037));
        cap.position.set(x, 1.15, z);
        farmProps.add(cap);
      }
      const len = Math.hypot(dx, dz);
      if (len < 0.01) return;
      const yaw = Math.atan2(dz, dx);
      const mx = (x0 + x1) / 2;
      const mz = (z0 + z1) / 2;
      const railMat = woodMat(0x8b6914);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), railMat);
      rail.position.set(mx, 0.72, mz);
      rail.rotation.y = yaw;
      farmProps.add(rail);
      const rail2 = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.08), railMat);
      rail2.position.set(mx, 0.48, mz);
      rail2.rotation.y = yaw;
      farmProps.add(rail2);
      // diagonal brace mid-span
      if (len > 3) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(len * 0.35, 0.05, 0.05), woodMat(0x7a5c2e));
        brace.position.set(mx, 0.6, mz);
        brace.rotation.y = yaw;
        brace.rotation.z = 0.35;
        farmProps.add(brace);
      }
    }
    // South: two segments with gate opening at center
    addFence(-9, 2, -1.2, 2, 5);
    addFence(1.2, 2, 11, 2, 6);
    addFence(-9, 2, -9, -12, 8);
    addFence(11, 2, 11, -12, 8);
    addFence(-9, -12, 11, -12, 12);
    // Gate posts
    for (const gx of [-1.2, 1.2]) {
      const gp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4, 0.18), woodMat(0x5d4037));
      gp.position.set(gx, 0.7, 2);
      gp.castShadow = true;
      farmProps.add(gp);
    }

    // Barn — body + door + windows + loft
    const barnGroup = new THREE.Group();
    const barn = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.2, 3.4), woodMat(0xc44536));
    barn.position.set(0, 1.6, 0);
    barn.castShadow = true;
    barn.receiveShadow = true;
    barnGroup.add(barn);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.5, 4), woodMat(0x5a2a1a));
    roof.position.set(0, 3.8, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    barnGroup.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 0.12), woodMat(0x5d4037));
    door.position.set(0, 1.0, 1.72);
    barnGroup.add(door);
    const doorX = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.04), woodMat(0x3e2723));
    doorX.position.set(0, 1.0, 1.8);
    barnGroup.add(doorX);
    const doorY = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.04), woodMat(0x3e2723));
    doorY.position.set(0, 1.0, 1.8);
    barnGroup.add(doorY);
    for (const wx of [-1.3, 1.3]) {
      const win = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xf5d76e, emissive: 0xf5d76e, emissiveIntensity: 0.25, roughness: 0.4 })
      );
      win.position.set(wx, 2.1, 1.72);
      barnGroup.add(win);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.78, 0.06), woodMat(0x4e342e));
      frame.position.set(wx, 2.1, 1.7);
      barnGroup.add(frame);
    }
    const loft = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.1), woodMat(0x6d4c41));
    loft.position.set(0, 2.6, 1.72);
    barnGroup.add(loft);
    // Side planks hint
    for (let i = 0; i < 4; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.0, 3.35), woodMat(0xa93226));
      plank.position.set(-2.05 + i * 0.08, 1.55, 0);
      barnGroup.add(plank);
    }
    barnGroup.position.set(-8, 0, -6);
    farmProps.add(barnGroup);

    // Well + roof + bucket
    const wellGroup = new THREE.Group();
    const well = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.85, 0.9, 14),
      new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.7, flatShading: true })
    );
    well.position.y = 0.45;
    well.castShadow = true;
    wellGroup.add(well);
    // stone rings
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.72 - i * 0.02, 0.04, 6, 16),
        new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.85, flatShading: true })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.25 + i * 0.28;
      wellGroup.add(ring);
    }
    const wellWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.1, 14),
      new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.85 })
    );
    wellWater.position.y = 0.7;
    wellGroup.add(wellWater);
    for (const sx of [-0.55, 0.55]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.4, 6), woodMat(0x6b4f2a));
      post.position.set(sx, 1.3, 0);
      post.castShadow = true;
      wellGroup.add(post);
    }
    const wellBeam = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.1), woodMat(0x5d4037));
    wellBeam.position.y = 2.0;
    wellGroup.add(wellBeam);
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.45, 4), woodMat(0x8b4513));
    wellRoof.position.y = 2.35;
    wellRoof.rotation.y = Math.PI / 4;
    wellGroup.add(wellRoof);
    const bucket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.12, 0.22, 8),
      woodMat(0x6d4c41)
    );
    bucket.position.set(0.35, 1.15, 0);
    wellGroup.add(bucket);
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.7, 5),
      new THREE.MeshStandardMaterial({ color: 0xc9b896 })
    );
    rope.position.set(0.35, 1.55, 0);
    wellGroup.add(rope);
    wellGroup.position.set(3.5, 0, 1.5);
    farmProps.add(wellGroup);

    // Scarecrow — clothes + face detail
    const sc = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6), woodMat(0x6b4f2a));
    pole.position.y = 1.1; pole.castShadow = true; sc.add(pole);
    const arms = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), woodMat(0x6b4f2a));
    arms.position.y = 1.7; sc.add(arms);
    const shirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.9 })
    );
    shirt.position.y = 1.55; shirt.castShadow = true; sc.add(shirt);
    const scarf = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.05, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.85 })
    );
    scarf.position.y = 1.95; scarf.rotation.x = Math.PI / 2; sc.add(scarf);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf5c16c, roughness: 0.8 }));
    head.position.y = 2.2; head.castShadow = true; sc.add(head);
    for (const ex of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
      eye.position.set(ex, 2.25, 0.22); sc.add(eye);
    }
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.015, 4, 8, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x5d4037 })
    );
    smile.position.set(0, 2.12, 0.24); smile.rotation.x = Math.PI; sc.add(smile);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 0.22, 12), woodMat(0x5d4037));
    hat.position.y = 2.48; sc.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 12), woodMat(0x4e342e));
    brim.position.y = 2.38; sc.add(brim);
    sc.position.set(-6.2, 0, 2.4);
    farmProps.add(sc);

    // Wheelbarrow
    const wb = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.7), woodMat(0x8b4513));
    tray.position.y = 0.45; tray.rotation.z = -0.15; tray.castShadow = true; wb.add(tray);
    const dirtPile = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1 })
    );
    dirtPile.position.set(-0.1, 0.62, 0); dirtPile.scale.set(1.3, 0.5, 0.9); wb.add(dirtPile);
    const handleL = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), woodMat(0x6b4f2a));
    handleL.position.set(-0.7, 0.55, 0.22); handleL.rotation.z = 1.1; wb.add(handleL);
    const handleR = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), woodMat(0x6b4f2a));
    handleR.position.set(-0.7, 0.55, -0.22); handleR.rotation.z = 1.1; wb.add(handleR);
    const wheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.12, 14),
      new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 })
    );
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0.5, 0.28, 0);
    wb.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5, roughness: 0.4 }));
    hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); wb.add(hub);
    wb.position.set(4.8, 0, 2.6);
    farmProps.add(wb);

    // Backdrop trees — layered foliage
    function decoTree(x, z, h) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, h * 0.5, 8), woodMat(0x5d4037));
      trunk.position.y = h * 0.25; trunk.castShadow = true; g.add(trunk);
      // roots
      for (let i = 0; i < 3; i++) {
        const root = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), woodMat(0x4e342e));
        const a = (i / 3) * Math.PI * 2;
        root.position.set(Math.cos(a) * 0.25, 0.08, Math.sin(a) * 0.25);
        root.rotation.z = Math.cos(a) * 1.1;
        root.rotation.x = Math.sin(a) * 1.1;
        g.add(root);
      }
      const colors = [0x1b5e20, 0x2e7d32, 0x388e3c];
      for (let i = 0; i < 3; i++) {
        const foliage = new THREE.Mesh(
          new THREE.SphereGeometry(h * (0.32 - i * 0.04), 12, 10),
          new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.92 })
        );
        foliage.position.y = h * (0.48 + i * 0.14);
        foliage.scale.set(1.1 - i * 0.1, 0.85, 1.05);
        foliage.castShadow = true;
        g.add(foliage);
      }
      g.position.set(x, 0, z);
      farmProps.add(g);
    }
    decoTree(-14, -4, 4.5);
    decoTree(-13, -11, 3.8);
    decoTree(15, -3, 4.2);
    decoTree(14, -12, 3.5);
    decoTree(-7, -16, 5);
    decoTree(6, -16, 4);

    function makeSign(text, x, y, z, yaw) {
      const g = new THREE.Group();
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 64;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = "#ffe566";
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 248, 56);
      ctx.fillStyle = "#ffe566";
      ctx.font = "bold 24px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 128, 34);
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(2.0, 0.5),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide })
      );
      plane.position.set(0, 1.25, 0);
      g.add(plane);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.25, 0.12), woodMat(0x6b4f2a));
      post.position.y = 0.6;
      g.add(post);
      g.position.set(x, y, z);
      if (yaw) g.rotation.y = yaw;
      farmProps.add(g);
      return g;
    }
    makeSign("ĐẤT THƯỜNG", -5.4, 0, 1.4, 0.2);
    makeSign("VIP GARDEN", VIP_ORIGIN.x + ((VIP_COLS - 1) * VIP_SPACING) / 2, 0, VIP_ORIGIN.z + VIP_ROWS * VIP_SPACING + 0.9, -0.2);

    // Plot beds — solid raised boxes (no coplanar slab on ground)
    const plotMesh = new THREE.Mesh(
      new THREE.BoxGeometry(COLS * SPACING + 1.0, 0.22, 3 * SPACING + 1.0),
      new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.92 })
    );
    plotMesh.position.set(0, 0.11, -4);
    plotMesh.receiveShadow = true;
    farmProps.add(plotMesh);

    // Furrow lines on normal plot
    const furrowGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const furrow = new THREE.Mesh(
        new THREE.BoxGeometry(COLS * SPACING + 0.6, 0.04, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 1 })
      );
      furrow.position.set(0, 0.23, -4 - SPACING + i * (SPACING * 0.85));
      furrowGroup.add(furrow);
    }
    farmProps.add(furrowGroup);

    const vipPlotMesh = new THREE.Mesh(
      new THREE.BoxGeometry(VIP_COLS * VIP_SPACING + 1.0, 0.24, VIP_ROWS * VIP_SPACING + 1.0),
      new THREE.MeshStandardMaterial({ color: 0x4a2060, roughness: 0.75, metalness: 0.12 })
    );
    vipPlotMesh.position.set(
      VIP_ORIGIN.x + ((VIP_COLS - 1) * VIP_SPACING) / 2,
      0.12,
      VIP_ORIGIN.z + ((VIP_ROWS - 1) * VIP_SPACING) / 2
    );
    vipPlotMesh.receiveShadow = true;
    farmProps.add(vipPlotMesh);

    // VIP frame as EDGE posts only (not a second overlapping floor slab)
    const vipRimGroup = new THREE.Group();
    const vx = vipPlotMesh.position.x;
    const vz = vipPlotMesh.position.z;
    const halfW = (VIP_COLS * VIP_SPACING + 1.2) / 2;
    const halfD = (VIP_ROWS * VIP_SPACING + 1.2) / 2;
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f, emissive: 0xf1c40f, emissiveIntensity: 0.4, roughness: 0.45,
    });
    function rimBar(w, d, x, z) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), rimMat);
      m.position.set(x, 0.28, z);
      vipRimGroup.add(m);
    }
    rimBar(halfW * 2, 0.12, vx, vz - halfD);
    rimBar(halfW * 2, 0.12, vx, vz + halfD);
    rimBar(0.12, halfD * 2, vx - halfW, vz);
    rimBar(0.12, halfD * 2, vx + halfW, vz);
    farmProps.add(vipRimGroup);

    const vipLight1 = new THREE.PointLight(0x9b59ff, 1.0, 7);
    vipLight1.position.set(vx - 1.2, 2.2, vz);
    farmProps.add(vipLight1);
    const vipLight2 = new THREE.PointLight(0xf1c40f, 0.85, 7);
    vipLight2.position.set(vx + 1.2, 2.2, vz);
    farmProps.add(vipLight2);

    const vipLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 1.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    vipLamp.position.set(vx + 2.2, 0.9, vz + 2);
    vipLamp.castShadow = true;
    farmProps.add(vipLamp);
    const vipLampGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xf1c40f, emissive: 0xf1c40f, emissiveIntensity: 0.9 })
    );
    vipLampGlow.position.set(vipLamp.position.x, 1.9, vipLamp.position.z);
    farmProps.add(vipLampGlow);

    // Fewer particles — less “duplicate fog” look
    const particleCount = 220;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 40;
      pPos[i * 3 + 1] = 2 + Math.random() * 12;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.12,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    farmProps.add(particles);

    // Lesson arena floor — only shown in lessons; sits ABOVE ground, opaque
    const arenaMark = new THREE.Mesh(
      new THREE.CircleGeometry(12, 40),
      new THREE.MeshStandardMaterial({ color: 0x2f4a3a, roughness: 0.9 })
    );
    arenaMark.rotation.x = -Math.PI / 2;
    arenaMark.position.set(0, 0.04, -4);
    arenaMark.visible = false;
    arenaMark.receiveShadow = true;
    scene.add(arenaMark);

    const festivalLights = [];
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(0xff66aa, 0, 10);
      pl.position.set(-8 + Math.cos(i) * 2, 2.5, -6 + Math.sin(i) * 2);
      farmProps.add(pl);
      festivalLights.push(pl);
    }

    const seasonSky = {
      spring:   { top: 0x3a8fd9, mid: 0x9fd4ff, bot: 0xe8f6ff, fog: 0xb8dcf5 },
      summer:   { top: 0x1e78d0, mid: 0x5eb0ff, bot: 0xfff2c8, fog: 0x8ec4f0 },
      autumn:   { top: 0x6a7aa0, mid: 0xffc98a, bot: 0xffe0b0, fog: 0xe0b888 },
      winter:   { top: 0x8aa0b8, mid: 0xc8d8ea, bot: 0xeef4f8, fog: 0xc8d4e0 },
      rain:     { top: 0x3a4a5a, mid: 0x5a7088, bot: 0x7a8a98, fog: 0x5a7088 },
      festival: { top: 0x1a0a38, mid: 0x3a1a6a, bot: 0x5a2a4a, fog: 0x3a2a5a },
    };

    function resizePlot(rows) {
      plotMesh.geometry.dispose();
      plotMesh.geometry = new THREE.BoxGeometry(COLS * SPACING + 1.0, 0.22, rows * SPACING + 1.0);
      plotMesh.position.z = -4 - ((rows - 3) * SPACING) / 2;
    }

    function applySeason(season, renderer) {
      const sk = seasonSky[season.id] || seasonSky.spring;
      if (skyMat.map) skyMat.map.dispose();
      skyMat.map = makeSkyTexture(THREE, sk.top, sk.mid, sk.bot);
      skyMat.needsUpdate = true;
      scene.background = null;
      scene.fog = new THREE.Fog(sk.fog, Math.max(28, season.fogNear || 28), season.fogFar || 62);
      ground.material.color.setHex(season.ground);
      hills.material.color.setHex(season.ground);
      if (typeof hills.material.color.offsetHSL === "function") {
        hills.material.color.offsetHSL(0, -0.05, -0.1);
      }
      plotMesh.material.color.setHex(season.plot);
      hemi.color.setHex(season.hemi);
      sun.color.setHex(season.sun || 0xfff2d0);
      sun.intensity = season.sunIntensity ?? 1.1;
      fill.intensity = season.id === "rain" ? 0.35 : 0.22;
      pMat.color.set(season.color);
      const fest = season.id === "festival";
      for (const pl of festivalLights) pl.intensity = fest ? 1.2 : 0;
      if (renderer) {
        renderer.toneMappingExposure = season.id === "winter" ? 1.05 : season.id === "rain" ? 0.85 : 1.0;
      }
    }

    function updateParticles(dt, season, now) {
      const arr = particles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        if (season.particle === "rain") {
          arr[i * 3 + 1] -= 10 * dt;
          arr[i * 3] += 1.2 * dt;
        } else if (season.particle === "snow") {
          arr[i * 3 + 1] -= 1.1 * dt;
          arr[i * 3] += Math.sin(now + i) * 0.5 * dt;
        } else if (season.particle === "leaf" || season.particle === "petal") {
          arr[i * 3 + 1] -= 1.4 * dt;
          arr[i * 3] += Math.sin(i + now * 2) * 2.2 * dt;
        } else if (season.particle === "spark") {
          arr[i * 3 + 1] += Math.sin(i + now * 3) * 2 * dt;
        } else {
          arr[i * 3 + 1] -= 0.35 * dt;
        }
        if (arr[i * 3 + 1] < 0.5) {
          arr[i * 3 + 1] = 8 + Math.random() * 5;
          arr[i * 3] = (Math.random() - 0.5) * 40;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
      const pulse = 0.85 + Math.sin(now * 2) * 0.25;
      vipLight1.intensity = 1.0 * pulse;
      vipLight2.intensity = 0.85 * pulse;
      if (festivalLights[0]?.intensity > 0) {
        for (let i = 0; i < festivalLights.length; i++) {
          festivalLights[i].intensity = 0.8 + Math.sin(now * 3 + i) * 0.5;
        }
      }
      // Keep sky centered on camera-ish origin
      sky.position.set(0, 0, 0);
    }

    function setFarmVisible(vis) {
      farmProps.visible = vis;
      ground.visible = vis;
      hills.visible = vis;
      arenaMark.visible = !vis;
      // Keep sky always on
      sky.visible = true;
    }

    function setLessonSky() {
      if (skyMat.map) skyMat.map.dispose();
      skyMat.map = makeSkyTexture(THREE, 0x1a2a3a, 0x2a3a4a, 0x3a4a5a);
      skyMat.needsUpdate = true;
      scene.background = null;
      scene.fog = new THREE.Fog(0x2a3a4a, 24, 55);
    }

    return {
      root, farmProps, ground, plotMesh, vipPlotMesh, vipRim: vipRimGroup, barn, particles, arenaMark,
      sky, hemi, sun, fill, vipLight1, vipLight2,
      resizePlot, applySeason, updateParticles, setFarmVisible, setLessonSky,
    };
  }

  function setupRenderer(THREE, canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.setClearColor(0x87b8e8, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else if ("outputEncoding" in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
    return renderer;
  }

  global.HS_WORLD = { createWorld, setupRenderer };
})(typeof window !== "undefined" ? window : globalThis);
