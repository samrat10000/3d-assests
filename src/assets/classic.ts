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
  /** Re-aim every suspension link after posing the chassis and suspension groups. */
  articulate: () => void;
} {
  const root = new THREE.Group(); root.name = 'Lime pearl lowrider hardtop';
  const chassis = new THREE.Group(); chassis.name = 'Body on hydraulics'; root.add(chassis);

  // ---------- materials ----------
  const paint = new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, metalness: .55, roughness: .22, clearcoat: .8, clearcoatRoughness: .1, iridescence: .45, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 520], envMapIntensity: 1.5, side: THREE.DoubleSide });
  const chrome = new THREE.MeshStandardMaterial({ color: '#e2dade', metalness: 1, roughness: .08, side: THREE.DoubleSide });
  const satin = new THREE.MeshStandardMaterial({ color: '#b9b0b5', metalness: 1, roughness: .3, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: '#121012', roughness: .7, metalness: .2, side: THREE.DoubleSide });
  const cell = new THREE.MeshStandardMaterial({ color: '#1e0d18', metalness: .6, roughness: .35, side: THREE.DoubleSide });
  const under = new THREE.MeshStandardMaterial({ color: '#4a3324', metalness: .7, roughness: .35, side: THREE.DoubleSide });
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
  const floor = rbox(1.7, .03, 4.7, .012, under); floor.position.set(0, .315, -.05);

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

  // ---------- underside: plated X-frame, ribbed floor, drivetrain, exhaust, tank, hydraulic plumbing ----------
  // Middle of the car stays above y≈.27 (the roll bulges up between the axles); ends can hang lower.
  const gold = new THREE.MeshStandardMaterial({ color: '#e3b45c', metalness: 1, roughness: .16 });
  const P = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  // Floor pan ribs + transmission tunnel.
  for (let i = 0; i < 13; i++) { const r = rbox(1.5, .018, .045, .008, gold); r.position.set(0, .292, -2.0 + i * .3); }
  const tunnel = add(new THREE.CylinderGeometry(.17, .17, 2.4, 24, 1, true, Math.PI / 2, Math.PI), under); tunnel.rotation.x = Math.PI / 2; tunnel.position.set(0, .3, .25);
  // X-frame: perimeter rails pinch to a narrow waist under the cabin, kick up over the rear axle.
  for (const s of [-1, 1]) {
    tube([[s * .42, .3, 2.45], [s * .44, .29, 1.9], [s * .36, .285, 1.1], [s * .11, .29, .1], [s * .32, .29, -.95], [s * .44, .36, -1.25], [s * .45, .46, -1.6], [s * .44, .4, -2.05], [s * .44, .38, -2.6]], .034, gold);
    tube([[s * .36, .285, 1.1], [s * .72, .3, .6], [s * .74, .3, -.6], [s * .32, .29, -.95]], .018, gold); // outriggers to the rocker
  }
  for (const z of [2.3, WHEEL_Z.front - .02, .1, -2.05]) rod(P(-.45, .3, z), P(.45, .3, z), z === .1 ? .022 : .03, gold, chassis, 12); // crossmembers
  const kframe = rbox(.95, .07, .16, .02, chrome); kframe.position.set(0, .27, WHEEL_Z.front + .05);
  // Engine sump, bellhousing, transmission, mounts.
  const sump = rbox(.42, .12, .62, .03, satin); sump.position.set(0, .33, 1.9);
  for (let i = 0; i < 6; i++) { const fin = rbox(.4, .01, .02, .004, chrome); fin.position.set(0, .268, 1.65 + i * .1); }
  const bell = add(new THREE.CylinderGeometry(.16, .22, .3, 24), satin); bell.rotation.x = Math.PI / 2; bell.position.set(0, .36, 1.35);
  const trans = add(new THREE.CylinderGeometry(.1, .15, .9, 20), satin); trans.rotation.x = Math.PI / 2; trans.position.set(0, .34, .78);
  const transPan = rbox(.24, .05, .4, .015, chrome); transPan.position.set(0, .275, .8);
  // Dual exhaust with chrome mufflers and tips.
  for (const s of [-1, 1]) {
    tube([[s * .26, .36, 2.0], [s * .28, .3, 1.5], [s * .2, .28, .9], [s * .19, .285, .2], [s * .24, .29, -.35]], .028, chrome);
    const muffler = add(new THREE.CylinderGeometry(.075, .075, .55, 20), chrome); muffler.rotation.x = Math.PI / 2; muffler.position.set(s * .27, .31, -.65);
    tube([[s * .27, .31, -.95], [s * .3, .33, -1.2], [s * .36, .42, -1.55], [s * .44, .38, -2.0], [s * .5, .31, -2.5], [s * .5, .3, ZR - .03]], .03, chrome);
  }
  // Fuel tank behind the axle, plated straps.
  const tank = rbox(1.1, .2, .5, .05, satin); tank.position.set(0, .42, -2.25);
  for (const z of [-2.1, -2.4]) { const strap = rbox(1.14, .012, .04, .005, gold); strap.position.set(0, .315, z); }
  // Hydraulic plumbing: trunk pump block feeding chrome hard lines to each corner.
  const block = rbox(.4, .12, .18, .03, chrome); block.position.set(0, .4, -1.95);
  for (const sx of [-1, 1]) for (const wz of [WHEEL_Z.front, WHEEL_Z.rear]) {
    const end: [number, number, number] = [sx * .56, .64, wz + .12];
    tube(wz > 0 ? [[sx * .12, .4, -1.95], [sx * .2, .33, -1.2], [sx * .62, .31, -.2], [sx * .64, .32, .9], [sx * .6, .5, wz - .2], end] : [[sx * .12, .4, -1.95], [sx * .35, .45, -1.85], [sx * .58, .58, -1.7], end], .009, chrome);
  }
  // Front anti-roll bar.
  tube([[-.38, .27, WHEEL_Z.front + .32], [-.3, .25, WHEEL_Z.front + .42], [.3, .25, WHEEL_Z.front + .42], [.38, .27, WHEEL_Z.front + .32]], .016, chrome);

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
    const inward = -side;
    const drum = add(new THREE.CylinderGeometry(.13, .13, .07, 24), satin, pivot); drum.rotation.z = Math.PI / 2; drum.position.x = inward * .11;
    const knuckle = add(new THREE.CylinderGeometry(.03, .03, .26, 12), chrome, pivot); knuckle.position.set(inward * .14, .01, 0);
  }

  // ---------- articulated suspension: every link is re-aimed each frame between a body point and a wheel point ----------
  // Body points are in chassis space, wheel points in the wheel's suspension space; both are mapped into car (root) space,
  // so arms swing, coil springs stretch/compress and hydraulic rams telescope as the body lifts and wheels hang.
  type Pt = () => THREE.Vector3;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  const onBody = (x: number, y: number, z: number): Pt => { const v = new THREE.Vector3(x, y, z), o = new THREE.Vector3(); return () => o.copy(v).applyMatrix4(chassis.matrix); };
  const onWheel = (i: number, x: number, y: number, z: number): Pt => { const v = new THREE.Vector3(x, y, z), o = new THREE.Vector3(); return () => o.copy(v).add(suspensions[i].position); };
  const between = (a: Pt, b: Pt, t: number, off = new THREE.Vector3()): Pt => { const o = new THREE.Vector3(); return () => o.copy(a()).lerp(b(), t).add(off); };
  const rigParts: (() => void)[] = [];
  const aim = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, stretch: boolean) => { tmpB.copy(b).sub(a); const L = tmpB.length(); m.position.copy(a); m.quaternion.setFromUnitVectors(UPV, tmpB.normalize()); if (stretch) m.scale.set(1, L, 1); };
  /** Solid link (arm, rod, bar): unit-length cylinder from a to b, stretched to fit. */
  const link = (a: Pt, b: Pt, r: number, m: THREE.Material, seg = 10) => { const g = new THREE.CylinderGeometry(r, r, 1, seg).translate(0, .5, 0); const o = add(g, m, root); rigParts.push(() => aim(o, a(), b(), true)); return o; };
  /** Ball joint / bushing at a moving point. */
  const joint = (a: Pt, r: number, m: THREE.Material) => { const o = add(new THREE.SphereGeometry(r, 12, 8), m, root); rigParts.push(() => o.position.copy(a())); };
  // Coil spring built at its rest length (closed, ground ends; thick plated wire); per frame it is aimed seat-to-seat and
  // scaled only along its axis, so it visibly compresses and extends without distorting much.
  chassis.updateMatrix();
  const spring = (a: Pt, b: Pt, radius: number) => {
    const L0 = a().distanceTo(b()), turns = 5.5, n = 240, pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) { const f = i / n, ang = f * turns * Math.PI * 2; const y = THREE.MathUtils.clamp((f * (turns + 1) - .5) / turns, 0, 1) * L0; pts.push(new THREE.Vector3(Math.cos(ang) * radius, y, Math.sin(ang) * radius)); }
    const o = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, .021, 10, false), chrome, root);
    const cup = () => add(new THREE.CylinderGeometry(radius * 1.3, radius * 1.3, .022, 24), gold, root); const cupA = cup(), cupB = cup();
    rigParts.push(() => { const A = a(), B = b(); aim(o, A, B, false); o.scale.set(1, A.distanceTo(B) / L0, 1); cupA.position.copy(A); cupA.quaternion.copy(o.quaternion); cupB.position.copy(B); cupB.quaternion.copy(o.quaternion); });
  };
  /** Hydraulic ram: plated barrel fixed to the body, polished rod fixed to the arm; they slide over each other. */
  const ram = (body: Pt, wheel: Pt) => {
    const barrel = add(new THREE.CylinderGeometry(.034, .034, .24, 18).translate(0, .12, 0), chrome, root);
    const collar = add(new THREE.CylinderGeometry(.042, .042, .03, 18).translate(0, .23, 0), gold, root);
    const rodM = add(new THREE.CylinderGeometry(.016, .016, .3, 12).translate(0, .15, 0), chrome, root);
    rigParts.push(() => { const A = body(), B = wheel(); aim(barrel, A, B, false); collar.position.copy(barrel.position); collar.quaternion.copy(barrel.quaternion); aim(rodM, B, A, false); });
  };
  suspensions.forEach((pv, i) => {
    const side = Math.sign(pv.position.x), inward = -side, z = pv.position.z;
    if (z > 0) {
      // Double wishbone: plated upper + lower A-arms, coil between lower arm and frame pocket, ram beside it, tie rod.
      const KU = onWheel(i, inward * .14, .13, 0), KL = onWheel(i, inward * .14, -.1, 0);
      for (const dz of [-.15, .15]) { link(KU, onBody(side * .46, .55, z + dz), .017, gold); link(KL, onBody(side * .36, .26, z + dz * 1.3), .02, gold); }
      joint(KU, .03, chrome); joint(KL, .034, chrome);
      const seat = onWheel(i, inward * .31, -.11, 0);
      spring(seat, onBody(side * .5, .52, z), .085);
      ram(onBody(side * .58, .56, z + .14), onWheel(i, inward * .27, -.08, .14));
      link(onWheel(i, inward * .13, -.03, -.17), onBody(side * .22, .27, z - .2), .012, chrome);
      link(onWheel(i, inward * .3, -.07, .2), onBody(side * .38, .27, z + .32), .009, chrome); // anti-roll bar end link
    } else {
      // Four-link rear: lower and upper trailing arms to the axle, coil on the axle, ram beside it.
      link(onWheel(i, inward * .16, -.06, 0), onBody(side * .42, .26, z + .78), .022, gold);
      spring(onWheel(i, inward * .28, -.02, 0), onBody(side * .5, .54, z), .082);
      ram(onBody(side * .58, .56, z - .14), onWheel(i, inward * .24, -.02, -.14));
    }
  });
  // Live rear axle between the rear hubs, chrome pumpkin in the middle, upper links, panhard bar, driveshaft with U-joints.
  const RL = onWheel(2, .12, 0, 0), RRt = onWheel(3, -.12, 0, 0), axleMid = between(RL, RRt, .5);
  link(RL, RRt, .045, chrome, 16);
  { const pumpkin = add(new THREE.SphereGeometry(.15, 24, 16), chrome, root); pumpkin.scale.set(1.15, .95, 1); const cover = add(new THREE.CylinderGeometry(.12, .12, .05, 24), gold, root); cover.rotation.x = Math.PI / 2;
    rigParts.push(() => { const m = axleMid(); pumpkin.position.copy(m); cover.position.copy(m).add(tmpA.set(0, 0, -.13)); }); }
  for (const s of [-1, 1]) link(between(RL, RRt, .5, new THREE.Vector3(s * .14, .12, 0)), onBody(s * .2, .33, WHEEL_Z.rear + .62), .018, gold);
  link(between(RL, RRt, .05, new THREE.Vector3(0, .06, .05)), onBody(.45, .38, WHEEL_Z.rear + .1), .016, chrome);
  const tailShaft = onBody(0, .32, .32), yoke = between(RL, RRt, .5, new THREE.Vector3(0, 0, .16));
  link(tailShaft, yoke, .035, chrome, 16); joint(tailShaft, .045, gold); joint(yoke, .045, gold);

  const articulate = () => { chassis.updateMatrix(); rigParts.forEach(f => f()); };
  articulate();

  root.userData = { asset: 'procedural lowrider hardtop', forwardAxis: '+Z', length: CAR_LENGTH, wheelRadius: WHEEL_RADIUS };
  return {
    root, chassis, wheels, suspensions,
    update(spin, bounce, steer = 0) { chassis.position.y = bounce; wheels.forEach(w => w.rotation.x = spin); suspensions.forEach(p => { p.rotation.y = p.position.z > 0 ? steer : 0; }); },
    articulate,
  };
}
