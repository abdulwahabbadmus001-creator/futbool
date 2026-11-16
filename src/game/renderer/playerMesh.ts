import * as THREE from 'three';
import { CursorColorTier, KitDesign } from '../../types/football';
import { SimPlayer } from '../players/playerKinematics';
import {
  getKitNormalAndSpecularMaps,
  getSkinSweatSpecularMap,
} from './proceduralTextures';

// Anatomically proportioned PS3/Xbox 360 Era PES 2012 geometries (shared across 22 footballers)
const headGeo = new THREE.SphereGeometry(0.162, 22, 18);
const jawGeo = new THREE.CylinderGeometry(0.112, 0.084, 0.115, 14);
const browRidgeGeo = new THREE.BoxGeometry(0.18, 0.028, 0.06);
const earGeo = new THREE.SphereGeometry(0.032, 10, 8);
const noseGeo = new THREE.ConeGeometry(0.024, 0.058, 8);
const eyeGeo = new THREE.SphereGeometry(0.018, 8, 8);

// Sculpted Solid 3D Hair Mesh (no alpha strands — classic PS3/Xbox 360 solid hair wedges)
const hairCapGeo = new THREE.SphereGeometry(0.17, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58);
const hairQuiffWedgeGeo = new THREE.ConeGeometry(0.095, 0.14, 6);
const hairSideWedgeGeo = new THREE.BoxGeometry(0.045, 0.11, 0.16);
const hairLongGeo = new THREE.CylinderGeometry(0.155, 0.172, 0.165, 14);

const neckGeo = new THREE.CylinderGeometry(0.072, 0.084, 0.115, 14);
const collarGeo = new THREE.TorusGeometry(0.092, 0.02, 10, 18);

// Athletic Build with Broad Shoulders & 2011-2012 Fitted Jersey + Rigid Cloth Fold Ridges
const chestGeo = new THREE.CylinderGeometry(0.258, 0.192, 0.35, 18);
const waistGeo = new THREE.CylinderGeometry(0.192, 0.178, 0.22, 16);
const clothFoldRidgeGeo = new THREE.TorusGeometry(0.188, 0.011, 8, 18);
const shoulderGeo = new THREE.SphereGeometry(0.09, 14, 12);
const sleeveGeo = new THREE.CylinderGeometry(0.076, 0.064, 0.19, 14);
const forearmGeo = new THREE.CylinderGeometry(0.056, 0.044, 0.24, 12);
const wristbandGeo = new THREE.CylinderGeometry(0.048, 0.046, 0.045, 10);
const handGeo = new THREE.SphereGeometry(0.046, 10, 8);
const sashGeo = new THREE.BoxGeometry(0.48, 0.09, 0.36);

// Matching Athletic Shorts & Knee-High Socks
const shortsWaistGeo = new THREE.CylinderGeometry(0.188, 0.198, 0.165, 16);
const shortsThighGeo = new THREE.CylinderGeometry(0.098, 0.09, 0.17, 14);
const thighGeo = new THREE.CylinderGeometry(0.084, 0.07, 0.26, 14);
const kneeGeo = new THREE.SphereGeometry(0.068, 12, 10);
const calfSockGeo = new THREE.CylinderGeometry(0.068, 0.049, 0.32, 14);
const sockCuffGeo = new THREE.TorusGeometry(0.067, 0.012, 8, 16);
const ankleTapeGeo = new THREE.CylinderGeometry(0.052, 0.05, 0.06, 12);

// Classic 2012 Neon Football Boots + Heel Counter + Cleat Studs
const bootGeo = new THREE.BoxGeometry(0.116, 0.076, 0.255);
const bootToeGeo = new THREE.SphereGeometry(0.057, 12, 10);
const bootStripeGeo = new THREE.BoxGeometry(0.122, 0.045, 0.07);
const shadowGeo = new THREE.CircleGeometry(0.46, 20);
const ringGeo = new THREE.RingGeometry(0.52, 0.68, 28);

// PES 2012 P1 Bright Red Inverted Triangle Cursor & Hollow Next-Player Switch Triangle
const cursorConeGeo = new THREE.ConeGeometry(0.22, 0.38, 3);
const nextCursorWireGeo = new THREE.ConeGeometry(0.21, 0.36, 3);

