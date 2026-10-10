from pathlib import Path
p=Path('src/scenes/MoneyCarScene.ts');s=p.read_text(encoding='utf-8-sig');s=s.replace('mesh(skyGeo,skyMat,root);const sun=', 'const sky=mesh(skyGeo,skyMat,root);sky.castShadow=false;sky.receiveShadow=false;const sun=');s=s.replace('root,-48,5,-95);','root,-48,5,-95);sun.castShadow=false;sun.receiveShadow=false;');p.write_text(s,encoding='utf-8')
