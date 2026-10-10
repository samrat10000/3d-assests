import * as T from 'three';
import {Experience,type SceneOptions,type World} from '../runtime';
import {model,light,v,TAU,canvasTexture,mesh} from '../shared';
function skullReflections(scene:T.Scene,renderer:T.WebGLRenderer){
 const env=new T.Scene();env.background=new T.Color('#07030b');
 const card=(color:string,x:number,y:number,z:number,w:number,h:number,intensity:number)=>{const m=new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(intensity),side:T.DoubleSide});const p=mesh(new T.PlaneGeometry(w,h),m,env,x,y,z);p.lookAt(0,0,0);return p};
 card('#ff003c',-5,1,2,2,8,5);card('#ff164f',5,0,0,1.2,7,5);card('#4a0cff',-1,4,4,6,4.5,3.4);card('#1534ff',3,4,-2,4,5,3);card('#d118ff',-4,-1,-3,2,5,2);card('#ffcfdb',-3,4,2,.22,6,5);card('#ff6581',2,-3,4,.3,5,4);
 const pm=new T.PMREMGenerator(renderer),rt=pm.fromScene(env,.018);scene.environment=rt.texture;pm.dispose();env.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(o.material as T.Material).dispose()}});return()=>rt.dispose();
}
export class NeonSkullScene extends Experience {constructor(el:HTMLElement,o:SceneOptions={}){super(el,async(scene,renderer,options):Promise<World>=>{
const root=await model(`${options.assetBase??import.meta.env.BASE_URL+'assets/'}skull.glb`,3.9);const material=new T.MeshPhysicalMaterial({color:'#635267',metalness:.97,roughness:.17,clearcoat:1,clearcoatRoughness:.075,envMapIntensity:1.65});root.traverse(o=>{if(o instanceof T.Mesh)o.material=material});
const cleanup=skullReflections(scene,renderer);light(scene,'#ff0040',4,[-3,2,3]);light(scene,'#263bff',3,[2,4,2]);light(scene,'#ff2866',5,[3,-1,-2]);scene.add(new T.AmbientLight('#33203b',.12));
const glow=canvasTexture(256,256,c=>{const g=c.createRadialGradient(128,128,0,128,128,127);g.addColorStop(0,'rgba(145,0,24,.32)');g.addColorStop(.4,'rgba(100,0,15,.15)');g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(0,0,256,256)});const halo=mesh(new T.PlaneGeometry(7,7),new T.MeshBasicMaterial({map:glow,transparent:true,depthWrite:false,toneMapped:false}),scene,0,0,-2.3);halo.castShadow=false;
return{root,duration:16,background:'#090307',target:v(0,0,0),distance:9,bloom:.36,dispose:cleanup,update(t){root.rotation.y=.2+Math.sin(t/16*TAU)*.95;root.rotation.z=.025*Math.sin(t/16*TAU);root.rotation.x=.018*Math.cos(t/16*TAU);root.position.y=.065*Math.sin(t/16*TAU);halo.visible=scene.background!==null;},camera(t,c){const d=c.aspect<.8?12.2:8.6;c.position.set(.1,0.15,d);c.lookAt(0,0,0)}}},o)}}
