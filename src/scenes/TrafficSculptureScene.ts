import * as T from 'three';
import {Experience,type SceneOptions} from '../runtime';
import {batchRigid} from '../optimize';
import {createTrafficSculpture} from '../assets/traffic';
import {studio,light,v,TAU} from '../shared';
export class TrafficSculptureScene extends Experience{constructor(el:HTMLElement,o:SceneOptions={}){super(el,async(scene,renderer)=>{const root=createTrafficSculpture();batchRigid(root);const cleanup=studio(scene,renderer,['#ffc58a','#4b668f','#ea241c','#ffc691']);light(scene,'#ffb265',3,[4,5,6],true);light(scene,'#ff3525',3,[-4,0,-3]);scene.add(new T.HemisphereLight('#b9c7e4','#280f0a',.8));return{root,duration:20,background:'#100b09',target:v(0,0,0),distance:10.5,bloom:.24,dispose:cleanup,update(t){root.rotation.y=t/20*TAU;root.rotation.z=.035*Math.sin(t/20*TAU);root.position.y=.1*Math.sin(t/20*TAU)},camera(t,c){c.position.set(0,.15,c.aspect<.8?15:10.5);c.lookAt(0,0,0)}}},o)}}
