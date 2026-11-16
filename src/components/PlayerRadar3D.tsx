import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PlayerAttributes } from '../types/football';
import { detectSoftwareWebGL } from '../game/renderer/StadiumScene';

interface PlayerRadar3DProps {
  attributes: PlayerAttributes;
  overall: number;
  size?: number;
}

const AXES: { key: keyof PlayerAttributes | 'overall'; label: string }[] = [
  { key: 'pace', label: 'SPD' },
  { key: 'shooting', label: 'SHT' },
  { key: 'passing', label: 'PAS' },
  { key: 'dribbling', label: 'TEC' },
  { key: 'defending', label: 'DEF' },
  { key: 'physical', label: 'PHY' },
  { key: 'overall', label: 'OVR' },
];

export const PlayerRadar3D: React.FC<PlayerRadar3DProps> = ({
  attributes,
  overall,
  size = 180,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const polyRef = useRef<{
    fillGeo: THREE.BufferGeometry;
    lineGeo: THREE.BufferGeometry;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftware = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftware,
      alpha: true,
      preserveDrawingBuffer: isSoftware,
    });
    renderer.setPixelRatio(isSoftware ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
    camera.position.set(0, 1.75, 2.35);
    camera.lookAt(0, 0, 0);

    const root = new THREE.Group();
    scene.add(root);

    const webDisposables: { dispose: () => void }[] = [];
    const ringMat = new THREE.LineBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.7 });
    webDisposables.push(ringMat);

    // Build 3 concentric heptagon rings + spokes
    for (const r of [0.35, 0.68, 1.0]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= AXES.length; i++) {
        const a = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      webDisposables.push(g);
      root.add(new THREE.Line(g, ringMat));
    }

    for (let i = 0; i < AXES.length; i++) {
      const a = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(a), 0, Math.sin(a)),
      ]);
      webDisposables.push(g);
      root.add(new THREE.Line(g, ringMat));
    }

    // Dynamic player stat polygon
    const fillGeo = new THREE.BufferGeometry();
    const lineGeo = new THREE.BufferGeometry();
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xff6b00,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffb347 });
    const fillMesh = new THREE.Mesh(fillGeo, fillMat);
    const lineMesh = new THREE.LineLoop(lineGeo, lineMat);
    root.add(fillMesh, lineMesh);
    webDisposables.push(fillGeo, lineGeo, fillMat, lineMat);

    polyRef.current = { fillGeo, lineGeo, renderer, scene, camera };

    let disposed = false;
    let raf = 0;
    const tick = () => {
      if (disposed) return;
      root.rotation.y += isSoftware ? 0.03 : 0.008;
      renderer.render(scene, camera);
      if (isSoftware) {
        raf = window.setTimeout(tick, 120);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(raf);
      webDisposables.forEach((d) => d.dispose());
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      polyRef.current = null;
    };
  }, [size]);

  useEffect(() => {
    const refs = polyRef.current;
    if (!refs) return;

    const vals = AXES.map((ax) => {
      const raw = ax.key === 'overall' ? overall : attributes[ax.key];
      return Math.max(0.25, Math.min(1, raw / 99));
    });

    const outerPts: THREE.Vector3[] = [];
    const triVerts: number[] = [];
    for (let i = 0; i < AXES.length; i++) {
      const a = (i / AXES.length) * Math.PI * 2 - Math.PI / 2;
      outerPts.push(new THREE.Vector3(Math.cos(a) * vals[i], 0.06, Math.sin(a) * vals[i]));
    }
    for (let i = 0; i < AXES.length; i++) {
      const p1 = outerPts[i];
      const p2 = outerPts[(i + 1) % AXES.length];
      triVerts.push(0, 0.08, 0, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    }

    refs.fillGeo.setAttribute('position', new THREE.Float32BufferAttribute(triVerts, 3));
    refs.fillGeo.computeVertexNormals();
    refs.lineGeo.setFromPoints(outerPts);
    refs.renderer.render(refs.scene, refs.camera);
  }, [attributes, overall]);

  return (
    <div className="relative flex flex-col items-center">
      <div
        ref={mountRef}
        data-testid="player-radar-3d"
        className="relative rounded-full bg-[#090d14]/70 border border-[#FF6B00]/30"
        style={{ width: size, height: size }}
      />
      <div className="mt-1.5 flex flex-wrap justify-center gap-x-2 gap-y-0.5 text-[10px] font-mono-tabular text-slate-300">
        {AXES.map((ax) => (
          <span key={ax.key}>
            <span className="text-[#FF8C00]">{ax.label}</span>{' '}
            {ax.key === 'overall' ? overall : attributes[ax.key]}
          </span>
        ))}
      </div>
    </div>
  );
};
