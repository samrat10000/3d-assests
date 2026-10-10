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

## Dream Currency — reference-matched rebuild (10 October 2026, pass 2)

Rebuilt against the reference video frame by frame.
- Car (`src/assets/classic.ts`): new early-60s finned hardtop body. Height-parametrised side surfaces cut true wheel arches, plus a superellipse deck, rear fins with blade tail lamps, lower skegs, hooded quad lamps, a full-width recessed egg-crate grille, a heavy wraparound bumper with bullets, a wraparound windshield, purple-tinted glass, a pale-faced driver, low-profile tyres and polished 6-spoke star rims. The lime-to-cream pearl paint uses vertex colours and iridescence. It exports `WHEEL_RADIUS`, `WHEEL_Z` and `suspensions`.
- Roll: radius 5, length 7. Two notes wrap the circumference, so headline text and serials run around the roll as in the reference. The notes are shingled with stepped cut edges and have corrugated layer zones. The ends are ragged spiral paper, and there are 4 flat amber bands near the ends. The note art is fictional ("UNITED STATES OF IMAGINATION").
- Balloons: dark burgundy, rust and striped gored envelopes with scalloped panels, 16 cables, 4 stacked hoop rings (the top one glows as the burner) and a basket. They are placed in each shot's screen space with `inShot()`. Cash streams fall from 4 baskets, and there is a swirling cash cloud.
- Sky: a saturated pink-magenta sunset with a gold sunward horizon, fbm cloud banks, distant hills and a low sun behind the car. The sun shows under the chassis, which matches the reference's under-bumper glow. The reflection environment is a PMREM of the same sky over a dark ground.
- Camera: low lens at roll height with long-lens shots. The order is: hero sun-side front 3/4, then head-on, then shaded-side front 3/4, then head-on, then hero push and pull. There is handheld drift at integer loop harmonics.
- Loop seam: max matrix diff between t=0 and t=24 is 6.5e-6. The GLB was re-exported (23.5 MB).
- `src/optimize.ts`: `batchRigid` now keeps vertex colours, filling in white when only part of a bucket has them.
Not done: motion blur, depth of field and burner flame sprites.

## Dream Currency, pass 3 (depth and finish)

- **Front end:** rebuilt to the '61 layout. The nose now curves forward in a soft V. Two small twin lamps sit in dark sockets under a body-colour hood lip. The grille has two tiers of fine grid: the upper tier between the lamps, the lower tier full width with round parking lamps. A heavy chrome bar separates the tiers. The front and rear bumpers are smooth curved chrome shapes wrapped around the corners, not boxes.
- **Sky:** darker dusk. Rose turns to amber toward the sun and deep plum overhead. Clouds have dark undersides and hot edges, and there's a sea of sunset cloud below the horizon. The sun sits low and directly behind the car from the hero camera, so it glows under the chassis.
- **Depth:**
  - Colour grade: magenta in the shadows, warm highlights, vignette, fine grain.
  - Soft contact shadow on the roll under the car.
  - Denser pink haze.
  - Reflections now include a bright horizon strip and a sun card, so paint and chrome get crisp highlight streaks.
- **Runtime:** `World.postPasses` adds passes before `OutputPass`. The builder now also receives the camera as an optional 4th argument. Other scenes are unaffected.
- **Checks:** builds pass. The loop seam diff is 6.5e-6. The GLB was re-exported at 26.3 MB.

## Dream Currency, pass 4

- **Lens blur:** removed at your request. The colour grade, vignette and grain stay.
- **Grille:** rebuilt to match the reference. It's two single rows of upright cells, each about one lamp tall, with thin satin dividers over a dark plum cavity. The upper row sits between the lamps, a heavy chrome bar wraps the corners, and the lower row runs full width with round parking lamps. The bumper moved up to meet it.
- **Lamps:** smaller, in chrome rings over dark cups. The black sockets are gone.
- **Note art:** now reads as a hundred-dollar bill. It has "THE UNITED STATES OF AMERICA", "FEDERAL RESERVE NOTE", the black Federal Reserve seal, the green Treasury seal, green serials, rosettes behind the corner 100s, the legal-tender line, signatures and "ONE HUNDRED DOLLARS". The portrait is a generic engraved bust. The paper is cream with a green tint and red/blue fibres.