export interface PlayerRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftForearmPivot: THREE.Group;
  rightForearmPivot: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftCalfPivot: THREE.Group;
  rightCalfPivot: THREE.Group;
  indicatorRing: THREE.Mesh;
  overheadCursor: THREE.Mesh;
  playerNameTag: THREE.Sprite;
  runArrow: THREE.ArrowHelper;
  wasControlled: boolean;
  cursorSwitchAt: number;
}

export function createPlayerRig(
  simPlayer: SimPlayer,
  kit: KitDesign,
  shadowTexture: THREE.Texture,
  castShadow: boolean,
  _cursorColor: CursorColorTier = 'orange'
): PlayerRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isGK = simPlayer.role === 'GK';
  const jerseyColor = isGK ? kit.gkPrimary : kit.primary;
  const secondaryColor = isGK ? '#111827' : kit.secondary;

  const { normalMap: kitNormalMap, specularMap: kitSpecularMap } = getKitNormalAndSpecularMaps();
  const skinSweatSpecMap = getSkinSweatSpecularMap();

  // PS3 / Xbox 360 Era Blinn-Phong Skin Shader with Sweat Specular Highlight
  const skinMat = new THREE.MeshPhongMaterial({
    color: simPlayer.appearance.skinTone,
    specular: new THREE.Color(0x524036),
    specularMap: skinSweatSpecMap,
    shininess: 38,
  });

  // Sculpted Solid 3D Hair Mesh Material (anisotropic-like satin sheen, no alpha strands)
  const hairMat = new THREE.MeshPhongMaterial({
    color: simPlayer.appearance.hairColor,
    specular: new THREE.Color(0x2d3748),
    shininess: 24,
  });

  const eyeDarkMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });

  // 2011-2012 Fitted Polyester Football Jersey with Rigid Cloth Fold Normal & Specular Maps
  const jerseyMat = new THREE.MeshPhongMaterial({
    color: jerseyColor,
    normalMap: kitNormalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    specularMap: kitSpecularMap,
    specular: new THREE.Color(0x3b4859),
    shininess: 48,
  });

  const accentMat = new THREE.MeshPhongMaterial({
    color: secondaryColor,
    specular: new THREE.Color(0x475569),
    shininess: 52,
  });

  const shortsMat = new THREE.MeshPhongMaterial({
    color: isGK ? '#111827' : kit.shorts,
    normalMap: kitNormalMap,
    normalScale: new THREE.Vector2(0.32, 0.32),
    specular: new THREE.Color(0x2e3846),
    shininess: 36,
  });

  const socksMat = new THREE.MeshPhongMaterial({
    color: isGK ? kit.gkPrimary : kit.socks,
    specular: new THREE.Color(0x1e293b),
    shininess: 18,
  });

  const tapeMat = new THREE.MeshPhongMaterial({
    color: '#f8fafc',
    specular: new THREE.Color(0x334155),
    shininess: 22,
  });

  // Classic 2012 Neon Football Boots (Volt / Crimson / Electric Cyan / Solar Orange)
  const bootMat = new THREE.MeshPhongMaterial({
    color: simPlayer.appearance.bootColor,
    specular: new THREE.Color(0xffffff),
    shininess: 92,
  });
  const bootAccentMat = new THREE.MeshPhongMaterial({
    color: '#0f172a',
    specular: new THREE.Color(0x94a3b8),
    shininess: 75,
  });

  // Western PES 2012 P1 Cursor is Bright Red (#EF4444)
  const p1RedHex = 0xef4444;

  // 1. Contact shadow disc grounded at y = 0.015
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.68,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  root.add(shadowMesh);

  // 2. Ground target ring + PES 2012 Overhead Red Inverted Triangle Cursor
  const ringMat = new THREE.MeshBasicMaterial({
    color: p1RedHex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const indicatorRing = new THREE.Mesh(ringGeo, ringMat);
  indicatorRing.rotation.x = -Math.PI / 2;
  indicatorRing.position.y = 0.025;
  indicatorRing.visible = simPlayer.isControlled;
  root.add(indicatorRing);

  const cursorMat = new THREE.MeshBasicMaterial({
    color: p1RedHex,
    transparent: true,
    opacity: 0.96,
    wireframe: false,
  });
  const overheadCursor = new THREE.Mesh(cursorConeGeo, cursorMat);
  overheadCursor.rotation.x = Math.PI; // Inverted downward-pointing triangle
  overheadCursor.position.y = 2.28;
  overheadCursor.visible = simPlayer.isControlled;
  root.add(overheadCursor);

  const tagCanvas = document.createElement('canvas');
  tagCanvas.width = 256;
  tagCanvas.height = 64;
  const tagContext = tagCanvas.getContext('2d');
  if (!tagContext) throw new Error('Unable to create player indicator canvas context');
  const tagColor = simPlayer.side === 'home' ? '#ef4444' : '#16a34a';
  tagContext.fillStyle = 'rgba(5, 12, 28, 0.92)';
  tagContext.fillRect(2, 2, 252, 60);
  tagContext.strokeStyle = tagColor;
  tagContext.lineWidth = 6;
  tagContext.strokeRect(3, 3, 250, 58);
  tagContext.fillStyle = tagColor;
  tagContext.font = 'bold 27px Arial, sans-serif';
  tagContext.textAlign = 'center';
  tagContext.textBaseline = 'middle';
  tagContext.fillText(simPlayer.shortName.toUpperCase(), 128, 33, 236);
  const tagTexture = new THREE.CanvasTexture(tagCanvas);
  const playerNameTag = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tagTexture, transparent: true, depthTest: false })
  );
  playerNameTag.position.y = 2.75;
  playerNameTag.scale.set(2.2, 0.55, 1);
  playerNameTag.visible = simPlayer.isControlled;
  root.add(playerNameTag);

  const runArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0.12, 0),
    2,
    0x7dd3fc,
    0.62,
    0.36
  );
  if (runArrow.line.material instanceof THREE.LineBasicMaterial) {
    runArrow.line.material.transparent = true;
    runArrow.line.material.opacity = 0.48;
  }
  if (runArrow.cone.material instanceof THREE.MeshBasicMaterial) {
    runArrow.cone.material.transparent = true;
    runArrow.cone.material.opacity = 0.58;
  }
  runArrow.visible = false;
  root.add(runArrow);

  // 3. Athletic Human Torso (Broad Shoulders + Fitted Chest + Rigid Cloth Fold Ridges)
  const chest = new THREE.Mesh(chestGeo, jerseyMat);
  chest.position.y = 1.15;
  chest.scale.set(1.08, 1, 0.72);
  chest.castShadow = castShadow;
  bodyGroup.add(chest);

  const waist = new THREE.Mesh(waistGeo, jerseyMat);
  waist.position.y = 0.9;
  waist.scale.set(1.0, 1, 0.7);
  waist.castShadow = castShadow;
  bodyGroup.add(waist);

  // Sculpted 3D Rigid Cloth Fold Ridges on Fitted 2011-2012 Jersey
  const foldUpper = new THREE.Mesh(clothFoldRidgeGeo, jerseyMat);
  foldUpper.rotation.x = Math.PI / 2 + 0.08;
  foldUpper.position.y = 0.99;
  foldUpper.scale.set(1.02, 0.71, 1);
  const foldLower = new THREE.Mesh(clothFoldRidgeGeo, jerseyMat);
  foldLower.rotation.x = Math.PI / 2 - 0.06;
  foldLower.position.y = 0.86;
  foldLower.scale.set(0.96, 0.69, 1);
  bodyGroup.add(foldUpper, foldLower);

  const collar = new THREE.Mesh(collarGeo, accentMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.32;
  bodyGroup.add(collar);

  if (kit.pattern !== 'solid') {
    const trim = new THREE.Mesh(sashGeo, accentMat);
    trim.position.y = 1.1;
    trim.scale.set(0.95, 1, 0.75);
    trim.rotation.z = kit.pattern === 'sash' ? 0.45 : 0;
    bodyGroup.add(trim);
  }

  // 4. Contoured Football Shorts
  const shortsWaist = new THREE.Mesh(shortsWaistGeo, shortsMat);
  shortsWaist.position.y = 0.74;
  shortsWaist.scale.set(1.02, 1, 0.74);
  shortsWaist.castShadow = castShadow;
  bodyGroup.add(shortsWaist);

  // 5. Sculpted Human Neck, Head, Brow, Jawline & Solid 3D Hair Mesh
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 1.37;
  bodyGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.54;
  bodyGroup.add(headGroup);

  const cranium = new THREE.Mesh(headGeo, skinMat);
  cranium.scale.set(0.92, 1.06, 0.98);
  cranium.castShadow = castShadow;
  headGroup.add(cranium);

  const browRidge = new THREE.Mesh(browRidgeGeo, skinMat);
  browRidge.position.set(0, 0.042, 0.132);
  headGroup.add(browRidge);

  const jaw = new THREE.Mesh(jawGeo, skinMat);
  jaw.position.set(0, -0.07, 0.02);
  jaw.scale.set(0.9, 1, 0.92);
  headGroup.add(jaw);

  // Ears
  const leftEar = new THREE.Mesh(earGeo, skinMat);
  leftEar.position.set(-0.146, -0.01, 0);
  const rightEar = new THREE.Mesh(earGeo, skinMat);
  rightEar.position.set(0.146, -0.01, 0);
  headGroup.add(leftEar, rightEar);

  // Nose & Eyes facing forward (+Z)
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.01, 0.165);
  headGroup.add(nose);

  const leftEye = new THREE.Mesh(eyeGeo, eyeDarkMat);
  leftEye.position.set(-0.052, 0.025, 0.148);
  const rightEye = new THREE.Mesh(eyeGeo, eyeDarkMat);
  rightEye.position.set(0.052, 0.025, 0.148);
  headGroup.add(leftEye, rightEye);

  // Sculpted Solid 3D Hair Mesh (Crown Cap + Front Quiff Wedge + Side Temporal Blocks)
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.position.y = 0.022;
  hairCap.rotation.x = -0.14;
  headGroup.add(hairCap);

  if (simPlayer.appearance.hairStyle !== 'buzz') {
    const hairQuiff = new THREE.Mesh(hairQuiffWedgeGeo, hairMat);
    hairQuiff.position.set(0, 0.135, 0.095);
    hairQuiff.rotation.x = 0.55;
    hairQuiff.scale.set(1.15, 0.75, 0.9);
    headGroup.add(hairQuiff);

    const sideHairL = new THREE.Mesh(hairSideWedgeGeo, hairMat);
    sideHairL.position.set(-0.135, 0.03, -0.01);
    const sideHairR = new THREE.Mesh(hairSideWedgeGeo, hairMat);
    sideHairR.position.set(0.135, 0.03, -0.01);
    headGroup.add(sideHairL, sideHairR);

    if (simPlayer.appearance.hairStyle === 'long') {
      const backHair = new THREE.Mesh(hairLongGeo, hairMat);
      backHair.position.set(0, -0.04, -0.05);
      headGroup.add(backHair);
    }
  }

  // 6. Articulated Human Arms (Broad Deltoid Shoulder + Fitted Sleeve + Elbow Pivot + Forearm + Wristband + Hand)
  const makeArm = (offsetX: number) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(offsetX, 1.28, 0);

    const shoulder = new THREE.Mesh(shoulderGeo, jerseyMat);
    shoulderPivot.add(shoulder);

    const sleeve = new THREE.Mesh(sleeveGeo, jerseyMat);
    sleeve.position.y = -0.095;
    sleeve.castShadow = castShadow;
    shoulderPivot.add(sleeve);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.19, 0);
    shoulderPivot.add(forearmPivot);

    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.y = -0.11;
    forearm.castShadow = castShadow;
    forearmPivot.add(forearm);

    const wristband = new THREE.Mesh(wristbandGeo, tapeMat);
    wristband.position.y = -0.21;
    forearmPivot.add(wristband);

    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.y = -0.25;
    forearmPivot.add(hand);

    return { shoulderPivot, forearmPivot };
  };
  const leftArmRig = makeArm(-0.285);
  const rightArmRig = makeArm(0.285);
  bodyGroup.add(leftArmRig.shoulderPivot, rightArmRig.shoulderPivot);

  // 7. Articulated Human Legs (Shorts + Thigh + Knee Pivot + Knee-High Sock + Ankle Tape + 2012 Neon Boot)
  const makeLeg = (offsetX: number) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(offsetX, 0.66, 0);

    const shortLeg = new THREE.Mesh(shortsThighGeo, shortsMat);
    shortLeg.position.y = -0.06;
    hipPivot.add(shortLeg);

    const thigh = new THREE.Mesh(thighGeo, skinMat);
    thigh.position.y = -0.18;
    thigh.castShadow = castShadow;
    hipPivot.add(thigh);

    const knee = new THREE.Mesh(kneeGeo, skinMat);
    knee.position.y = -0.31;
    hipPivot.add(knee);

    const calfPivot = new THREE.Group();
    calfPivot.position.set(0, -0.31, 0);
    hipPivot.add(calfPivot);

    const sockCuff = new THREE.Mesh(sockCuffGeo, accentMat);
    sockCuff.rotation.x = Math.PI / 2;
    sockCuff.position.y = -0.02;
    calfPivot.add(sockCuff);

    const sock = new THREE.Mesh(calfSockGeo, socksMat);
    sock.position.y = -0.15;
    sock.castShadow = castShadow;
    calfPivot.add(sock);

    const ankleTape = new THREE.Mesh(ankleTapeGeo, tapeMat);
    ankleTape.position.y = -0.27;
    calfPivot.add(ankleTape);

    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(0, -0.31, 0.045);
    boot.castShadow = castShadow;
    calfPivot.add(boot);

    const bootStripe = new THREE.Mesh(bootStripeGeo, bootAccentMat);
    bootStripe.position.set(0, -0.305, 0.04);
    calfPivot.add(bootStripe);

    const bootToe = new THREE.Mesh(bootToeGeo, bootMat);
    bootToe.position.set(0, -0.31, 0.16);
    bootToe.scale.set(1, 0.65, 1.1);
    calfPivot.add(bootToe);

    return { hipPivot, calfPivot };
  };
  const leftLegRig = makeLeg(-0.115);
  const rightLegRig = makeLeg(0.115);
  bodyGroup.add(leftLegRig.hipPivot, rightLegRig.hipPivot);

  root.position.set(simPlayer.x, 0, simPlayer.z);
  return {
    root,
    bodyGroup,
    leftArm: leftArmRig.shoulderPivot,
    rightArm: rightArmRig.shoulderPivot,
    leftForearmPivot: leftArmRig.forearmPivot,
    rightForearmPivot: rightArmRig.forearmPivot,
    leftLeg: leftLegRig.hipPivot,
    rightLeg: rightLegRig.hipPivot,
    leftCalfPivot: leftLegRig.calfPivot,
    rightCalfPivot: rightLegRig.calfPivot,
    indicatorRing,
    overheadCursor,
    playerNameTag,
    runArrow,
    wasControlled: simPlayer.isControlled,
    cursorSwitchAt: 0,
  };
}

