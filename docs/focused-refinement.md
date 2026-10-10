# Focused refinement — 10 October 2026

Scope: Afterlife and Dream Currency only. Right of Way and Midnight Run were left unchanged in this refinement.

Afterlife: dedicated colored reflection studio with broad cobalt/violet cards, narrow pink highlight strips, controlled roughness/clearcoat, restrained halo and wider slow yaw. Genuine reflections remain view dependent.

Dream Currency: 24-second camera timeline follows the observed shot order: 0–6 low front three-quarter push, 6–12 grille-level sweep, 12–16 hero return, 16–21 balloon reveal, 21–24 return to initial frame. Four-second authored hydraulic cycle includes preload, nose lift, brief airborne hop and damped landing. Wheels retain independent pivots; body motion does not move their hubs. Smoke height follows the chassis. Sunset sky now includes layered procedural clouds. Sky and sun no longer cast shadows onto the artwork.

Reference extracts: reference/money-motion-detail.jpg and reference/skull-motion-detail.jpg. These show actual visible reference poses and framing; inferred rig mechanics are authored, not recovered original settings.

Validation: TypeScript and both Vite builds pass. Browser inspected both scenes at multiple animation times, desktop 1440x1100 and money mobile 390x844. Zero page errors. Final captures sampled 72 frames per full cycle, encoded at the original loop duration (3 fps money, 4.5 fps skull); they are low-frame-rate review captures, not performance measurements. Current skull and money GLB exports regenerated. Exported GLBs contain static geometry/materials; runtime camera, procedural sky, bloom, smoke and suspension timeline remain in TypeScript.

Remaining differences: authored coupe proportions and currency illustration differ from the recording; clouds and balloons are simplified. The motion/cameras are closer interpretations, not an exact reconstruction. No claim of original mesh, shader or rig recovery.

## Files

Afterlife (scene id `skull`)
- `public/exports/afterlife.glb` — exported scene geometry/materials
- `public/assets/skull.glb` — source model (Khronos ScatteringSkull, CC0)
- `src/scenes/NeonSkullScene.ts` — scene, lighting, reflection studio, motion

Dream Currency (scene id `money`)
- `public/exports/dream-currency.glb` — exported scene geometry/materials
- `src/scenes/MoneyCarScene.ts` — scene, camera timeline, hydraulic cycle, sky, smoke
- `src/assets/classic.ts` — procedural coupe (no source GLB)

Shared by both: `src/runtime.ts`, `src/shared.ts`, `src/optimize.ts`, `src/main.ts`, `src/style.css`. Regenerate exports with `scripts/capture-focused.mjs`.
