import * as THREE from "three";
import { treePalettes, type TreeSettings } from "@/lib/tree-settings";

// Garden atmosphere: a single inverted sphere painted with a calm vertical
// gradient, plus matched fog on the scene. Colours are derived from the same
// palette the tree already uses, so the sky never becomes a second, unrelated
// theme. Everything here is disposable and costs one draw call.
const vertexShader = /* glsl */ `
  varying vec3 vSkyDirection;

  void main() {
    vSkyDirection = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vSkyDirection;

  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uFog;
  uniform float uCloud;

  void main() {
    vec3 direction = normalize(vSkyDirection);
    float height = direction.y;

    // Zenith to horizon, then a muted near-ground band under the horizon so
    // the lower dome never reads as a bright stripe behind the meadow.
    vec3 color = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, height));
    // The band under the horizon is haze, not scenery: it matches the ground
    // colour closely and eases over a wide angle, so the dome never draws a
    // visible arc behind the meadow.
    color = mix(uGround, color, smoothstep(-0.6, 0.16, height));

    // Very soft cloud variation high in the sky. Intentionally low contrast:
    // the canopy, not the weather, stays the focus.
    float cloudField =
      sin(direction.x * 8.0 + direction.z * 4.6) *
      sin(direction.z * 9.0 - direction.x * 2.7);
    float cloud = smoothstep(0.12, 0.9, height) * (0.55 + 0.45 * cloudField);
    color += vec3(uCloud * cloud * 0.015);

    // Meet the scene fog at the horizon instead of fighting it.
    float haze = 1.0 - smoothstep(0.0, 0.3, abs(height));
    color = mix(color, uFog, haze * 0.62);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

type Tones = {
  zenith: THREE.Color;
  horizon: THREE.Color;
  ground: THREE.Color;
  fog: THREE.Color;
};

const hsl = { h: 0, s: 0, l: 0 };
const white = new THREE.Color("#ffffff");

// HSL shifts are taken in sRGB so a pale blossom sky and a deep night sky
// respond predictably, rather than drifting in the linear working space.
function shift(color: THREE.Color, dh: number, ds: number, dl: number) {
  color.getHSL(hsl, THREE.SRGBColorSpace);
  color.setHSL(
    (hsl.h + dh + 1) % 1,
    THREE.MathUtils.clamp(hsl.s + ds, 0, 1),
    THREE.MathUtils.clamp(hsl.l + dl, 0, 1),
    THREE.SRGBColorSpace,
  );
  return color;
}

function tonesFor(settings: TreeSettings, out: Tones) {
  const palette = treePalettes[settings.palette],
    base = new THREE.Color(palette.background),
    grass = new THREE.Color(palette.grass),
    light = base.getHSL(hsl).l;
  out.horizon.copy(base).lerp(white, 0.2);
  // Light skies deepen upward; the night palette only needs a touch less
  // brightness, or it turns black and swallows the light of the canopy.
  shift(out.zenith.copy(base), 0.01, 0.04, light > 0.45 ? -0.14 : -0.08);
  // Only a whisper of the grass survives in the lower dome; the meadow mesh
  // carries the ground colour, so all the sky owes it is distance haze.
  out.ground.copy(grass).lerp(out.horizon, 0.84);
  out.fog.copy(out.horizon).lerp(out.ground, 0.45);
}

export type TreeSky = {
  /** Advances the palette blend. Returns true while the sky still needs frames. */
  step(delta: number): boolean;
  configure(settings: TreeSettings): void;
  dispose(): void;
};

export function createTreeSky(
  scene: THREE.Scene,
  initial: TreeSettings,
  camera: THREE.PerspectiveCamera,
  low: boolean,
): TreeSky {
  // The dome rides with the camera so its far side is always comfortably inside
  // the far plane. A world-fixed sphere at this radius would be sliced by the
  // clip plane and leave a polygonal hole in the sky.
  const radius = THREE.MathUtils.clamp(camera.far * 0.68, 80, 120);
  const geometry = new THREE.SphereGeometry(
    radius,
    low ? 20 : 32,
    low ? 12 : 20,
  );
  const current: Tones = {
      zenith: new THREE.Color(),
      horizon: new THREE.Color(),
      ground: new THREE.Color(),
      fog: new THREE.Color(),
    },
    target: Tones = {
      zenith: new THREE.Color(),
      horizon: new THREE.Color(),
      ground: new THREE.Color(),
      fog: new THREE.Color(),
    };
  const uniforms = {
    uZenith: { value: current.zenith },
    uHorizon: { value: current.horizon },
    uGround: { value: current.ground },
    uFog: { value: current.fog },
    uCloud: { value: low ? 0 : 1 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Garden sky";
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;
  mesh.matrixAutoUpdate = false;
  mesh.position.copy(camera.position);
  mesh.updateMatrix();
  scene.add(mesh);
  const fog = new THREE.FogExp2(0xffffff, 0.01),
    background = new THREE.Color();
  scene.fog = fog;
  scene.background = background;
  let initialised = false;
  function densityFor(settings: TreeSettings) {
    // Enough haze to soften the far meadow, nowhere near enough to grey out the
    // canopy. Scaling with size keeps the same read for a sapling and a mature
    // tree, where the camera distance scales too.
    return 0.16 / Math.max(1, settings.size);
  }
  function configure(settings: TreeSettings) {
    tonesFor(settings, target);
    fog.density = densityFor(settings);
    // The first palette snaps into place; later switches ease between tones.
    if (!initialised) {
      current.zenith.copy(target.zenith);
      current.horizon.copy(target.horizon);
      current.ground.copy(target.ground);
      current.fog.copy(target.fog);
      fog.color.copy(current.fog);
      background.copy(current.fog);
      initialised = true;
    }
  }
  configure(initial);
  function step(delta: number) {
    // Keep the dome centred on the eye; the shader reads object-space position,
    // so the gradient stays fixed to world up while the camera orbits.
    if (!mesh.position.equals(camera.position)) {
      mesh.position.copy(camera.position);
      mesh.updateMatrix();
    }
    let difference = 0;
    difference = Math.max(
      difference,
      Math.abs(current.zenith.r - target.zenith.r),
      Math.abs(current.zenith.g - target.zenith.g),
      Math.abs(current.zenith.b - target.zenith.b),
      Math.abs(current.horizon.r - target.horizon.r),
      Math.abs(current.horizon.g - target.horizon.g),
      Math.abs(current.horizon.b - target.horizon.b),
      Math.abs(current.ground.r - target.ground.r),
      Math.abs(current.ground.g - target.ground.g),
      Math.abs(current.ground.b - target.ground.b),
      Math.abs(current.fog.r - target.fog.r),
      Math.abs(current.fog.g - target.fog.g),
      Math.abs(current.fog.b - target.fog.b),
    );
    if (difference < 0.002) return false;
    // ~1.6s to land: a palette switch reads as light changing, not a cut.
    const blend = 1 - Math.exp(-delta * 2.4);
    current.zenith.lerp(target.zenith, blend);
    current.horizon.lerp(target.horizon, blend);
    current.ground.lerp(target.ground, blend);
    current.fog.lerp(target.fog, blend);
    fog.color.copy(current.fog);
    background.copy(current.fog);
    return true;
  }
  function dispose() {
    scene.remove(mesh);
    geometry.dispose();
    material.dispose();
    if (scene.fog === fog) scene.fog = null;
    if (scene.background === background) scene.background = null;
  }
  return { step, configure, dispose };
}
