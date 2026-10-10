# Classic coupe asset

`src/assets/classic.ts` exports `createClassicCar()` with `{ root, chassis, wheels, update }`.

The model is an original procedural reconstruction inspired by the supplied green American coupe reference. Its length is approximately 4.9 units; +Z is forward and Y=0 is the nominal ground plane. The body uses continuous sampled surfaces with rounded shoulders and true wheel-arch cutouts. Independently authored parts include the ivory hardtop, transparent glazing, cabin seats and steering wheel, multispoke wheels, suspension springs, chrome trim, bumpers and divided grille.

Call `update(spin, bounce, steer)` with wheel angle in radians, vertical suspension offset in world units, and optional front-wheel steering angle. The chassis moves independently of the wheels. Placement, animation timing, environment lighting and resource disposal belong to the owning scene. The asset has no external model, texture or network dependencies.

Validation: project TypeScript check passed after authoring. Lighting and composition should be reviewed in the integrated scene.