/**
 * Helper for Rigging Preview & PES 2012 Character Animation Showcase
 * Supports: 't-pose' | 'a-pose' | 'dribble-cycle' | 'cut-45'
 */
export function setPlayerRigPose(
  rig: PlayerRig,
  pose: 't-pose' | 'a-pose' | 'dribble-cycle' | 'cut-45',
  timeSec: number
): void {
  if (pose === 't-pose') {
    rig.bodyGroup.position.set(0, 0, 0);
    rig.bodyGroup.rotation.set(0, 0, 0);
    rig.leftArm.rotation.set(0, 0, -Math.PI / 2);
    rig.rightArm.rotation.set(0, 0, Math.PI / 2);
    rig.leftForearmPivot.rotation.set(0, 0, 0);
    rig.rightForearmPivot.rotation.set(0, 0, 0);
    rig.leftLeg.rotation.set(0, 0, -0.05);
    rig.rightLeg.rotation.set(0, 0, 0.05);
    rig.leftCalfPivot.rotation.set(0, 0, 0);
    rig.rightCalfPivot.rotation.set(0, 0, 0);
    return;
  }

  if (pose === 'a-pose') {
    rig.bodyGroup.position.set(0, 0, 0);
    rig.bodyGroup.rotation.set(0, 0, 0);
    rig.leftArm.rotation.set(0, 0, -0.68);
    rig.rightArm.rotation.set(0, 0, 0.68);
    rig.leftForearmPivot.rotation.set(-0.18, 0, 0);
    rig.rightForearmPivot.rotation.set(-0.18, 0, 0);
    rig.leftLeg.rotation.set(0, 0, -0.06);
    rig.rightLeg.rotation.set(0, 0, 0.06);
    rig.leftCalfPivot.rotation.set(0, 0, 0);
    rig.rightCalfPivot.rotation.set(0, 0, 0);
    return;
  }

  if (pose === 'cut-45') {
    // Sharp, snappy 45-degree directional cut with planted pivot foot
    const cutCycle = Math.sin(timeSec * 4.2);
    const dir = cutCycle >= 0 ? 1 : -1;
    rig.bodyGroup.rotation.x = 0.24; // Forward torso lean
    rig.bodyGroup.rotation.z = -dir * 0.34; // Snappy 45-deg directional cut bank
    rig.bodyGroup.rotation.y = dir * (Math.PI / 4) * Math.min(1, Math.abs(cutCycle) * 1.45);
    rig.bodyGroup.position.y = -0.05 + Math.abs(cutCycle) * 0.04;

    // Arms bent at elbows for balance
    rig.leftArm.rotation.set(-0.32 * dir, 0, -0.38);
    rig.rightArm.rotation.set(0.32 * dir, 0, 0.38);
    rig.leftForearmPivot.rotation.set(-1.12, 0, 0);
    rig.rightForearmPivot.rotation.set(-1.12, 0, 0);

    // Planted outside pivot leg + inside push-off leg
    rig.leftLeg.rotation.set(dir > 0 ? -0.52 : 0.35, 0, -0.18);
    rig.rightLeg.rotation.set(dir > 0 ? 0.35 : -0.52, 0, 0.18);
    rig.leftCalfPivot.rotation.set(dir > 0 ? 0.68 : 0.22, 0, 0);
    rig.rightCalfPivot.rotation.set(dir > 0 ? 0.22 : 0.68, 0, 0);
    return;
  }

  // 'dribble-cycle': 2012 arcade-simulation dribbling cycle
  // Slight forward torso lean, quick rhythmic foot taps, elbows bent for balance, minimal shoulder sway
  const phase = timeSec * 10.5;
  const stride = Math.sin(phase);
  const tapPulse = Math.max(0, Math.sin(phase * 2));

  rig.bodyGroup.rotation.x = 0.22; // Slight forward torso lean
  rig.bodyGroup.rotation.z = Math.sin(phase * 0.5) * 0.035; // Minimal shoulder sway
  rig.bodyGroup.rotation.y = 0;
  rig.bodyGroup.position.y = Math.abs(Math.cos(phase)) * 0.055;

  // Arms bent at elbows (~62 deg) for balance with compact swing
  rig.leftArm.rotation.set(-stride * 0.42, 0, -0.22);
  rig.rightArm.rotation.set(stride * 0.42, 0, 0.22);
  rig.leftForearmPivot.rotation.set(-1.08, 0, 0);
  rig.rightForearmPivot.rotation.set(-1.08, 0, 0);

  // Rhythmic stride + quick foot tap to push the ball forward
  rig.leftLeg.rotation.set(stride * 0.68, 0, 0);
  rig.rightLeg.rotation.set(-stride * 0.68 - tapPulse * 0.22, 0, 0);
  rig.leftCalfPivot.rotation.set(Math.max(0, -stride) * 0.85, 0, 0);
  rig.rightCalfPivot.rotation.set(Math.max(0, stride) * 0.85 - tapPulse * 0.35, 0, 0);
}

