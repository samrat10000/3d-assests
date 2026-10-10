import * as T from 'three';
import {Experience,type SceneOptions,type World} from '../runtime';
import {light,v,TAU,mesh,canvasTexture,random} from '../shared';
import {batchRigid} from '../optimize';
import {createClassicCar,WHEEL_RADIUS,WHEEL_Z} from '../assets/classic';

/*
 * Dream Currency — a lime pearl finned hardtop cruising on top of a giant rolled stack of banknotes,
 * high above a pink sunset, surrounded by hot-air balloons that spill cash.
 * Loop is exactly DURATION seconds: roll turns ROLL_TURNS times, wheels turn an integer number of times,
 * every oscillator uses integer harmonics of the loop, so t=0 and t=DURATION render identically.
 */
const DURATION=24;
const R=5;                 // roll radius
const L=7;                 // roll length (axis = world Z); short, so both ends and their bands frame the car as in the reference
const BILLS_AROUND=2;      // each note's long side wraps half the circumference, so headline text and serials run around the roll
const ROLL_TURNS=2;        // R / WHEEL_RADIUS = 12.5, so 2 turns => 25 wheel turns => seamless loop
const SUN_DIR=new T.Vector3(-.74,.03,-.67).normalize(); // low sun behind the car from the hero camera; shows through under the chassis

// Camera shots (position, aim, fov). Hero = sun side, low front three-quarter; side = shaded side; head = grille-level head-on.
type Shot={pos:[number,number,number];aim:[number,number,number];fov:number};
const SHOT={
 hero:{pos:[9.8,5.15,5.6],aim:[1.0,5.6,0],fov:22} as Shot,
 heroIn:{pos:[8.8,5.08,5.0],aim:[1.1,5.6,0],fov:22} as Shot,
 head:{pos:[8.2,5.5,.45],aim:[.3,5.55,0],fov:30} as Shot,
 side:{pos:[9.8,5.15,-5.6],aim:[1.0,5.6,.2],fov:22} as Shot,
 sideIn:{pos:[8.9,5.15,-5.0],aim:[1.0,5.6,.2],fov:22} as Shot,
 head2:{pos:[8.0,5.45,-.35],aim:[.3,5.55,0],fov:30} as Shot,
 heroOut:{pos:[11,5.35,6.4],aim:[.9,5.6,0],fov:24} as Shot,
};
/** World position that lands `along` units in front of a shot's camera, offset `right`/`up` in its screen plane. */
function inShot(s:Shot,along:number,right:number,up:number):[number,number,number]{const p=new T.Vector3(...s.pos),d=new T.Vector3(...s.aim).sub(p).normalize();const r=new T.Vector3().crossVectors(d,new T.Vector3(0,1,0)).normalize();const u=new T.Vector3().crossVectors(r,d);const w=p.add(d.multiplyScalar(along)).add(r.multiplyScalar(right)).add(u.multiplyScalar(up));return [w.x,w.y,w.z]}

