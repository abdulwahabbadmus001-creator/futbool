import * as THREE from 'three';
import { StadiumConfig } from '../../types/football';

export function createPitchTexture(
  pattern: StadiumConfig['pitchPattern'],
  maxAnisotropy: number
): THREE.CanvasTexture {
  const w = 2048;
  const h = 1320;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Base lush stadium grass
  ctx.fillStyle = '#1e632d';
  ctx.fillRect(0, 0, w, h);

  const marginX = 110;
  const marginY = 85;
  const pitchW = w - marginX * 2;
  const pitchH = h - marginY * 2;

  const stripes = 18;
  const stripeW = pitchW / stripes;
  for (let i = 0; i < stripes; i++) {
    if (pattern === 'checkered') {
      const rows = 10;
      const rowH = pitchH / rows;
      for (let j = 0; j < rows; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#267837' : '#1d5e2b';
        ctx.fillRect(marginX + i * stripeW, marginY + j * rowH, stripeW + 1, rowH + 1);
      }
    } else if (pattern === 'stripes') {
      ctx.fillStyle = i % 2 === 0 ? '#287c39' : '#1f632e';
      ctx.fillRect(marginX + i * stripeW, marginY, stripeW + 1, pitchH);
    } else {
      ctx.fillStyle = i % 2 === 0 ? '#247234' : '#20662f';
      ctx.fillRect(marginX + i * stripeW, marginY, stripeW + 1, pitchH);
    }
  }

  // Fine blade turf texture grain
  ctx.fillStyle = 'rgba(255,255,255,0.028)';
  for (let i = 0; i < 6000; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    ctx.fillRect(rx, ry, 2, 2);
  }

  const scaleX = pitchW / 105;
  const scaleY = pitchH / 68;
  const lineW = 4;

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.94)';
  ctx.fillStyle = 'rgba(248, 250, 252, 0.94)';
  ctx.lineWidth = lineW;

  ctx.strokeRect(marginX, marginY, pitchW, pitchH);

  const cx = marginX + pitchW / 2;
  const cy = marginY + pitchH / 2;
  ctx.beginPath();
  ctx.moveTo(cx, marginY);
  ctx.lineTo(cx, marginY + pitchH);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 9.15 * scaleX, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();

  const paW = 16.5 * scaleX;
  const paH = 40.32 * scaleY;
  const gaW = 5.5 * scaleX;
  const gaH = 18.32 * scaleY;
  const penDist = 11 * scaleX;

  // Left (Home)
  ctx.strokeRect(marginX, cy - paH / 2, paW, paH);
  ctx.strokeRect(marginX, cy - gaH / 2, gaW, gaH);
  ctx.beginPath();
  ctx.arc(marginX + penDist, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(marginX + penDist, cy, 9.15 * scaleX, -0.92, 0.92);
  ctx.stroke();

  // Right (Away)
  ctx.strokeRect(marginX + pitchW - paW, cy - paH / 2, paW, paH);
  ctx.strokeRect(marginX + pitchW - gaW, cy - gaH / 2, gaW, gaH);
  ctx.beginPath();
  ctx.arc(marginX + pitchW - penDist, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(marginX + pitchW - penDist, cy, 9.15 * scaleX, Math.PI - 0.92, Math.PI + 0.92);
  ctx.stroke();

  const cornerR = 1.2 * scaleX;
  const corners = [
    [marginX, marginY, 0, Math.PI / 2],
    [marginX + pitchW, marginY, Math.PI / 2, Math.PI],
    [marginX + pitchW, marginY + pitchH, Math.PI, Math.PI * 1.5],
    [marginX, marginY + pitchH, Math.PI * 1.5, Math.PI * 2],
  ];
  corners.forEach(([x, y, a1, a2]) => {
    ctx.beginPath();
    ctx.arc(x, y, cornerR, a1, a2);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * High-Detail PES 2012 / UEFA Finale Starball & Thermally Bonded 32-Panel Match Ball Texture
 */
export function createFootballTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Pearl white leather base with subtle spherical shading
  const baseGrad = ctx.createRadialGradient(size * 0.4, size * 0.35, 20, size * 0.5, size * 0.5, size * 0.72);
  baseGrad.addColorStop(0, '#ffffff');
  baseGrad.addColorStop(0.7, '#f1f5f9');
  baseGrad.addColorStop(1, '#cbd5e1');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Thermally bonded hexagonal seam network
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      const cx = col * 92 + (row % 2 === 0 ? 0 : 46);
      const cy = row * 86;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ang = (k / 6) * Math.PI * 2;
        const px = cx + Math.cos(ang) * 42;
        const py = cy + Math.sin(ang) * 42;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Iconic PES 2012 / UEFA Champions League Starball & Pentagon Panels
  const spots = [
    [size * 0.25, size * 0.25],
    [size * 0.75, size * 0.25],
    [size * 0.5, size * 0.5],
    [size * 0.25, size * 0.75],
    [size * 0.75, size * 0.75],
    [0, size * 0.5],
    [size, size * 0.5],
    [size * 0.5, 0],
    [size * 0.5, size],
  ];

  for (const [x, y] of spots) {
    // Outer cyan/royal-blue star accent ring
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 54 : 26;
      const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(ang) * r;
      const py = y + Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#0B3B8C';
    ctx.fill();
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Inner deep midnight carbon pentagon
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(ang) * 32;
      const py = y + Math.sin(ang) * 32;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#061229';
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Lifelike Human Stadium Spectators & Supporter Tiers Texture
 */
export function createCrowdTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Tiered concrete stadium steps
  ctx.fillStyle = '#061229';
  ctx.fillRect(0, 0, w, h);

  const skinTones = ['#f5d0b5', '#e2b18f', '#c68642', '#8d5524', '#f1c27d'];
  const jerseyColors = ['#A50044', '#004D98', '#FFFFFF', '#FEBE10', '#00E5FF', '#E11D48', '#1E3A8A'];
  const hairColors = ['#0f172a', '#3f2e21', '#713f12', '#1e293b'];

  const rows = 22;
  const cols = 56;
  const cellW = w / cols;
  const cellH = h / rows;

  for (let r = 0; r < rows; r++) {
    // Concrete step shadow line
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, r * cellH, w, 3);

    for (let c = 0; c < cols; c++) {
      const seed = r * 73 + c * 37;
      const cx = c * cellW + cellW * 0.5;
      const cy = r * cellH + cellH * 0.55;
      const jersey = jerseyColors[seed % jerseyColors.length];
      const skin = skinTones[(seed * 3) % skinTones.length];
      const hair = hairColors[(seed * 7) % hairColors.length];

      // Human shoulders & torso
      ctx.fillStyle = jersey;
      ctx.beginPath();
      ctx.roundRect(cx - cellW * 0.38, cy - 2, cellW * 0.76, cellH * 0.55, 3);
      ctx.fill();

      // Cheering raised arms on excited fans
      if (seed % 4 === 0) {
        ctx.fillStyle = jersey;
        ctx.fillRect(cx - cellW * 0.44, cy - cellH * 0.38, 3, cellH * 0.45);
        ctx.fillRect(cx + cellW * 0.44 - 3, cy - cellH * 0.38, 3, cellH * 0.45);
        // Supporter scarf held aloft
        if (seed % 8 === 0) {
          ctx.fillStyle = seed % 16 === 0 ? '#00E5FF' : '#E11D48';
          ctx.fillRect(cx - cellW * 0.46, cy - cellH * 0.44, cellW * 0.92, 3.5);
        }
      }

      // Human Head
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(cx, cy - cellH * 0.16, cellW * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Hair cap
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.arc(cx, cy - cellH * 0.19, cellW * 0.22, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  }

  // Stadium Camera Flashes in the Stands
  for (let f = 0; f < 24; f++) {
    const fx = ((f * 197) % (w - 40)) + 20;
    const fy = ((f * 113) % (h - 40)) + 20;
    const flashGrad = ctx.createRadialGradient(fx, fy, 1, fx, fy, 12);
    flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    flashGrad.addColorStop(0.4, 'rgba(0, 229, 255, 0.45)');
    flashGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = flashGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  return tex;
}

export function createAdBoardTexture(accentColor: string): THREE.CanvasTexture {
  const w = 1024;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#061229';
  ctx.fillRect(0, 0, w, h);

  const labels = ['PES 2012', 'PRO EVOLUTION SOCCER', 'UEFA CHAMPIONS LEAGUE', 'FOOTBALL LIFE'];
  const segW = w / labels.length;

  labels.forEach((label, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#061229' : '#0B3B8C';
    ctx.fillRect(idx * segW + 4, 8, segW - 8, h - 16);
    ctx.fillStyle = idx % 2 === 0 ? '#00E5FF' : accentColor;
    ctx.fillRect(idx * segW + 4, 8, segW - 8, 6);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'italic 800 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, idx * segW + segW / 2, h / 2 + 4, segW - 24);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.56)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.24)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

/**
 * Detailed Human Stadium Fan 3D Billboard Sprite
 */
export function createCrowdSpriteTexture(shirtColor: string): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Supporter Scarf held overhead
  ctx.fillStyle = shirtColor;
  ctx.fillRect(14, 6, 68, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(22, 8, 52, 3);

  // Raised cheering human arms (sleeves + skin forearms + hands)
  ctx.fillStyle = '#e2b18f';
  ctx.beginPath();
  ctx.roundRect(14, 14, 11, 22, 5);
  ctx.roundRect(71, 14, 11, 22, 5);
  ctx.fill();

  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.roundRect(13, 28, 13, 16, 4);
  ctx.roundRect(70, 28, 13, 16, 4);
  ctx.fill();

  // Contoured Human Torso / Football Jersey
  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.roundRect(24, 36, 48, 48, 8);
  ctx.fill();

  // Collar & Chest Stripe
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(32, 42, 32, 6);

  // Neck & Sculpted Human Head
  ctx.fillStyle = '#d9a17c';
  ctx.fillRect(43, 30, 10, 8);
  ctx.fillStyle = '#e8b896';
  ctx.beginPath();
  ctx.arc(48, 22, 13, 0, Math.PI * 2);
  ctx.fill();

  // Facial details (eyes & cheering mouth)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(43, 20, 2.5, 2.5);
  ctx.fillRect(51, 20, 2.5, 2.5);
  ctx.beginPath();
  ctx.arc(48, 26, 3.2, 0, Math.PI);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(48, 18, 13.5, Math.PI, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let cachedKitNormalMap: THREE.CanvasTexture | null = null;
let cachedKitSpecularMap: THREE.CanvasTexture | null = null;
let cachedSkinSpecularMap: THREE.CanvasTexture | null = null;

/**
 * PS3 / Xbox 360 Era 2011-2012 Fitted Football Jersey Rigid Cloth Fold Normal Map
 * & Polyester Weave Specular Map (for Blinn-Phong MeshPhongMaterial)
 */
export function getKitNormalAndSpecularMaps(): {
  normalMap: THREE.CanvasTexture;
  specularMap: THREE.CanvasTexture;
} {
  if (cachedKitNormalMap && cachedKitSpecularMap) {
    return { normalMap: cachedKitNormalMap, specularMap: cachedKitSpecularMap };
  }

  const size = 256;
  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const nctx = normCanvas.getContext('2d')!;

  // Flat tangent-space normal base (#8080FF)
  nctx.fillStyle = 'rgb(128, 128, 255)';
  nctx.fillRect(0, 0, size, size);

  // Rigid 2011-2012 fitted jersey tension folds (diagonal pectoral & rib creases)
  const folds = [
    [28, 60, 118, 92],
    [228, 60, 138, 92],
    [34, 115, 115, 148],
    [222, 115, 141, 148],
    [42, 170, 120, 198],
    [214, 170, 136, 198],
    [60, 215, 196, 215],
  ];

  nctx.lineCap = 'round';
  for (const [x1, y1, x2, y2] of folds) {
    // Upper ridge normal deflection
    nctx.strokeStyle = 'rgb(168, 158, 255)';
    nctx.lineWidth = 6;
    nctx.beginPath();
    nctx.moveTo(x1, y1);
    nctx.lineTo(x2, y2);
    nctx.stroke();

    // Lower trough normal deflection
    nctx.strokeStyle = 'rgb(92, 98, 245)';
    nctx.lineWidth = 5;
    nctx.beginPath();
    nctx.moveTo(x1, y1 + 5);
    nctx.lineTo(x2, y2 + 5);
    nctx.stroke();
  }

  cachedKitNormalMap = new THREE.CanvasTexture(normCanvas);
  cachedKitNormalMap.wrapS = THREE.RepeatWrapping;
  cachedKitNormalMap.wrapT = THREE.RepeatWrapping;

  // Polyester Specular Map
  const specCanvas = document.createElement('canvas');
  specCanvas.width = size;
  specCanvas.height = size;
  const sctx = specCanvas.getContext('2d')!;
  sctx.fillStyle = '#52525b';
  sctx.fillRect(0, 0, size, size);

  // Subtle polyester micro-mesh sheen + bright fold ridges
  sctx.fillStyle = '#71717a';
  for (let y = 0; y < size; y += 4) {
    for (let x = (y % 8 === 0 ? 0 : 2); x < size; x += 4) {
      sctx.fillRect(x, y, 2, 2);
    }
  }
  sctx.strokeStyle = '#a1a1aa';
  sctx.lineWidth = 4;
  for (const [x1, y1, x2, y2] of folds) {
    sctx.beginPath();
    sctx.moveTo(x1, y1);
    sctx.lineTo(x2, y2);
    sctx.stroke();
  }

  cachedKitSpecularMap = new THREE.CanvasTexture(specCanvas);
  cachedKitSpecularMap.wrapS = THREE.RepeatWrapping;
  cachedKitSpecularMap.wrapT = THREE.RepeatWrapping;

  return { normalMap: cachedKitNormalMap, specularMap: cachedKitSpecularMap };
}

/**
 * PS3 / Xbox 360 Era Character Skin Sweat Specular Map (Blinn-Phong Sweat Sheen)
 */
export function getSkinSweatSpecularMap(): THREE.CanvasTexture {
  if (cachedSkinSpecularMap) return cachedSkinSpecularMap;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base skin specular response
  ctx.fillStyle = '#4a3f39';
  ctx.fillRect(0, 0, size, size);

  // Sweat sheen hotspots (forehead, nose bridge, cheekbones, deltoid/forearm highlights)
  const hotspots = [
    [128, 64, 56],
    [92, 118, 36],
    [164, 118, 36],
    [128, 128, 28],
    [128, 196, 48],
  ];
  for (const [hx, hy, hr] of hotspots) {
    const grad = ctx.createRadialGradient(hx, hy, 2, hx, hy, hr);
    grad.addColorStop(0, '#b8a99e');
    grad.addColorStop(0.5, '#786b63');
    grad.addColorStop(1, 'rgba(74, 63, 57, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
  }

  cachedSkinSpecularMap = new THREE.CanvasTexture(canvas);
  return cachedSkinSpecularMap;
}
