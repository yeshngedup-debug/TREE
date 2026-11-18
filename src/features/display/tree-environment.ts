import * as THREE from "three";
import { treePalettes, type TreeSettings } from "@/lib/tree-settings";
import { seeded, makeLeafTexture } from "./tree-model";

// WebGL adaptation of upstream grass.js: segmented, tapered curved blades,
// a ragged disc, root-to-tip color, and a travelling wind field.
export function createTreeEnvironment(
  scene: THREE.Scene,
  settings: TreeSettings,
  low: boolean,
  // Garden scenes have sky and fog, so the meadow can run out to the horizon.
  // Transparent embeds keep the old island so page chrome stays untouched.
  openSky = false,
) {
  const palette = treePalettes[settings.palette],
    group = new THREE.Group();
  group.name = "Garden ground, shadow and grass";
  scene.add(group);
  const radius = settings.size * 0.62,
    meadowMix = new THREE.Color();
  function meadowColor(next: TreeSettings, out: THREE.Color) {
    const tone = treePalettes[next.palette];
    // Match the average tone of a blade (root to tip), so the meadow the grass
    // sits on reads as the same field rather than a different green plate.
    return out.set(tone.grass).lerp(meadowMix.set(tone.grassTip), 0.34);
  }
  // One soft radial wash under everything: dense near the trunk, thinning to
  // nothing well before the horizon, so the island melts into the fog instead
  // of ending on a hard green rim. A canvas gradient is cheaper than a shader
  // and needs no extra draw call of its own.
  const meadowCanvas = document.createElement("canvas");
  meadowCanvas.width = meadowCanvas.height = 128;
  const meadowContext = meadowCanvas.getContext("2d")!,
    meadowGradient = meadowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  meadowGradient.addColorStop(0, "rgba(255,255,255,0.95)");
  meadowGradient.addColorStop(0.4, "rgba(255,255,255,0.85)");
  meadowGradient.addColorStop(0.68, "rgba(255,255,255,0.45)");
  meadowGradient.addColorStop(0.85, "rgba(255,255,255,0.12)");
  // Reaching zero well inside the geometry means the disc has no rim at all:
  // it simply stops existing before anything can outline it.
  meadowGradient.addColorStop(0.97, "rgba(255,255,255,0)");
  meadowGradient.addColorStop(1, "rgba(255,255,255,0)");
  meadowContext.fillStyle = meadowGradient;
  meadowContext.fillRect(0, 0, 128, 128);
  const meadowTexture = new THREE.CanvasTexture(meadowCanvas),
    meadowGeometry = new THREE.CircleGeometry(settings.size * 2.4, low ? 32 : 64),
    meadowMaterial = new THREE.MeshBasicMaterial({
      map: meadowTexture,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
  meadowColor(settings, meadowMaterial.color);
  const meadow = new THREE.Mesh(meadowGeometry, meadowMaterial);
  meadow.rotation.x = -Math.PI / 2;
  meadow.position.y = -0.05;
  meadow.renderOrder = 1;
  meadow.visible = openSky;
  meadow.name = "Meadow falloff";
  group.add(meadow);
  const groundGeometry = new THREE.PlaneGeometry(160, 160);
  const groundMaterial = new THREE.ShadowMaterial({
    color: palette.shadow,
    // A soft directional shadow: enough to seat the trunk, light enough that
    // the stretched boughs do not read as a second grey tree on the meadow.
    opacity: 0.2,
    // The meadow sits just beneath this plane; without this the shadow catcher
    // writes depth over it and erases the whole field.
    depthWrite: false,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.045;
  // Drawn after the meadow so the shadow lands on the field instead of being
  // hidden by it; neither plane writes depth.
  ground.renderOrder = 2;
  ground.receiveShadow = true;
  group.add(ground);

  const contactCanvas = document.createElement("canvas");
  contactCanvas.width = contactCanvas.height = 128;
  const context = contactCanvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(25,40,40,.25)");
  gradient.addColorStop(0.35, "rgba(25,40,40,.12)");
  gradient.addColorStop(1, "rgba(25,40,40,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const contactTexture = new THREE.CanvasTexture(contactCanvas),
    contactGeometry = new THREE.PlaneGeometry(radius * 1.1, radius * 1.1),
    contactMaterial = new THREE.MeshBasicMaterial({
      map: contactTexture,
      transparent: true,
      depthWrite: false,
    });
  const contact = new THREE.Mesh(contactGeometry, contactMaterial);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = -0.02;
  contact.renderOrder = 3;
  group.add(contact);

  const bladeGeometry = new THREE.BufferGeometry();
  const vertices: number[] = [],
    normals: number[] = [],
    indices: number[] = [];
  for (let segment = 0; segment <= 4; segment++) {
    const t = segment / 4,
      width = (1 - t) ** 0.7;
    for (const side of [-0.5, 0.5]) {
      vertices.push(side * width, t, t * t * 0.24);
      normals.push(0, 1, 0);
    }
    if (segment < 4) {
      const v = segment * 2;
      indices.push(v, v + 1, v + 2, v + 2, v + 1, v + 3);
    }
  }
  bladeGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  bladeGeometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normals, 3),
  );
  bladeGeometry.setIndex(indices);
  const uniforms = {
    uGrassTime: { value: 0 },
    uGrassWind: { value: 0 },
    uGrassDirection: {
      value: THREE.MathUtils.degToRad(settings.windDirection),
    },
    uGrassRoot: { value: new THREE.Color(palette.grass) },
    uGrassTip: { value: new THREE.Color(palette.grassTip) },
  };
  const grassMaterial = new THREE.MeshLambertMaterial({
    side: THREE.DoubleSide,
  });
  grassMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      uniform float uGrassTime, uGrassWind, uGrassDirection;
      varying float vBladeHeight;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vBladeHeight = position.y;`,
      )
      .replace(
        "#include <project_vertex>",
        `
        vec4 gardenPosition = instanceMatrix * vec4(transformed, 1.);
        float phase = gardenPosition.x * 1.8 + gardenPosition.z * 1.3;
        float breeze = .65 + .35 * sin(uGrassTime * 2.2 - phase)
          + .18 * sin(uGrassTime * 4.5 + phase * 1.7);
        float bend = position.y * position.y * uGrassWind;
        gardenPosition.x += cos(uGrassDirection) * bend * breeze;
        gardenPosition.z += sin(uGrassDirection) * bend * breeze;
        gardenPosition.y -= abs(bend) * .12;
        vec4 mvPosition = modelViewMatrix * gardenPosition;
        gl_Position = projectionMatrix * mvPosition;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      uniform vec3 uGrassRoot, uGrassTip; varying float vBladeHeight;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb *= mix(uGrassRoot, uGrassTip, smoothstep(0., 1., vBladeHeight));`,
      )
      .replace(
        "#include <opaque_fragment>",
        "outgoingLight = mix(diffuseColor.rgb * .85, outgoingLight, .45);\n#include <opaque_fragment>",
      );
  };
  const grass = new THREE.InstancedMesh(
    bladeGeometry,
    grassMaterial,
    settings.grass ? (low ? 3000 : 14000) : 0,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < grass.count; i++) {
    const angle = seeded(i + 19) * Math.PI * 2,
      r = Math.sqrt(seeded(i + 4)) * radius,
      rim = 1 + Math.sin(angle * 5) * 0.09 + Math.cos(angle * 7) * 0.06,
      fullness = 1 - THREE.MathUtils.smoothstep(r / (radius * rim), 0.65, 1),
      height = (0.19 + seeded(i + 8) * 0.19) * Math.max(0.03, fullness);
    dummy.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    dummy.rotation.set(
      0,
      seeded(i + 25) * Math.PI * 2,
      (seeded(i + 2) - 0.5) * 0.35,
    );
    dummy.scale.set(0.035 + seeded(i + 9) * 0.025, height, height);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
  }
  grass.frustumCulled = false;
  grass.receiveShadow = true;
  group.add(grass);

  const petalTexture = makeLeafTexture(settings.leafShape),
    petalGeometry = new THREE.PlaneGeometry(0.12, 0.12),
    petalMaterial = new THREE.MeshLambertMaterial({
      map: petalTexture,
      alphaTest: 0.4,
      side: THREE.DoubleSide,
      color: palette.leaves[1],
    });
  const petals = new THREE.InstancedMesh(
    petalGeometry,
    petalMaterial,
    low ? 8 : 18,
  );
  petals.frustumCulled = false;
  petals.name = "Windborne petals";
  group.add(petals);
  function step(
    now: number,
    reduced: boolean,
    contributions: number,
    gust: number,
  ) {    const time = (now / 1000) * settings.windSpeed;
    uniforms.uGrassTime.value = time;
    uniforms.uGrassWind.value = reduced ? 0 : settings.wind * 0.35 * (1 + gust);
    petals.count =
      reduced || !settings.wind || contributions === 0 ? 0 : low ? 8 : 18;
    for (let i = 0; i < petals.count; i++) {
      const t = (time * (0.035 + seeded(i + 67) * 0.025) + seeded(i + 84)) % 1;
      dummy.position.set(
        (seeded(i + 7) - 0.5) * radius * 1.6 +
          Math.sin(t * 5 + i) * 0.5 +
          t * settings.wind,
        (1 - t) * settings.size * 0.9,
        (seeded(i + 34) - 0.5) * radius * 1.1 + Math.cos(t * 5 + i) * 0.3,
      );
      dummy.rotation.set(time + i, time * 0.65 + i, time * 1.4 + i);
      dummy.scale.setScalar(
        Math.sin(t * Math.PI) * (0.5 + seeded(i + 88) * 0.6),
      );
      dummy.updateMatrix();
      petals.setMatrixAt(i, dummy.matrix);
    }
    petals.instanceMatrix.needsUpdate = true;
  }
  function dispose() {
    scene.remove(group);
    grass.dispose();
    petals.dispose();
    for (const item of [
      groundGeometry,
      groundMaterial,
      meadowTexture,
      meadowGeometry,
      meadowMaterial,
      contactTexture,
      contactGeometry,
      contactMaterial,
      bladeGeometry,
      grassMaterial,
      petalTexture,
      petalGeometry,
      petalMaterial,
    ])
      item.dispose();
  }
  return {
    step,
    dispose,
    grassCount: grass.count,
    configure(next: TreeSettings) {
      const recolour = next.palette !== settings.palette;
      settings = next;
      uniforms.uGrassDirection.value = THREE.MathUtils.degToRad(
        next.windDirection,
      );
      if (!recolour) return;
      const palette = treePalettes[next.palette];
      uniforms.uGrassRoot.value.set(palette.grass);
      uniforms.uGrassTip.value.set(palette.grassTip);
      petalMaterial.color.set(palette.leaves[1]);
      groundMaterial.color.set(palette.shadow);
      meadowColor(next, meadowMaterial.color);
    },
  };
}