// ---------- textures ----------
const INK='#1c2a24',INK2='#2c3b33',PAPER='#dcd2bd';
/** Fictional banknote in the visual language of a large-denomination note: guilloche border, portrait oval, seals, big numerals. */
function banknoteCanvas(){const c=document.createElement('canvas');c.width=2048;c.height=880;const g=c.getContext('2d')!;
 g.fillStyle=PAPER;g.fillRect(0,0,2048,880);
 // paper fibres + faint wash
 const rng=random(7);for(let i=0;i<5000;i++){g.fillStyle=`rgba(${rng()<.5?'120,90,110':'90,120,100'},${.04+rng()*.06})`;g.fillRect(rng()*2048,rng()*880,1+rng()*14,1)}
 const grd=g.createLinearGradient(0,0,2048,0);grd.addColorStop(0,'rgba(210,170,170,.25)');grd.addColorStop(.5,'rgba(255,255,255,0)');grd.addColorStop(1,'rgba(200,180,150,.25)');g.fillStyle=grd;g.fillRect(0,0,2048,880);
 g.strokeStyle=INK;g.fillStyle=INK;
 // border: double frame + guilloche rope
 g.lineWidth=10;g.strokeRect(24,24,2000,832);g.lineWidth=3;g.strokeRect(46,46,1956,788);
 g.lineWidth=1.6;for(let k=0;k<6;k++){g.beginPath();for(let x=50;x<=1998;x+=2){const y=60+k*2+7*Math.sin(x*.09+k)*Math.cos(x*.013);x===50?g.moveTo(x,y):g.lineTo(x,y)}g.stroke();g.beginPath();for(let x=50;x<=1998;x+=2){const y=820-k*2+7*Math.sin(x*.09+k)*Math.cos(x*.013);x===50?g.moveTo(x,y):g.lineTo(x,y)}g.stroke()}
 // fine background lathe-work
 g.globalAlpha=.5;g.lineWidth=1.6;for(let i=0;i<60;i++){g.beginPath();for(let x=60;x<1990;x+=4){const y=95+i*11.5+5*Math.sin(x*.021+i*.7);x===60?g.moveTo(x,y):g.lineTo(x,y)}g.stroke()}g.globalAlpha=1;
 // portrait oval (generic engraved bust, hatched) – centre
 g.save();g.translate(1024,440);g.fillStyle=PAPER;g.beginPath();g.ellipse(0,0,230,300,0,0,TAU);g.fill();
 g.lineWidth=2;for(let i=0;i<14;i++){g.beginPath();g.ellipse(0,0,232+i*5,302+i*5,0,0,TAU);g.globalAlpha=.55;g.stroke()}g.globalAlpha=1;
 g.beginPath();g.ellipse(0,0,220,290,0,0,TAU);g.clip();
 g.fillStyle=INK2;g.beginPath();g.ellipse(-8,-60,105,135,-.08,0,TAU);g.fill(); // head
 g.beginPath();g.moveTo(-230,300);g.bezierCurveTo(-200,90,-120,70,-10,80);g.bezierCurveTo(110,70,210,100,240,300);g.fill(); // shoulders
 g.strokeStyle=PAPER;g.lineWidth=2;for(let y=-300;y<300;y+=9){g.beginPath();g.moveTo(-240,y);g.lineTo(240,y+40);g.stroke()} // engraving hatch
 g.fillStyle=PAPER;g.globalAlpha=.65;g.beginPath();g.ellipse(-40,-80,40,60,-.3,0,TAU);g.fill();g.globalAlpha=1;g.restore();
 // seals
 const seal=(x:number,y:number,r:number,teeth:number,label:string)=>{g.save();g.translate(x,y);g.beginPath();for(let i=0;i<=teeth*2;i++){const a=i/(teeth*2)*TAU,rr=i%2?r:r*.9;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.fillStyle=INK;g.fill();g.fillStyle=PAPER;g.beginPath();g.arc(0,0,r*.78,0,TAU);g.fill();g.strokeStyle=INK;g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.arc(0,0,r*(.72-i*.1),0,TAU);g.stroke()}g.fillStyle=INK;g.font=`bold ${r*.55}px Georgia`;g.textAlign='center';g.textBaseline='middle';g.fillText(label,0,4);g.restore()};
 seal(560,470,120,40,'F');seal(1490,520,112,48,'◆');
 // headline + denominations (fictional wording)
 g.fillStyle=INK;g.textAlign='center';g.textBaseline='alphabetic';g.font='bold 92px Georgia';g.fillText('THE UNITED STATES OF IMAGINATION',1024,150);
 g.font='italic 40px Georgia';g.fillText('FEDERAL RESERVE OF DREAMS',1024,205);
 g.font='bold 210px Georgia';g.fillText('100',230,300);g.fillText('100',1820,300);g.fillText('100',1820,800);
 g.save();g.translate(230,790);g.font='bold 150px Georgia';g.fillText('100',0,0);g.restore();
 g.font='bold 96px Georgia';g.fillText('ONE HUNDRED',1024,815);
 g.font='bold 60px Courier New';g.fillText('FL 17559462 A',470,700);g.fillText('FL 17559462 A',1590,250);
 g.font='34px Georgia';g.fillText('IN DREAMS WE TRUST',1024,760);g.font='28px Courier New';g.fillText('ART PROP — NOT LEGAL TENDER',1500,650);
 return c}
