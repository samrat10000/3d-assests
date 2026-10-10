import * as THREE from 'three';

/** A freestanding street-sign assemblage. Y is up; the signal faces +Z. */
export function createTrafficSculpture(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'The Corner · weathered street assemblage';
  let seed = 81431;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const texture = (color: string, label?: string, kind = 'paint') => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
    const c = canvas.getContext('2d')!;
    c.fillStyle = color; c.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 12000; i++) {
      const x = random() * 1024, y = random() * 1024;
      c.fillStyle = random() > .48 ? `rgba(29,19,12,${random() * .19})` : `rgba(255,244,199,${random() * .24})`;
      c.fillRect(x, y, random() * 3 + .4, random() * 6 + .4);
    }
    for (let i = 0; i < 80; i++) {
      c.strokeStyle = `rgba(38,24,14,${random() * .3})`; c.lineWidth = random() * 2 + .5;
      const x = random() * 1024, y = random() * 1024;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() - .5) * 130, y + random() * 110); c.stroke();
    }
    // Chipped enamel concentrates along the metal perimeter.
    for (let i = 0; i < 420; i++) {
      c.fillStyle = i % 3 ? '#665340' : '#a19d8b';
      const edge = Math.floor(random() * 4), t = random() * 1024, d = random() * 18;
      c.fillRect(edge === 0 ? d : edge === 1 ? 1024 - d : t, edge === 2 ? d : edge === 3 ? 1024 - d : t, random() * 10, random() * 13);
    }
    if (kind === 'stop') {
      c.strokeStyle = '#e4d8bd'; c.lineWidth = 30; c.strokeRect(45, 45, 934, 934);
      c.font = '900 310px Arial'; c.textAlign = 'center'; c.fillStyle = '#e9dfc9'; c.fillText('STOP', 512, 610);
      c.strokeStyle = '#171b1b'; c.lineWidth = 42; c.beginPath(); c.moveTo(170, 760); c.bezierCurveTo(440, 520, 430, 870, 840, 670); c.stroke();
    } else if (label) {
      c.fillStyle = '#27100a'; c.textAlign = 'center'; c.font = '900 195px Arial';
      c.fillText(label === 'the corner' ? 'the' : label, 512, label === 'the corner' ? 445 : 580);
      if (label === 'the corner') { c.font = 'italic 900 215px Arial'; c.fillText('corner', 512, 655); }
    }
    if (kind === 'stickers') {
      const stickers = ['NO SIGNAL', '3AM', '↗', 'CITY', '01', 'AFTER HOURS', '✶', 'VOID'];
      for (let i = 0; i < 18; i++) {
        c.save(); c.translate(random() * 900 + 60, random() * 900 + 60); c.rotate((random() - .5) * .7);
        c.fillStyle = ['#e9e3ce', '#ad292b', '#4a888c', '#23282a'][i % 4]; c.fillRect(-60, -35, 120 + random() * 50, 70);
        c.fillStyle = i % 4 === 0 ? '#222422' : '#e9e3ce'; c.font = 'bold 22px Arial'; c.fillText(stickers[i % stickers.length], -52, 8); c.restore();
      }
    }
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  };
  const paint = (color: string, label?: string, kind?: string) => new THREE.MeshStandardMaterial({ map: texture(color, label, kind), roughness: .74, metalness: .38 });
  const yellow = paint('#deb027'), iron = paint('#333833', undefined, 'stickers');
  const steel = new THREE.MeshStandardMaterial({ color: '#777b72', roughness: .57, metalness: .86 });
  const dark = new THREE.MeshStandardMaterial({ color: '#151b1b', roughness: .63, metalness: .73 });
  const rust = paint('#5c3624');
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (parent: THREE.Object3D, w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), material, parent, x, y, z);
  const bolt = (parent: THREE.Object3D, x: number, y: number, z: number) => {
    const b = mesh(new THREE.CylinderGeometry(.032, .032, .022, 6), steel, parent, x, y, z); b.rotation.x = Math.PI / 2;
    box(parent, .033, .005, .006, dark, x, y, z + .014);
  };
  const tube = (parent: THREE.Object3D, points: THREE.Vector3[], radius: number, material: THREE.Material) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, radius, 8, false), material, parent);
  const plate = (parent: THREE.Object3D, points: [number, number][], depth: number, front: THREE.Material, back: THREE.Material = steel) => {
    const s = new THREE.Shape(); points.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .012, bevelThickness: .012 });
    // Normalize planar UVs so every sign can carry its own full-size print.
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, h = Math.max(...ys) - minY;
    const pos = g.getAttribute('position'), uv = g.getAttribute('uv');
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - minX) / w, (pos.getY(i) - minY) / h);
    return mesh(g, [front, back], parent);
  };

  // Narrow galvanized support with authentic clamps and a hollow open cap.
  mesh(new THREE.CylinderGeometry(.102, .117, 4.7, 20), iron, root, .05, -.1, -.22);
  const cap = mesh(new THREE.TorusGeometry(.101, .013, 8, 24), steel, root, .05, 2.255, -.22); cap.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.081, .081, .018, 20), dark, root, .05, 2.249, -.22);
  for (const y of [-1.5, -.65, .28, 1.25, 1.9]) {
    mesh(new THREE.CylinderGeometry(.134, .134, .07, 20), steel, root, .05, y, -.22);
    box(root, .45, .09, .07, steel, .12, y, -.33); bolt(root, .24, y, -.285);
  }

  const signal = new THREE.Group(); signal.name = 'Two-lens yellow signal'; signal.position.set(.16, .84, .05); signal.rotation.set(-.015, -.1, -.04); root.add(signal);
  const outline: [number, number][] = [[-.54,-1.09],[.54,-1.09],[.59,-1],[.59,.98],[.47,1.1],[-.48,1.1],[-.59,.98],[-.59,-1]];
  const housing = plate(signal, outline, .29, yellow, yellow); housing.position.z = -.18;
  box(signal, .95, 1.87, .10, iron, 0, 0, -.23);
  for (const y of [-.9, .9]) { bolt(signal, -.46, y, .142); bolt(signal, .46, y, .142); }
  for (const [index, y] of [.52, -.51].entries()) {
    const rim = mesh(new THREE.TorusGeometry(.426, .035, 10, 48), steel, signal, 0, y, .17);
    rim.name = 'Rolled lens rim';
    const lensMaterial = new THREE.MeshPhysicalMaterial({ color: index ? '#838b78' : '#9b100c', metalness: .22, roughness: .27, clearcoat: 1, emissive: index ? '#182617' : '#f3330d', emissiveIntensity: index ? .1 : .62 });
    const lens = mesh(new THREE.SphereGeometry(.402, 40, 24), lensMaterial, signal, 0, y, .16); lens.scale.z = .25;
    const ledMaterial = new THREE.MeshStandardMaterial({ color: index ? '#c1c9b0' : '#ffba63', roughness: .33, emissive: index ? '#303f26' : '#ff430f', emissiveIntensity: index ? .16 : 2.1 });
    for (let iy = -5; iy <= 5; iy++) for (let ix = -5; ix <= 5; ix++) {
      const x = ix * .066 + (iy % 2 ? .033 : 0), yy = iy * .061;
      if (x * x + yy * yy > .12) continue;
      const led = mesh(new THREE.SphereGeometry(.019, 6, 5), ledMaterial, signal, x, y + yy, .182 + Math.sqrt(.402 * .402 - x * x - yy * yy) * .25); led.scale.z = .55;
    }
    // A rolled semicircular sheet visor, with real inner/outer thickness.
    const segments = 40, verts: number[] = [], ids: number[] = [];
    for (let layer = 0; layer < 2; layer++) for (let end = 0; end < 2; end++) for (let i = 0; i <= segments; i++) {
      const a = -.15 + i / segments * (Math.PI + .3), r = .453 + layer * .022;
      verts.push(Math.cos(a) * r, y + Math.sin(a) * r, .15 + end * (.52 + .06 * Math.sin(a)));
    }
    const stride = segments + 1;
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < segments; i++) { const a = layer * stride * 2 + i, b = a + stride; ids.push(a, b, a+1, b, b+1, a+1); }
    for (let end = 0; end < 2; end++) for (let i = 0; i < segments; i++) { const a = end*stride+i,b=a+stride*2; ids.push(a,a+1,b,b,a+1,b+1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.setIndex(ids); g.computeVertexNormals();
    mesh(g, new THREE.MeshStandardMaterial({ color: '#cea01b', roughness: .69, metalness: .47, side: THREE.DoubleSide }), signal);
  }
  // Electrical box, fins, hinges and cable loops remain visible during rotation.
  box(signal, .73, 1.5, .22, iron, 0, 0, -.4);
  for (let i = 0; i < 9; i++) box(signal, .57, .035, .04, dark, 0, -.55 + i * .135, -.526);
  for (const y of [-.68,.68]) { box(signal, .14,.16,.12,steel,-.48,y,-.22); bolt(signal,-.48,y,-.15); }
  tube(root, [new THREE.Vector3(.28,1.65,-.46),new THREE.Vector3(.6,1.9,-.61),new THREE.Vector3(.8,.3,-.65),new THREE.Vector3(.2,-.9,-.39)], .025, dark);

  const triangle = new THREE.Group(); triangle.name = 'The corner enamel sign'; triangle.position.set(-.9, -.13, -.025); triangle.rotation.set(.05,.18,-.09); root.add(triangle);
  plate(triangle,[[-.86,-.65],[1.02,-.65],[-.82,1.03]],.045,paint('#8e2617'),rust);
  const inset = plate(triangle,[[-.77,-.56],[.85,-.56],[-.74,.87]],.019,paint('#e9b32d','the corner'),steel); inset.position.z=.058;
  bolt(triangle,-.7,-.48,.099); bolt(triangle,-.7,.73,.099); bolt(triangle,.61,-.49,.099);

  const stop = new THREE.Group(); stop.name = 'Tagged octagonal stop sign'; stop.position.set(1.02,-.24,-.31); stop.rotation.set(.045,-.22,.12); root.add(stop);
  const polygon = (r:number): [number,number][] => Array.from({length:8},(_,i)=>{const a=Math.PI/8+i*Math.PI/4;return [Math.cos(a)*r,Math.sin(a)*r];});
  plate(stop,polygon(.79),.042,steel);
  const red = plate(stop,polygon(.743),.018,paint('#a82721',undefined,'stop'),rust); red.position.z=.055;
  bolt(stop,0,.61,.093); bolt(stop,0,-.61,.093);

  const small = new THREE.Group(); small.position.set(.64,-1.3,-.12); small.rotation.set(-.13,-.16,.15); root.add(small);
  plate(small,[[-.56,-.29],[.54,-.24],[.59,.3],[-.52,.29]],.035,paint('#d86b20','3 AM'),steel);
  bolt(small,-.43,.19,.054);bolt(small,.42,-.16,.054);

  // Torn rectangular plates and bent sheet tails give the lower silhouette its asymmetry.
  const rear = new THREE.Group(); rear.position.set(-.17,.01,-.48); rear.rotation.y=Math.PI; rear.rotation.z=-.11;root.add(rear);
  plate(rear,[[-1.25,-.28],[1.22,-.28],[1.22,.27],[-1.25,.27]],.025,paint('#222726',undefined,'stickers'),steel);
  for (const x of [-1.12,1.1]) bolt(rear,x,.15,.045);
  const top = new THREE.Group(); top.position.set(-.45,1.92,-.39); top.rotation.set(-.2,.05,.16);root.add(top);
  plate(top,[[-.86,-.19],[.58,-.13],[.74,.25],[-.68,.31]],.035,paint('#b7582c','↗'),steel);
  const bent = (x:number,y:number,z:number,rotation:number) => {
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.set(.2,rotation,-.15);root.add(g);
    plate(g,[[-.37,.4],[.37,.36],[.29,-.21],[-.31,-.26]],.019,iron,steel);
    const flap=plate(g,[[-.31,.0],[.29,.05],[.4,-.41],[-.38,-.39]],.019,iron,steel);flap.position.set(0,-.22,.02);flap.rotation.x=-.58;
  };
  bent(-.42,-1.55,-.17,-.35); bent(.56,-1.72,-.3,.55);
  tube(root,[new THREE.Vector3(-.29,-.1,-.4),new THREE.Vector3(-.5,-.9,-.31),new THREE.Vector3(-.2,-1.62,-.2),new THREE.Vector3(.17,-1.7,-.22)],.021,rust);

  // Small independent adhesive decals, with visibly lifted paper corners.
  const decalMaterial = paint('#dbd9c8', undefined, 'stickers');
  for (const [x,y,z,a] of [[1.43,-.34,-.15,.3],[.82,-.72,-.09,-.2],[-1.5,.37,.14,-.35],[-.86,-.51,.14,.25],[.04,-1.24,-.09,-.1]]) {
    const d=box(root,.17,.21,.008,decalMaterial,x,y,z);d.rotation.z=a;
  }
  root.userData = { category: 'traffic', dimensions: 'approximately 3.5 × 4.8 × 1.6 world units', forwardAxis: '+Z', authoredScale: 1, seed: 81431 };
  return root;
}
