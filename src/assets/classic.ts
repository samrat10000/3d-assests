import * as THREE from 'three';

/** Hand-built 1960s American coupe; +Z is the nose, Y=0 is the road. */
export function createClassicCar(): { root: THREE.Group; chassis: THREE.Group; wheels: THREE.Object3D[]; update: (spin: number, bounce: number, steer?: number) => void } {
  const root = new THREE.Group(); root.name = 'Emerald sixty-four coupe';
  const chassis = new THREE.Group(); root.add(chassis); chassis.name = 'Suspended coachwork';
  const green = new THREE.MeshPhysicalMaterial({ color: '#176b48', roughness: .24, metalness: .72, clearcoat: 1, clearcoatRoughness: .14 });
  const deepGreen = new THREE.MeshPhysicalMaterial({ color: '#094533', roughness: .3, metalness: .64, clearcoat: .8 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#d4ded4', roughness: .18, metalness: 1 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#101313', roughness: .9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#111b17', roughness: .68 });
  const ivory = new THREE.MeshPhysicalMaterial({ color: '#ece5cf', roughness: .32, metalness: .32, clearcoat: 1 });
  const leather = new THREE.MeshStandardMaterial({ color: '#a99470', roughness: .84 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#8cbbb5', transparent: true, opacity: .45, metalness: .16, roughness: .1, side: THREE.DoubleSide, depthWrite: false });
  const lamp = new THREE.MeshPhysicalMaterial({ color: '#fff1bd', emissive: '#ffdda0', emissiveIntensity: .75, roughness: .2, metalness: .15 });
  const red = new THREE.MeshPhysicalMaterial({ color: '#aa170c', emissive: '#aa170c', emissiveIntensity: .32, roughness: .21, clearcoat: 1 });
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Object3D = chassis) => { const o = new THREE.Mesh(g,m);o.castShadow=o.receiveShadow=true;p.add(o);return o; };
  const surface = (fn:(u:number,v:number)=>[number,number,number], nu:number,nv:number,m:THREE.Material,p:THREE.Object3D=chassis) => {
    const verts:number[]=[], uv:number[]=[], indices:number[]=[];
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){verts.push(...fn(i/nu,j/nv));uv.push(i/nu,j/nv);}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+nu+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(g,m,p);
  };
  const rounded = (w:number,h:number,d:number,r:number,m:THREE.Material,p:THREE.Object3D=chassis) => {
    const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r*.6,bevelThickness:r,bevelSegments:3,steps:1,curveSegments:8});g.translate(0,0,-d/2+r);return mesh(g,m,p);
  };
  const line = (points: [number,number,number][], radius:number,m:THREE.Material=chrome,p:THREE.Object3D=chassis) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),Math.max(12,points.length*6),radius,6,false),m,p);
  const torus = (r:number,t:number,m:THREE.Material,p:THREE.Object3D=chassis) => mesh(new THREE.TorusGeometry(r,t,12,64),m,p);
  const width = (z:number) => 1.00-.10*Math.pow(Math.abs(z)/2.36,6);
  const top = (z:number) => 1.03 + .035*Math.cos(z*1.3) - .045*Math.pow(Math.abs(z)/2.36,8);
  // Continuous stamped upper body: a crown, rounded shoulder and vertical flank.
  surface((u,v)=>{const z=-2.3+v*4.6,x=(u*2-1)*width(z);return [x,top(z)-.085*Math.pow(Math.abs(u*2-1),7),z];},32,96,green);
  const archBottom = (z:number) => {let y=.38;for(const c of [-1.48,1.43])if(Math.abs(z-c)<.5)y=Math.max(y,.43+Math.sqrt(.25-(z-c)*(z-c)));return y;};
  for(const side of [-1,1]) {
    const bodySide=green.clone();bodySide.side=THREE.DoubleSide;
    surface((u,v)=>{const z=-2.3+u*4.6;const bottom=archBottom(z), y=bottom+(top(z)-.085-bottom)*v;return [side*(width(z)+.018*Math.sin(v*Math.PI)-.023*(1-v)),y,z];},180,10,bodySide);
    // Fine chrome wheel-arch bead, independently curved over the cutout.
    for(const wz of [-1.48,1.43]) {
      const pts:[number,number,number][]=[];for(let i=0;i<=36;i++){const a=i/36*Math.PI;pts.push([side*1.016,.43+Math.sin(a)*.506,wz+Math.cos(a)*.506]);}line(pts,.016);
      const lining=new THREE.MeshStandardMaterial({color:'#0b1210',roughness:.9,side:THREE.DoubleSide});
      surface((u,v)=>{const a=u*Math.PI;return [side*(.79+v*.21),.43+Math.sin(a)*.496,wz+Math.cos(a)*.496];},32,3,lining);
    }
    line([[side*.985,.85,-2.24],[side*1.019,.875,-1.1],[side*1.023,.875,.4],[side*.987,.845,2.25]],.019);
    line([[side*.977,.43,-.93],[side*.993,.43,0],[side*.984,.43,.89]],.018);
    // Door shut lines are narrow recessed seams, following the belt curvature.
    line([[side*1.007,.95,-.75],[side*1.013,.57,-.73],[side*1.013,.47,-.57],[side*1.013,.47,.66],[side*1.013,.64,.79],[side*1.007,.97,.81]],.006,dark);
    const handle=rounded(.115,.026,.028,.008,chrome);handle.rotation.y=Math.PI/2;handle.position.set(side*1.033,.925,-.51);
    const lock=mesh(new THREE.SphereGeometry(.014,12,8),chrome);lock.scale.x=.35;lock.position.set(side*1.038,.888,-.51);
  }
  // Curved end panels and a low black chassis visible beneath the suspension.
  for(const z of [-2.3,2.3]){const panel=rounded(1.83,.51,.09,.045,green);panel.position.set(0,.705,z);}
  const underside=rounded(1.6,.09,3.95,.035,dark);underside.position.y=.4;
  // Cabin is a smoothly tapered hardtop with canted A and C pillars.
  // Roof length is deliberately short relative to the long hood and trunk.
  surface((u,v)=>{const z=-.97+v*1.61,x=(u*2-1)*(.745+.028*Math.sin(v*Math.PI));return [x,1.62+.068*Math.sin(u*Math.PI)+.014*Math.sin(v*Math.PI),z];},28,32,ivory);
  const windshield=surface((u,v)=>{const width=.765+v*.13;return [(u*2-1)*width,1.62-v*.59+.018*Math.sin(u*Math.PI),.64+v*.53];},24,12,glass);windshield.name='Curved front windshield';
  surface((u,v)=>[(u*2-1)*(.745+v*.15),1.62-v*.59,-.97-v*.54],24,12,glass);
  for(const side of [-1,1]) {
    const sideWindow=surface((u,v)=>{const z=(-.97-v*.54)+u*(1.61+v*1.07);return [side*(.75+v*.145),1.62-v*.59,z];},20,10,glass);sideWindow.name='Side glazing';
    line([[side*.89,1.05,1.16],[side*.80,1.46,.79],[side*.755,1.62,.64]],.035,ivory);
    line([[side*.755,1.62,-.97],[side*.8,1.43,-1.12],[side*.89,1.05,-1.51]],.063,ivory);
    line([[side*.75,1.62,-.97],[side*.775,1.63,-.3],[side*.755,1.62,.64]],.018);
    line([[side*.893,1.045,-1.49],[side*.91,1.045,-.2],[side*.89,1.045,1.15]],.022);
    line([[side*.895,1.05,.72],[side*.783,1.54,.72]],.013);
    line([[side*.895,1.05,-.64],[side*.757,1.61,-.64]],.021,chrome);
    // Mirrors: narrow stem and polished oval back.
    line([[side*.925,1.02,.85],[side*1.09,1.14,.82]],.022);
    const mirror=mesh(new THREE.SphereGeometry(1,20,12),chrome);mirror.scale.set(.11,.055,.07);mirror.position.set(side*1.11,1.15,.83);
  }
  line([[-.755,1.62,.64],[0,1.655,.64],[.755,1.62,.64]],.021);line([[-.89,1.045,1.17],[0,1.065,1.17],[.89,1.045,1.17]],.023);
  line([[-.75,1.62,-.97],[0,1.655,-.97],[.75,1.62,-.97]],.021);
  // Seats and dashboard are visible through the physically shaded glazing.
  for(const z of [-.8,.08]) {
    const seat=rounded(1.45,.17,.48,.055,leather);seat.position.set(0,.77,z);
    const back=rounded(1.45,.42,.17,.055,leather);back.position.set(0,.99,z-.2);back.rotation.x=-.09;
    for(let i=0;i<12;i++)line([[-.66+i*.12,.84,z+.18],[-.66+i*.12,.86,z-.17],[-.66+i*.12,1.15,z-.225]],.006,ivory);
  }
  const dash=rounded(1.65,.15,.28,.05,deepGreen);dash.position.set(0,1.035,.85);
  const steering=torus(.145,.012,chrome);steering.position.set(-.43,1.13,.65);steering.rotation.x=-.6;
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;line([[-.43,1.13,.65],[-.43+Math.cos(a)*.135,1.13+Math.sin(a)*.112,.65-Math.sin(a)*.077]],.007);}
  // A long divided hood with stamped ridges and tiny crest.
  for(const side of [-1,1])line([[side*.48,1.06,1.21],[side*.47,1.052,1.7],[side*.43,1.012,2.25]],.008,deepGreen);
  line([[0,1.063,1.2],[0,1.05,1.8],[0,1.004,2.28]],.007,chrome);
  const crest=mesh(new THREE.OctahedronGeometry(.045),chrome);crest.scale.set(.65,1,.25);crest.position.set(0,1.02,2.17);
  // Wide inset egg-crate grille, dual lamps and wraparound chromed bumpers.
  const grille=rounded(1.7,.3,.07,.03,dark);grille.position.set(0,.74,2.354);
  for(let i=0;i<30;i++){const bar=rounded(.012,.26,.024,.003,chrome);bar.position.set(-.78+i*.054,.75,2.399);}
  for(const y of [.635,.705,.785,.865])line([[-.81,y,2.405],[0,y,2.412],[.81,y,2.405]],.008);
  for(const side of [-1,1])for(const x of [.65,.86]) {
    const bezel=torus(.102,.019,chrome);bezel.position.set(side*x,.83,2.417);
    const headlight=mesh(new THREE.SphereGeometry(.09,24,16),lamp);headlight.scale.z=.25;headlight.position.set(side*x,.83,2.426);
    for(let i=-3;i<=3;i++)line([[side*x+i*.022,.774,2.444],[side*x+i*.022,.884,2.444]],.002,ivory);
  }
  for(const z of [-2.37,2.38]) {
    const bumper=rounded(1.96,.14,.15,.042,chrome);bumper.position.set(0,.49,z);
    for(const side of [-1,1]){const end=rounded(.14,.14,.39,.04,chrome);end.position.set(side*.941,.49,z-Math.sign(z)*.16);}
    const license=rounded(.31,.115,.018,.01,ivory);license.position.set(0,.575,z+Math.sign(z)*.085);
    const face=rounded(.22,.022,.01,.005,dark);face.position.set(0,.58,z+Math.sign(z)*.098);
  }
  for(const side of [-1,1])for(const x of [.5,.69,.86]) {const r=torus(.062,.012,chrome);r.position.set(side*x,.78,-2.36);const light=mesh(new THREE.SphereGeometry(.057,18,12),red);light.scale.z=.28;light.position.set(side*x,.78,-2.37);}
  line([[-.9,.92,-2.35],[0,.94,-2.35],[.9,.92,-2.35]],.012);
  for(const side of [-1,1]) {const exhaust=mesh(new THREE.CylinderGeometry(.035,.035,.22,16),chrome);exhaust.rotation.x=Math.PI/2;exhaust.position.set(side*.65,.335,-2.2);}

  // Wheel groups are independent suspension pivots. Local X is each axle.
  const wheels:THREE.Object3D[]=[];const suspensions:THREE.Group[]=[];
  for(const z of [-1.48,1.43])for(const side of [-1,1]) {
    const pivot=new THREE.Group();pivot.position.set(side*.965,.435,z);root.add(pivot);suspensions.push(pivot);
    const wheel=new THREE.Group();pivot.add(wheel);wheels.push(wheel);wheel.name=`${z>0?'Front':'Rear'} ${side>0?'right':'left'} wheel`;
    const tire=torus(.334,.098,rubber,wheel);tire.rotation.y=Math.PI/2;tire.scale.z=1.38;
    const barrel=mesh(new THREE.CylinderGeometry(.295,.295,.18,48),dark,wheel);barrel.rotation.z=Math.PI/2;
    for(const face of [-1,1]) {
      const lip=torus(.292,.022,chrome,wheel);lip.rotation.y=Math.PI/2;lip.position.x=face*.11;
      const whitewall=torus(.351,.011,ivory,wheel);whitewall.rotation.y=Math.PI/2;whitewall.position.x=face*.117;
      const ring=torus(.227,.011,chrome,wheel);ring.rotation.y=Math.PI/2;ring.position.x=face*.117;
      for(let i=0;i<20;i++) {const a=i*Math.PI/10;line([[face*.123,Math.cos(a)*.068,Math.sin(a)*.068],[face*.132,Math.cos(a+.10)*.215,Math.sin(a+.10)*.215],[face*.11,Math.cos(a)*.282,Math.sin(a)*.282]],.008,chrome,wheel);}
      const hub=mesh(new THREE.CylinderGeometry(.069,.069,.045,24),chrome,wheel);hub.rotation.z=Math.PI/2;hub.position.x=face*.135;
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const nut=mesh(new THREE.SphereGeometry(.012,8,6),dark,wheel);nut.position.set(face*.162,Math.cos(a)*.045,Math.sin(a)*.045);}
      for(let i=0;i<48;i++){const a=i*Math.PI/24;line([[face*.063,Math.cos(a)*.427,Math.sin(a)*.427],[face*.09,Math.cos(a+.014)*.42,Math.sin(a+.014)*.42]],.004,dark,wheel);}
    }
    // Exposed spring and metallic strut under the raised lowrider body.
    const spring: [number,number,number][]=[];for(let i=0;i<80;i++){const a=i/79*Math.PI*12;spring.push([side*.76+.048*Math.cos(a),.42+i/79*.35,z+.048*Math.sin(a)]);}line(spring,.01,chrome);
  }
  root.userData={asset:'procedural classic coupe',forwardAxis:'+Z',length:4.9};
  return {root,chassis,wheels,update(spin,bounce,steer=0){chassis.position.y=bounce;chassis.rotation.z=Math.sin(bounce*4)*.025;wheels.forEach(w=>w.rotation.x=spin);suspensions.forEach(p=>{p.rotation.y=p.position.z>0?steer:0;});}};
}
