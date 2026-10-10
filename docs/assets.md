# 3D asset provenance

Downloaded 10 October 2026. Retain these credits in redistributed projects. Models are bundled locally; runtime material, lighting and transform changes are made by this project.

| File | Author / source | License | Bytes |
| --- | --- | --- | --- |
| `public/assets/skull.glb` | Vladimir Petkovic / Adobe, [Khronos ScatteringSkull](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/ScatteringSkull) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 8,959,044 |
| `public/assets/concept-car.glb` | Eric Chadwick, Darmstadt Graphics Group GmbH, 2024, [Khronos CarConcept](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept). Based on Unity Fan's CC0 concept car. | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Embedded Khronos/3D Commerce logos retain their trademark status. | 11,778,688 |
| `public/assets/motorcycle.glb` | [Motorcycle by Poly by Google](https://poly.pizza/m/dse64pqMKAR), separated into configurable parts by [hughdtt](https://github.com/hughdtt/motorbike-configurator). | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) (Google Poly attribution license) | 420,300 |
| `public/assets/classic-car.glb` | [1970s muscle coupe, 3DAssets.dev](https://3dassets.dev/assets/road-car-showroom-lineup-classic-1970s-muscle-coupe-8769428a). Original generic AI-assisted geometry; low-poly. | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | 266,124 |

## Loader notes

- All four load with Three.js GLTFLoader without an external Draco decoder. Classic car uses built-in mesh quantization.
- Skull is a single anatomically detailed mesh. Original scattering material can be replaced with a metallic MeshPhysicalMaterial.
- Motorcycle has six named meshes: Aluminium, Light/Screen, MainBody, Rims, SecondaryBody, Tires. It is a stylized asset.
- Classic car includes named wheel and door pivots and animation clips.
- Concept car has detailed named components and door pivots. It is the preferred sports-car model.

## Visible credit suggestion

3D models: Skull â€” Vladimir Petkovic / Adobe (CC0); Concept car â€” Eric Chadwick / DGG (CC BY 4.0); Motorcycle â€” Poly by Google, adapted by hughdtt (CC BY); Muscle coupe â€” 3DAssets.dev (CC0). Materials and scene presentation modified.

## Geometry inspection

- Classic coupe is +Y up, front +Z. Bounds: [-1.08987, 0, -2.611] to [1.08987, 1.35912, 2.556] metres. Four independent wheel group pivots are [±0.855, 0.34, ±1.435]. Group names: `wheel-front-right`, `wheel-front-left`, `wheel-rear-right`, `wheel-rear-left`. Spin around local X. Each contains actual rubber, alloy, steel and accent meshes. Animation clips: `wheel-roll`, `doors-open`, `bonnet-open`.
- Skull has 97,880 vertices, +Y up, ground at Y˜0. Bounds [-0.10208, 0, -0.16969] to [0.10208, 0.25278, 0.16969]. Its node has a nonzero translation; use world bounding-box centering before scaling. Nose/teeth project toward +Z, inferred from central vertex cross-sections.
- Motorcycle size is [42.858, 67.179, 127.488] in source units; normalize before presentation.
- `scripts/inspect-assets.mjs` parses geometry without textures in Node to verify dimensions and named parts; runtime uses full materials.