export function updatePlayerRig(
  rig: PlayerRig,
  p: SimPlayer,
  dt: number,
  _cursorColor: CursorColorTier = 'orange'
): void {
  rig.root.visible = !p.redCard;
  if (p.redCard) return;

  rig.root.position.set(p.x, p.y || 0, p.z);
  rig.bodyGroup.rotation.y = Math.PI / 2 - p.facing + (p.skillSpin || 0);

  const isTeammateRunner = !p.isControlled && p.teammateRunTimer > 0 && p.side === 'home';
  const showCursor = p.isControlled || isTeammateRunner;
  rig.indicatorRing.visible = p.isControlled;
  rig.overheadCursor.visible = showCursor;
  rig.playerNameTag.visible = p.isControlled;
  if (p.isControlled && !rig.wasControlled) rig.cursorSwitchAt = performance.now();
  rig.wasControlled = p.isControlled;

  const runX = p.teammateRunTargetX - p.x;
  const runZ = p.teammateRunTargetZ - p.z;
  const runDistance = Math.hypot(runX, runZ);
  rig.runArrow.visible = isTeammateRunner && runDistance > 0.1;
  if (rig.runArrow.visible) {
    rig.runArrow.position.set(0, 0.12, 0);
    rig.runArrow.setDirection(new THREE.Vector3(runX / runDistance, 0, runZ / runDistance));
    rig.runArrow.setLength(Math.min(4.5, runDistance), 0.7, 0.4);
  }

  if (showCursor) {
    const bob = Math.sin(performance.now() * 0.006 + p.slotIndex) * 0.08;
    rig.overheadCursor.position.y = 2.26 + bob;
    rig.overheadCursor.rotation.y += dt * 1.6;
    const mat = rig.overheadCursor.material as THREE.MeshBasicMaterial;
    const cursorColor = p.side === 'home' ? 0xef4444 : 0x22c55e;
    const sinceSwitch = performance.now() - rig.cursorSwitchAt;
    const switchPulse = p.isControlled && sinceSwitch < 700
      ? 0.58 + Math.abs(Math.sin((sinceSwitch / 700) * Math.PI * 4)) * 0.42
      : 1;
    mat.color.setHex(cursorColor);
    mat.wireframe = isTeammateRunner;
    mat.opacity = isTeammateRunner ? 0.55 : 0.96 * switchPulse;
    rig.overheadCursor.geometry = isTeammateRunner ? nextCursorWireGeo : cursorConeGeo;
    (rig.indicatorRing.material as THREE.MeshBasicMaterial).color.setHex(cursorColor);
    const tagMaterial = rig.playerNameTag.material as THREE.SpriteMaterial;
    tagMaterial.opacity = switchPulse;
  }

  // Forward torso lean during PES 2012 running/sprinting/dribbling
  const isRunning = p.actionAnim === 'run' || p.actionAnim === 'sprint';
  const targetTilt =
    p.actionAnim === 'dive'
      ? p.diveDirZ >= 0
        ? -1.15
        : 1.15
      : p.actionAnim === 'tackle'
        ? -0.65
        : p.shielding || p.actionAnim === 'roulette'
          ? 0.24
          : isRunning
            ? p.actionAnim === 'sprint'
              ? 0.23
              : 0.17
            : 0;
  rig.bodyGroup.rotation.x += (targetTilt - rig.bodyGroup.rotation.x) * (1 - Math.exp(-12 * dt));

  const targetRoll =
    p.actionAnim === 'feint'
      ? p.feintDir * 0.34
      : isRunning
        ? Math.sin(p.walkCycle * 0.5) * 0.035 // Minimal shoulder sway
        : 0;
  rig.bodyGroup.rotation.z += (targetRoll - rig.bodyGroup.rotation.z) * (1 - Math.exp(-15 * dt));

  if (p.actionAnim === 'kick') {
    rig.rightLeg.rotation.x = -0.95;
    rig.leftLeg.rotation.x = 0.3;
    rig.leftCalfPivot.rotation.x = 0.35;
    rig.rightCalfPivot.rotation.x = 0.1;
    rig.leftArm.rotation.x = -0.5;
    rig.rightArm.rotation.x = 0.5;
    rig.leftForearmPivot.rotation.x = -0.85;
    rig.rightForearmPivot.rotation.x = -0.85;
  } else if (p.actionAnim === 'celebrate') {
    const wave = Math.sin(performance.now() * 0.012);
    rig.leftArm.rotation.z = -2.4 + wave * 0.25;
    rig.rightArm.rotation.z = 2.4 - wave * 0.25;
    rig.leftForearmPivot.rotation.x = -0.35;
    rig.rightForearmPivot.rotation.x = -0.35;
    rig.bodyGroup.position.y = Math.abs(wave) * 0.16;
  } else if (p.actionAnim === 'feint' || p.actionAnim === 'roulette') {
    // Sharp, snappy 45-degree directional cuts with planted pivot foot
    const stepSwing = Math.sin(performance.now() * 0.024) * 0.72;
    rig.leftLeg.rotation.x = stepSwing;
    rig.rightLeg.rotation.x = -stepSwing;
    rig.leftCalfPivot.rotation.x = 0.55;
    rig.rightCalfPivot.rotation.x = 0.55;
    rig.leftArm.rotation.z = -0.35;
    rig.rightArm.rotation.z = 0.35;
    rig.leftForearmPivot.rotation.x = -1.1;
    rig.rightForearmPivot.rotation.x = -1.1;
    rig.bodyGroup.position.y = 0.07;
  } else if (isRunning) {
    // 2012 Arcade-Simulation Dribbling & Running Locomotion:
    // Forward torso lean, quick rhythmic foot taps, arms bent at elbows for balance
    const amp = p.actionAnim === 'sprint' ? 0.82 : 0.58;
    const swing = Math.sin(p.walkCycle) * amp;
    const rhythmicTap = Math.max(0, Math.sin(p.walkCycle * 2)) * 0.18;

    rig.leftLeg.rotation.x = swing;
    rig.rightLeg.rotation.x = -swing - rhythmicTap;
    rig.leftCalfPivot.rotation.x = Math.max(0, -swing) * 0.92;
    rig.rightCalfPivot.rotation.x = Math.max(0, swing) * 0.92 - rhythmicTap * 0.6;

    rig.leftArm.rotation.x = -swing * 0.52;
    rig.rightArm.rotation.x = swing * 0.52;
    rig.leftArm.rotation.z = -0.18;
    rig.rightArm.rotation.z = 0.18;
    rig.leftForearmPivot.rotation.x = -1.06; // Arms bent at elbows for balance
    rig.rightForearmPivot.rotation.x = -1.06;
    rig.bodyGroup.position.y = Math.abs(Math.cos(p.walkCycle)) * 0.055;
  } else {
    rig.leftLeg.rotation.x *= 0.8;
    rig.rightLeg.rotation.x *= 0.8;
    rig.leftCalfPivot.rotation.x *= 0.8;
    rig.rightCalfPivot.rotation.x *= 0.8;
    rig.leftArm.rotation.x *= 0.8;
    rig.rightArm.rotation.x *= 0.8;
    rig.leftArm.rotation.z = -0.08;
    rig.rightArm.rotation.z = 0.08;
    rig.leftForearmPivot.rotation.x = -0.32;
    rig.rightForearmPivot.rotation.x = -0.32;
    rig.bodyGroup.position.y = 0;
  }
}