/** Roll end: tightly wound, slightly ragged paper layers, cream to warm yellow. */
function rollEndTexture(){return canvasTexture(1024,1024,g=>{const rng=random(11);g.fillStyle='#e9d3a8';g.fillRect(0,0,1024,1024);
 for(let r=508;r>8;r-=2.2){const shade=200+rng()*50;g.strokeStyle=`rgba(${shade+10},${shade-15},${shade-70},${.55+rng()*.45})`;g.lineWidth=1+rng()*1.4;g.beginPath();g.arc(512,512,r+Math.sin(r*.3)*.8,0,TAU);g.stroke();if(rng()<.18){g.strokeStyle='rgba(120,90,70,.45)';g.lineWidth=1;g.beginPath();g.arc(512,512,r,0,TAU);g.stroke()}}
 for(let i=0;i<9000;i++){const a=rng()*TAU,r=rng()*510;g.fillStyle=`rgba(${rng()<.5?'255,240,210':'140,100,80'},${.06+rng()*.12})`;g.fillRect(512+Math.cos(a)*r,512+Math.sin(a)*r,1+rng()*2,1)}
 g.fillStyle='#7d6a5b';g.beginPath();g.arc(512,512,10,0,TAU);g.fill()})}
/** Balloon envelope gores: vertical panels with darker seams/load tapes and a lighter crown band. */
function envelopeTexture(a:string,b:string,stripe?:string){return canvasTexture(1024,512,g=>{const n=16,w=1024/n;for(let i=0;i<n;i++){const col=stripe&&i%4===0?stripe:i%2?a:b;const grd=g.createLinearGradient(i*w,0,(i+1)*w,0);grd.addColorStop(0,'rgba(0,0,0,0)');g.fillStyle=col;g.fillRect(i*w,0,w+1,512);grd.addColorStop(0,'rgba(0,0,0,.45)');grd.addColorStop(.5,'rgba(255,255,255,.08)');grd.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=grd;g.fillRect(i*w,0,w+1,512)}
 g.fillStyle='rgba(20,8,10,.85)';for(let i=0;i<n;i++)g.fillRect(i*w-1.5,0,3,512);for(const y of [70,150,250,360,440])g.fillRect(0,y,1024,3)})}

// ---------- geometry builders ----------
/** One banknote wrapped around a sector of the roll, rising by `lift` toward its free edge so the layers read as shingled. */
function noteSector(k:number,material:T.Material,edge:T.Material,parent:T.Object3D){const a0=k/BILLS_AROUND*TAU,a1=(k+1)/BILLS_AROUND*TAU,lift=.04,nu=720,nv=24;const pos:number[]=[],uv:number[]=[],idx:number[]=[];
 const ridgeZone=(f:number)=>T.MathUtils.smoothstep(Math.sin(f*TAU*2.0+k*2.1)+.35*Math.sin(f*TAU*5+k),.25,.75);
 const rad=(f:number,z:number)=>R+lift*f+.008*Math.sin(z*2.3+k*1.7)*Math.sin(f*Math.PI)+.004*Math.sin(f*31+z*5)+ridgeZone(f)*.014*(((f*180)%1)-.5);
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const f=i/nu,z=-L/2+L*j/nv,a=a0+(a1-a0)*f,r=rad(f,z);pos.push(Math.cos(a)*r,Math.sin(a)*r,z);uv.push(k%2?1-f:f,k%2?1-j/nv:j/nv)}
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const p=j*(nu+1)+i,q=p+nu+1;idx.push(p,p+1,q,q,p+1,q+1)}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();mesh(g,material,parent);
 // cut edge of the bill (the visible step between layers)
 const e:number[]=[],ei:number[]=[];for(let j=0;j<=nv;j++){const z=-L/2+L*j/nv;e.push(Math.cos(a1)*(rad(1,z)),Math.sin(a1)*(rad(1,z)),z,Math.cos(a1)*(R-.002),Math.sin(a1)*(R-.002),z)}for(let j=0;j<nv;j++){const p=j*2;ei.push(p,p+1,p+2,p+1,p+3,p+2)}
 const eg=new T.BufferGeometry();eg.setAttribute('position',new T.Float32BufferAttribute(e,3));eg.setIndex(ei);eg.computeVertexNormals();mesh(eg,edge,parent)}
