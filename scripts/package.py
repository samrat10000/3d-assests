from pathlib import Path
import json
p=Path('package.json');d=json.loads(p.read_text(encoding='utf-8-sig'));d['scripts']['build']='tsc --noEmit && vite build && vite build --config vite.lib.config.ts';p.write_text(json.dumps(d,indent=2),encoding='utf-8')
p=Path('.openai/hosting.json');d=json.loads(p.read_text(encoding='utf-8-sig'));d['static']={'directory':'dist'};p.write_text(json.dumps(d,indent=2),encoding='utf-8')
p=Path('src/runtime.ts');s=p.read_text(encoding='utf-8-sig').replace('interface World {root','interface World {supportsTransparency?:boolean;root').replace("this.seek(0);this.raf", "this.seek(0);if(options.pointer)this.setInspect(true);this.raf").replace('setBackground(color:string,transparent=false){this.options.transparent','setBackground(color:string,transparent=false){if(transparent&&this.world?.supportsTransparency===false)throw new Error("This environment does not support transparency");this.options.transparent');p.write_text(s,encoding='utf-8')
for n in ['MoneyCarScene','AnimeDriftScene']:
 p=Path('src/scenes/'+n+'.ts');s=p.read_text(encoding='utf-8-sig').replace('return{root,duration:','return{supportsTransparency:false,root,duration:');p.write_text(s,encoding='utf-8')
