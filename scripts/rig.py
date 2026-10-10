from pathlib import Path
p=Path('src/vehicles.ts');s=p.read_text(encoding='utf-8-sig');a=s.index('export async function vehicle');b=s.index('\nexport function rider');s=s[:a]+'''export async function vehicle(path:string,length:number,color?:string):Promise<Vehicle>{
const asset=await model(path,length);const root=new T.Group(),chassis=new T.Group();root.add(chassis);chassis.add(asset);const wheels:T.Object3D[]=[];
asset.traverse(o=>{if(/^wheel(?:-|front|rear)/i.test(o.name)&&!/^wheel(?:-|front|rear)/i.test(o.parent?.name??''))wheels.push(o);if(o instanceof T.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>{if(m instanceof T.MeshStandardMaterial){m.envMapIntensity=1.1;if(color&&/paint/i.test(m.name)){m.color.set(color);m.metalness=.55;m.roughness=.22}}})}});
const b=new T.Box3().setFromObject(asset);asset.position.y-=b.min.y;root.updateMatrixWorld(true);wheels.forEach(w=>root.attach(w));const originals=wheels.map(w=>w.quaternion.clone());
return{root,chassis,wheels,update(spin,bounce,steer=0){chassis.position.y=bounce;chassis.rotation.z=bounce*.1;wheels.forEach((w,i)=>{w.quaternion.copy(originals[i]);w.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(v(1,0,0),spin));if(/front/i.test(w.name))w.quaternion.premultiply(new T.Quaternion().setFromAxisAngle(v(0,1,0),steer))})}}}
''' +s[b:];p.write_text(s,encoding='utf-8')
p=Path('src/scenes/AnimeDriftScene.ts');s=p.read_text(encoding='utf-8-sig').replace('car.update(-t*15,','car.update(-t/40*TAU*96,');p.write_text(s,encoding='utf-8')
