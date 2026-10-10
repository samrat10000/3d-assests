import * as THREE from 'three';

/**
 * Hand-built early-60s American finned hardtop (lime pearl lowrider), matched to the Dream Currency reference.
 * +Z is the nose, Y=0 is the road, wheel centres sit at Y=WHEEL_RADIUS.
 * Wheels are independent pivots (suspension group -> spinning wheel group); spin around local X.
 */
export const WHEEL_RADIUS = 0.4;
export const WHEEL_Z = { front: 1.7, rear: -1.62 } as const;
export const CAR_LENGTH = 5.7;

export function createClassicCar(): {
  root: THREE.Group; chassis: THREE.Group; wheels: THREE.Object3D[]; suspensions: THREE.Group[];
  update: (spin: number, bounce: number, steer?: number) => void;
} {
  const root = new THREE.Group(); root.name = 'Lime pearl sixty-one hardtop';
  const chassis = new THREE.Group(); chassis.name = 'Suspended coachwork'; root.add(chassis);

  // ---------- materials ----------
  // Pearl paint: vertex colours carry the lime-to-cream two-tone; iridescence gives the pearl shift seen in the reference.
  const paint = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, metalness: .5, roughness: .26, clearcoat: 1, clearcoatRoughness: .06, iridescence: .55, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520], envMapIntensity: 1.5, side: THREE.DoubleSide });
  const chrome = new THREE.MeshStandardMaterial({ color: '#d9d0d6', metalness: 1, roughness: .12 });
  const satin = new THREE.MeshStandardMaterial({ color: '#c9c4c8', metalness: 1, roughness: .28 });
  const dark = new THREE.MeshStandardMaterial({ color: '#141114', roughness: .7, metalness: .2 });
  const under = new THREE.MeshStandardMaterial({ color: '#1d1a1c', roughness: .85, side: THREE.DoubleSide });
  const rubber = new THREE.MeshStandardMaterial({ color: '#141214', roughness: .82 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#6a4590', metalness: .45, roughness: .04, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 });
  const lens = new THREE.MeshPhysicalMaterial({ color: '#fff6e0', emissive: '#ffe2b0', emissiveIntensity: .08, roughness: .05, metalness: .1, clearcoat: 1 });
  const tail = new THREE.MeshPhysicalMaterial({ color: '#c0101c', emissive: '#ff1d2a', emissiveIntensity: 1.1, roughness: .15, clearcoat: 1 });
  const leather = new THREE.MeshStandardMaterial({ color: '#efe6da', roughness: .6 });
  const skin = new THREE.MeshStandardMaterial({ color: '#efe9e4', roughness: .45 });
  const jacket = new THREE.MeshStandardMaterial({ color: '#2a1f2b', roughness: .75 });

  const add = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D = chassis) => { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
  const lime = new THREE.Color('#86d40f'), cream = new THREE.Color('#e4f2a8'), tmp = new THREE.Color();
  const paintColour = (y: number) => tmp.copy(lime).lerp(cream, THREE.MathUtils.smoothstep(y, .8, 1.3)).clone();
  /** Parametric grid surface. Vertex colours are taken from height when `tinted`. */
  const surface = (fn: (u: number, v: number) => [number, number, number], nu: number, nv: number, m: THREE.Material, tinted = false, p: THREE.Object3D = chassis) => {
    const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const q = fn(i / nu, j / nv); pos.push(...q); uv.push(i / nu, j / nv); if (tinted) { const c = paintColour(q[1]); col.push(c.r, c.g, c.b); } }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + nu + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    if (tinted) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals(); return add(g, m, p);
  };
  const tube = (pts: [number, number, number][], r: number, m: THREE.Material = chrome, p: THREE.Object3D = chassis, closed = false) =>
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(...q)), closed), Math.max(16, pts.length * 8), r, 8, closed), m, p);
  const rbox = (w: number, h: number, d: number, r: number, m: THREE.Material, p: THREE.Object3D = chassis) => {
    const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.001, d - 2 * r), bevelEnabled: true, bevelSize: r * .7, bevelThickness: r, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -d / 2 + r); return add(g, m, p);
  };
  const tint = (m: THREE.Mesh, y: number) => { const g = m.geometry; const n = g.getAttribute('position').count; const c = paintColour(y); const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return m; };

  // ---------- body shell ----------
  const ZF = 2.78, ZR = -2.82;
  const ss = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
  const halfWidth = (z: number) => 1.0 - .05 * ss(2.2, ZF, z) - .03 * ss(-2.3, ZR, z);
  const deckY = (z: number) => 1.0 + .02 * ss(1.4, .9, z) * ss(-1.9, -1.2, z) - .06 * ss(2.25, ZF, z) - .02 * ss(-2.3, ZR, z);
  const YC = .67, N_UP = 6, N_LO = 3.2, H_LO = .31;
  const shoulderT = .82; // fraction of upper half where side surface hands over to deck surface
  const xAtY = (y: number, z: number) => { const hw = halfWidth(z), up = y >= YC; const h = up ? deckY(z) - YC : H_LO; const n = up ? N_UP : N_LO; const t = Math.min(1, Math.abs(y - YC) / h); return hw * Math.pow(1 - Math.pow(t, n), 1 / n); };
  const ARCH_R = .47;
  const sillY = (z: number) => { let y = YC - H_LO * .92; for (const c of [WHEEL_Z.front, WHEEL_Z.rear]) { const d = z - c; if (Math.abs(d) < ARCH_R) y = Math.max(y, WHEEL_RADIUS + Math.sqrt(ARCH_R * ARCH_R - d * d) * 1.0); } return y; };
  const NZ = 220;
  const zAt = (u: number) => ZR + (ZF - ZR) * u;
  // Sides: parametrised by height so the lower edge can follow the true wheel-arch cut-outs.
  for (const s of [-1, 1]) surface((u, v) => { const z = zAt(u); const y0 = sillY(z), y1 = YC + shoulderT * (deckY(z) - YC); const y = y0 + (y1 - y0) * v; return [s * xAtY(y, z), y, z]; }, NZ, 14, paint, true);
  // Deck: crown across hood, roof base and trunk, parametrised by x.
  surface((u, v) => { const z = zAt(v); const xs = xAtY(YC + shoulderT * (deckY(z) - YC), z); const x = (u * 2 - 1) * xs; const h = deckY(z) - YC; const y = YC + h * Math.pow(1 - Math.pow(Math.abs(x) / halfWidth(z), N_UP), 1 / N_UP); return [x, y, z]; }, 30, NZ, paint, true);
  // End caps: close the shell using the exact section outline.
  for (const z of [ZF, ZR]) {
    const shape = new THREE.Shape(); const pts: THREE.Vector2[] = []; const y0 = sillY(z), y1 = YC + shoulderT * (deckY(z) - YC);
    for (let i = 0; i <= 12; i++) { const y = y0 + (y1 - y0) * i / 12; pts.push(new THREE.Vector2(xAtY(y, z), y)); }
    for (let i = 1; i < 24; i++) { const x = xAtY(y1, z) * (1 - 2 * i / 24); const y = YC + (deckY(z) - YC) * Math.pow(1 - Math.pow(Math.abs(x) / halfWidth(z), N_UP), 1 / N_UP); pts.push(new THREE.Vector2(x, y)); }
    for (let i = 12; i >= 0; i--) { const y = y0 + (y1 - y0) * i / 12; pts.push(new THREE.Vector2(-xAtY(y, z), y)); }
    shape.setFromPoints(pts); const cap = add(new THREE.ShapeGeometry(shape), paint); cap.position.z = z; tint(cap, .7);
  }
  // Arch liners (black) so the tyres sit in visible wells.
  for (const s of [-1, 1]) for (const wz of [WHEEL_Z.front, WHEEL_Z.rear]) {
    surface((u, v) => { const a = u * Math.PI; return [s * (1 - v * .42), WHEEL_RADIUS + Math.sin(a) * (ARCH_R - .01), wz + Math.cos(a) * (ARCH_R - .01)]; }, 28, 2, under);
    const bead: [number, number, number][] = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI; const z = wz + Math.cos(a) * ARCH_R, y = WHEEL_RADIUS + Math.sin(a) * ARCH_R; bead.push([s * (xAtY(y, z) + .004), y, z]); } tube(bead, .012, chrome);
  }
  // Floor pan + visible chassis rails, hydraulic rams and driveshaft for the low camera.
  const floor = rbox(1.72, .05, 4.9, .02, under); floor.position.set(0, .37, -.05);
  for (const s of [-1, 1]) { const rail = rbox(.12, .12, 4.6, .02, dark); rail.position.set(s * .5, .4, 0); }
  tube([[0, .34, 1.2], [0, .34, -1.62]], .045, satin);
  const diff = add(new THREE.SphereGeometry(.16, 16, 12), dark); diff.scale.set(1.2, .9, 1); diff.position.set(0, .4, WHEEL_Z.rear);
  tube([[-.86, .4, WHEEL_Z.rear], [.86, .4, WHEEL_Z.rear]], .05, dark);

  // ---------- rear fins, tail lamps, skegs ----------
  for (const s of [-1, 1]) {
    const finShape = new THREE.Shape(); finShape.moveTo(-.85, 0); finShape.bezierCurveTo(-1.6, .02, -2.3, .08, -2.86, .17); finShape.lineTo(-2.86, -.05); finShape.lineTo(-.85, -.05);
    const fin = add(new THREE.ExtrudeGeometry(finShape, { depth: .05, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 2 }), paint);
    fin.rotation.y = -Math.PI / 2; fin.position.set(s * (xAtY(deckY(-2) - .03, -2) - .07) + .025, deckY(-2) - .02, 0); tint(fin, 1.05);
    const lampBlade = rbox(.06, .2, .1, .02, tail); lampBlade.position.set(s * .9, deckY(-2.8) + .02, ZR - .03);
    const lampBezel = rbox(.08, .24, .07, .02, chrome); lampBezel.position.set(s * .9, deckY(-2.8) + .02, ZR - .005);
    // Lower skeg fin with chrome bead and the bullet lamp.
    tube([[s * 1.0, .5, -.9], [s * 1.005, .5, -2.0], [s * .99, .49, -2.84]], .016);
    const bullet = add(new THREE.SphereGeometry(.06, 16, 12), tail); bullet.scale.z = 1.6; bullet.position.set(s * .7, .52, ZR - .06);
  }
  const rearBumper = rbox(2.02, .14, .2, .05, chrome); rearBumper.position.set(0, .45, ZR - .06);
  for (const s of [-1, 1]) { const wrap = rbox(.18, .14, .5, .05, chrome); wrap.position.set(s * .94, .45, ZR + .16); }
  const plateR = rbox(.34, .16, .02, .01, leather); plateR.position.set(0, .62, ZR - .01);
  tube([[-.92, .86, ZR - .005], [0, .88, ZR - .01], [.92, .86, ZR - .005]], .015);
  for (const s of [-1, 1]) { const pipe = add(new THREE.CylinderGeometry(.045, .045, .25, 16), chrome); pipe.rotation.x = Math.PI / 2; pipe.position.set(s * .55, .34, ZR - .02); }

  // ---------- side brightwork ----------
  for (const s of [-1, 1]) {
    const spear: [number, number, number][] = []; for (let i = 0; i <= 20; i++) { const z = 2.6 - i * (5.2 / 20); const y = .74 - .04 * (i / 20); spear.push([s * (xAtY(y, z) + .006), y, z]); } tube(spear, .013);
    const rocker: [number, number, number][] = []; for (let i = 0; i <= 10; i++) { const z = WHEEL_Z.front - ARCH_R - .05 - i * ((WHEEL_Z.front - WHEEL_Z.rear - 2 * ARCH_R - .1) / 10); rocker.push([s * (xAtY(.42, z) + .006), .42, z]); } tube(rocker, .018);
    // Door seams and handle.
    tube([[s * (xAtY(.95, 1.05) + .002), .95, 1.05], [s * (xAtY(.6, 1.08) + .002), .6, 1.08], [s * (xAtY(.45, 1.02) + .002), .45, 1.02]], .004, dark);
    tube([[s * (xAtY(.95, -.55) + .002), .95, -.55], [s * (xAtY(.6, -.55) + .002), .6, -.55], [s * (xAtY(.45, -.5) + .002), .45, -.5]], .004, dark);
    const handle = rbox(.03, .03, .16, .01, chrome); handle.position.set(s * (xAtY(.88, -.35) + .01), .88, -.35);
    // Mirror on the driver side only.
    if (s < 0) { tube([[s * .86, 1.0, 1.0], [s * .98, 1.08, .98]], .015); const m = add(new THREE.SphereGeometry(1, 16, 10), chrome); m.scale.set(.07, .05, .1); m.position.set(s * 1.0, 1.1, .97); }
  }

  // ---------- front end: hooded quad lamps, full-width egg-crate grille, heavy bumper ----------
  // Recessed dark egg-crate between and below the lamp pods: thin chrome surround, dark cavity, chrome grid.
  const GY = .63, GH = .26;
  const grilleBack = rbox(1.84, GH, .04, .01, dark); grilleBack.position.set(0, GY, ZF - .01);
  for (const y of [GY - GH / 2 - .01, GY + GH / 2 + .01]) { const bar = rbox(1.92, .03, .07, .012, chrome); bar.position.set(0, y, ZF + .04); }
  for (const s of [-1, 1]) { const bar = rbox(.03, GH + .04, .07, .012, chrome); bar.position.set(s * .945, GY, ZF + .04); }
  for (let i = 1; i < 16; i++) { const bar = rbox(.014, GH - .01, .06, .004, chrome); bar.position.set(-.93 + i * 1.86 / 16, GY, ZF + .035); }
  for (const y of [GY - .065, GY, GY + .065]) { const bar = rbox(1.86, .012, .06, .004, chrome); bar.position.set(0, y, ZF + .035); }
  // Quad lamps set into the fender fronts, hooded by body-coloured fender peaks that run back into the hood.
  for (const s of [-1, 1]) {
    const pod = rbox(.5, .17, .08, .03, dark); pod.position.set(s * .7, .85, ZF - .02);
    for (const x of [.58, .82]) {
      const ring = add(new THREE.TorusGeometry(.078, .016, 10, 32), chrome); ring.position.set(s * x, .85, ZF + .045);
      const lamp = add(new THREE.SphereGeometry(.07, 24, 14), lens); lamp.scale.z = .35; lamp.position.set(s * x, .85, ZF + .04);
    }
    const brow = rbox(.56, .09, .5, .035, paint); brow.position.set(s * .7, .965, ZF - .14); brow.rotation.x = .06; tint(brow, .9);
    const browTrim = rbox(.5, .014, .02, .006, chrome); browTrim.position.set(s * .7, .925, ZF + .11);
  }
  const bumper = rbox(2.06, .16, .22, .06, chrome); bumper.position.set(0, .46, ZF + .09);
  for (const s of [-1, 1]) {
    const wrap = rbox(.2, .16, .55, .06, chrome); wrap.position.set(s * .95, .46, ZF - .12);
    const bullet = add(new THREE.ConeGeometry(.065, .2, 20), chrome); bullet.rotation.x = Math.PI / 2; bullet.position.set(s * .45, .52, ZF + .25);
    const base = add(new THREE.CylinderGeometry(.075, .075, .06, 20), chrome); base.rotation.x = Math.PI / 2; base.position.set(s * .45, .52, ZF + .14);
    const park = rbox(.22, .05, .03, .015, lens); park.position.set(s * .7, .41, ZF + .2);
  }
  const valance = rbox(1.6, .08, .1, .03, dark); valance.position.set(0, .37, ZF + .02);
  const plateF = rbox(.34, .14, .02, .01, leather); plateF.position.set(0, .47, ZF + .21);
  // Hood: centre crease, fender peaks and crest ornament.
  tube([[0, deckY(1.25) + .006, 1.25], [0, deckY(2.0) + .008, 2.0], [0, deckY(2.65) + .004, 2.65]], .008);
  for (const s of [-1, 1]) tube([[s * .78, deckY(1.3) - .02, 1.3], [s * .8, deckY(2.2) - .01, 2.2], [s * .78, deckY(2.65) - .02, 2.7]], .01, paint);
  const crest = add(new THREE.OctahedronGeometry(.05), chrome); crest.scale.set(1.6, .6, .5); crest.position.set(0, deckY(2.6) + .02, 2.62);

  // ---------- greenhouse: wrap-around glass, thin pillars, roof ----------
  const BASE_Y = .985, ROOF_Y = 1.44, BASE_HW = .86, ROOF_HW = .74, ROOF_F = .38, ROOF_R = -.92, WS_BASE = 1.18, RW_BASE = -1.62;
  const wsZ = (u: number, v: number) => ROOF_F + (WS_BASE - .22 * Math.pow(Math.abs(u * 2 - 1), 4) - ROOF_F) * v;
  const rwZ = (u: number, v: number) => ROOF_R + (RW_BASE + .18 * Math.pow(Math.abs(u * 2 - 1), 4) - ROOF_R) * v;
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  surface((u, v) => { const x = (u * 2 - 1) * lerp(ROOF_HW, BASE_HW, v); return [x, lerp(ROOF_Y, BASE_Y, v) + .02 * Math.sin(u * Math.PI) * (1 - v), wsZ(u, v)]; }, 24, 10, glass);
  surface((u, v) => { const x = (u * 2 - 1) * lerp(ROOF_HW, BASE_HW, v); return [x, lerp(ROOF_Y, BASE_Y, v) + .02 * Math.sin(u * Math.PI) * (1 - v), rwZ(u, v)]; }, 24, 10, glass);
  surface((u, v) => { const x = (u * 2 - 1) * (ROOF_HW + .02 * Math.sin(v * Math.PI)); return [x, ROOF_Y + .05 * Math.sin(u * Math.PI), lerp(ROOF_R, ROOF_F, v)]; }, 20, 20, paint, true);
  for (const s of [-1, 1]) {
    // Side glass spans from the windshield edge to the C-pillar.
    surface((u, v) => { const t = 1 - v; const zf = wsZ(s > 0 ? 1 : 0, t) - .03, zr = rwZ(s > 0 ? 1 : 0, t) + .3 * (1 - t * .3); return [s * lerp(ROOF_HW, BASE_HW, t), lerp(ROOF_Y, BASE_Y, t), lerp(zr, zf, u)]; }, 16, 8, glass);
    // Thick C-pillar in body colour, thin chrome A-pillar and window reveals.
    surface((u, v) => { const t = 1 - v; const zr = rwZ(s > 0 ? 1 : 0, t); const zc = zr + .3 * (1 - t * .3); return [s * (lerp(ROOF_HW, BASE_HW, t) + .004), lerp(ROOF_Y, BASE_Y, t), lerp(zr, zc, u)]; }, 6, 8, paint, true);
    const a: [number, number, number][] = []; for (let i = 0; i <= 8; i++) { const t = i / 8; a.push([s * lerp(ROOF_HW, BASE_HW, t), lerp(ROOF_Y, BASE_Y, t), wsZ(s > 0 ? 1 : 0, t)]); } tube(a, .022);
    tube([[s * (BASE_HW + .01), BASE_Y + .005, RW_BASE + .3], [s * (BASE_HW + .015), BASE_Y + .01, 0], [s * (BASE_HW + .005), BASE_Y + .005, WS_BASE - .2]], .012);
    tube([[s * (ROOF_HW + .01), ROOF_Y - .005, ROOF_R + .05], [s * (ROOF_HW + .015), ROOF_Y, ROOF_F - .02]], .012);
    tube([[s * lerp(ROOF_HW, BASE_HW, .02), ROOF_Y - .01, -.22], [s * (BASE_HW - .01), BASE_Y + .01, -.25]], .01);
  }

  // ---------- interior + driver (pale face visible through the tinted glass) ----------
  for (const z of [-.55, .25]) { const seat = rbox(1.5, .14, .5, .05, leather); seat.position.set(0, .66, z); const back = rbox(1.5, .44, .14, .05, leather); back.position.set(0, .9, z - .25); back.rotation.x = -.14; }
  const dash = rbox(1.66, .16, .32, .05, paint); dash.position.set(0, .98, .98); tint(dash, .95);
  const wheel = add(new THREE.TorusGeometry(.17, .014, 10, 40), chrome); wheel.position.set(-.42, 1.1, .7); wheel.rotation.x = -.55;
  const torso = rbox(.42, .5, .26, .1, jacket); torso.position.set(-.42, .98, .1); torso.rotation.x = -.12;
  const head = add(new THREE.SphereGeometry(.12, 20, 14), skin); head.scale.set(.9, 1.1, 1); head.position.set(-.42, 1.33, .14);
  const hair = add(new THREE.SphereGeometry(.125, 20, 12, 0, Math.PI * 2, 0, Math.PI * .5), jacket); hair.position.set(-.42, 1.35, .12);
  for (const s of [-1, 1]) tube([[-.42 + s * .18, 1.12, .12], [-.42 + s * .2, 1.06, .45], [-.42 + s * .15, 1.1, .66]], .045, jacket);

  // ---------- wheels: low-profile tyres, polished six-spoke star rims ----------
  const wheels: THREE.Object3D[] = []; const suspensions: THREE.Group[] = [];
  const tyreProfile: THREE.Vector2[] = []; const W = .13, RO = WHEEL_RADIUS, RI = .3;
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI; tyreProfile.push(new THREE.Vector2(RO - .05 + Math.cos(a) * .05, Math.sin(a) * W)); }
  tyreProfile.unshift(new THREE.Vector2(RI, -W * .95)); tyreProfile.push(new THREE.Vector2(RI, W * .95));
  const tyreGeo = new THREE.LatheGeometry(tyreProfile, 72); tyreGeo.rotateZ(Math.PI / 2);
  const spokeShape = new THREE.Shape(); spokeShape.moveTo(.06, -.07); spokeShape.lineTo(RI - .02, -.045); spokeShape.lineTo(RI - .02, .045); spokeShape.lineTo(.06, .07); spokeShape.closePath();
  const spokeGeo = new THREE.ExtrudeGeometry(spokeShape, { depth: .03, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 3 }); spokeGeo.translate(0, 0, -.015); spokeGeo.rotateY(-Math.PI / 2);
  for (const z of [WHEEL_Z.front, WHEEL_Z.rear]) for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.name = `${z > 0 ? 'front' : 'rear'}-${side > 0 ? 'right' : 'left'}-suspension`; pivot.position.set(side * .86, WHEEL_RADIUS, z); root.add(pivot); suspensions.push(pivot);
    const w = new THREE.Group(); w.name = `${z > 0 ? 'Front' : 'Rear'} ${side > 0 ? 'right' : 'left'} wheel`; pivot.add(w); wheels.push(w);
    add(tyreGeo, rubber, w);
    const barrel = add(new THREE.CylinderGeometry(RI, RI, W * 1.9, 48, 1, true), satin, w); barrel.rotation.z = Math.PI / 2;
    const lip = add(new THREE.TorusGeometry(RI - .005, .018, 10, 64), chrome, w); lip.rotation.y = Math.PI / 2; lip.position.x = side * W * .95;
    const disc = add(new THREE.CircleGeometry(RI - .01, 48), dark, w); disc.rotation.y = side * Math.PI / 2; disc.position.x = side * (W * .5);
    for (let i = 0; i < 6; i++) { const holder = new THREE.Group(); holder.rotation.x = i * Math.PI / 3; w.add(holder); const sp = add(spokeGeo, chrome, holder); sp.position.x = side * W * .55; }
    const cap = add(new THREE.SphereGeometry(.075, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), chrome, w); cap.rotation.z = -side * Math.PI / 2; cap.position.x = side * W * .78;
    for (let i = 0; i < 6; i++) { const a = (i + .5) * Math.PI / 3; const nut = add(new THREE.CylinderGeometry(.012, .012, .02, 6), satin, w); nut.rotation.z = Math.PI / 2; nut.position.set(side * W * .8, Math.cos(a) * .1, Math.sin(a) * .1); }
    const rotor = add(new THREE.CylinderGeometry(.22, .22, .03, 32), satin, pivot); rotor.rotation.z = Math.PI / 2; rotor.position.x = -side * .02;
    // Chrome hydraulic ram from wheel hub up into the body.
    const ram = add(new THREE.CylinderGeometry(.035, .035, .42, 12), chrome, pivot); ram.position.set(-side * .2, .2, 0);
  }
  root.userData = { asset: 'procedural finned hardtop', forwardAxis: '+Z', length: CAR_LENGTH, wheelRadius: WHEEL_RADIUS };
  return {
    root, chassis, wheels, suspensions,
    update(spin, bounce, steer = 0) { chassis.position.y = bounce; wheels.forEach(w => w.rotation.x = spin); suspensions.forEach(p => { p.rotation.y = p.position.z > 0 ? steer : 0; }); },
  };
}
