import * as THREE from 'three';
import { StadiumConfig } from '../../types/football';
import {
  GOAL_DEPTH,
  GOAL_HEIGHT,
  HALF_GOAL_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  POST_RADIUS,
} from '../physics/pitchPhysics';
import {
  createAdBoardTexture,
  createCrowdTexture,
  createPitchTexture,
} from './proceduralTextures';

export interface AnimatedNetEntry {
  side: 'home' | 'away';
  geometry: THREE.BufferGeometry;
  baseZ: Float32Array;
}

export interface StadiumBuildResult {
  group: THREE.Group;
  disposables: { dispose: () => void }[];
  netEntries: AnimatedNetEntry[];
}

export function stepGoalNetRipple(
  netEntries: AnimatedNetEntry[],
  waveTimer: number,
  scoringSide: 'home' | 'away' | null
): void {
  const amp = waveTimer > 0 && scoringSide ? Math.min(0.45, waveTimer * 0.24) : 0;
  const targetNetSide = scoringSide === 'home' ? 'away' : scoringSide === 'away' ? 'home' : null;
  const phase = performance.now() * 0.022;

  for (const entry of netEntries) {
    const pos = entry.geometry.attributes.position as THREE.BufferAttribute;
    const isHit = amp > 0.005 && entry.side === targetNetSide;
    for (let i = 0; i < pos.count; i++) {
      if (isHit) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const wave = Math.sin(px * 1.4 + py * 1.8 + phase) * amp;
        pos.setZ(i, entry.baseZ[i] + wave);
      } else if (pos.getZ(i) !== entry.baseZ[i]) {
        pos.setZ(i, entry.baseZ[i]);
      }
    }
    pos.needsUpdate = true;
  }
}