/** Ragged spiral end face; individual paper layers stand proud by different amounts. */
function rollEnd(side:1|-1,material:T.Material,parent:T.Object3D){const g=new T.RingGeometry(.12,R+.02,256,90);const p=g.getAttribute('position');const rng=random(side>0?3:9);const layer=Array.from({length:400},()=>rng());
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),r=Math.hypot(x,y),a=Math.atan2(y,x);const li=Math.floor(r/.0125);const out=(layer[li%400]-.5)*.05+.012*Math.sin(a*7+li)+(r>R-.25?-.04*(r-(R-.25))/.25:0);p.setZ(i,out)}
 g.computeVertexNormals();const m=mesh(g,material,parent,0,0,side*L/2);if(side<0)m.rotation.y=Math.PI;return m}
/** Flattened rubber band slightly off-square to the roll, as in the reference. */
function band(z:number,tilt:number,material:T.Material,parent:T.Object3D){const t=mesh(new T.TorusGeometry(R+.04,.04,10,220),material,parent,0,0,z);t.scale.z=3.3;t.rotation.y=tilt;t.rotation.x=tilt*.6;return t}

interface Balloon{group:T.Group;basket:T.Vector3;base:T.Vector3;phase:number}
/** Hot-air balloon: gored envelope with scalloped panels, long suspension cables, stacked hoop rings (top one glowing), basket. */
function balloon(parent:T.Object3D,pos:[number,number,number],scale:number,tex:T.Texture,phase:number,metal:T.Material,glow:T.Material,wicker:T.Material,rope:T.Material):Balloon{
 const g=new T.Group();g.position.set(...pos);g.scale.setScalar(scale);g.rotation.y=phase*2;parent.add(g);
 const pts:T.Vector2[]=[];for(let i=0;i<=24;i++){const t=i/24;pts.push(new T.Vector2(.24+(.98-.24)*Math.pow(Math.sin(t*Math.PI/2),1.35),t*1.5))}for(let i=1;i<=20;i++){const a=i/20*Math.PI/2;pts.push(new T.Vector2(Math.max(.001,.98*Math.cos(a)),1.5+1.05*Math.sin(a)))}
 const geo=new T.LatheGeometry(pts,96);const p=geo.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x);const k=1+.03*(Math.abs(Math.sin(8*a))-.63);p.setX(i,x*k);p.setZ(i,z*k)}geo.computeVertexNormals();
 const env=mesh(geo,new T.MeshStandardMaterial({map:tex,roughness:.62,side:T.DoubleSide}),g);env.castShadow=false;
 // skirt (scoop) + glowing mouth
 mesh(new T.CylinderGeometry(.24,.3,.22,32,1,true),new T.MeshStandardMaterial({color:'#2a0f12',roughness:.8,side:T.DoubleSide}),g,0,-.1,0);
 const RING_Y=[-1.45,-1.66,-1.87,-2.08],RING_R=[.33,.31,.31,.29];
 RING_Y.forEach((y,i)=>mesh(new T.TorusGeometry(RING_R[i],i===0?.026:.016,8,48),i===0?glow:metal,g,0,y,0).rotation.x=Math.PI/2);
 for(let i=0;i<16;i++){const a=i/16*TAU;const top=v(Math.cos(a)*.62,.55,Math.sin(a)*.62);const mid=v(Math.cos(a)*.5,-.4,Math.sin(a)*.5);const bot=v(Math.cos(a)*RING_R[0],RING_Y[0],Math.sin(a)*RING_R[0]);const c=mesh(new T.TubeGeometry(new T.CatmullRomCurve3([top,mid,bot]),12,.006,4),rope,g);c.castShadow=false}
 for(let i=0;i<6;i++){const a=i/6*TAU;mesh(new T.TubeGeometry(new T.LineCurve3(v(Math.cos(a)*.31,RING_Y[0],Math.sin(a)*.31),v(Math.cos(a)*.29,RING_Y[3],Math.sin(a)*.29)),1,.008,4),metal,g)}
 const BASKET_Y=-2.42;for(const [x,z] of [[-.17,-.17],[.17,-.17],[-.17,.17],[.17,.17]])mesh(new T.TubeGeometry(new T.LineCurve3(v(x*1.5,RING_Y[3],z*1.5),v(x,BASKET_Y+.16,z)),1,.006,4),rope,g);
 const basket=mesh(new T.BoxGeometry(.42,.32,.42),wicker,g,0,BASKET_Y,0);mesh(new T.TorusGeometry(.23,.025,6,4),wicker,g,0,BASKET_Y+.17,0).rotation.set(Math.PI/2,0,Math.PI/4);
 mesh(new T.SphereGeometry(.09,10,8),new T.MeshStandardMaterial({color:'#3a2b33',roughness:.8}),g,.06,BASKET_Y+.24,0); // passenger / cargo silhouette
 basket.updateMatrixWorld(true);
 return{group:g,basket:v(pos[0],pos[1]+BASKET_Y*scale,pos[2]),base:v(...pos),phase}}

