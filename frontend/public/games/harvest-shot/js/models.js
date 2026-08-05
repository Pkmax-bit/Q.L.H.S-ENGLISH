/**
 * Harvest Shot — Kenney Nature Kit (CC0) props.
 * Props stay OUTSIDE plant beds so planting stays clear.
 */
(function (global) {
  const BASE = "assets/models/";

  const CATALOG = {
    trees: [
      "tree_oak.glb", "tree_oak_dark.glb", "tree_pineTallA_detailed.glb",
      "tree_pineSmallA.glb", "tree_default.glb", "tree_tall.glb",
      "tree_small.glb", "tree_thin.glb",
    ],
    bushes: ["plant_bushDetailed.glb", "plant_bushLarge.glb", "plant_bushSmall.glb"],
    flowers: [
      "flower_redA.glb", "flower_yellowA.glb", "flower_purpleA.glb",
      "flower_redB.glb", "flower_yellowB.glb",
    ],
    rocks: ["rock_largeA.glb", "rock_tallA.glb", "rock_smallA.glb", "rock_smallC.glb"],
    decor: ["fence_gate.glb", "tent_smallOpen.glb", "log_stack.glb", "crops_cornStageD.glb", "crop_pumpkin.glb"],
  };

  /** Keep clear of normal beds (|x|<5, z≈-11..0.8) and VIP (x≈6..12, z≈-10..-0.5). */
  function onPlantBeds(x, z) {
    const normal = Math.abs(x) < 5.2 && z > -11.5 && z < 1.0;
    const vip = x > 5.5 && x < 12.2 && z > -10.5 && z < -0.2;
    return normal || vip;
  }

  function normalizeToSize(root, targetMax) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    root.scale.multiplyScalar(targetMax / maxDim);
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.y -= box2.min.y;
    return root;
  }

  function fixMaterials(root) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.raycast = () => {};
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m) return;
        if ("metalness" in m) m.metalness = 0.05;
        if ("roughness" in m) m.roughness = 0.85;
        if (m.envMapIntensity != null) m.envMapIntensity = 0;
        if (m.map && THREE.SRGBColorSpace != null) m.map.colorSpace = THREE.SRGBColorSpace;
        m.side = THREE.FrontSide;
        m.needsUpdate = true;
      });
    });
  }

  function cloneAt(template, x, z, yaw, targetMax) {
    if (onPlantBeds(x, z)) return null;
    const g = template.clone(true);
    g.traverse((o) => {
      if (!o.isMesh) return;
      if (Array.isArray(o.material)) o.material = o.material.map((m) => (m ? m.clone() : m));
      else if (o.material) o.material = o.material.clone();
    });
    fixMaterials(g);
    g.position.set(x, 0, z);
    g.rotation.y = yaw ?? Math.random() * Math.PI * 2;
    g.scale.set(1, 1, 1);
    normalizeToSize(g, targetMax);
    return g;
  }

  function addProp(group, template, x, z, yaw, size) {
    if (!template) return;
    const g = cloneAt(template.root || template, x, z, yaw, size);
    if (g) group.add(g);
  }

  async function loadAll(THREE) {
    if (!THREE.GLTFLoader) return null;
    const loader = new THREE.GLTFLoader();
    const cache = {};
    const files = [
      ...CATALOG.trees, ...CATALOG.bushes, ...CATALOG.flowers,
      ...CATALOG.rocks, ...CATALOG.decor,
    ];

    await Promise.all(files.map((file) => new Promise((resolve) => {
      loader.load(
        BASE + file,
        (gltf) => {
          const root = gltf.scene || gltf.scenes[0];
          fixMaterials(root);
          cache[file] = { root };
          resolve();
        },
        undefined,
        () => { cache[file] = null; resolve(); },
      );
    })));

    return cache;
  }

  function pick(cache, list) {
    const ok = list.map((f) => cache[f]).filter(Boolean);
    if (!ok.length) return null;
    return ok[Math.floor(Math.random() * ok.length)];
  }

  function dressWorld(world, cache) {
    if (!cache || !world?.farmProps) return { update() {} };

    const old = world.farmProps.getObjectByName("kenney-dressing");
    if (old) world.farmProps.remove(old);

    const group = new THREE.Group();
    group.name = "kenney-dressing";
    world.farmProps.add(group);

    // Trees — perimeter only (outside beds)
    [
      [-14, -4, 5], [-13, -11, 4.4], [15, -3, 4.8], [14, -12, 4.2],
      [-7, -16, 5.2], [6, -16, 4.6], [-16, -8, 4], [17, -8, 4.3],
      [-12, 2.5, 3.8], [13, 2.8, 3.6], [-15, -14, 4.5], [16, -15, 4.2],
    ].forEach(([x, z, size]) => {
      const t = pick(cache, CATALOG.trees);
      if (t) addProp(group, t, x, z, undefined, size);
    });

    // Bushes — front / sides, not on beds
    [
      [-9.5, 2.2], [10.5, 2.4], [-9, -12], [10, -12],
      [-6.5, 3.2], [5.5, 3.4], [-11, -9], [12.5, -9],
    ].forEach(([x, z]) => {
      const b = pick(cache, CATALOG.bushes);
      if (b) addProp(group, b, x, z, undefined, 1.2);
    });

    // Flowers — wide ring, skip any that land on beds
    for (let i = 0; i < 16; i++) {
      const f = pick(cache, CATALOG.flowers);
      if (!f) break;
      const a = (i / 16) * Math.PI * 2;
      const r = 9.5 + (i % 3) * 0.8;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 4;
      addProp(group, f, x, z, undefined, 0.5);
    }

    [[-12, 1], [13, 0.5], [-11, -14], [12, -14], [0, -15], [-14, -2]].forEach(([x, z]) => {
      const r = pick(cache, CATALOG.rocks);
      if (r) addProp(group, r, x, z, undefined, 1.1);
    });

    // Decor — gate at south entrance; tent / crops far from VIP beds
    if (cache["fence_gate.glb"]) addProp(group, cache["fence_gate.glb"], 0, 3.2, 0, 2.2);
    if (cache["tent_smallOpen.glb"]) addProp(group, cache["tent_smallOpen.glb"], 12.5, 2.5, -0.8, 2.2);
    if (cache["log_stack.glb"]) addProp(group, cache["log_stack.glb"], -11, -11, 0.6, 1.1);
    if (cache["crops_cornStageD.glb"]) addProp(group, cache["crops_cornStageD.glb"], -10.5, 2.8, undefined, 1.4);
    if (cache["crop_pumpkin.glb"]) addProp(group, cache["crop_pumpkin.glb"], 11.5, -13, undefined, 0.75);

    console.info("[HS_MODELS] dressed props:", group.children.length);
    return { group, update() {} };
  }

  async function enhance(THREE, scene, world) {
    try {
      const cache = await loadAll(THREE);
      if (!cache) return null;
      return dressWorld(world, cache);
    } catch (err) {
      console.warn("[HS_MODELS] enhance failed", err);
      return null;
    }
  }

  global.HS_MODELS = { enhance, CATALOG };
})(typeof window !== "undefined" ? window : globalThis);
