import {defineConfig} from 'vite';
export default defineConfig({base:'./',publicDir:false,build:{outDir:'dist/library',lib:{entry:'src/index.ts',formats:['es'],fileName:'form-scenes'},rollupOptions:{external:(id)=>id==='three'||id.startsWith('three/')}}});
