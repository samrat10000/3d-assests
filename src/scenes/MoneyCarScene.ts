import * as T from 'three';
import {Experience,type SceneOptions,type World} from '../runtime';
import {light,v,TAU,mesh,canvasTexture,random} from '../shared';
import {batchRigid} from '../optimize';
import {createClassicCar,WHEEL_RADIUS,WHEEL_Z} from '../assets/classic';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

/** Filmic finish in linear HDR before OutputPass: magenta shadow lift, warm highlights, slight saturation, vignette, fine grain. */
const GradeShader={uniforms:{tDiffuse:{value:null},time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
fragmentShader:`uniform sampler2D tDiffuse;uniform float time;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));
 c=mix(vec3(l),c,1.12);
 c+=vec3(.045,.012,.035)*(1.-smoothstep(0.,.35,l));
 c*=mix(vec3(1.),vec3(1.06,.95,.9),smoothstep(.4,1.5,l));
 vec2 v=vUv-.5;c*=mix(.5,1.,smoothstep(.82,.22,length(v*vec2(1.15,1.))));
 c+=(hash(vUv*vec2(1920.,1080.)+time)-.5)*.012;
 gl_FragColor=vec4(max(c,0.),1.);}`};

/*
 * Dream Currency — a lime pearl finned hardtop cruising on top of a giant rolled stack of banknotes,
 * high above a pink sunset, surrounded by hot-air balloons that spill cash.
 * Loop is exactly DURATION seconds: roll turns ROLL_TURNS times, wheels turn an integer number of times,
 * every oscillator uses integer harmonics of the loop, so t=0 and t=DURATION render identically.
 */
const DURATION=24;
const MOVES=['nose','nose','threeL','nose','sway','threeR'] as const; // one hydraulic move per 4 s
const TRAVEL=.2;                // suspension droop before a wheel leaves the roll
const R=5;                 // roll radius
const L=7;                 // roll length (axis = world Z); short, so both ends and their bands frame the car as in the reference
const BILLS_AROUND=2;      // each note's long side wraps half the circumference, so headline text and serials run around the roll
const ROLL_TURNS=2;        // R / WHEEL_RADIUS = 12.5, so 2 turns => 25 wheel turns => seamless loop
const SUN_DIR=new T.Vector3(-.78,.014,-.63).normalize(); // low sun behind the car from the hero camera; shows through under the chassis

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
const INK='#17241d',GREEN='#2d6a47',PAPER='#e6e2cf';
/** Hundred-dollar-style note (classic large-portrait series): ornate border, headline, portrait oval, black FR seal, green Treasury seal, green serials, corner 100s. */
function banknoteCanvas(){const c=document.createElement('canvas');c.width=2048;c.height=880;const g=c.getContext('2d')!;const rng=random(7);
 g.fillStyle=PAPER;g.fillRect(0,0,2048,880);
 // paper: faint green tint, red/blue security fibres, soft ageing at the edges
 const wash=g.createRadialGradient(1024,440,200,1024,440,1150);wash.addColorStop(0,'rgba(220,235,215,.35)');wash.addColorStop(1,'rgba(170,160,120,.35)');g.fillStyle=wash;g.fillRect(0,0,2048,880);
 for(let i=0;i<900;i++){g.strokeStyle=rng()<.5?'rgba(170,40,50,.35)':'rgba(40,60,160,.35)';g.lineWidth=1;const x=rng()*2048,y=rng()*880;g.beginPath();g.moveTo(x,y);g.lineTo(x+(rng()-.5)*14,y+(rng()-.5)*14);g.stroke()}
 g.textAlign='center';g.textBaseline='alphabetic';
 // ornate border: heavy outer frame, inner line, rope of guilloche loops
 g.strokeStyle=INK;g.lineWidth=14;g.strokeRect(22,22,2004,836);g.lineWidth=3;g.strokeRect(48,48,1952,784);g.strokeRect(58,58,1932,764);
 g.lineWidth=1.4;for(const [y0,dir] of [[38,1],[842,-1]] as [number,number][]){for(let k=0;k<3;k++){g.beginPath();for(let x=30;x<=2018;x+=2){const y=y0+dir*(Math.sin(x*.11+k*2.1)*5+k)*1;x===30?g.moveTo(x,y):g.lineTo(x,y)}g.stroke()}}
 for(const [x0,dir] of [[38,1],[2010,-1]] as [number,number][]){for(let k=0;k<3;k++){g.beginPath();for(let y=30;y<=850;y+=2){const x=x0+dir*(Math.sin(y*.11+k*2.1)*5+k);y===30?g.moveTo(x,y):g.lineTo(x,y)}g.stroke()}}
 // background lathe-work: fine green wave lines + rosettes behind the numerals
 g.strokeStyle='rgba(45,106,71,.38)';g.lineWidth=1.1;for(let i=0;i<70;i++){g.beginPath();for(let x=66;x<1984;x+=4){const y=70+i*10.6+4*Math.sin(x*.018+i*.6)+2*Math.sin(x*.07);x===66?g.moveTo(x,y):g.lineTo(x,y)}g.stroke()}
 const rosette=(x:number,y:number,r:number)=>{g.save();g.translate(x,y);g.strokeStyle='rgba(23,36,29,.75)';g.lineWidth=1.2;for(let k=0;k<36;k++){g.rotate(TAU/36);g.beginPath();g.ellipse(r*.5,0,r*.5,r*.18,0,0,TAU);g.stroke()}g.restore()};
 for(const [x,y] of [[190,190],[1858,190],[190,690],[1858,690]])rosette(x,y,120);
 // corner numerals (bottom right is the large one)
 g.fillStyle=INK;g.font='bold 150px Georgia';for(const [x,y] of [[190,240],[1858,240],[190,740]])g.fillText('100',x,y);
 g.fillStyle=GREEN;g.font='bold 190px Georgia';g.fillText('100',1810,790);
 // headline and subtitle
 g.fillStyle=INK;g.font='bold 96px Georgia';g.fillText('THE UNITED STATES OF AMERICA',1024,150);
 g.font='bold 40px Georgia';g.fillText('FEDERAL RESERVE NOTE',560,215);
 g.font='26px Georgia';g.fillText('THIS NOTE IS LEGAL TENDER',520,560);g.fillText('FOR ALL DEBTS, PUBLIC AND PRIVATE',520,592);
 // portrait oval: heavy ornamental frame, engraved bust with dense hatching, name scroll beneath
 g.save();g.translate(1024,440);
 for(let i=0;i<22;i++){g.strokeStyle=i%3?'rgba(23,36,29,.55)':INK;g.lineWidth=i%3?1.4:3;g.beginPath();g.ellipse(0,0,250+i*4.5,300+i*4.5,0,0,TAU);g.stroke()}
 g.fillStyle='#d9d6c2';g.beginPath();g.ellipse(0,0,248,298,0,0,TAU);g.fill();g.beginPath();g.ellipse(0,0,248,298,0,0,TAU);g.clip();
 g.strokeStyle='rgba(23,36,29,.5)';g.lineWidth=1.2;for(let y=-300;y<300;y+=6){g.beginPath();g.moveTo(-260,y);g.lineTo(260,y);g.stroke()}
 g.fillStyle=INK;g.beginPath();g.moveTo(-250,300);g.bezierCurveTo(-230,120,-150,70,-40,60);g.lineTo(40,60);g.bezierCurveTo(150,70,230,120,250,300);g.fill(); // coat + shoulders
 g.fillStyle='#e9e5d3';g.beginPath();g.moveTo(-45,62);g.lineTo(0,170);g.lineTo(45,62);g.fill(); // collar / cravat
 g.fillStyle='#4a5a50';g.beginPath();g.ellipse(-6,-55,108,138,-.05,0,TAU);g.fill(); // head
 g.fillStyle='#2a3830';g.beginPath();g.ellipse(-10,-120,118,92,0,Math.PI*1.02,Math.PI*1.98);g.fill();g.beginPath();g.ellipse(-110,-20,40,110,.15,0,TAU);g.fill();g.beginPath();g.ellipse(100,-20,40,110,-.15,0,TAU);g.fill(); // long hair at the sides
 g.fillStyle='rgba(233,229,211,.55)';g.beginPath();g.ellipse(-30,-70,46,70,-.2,0,TAU);g.fill(); // highlight on the face
 g.strokeStyle='rgba(23,36,29,.65)';g.lineWidth=1.6;for(let y=-200;y<300;y+=7){g.beginPath();g.moveTo(-260,y+40);g.lineTo(260,y-40);g.stroke()} // engraving cross-hatch
 g.restore();
 g.fillStyle=PAPER;g.fillRect(900,760,248,40);g.strokeStyle=INK;g.lineWidth=2;g.strokeRect(900,760,248,40);g.fillStyle=INK;g.font='bold 26px Georgia';g.fillText('FRANKLIN',1024,789);
 // black Federal Reserve seal (left) and green Treasury seal (right)
 const seal=(x:number,y:number,r:number,teeth:number,col:string,ring:string,mid:string)=>{g.save();g.translate(x,y);g.beginPath();for(let i=0;i<=teeth*2;i++){const a=i/(teeth*2)*TAU,rr=i%2?r:r*.9;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.fillStyle=col;g.fill();g.fillStyle=PAPER;g.beginPath();g.arc(0,0,r*.8,0,TAU);g.fill();g.strokeStyle=col;g.lineWidth=3;g.beginPath();g.arc(0,0,r*.78,0,TAU);g.stroke();g.beginPath();g.arc(0,0,r*.52,0,TAU);g.stroke();
  g.fillStyle=col;g.font=`bold ${r*.13}px Georgia`;const chars=ring.split('');chars.forEach((ch,i)=>{g.save();g.rotate(-Math.PI*.85+i/chars.length*Math.PI*1.7);g.translate(0,-r*.6);g.fillText(ch,0,0);g.restore()});
  g.font=`bold ${r*.6}px Georgia`;g.textBaseline='middle';g.fillText(mid,0,4);g.textBaseline='alphabetic';g.restore()};
 seal(560,400,118,40,INK,'FEDERAL RESERVE BANK','B');
 seal(1490,500,112,48,GREEN,'THE DEPARTMENT OF THE TREASURY','⚖');
 // green serial numbers, check letter, plate position
 g.fillStyle=GREEN;g.font='bold 58px Courier New';g.fillText('AB 17559462 C',500,690);g.fillText('AB 17559462 C',1560,280);
 g.fillStyle=INK;g.font='bold 34px Georgia';g.fillText('B 2',330,330);g.fillText('B 2',1720,620);
 // denomination line
 g.font='bold 92px Georgia';g.fillText('ONE HUNDRED DOLLARS',1024,846-30);
 // signatures
 g.strokeStyle=INK;g.lineWidth=2.5;for(const x0 of [470,1440]){g.beginPath();for(let x=0;x<230;x+=3){const y=640+12*Math.sin(x*.09)+6*Math.sin(x*.31);x===0?g.moveTo(x0+x,y+80):g.lineTo(x0+x,y+80)}g.stroke()}
 g.font='20px Georgia';g.fillText('TREASURER OF THE UNITED STATES',585,760);g.fillText('SECRETARY OF THE TREASURY',1555,760);
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

/** Burner jet: open cone (base at y=0, tip at y=1) drawn additively. `power` 0..1 drives length, width and heat;
 *  turbulence scrolls up the jet and frays the tip. All motion uses `u` (loop fraction) with integer rates, so it loops cleanly. */
const FlameShader={uniforms:{u:{value:0},power:{value:0},seed:{value:0},core:{value:new T.Color(1,1,1)},hot:{value:new T.Color(1,.6,.2)},tip:{value:new T.Color(.9,.15,.05)},gain:{value:1}},
vertexShader:`uniform float u,power,seed;varying float vy;varying vec3 vN,vV;
void main(){vec3 p=position;float y=p.y;float len=power*(.75+.25*sin(u*6.2831*173.+seed*7.));
 p.xz*=mix(.55,1.,power)*(1.+.25*sin(y*14.-u*6.2831*240.+seed));p.y*=len;
 p.x+=.06*y*y*len*sin(u*6.2831*131.+seed*3.);p.z+=.06*y*y*len*cos(u*6.2831*157.+seed*5.);
 vy=y;vec4 mv=modelViewMatrix*vec4(p,1.);vV=normalize(-mv.xyz);vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}`,
fragmentShader:`uniform float u,power,seed,gain;uniform vec3 core,hot,tip;varying float vy;varying vec3 vN,vV;
float h(float x){return fract(sin(x)*43758.5453);}
void main(){if(power<.01)discard;float rim=pow(abs(dot(normalize(vN),normalize(vV))),1.5);
 float streak=.6+.4*sin(vy*22.-u*6.2831*380.+seed*11.)*sin(vy*9.-u*6.2831*210.+seed);
 vec3 c=mix(core,hot,smoothstep(0.,.35,vy));c=mix(c,tip,smoothstep(.45,1.,vy));
 float a=clamp(rim*pow(1.-vy,1.2)*streak*power*gain,0.,1.);gl_FragColor=vec4(c*3.2,a);}`};
/** Seeded, irregular on/off firing schedule for one burner over the loop: bursts of 0.2–1.8 s, gaps of 0.3–5 s, occasional rapid blips. */
function burnSchedule(seed:number,duration:number){const rng=random(seed*7919+13);const ev:[number,number][]=[];let t=rng()*4;
 while(t<duration){const blip=rng()<.25;const n=blip?2+Math.floor(rng()*3):1;for(let i=0;i<n&&t<duration;i++){const d=blip?.12+rng()*.18:.35+rng()*1.5;ev.push([t,t+d]);t+=d+(blip?.12+rng()*.2:0)}t+=.3+rng()*4.7}
 return(time:number)=>{let p=0;for(const [a,b] of ev)for(const o of [0,-duration,duration]){const x=time+o;if(x>a-.001&&x<b+.15){const up=Math.min(1,(x-a)/.06),down=x>b?1-(x-b)/.15:1;p=Math.max(p,Math.max(0,Math.min(up,down)))}}return p}}
interface Burner{mats:T.ShaderMaterial[];glow:T.Mesh;fire:(t:number)=>number}
interface Balloon{group:T.Group;basket:T.Vector3;base:T.Vector3;phase:number;burners:Burner[];ring:T.MeshStandardMaterial;mouths:T.Vector3[]}
/** Shared look for every balloon: hand-woven wicker, padded leather, suede pole covers, plated burner, burlap money sacks. */
function balloonKit(glow:T.Material,metal:T.Material,rope:T.Material,note:HTMLCanvasElement){
 const weave=canvasTexture(256,256,g=>{g.fillStyle='#3a1f14';g.fillRect(0,0,256,256);const rng=random(5);
  for(let row=0;row<16;row++)for(let col=0;col<16;col++){const over=(row+col)%2===0;const x=col*16,y=row*16;const grd=over?g.createLinearGradient(x,y,x,y+16):g.createLinearGradient(x,y,x+16,y);const base=150+rng()*40;grd.addColorStop(0,`rgb(${base*.55},${base*.33},${base*.18})`);grd.addColorStop(.5,`rgb(${base},${base*.68},${base*.38})`);grd.addColorStop(1,`rgb(${base*.5},${base*.3},${base*.16})`);g.fillStyle=grd;over?g.fillRect(x+1,y+2,14,12):g.fillRect(x+2,y+1,12,14)}});
 weave.wrapS=weave.wrapT=T.RepeatWrapping;weave.repeat.set(3,2);
 // Coarse burlap: irregular warp/weft threads, slub noise, a stitched side seam and a worn stencilled "$".
 const sackTex=canvasTexture(512,512,g=>{const rng=random(21);g.fillStyle='#a78152';g.fillRect(0,0,512,512);
  for(let i=0;i<512;i+=5){const w=2+rng()*2;g.fillStyle=`rgba(${60+rng()*40},${40+rng()*25},${20+rng()*15},${.35+rng()*.25})`;g.fillRect(i,0,w*.4,512);g.fillStyle=`rgba(${200+rng()*40},${165+rng()*30},${110+rng()*30},${.25+rng()*.2})`;g.fillRect(0,i+rng(),512,w*.5)}
  for(let i=0;i<1800;i++){g.fillStyle=`rgba(${rng()<.5?'70,45,25':'225,195,140'},${.1+rng()*.25})`;g.fillRect(rng()*512,rng()*512,1+rng()*6,1)}
  g.strokeStyle='rgba(60,38,20,.8)';g.lineWidth=3;g.setLineDash([10,7]);g.beginPath();g.moveTo(8,0);g.lineTo(8,512);g.stroke();g.setLineDash([]);
  g.save();g.globalAlpha=.78;g.fillStyle='#24432c';g.font='bold 210px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillText('$',256,300);g.globalAlpha=.35;g.fillStyle='#a78152';for(let i=0;i<260;i++)g.fillRect(150+rng()*210,180+rng()*240,2+rng()*8,1+rng()*3);g.restore();
  const fold=g.createLinearGradient(0,0,0,512);fold.addColorStop(0,'rgba(40,25,10,.45)');fold.addColorStop(.25,'rgba(40,25,10,0)');fold.addColorStop(.85,'rgba(40,25,10,0)');fold.addColorStop(1,'rgba(40,25,10,.35)');g.fillStyle=fold;g.fillRect(0,0,512,512)});
 return{glow,metal,rope,
  wicker:new T.MeshStandardMaterial({map:weave,bumpMap:weave,bumpScale:2,roughness:.92,side:T.DoubleSide}),
  leather:new T.MeshStandardMaterial({color:'#3b2016',roughness:.55}),
  suede:new T.MeshStandardMaterial({color:'#24161a',roughness:.95}),
  plated:new T.MeshStandardMaterial({color:'#d8cdc6',metalness:1,roughness:.18}),
  tank:new T.MeshStandardMaterial({color:'#5c1f22',roughness:.6}),
  sack:new T.MeshStandardMaterial({map:sackTex,bumpMap:sackTex,bumpScale:3,roughness:.97,side:T.DoubleSide}),
  sackInside:new T.MeshStandardMaterial({color:'#3a2616',roughness:1,side:T.BackSide}),
  note:(()=>{const t=new T.CanvasTexture(note);t.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map:t,roughness:.8,side:T.DoubleSide})})(),
  skirt:new T.MeshStandardMaterial({color:'#2a0f12',roughness:.85,side:T.DoubleSide})}}
type Kit=ReturnType<typeof balloonKit>;
/** Hot-air balloon: gored envelope with scalloped panels and a flared skirt, flying wires down to the stacked hoop rings
 *  (top one glowing), a plated twin burner on a load frame, suede-covered poles and a woven basket carrying money sacks. */
function balloon(parent:T.Object3D,pos:[number,number,number],scale:number,tex:T.Texture,phase:number,k:Kit):Balloon{
 const g=new T.Group();g.name='balloon';g.position.set(...pos);g.scale.setScalar(scale);g.rotation.y=phase*2;parent.add(g);
 const pts:T.Vector2[]=[];for(let i=0;i<=24;i++){const t=i/24;pts.push(new T.Vector2(.24+(.98-.24)*Math.pow(Math.sin(t*Math.PI/2),1.35),t*1.5))}for(let i=1;i<=20;i++){const a=i/20*Math.PI/2;pts.push(new T.Vector2(Math.max(.001,.98*Math.cos(a)),1.5+1.05*Math.sin(a)))}
 const geo=new T.LatheGeometry(pts,96);const p=geo.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(z,x);const kk=1+.03*(Math.abs(Math.sin(8*a))-.63);p.setX(i,x*kk);p.setZ(i,z*kk)}geo.computeVertexNormals();
 const env=mesh(geo,new T.MeshStandardMaterial({map:tex,roughness:.62,side:T.DoubleSide}),g);env.castShadow=false;
 mesh(new T.CylinderGeometry(.08,.08,.04,16),k.metal,g,0,2.56,0); // crown ring
 // Flared fabric skirt below the throat.
 mesh(new T.LatheGeometry([new T.Vector2(.24,0),new T.Vector2(.26,-.12),new T.Vector2(.31,-.3),new T.Vector2(.36,-.42)],48),k.skirt,g);
 const RING_Y=[-1.45,-1.66,-1.87,-2.08],RING_R=[.33,.31,.31,.29];
 const ring=(k.glow as T.MeshStandardMaterial).clone();RING_Y.forEach((y,i)=>mesh(new T.TorusGeometry(RING_R[i],i===0?.026:.016,8,48),i===0?ring:k.metal,g,0,y,0).rotation.x=Math.PI/2);
 for(let i=0;i<16;i++){const a=i/16*TAU;const c=mesh(new T.TubeGeometry(new T.CatmullRomCurve3([v(Math.cos(a)*.62,.55,Math.sin(a)*.62),v(Math.cos(a)*.42,-.42,Math.sin(a)*.42),v(Math.cos(a)*RING_R[0],RING_Y[0],Math.sin(a)*RING_R[0])]),12,.006,4),k.rope,g);c.castShadow=false}
 for(let i=0;i<6;i++){const a=i/6*TAU;mesh(new T.TubeGeometry(new T.LineCurve3(v(Math.cos(a)*.31,RING_Y[0],Math.sin(a)*.31),v(Math.cos(a)*.29,RING_Y[3],Math.sin(a)*.29)),1,.008,4),k.metal,g)}
 // Twin burner inside the top ring: plated coils, blast valves and three nested jets per burner (white core, orange body, red fringe).
 const burners:Burner[]=[];
 for(const [bi,sx] of [[0,-.09],[1,.09]] as [number,number][]){
  const coil:T.Vector3[]=[];for(let i=0;i<=60;i++){const a=i/60*TAU*5;coil.push(v(sx+Math.cos(a)*.07,RING_Y[0]-.12+i/60*.14,Math.sin(a)*.07))}
  mesh(new T.TubeGeometry(new T.CatmullRomCurve3(coil),120,.011,6),k.plated,g);
  mesh(new T.CylinderGeometry(.035,.045,.06,12),k.plated,g,sx,RING_Y[0]-.17,0);
  const mats:T.ShaderMaterial[]=[];const seed=Math.floor(phase*1000)+bi*97;
  for(const [r,len,gain,core,hot,tip,add] of [[.12,1.35,1.1,'#ffb25a','#ff4a08','#b0140a',0],[.07,1.15,1.3,'#ffe6b0','#ff7a18','#e0300c',0],[.032,.85,1.6,'#d8e4ff','#fff0c0','#ffa040',1]] as [number,number,number,string,string,string,number][]){
   const m=new T.ShaderMaterial({...FlameShader,uniforms:T.UniformsUtils.clone(FlameShader.uniforms),transparent:true,depthWrite:false,blending:add?T.AdditiveBlending:T.NormalBlending,side:T.DoubleSide}); // body reads as fire even against the bright sky; the core adds heat
   m.uniforms.seed.value=seed+r*100;m.uniforms.gain.value=gain;m.uniforms.core.value.set(core);m.uniforms.hot.value.set(hot);m.uniforms.tip.value.set(tip);mats.push(m);
   const jet=mesh(new T.CylinderGeometry(r*.25,r,1,20,12,true).translate(0,.5,0),m,g,sx,RING_Y[0]-.1,0);jet.scale.set(1,len,1);jet.castShadow=jet.receiveShadow=false;jet.frustumCulled=false}
  const glowSprite=mesh(new T.SphereGeometry(.09,12,8),new T.MeshBasicMaterial({color:new T.Color(3,1.4,.4),transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}),g,sx,RING_Y[0]-.06,0);glowSprite.castShadow=false;
  burners.push({mats,glow:glowSprite,fire:burnSchedule(seed+1,24)})}
 // Load frame: square burner frame, four suede-covered poles down to the basket corners, flying wires to the bottom ring.
 const BASKET_Y=-2.62,BH=.36,BW=.25,FRAME_Y=RING_Y[3]-.06;
 const corners:[number,number][]=[[-1,-1],[1,-1],[1,1],[-1,1]];
 corners.forEach(([cx,cz],i)=>{const [nx,nz]=corners[(i+1)%4];mesh(new T.TubeGeometry(new T.LineCurve3(v(cx*.2,FRAME_Y,cz*.2),v(nx*.2,FRAME_Y,nz*.2)),1,.012,6),k.plated,g);
  mesh(new T.TubeGeometry(new T.LineCurve3(v(cx*.2,FRAME_Y,cz*.2),v(cx*(BW-.03),BASKET_Y+BH/2,cz*(BW-.03))),1,.022,8),k.suede,g);
  mesh(new T.TubeGeometry(new T.LineCurve3(v(cx*.2,FRAME_Y,cz*.2),v(Math.cos(Math.atan2(cz,cx))*RING_R[3],RING_Y[3],Math.sin(Math.atan2(cz,cx))*RING_R[3])),1,.006,4),k.rope,g)});
 // Woven basket: four slightly bowed wicker walls, rounded corner posts, woven floor, padded leather rim, rope handles.
 for(let side=0;side<4;side++){const wall=new T.PlaneGeometry(BW*2-.04,BH,8,4);const wp=wall.getAttribute('position');for(let i=0;i<wp.count;i++){const x=wp.getX(i),y=wp.getY(i);wp.setZ(i,.018*(1-(x/(BW))**2)*(1-.3*(y/BH)**2))}wall.computeVertexNormals();
  const m=mesh(wall,k.wicker,g,0,BASKET_Y,0);m.rotation.y=side*Math.PI/2;m.translateZ(BW);}
 for(const [cx,cz] of corners)mesh(new T.CylinderGeometry(.022,.022,BH,10),k.wicker,g,cx*(BW-.006),BASKET_Y,cz*(BW-.006));
 mesh(new T.BoxGeometry(BW*2,.03,BW*2),k.wicker,g,0,BASKET_Y-BH/2,0);
 const rim:T.Vector3[]=[];for(let i=0;i<=48;i++){const a=i/48*TAU;const c=Math.cos(a),sn=Math.sin(a);const r=BW+.012;rim.push(v(Math.sign(c)*Math.min(Math.abs(c)*1.6,1)*r,BASKET_Y+BH/2+.01,Math.sign(sn)*Math.min(Math.abs(sn)*1.6,1)*r))}
 mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rim,true),96,.03,10,true),k.leather,g);
 for(const sd of [-1,1]){const h=mesh(new T.TorusGeometry(.05,.008,6,16,Math.PI),k.rope,g,sd*(BW+.02),BASKET_Y,0);h.rotation.set(0,Math.PI/2,Math.PI)}
 // Cargo: fuel tanks in leather jackets and burlap money sacks with tied necks, peeking over the rim.
 mesh(new T.CylinderGeometry(.055,.055,BH*.85,14),k.tank,g,-.14,BASKET_Y-.02,-.14);
 // Burlap money sacks: slumped and lumpy, pinched at the neck under a loose drawstring, mouth folded open with notes
 // poking out. Sized to sit inside the walls and clear the corner poles.
 const mouths:T.Vector3[]=[];
 const sack=(x:number,z:number,h:number,r:number,lean:number,yaw:number,seed:number)=>{
  const prof:T.Vector2[]=[[0,0],[.75,.0],[.95,.06],[1,.2],[.98,.45],[.9,.66],[.66,.8],[.48,.86],[.5,.9],[.7,.97],[.82,1]].map(([rr,yy])=>new T.Vector2(Math.max(.001,rr*r),yy*h));
  const geo=new T.LatheGeometry(prof,48);const gp=geo.getAttribute('position');
  for(let i=0;i<gp.count;i++){const px=gp.getX(i),py=gp.getY(i),pz=gp.getZ(i),a=Math.atan2(pz,px),f=py/h;
   let k=1+.07*Math.sin(5*a+seed+f*9)*f+.05*Math.sin(3*a+seed*2)+.03*Math.sin(11*a+f*20+seed);   // lumps from the cash inside
   k*=1-.18*Math.max(0,Math.sin(9*a+seed))*T.MathUtils.smoothstep(f,.7,.86)*(1-T.MathUtils.smoothstep(f,.88,.95)); // gathered folds at the neck
   if(f>.88)k*=1+.12*Math.sin(7*a+seed);                                                                           // floppy folded lip
   const sag=f<.08?.7+f*3.75:1;gp.setXYZ(i,px*k+lean*f*f*h,py*sag,pz*k)}
  geo.computeVertexNormals();
  const o=new T.Group();o.position.set(x,BASKET_Y-BH/2+.015,z);o.rotation.y=yaw;g.add(o);
  mesh(geo,k.sack,o);const inner=mesh(geo,k.sackInside,o);inner.scale.setScalar(.97);
  const tie=mesh(new T.TorusGeometry(r*.5,.006,6,28),k.rope,o,lean*.74*.74*h,.85*h,0);tie.rotation.x=Math.PI/2;tie.scale.set(1,1.1,1);
  mesh(new T.TubeGeometry(new T.CatmullRomCurve3([v(r*.5+lean*.55*h,.85*h,0),v(r*.75,.78*h,.02),v(r*.95,.62*h,-.01)]),12,.005,4),k.rope,o);
  for(let j=0;j<4;j++){const n=mesh(new T.PlaneGeometry(.11,.048),k.note,o,lean*h+(j-1.5)*.012,h*(.96+.05*(j%2)),(j%3-1)*.01);n.rotation.set(-.4+j*.35,seed+j*1.3,.5-j*.3);n.castShadow=false}
  o.updateMatrix();mouths.push(v(lean*h,h*1.02,0).applyMatrix4(o.matrix));
 };
 sack(.075,.085,.31,.085,.03,.4,1.3);sack(-.09,.065,.27,.08,-.02,2.2,4.1);sack(.02,-.07,.24,.075,.025,4.6,7.7);
 return{group:g,basket:v(pos[0],pos[1]+BASKET_Y*scale,pos[2]),base:v(...pos),phase,burners,ring,mouths}}