export function buildStadiumEnvironment(
  config: StadiumConfig,
  maxAnisotropy: number,
  receiveShadows: boolean
): StadiumBuildResult {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const netEntries: AnimatedNetEntry[] = [];

  // 1. Extended outer stadium ground so arena never floats in a void
  const outerGroundGeo = new THREE.PlaneGeometry(360, 360);
  const outerGroundMat = new THREE.MeshStandardMaterial({
    color: config.timeOfDay === 'day' ? 0x1e3a24 : 0x0d1612,
    roughness: 0.95,
    metalness: 0.0,
  });
  const outerGround = new THREE.Mesh(outerGroundGeo, outerGroundMat);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.05;
  group.add(outerGround);
  disposables.push(outerGroundGeo, outerGroundMat);

  // 2. Main Pitch Surface (105m x 68m playable + apron -> 118m x 78m)
  const pitchTex = createPitchTexture(config.pitchPattern, maxAnisotropy);
  const pitchGeo = new THREE.PlaneGeometry(118, 78);
  const pitchMat = new THREE.MeshStandardMaterial({
    map: pitchTex,
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.0,
  });
  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.rotation.x = -Math.PI / 2;
  pitchMesh.position.y = 0;
  pitchMesh.receiveShadow = receiveShadows;
  group.add(pitchMesh);
  disposables.push(pitchTex, pitchGeo, pitchMat);

  // 3. Goals (Home defends -HALF_LENGTH, Away defends +HALF_LENGTH)
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.55 });
  const netMat = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    wireframe: true,
    transparent: true,
    opacity: 0.44,
  });
  disposables.push(postMat, netMat);

  const registerNet = (side: 'home' | 'away', geo: THREE.BufferGeometry) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const baseZ = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) baseZ[i] = pos.getZ(i);
    netEntries.push({ side, geometry: geo, baseZ });
  };

  const createGoal = (side: 'home' | 'away', goalX: number, dir: number) => {
    const goalGroup = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, GOAL_HEIGHT, 12);
    const barGeo = new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, HALF_GOAL_WIDTH * 2 + POST_RADIUS * 2, 12);
    const backBarGeo = new THREE.CylinderGeometry(0.05, 0.05, GOAL_DEPTH, 8);
    const netBackGeo = new THREE.PlaneGeometry(HALF_GOAL_WIDTH * 2, GOAL_HEIGHT, 18, 8);
    const netSideGeo = new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT, 8, 8);
    const netTopGeo = new THREE.PlaneGeometry(GOAL_DEPTH, HALF_GOAL_WIDTH * 2, 8, 18);
    disposables.push(postGeo, barGeo, backBarGeo, netBackGeo, netSideGeo, netTopGeo);
    registerNet(side, netBackGeo);

    const leftPost = new THREE.Mesh(postGeo, postMat);
    leftPost.position.set(goalX, GOAL_HEIGHT / 2, -HALF_GOAL_WIDTH);
    const rightPost = new THREE.Mesh(postGeo, postMat);
    rightPost.position.set(goalX, GOAL_HEIGHT / 2, HALF_GOAL_WIDTH);

    const crossbar = new THREE.Mesh(barGeo, postMat);
    crossbar.rotation.x = Math.PI / 2;
    crossbar.position.set(goalX, GOAL_HEIGHT, 0);

    const topL = new THREE.Mesh(backBarGeo, postMat);
    topL.rotation.z = Math.PI / 2;
    topL.position.set(goalX + dir * (GOAL_DEPTH / 2), GOAL_HEIGHT, -HALF_GOAL_WIDTH);
    const topR = new THREE.Mesh(backBarGeo, postMat);
    topR.rotation.z = Math.PI / 2;
    topR.position.set(goalX + dir * (GOAL_DEPTH / 2), GOAL_HEIGHT, HALF_GOAL_WIDTH);

    const backNet = new THREE.Mesh(netBackGeo, netMat);
    backNet.position.set(goalX + dir * GOAL_DEPTH, GOAL_HEIGHT / 2, 0);
    backNet.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;

    const sideNetL = new THREE.Mesh(netSideGeo, netMat);
    sideNetL.position.set(goalX + dir * (GOAL_DEPTH / 2), GOAL_HEIGHT / 2, -HALF_GOAL_WIDTH);
    const sideNetR = new THREE.Mesh(netSideGeo, netMat);
    sideNetR.position.set(goalX + dir * (GOAL_DEPTH / 2), GOAL_HEIGHT / 2, HALF_GOAL_WIDTH);

    const topNet = new THREE.Mesh(netTopGeo, netMat);
    topNet.rotation.x = -Math.PI / 2;
    topNet.position.set(goalX + dir * (GOAL_DEPTH / 2), GOAL_HEIGHT, 0);

    goalGroup.add(leftPost, rightPost, crossbar, topL, topR, backNet, sideNetL, sideNetR, topNet);
    return goalGroup;
  };

  group.add(createGoal('home', -HALF_LENGTH, -1));
  group.add(createGoal('away', HALF_LENGTH, 1));

  // 4. Corner Flags (4 corners)
  const flagPoleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8);
  const flagClothGeo = new THREE.PlaneGeometry(0.45, 0.3);
  const flagPoleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const flagClothMat = new THREE.MeshStandardMaterial({ color: config.accentColor, side: THREE.DoubleSide, roughness: 0.7 });
  disposables.push(flagPoleGeo, flagClothGeo, flagPoleMat, flagClothMat);

  [
    [-HALF_LENGTH, -HALF_WIDTH],
    [HALF_LENGTH, -HALF_WIDTH],
    [HALF_LENGTH, HALF_WIDTH],
    [-HALF_LENGTH, HALF_WIDTH],
  ].forEach(([cx, cz]) => {
    const pole = new THREE.Mesh(flagPoleGeo, flagPoleMat);
    pole.position.set(cx, 0.7, cz);
    const cloth = new THREE.Mesh(flagClothGeo, flagClothMat);
    cloth.position.set(cx + 0.22, 1.25, cz);
    group.add(pole, cloth);
  });

  // 5. Perimeter Advertising Boards
  const adTex = createAdBoardTexture(config.accentColor);
  const adMat = new THREE.MeshStandardMaterial({ map: adTex, color: 0xffffff, roughness: 0.45, metalness: 0.1 });
  const adNorthGeo = new THREE.BoxGeometry(114, 1.05, 0.25);
  const adSideGeo = new THREE.BoxGeometry(0.25, 1.05, 74);
  disposables.push(adTex, adMat, adNorthGeo, adSideGeo);

  const adNorth = new THREE.Mesh(adNorthGeo, adMat);
  adNorth.position.set(0, 0.52, -HALF_WIDTH - 4.2);
  const adSouth = new THREE.Mesh(adNorthGeo, adMat);
  adSouth.position.set(0, 0.52, HALF_WIDTH + 4.2);
  const adWest = new THREE.Mesh(adSideGeo, adMat);
  adWest.position.set(-HALF_LENGTH - 5.5, 0.52, 0);
  const adEast = new THREE.Mesh(adSideGeo, adMat);
  adEast.position.set(HALF_LENGTH + 5.5, 0.52, 0);
  group.add(adNorth, adSouth, adWest, adEast);

  // 6. Tiered Stadium Stands & Crowd
  const crowdTex = createCrowdTexture();
  const standMat = new THREE.MeshStandardMaterial({ color: config.standColor, roughness: 0.85, metalness: 0.1 });
  const crowdMat = new THREE.MeshStandardMaterial({ map: crowdTex, color: 0xffffff, roughness: 0.9 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.65 });
  disposables.push(crowdTex, standMat, crowdMat, roofMat);

  const buildStand = (w: number, d: number, x: number, z: number, rotY: number) => {
    const sGroup = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(w, 12, d);
    const slopeGeo = new THREE.PlaneGeometry(w - 2, 16);
    const roofGeo = new THREE.BoxGeometry(w, 0.8, d * 0.72);
    disposables.push(baseGeo, slopeGeo, roofGeo);

    const base = new THREE.Mesh(baseGeo, standMat);
    base.position.y = 6;

    const crowd = new THREE.Mesh(slopeGeo, crowdMat);
    crowd.position.set(0, 7.2, d * 0.18);
    crowd.rotation.x = -0.68;

    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 14.8, -d * 0.05);

    sGroup.add(base, crowd, roof);
    sGroup.position.set(x, 0, z);
    sGroup.rotation.y = rotY;
    return sGroup;
  };

  group.add(buildStand(126, 18, 0, -HALF_WIDTH - 16, 0));
  group.add(buildStand(126, 18, 0, HALF_WIDTH + 16, Math.PI));
  group.add(buildStand(84, 16, -HALF_LENGTH - 18, 0, Math.PI / 2));
  group.add(buildStand(84, 16, HALF_LENGTH + 18, 0, -Math.PI / 2));

  // 7. Four Corner Floodlight Towers + Volumetric Light Cones
  const isNightOrDusk = config.timeOfDay === 'night' || config.timeOfDay === 'dusk';
  const pylonGeo = new THREE.CylinderGeometry(0.45, 0.75, 29, 8);
  const headBankGeo = new THREE.BoxGeometry(5.5, 2.6, 0.8);
  const pylonMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.7 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: isNightOrDusk ? 0xfef3c7 : 0x334155,
    emissiveIntensity: isNightOrDusk ? 2.1 : 0.2,
  });
  disposables.push(pylonGeo, headBankGeo, pylonMat, lampMat);

  let beamGeo: THREE.ConeGeometry | null = null;
  let beamMat: THREE.MeshBasicMaterial | null = null;
  if (isNightOrDusk) {
    beamGeo = new THREE.ConeGeometry(16, 62, 16, 1, true);
    beamGeo.translate(0, -31, 0);
    beamGeo.rotateX(-Math.PI / 2);
    beamMat = new THREE.MeshBasicMaterial({
      color: config.timeOfDay === 'dusk' ? 0xfde68a : 0xe0f2fe,
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    disposables.push(beamGeo, beamMat);
  }

  [
    [-64, -44],
    [64, -44],
    [64, 44],
    [-64, 44],
  ].forEach(([tx, tz]) => {
    const pylon = new THREE.Mesh(pylonGeo, pylonMat);
    pylon.position.set(tx, 14.5, tz);
    const bank = new THREE.Mesh(headBankGeo, lampMat);
    bank.position.set(tx, 29.2, tz);
    bank.lookAt(0, 0, 0);
    group.add(pylon, bank);

    if (beamGeo && beamMat) {
      const cone = new THREE.Mesh(beamGeo, beamMat);
      cone.position.set(tx, 29.0, tz);
      cone.lookAt(tx * 0.22, 0, tz * 0.22);
      group.add(cone);
    }
  });

  return { group, disposables, netEntries };
}