const cardPropGeo = new THREE.BoxGeometry(0.14, 0.2, 0.02);

export interface OfficialRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  cardMesh?: THREE.Mesh;
  disposables: { dispose: () => void }[];
}

export function createOfficialRig(
  shirtColor: string,
  trouserColor: string,
  tieOrAccentColor: string,
  shadowTexture: THREE.Texture,
  withCardProp = false
): OfficialRig {
  const disposables: { dispose: () => void }[] = [];
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({ color: '#e2b18f', roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.8 });
  const topMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 });
  const pantMat = new THREE.MeshStandardMaterial({ color: trouserColor, roughness: 0.8 });
  const accentMat = new THREE.MeshStandardMaterial({ color: tieOrAccentColor, roughness: 0.5 });
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.58,
  });
  disposables.push(skinMat, hairMat, topMat, pantMat, accentMat, shadowMat);

  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  root.add(shadowMesh);

  const chest = new THREE.Mesh(chestGeo, topMat);
  chest.position.y = 1.14;
  chest.scale.set(1.02, 1, 0.72);
  const waist = new THREE.Mesh(waistGeo, topMat);
  waist.position.y = 0.9;
  waist.scale.set(0.98, 1, 0.7);
  const trim = new THREE.Mesh(sashGeo, accentMat);
  trim.position.y = 1.15;
  trim.scale.set(0.22, 1.4, 0.6);
  const shorts = new THREE.Mesh(shortsWaistGeo, pantMat);
  shorts.position.y = 0.74;
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 1.37;
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.54;
  head.scale.set(0.92, 1.05, 0.96);
  const hair = new THREE.Mesh(hairCapGeo, hairMat);
  hair.position.y = 1.56;
  hair.rotation.x = -0.14;
  bodyGroup.add(chest, waist, trim, shorts, neck, head, hair);

  const makeArm = (offsetX: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(offsetX, 1.26, 0);
    const sleeve = new THREE.Mesh(sleeveGeo, topMat);
    sleeve.position.y = -0.09;
    const forearm = new THREE.Mesh(forearmGeo, skinMat);
    forearm.position.y = -0.28;
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.y = -0.42;
    pivot.add(sleeve, forearm, hand);
    return pivot;
  };
  const leftArm = makeArm(-0.265);
  const rightArm = makeArm(0.265);
  bodyGroup.add(leftArm, rightArm);

  let cardMesh: THREE.Mesh | undefined;
  if (withCardProp) {
    const cardMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    disposables.push(cardMat);
    cardMesh = new THREE.Mesh(cardPropGeo, cardMat);
    cardMesh.position.set(0, -0.44, 0.08);
    cardMesh.visible = false;
    rightArm.add(cardMesh);
  }

  const makeLeg = (offsetX: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(offsetX, 0.66, 0);
    const thigh = new THREE.Mesh(thighGeo, pantMat);
    thigh.position.y = -0.18;
    const calf = new THREE.Mesh(calfSockGeo, pantMat);
    calf.position.y = -0.46;
    const boot = new THREE.Mesh(bootGeo, pantMat);
    boot.position.set(0, -0.62, 0.04);
    pivot.add(thigh, calf, boot);
    return pivot;
  };
  const leftLeg = makeLeg(-0.11);
  const rightLeg = makeLeg(0.11);
  bodyGroup.add(leftLeg, rightLeg);

  return { root, bodyGroup, leftArm, rightArm, leftLeg, rightLeg, cardMesh, disposables };
}