export class MoneyCarScene extends Experience{constructor(el:HTMLElement,o:SceneOptions={}){super(el,async(scene,renderer,options):Promise<World>=>{
const root=new T.Group();const low=options.quality==='low';
renderer.toneMappingExposure=.95;

// ---------- sky (also used as the reflection environment) ----------
const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{sun:{value:SUN_DIR}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
fragmentShader:`uniform vec3 sun;varying vec3 p;
float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 q){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(q);q=q*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){vec3 d=normalize(p);float h=d.y;float g=max(dot(d,sun),0.);
 float sw=pow(max(dot(normalize(d.xz+1e-4),normalize(sun.xz)),0.),2.);
 vec3 horizon=mix(vec3(.98,.52,.62),vec3(1.,.56,.26),sw),mid=mix(vec3(.86,.36,.56),vec3(1.,.48,.38),sw*.6),zen=vec3(.46,.2,.46);
 vec3 col=mix(horizon,mid,smoothstep(0.,.2,h));col=mix(col,zen,smoothstep(.2,.8,h));
 // clouds: soft pink banks, brighter rims toward the sun, darker magenta bellies
 vec2 q=d.xz/(max(h,0.)+.18)*1.15;float n=fbm(q*.9+vec2(3.,1.));float n2=fbm(q*2.4-vec2(5.,2.));
 float cl=smoothstep(.36,.74,n*.75+n2*.35)*smoothstep(-.01,.06,h);
 vec3 belly=vec3(.56,.2,.42),lit=mix(vec3(1.,.62,.72),vec3(1.,.72,.42),sw);vec3 cc=mix(belly,lit,clamp(pow(g,3.)*1.4+n2*.5,0.,1.));col=mix(col,cc,cl*.85);
 // low haze band and distant hills
 float hill=.012+.02*fbm(vec2(atan(d.z,d.x)*6.,1.3));col=mix(col,vec3(.62,.46,.56),smoothstep(hill+.004,hill-.004,h)*.75);
 col=mix(col,mix(vec3(1.,.66,.72),vec3(1.,.7,.42),sw),exp(-abs(h)*24.)*.45);
 // sun: wide warm bloom, hot core, tiny disc
 col+=vec3(1.,.42,.16)*pow(g,4.)*.5+vec3(1.,.6,.3)*pow(g,36.)*1.2+vec3(1.,.85,.6)*pow(g,900.)*6.;
 col*=.74*(1.-.6*smoothstep(-.01,-.25,h));
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`});
const sky=mesh(new T.SphereGeometry(400,64,32),skyMat,scene);sky.castShadow=sky.receiveShadow=false;sky.renderOrder=-1;
const envScene=new T.Scene();envScene.add(new T.Mesh(new T.SphereGeometry(50,48,24),skyMat));const envGround=new T.Mesh(new T.CircleGeometry(40,48),new T.MeshBasicMaterial({color:'#3a2632'}));envGround.rotation.x=-Math.PI/2;envGround.position.y=-2.5;envScene.add(envGround);const pm=new T.PMREMGenerator(renderer);const envRT=pm.fromScene(envScene,.035);scene.environment=envRT.texture;pm.dispose();
scene.fog=new T.FogExp2('#d98aa3',.0042);
scene.add(new T.HemisphereLight('#ffb9d2','#6a3046',1.0));
const sunLight=light(scene,'#ffa060',3.2,[SUN_DIR.x*30,SUN_DIR.y*30+4,SUN_DIR.z*30],!low);sunLight.shadow.camera.left=-9;sunLight.shadow.camera.right=9;sunLight.shadow.camera.top=9;sunLight.shadow.camera.bottom=-9;sunLight.shadow.camera.far=80;sunLight.target.position.set(0,5,0);scene.add(sunLight.target);
light(scene,'#ffc2da',1.2,[10,9,2]);light(scene,'#ff8fb4',.8,[-6,3,9]);

// ---------- the money roll ----------
const noteCanvas=banknoteCanvas();const noteTex=new T.CanvasTexture(noteCanvas);noteTex.colorSpace=T.SRGBColorSpace;noteTex.anisotropy=8;
const paper=new T.MeshStandardMaterial({map:noteTex,roughness:.78,color:'#f0d2cc',side:T.DoubleSide});
const paperEdge=new T.MeshStandardMaterial({color:'#f2e3c6',roughness:.9,side:T.DoubleSide});
const endMat=new T.MeshStandardMaterial({map:rollEndTexture(),roughness:.95,color:'#ffe4d0',side:T.DoubleSide});
const bandMat=new T.MeshPhysicalMaterial({color:'#c46f2a',roughness:.42,clearcoat:.4,sheen:.6,sheenColor:new T.Color('#ffc58a')});
const roll=new T.Group();roll.name='Banknote roll';root.add(roll);
for(let k=0;k<BILLS_AROUND;k++)noteSector(k,paper,paperEdge,roll);
mesh(new T.CylinderGeometry(R-.01,R-.01,L-.02,96,1,true),paperEdge,roll).rotation.x=Math.PI/2; // inner backing so no gaps show
rollEnd(1,endMat,roll);rollEnd(-1,endMat,roll);
band(L/2-.45,.025,bandMat,roll);band(L/2-.85,-.04,bandMat,roll);band(-L/2+.45,-.03,bandMat,roll);band(-L/2+.9,.045,bandMat,roll);

// ---------- the car ----------
const car=createClassicCar();batchRigid(car.chassis);car.wheels.forEach(batchRigid);root.add(car.root);car.root.rotation.y=Math.PI/2; // nose to +X, perpendicular to roll axis
const contactY=(x:number)=>Math.sqrt((R+WHEEL_RADIUS)**2-x*x);
const rideY=(contactY(WHEEL_Z.front)+contactY(WHEEL_Z.rear))/2-WHEEL_RADIUS;car.root.position.y=rideY;
car.suspensions.forEach(s=>{s.position.y=contactY(s.position.z)-rideY});
const wheelRest=car.suspensions.map(s=>s.position.y);

// ---------- balloons ----------
const metal=new T.MeshStandardMaterial({color:'#2b1d1f',metalness:.8,roughness:.4});
const glow=new T.MeshStandardMaterial({color:'#ff8a3c',emissive:'#ff6a1c',emissiveIntensity:3.2});
const wicker=new T.MeshStandardMaterial({color:'#6b3a2a',roughness:.95});
const rope=new T.MeshStandardMaterial({color:'#4a2a26',roughness:.9});
const burgundy=envelopeTexture('#5f1c24','#4a141b'),rust=envelopeTexture('#6e2a22','#56201c','#8a3a26'),striped=envelopeTexture('#4b1a22','#2f3a2c','#20302a');
// Placed in each shot's screen space (along view, right, up) so the framing matches the reference compositions.
const balloons:Balloon[]=[
 balloon(root,inShot(SHOT.hero,15,5.0,1.6),2.2,burgundy,.1,metal,glow,wicker,rope),   // hero: big envelope top-right, ring stack down the right edge
 balloon(root,inShot(SHOT.hero,20,-6.2,3.8),1.5,rust,.7,metal,glow,wicker,rope),      // hero: top-left with rings + basket
 balloon(root,inShot(SHOT.hero,34,.5,5.6),1.4,striped,1.3,metal,glow,wicker,rope),    // hero: small, centred above the car
 balloon(root,inShot(SHOT.side,34,-.3,5.4),1.4,striped,1.9,metal,glow,wicker,rope),   // shaded-side shot: small, centred above the car
 balloon(root,inShot(SHOT.side,13,-4.4,2.2),1.9,burgundy,2.5,metal,glow,wicker,rope), // shaded-side shot: left edge, cables + rings
 balloon(root,[-34,15,-24],2.4,burgundy,3.7,metal,glow,wicker,rope),
 balloon(root,[-38,10,20],2.4,rust,4.3,metal,glow,wicker,rope),
 balloon(root,[-26,22,2],2.2,striped,4.9,metal,glow,wicker,rope),
 balloon(root,[-8,4.5,20],1.8,rust,5.5,metal,glow,wicker,rope),
];

// ---------- flying cash: swirling cloud + streams spilling from baskets ----------
const billTex=new T.CanvasTexture(noteCanvas);billTex.colorSpace=T.SRGBColorSpace;billTex.anisotropy=4;
const billMat=new T.MeshStandardMaterial({map:billTex,roughness:.8,side:T.DoubleSide,color:'#b7a4a6'});
billMat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z += 0.05*sin(position.x*9.0+instanceMatrix[3].x*3.0)+0.03*sin(position.y*14.0+instanceMatrix[3].y);')};
const billGeo=new T.PlaneGeometry(.44,.19,8,2);
const SWIRL=low?80:220,TRAIL_PER=low?10:26,TRAIL_SRC=[0,1,2,3];
const bills=new T.InstancedMesh(billGeo,billMat,SWIRL+TRAIL_PER*TRAIL_SRC.length);bills.castShadow=false;bills.frustumCulled=false;root.add(bills);
const rng=random(34);
const swirl=Array.from({length:SWIRL},()=>({r:2.5+rng()*13,a:rng()*TAU,y:rng(),turns:rng()<.5?1:2,fall:1+Math.floor(rng()*2),phase:rng(),spin:rng()*TAU,s:.7+rng()*.7}));
const trail=TRAIL_SRC.flatMap(b=>Array.from({length:TRAIL_PER},()=>({b,phase:rng(),dx:(rng()-.5),dz:(rng()-.5),spin:rng()*TAU,s:.6+rng()*.5})));
const dummy=new T.Object3D();

return{supportsTransparency:false,root,duration:DURATION,background:'#f3c7d6',target:v(0,5.5,0),distance:11,bloom:.42,dispose:()=>envRT.dispose(),update(t){const u=t/DURATION,phase=u*TAU;
 roll.rotation.z=phase*ROLL_TURNS;
 // Hydraulics: 4 s cycle (6 per loop) — preload, nose lift, short airborne hop, damped landing. Nose stays slightly raised at rest.
 const cycle=(t%4)/4;const pulse=(a:number,b:number)=>cycle>a&&cycle<b?Math.sin((cycle-a)/(b-a)*Math.PI):0;
 const lift=pulse(.12,.6);const hop=.16*Math.pow(pulse(.3,.62),1.5);const landing=cycle>.62&&cycle<.96?Math.sin((cycle-.62)/.34*Math.PI*3)*Math.exp(-(cycle-.62)*11):0;
 const suspension=.0+.06*lift-.03*landing;const pitch=.008+.045*lift-.02*landing;
 car.root.position.y=rideY+hop;car.update(phase*ROLL_TURNS*R/WHEEL_RADIUS,suspension);car.chassis.rotation.x=-pitch;car.chassis.rotation.z=.012*Math.sin(phase*6);
 car.suspensions.forEach((s,i)=>{s.position.y=wheelRest[i]+(s.position.z>0?.05*lift:0)});
 root.userData.motion={hop,suspension,pitch,cycle};
 balloons.forEach((b,i)=>{b.group.position.copy(b.base);b.group.position.y+=.35*Math.sin(phase+b.phase*3);b.group.position.x+=.25*Math.sin(phase*2+i);b.group.rotation.z=.02*Math.sin(phase+i)});
 let n=0;
 for(const p of swirl){const age=(u*p.fall+p.phase)%1;const a=p.a+phase*(p.r<7?p.turns:1); /* integer turns per loop keeps the cash cloud seamless */dummy.position.set(Math.cos(a)*p.r,16-age*13+.5*Math.sin(age*TAU*3),Math.sin(a)*p.r*.85);dummy.rotation.set(age*TAU*3+p.spin,p.spin+phase*2,Math.sin(age*TAU*2+p.spin));dummy.scale.setScalar(p.s);dummy.updateMatrix();bills.setMatrixAt(n++,dummy.matrix)}
 for(const p of trail){const b=balloons[p.b];const age=(u*3+p.phase)%1;const o=b.group.position;const bx=b.basket.x-b.base.x+o.x,by=b.basket.y-b.base.y+o.y,bz=b.basket.z-b.base.z+o.z;dummy.position.set(bx+p.dx*(.4+age*3)+.4*Math.sin(age*TAU*2+p.spin),by-age*9,bz+p.dz*(.4+age*3));dummy.rotation.set(age*TAU*4+p.spin,p.spin,age*TAU*2);dummy.scale.setScalar(p.s*Math.min(1,age*8));dummy.updateMatrix();bills.setMatrixAt(n++,dummy.matrix)}
 bills.instanceMatrix.needsUpdate=true;
},camera(t,c){
 // Shot order from the reference: low front-3/4 hero into the sun, whip to head-on, front-3/4 from the shaded side,
 // head-on again, then back to the sun-side hero for a slow pull. Camera stays near the roll's surface, looking up.
 type K=[number,Shot];
 const keys:K[]=[[0,SHOT.hero],[4.6,SHOT.heroIn],[5.7,SHOT.head],[6.8,SHOT.side],[13,SHOT.sideIn],[14.1,SHOT.head2],[15.3,SHOT.heroIn],[21.5,SHOT.heroOut],[24,SHOT.hero]];
 let i=0;while(i<keys.length-2&&t>=keys[i+1][0])i++;const a=keys[i],b=keys[i+1];const f=(t-a[0])/(b[0]-a[0]);const s=f*f*(3-2*f);
 const pos=v(...a[1].pos).lerp(v(...b[1].pos),s),aim=v(...a[1].aim).lerp(v(...b[1].aim),s);const fov=a[1].fov+(b[1].fov-a[1].fov)*s;
 // handheld drift: integer harmonics of the loop so it closes seamlessly
 const w=t/DURATION*TAU;pos.x+=.05*Math.sin(w*7)+.02*Math.sin(w*19);pos.y+=.04*Math.sin(w*9+1)+.015*Math.sin(w*23);aim.y+=.03*Math.sin(w*11+2);
 if(c.aspect<.8)pos.sub(aim).multiplyScalar(1.5).add(aim);
 if(Math.abs(c.fov-fov)>.01){c.fov=fov;c.updateProjectionMatrix()}c.position.copy(pos);c.lookAt(aim);
}}},o)}}