export class MoneyCarScene extends Experience{constructor(el:HTMLElement,o:SceneOptions={}){super(el,async(scene,renderer,options):Promise<World>=>{
const root=new T.Group();const low=options.quality==='low';
renderer.toneMappingExposure=.82;

// ---------- sky (also used as the reflection environment) ----------
const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{sun:{value:SUN_DIR}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
fragmentShader:`uniform vec3 sun;varying vec3 p;
float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 q){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*noise(q);q=q*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){vec3 d=normalize(p);float h=d.y;float g=max(dot(d,sun),0.);
 float sw=pow(max(dot(normalize(d.xz+1e-4),normalize(sun.xz)),0.),2.);
 // dusk gradient: rose to amber toward the sun, deep plum overhead
 vec3 hor=mix(vec3(.86,.36,.46),vec3(1.,.5,.2),sw),mid=mix(vec3(.6,.22,.42),vec3(.92,.38,.3),sw*.7),zen=vec3(.22,.09,.26);
 vec3 col=mix(hor,mid,smoothstep(0.,.18,h));col=mix(col,zen,smoothstep(.18,.75,h));
 // cloud banks with dark plum bellies and hot rims toward the sun
 vec2 q=d.xz/(max(h,0.)+.12);float n=fbm(q*.8+vec2(3.,1.)),n2=fbm(q*2.6-vec2(5.,2.));
 float cl=smoothstep(.4,.8,n*.8+n2*.3)*smoothstep(0.,.05,h)*(1.-smoothstep(.5,.9,h));
 vec3 belly=vec3(.34,.11,.27),lit=mix(vec3(1.,.5,.6),vec3(1.,.66,.32),sw);float rim=clamp(pow(g,2.)*1.6+(n2-.4)*1.3,0.,1.);
 col=mix(col,mix(belly,lit,rim),cl*.9);
 // we are far above the ground: a sea of sunset cloud below the horizon, darker as it falls away
 if(h<0.){vec2 s=d.xz/(-h+.03)*.6;float c=fbm(s*.7+1.)*.7+fbm(s*2.2)*.3;vec3 sea=mix(vec3(.32,.12,.28),mix(vec3(.95,.5,.56),vec3(1.,.62,.34),sw),smoothstep(.35,.75,c));col=mix(col,sea,smoothstep(0.,-.02,h));col*=mix(1.,.5,smoothstep(-.02,-.4,h));}
 // horizon haze
 col=mix(col,mix(vec3(.95,.55,.6),vec3(1.,.62,.32),sw),exp(-abs(h)*30.)*.5);
 // sun: warm bloom, hot core, small disc
 col+=vec3(1.,.38,.12)*pow(g,5.)*.45+vec3(1.,.55,.22)*pow(g,40.)*1.1+vec3(1.,.82,.55)*pow(g,1200.)*8.;
 col*=.85;
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`});
const sky=mesh(new T.SphereGeometry(400,64,32),skyMat,scene);sky.castShadow=sky.receiveShadow=false;sky.renderOrder=-1;
const envScene=new T.Scene();envScene.add(new T.Mesh(new T.SphereGeometry(50,48,24),skyMat));const envGround=new T.Mesh(new T.CircleGeometry(40,48),new T.MeshBasicMaterial({color:'#3a2632'}));envGround.rotation.x=-Math.PI/2;envGround.position.y=-2.5;envScene.add(envGround);
// Bright horizon strip + sun card: gives the paint and chrome the long crisp highlight streaks seen in the reference.
const strip=new T.Mesh(new T.CylinderGeometry(30,30,1.6,64,1,true),new T.MeshBasicMaterial({color:new T.Color(1.3,.75,.72),side:T.BackSide}));strip.position.y=.6;envScene.add(strip);
const sunCard=new T.Mesh(new T.PlaneGeometry(6,2.5),new T.MeshBasicMaterial({color:new T.Color(1.8,.9,.45),side:T.DoubleSide}));sunCard.position.copy(SUN_DIR).multiplyScalar(28);sunCard.lookAt(0,0,0);envScene.add(sunCard);const pm=new T.PMREMGenerator(renderer);const envRT=pm.fromScene(envScene,.01);scene.environment=envRT.texture;pm.dispose();
scene.fog=new T.FogExp2('#c46a86',.0055);
scene.add(new T.HemisphereLight('#ff9fc0','#4a1c34',.75));
const sunLight=light(scene,'#ff9a52',3.0,[SUN_DIR.x*30,SUN_DIR.y*30+4,SUN_DIR.z*30],!low);sunLight.shadow.camera.left=-9;sunLight.shadow.camera.right=9;sunLight.shadow.camera.top=9;sunLight.shadow.camera.bottom=-9;sunLight.shadow.camera.far=80;sunLight.target.position.set(0,5,0);scene.add(sunLight.target);
light(scene,'#ffb0cc',.9,[10,9,2]);light(scene,'#ffa0b8',1.1,[3,-8,2]); // bounce off the roll: lights the plated undercarriagelight(scene,'#d0609a',.6,[-6,3,9]);

// ---------- the money roll ----------
const noteCanvas=banknoteCanvas();const noteTex=new T.CanvasTexture(noteCanvas);noteTex.colorSpace=T.SRGBColorSpace;noteTex.anisotropy=8;
const paper=new T.MeshStandardMaterial({map:noteTex,bumpMap:noteTex,bumpScale:-2.5,roughness:.72,color:'#f6e2dc',side:T.DoubleSide});
const paperEdge=new T.MeshStandardMaterial({color:'#f2e3c6',roughness:.9,side:T.DoubleSide});
const endMat=new T.MeshStandardMaterial({map:rollEndTexture(),roughness:.95,color:'#ffe4d0',side:T.DoubleSide});
const bandMat=new T.MeshPhysicalMaterial({color:'#b86a35',roughness:.6,clearcoat:.4,sheen:.6,sheenColor:new T.Color('#ffc58a')});
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

// Soft contact shadow conforming to the roll under the car (adds grounding/depth beyond the shadow map).
const shadowTex=canvasTexture(256,256,g=>{const r=g.createRadialGradient(128,128,8,128,128,128);r.addColorStop(0,'rgba(0,0,0,1)');r.addColorStop(.55,'rgba(0,0,0,.55)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,256,256)});
const contactGeo=(()=>{const pos:number[]=[],uv:number[]=[],idx:number[]=[],n=24,A=.62,Z=1.25;for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const a=Math.PI/2+(i/n*2-1)*A,z=(j/n*2-1)*Z;pos.push(Math.cos(a)*(R+.045),Math.sin(a)*(R+.045),z);uv.push(i/n,j/n)}for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+n+1;idx.push(a,a+1,b,b,a+1,b+1)}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);return g})();
const contactMat=new T.MeshBasicMaterial({color:'#1a0610',alphaMap:shadowTex,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
const contact=new T.Mesh(contactGeo,contactMat);contact.renderOrder=1;root.add(contact);

// ---------- balloons ----------
const metal=new T.MeshStandardMaterial({color:'#2b1d1f',metalness:.8,roughness:.4});
const glow=new T.MeshStandardMaterial({color:'#ff8a3c',emissive:'#ff6a1c',emissiveIntensity:3.2});
const rope=new T.MeshStandardMaterial({color:'#4a2a26',roughness:.9});const kit=balloonKit(glow,metal,rope,noteCanvas);
const burgundy=envelopeTexture('#5f1c24','#4a141b'),rust=envelopeTexture('#6e2a22','#56201c','#8a3a26'),striped=envelopeTexture('#4b1a22','#2f3a2c','#20302a');
// Placed in each shot's screen space (along view, right, up) so the framing matches the reference compositions.
const balloons:Balloon[]=[
 balloon(root,inShot(SHOT.hero,15,5.0,1.6),2.2,burgundy,.1,kit),   // hero: big envelope top-right, ring stack down the right edge
 balloon(root,inShot(SHOT.hero,20,-6.2,3.8),1.5,rust,.7,kit),      // hero: top-left with rings + basket
 balloon(root,inShot(SHOT.hero,34,.5,5.6),1.4,striped,1.3,kit),    // hero: small, centred above the car
 balloon(root,inShot(SHOT.side,34,-.3,5.4),1.4,striped,1.9,kit),   // shaded-side shot: small, centred above the car
 balloon(root,inShot(SHOT.side,13,-4.4,2.2),1.9,burgundy,2.5,kit), // shaded-side shot: left edge, cables + rings
 balloon(root,[-34,15,-24],2.4,burgundy,3.7,kit),
 balloon(root,[-38,10,20],2.4,rust,4.3,kit),
 balloon(root,[-26,22,2],2.2,striped,4.9,kit),
 balloon(root,[-8,4.5,20],1.8,rust,5.5,kit),
];

// ---------- flying cash: swirling cloud + streams spilling from baskets ----------
const billTex=new T.CanvasTexture(noteCanvas);billTex.colorSpace=T.SRGBColorSpace;billTex.anisotropy=4;
const billMat=new T.MeshStandardMaterial({map:billTex,roughness:.8,side:T.DoubleSide,color:'#b7a4a6'});
billMat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z += 0.05*sin(position.x*9.0+instanceMatrix[3].x*3.0)+0.03*sin(position.y*14.0+instanceMatrix[3].y);')};
const billGeo=new T.PlaneGeometry(.44,.19,8,2);
const SWIRL=low?80:200,TRAIL_PER=low?12:34,TRAIL_SRC=[0,1,2,3,4,5];
const bills=new T.InstancedMesh(billGeo,billMat,SWIRL+TRAIL_PER*TRAIL_SRC.length);bills.castShadow=false;bills.frustumCulled=false;root.add(bills);
const rng=random(34);
const swirl=Array.from({length:SWIRL},()=>({r:2.5+rng()*13,a:rng()*TAU,y:rng(),turns:rng()<.5?1:2,fall:1+Math.floor(rng()*2),phase:rng(),spin:rng()*TAU,s:.7+rng()*.7}));
const trail=TRAIL_SRC.flatMap(b=>Array.from({length:TRAIL_PER},(_,j)=>{const a=rng()*TAU;return{b,m:j%3,phase:rng(),dx:Math.cos(a),dz:Math.sin(a),pop:.6+rng()*.6,spin:rng()*TAU,s:.42+rng()*.22}}));const mouthW=new T.Vector3();
const dummy=new T.Object3D();

// Filmic grade (composer path only; low quality renders without it).
const grade=new ShaderPass(GradeShader);
return{supportsTransparency:false,root,duration:DURATION,background:'#7a2f52',target:v(0,5.5,0),distance:11,bloom:.5,postPasses:[grade],dispose:()=>{envRT.dispose();grade.dispose()},update(t){const u=t/DURATION,phase=u*TAU;
 roll.rotation.z=phase*ROLL_TURNS;
 // Lowrider hydraulics: six 4 s moves per loop, each starting and ending at rest (seamless).
 // Body pose = heave h, pitch p (nose up +), roll q (+X side up). A wheel stays on the roll until its corner rises
 // past the suspension's travel, then it hangs in the air with the body (three-wheeling, nose hops).
 const k=Math.floor(t/4)%6,c=(t%4)/4,move=MOVES[k];
 const sm=(a:number,b:number)=>T.MathUtils.smoothstep(c,a,b);const hold=(a:number,b:number,cc:number,d:number)=>sm(a,b)*(1-sm(cc,d));
 const ring=(u0:number,amp:number,f:number,decay:number)=>c>u0?amp*Math.sin((c-u0)*f*TAU)*Math.exp(-(c-u0)*decay)*Math.min(1,(1-c)*8):0;
 let h=0,p=0,q=0,hop=0;
 if(move==='nose'){const up=hold(.1,.22,.5,.58);p=.27*up+ring(.58,.06,3,10);h=.16*up-.04*hold(.02,.07,.08,.12)+ring(.58,.035,3,10);hop=.22*Math.pow(Math.max(0,Math.sin(Math.min(1,Math.max(0,(c-.3)/.22))*Math.PI)),1.3);}
 else if(move==='threeL'||move==='threeR'){const sd=move==='threeL'?-1:1,up=hold(.1,.26,.68,.84);q=sd*.17*up+ring(.84,.025*sd,2.5,12);p=.08*up;h=.11*up+ring(.84,.02,2.5,12);}
 else{const env=hold(.05,.15,.75,.9);q=.09*Math.sin((c-.05)*2*TAU)*env;h=.05*env;p=.02*env;}
 car.root.position.y=rideY+hop;car.update(phase*ROLL_TURNS*R/WHEEL_RADIUS,h);car.chassis.rotation.set(-p,0,q);
 car.suspensions.forEach((s,i)=>{const lift=h+p*s.position.z+q*s.position.x;s.position.y=wheelRest[i]+Math.max(0,lift-TRAVEL)});car.articulate();
 const suspension=h,pitch=p,cycle=c;
 root.userData.motion={hop,suspension,pitch,cycle};contactMat.opacity=.7*Math.max(.25,1-hop*5);
 balloons.forEach((b,i)=>{b.group.position.copy(b.base);b.group.position.y+=.35*Math.sin(phase+b.phase*3);b.group.position.x+=.25*Math.sin(phase*2+i);b.group.rotation.z=.02*Math.sin(phase+i);let hot=0;b.burners.forEach(br=>{const pw=br.fire(t);hot=Math.max(hot,pw);br.mats.forEach(m=>{m.uniforms.u.value=u;m.uniforms.power.value=pw});(br.glow.material as T.MeshBasicMaterial).opacity=.8*pw});b.ring.emissiveIntensity=.5+3.5*hot});
 let n=0;
 for(const p of swirl){const age=(u*p.fall+p.phase)%1;const a=p.a+phase*(p.r<7?p.turns:1); /* integer turns per loop keeps the cash cloud seamless */dummy.position.set(Math.cos(a)*p.r,16-age*13+.5*Math.sin(age*TAU*3),Math.sin(a)*p.r*.85);dummy.rotation.set(age*TAU*3+p.spin,p.spin+phase*2,Math.sin(age*TAU*2+p.spin));dummy.scale.setScalar(p.s);dummy.updateMatrix();bills.setMatrixAt(n++,dummy.matrix)}
 // Notes leave the sack mouths: pop up out of the bag, flip over, catch the wind and flutter down and away (3 bursts per loop per note).
 balloons.forEach(b=>b.group.updateMatrixWorld());
 for(const p of trail){const b=balloons[p.b];const age=(u*3+p.phase)%1;b.group.localToWorld(mouthW.copy(b.mouths[p.m]));const sc=b.group.scale.x;
  const popT=Math.min(1,age/.09),pop=Math.sin(popT*Math.PI/2)*p.pop*.35*sc,after=Math.max(0,age-.09);
  const out=after*3.2+.12*popT,fall=after*after*7+after*1.5;
  dummy.position.set(mouthW.x+p.dx*out+.35*Math.sin(age*TAU*2+p.spin)*after*2,mouthW.y+pop-fall,mouthW.z+p.dz*out+.25*Math.cos(age*TAU*3+p.spin)*after*2);
  dummy.rotation.set(p.spin+age*TAU*4,p.spin*.7+age*TAU*2,Math.sin(age*TAU*3+p.spin)*1.2);dummy.scale.setScalar(p.s*(.25+.75*popT)*(age>.97?(1-age)/.03:1));dummy.updateMatrix();bills.setMatrixAt(n++,dummy.matrix)}
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
 (grade.uniforms as any).time.value=t%1;
}}},o)}}
