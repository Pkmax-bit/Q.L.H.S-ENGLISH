// Harvest Shot — PlantKit (detailed procedural crops)
(function (global) {
  function createPlantKit(THREE) {
    function std(color, opts = {}) {
      return new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.75,
        metalness: opts.metalness ?? 0.05,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        transparent: !!opts.transparent,
        opacity: opts.opacity ?? 1,
        flatShading: !!opts.flat,
      });
    }

    function cast(m) {
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    }

    /** Broad leaf — flattened cone + slight twist */
    function leafBlade(g, x, y, z, s, color, opts = {}) {
      const len = (opts.len ?? 0.28) * s;
      const blade = cast(new THREE.Mesh(
        new THREE.ConeGeometry(0.07 * s, len, 5),
        std(color, { roughness: 0.92, flat: true })
      ));
      blade.position.set(x, y, z);
      blade.rotation.z = (opts.rz ?? 0) + (Math.random() - 0.5) * 0.25;
      blade.rotation.x = opts.rx ?? 0.85;
      blade.rotation.y = opts.ry ?? Math.random() * 0.4;
      blade.scale.set(1.4, 1, 0.55);
      g.add(blade);
      // midrib
      const rib = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008 * s, 0.012 * s, len * 0.85, 4),
        std(0x1a5c30, { roughness: 0.95 })
      );
      rib.position.copy(blade.position);
      rib.rotation.copy(blade.rotation);
      rib.position.y += 0.01;
      g.add(rib);
      return blade;
    }

    /** Round bush leaf cluster */
    function leaf(g, x, y, z, s, color) {
      const m = cast(new THREE.Mesh(
        new THREE.SphereGeometry(0.11 * s, 8, 6),
        std(color, { roughness: 0.92 })
      ));
      m.position.set(x, y, z);
      m.scale.set(1.7, 0.32, 1.1);
      m.rotation.z = (Math.random() - 0.5) * 0.55;
      m.rotation.y = Math.random() * Math.PI;
      g.add(m);
      // tip highlight
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 * s, 5, 4),
        std(color, { roughness: 0.7, emissive: color, emissiveIntensity: 0.08 })
      );
      tip.position.set(x + 0.06 * s, y + 0.02, z);
      tip.scale.set(1.2, 0.4, 0.8);
      g.add(tip);
    }

    function soilMound(g, vip) {
      const mound = cast(new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 6),
        std(vip ? 0x4a2060 : 0x4a3220, { roughness: 0.98 })
      ));
      mound.position.y = 0.02;
      mound.scale.set(1.4, 0.35, 1.4);
      g.add(mound);
      for (let i = 0; i < 4; i++) {
        const pebble = new THREE.Mesh(
          new THREE.SphereGeometry(0.025 + Math.random() * 0.02, 5, 4),
          std(0x6b5b4a, { roughness: 1, flat: true })
        );
        const a = (i / 4) * Math.PI * 2 + Math.random() * 0.3;
        pebble.position.set(Math.cos(a) * 0.18, 0.04, Math.sin(a) * 0.18);
        g.add(pebble);
      }
    }

    function markFruit(mesh, g) {
      mesh.userData.isFruit = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      if (!g.userData.fruit) g.userData.fruit = mesh;
    }

    function fruitGlow(ripe, color) {
      return ripe
        ? { emissive: color, emissiveIntensity: 0.32 }
        : { emissive: 0x000000, emissiveIntensity: 0 };
    }

    function highlightDot(parent, color, y, scale) {
      const h = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 * (scale || 1), 6, 5),
        std(0xffffff, { roughness: 0.3, metalness: 0.15, emissive: color, emissiveIntensity: 0.2, transparent: true, opacity: 0.55 })
      );
      h.position.set(0.04, y, 0.05);
      parent.add(h);
    }

    function stageScale(stage) {
      if (stage === "sprout") return 0.38;
      if (stage === "grow") return 0.72;
      return 1;
    }

    function build(type, stage, ripeColor, vip) {
      const ripe = stage === "ripe";
      const g = new THREE.Group();
      const stemC = 0x2d6a3e;
      const growC = 0x3cb371;
      soilMound(g, !!vip);

      if (type === "fast") {
        // Pepper plant
        const stem = cast(new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.06, ripe ? 0.8 : 0.48, 8),
          std(stemC, { roughness: 0.88 })
        ));
        stem.position.y = ripe ? 0.42 : 0.28;
        g.add(stem);
        const joint = cast(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), std(0x1e5c32)));
        joint.position.y = ripe ? 0.55 : 0.38;
        g.add(joint);
        leafBlade(g, 0.16, 0.4, 0.02, 1.0, 0x27ae60, { rz: -0.6, rx: 0.9 });
        leafBlade(g, -0.14, 0.45, 0.04, 0.9, 0x1e8449, { rz: 0.55, rx: 0.85 });
        leafBlade(g, 0.05, 0.5, -0.12, 0.75, 0x2ecc71, { rz: 0.2, rx: 1.0 });
        const n = ripe ? 3 : stage === "grow" ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const pepper = cast(new THREE.Mesh(
            new THREE.CylinderGeometry(0.045, 0.085, 0.36, 10),
            std(ripe ? ripeColor : growC, { roughness: 0.55, ...fruitGlow(ripe, ripeColor) })
          ));
          pepper.position.set((i - (n - 1) / 2) * 0.17, 0.58 + i * 0.03, 0.05);
          pepper.rotation.z = (i - 1) * 0.28;
          // calyx
          const calyx = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.08, 5), std(0x1e8449, { flat: true }));
          calyx.position.y = 0.2;
          pepper.add(calyx);
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 5), std(ripe ? 0x8b0000 : growC));
          tip.position.y = -0.2;
          tip.rotation.x = Math.PI;
          pepper.add(tip);
          if (ripe) highlightDot(pepper, ripeColor, 0.05, 1.2);
          markFruit(pepper, g);
        }
      } else if (type === "slow") {
        // Pumpkin
        const vine = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.35, 7), std(stemC)));
        vine.position.y = 0.2;
        g.add(vine);
        leafBlade(g, 0.32, 0.28, 0, 1.4, 0x27ae60, { len: 0.35, rz: -0.9 });
        leafBlade(g, -0.28, 0.25, 0.1, 1.2, 0x1e8449, { len: 0.32, rz: 0.85 });
        leafBlade(g, 0.1, 0.22, -0.25, 1.0, 0x229954, { len: 0.28, rz: 0.1 });
        const fruit = cast(new THREE.Mesh(
          new THREE.SphereGeometry(ripe ? 0.4 : 0.22, 16, 14),
          std(ripe ? ripeColor : growC, { roughness: 0.62, ...fruitGlow(ripe, ripeColor) })
        ));
        fruit.position.y = ripe ? 0.38 : 0.28;
        fruit.scale.set(1.15, 0.78, 1.05);
        // ridges
        if (ripe) {
          for (let i = 0; i < 6; i++) {
            const ridge = new THREE.Mesh(
              new THREE.TorusGeometry(0.32, 0.018, 4, 16),
              std(0xd35400, { roughness: 0.7 })
            );
            ridge.rotation.y = (i / 6) * Math.PI;
            ridge.position.y = 0.02;
            ridge.scale.y = 0.7;
            fruit.add(ridge);
          }
          const stemTop = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.12, 6), std(0x5d4037));
          stemTop.position.y = 0.32;
          fruit.add(stemTop);
          highlightDot(fruit, ripeColor, 0.15, 1.5);
        }
        markFruit(fruit, g);
      } else if (type === "carrot") {
        const blades = ripe ? 6 : 4;
        for (let i = 0; i < blades; i++) {
          const blade = cast(new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.4, 4), std(0x27ae60, { flat: true })));
          const a = (i / blades) * Math.PI * 2;
          blade.position.set(Math.cos(a) * 0.05, 0.38, Math.sin(a) * 0.05);
          blade.rotation.z = Math.cos(a) * 0.35;
          blade.rotation.x = Math.sin(a) * 0.35;
          g.add(blade);
        }
        const root = cast(new THREE.Mesh(
          new THREE.ConeGeometry(ripe ? 0.13 : 0.08, ripe ? 0.52 : 0.3, 10),
          std(ripe ? ripeColor : 0xd5a06a, { roughness: 0.7, ...fruitGlow(ripe, ripeColor) })
        ));
        root.position.y = 0.02;
        if (ripe) {
          for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
              new THREE.TorusGeometry(0.08 - i * 0.015, 0.01, 4, 10),
              std(0xe67e22, { roughness: 0.8 })
            );
            ring.position.y = 0.12 + i * 0.1;
            ring.rotation.x = Math.PI / 2;
            root.add(ring);
          }
        }
        markFruit(root, g);
      } else if (type === "wheat") {
        const n = ripe ? 7 : 4;
        for (let i = 0; i < n; i++) {
          const stalk = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.8, 5), std(stemC)));
          stalk.position.set((i - (n - 1) / 2) * 0.065, 0.4, ((i % 3) - 1) * 0.04);
          stalk.rotation.z = (Math.random() - 0.5) * 0.12;
          g.add(stalk);
          // grain kernels stacked
          const headH = ripe ? 5 : 2;
          for (let k = 0; k < headH; k++) {
            const kernel = cast(new THREE.Mesh(
              new THREE.SphereGeometry(0.028, 5, 4),
              std(ripe ? ripeColor : growC, { ...fruitGlow(ripe, ripeColor) })
            ));
            kernel.position.set(stalk.position.x, 0.72 + k * 0.045, stalk.position.z);
            kernel.scale.set(1, 1.4, 0.9);
            markFruit(kernel, g);
          }
          if (ripe) {
            const awn = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 3), std(0xc9a227));
            awn.position.set(stalk.position.x, 0.95, stalk.position.z);
            g.add(awn);
          }
        }
      } else if (type === "berry") {
        const bush = cast(new THREE.Mesh(
          new THREE.SphereGeometry(ripe ? 0.32 : 0.2, 14, 12),
          std(0x1e8449, { roughness: 0.95 })
        ));
        bush.position.y = ripe ? 0.34 : 0.22;
        bush.scale.set(1.15, 0.9, 1.1);
        g.add(bush);
        leaf(g, 0.2, 0.45, 0.1, 0.9, 0x27ae60);
        leaf(g, -0.18, 0.4, -0.08, 0.85, 0x196f3d);
        const n = ripe ? 9 : 3;
        for (let i = 0; i < n; i++) {
          const b = cast(new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 8, 7),
            std(ripe ? ripeColor : growC, { roughness: 0.45, ...fruitGlow(ripe, ripeColor) })
          ));
          const a = (i / n) * Math.PI * 2;
          const r = 0.2 + (i % 3) * 0.04;
          b.position.set(Math.cos(a) * r, 0.38 + (i % 4) * 0.06, Math.sin(a) * r);
          if (ripe) highlightDot(b, ripeColor, 0.02, 0.8);
          markFruit(b, g);
        }
      } else if (type === "cabbage") {
        const layers = ripe ? 4 : 2;
        for (let i = 0; i < layers; i++) {
          const leaf = cast(new THREE.Mesh(
            new THREE.SphereGeometry(0.26 + i * 0.055, 16, 12),
            std(ripe ? ripeColor : 0x27ae60, {
              roughness: 0.88,
              ...fruitGlow(ripe && i === layers - 1, ripeColor),
            })
          ));
          leaf.position.y = 0.28;
          leaf.scale.set(1.2 + i * 0.05, 0.55 + i * 0.05, 1.15);
          leaf.rotation.y = i * 0.4;
          markFruit(leaf, g);
        }
        if (ripe) {
          for (let i = 0; i < 5; i++) {
            leafBlade(g, Math.cos(i) * 0.28, 0.2, Math.sin(i) * 0.28, 0.7, 0x1e8449, { rx: 1.2, rz: i });
          }
        }
      } else if (type === "melon") {
        leafBlade(g, 0.35, 0.18, 0, 1.5, 0x27ae60, { len: 0.4, rz: -1 });
        leafBlade(g, -0.3, 0.16, 0.15, 1.3, 0x1e8449, { len: 0.36, rz: 0.9 });
        const vineCurl = cast(new THREE.Mesh(
          new THREE.TorusGeometry(0.08, 0.015, 4, 10, Math.PI * 1.5),
          std(stemC)
        ));
        vineCurl.position.set(0.2, 0.25, 0.1);
        vineCurl.rotation.x = 0.5;
        g.add(vineCurl);
        const fruit = cast(new THREE.Mesh(
          new THREE.SphereGeometry(ripe ? 0.42 : 0.2, 16, 14),
          std(ripe ? 0x1e8449 : growC, { roughness: 0.55, ...fruitGlow(ripe, 0x27ae60) })
        ));
        fruit.position.y = ripe ? 0.36 : 0.22;
        fruit.scale.set(1.25, 0.88, 1.05);
        if (ripe) {
          for (let i = 0; i < 8; i++) {
            const stripe = new THREE.Mesh(
              new THREE.TorusGeometry(0.38, 0.02, 4, 16),
              std(0x145a32, { roughness: 0.7 })
            );
            stripe.rotation.y = (i / 8) * Math.PI;
            stripe.scale.y = 0.75;
            fruit.add(stripe);
          }
        }
        markFruit(fruit, g);
      } else if (type === "corn") {
        const stalk = cast(new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.075, ripe ? 1.4 : 0.75, 8),
          std(stemC)
        ));
        stalk.position.y = ripe ? 0.72 : 0.42;
        g.add(stalk);
        for (let i = 0; i < (ripe ? 4 : 2); i++) {
          leafBlade(g, (i % 2 ? 1 : -1) * 0.18, 0.45 + i * 0.22, 0, 1.1, 0x27ae60, {
            len: 0.42, rz: (i % 2 ? 1 : -1) * 0.7, rx: 0.5,
          });
        }
        const cob = cast(new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.11, 0.5, 12),
          std(ripe ? ripeColor : growC, { ...fruitGlow(ripe, ripeColor) })
        ));
        cob.position.set(0.16, ripe ? 0.98 : 0.58, 0);
        cob.rotation.z = 0.32;
        if (ripe) {
          for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 6; col++) {
              const kernel = new THREE.Mesh(
                new THREE.SphereGeometry(0.022, 4, 4),
                std(0xf4d03f, { roughness: 0.6 })
              );
              const a = (col / 6) * Math.PI * 2;
              kernel.position.set(Math.cos(a) * 0.1, -0.18 + row * 0.1, Math.sin(a) * 0.1);
              cob.add(kernel);
            }
          }
          const husk = cast(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 6), std(0x27ae60, { flat: true })));
          husk.position.set(0.16, 1.28, 0);
          g.add(husk);
          const silk = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.2, 4), std(0xf5cba7));
          silk.position.set(0.16, 1.42, 0);
          g.add(silk);
        }
        markFruit(cob, g);
      } else if (type === "tomato") {
        const stake = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.9, 5), std(0x6b4f2a)));
        stake.position.set(-0.15, 0.45, 0);
        g.add(stake);
        const bush = cast(new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), std(0x1e8449, { roughness: 0.95 })));
        bush.position.y = 0.38;
        bush.scale.set(1.1, 0.95, 1.05);
        g.add(bush);
        leafBlade(g, 0.22, 0.45, 0.1, 0.9, 0x27ae60, { rz: -0.5 });
        leafBlade(g, -0.2, 0.5, -0.08, 0.85, 0x196f3d, { rz: 0.6 });
        const n = ripe ? 6 : 2;
        for (let i = 0; i < n; i++) {
          const t = cast(new THREE.Mesh(
            new THREE.SphereGeometry(0.09, 10, 10),
            std(ripe ? ripeColor : growC, { roughness: 0.5, ...fruitGlow(ripe, ripeColor) })
          ));
          const a = (i / n) * Math.PI * 2;
          t.position.set(Math.cos(a) * 0.22, 0.4 + (i % 3) * 0.08, Math.sin(a) * 0.22);
          if (ripe) {
            const star = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.04, 5), std(0x1e8449));
            star.position.y = 0.08;
            t.add(star);
            highlightDot(t, ripeColor, 0.03, 1);
          }
          markFruit(t, g);
        }
      } else if (type === "sunflower") {
        const stalk = cast(new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.055, ripe ? 1.2 : 0.65, 8),
          std(stemC)
        ));
        stalk.position.y = ripe ? 0.6 : 0.35;
        g.add(stalk);
        leafBlade(g, 0.18, 0.5, 0, 1.0, 0x27ae60, { rz: -0.7, len: 0.32 });
        leafBlade(g, -0.16, 0.7, 0.05, 0.9, 0x1e8449, { rz: 0.65, len: 0.28 });
        const headY = ripe ? 1.2 : 0.72;
        const center = cast(new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.18, 0.12, 20),
          std(ripe ? 0x5d4037 : growC, { ...fruitGlow(ripe, ripeColor) })
        ));
        center.rotation.x = Math.PI / 2;
        center.position.y = headY;
        markFruit(center, g);
        if (ripe) {
          // seed dots
          for (let i = 0; i < 16; i++) {
            const seed = new THREE.Mesh(
              new THREE.SphereGeometry(0.015, 4, 4),
              std(0x3e2723)
            );
            const a = (i / 16) * Math.PI * 2;
            seed.position.set(Math.cos(a) * 0.08, 0.07, Math.sin(a) * 0.08);
            center.add(seed);
          }
          for (let i = 0; i < 18; i++) {
            const petal = cast(new THREE.Mesh(
              new THREE.SphereGeometry(0.085, 6, 4),
              std(0xf1c40f, { roughness: 0.65, emissive: 0xf39c12, emissiveIntensity: 0.15 })
            ));
            const a = (i / 18) * Math.PI * 2;
            petal.position.set(Math.cos(a) * 0.32, headY, Math.sin(a) * 0.32);
            petal.scale.set(1.5, 0.28, 0.7);
            petal.lookAt(0, headY, 0);
            g.add(petal);
          }
        }
      } else if (type === "grape") {
        const stem = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.6, 7), std(stemC)));
        stem.position.y = 0.35;
        g.add(stem);
        leafBlade(g, 0.2, 0.55, 0, 1.1, 0x27ae60, { rz: -0.5, len: 0.3 });
        leafBlade(g, -0.15, 0.5, 0.1, 1.0, 0x1e8449, { rz: 0.55 });
        const n = ripe ? 14 : 5;
        for (let i = 0; i < n; i++) {
          const berry = cast(new THREE.Mesh(
            new THREE.SphereGeometry(0.065, 8, 7),
            std(ripe ? ripeColor : 0x7d3c98, { roughness: 0.4, metalness: 0.08, ...fruitGlow(ripe, ripeColor) })
          ));
          const row = Math.floor(i / 3);
          const col = i % 3;
          berry.position.set((col - 1) * 0.1, 0.45 + row * 0.09, (row % 2) * 0.07);
          if (ripe) highlightDot(berry, ripeColor, 0.02, 0.7);
          markFruit(berry, g);
        }
      } else if (type === "moon") {
        const stem = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.8, 8), std(0x5d6d7e)));
        stem.position.y = 0.45;
        g.add(stem);
        for (let i = 0; i < 5; i++) {
          leafBlade(g, Math.cos(i) * 0.15, 0.4 + i * 0.05, Math.sin(i) * 0.15, 0.8, 0x85929e, { rz: i, len: 0.22 });
        }
        const bloom = cast(new THREE.Mesh(
          new THREE.SphereGeometry(ripe ? 0.3 : 0.15, 16, 14),
          std(ripe ? ripeColor : 0x5dade2, {
            emissive: ripe ? ripeColor : 0x2e86c1,
            emissiveIntensity: ripe ? 0.75 : 0.3,
            transparent: true, opacity: 0.9, roughness: 0.3, metalness: 0.25,
          })
        ));
        bloom.position.y = ripe ? 0.92 : 0.62;
        if (ripe) {
          for (let i = 0; i < 8; i++) {
            const petal = new THREE.Mesh(
              new THREE.SphereGeometry(0.1, 8, 6),
              std(0xaed6f1, { transparent: true, opacity: 0.7, emissive: 0x85c1e9, emissiveIntensity: 0.4 })
            );
            const a = (i / 8) * Math.PI * 2;
            petal.position.set(Math.cos(a) * 0.28, 0.92, Math.sin(a) * 0.28);
            petal.scale.set(1.2, 0.35, 0.7);
            g.add(petal);
          }
          const core = new THREE.PointLight(ripeColor, 0.8, 3);
          core.position.y = 0.95;
          g.add(core);
        }
        markFruit(bloom, g);
      } else if (type === "crystal") {
        const stem = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.7, 6), std(0x5b2c6f)));
        stem.position.y = 0.4;
        g.add(stem);
        const crystal = cast(new THREE.Mesh(
          new THREE.OctahedronGeometry(ripe ? 0.28 : 0.14, 0),
          std(ripe ? ripeColor : 0x7d3c98, {
            emissive: ripe ? ripeColor : 0x4a235a,
            emissiveIntensity: ripe ? 0.85 : 0.25,
            transparent: true, opacity: 0.92, metalness: 0.4, roughness: 0.2,
          })
        ));
        crystal.position.y = ripe ? 0.82 : 0.55;
        crystal.rotation.y = Math.PI / 5;
        markFruit(crystal, g);
        if (ripe) {
          for (let i = 0; i < 3; i++) {
            const shard = cast(new THREE.Mesh(
              new THREE.OctahedronGeometry(0.08, 0),
              std(0xbb8fce, { emissive: ripeColor, emissiveIntensity: 0.5, transparent: true, opacity: 0.85, metalness: 0.35, roughness: 0.25 })
            ));
            const a = (i / 3) * Math.PI * 2;
            shard.position.set(Math.cos(a) * 0.2, 0.7, Math.sin(a) * 0.2);
            shard.rotation.set(0.4, a, 0.2);
            g.add(shard);
          }
          const glow = new THREE.PointLight(ripeColor, 1.1, 3.5);
          glow.position.y = 0.85;
          g.add(glow);
        }
      } else {
        const fruit = cast(new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), std(ripe ? ripeColor : growC)));
        fruit.position.y = 0.4;
        markFruit(fruit, g);
      }

      g.scale.setScalar(stageScale(stage));
      g.userData.stage = stage;
      return g;
    }

    function makePlantMesh(type, ripe, growthT) {
      let stage = "sprout";
      if (ripe || growthT >= 1) stage = "ripe";
      else if (growthT >= 0.45) stage = "grow";
      const crop = global.HS_CONTENT?.CROPS?.[type];
      const color = crop?.color ?? 0x3cb371;
      return build(type, stage, color, !!crop?.vip);
    }

    function harvestBurst(scene, pos, color) {
      const bits = [];
      for (let i = 0; i < 14; i++) {
        const geo = i % 3 === 0
          ? new THREE.OctahedronGeometry(0.05, 0)
          : new THREE.SphereGeometry(0.05, 5, 5);
        const m = new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 })
        );
        m.position.copy(pos);
        m.position.y += 0.55;
        m.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 3.5, 2.2 + Math.random() * 2.5, (Math.random() - 0.5) * 3.5);
        m.userData.spin = (Math.random() - 0.5) * 0.3;
        scene.add(m);
        bits.push(m);
      }
      const light = new THREE.PointLight(color, 2.4, 5);
      light.position.copy(pos);
      light.position.y += 0.8;
      scene.add(light);
      const t0 = performance.now();
      (function anim() {
        const t = (performance.now() - t0) / 550;
        if (t >= 1) {
          for (const b of bits) {
            scene.remove(b);
            b.geometry.dispose();
            b.material.dispose();
          }
          scene.remove(light);
          return;
        }
        for (const b of bits) {
          b.position.addScaledVector(b.userData.vel, 0.016);
          b.userData.vel.y -= 0.13;
          b.rotation.x += b.userData.spin;
          b.rotation.z += b.userData.spin;
          b.material.opacity = 1 - t;
        }
        light.intensity = 2.4 * (1 - t);
        requestAnimationFrame(anim);
      })();
    }

    return { makePlantMesh, harvestBurst, build };
  }

  global.HS_PLANTS = { createPlantKit };
})(typeof window !== "undefined" ? window : globalThis);
