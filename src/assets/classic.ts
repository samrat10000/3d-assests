import * as THREE from 'three';

/**
 * Early-60s American lowrider hardtop (lime pearl), built to the user's lowrider references:
 * slab sides with one crisp full-length crease, flat hood and deck, quad round lamps at the ends of a fine full-width grille,
 * heavy chrome bumpers, three round tail lamps per side, small chrome wire wheels with thin whitewalls, exposed chrome hydraulics.
 * No badges or scripts.
 *
 * +Z is the nose, Y=0 is the road, wheel centres sit at Y=WHEEL_RADIUS at rest.
 * Each wheel hangs from its own suspension group (`suspensions[i]`, child of root) and spins about local X (`wheels[i]`).
 * The body (`chassis`) is posed independently by the owning scene (heave / pitch / roll from the hydraulics).
 */
export const WHEEL_RADIUS = 0.3125; // 5 / 16: with a roll radius of 5 the wheels turn an integer number of times per roll turn
export const WHEEL_Z = { front: 1.55, rear: -1.48 } as const;
export const WHEEL_X = 0.82;
export const CAR_LENGTH = 5.4;

export function createClassicCar(): {
  root: THREE.Group; chassis: THREE.Group; wheels: THREE.Object3D[]; suspensions: THREE.Group[];
  update: (spin: number, bounce: number, steer?: number) => void;
} {
  const root = new THREE.Group(); root.name = 'Lime pearl lowrider hardtop';
  const chassis = new THREE.Group(); chassis.name = 'Body on hydraulics'; root.add(chassis);

  // ---------- materials ----------
  const paint = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, metalness: .55, roughness: .22, clearcoat: .8, clearcoatRoughness: .1, iridescence: .45, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520], envMapIntensity: 1.5, side: THREE.DoubleSide });
  const chrome = new THREE.MeshStandardMaterial({ color: '#e2dade', metalness: 1, roughness: .08, side: THREE.DoubleSide });
  const satin = new THREE.MeshStandardMaterial({ color: '#b9b0b5', metalness: 1, roughness: .3, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: '#121012', roughness: .7, metalness: .2, side: THREE.DoubleSide });
  const cell = new THREE.MeshStandardMaterial({ color: '#1e0d18', metalness: .6, roughness: .35, side: THREE.DoubleSide });
  const under = new THREE.MeshStandardMaterial({ color: '#191618', roughness: .85, side: THREE.DoubleSide });
  const rubber = new THREE.MeshStandardMaterial({ color: '#121012', roughness: .85, side: THREE.DoubleSide });
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#3a3436', roughness: .5, side: THREE.DoubleSide });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#5e3f86', metalness: .45, roughness: .04, transparent: true, opacity: .8, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 });
  const lampGlass = new THREE.MeshPhysicalMaterial({ color: '#f6f2f4', metalness: .1, roughness: .12, transparent: true, opacity: .4, clearcoat: .3, depthWrite: false });
  const amber = new THREE.MeshPhysicalMaterial({ color: '#d9781c', emissive: '#ff7a10', emissiveIntensity: .25, roughness: .2, clearcoat: 1 });
  const tail = new THREE.MeshPhysicalMaterial({ color: '#b40f1a', emissive: '#ff1d2a', emissiveIntensity: .25, roughness: .15, clearcoat: 1 });
  const leather = new THREE.MeshStandardMaterial({ color: '#efe6da', roughness: .6 });
  const skin = new THREE.MeshStandardMaterial({ color: '#efe9e4', roughness: .45 });
  const jacket = new THREE.MeshStandardMaterial({ color: '#2a1f2b', roughness: .75 });

  // ---------- helpers ----------
  const add = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D = chassis) => { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
  const lime = new THREE.Color('#86d40f'), cream = new THREE.Color('#e4f2a8'), tmp = new THREE.Color();
  const paintColour = (y: number) => tmp.copy(lime).lerp(cream, THREE.MathUtils.smoothstep(y, .85, 1.35)).clone();
  /** Parametric grid surface; vertex colours from height when `tinted`. */
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
  /** Thin straight rod between two points (spokes, suspension links). */
  const UPV = new THREE.Vector3(0, 1, 0);
  const rod = (a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material, p: THREE.Object3D, seg = 6) => { const d = b.clone().sub(a); const o = add(new THREE.CylinderGeometry(r, r, d.length(), seg, 1), m, p); o.position.copy(a).add(b).multiplyScalar(.5); o.quaternion.setFromUnitVectors(UPV, d.normalize()); o.castShadow = false; return o; };
  /** Sweep a closed cross-section (a = outward, b = up) along a horizontal path; outward = tangent x up. */
  const sweep = (path: THREE.Vector3[], profile: [number, number][], m: THREE.Material, segs = 96, p: THREE.Object3D = chassis) => {
    const curve = new THREE.CatmullRomCurve3(path); const P = new THREE.Vector3(), Tn = new THREE.Vector3(), N = new THREE.Vector3();
    return surface((u, v) => { curve.getPointAt(u, P); curve.getTangentAt(u, Tn); N.crossVectors(Tn, UPV).normalize(); const k = v * (profile.length - 1), i = Math.min(profile.length - 2, Math.floor(k)), f = k - i; const a = profile[i][0] + (profile[i + 1][0] - profile[i][0]) * f, b = profile[i][1] + (profile[i + 1][1] - profile[i][1]) * f; return [P.x + N.x * a, P.y + b, P.z + N.z * a]; }, segs, profile.length * 3, m, false, p);
  };
  const ss = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // ---------- body shell: slab sides, crisp crease, flat hood and deck ----------
  const ZF = 2.68, ZR = -2.72;
  const halfWidth = (z: number) => .99 - .025 * ss(2.3, ZF, z) - .02 * ss(-2.35, ZR, z);
  const deckY = (z: number) => .935 - .03 * ss(1.6, ZF, z) + .01 * ss(-.5, -2.0, z) - .015 * ss(-2.4, ZR, z);
  const YC = .6, N_UP = 10, N_LO = 2.6, H_LO = .3, CREASE = .8;
  const shoulderT = .86;
  const xAtY = (y: number, z: number) => {
    const hw = halfWidth(z), up = y >= YC; const h = up ? deckY(z) - YC : H_LO; const n = up ? N_UP : N_LO; const t = Math.min(1, Math.abs(y - YC) / h);
    const base = hw * Math.pow(1 - Math.pow(t, n), 1 / n);
    return base + .016 * Math.exp(-Math.pow((y - CREASE) / .014, 2)) - .008 * ss(CREASE, CREASE + .05, y); // knife-edge crease, shoulder steps in above it
  };
  const ARCH_R = .41, ARCH_Y = .34;
  const sillY = (z: number) => { let y = YC - H_LO * .92; for (const c of [WHEEL_Z.front, WHEEL_Z.rear]) { const d = z - c; if (Math.abs(d) < ARCH_R) y = Math.max(y, ARCH_Y + Math.sqrt(ARCH_R * ARCH_R - d * d)); } return y; };
  const NZ = 240;
  const zAt = (u: number) => ZR + (ZF - ZR) * u;
  // Nose and tail are near-flat faces with a very slight forward V.
  const nose = (x: number, z: number) => .06 * Math.max(0, 1 - x * x) * ss(2.25, ZF, z) - .02 * Math.max(0, 1 - x * x) * ss(-2.3, ZR, z);
  const fz = (x: number) => ZF + .06 * Math.max(0, 1 - x * x);
  const rzf = (x: number) => ZR - .02 * Math.max(0, 1 - x * x);
  const shell: THREE.Mesh[] = [];
  for (const s of [-1, 1]) shell.push(surface((u, v) => { const z = zAt(u); const y0 = sillY(z), y1 = YC + shoulderT * (deckY(z) - YC); const y = y0 + (y1 - y0) * v; return [s * xAtY(y, z), y, z]; }, NZ, 28, paint, true));
  shell.push(surface((u, v) => { const z = zAt(v); const xs = xAtY(YC + shoulderT * (deckY(z) - YC), z); const x = (u * 2 - 1) * xs; const h = deckY(z) - YC; const y = YC + h * Math.pow(1 - Math.pow(Math.min(1, Math.abs(x) / halfWidth(z)), N_UP), 1 / N_UP); return [x, y, z]; }, 36, NZ, paint, true));
  for (const z of [ZF, ZR]) {
    const shape = new THREE.Shape(); const pts: THREE.Vector2[] = []; const y0 = sillY(z), y1 = YC + shoulderT * (deckY(z) - YC);
    for (let i = 0; i <= 16; i++) { const y = y0 + (y1 - y0) * i / 16; pts.push(new THREE.Vector2(xAtY(y, z), y)); }
    for (let i = 1; i < 24; i++) { const x = xAtY(y1, z) * (1 - 2 * i / 24); const y = YC + (deckY(z) - YC) * Math.pow(1 - Math.pow(Math.abs(x) / halfWidth(z), N_UP), 1 / N_UP); pts.push(new THREE.Vector2(x, y)); }
    for (let i = 16; i >= 0; i--) { const y = y0 + (y1 - y0) * i / 16; pts.push(new THREE.Vector2(-xAtY(y, z), y)); }
    shape.setFromPoints(pts); const cap = add(new THREE.ShapeGeometry(shape, 8), paint); cap.position.z = z; tint(cap, .7); shell.push(cap);
  }
  shell.forEach(m => { const p = m.geometry.getAttribute('position'); for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + nose(p.getX(i), p.getZ(i) + m.position.z)); m.geometry.computeVertexNormals(); });

  // Deep, round wheel wells with chrome lips (the lowrider gap between tyre and arch is part of the look).
  for (const s of [-1, 1]) for (const wz of [WHEEL_Z.front, WHEEL_Z.rear]) {
    surface((u, v) => { const a = u * Math.PI; return [s * (1 - v * .45), ARCH_Y + Math.sin(a) * (ARCH_R - .01), wz + Math.cos(a) * (ARCH_R - .01)]; }, 32, 2, under);
    const lip: [number, number, number][] = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI; const z = wz + Math.cos(a) * ARCH_R, y = ARCH_Y + Math.sin(a) * ARCH_R; lip.push([s * (xAtY(y, z) + .003), y, z]); } tube(lip, .01);
  }
  const floor = rbox(1.7, .04, 4.7, .015, under); floor.position.set(0, .3, -.05);

  // ---------- side brightwork ----------
  for (const s of [-1, 1]) {
    // Full-length spear riding the crease.
    const spear: [number, number, number][] = []; for (let i = 0; i <= 24; i++) { const z = ZF - .08 - i * ((ZF - ZR - .16) / 24); spear.push([s * (xAtY(CREASE, z) + .002), CREASE, z + nose(s * .99, z)]); } tube(spear, .007);
    // Broad lower molding between the wheels, as on the references.
    const z0 = WHEEL_Z.front - ARCH_R - .03, z1 = WHEEL_Z.rear + ARCH_R + .03;
    const path: THREE.Vector3[] = []; for (let i = 0; i <= 8; i++) { const z = s > 0 ? lerp(z0, z1, i / 8) : lerp(z1, z0, i / 8); path.push(new THREE.Vector3(s * xAtY(.43, z), .43, z)); }
    sweep(path, [[-.004, -.032], [.004, -.03], [.008, 0], [.004, .03], [-.004, .032]], chrome, 24);
    // Door shut lines, handle, mirror (driver side).
    for (const z of [1.05, -.5]) tube([[s * (xAtY(.9, z) + .001), .9, z], [s * (xAtY(.6, z) + .001), .6, z], [s * (xAtY(.4, z) + .001), .4, z]], .003, dark);
    const handle = rbox(.025, .025, .14, .01, chrome); handle.position.set(s * (xAtY(.86, -.3) + .008), .86, -.3);
    if (s < 0) { rod(new THREE.Vector3(s * .86, .94, 1.0), new THREE.Vector3(s * .95, 1.02, .98), .012, chrome, chassis); const m = add(new THREE.SphereGeometry(1, 16, 10), chrome); m.scale.set(.07, .045, .07); m.position.set(s * .97, 1.04, .97); }
  }

  // ---------- front: quad round lamps at the ends of a fine full-width grille, heavy bumper ----------
  const V = (x: number, y: number, dz: number) => new THREE.Vector3(x, y, fz(x) + dz);
  const yaw = (x: number) => -Math.atan2(fz(x + .01) - fz(x - .01), .02);
  const across = (y: number, dz: number, x0: number, x1: number, n = 16) => Array.from({ length: n + 1 }, (_, i) => V(x0 + (x1 - x0) * i / n, y, dz));
  const GRILLE = { x: .97, y0: .6, y1: .83 };
  surface((u, v) => { const x = -GRILLE.x + 2 * GRILLE.x * u; return [x, lerp(GRILLE.y0, GRILLE.y1, v), fz(x) - .02]; }, 32, 2, cell);
  // Fine horizontal bars over closely spaced vertical dividers.
  for (let k = 0; k <= 8; k++) sweep(across(GRILLE.y0 + .015 + k * (GRILLE.y1 - GRILLE.y0 - .03) / 8, .002, -GRILLE.x, GRILLE.x), [[-.006, -.004], [.004, -.004], [.006, 0], [.004, .004], [-.006, .004]], chrome, 48);
  for (let i = 0; i <= 40; i++) { const x = -GRILLE.x + i * 2 * GRILLE.x / 40; const b = rbox(.004, GRILLE.y1 - GRILLE.y0 - .02, .018, .0015, satin); b.position.copy(V(x, (GRILLE.y0 + GRILLE.y1) / 2, -.008)); b.rotation.y = yaw(x); }
  // Chrome frame around the grille opening.
  sweep(across(GRILLE.y1 + .012, .006, -.99, .99), [[-.02, -.01], [.008, -.01], [.014, 0], [.008, .012], [-.02, .012]], chrome, 60);
  sweep(across(GRILLE.y0 - .01, .006, -.99, .99), [[-.02, -.01], [.008, -.01], [.012, 0], [.008, .01], [-.02, .01]], chrome, 60);
  // Quad lamps: chrome reflector, clear dome, chrome bezel, each pair framed by a chrome housing.
  const LAMP_Y = .715, LAMP_R = .068;
  for (const s of [-1, 1]) {
    const frame: [number, number, number][] = []; const fx0 = .53, fx1 = .965, fy0 = .635, fy1 = .795, rr = .06;
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; const cx = Math.cos(a), cy = Math.sin(a); const x = (fx0 + fx1) / 2 + Math.sign(cx) * ((fx1 - fx0) / 2 - rr) + cx * rr, y = (fy0 + fy1) / 2 + Math.sign(cy) * ((fy1 - fy0) / 2 - rr) + cy * rr; frame.push([s * x, y, fz(x) + .012]); }
    tube(frame, .011, chrome, chassis, true);
    for (const x of [.64, .855]) {
      const at = V(s * x, LAMP_Y, .0);
      const back = add(new THREE.CircleGeometry(LAMP_R + .012, 32), dark); back.position.copy(at).add(new THREE.Vector3(0, 0, -.004)); back.rotation.y = yaw(s * x);
      const refl = add(new THREE.SphereGeometry(LAMP_R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), chrome); refl.rotation.x = -Math.PI / 2; refl.scale.set(1, .5, 1); refl.position.copy(at).add(new THREE.Vector3(0, 0, -.03));
      const dome = add(new THREE.SphereGeometry(LAMP_R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lampGlass); dome.rotation.x = Math.PI / 2; dome.scale.set(1, .32, 1); dome.position.copy(at);
      const bezel = add(new THREE.TorusGeometry(LAMP_R + .006, .012, 10, 40), chrome); bezel.position.copy(at); bezel.rotation.y = yaw(s * x);
    }
  }
  // Hood leading edge: thin chrome lip.
  sweep(across(.875, .0, -.97, .97), [[-.03, -.006], [.004, -.006], [.008, 0], [.004, .006], [-.03, .006]], chrome, 60);
  // Massive bumper with slight V, wrapping the corners; rectangular park lamps in its lower face; plate in the middle.
  const bumper = (front: boolean) => {
    const y = .5, zf = front ? fz : rzf, d = front ? 1 : -1;
    const pts = [[-.98, -.32], [-1.02, -.08], [-.94, .07], [-.6, .11], [0, .13], [.6, .11], [.94, .07], [1.02, -.08], [.98, -.32]].map(([x, dz]) => new THREE.Vector3(front ? x : -x, y, zf(x) + d * dz));
    sweep(pts, [[-.03, -.075], [.035, -.075], [.065, -.05], [.075, -.005], [.07, .04], [.04, .068], [-.03, .072]], chrome, 120);
    surface((u, v) => { const x = -.88 + 1.76 * u; return [x, .36 + .07 * v, zf(x) + d * (.02 + .05 * v)]; }, 16, 1, dark);
  };
  bumper(true); bumper(false);
  for (const s of [-1, 1]) { const p = rbox(.17, .045, .02, .008, amber); p.position.copy(V(s * .62, .465, .195)); p.rotation.y = yaw(s * .62); }
  const plateF = rbox(.3, .15, .012, .008, white); plateF.position.copy(V(0, .5, .205));

  // ---------- rear: three round tail lamps per side in a chrome trim band, bumper, plate ----------
  const R = (x: number, y: number, dz: number) => new THREE.Vector3(x, y, rzf(x) - dz);
  surface((u, v) => { const x = -.95 + 1.9 * u; return [x, lerp(.64, .8, v), rzf(x) - .004]; }, 24, 2, satin);
  for (const y of [.637, .803]) tube(Array.from({ length: 13 }, (_, i) => { const x = -.96 + i * 1.92 / 12; const p = R(x, y, .01); return [p.x, p.y, p.z] as [number, number, number]; }), .009);
  for (const s of [-1, 1]) for (const x of [.42, .62, .82]) {
    const at = R(s * x, .72, .012);
    const lamp = add(new THREE.SphereGeometry(.058, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), tail); lamp.rotation.x = -Math.PI / 2; lamp.scale.set(1, .3, 1); lamp.position.copy(at);
    const ring = add(new THREE.TorusGeometry(.064, .01, 10, 36), chrome); ring.position.copy(at);
  }
  const plateR = rbox(.3, .15, .012, .008, white); plateR.position.copy(R(0, .5, .2));
  for (const s of [-1, 1]) rod(new THREE.Vector3(s * .5, .3, ZR + .3), new THREE.Vector3(s * .5, .3, ZR - .05), .035, chrome, chassis, 14);

  // ---------- greenhouse: hardtop, wraparound windshield, thin A-pillars, broad C-pillars ----------
  const BASE_Y = .925, ROOF_Y = 1.34, BASE_HW = .88, ROOF_HW = .72, ROOF_F = .45, ROOF_R = -.85, WS_BASE = 1.2, RW_BASE = -1.55;
  const wsZ = (u: number, v: number) => ROOF_F + (WS_BASE - .2 * Math.pow(Math.abs(u * 2 - 1), 4) - ROOF_F) * v;
  const rwZ = (u: number, v: number) => ROOF_R + (RW_BASE + .12 * Math.pow(Math.abs(u * 2 - 1), 4) - ROOF_R) * v;
  surface((u, v) => { const x = (u * 2 - 1) * lerp(ROOF_HW, BASE_HW, v); return [x, lerp(ROOF_Y, BASE_Y, v) + .015 * Math.sin(u * Math.PI) * (1 - v), wsZ(u, v)]; }, 24, 10, glass);
  surface((u, v) => { const x = (u * 2 - 1) * lerp(ROOF_HW, BASE_HW, v); return [x, lerp(ROOF_Y, BASE_Y, v) + .015 * Math.sin(u * Math.PI) * (1 - v), rwZ(u, v)]; }, 24, 10, glass);
  surface((u, v) => { const x = (u * 2 - 1) * (ROOF_HW + .015 * Math.sin(v * Math.PI)); return [x, ROOF_Y + .035 * Math.pow(Math.sin(u * Math.PI), .4), lerp(ROOF_R, ROOF_F, v)]; }, 24, 20, paint, true);
  const C_W = .5;
  for (const s of [-1, 1]) {
    const e = s > 0 ? 1 : 0;
    surface((u, v) => { const t = 1 - v; const zf = wsZ(e, t) - .03, zr = rwZ(e, t) + C_W * (1 - t * .35); return [s * lerp(ROOF_HW, BASE_HW, t), lerp(ROOF_Y, BASE_Y, t), lerp(zr, zf, u)]; }, 16, 8, glass);
    surface((u, v) => { const t = 1 - v; const zr = rwZ(e, t); return [s * (lerp(ROOF_HW, BASE_HW, t) + .003), lerp(ROOF_Y, BASE_Y, t), lerp(zr, zr + C_W * (1 - t * .35), u)]; }, 6, 8, paint, true);
    const a: [number, number, number][] = []; for (let i = 0; i <= 8; i++) { const t = i / 8; a.push([s * lerp(ROOF_HW, BASE_HW, t), lerp(ROOF_Y, BASE_Y, t), wsZ(e, t)]); } tube(a, .016);
    tube([[s * (BASE_HW + .008), BASE_Y + .004, RW_BASE + C_W], [s * (BASE_HW + .012), BASE_Y + .008, 0], [s * (BASE_HW + .004), BASE_Y + .004, WS_BASE - .2]], .009);
    tube([[s * (ROOF_HW + .008), ROOF_Y - .004, ROOF_R + C_W * .65], [s * (ROOF_HW + .012), ROOF_Y, ROOF_F - .02]], .009);
  }

  // ---------- interior + driver ----------
  for (const z of [-.5, .3]) { const seat = rbox(1.5, .13, .5, .05, leather); seat.position.set(0, .58, z); const back = rbox(1.5, .42, .13, .05, leather); back.position.set(0, .82, z - .25); back.rotation.x = -.14; }
  const dash = rbox(1.66, .14, .3, .05, paint); dash.position.set(0, .9, 1.0); tint(dash, .9);
  const steer = add(new THREE.TorusGeometry(.18, .012, 10, 40), chrome); steer.position.set(-.42, 1.02, .72); steer.rotation.x = -.55;
  const torso = rbox(.42, .5, .26, .1, jacket); torso.position.set(-.42, .9, .12); torso.rotation.x = -.12;
  const head = add(new THREE.SphereGeometry(.12, 20, 14), skin); head.scale.set(.9, 1.1, 1); head.position.set(-.42, 1.24, .14);
  const hair = add(new THREE.SphereGeometry(.125, 20, 12, 0, Math.PI * 2, 0, Math.PI * .5), jacket); hair.position.set(-.42, 1.26, .12);

  // ---------- exposed chrome hydraulics on the body ----------
  for (const s of [-1, 1]) {
    rod(new THREE.Vector3(s * .45, .28, 2.3), new THREE.Vector3(s * .45, .28, -2.2), .025, chrome, chassis, 10); // frame rails
    for (const wz of [WHEEL_Z.front, WHEEL_Z.rear]) { rod(new THREE.Vector3(s * .52, .3, wz), new THREE.Vector3(s * .52, .62, wz), .045, chrome, chassis, 16); rod(new THREE.Vector3(s * .52, .3, wz), new THREE.Vector3(s * .52, .5, wz), .052, satin, chassis, 16); }
  }
  rod(new THREE.Vector3(0, .26, 1.1), new THREE.Vector3(0, .26, WHEEL_Z.rear), .04, chrome, chassis, 12);
  const pump = add(new THREE.CylinderGeometry(.09, .09, .4, 18), chrome); pump.rotation.z = Math.PI / 2; pump.position.set(0, .45, -2.15);

  // ---------- wheels: chrome wire wheels with thin whitewalls, hung from chrome A-arms / trailing links ----------
  const W = .095, RO = WHEEL_RADIUS, RB = .205;
  const tyreProfile: THREE.Vector2[] = [new THREE.Vector2(RB, -W * .9)];
  for (let i = 0; i <= 14; i++) { const a = -Math.PI / 2 + i / 14 * Math.PI; tyreProfile.push(new THREE.Vector2(RO - .045 + Math.cos(a) * .045, Math.sin(a) * W)); }
  tyreProfile.push(new THREE.Vector2(RB, W * .9));
  const tyreGeo = new THREE.LatheGeometry(tyreProfile, 72).rotateZ(-Math.PI / 2);
  const wallGeo = new THREE.RingGeometry(.222, .262, 64).rotateY(Math.PI / 2);
  const wheels: THREE.Object3D[] = []; const suspensions: THREE.Group[] = [];
  const buildWheel = (parent: THREE.Object3D) => {
    const g = new THREE.Group(); parent.add(g);
    add(tyreGeo, rubber, g);
    const wall = add(wallGeo, white, g); wall.position.x = W * .99;
    const barrel = add(new THREE.CylinderGeometry(RB, RB, W * 1.8, 48, 1, true), satin, g); barrel.rotation.z = Math.PI / 2;
    const lip = add(new THREE.TorusGeometry(RB, .013, 10, 64), chrome, g); lip.rotation.y = Math.PI / 2; lip.position.x = W * .85;
    const dish = add(new THREE.CircleGeometry(RB - .01, 48), dark, g); dish.rotation.y = Math.PI / 2; dish.position.x = -W * .4;
    // Two crossed layers of spokes laced from the hub flanges to the rim.
    for (let i = 0; i < 36; i++) for (const layer of [1, -1]) {
      const a = i / 36 * Math.PI * 2, a2 = a + layer * .42, hubX = layer > 0 ? .07 : -.02;
      rod(new THREE.Vector3(hubX, Math.cos(a) * .055, Math.sin(a) * .055), new THREE.Vector3(W * .55, Math.cos(a2) * (RB - .012), Math.sin(a2) * (RB - .012)), .0032, chrome, g, 4);
    }
    const hub = add(new THREE.CylinderGeometry(.058, .066, .1, 24), chrome, g); hub.rotation.z = Math.PI / 2; hub.position.x = .04;
    const cap = add(new THREE.CylinderGeometry(.03, .045, .04, 6), chrome, g); cap.rotation.z = Math.PI / 2; cap.position.x = .11;
    const ears = rbox(.016, .17, .028, .006, chrome, g); ears.position.x = .12; // two-ear knock-off spinner
    return g;
  };
  for (const z of [WHEEL_Z.front, WHEEL_Z.rear]) for (const side of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.name = `${z > 0 ? 'front' : 'rear'}-${side > 0 ? 'right' : 'left'}-suspension`; pivot.position.set(side * WHEEL_X, WHEEL_RADIUS, z); root.add(pivot); suspensions.push(pivot);
    const w = new THREE.Group(); w.name = `${z > 0 ? 'Front' : 'Rear'} ${side > 0 ? 'right' : 'left'} wheel`; pivot.add(w); wheels.push(w);
    const assembly = buildWheel(w); if (side < 0) assembly.rotation.y = Math.PI; // mirror so the dish faces outward on both sides
    // Suspension links ride with the wheel: chrome A-arms in front, trailing link at the rear, coil spring and brake drum.
    const inward = -side;
    const drum = add(new THREE.CylinderGeometry(.13, .13, .07, 24), satin, pivot); drum.rotation.z = Math.PI / 2; drum.position.x = inward * .11;
    if (z > 0) {
      for (const [dy, len] of [[.1, .34], [-.06, .4]] as [number, number][]) for (const dz of [-.16, .16]) rod(new THREE.Vector3(inward * .14, dy, 0), new THREE.Vector3(inward * len, dy + .02, dz), .014, chrome, pivot, 8);
    } else {
      rod(new THREE.Vector3(inward * .14, -.02, 0), new THREE.Vector3(inward * .3, .02, .7), .02, chrome, pivot, 8);
    }
    const coil: [number, number, number][] = []; for (let i = 0; i < 64; i++) { const a = i / 63 * Math.PI * 14; coil.push([inward * .28 + .045 * Math.cos(a), -.04 + i / 63 * .3, .045 * Math.sin(a)]); } tube(coil, .009, chrome, pivot);
  }
  // Rear axle housing between the rear wheels (rides with the body; short enough to read as one piece).
  rod(new THREE.Vector3(-WHEEL_X + .14, WHEEL_RADIUS, WHEEL_Z.rear), new THREE.Vector3(WHEEL_X - .14, WHEEL_RADIUS, WHEEL_Z.rear), .045, chrome, chassis, 14);
  const diff = add(new THREE.SphereGeometry(.15, 20, 14), chrome); diff.scale.set(1.1, .9, 1); diff.position.set(0, WHEEL_RADIUS, WHEEL_Z.rear);

  root.userData = { asset: 'procedural lowrider hardtop', forwardAxis: '+Z', length: CAR_LENGTH, wheelRadius: WHEEL_RADIUS };
  return {
    root, chassis, wheels, suspensions,
    update(spin, bounce, steer = 0) { chassis.position.y = bounce; wheels.forEach(w => w.rotation.x = spin); suspensions.forEach(p => { p.rotation.y = p.position.z > 0 ? steer : 0; }); },
  };
}
