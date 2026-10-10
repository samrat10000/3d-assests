from pathlib import Path
p=Path('src/scenes/MoneyCarScene.ts');s=p.read_text(encoding='utf-8-sig');s=s.replace("const radius=3.3","const radius=3.3")
s=s.replace("fragmentShader:'varying vec3 p;void main(){float h=normalize(p).y;vec3 a=vec3(.52,.15,.12),b=vec3(.12,.065,.25),c=vec3(.95,.43,.25);vec3 col=mix(c,b,smoothstep(-.05,.65,h));col=mix(a,col,smoothstep(-.3,.1,h));gl_FragColor=vec4(col,1.);}'", "fragmentShader:`varying vec3 p;float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}void main(){vec3 dir=normalize(p);float h=dir.y;vec3 dusk=vec3(.19,.09,.29),peach=vec3(1.,.52,.29);vec3 col=mix(peach,dusk,smoothstep(-.03,.38,h));col=mix(vec3(.35,.08,.13),col,smoothstep(-.35,-.02,h));vec2 q=dir.xz/max(.08,abs(h)+.06)*1.6;float n=noise(q)*.55+noise(q*2.1)*.28+noise(q*4.2)*.17;float cloud=smoothstep(.43,.72,n)*smoothstep(-.01,.15,h)*(1.-smoothstep(.3,.7,h));col=mix(col,vec3(.78,.45,.55),cloud*.7);float streak=pow(max(0.,1.-abs(h-.025)*8.),8.);col+=vec3(.35,.16,.05)*streak;gl_FragColor=vec4(col,1.);}`")
s=s.replace('new T.SphereGeometry(9,40,20)','new T.SphereGeometry(4.8,40,20)').replace('root,-48,12,-95','root,-48,5,-95')
s=s.replace('const base=balloons.map(b=>b.position.clone());','const base=balloons.map(b=>b.position.clone());const rideHeight=car.root.position.y;const wheelBases=car.wheels.map(w=>w.parent!.position.y);')
s=s.replace('return{supportsTransparency:false,root,duration:32','return{supportsTransparency:false,root,duration:24')
s=s.replace('const phase=t/32*TAU;roll.rotation.x=-phase*2;car.update(-phase*12,.035*Math.sin(phase*8));car.chassis.rotation.x=.012*Math.sin(phase*8);', '''const phase=t/24*TAU;roll.rotation.x=-phase*2;
// Hydraulic preload, front rise, airborne crest, then a damped landing.
const cycle=(t%4)/4;const pulse=(a:number,b:number)=>cycle>a&&cycle<b?Math.sin((cycle-a)/(b-a)*Math.PI):0;
const lift=pulse(.14,.60);const hop=.22*Math.pow(pulse(.30,.64),1.5);const landing=cycle>.64&&cycle<.96?Math.sin((cycle-.64)/.32*Math.PI*3)*Math.exp(-(cycle-.64)*12):0;
const suspension=.04+.17*lift-.065*landing;const pitch=.16*lift-.045*landing;
car.root.position.y=rideHeight+hop;car.update(-phase*15,suspension);car.chassis.rotation.x=-pitch;car.chassis.rotation.z=.018*Math.sin(phase*6);
car.wheels.forEach((w,i)=>{w.parent!.position.y=wheelBases[i];});
root.userData.motion={hop,suspension,pitch,cycle};''')
s=s.replace('(t/16+p.phase)%1','(t/12+p.phase)%1')
s=s.replace("s.position.set(.4+a*2,4.35+a*1.6,-.55+Math.sin(a*6+i)*a*.35)","s.position.set(.35-a*2,rideHeight+hop+1.25+suspension+a*1.4,-.7+Math.sin(a*6+i)*a*.35)")
a=s.index('camera(t,c){');s=s[:a]+'''camera(t,c){
// Reference order: low three-quarter, grille sweep, hero return, wide reveal.
const smooth=(u:number)=>u*u*(3-2*u);const lerp=(a:number[],b:number[],u:number)=>v(...a as [number,number,number]).lerp(v(...b as [number,number,number]),smooth(u));let pos:T.Vector3;let aim=v(0,3.95,0);
if(t<6){pos=lerp([6.9,4.15,7.5],[5.6,3.6,6.2],t/6);}
else if(t<12){pos=lerp([8,3.45,2.6],[7.6,3.7,-4.7],(t-6)/6);aim.y=3.8;}
else if(t<16){pos=lerp([5.8,3.8,6.5],[7.9,5.1,8.6],(t-12)/4);}
else if(t<21){pos=lerp([9,5.5,10],[12.5,7,14.5],(t-16)/5);aim.y=4.0;}
else{pos=lerp([12.5,7,14.5],[6.9,4.15,7.5],(t-21)/3);}
if(c.aspect<.8)pos.sub(aim).multiplyScalar(1.52).add(aim);c.position.copy(pos);c.lookAt(aim);
}}},o)}}\n''';p.write_text(s,encoding='utf-8')
