import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
for(const name of ['skull','classic-car','motorcycle']){
 const b=fs.readFileSync('public/assets/'+name+'.glb');
 const g=await new GLTFLoader().register(() => ({name:'noTextures',loadTexture:()=>Promise.resolve(null)})).parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const box=new Box3().setFromObject(g.scene);
 console.log(name,'BOUNDS',box.min.toArray(),box.max.toArray(),'SIZE',box.getSize(new Vector3()).toArray());
 g.scene.traverse(o=>{ if(name==='classic-car')console.log(o.name,'pos',o.position.toArray(),'rot',o.rotation.toArray().slice(0,3), 'mesh',o.isMesh,'children',o.children.length, o.isMesh?'vtx '+o.geometry.attributes.position.count:'') });
 console.log('animations',g.animations.map(a=>a.name));
}

