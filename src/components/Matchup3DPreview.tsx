import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CrestConfig, KitDesign, KitSlot, Team } from '../types/football';
import { resolveTeamKit } from '../data/teams';
import { detectSoftwareWebGL } from '../game/renderer/StadiumScene';

interface Matchup3DPreviewProps {
  homeTeam: Team;
  awayTeam: Team;
  homeKitType?: KitSlot;
  awayKitType?: KitSlot;
  height?: number;
}

function createCrestFaceTexture(crest: CrestConfig, shortCode: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, crest.primary);
  grad.addColorStop(1, crest.secondary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = crest.accent;
  ctx.lineWidth = 14;
  ctx.strokeRect(14, 14, 228, 228);

  ctx.fillStyle = crest.accent;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(96, 0, 64, 256);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 74px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((crest.monogram || shortCode).slice(0, 3), 128, 132);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createShieldShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 1.05);
  s.lineTo(0.88, 0.78);
  s.quadraticCurveTo(0.92, -0.35, 0, -1.08);
  s.quadraticCurveTo(-0.92, -0.35, -0.88, 0.78);
  s.closePath();
  return s;
}

function createKitMannequin(kit: KitDesign): {
  group: THREE.Group;
  jerseyMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  shortsMat: THREE.MeshStandardMaterial;
  socksMat: THREE.MeshStandardMaterial;
  disposables: { dispose: () => void }[];
} {
  const disposables: { dispose: () => void }[] = [];
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: '#e2b18f', roughness: 0.72 });
  const hairMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.85 });
  const jerseyMat = new THREE.MeshStandardMaterial({ color: kit.primary, roughness: 0.55, metalness: 0.08 });
  const trimMat = new THREE.MeshStandardMaterial({ color: kit.secondary, roughness: 0.45, metalness: 0.14 });
  const shortsMat = new THREE.MeshStandardMaterial({ color: kit.shorts, roughness: 0.65 });
  const socksMat = new THREE.MeshStandardMaterial({ color: kit.socks, roughness: 0.75 });
  const bootMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.35, metalness: 0.3 });

  const torsoGeo = new THREE.CylinderGeometry(0.32, 0.25, 0.74, 16);
  const collarGeo = new THREE.TorusGeometry(0.14, 0.035, 8, 16);
  const sashGeo = new THREE.BoxGeometry(0.64, 0.14, 0.48);
  const shortsGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.34, 14);
  const headGeo = new THREE.SphereGeometry(0.22, 14, 12);
  const armGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.58, 10);
  const legGeo = new THREE.CylinderGeometry(0.095, 0.075, 0.68, 10);
  const bootGeo = new THREE.BoxGeometry(0.16, 0.1, 0.3);

  disposables.push(
    skinMat,
    hairMat,
    jerseyMat,
    trimMat,
    shortsMat,
    socksMat,
    bootMat,
    torsoGeo,
    collarGeo,
    sashGeo,
    shortsGeo,
    headGeo,
    armGeo,
    legGeo,
    bootGeo
  );

  const torso = new THREE.Mesh(torsoGeo, jerseyMat);
  torso.position.y = 1.15;
  const trim = new THREE.Mesh(sashGeo, trimMat);
  trim.position.y = 1.17;
  const collar = new THREE.Mesh(collarGeo, trimMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 1.53;
  const shorts = new THREE.Mesh(shortsGeo, shortsMat);
  shorts.position.y = 0.65;
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.78;
  const hair = new THREE.Mesh(headGeo, hairMat);
  hair.scale.set(1.04, 0.6, 1.04);
  hair.position.set(0, 1.88, -0.02);

  const lArm = new THREE.Mesh(armGeo, jerseyMat);
  lArm.position.set(-0.39, 1.16, 0);
  lArm.rotation.z = 0.15;
  const rArm = new THREE.Mesh(armGeo, jerseyMat);
  rArm.position.set(0.39, 1.16, 0);
  rArm.rotation.z = -0.15;

  const lLeg = new THREE.Mesh(legGeo, socksMat);
  lLeg.position.set(-0.14, 0.28, 0);
  const rLeg = new THREE.Mesh(legGeo, socksMat);
  rLeg.position.set(0.14, 0.28, 0);
  const lBoot = new THREE.Mesh(bootGeo, bootMat);
  lBoot.position.set(-0.14, -0.04, 0.06);
  const rBoot = new THREE.Mesh(bootGeo, bootMat);
  rBoot.position.set(0.14, -0.04, 0.06);

  group.add(torso, trim, collar, shorts, head, hair, lArm, rArm, lLeg, rLeg, lBoot, rBoot);
  return { group, jerseyMat, trimMat, shortsMat, socksMat, disposables };
}

