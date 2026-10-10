# Traffic sculpture asset

`src/assets/traffic.ts` exports `createTrafficSculpture(): THREE.Group`.

An original procedural interpretation of the supplied rotating assemblage: two-lens yellow signal with individually modeled LEDs and curved, thickness-bearing visors; asymmetric triangular “the corner” enamel sign; octagonal tagged stop sign; orange plates; dark hollow-ended central support; clamps, bolts, hinges, rear enclosure fins, cable loops, bent sheet-metal tails and layered paper decals. Front is +Z and up is +Y. Overall height is approximately 4.8 units, centered near the origin.

Canvas-generated sRGB textures use seeded noise, perimeter enamel chipping, scratches, printed type and adhesive graphics. No external images or network dependencies are needed. All elements are genuine Three.js meshes; sign panels are beveled extrusions. The factory requires a browser canvas environment and creates independent resources per call. The owning experience controls placement, animation, lights, camera and disposal. Traverse the group to dispose geometries/materials/maps when replacing it.

The source video is a small, compressed screen recording. Geometry, labels, hardware and material treatments are authored reconstructions, not claims of an exact source-model match.