export const Matchup3DPreview: React.FC<Matchup3DPreviewProps> = ({
  homeTeam,
  awayTeam,
  homeKitType = 'home',
  awayKitType = 'away',
  height = 178,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<{
    homeCrestMat: THREE.MeshStandardMaterial;
    homeRimMat: THREE.MeshStandardMaterial;
    awayCrestMat: THREE.MeshStandardMaterial;
    awayRimMat: THREE.MeshStandardMaterial;
    homeTex: THREE.Texture;
    awayTex: THREE.Texture;
    homeKitRefs: ReturnType<typeof createKitMannequin>;
    awayKitRefs: ReturnType<typeof createKitMannequin>;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftware = detectSoftwareWebGL();
    const width = Math.max(320, container.clientWidth || 720);
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftware,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: isSoftware,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftware ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(0, 1.35, 6.4);
    camera.lookAt(0, 0.95, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0xe2e8f0, 0x0f172a, 0.9);
    const key = new THREE.DirectionalLight(0xfffbeb, 1.8);
    key.position.set(3, 5, 4);
    const rim = new THREE.DirectionalLight(0xff8c00, 0.95);
    rim.position.set(-4, 2, -3);
    scene.add(hemi, key, rim);

    const shieldGeo = new THREE.ExtrudeGeometry(createShieldShape(), {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    shieldGeo.center();

    const homeTex = createCrestFaceTexture(homeTeam.crest, homeTeam.shortCode);
    const awayTex = createCrestFaceTexture(awayTeam.crest, awayTeam.shortCode);
    const homeCrestMat = new THREE.MeshStandardMaterial({ map: homeTex, roughness: 0.35, metalness: 0.45 });
    const homeRimMat = new THREE.MeshStandardMaterial({
      color: homeTeam.crest.accent,
      roughness: 0.25,
      metalness: 0.85,
    });
    const awayCrestMat = new THREE.MeshStandardMaterial({ map: awayTex, roughness: 0.35, metalness: 0.45 });
    const awayRimMat = new THREE.MeshStandardMaterial({
      color: awayTeam.crest.accent,
      roughness: 0.25,
      metalness: 0.85,
    });

    const homeCrest = new THREE.Mesh(shieldGeo, [homeCrestMat, homeRimMat]);
    homeCrest.position.set(-2.55, 1.1, 0);
    homeCrest.scale.setScalar(0.75);

    const awayCrest = new THREE.Mesh(shieldGeo, [awayCrestMat, awayRimMat]);
    awayCrest.position.set(2.55, 1.1, 0);
    awayCrest.scale.setScalar(0.75);

    const homeKitRefs = createKitMannequin(resolveTeamKit(homeTeam, homeKitType));
    homeKitRefs.group.position.set(-1.15, 0.08, 0);
    const awayKitRefs = createKitMannequin(resolveTeamKit(awayTeam, awayKitType));
    awayKitRefs.group.position.set(1.15, 0.08, 0);

    const ringGeo = new THREE.TorusGeometry(0.45, 0.04, 10, 28);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      emissive: 0xff6b00,
      emissiveIntensity: 0.7,
      metalness: 0.7,
      roughness: 0.2,
    });
    const centerRing = new THREE.Mesh(ringGeo, ringMat);
    centerRing.position.set(0, 1.05, -0.2);

    const plinthGeo = new THREE.CylinderGeometry(3.5, 3.7, 0.1, 32);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -0.02;

    scene.add(homeCrest, awayCrest, homeKitRefs.group, awayKitRefs.group, centerRing, plinth);

    sceneRef.current = {
      homeCrestMat,
      homeRimMat,
      awayCrestMat,
      awayRimMat,
      homeTex,
      awayTex,
      homeKitRefs,
      awayKitRefs,
    };

    const resizeObs = new ResizeObserver(() => {
      const w = Math.max(320, container.clientWidth || 720);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    });
    resizeObs.observe(container);

    let disposed = false;
    let rafId = 0;
    let t = 0;
    const renderLoop = () => {
      if (disposed) return;
      t += isSoftware ? 0.05 : 0.018;
      homeCrest.rotation.y = Math.sin(t * 0.9) * 0.35;
      awayCrest.rotation.y = -Math.sin(t * 0.9) * 0.35;
      homeKitRefs.group.rotation.y = t * 0.55;
      awayKitRefs.group.rotation.y = -t * 0.55;
      centerRing.rotation.z = t * 0.6;
      renderer.render(scene, camera);

      if (isSoftware) {
        rafId = window.setTimeout(renderLoop, 90);
      } else {
        rafId = requestAnimationFrame(renderLoop);
      }
    };
    renderLoop();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(rafId);
      resizeObs.disconnect();
      shieldGeo.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      plinthGeo.dispose();
      plinthMat.dispose();
      sceneRef.current?.homeTex.dispose();
      sceneRef.current?.awayTex.dispose();
      homeCrestMat.dispose();
      homeRimMat.dispose();
      awayCrestMat.dispose();
      awayRimMat.dispose();
      homeKitRefs.disposables.forEach((d) => d.dispose());
      awayKitRefs.disposables.forEach((d) => d.dispose());
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
    };
  }, [height]);

  // Reactively swap crest textures & kit mannequin colors without re-creating WebGL context
  useEffect(() => {
    const refs = sceneRef.current;
    if (!refs) return;
    refs.homeTex.dispose();
    refs.awayTex.dispose();
    refs.homeTex = createCrestFaceTexture(homeTeam.crest, homeTeam.shortCode);
    refs.awayTex = createCrestFaceTexture(awayTeam.crest, awayTeam.shortCode);
    refs.homeCrestMat.map = refs.homeTex;
    refs.homeCrestMat.needsUpdate = true;
    refs.homeRimMat.color.set(homeTeam.crest.accent);
    refs.awayCrestMat.map = refs.awayTex;
    refs.awayCrestMat.needsUpdate = true;
    refs.awayRimMat.color.set(awayTeam.crest.accent);

    const hKit = resolveTeamKit(homeTeam, homeKitType);
    refs.homeKitRefs.jerseyMat.color.set(hKit.primary);
    refs.homeKitRefs.trimMat.color.set(hKit.secondary);
    refs.homeKitRefs.shortsMat.color.set(hKit.shorts);
    refs.homeKitRefs.socksMat.color.set(hKit.socks);

    const aKit = resolveTeamKit(awayTeam, awayKitType);
    refs.awayKitRefs.jerseyMat.color.set(aKit.primary);
    refs.awayKitRefs.trimMat.color.set(aKit.secondary);
    refs.awayKitRefs.shortsMat.color.set(aKit.shorts);
    refs.awayKitRefs.socksMat.color.set(aKit.socks);
  }, [homeTeam, awayTeam, homeKitType, awayKitType]);

  return (
    <div
      ref={containerRef}
      data-testid="matchup-3d-preview"
      className="w-full relative overflow-hidden rounded border border-white/15 bg-gradient-to-b from-[#090d14]/80 to-[#111827]/75"
      style={{ height }}
    >
      <div className="absolute inset-x-0 bottom-1.5 px-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-300 pointer-events-none">
        <span>{homeTeam.name} ({homeKitType} kit)</span>
        <span className="text-[#FF8C00]">3D Crest & Kit Stage</span>
        <span>{awayTeam.name} ({awayKitType} kit)</span>
      </div>
    </div>
  );
};
