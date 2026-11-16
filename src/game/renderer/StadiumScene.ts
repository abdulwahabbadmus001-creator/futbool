import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  CameraPreset,
  CursorColorTier,
  GraphicsQuality,
  ReplayCameraPreset,
  StadiumConfig,
  WeatherCondition,
} from '../../types/football';
import { resolveTeamKit } from '../../data/teams';
import { HALF_LENGTH, HALF_WIDTH, BALL_RADIUS } from '../physics/pitchPhysics';
import {
  FootballSimulation,
  ManagerReaction,
  ReplayFrame,
  SimulationSnapshot,
} from '../engine/Simulation';
import { MatchCameraRig } from '../camera/cameraRig';
import { InputManager } from '../controls/inputManager';
import { soundEngine } from '../audio/soundEngine';
import {
  createContactShadowTexture,
  createCrowdSpriteTexture,
  createFootballTexture,
} from './proceduralTextures';
import {
  OfficialRig,
  PlayerRig,
  createOfficialRig,
  createPlayerRig,
  updatePlayerRig,
} from './playerMesh';
import { AnimatedNetEntry, buildStadiumEnvironment, stepGoalNetRipple } from './stadiumMesh';
import { PostProcessingPipeline, createPostProcessingPipeline } from './postProcessing';

export function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export interface ReplayPlaybackState {
  active: boolean;
  frame: ReplayFrame | null;
  cameraPreset: ReplayCameraPreset;
  elapsed: number;
}

export interface StadiumSceneOptions {
  container: HTMLElement;
  stadium: StadiumConfig;
  weather?: WeatherCondition;
  cursorColor?: CursorColorTier;
  graphicsQuality: GraphicsQuality;
  resolutionScale: number;
  cameraPreset: CameraPreset;
  cameraDistance: number;
  cameraHeight: number;
  simulation: FootballSimulation | null;
  inputManager: InputManager | null;
  onSnapshot?: (snapshot: SimulationSnapshot) => void;
  pausedRef: { current: boolean };
}

export class StadiumSceneController {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraRig = new MatchCameraRig();
  private postProcessing: PostProcessingPipeline;
  private isSoftwareGl: boolean;
  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;

  private ballGroup: THREE.Group;
  private ballMesh: THREE.Mesh;
  private ballShadow: THREE.Mesh;
  private setPieceGuide: THREE.Line;
  private setPieceGuidePositions = new Float32Array(24 * 3);
  private playerRigs = new Map<string, PlayerRig>();
  private stadiumDisposables: { dispose: () => void }[] = [];
  private netEntries: AnimatedNetEntry[] = [];

  private refereeRig: OfficialRig | null = null;
  private homeManagerRig: OfficialRig | null = null;
  private awayManagerRig: OfficialRig | null = null;
  private replayState: ReplayPlaybackState = {
    active: false,
    frame: null,
    cameraPreset: 'director',
    elapsed: 0,
  };

  // Instanced precipitation system (zero per-frame allocations)
  private weatherMesh: THREE.InstancedMesh | null = null;
  private weatherCoords: Float32Array | null = null;
  private weatherDummy = new THREE.Object3D();
  private weatherType: WeatherCondition = 'clear';

  // 3D Crowd Billboard Sprite Animation system (zero per-frame allocations)
  private crowdSprites: THREE.Sprite[] = [];
  private crowdBaseY: Float32Array = new Float32Array(0);
  private crowdPhases: Float32Array = new Float32Array(0);
  private crowdElapsed = 0;

  // Pre-allocated 3D Training target / slalom gate markers
  private trainingMeshes: THREE.Mesh[] = [];
  private activeTargetMat: THREE.MeshBasicMaterial | null = null;
  private idleTargetMat: THREE.MeshBasicMaterial | null = null;

  private options: StadiumSceneOptions;
  private lastTime = performance.now();
  private hudThrottle = 0;

  constructor(options: StadiumSceneOptions) {
    this.options = options;
    this.weatherType = options.weather ?? options.simulation?.weather ?? 'clear';
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && options.graphicsQuality !== 'low',
      powerPreference: 'high-performance',
      preserveDrawingBuffer: this.isSoftwareGl,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    const targetRatio = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, 2) * options.resolutionScale;
    this.renderer.setPixelRatio(targetRatio);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && options.graphicsQuality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(320, options.container.clientWidth || window.innerWidth);
    const height = Math.max(240, options.container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height);
    options.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const skyColors: Record<StadiumConfig['timeOfDay'], number> = {
      night: 0x090f1a,
      dusk: 0x1e192b,
      day: 0x6ba4d9,
      overcast: 0x526173,
    };
    const bgHex =
      this.weatherType === 'snow'
        ? 0x3b4858
        : this.weatherType === 'rain'
          ? 0x1e293b
          : skyColors[options.stadium.timeOfDay];
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, this.weatherType === 'clear' ? 0.0042 : 0.0062);

    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.5, 420);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const isNight = options.stadium.timeOfDay === 'night' || options.stadium.timeOfDay === 'dusk';
    const hemi = new THREE.HemisphereLight(
      isNight ? 0x93c5fd : 0xe0f2fe,
      0x14532d,
      isNight ? 0.68 : 0.85
    );
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(
      options.stadium.timeOfDay === 'dusk' ? 0xfdba74 : 0xfffbeb,
      isNight ? 1.55 : 1.75
    );
    keyLight.position.set(35, 62, 28);
    keyLight.castShadow = this.renderer.shadowMap.enabled;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.left = -62;
    keyLight.shadow.camera.right = 62;
    keyLight.shadow.camera.top = 45;
    keyLight.shadow.camera.bottom = -45;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 150;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    rimLight.position.set(-40, 28, -32);
    this.scene.add(rimLight);

    // Build Stadium + Animated Nets + Animated 3D Crowd Sprites
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const stadiumBuilt = buildStadiumEnvironment(options.stadium, maxAniso, this.renderer.shadowMap.enabled);
    this.scene.add(stadiumBuilt.group);
    this.netEntries = stadiumBuilt.netEntries;
    this.stadiumDisposables.push(...stadiumBuilt.disposables);
    this.initCrowdSprites(options.stadium.accentColor);

    // Optional instanced weather precipitation
    if (this.weatherType !== 'clear') {
      this.initWeatherParticles(this.weatherType);
    }

    // Build Football + Contact Shadow
    const ballTex = createFootballTexture(maxAniso);
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 18, 16);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTex,
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.05,
    });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.castShadow = this.renderer.shadowMap.enabled;
    this.ballMesh.position.y = BALL_RADIUS;

    const shadowTex = createContactShadowTexture();
    const ballShadowGeo = new THREE.CircleGeometry(BALL_RADIUS * 1.6, 16);
    const ballShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.7,
    });
    this.ballShadow = new THREE.Mesh(ballShadowGeo, ballShadowMat);
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.ballShadow.position.y = 0.015;

    this.ballGroup = new THREE.Group();
    this.ballGroup.add(this.ballMesh, this.ballShadow);
    this.scene.add(this.ballGroup);
    this.stadiumDisposables.push(ballTex, ballGeo, ballMat, shadowTex, ballShadowGeo, ballShadowMat);

    const guideGeometry = new THREE.BufferGeometry();
    guideGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.setPieceGuidePositions, 3).setUsage(THREE.DynamicDrawUsage)
    );
    const guideMaterial = new THREE.LineBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.78,
      depthTest: false,
    });
    this.setPieceGuide = new THREE.Line(guideGeometry, guideMaterial);
    this.setPieceGuide.visible = false;
    this.scene.add(this.setPieceGuide);
    this.stadiumDisposables.push(guideGeometry, guideMaterial);

    // Build Players, Referee, Touchline Managers & Training Markers if simulation is active
    if (options.simulation) {
      if (options.simulation.trainingTargets.length > 0) {
        this.initTrainingMarkers();
      }
      this.syncPlayerRigs(options.simulation, shadowTex);
      this.initOfficialsAndManagers(options.simulation, shadowTex);
      this.cameraRig.resetToMatch(options.simulation.ball.x, options.simulation.ball.z);
      for (const p of options.simulation.players) {
        const rig = this.playerRigs.get(p.id);
        if (rig) updatePlayerRig(rig, p, 0.016, options.cursorColor ?? 'orange');
      }
      const focusPlayer = options.simulation.players.find((p) => p.id === options.simulation?.controlledId);
      this.cameraRig.updateMatch(
        this.camera,
        options.cameraPreset,
        options.cameraDistance,
        options.cameraHeight,
        options.simulation.ball.x,
        options.simulation.ball.z,
        0,
        false,
        0.016,
        focusPlayer?.x,
        focusPlayer?.z
      );
    } else {
      this.cameraRig.snapFlyover(this.camera);
    }

    this.postProcessing = createPostProcessingPipeline(
      this.renderer,
      this.scene,
      this.camera,
      width,
      height,
      this.isSoftwareGl,
      isNight
    );

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
    this.postProcessing.render();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(options.container);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stopLoop();
    });

    this.startLoop();
  }

  private initOfficialsAndManagers(sim: FootballSimulation, shadowTex: THREE.Texture): void {
    this.refereeRig = createOfficialRig('#0f172a', '#090d14', '#facc15', shadowTex, true);
    this.refereeRig.root.position.set(sim.referee.x, 0, sim.referee.z);
    this.scene.add(this.refereeRig.root);
    this.stadiumDisposables.push(...this.refereeRig.disposables);

    this.homeManagerRig = createOfficialRig(
      '#1e293b',
      '#0f172a',
      sim.homeTeam.homeKit.primary,
      shadowTex,
      false
    );
    this.homeManagerRig.root.position.set(-14, 0, -HALF_WIDTH - 2.3);
    this.homeManagerRig.bodyGroup.rotation.y = 0;
    this.scene.add(this.homeManagerRig.root);
    this.stadiumDisposables.push(...this.homeManagerRig.disposables);

    this.awayManagerRig = createOfficialRig(
      '#1e293b',
      '#0f172a',
      sim.awayTeam.homeKit.primary,
      shadowTex,
      false
    );
    this.awayManagerRig.root.position.set(14, 0, -HALF_WIDTH - 2.3);
    this.awayManagerRig.bodyGroup.rotation.y = 0;
    this.scene.add(this.awayManagerRig.root);
    this.stadiumDisposables.push(...this.awayManagerRig.disposables);
  }

  private updateManagerRig(rig: OfficialRig | null, reaction: ManagerReaction): void {
    if (!rig) return;
    const t = performance.now() * 0.01;
    if (reaction === 'applaud') {
      rig.leftArm.rotation.x = -0.95;
      rig.rightArm.rotation.x = -0.95;
      rig.leftArm.rotation.z = 0.25 + Math.sin(t * 2.2) * 0.2;
      rig.rightArm.rotation.z = -0.25 - Math.sin(t * 2.2) * 0.2;
      rig.bodyGroup.position.y = Math.abs(Math.sin(t * 1.4)) * 0.06;
    } else if (reaction === 'frustrated') {
      rig.leftArm.rotation.z = -1.9 + Math.sin(t) * 0.15;
      rig.rightArm.rotation.z = 1.9 - Math.sin(t) * 0.15;
      rig.leftArm.rotation.x = 0;
      rig.rightArm.rotation.x = 0;
      rig.bodyGroup.position.y = 0;
    } else {
      rig.leftArm.rotation.x = 0;
      rig.rightArm.rotation.x = 0;
      rig.leftArm.rotation.z = 0;
      rig.rightArm.rotation.z = 0;
      rig.bodyGroup.position.y = 0;
    }
  }

  private updateRefereeRig(sim: FootballSimulation): void {
    if (!this.refereeRig) return;
    this.refereeRig.root.position.set(sim.referee.x, 0, sim.referee.z);
    this.refereeRig.bodyGroup.rotation.y = Math.PI / 2 - sim.referee.facing;

    if (sim.phase === 'card-cutscene' && sim.cardCutscene) {
      this.refereeRig.rightArm.rotation.x = -2.4;
      this.refereeRig.leftArm.rotation.x = 0;
      if (this.refereeRig.cardMesh) {
        this.refereeRig.cardMesh.visible = true;
        (this.refereeRig.cardMesh.material as THREE.MeshBasicMaterial).color.setHex(
          sim.cardCutscene.card === 'red' ? 0xef4444 : 0xfacc15
        );
      }
    } else {
      const swing = Math.sin(sim.referee.walkCycle) * 0.45;
      this.refereeRig.leftLeg.rotation.x = swing;
      this.refereeRig.rightLeg.rotation.x = -swing;
      this.refereeRig.leftArm.rotation.x = -swing * 0.6;
      this.refereeRig.rightArm.rotation.x = swing * 0.6;
      if (this.refereeRig.cardMesh) this.refereeRig.cardMesh.visible = false;
    }
  }

  public setReplayState(next: ReplayPlaybackState): void {
    this.replayState = next;
  }

  private initWeatherParticles(weather: WeatherCondition): void {
    const count = weather === 'rain' ? 220 : 180;
    const geo =
      weather === 'rain'
        ? new THREE.BoxGeometry(0.03, 0.65, 0.03)
        : new THREE.SphereGeometry(0.08, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: weather === 'rain' ? 0xbae6fd : 0xf8fafc,
      transparent: true,
      opacity: weather === 'rain' ? 0.45 : 0.78,
    });
    const inst = new THREE.InstancedMesh(geo, mat, count);
    inst.frustumCulled = false;

    const coords = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      coords[idx] = (Math.random() - 0.5) * 116;
      coords[idx + 1] = Math.random() * 24;
      coords[idx + 2] = (Math.random() - 0.5) * 78;
      this.weatherDummy.position.set(coords[idx], coords[idx + 1], coords[idx + 2]);
      if (weather === 'rain') this.weatherDummy.rotation.z = -0.18;
      this.weatherDummy.updateMatrix();
      inst.setMatrixAt(i, this.weatherDummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    this.scene.add(inst);
    this.weatherMesh = inst;
    this.weatherCoords = coords;
    this.stadiumDisposables.push(geo, mat);
  }

  private stepWeatherParticles(dt: number): void {
    if (!this.weatherMesh || !this.weatherCoords) return;
    const isRain = this.weatherType === 'rain';
    const fallSpeed = isRain ? 22 : 3.2;
    const count = this.weatherCoords.length / 3;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      this.weatherCoords[idx + 1] -= fallSpeed * dt;
      this.weatherCoords[idx] += (isRain ? -3.5 : Math.sin(i + this.lastTime * 0.002) * 1.1) * dt;
      if (this.weatherCoords[idx + 1] < 0) {
        this.weatherCoords[idx + 1] = 24;
        this.weatherCoords[idx] = (Math.random() - 0.5) * 116;
      }
      this.weatherDummy.position.set(this.weatherCoords[idx], this.weatherCoords[idx + 1], this.weatherCoords[idx + 2]);
      this.weatherDummy.rotation.z = isRain ? -0.18 : 0;
      this.weatherDummy.updateMatrix();
      this.weatherMesh.setMatrixAt(i, this.weatherDummy.matrix);
    }
    this.weatherMesh.instanceMatrix.needsUpdate = true;
  }

  private initCrowdSprites(accentColor: string): void {
    const texA = createCrowdSpriteTexture(accentColor || '#FF6B00');
    const texB = createCrowdSpriteTexture('#38bdf8');
    const texC = createCrowdSpriteTexture('#f8fafc');
    const mats = [
      new THREE.SpriteMaterial({ map: texA, transparent: true }),
      new THREE.SpriteMaterial({ map: texB, transparent: true }),
      new THREE.SpriteMaterial({ map: texC, transparent: true }),
    ];
    this.stadiumDisposables.push(texA, texB, texC, ...mats);

    const positions: [number, number, number][] = [];
    for (let i = 0; i < 32; i++) {
      const x = -54 + (i / 31) * 108;
      const tier = i % 3;
      const y = 4.2 + tier * 2.7;
      positions.push([x, y, -HALF_WIDTH - 10.5 - tier * 2.2]);
      positions.push([x, y, HALF_WIDTH + 10.5 + tier * 2.2]);
    }
    for (let i = 0; i < 16; i++) {
      const z = -34 + (i / 15) * 68;
      const tier = i % 3;
      const y = 4.2 + tier * 2.7;
      positions.push([-HALF_LENGTH - 12.5 - tier * 2.1, y, z]);
      positions.push([HALF_LENGTH + 12.5 + tier * 2.1, y, z]);
    }

    this.crowdBaseY = new Float32Array(positions.length);
    this.crowdPhases = new Float32Array(positions.length);
    this.crowdSprites = positions.map(([px, py, pz], idx) => {
      const sprite = new THREE.Sprite(mats[idx % mats.length]);
      sprite.position.set(px, py, pz);
      sprite.scale.set(1.65, 1.85, 1);
      this.scene.add(sprite);
      this.crowdBaseY[idx] = py;
      this.crowdPhases[idx] = idx * 0.63;
      return sprite;
    });
  }

  private stepCrowdSprites(dt: number, intensity: number, isGoalCelebration: boolean): void {
    if (this.crowdSprites.length === 0) return;
    this.crowdElapsed += dt;
    const freq = isGoalCelebration ? 11.5 : 3.2 + intensity * 4.5;
    const amp = isGoalCelebration ? 0.65 : 0.08 + intensity * 0.28;
    const scaleBoost = isGoalCelebration ? 1.16 : 1.0 + intensity * 0.06;

    for (let i = 0; i < this.crowdSprites.length; i++) {
      const sp = this.crowdSprites[i];
      const wave = Math.abs(Math.sin(this.crowdElapsed * freq + this.crowdPhases[i]));
      sp.position.y = this.crowdBaseY[i] + wave * amp;
      sp.scale.set(1.65 * scaleBoost, 1.85 * (scaleBoost + wave * 0.06), 1);
    }
  }

  private initTrainingMarkers(): void {
    const ringGeo = new THREE.TorusGeometry(0.95, 0.11, 10, 24);
    this.activeTargetMat = new THREE.MeshBasicMaterial({ color: 0xff8c00 });
    this.idleTargetMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.55 });
    this.stadiumDisposables.push(ringGeo, this.activeTargetMat, this.idleTargetMat);

    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(ringGeo, this.activeTargetMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.trainingMeshes.push(mesh);
    }
  }

  private syncTrainingMarkers(sim: FootballSimulation): void {
    if (this.trainingMeshes.length === 0) return;
    const targets = sim.trainingTargets;
    for (let i = 0; i < this.trainingMeshes.length; i++) {
      const mesh = this.trainingMeshes[i];
      const t = targets[i];
      if (!t) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(t.x, t.y, t.z);
      if (t.kind === 'gate') {
        mesh.rotation.set(Math.PI / 2, 0, 0);
      } else {
        mesh.rotation.set(0, Math.PI / 2, 0);
      }
      mesh.material = t.active ? this.activeTargetMat! : this.idleTargetMat!;
      const pulse = t.active ? 1 + Math.sin(this.crowdElapsed * 5 + i) * 0.08 : 0.72;
      mesh.scale.setScalar(pulse);
    }
  }

  private syncPlayerRigs(sim: FootballSimulation, shadowTex: THREE.Texture): void {
    const activeIds = new Set(sim.players.map((p) => p.id));
    for (const [id, rig] of this.playerRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(rig.root);
        this.playerRigs.delete(id);
      }
    }

    for (const p of sim.players) {
      if (!this.playerRigs.has(p.id)) {
        const team = p.side === 'home' ? sim.homeTeam : sim.awayTeam;
        const kitSlot = p.side === 'home' ? sim.config.homeKitType : sim.config.awayKitType;
        const kit = resolveTeamKit(team, kitSlot);
        const rig = createPlayerRig(
          p,
          kit,
          shadowTex,
          this.renderer.shadowMap.enabled,
          this.options.cursorColor ?? 'orange'
        );
        this.scene.add(rig.root);
        this.playerRigs.set(p.id, rig);
        const tagMaterial = rig.playerNameTag.material as THREE.SpriteMaterial;
        if (tagMaterial.map) this.stadiumDisposables.push(tagMaterial.map);
        this.stadiumDisposables.push(tagMaterial);
      }
    }
  }

  private updateSetPieceGuide(sim: FootballSimulation): void {
    const active = !this.replayState.active &&
      (sim.phase === 'free-kick' || sim.phase === 'corner-kick');
    this.setPieceGuide.visible = active;
    if (!active) return;

    const startX = sim.ball.x;
    const startZ = sim.ball.z;
    const attackDir = sim.restartContext.teamSide === 'home' ? 1 : -1;
    const goalX = attackDir * HALF_LENGTH;
    const remaining = Math.max(0, Math.abs(goalX - startX));
    const flightDistance = Math.min(sim.phase === 'corner-kick' ? 22 : 26, remaining);
    const endX = startX + attackDir * flightDistance;
    const endZ = sim.phase === 'corner-kick' ? 0 : startZ * 0.12;
    const pointCount = this.setPieceGuidePositions.length / 3;

    for (let i = 0; i < pointCount; i++) {
      const t = i / (pointCount - 1);
      const idx = i * 3;
      this.setPieceGuidePositions[idx] = startX + (endX - startX) * t;
      this.setPieceGuidePositions[idx + 1] = 0.16 + Math.sin(t * Math.PI) * 2.6;
      this.setPieceGuidePositions[idx + 2] =
        startZ + (endZ - startZ) * t + Math.sin(t * Math.PI) * 1.4;
    }

    const position = this.setPieceGuide.geometry.getAttribute('position') as THREE.BufferAttribute;
    position.needsUpdate = true;
    this.setPieceGuide.geometry.computeBoundingSphere();
  }

  public updateSettings(
    preset: CameraPreset,
    distance: number,
    height: number,
    cursorColor?: CursorColorTier
  ): void {
    this.options.cameraPreset = preset;
    this.options.cameraDistance = distance;
    this.options.cameraHeight = height;
    if (cursorColor) this.options.cursorColor = cursorColor;
  }

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(320, this.options.container.clientWidth || window.innerWidth);
    const h = Math.max(240, this.options.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.postProcessing.setSize(w, h);
    this.postProcessing.render();
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      if (this.weatherType !== 'clear') {
        this.stepWeatherParticles(dt);
      }

      const sim = this.options.simulation;
      this.stepCrowdSprites(
        dt,
        sim ? sim.crowdIntensity : 0.25,
        sim ? sim.phase === 'goal-celebration' : false
      );

      if (sim) {
        if (this.replayState.active && this.replayState.frame) {
          const rf = this.replayState.frame;
          this.ballMesh.position.set(rf.ball.x, rf.ball.y, rf.ball.z);
          this.ballMesh.rotation.set(rf.ball.rotX, 0, rf.ball.rotZ);
          this.ballShadow.position.set(rf.ball.x, 0.015, rf.ball.z);
          const hScale = Math.max(0.45, 1 - rf.ball.y * 0.12);
          this.ballShadow.scale.set(hScale, hScale, 1);

          for (const rp of rf.players) {
            const rig = this.playerRigs.get(rp.id);
            if (!rig) continue;
            rig.root.visible = !rp.redCard;
            rig.root.position.set(rp.x, rp.y, rp.z);
            rig.bodyGroup.rotation.y = Math.PI / 2 - rp.facing;
            const swing =
              rp.actionAnim === 'run' || rp.actionAnim === 'sprint'
                ? Math.sin(rp.walkCycle) * 0.65
                : 0;
            rig.leftLeg.rotation.x = swing;
            rig.rightLeg.rotation.x = -swing;
          }

          this.cameraRig.updateReplay(
            this.camera,
            this.replayState.cameraPreset,
            rf.ball.x,
            rf.ball.z,
            rf.ball.y,
            this.replayState.elapsed,
            dt
          );
        } else {
          if (!this.options.pausedRef.current) {
            const input = this.options.inputManager
              ? this.options.inputManager.pollMatchInput()
              : {
                  moveX: 0,
                  moveZ: 0,
                  sprint: false,
                  shortPassPressed: false,
                  throughPassPressed: false,
                  loftedPassPressed: false,
                  shootHeld: false,
                  shootReleased: false,
                  switchPlayerPressed: false,
                  tacklePressed: false,
                  tacticalModPressed: false,
                  tacticalModHeld: false,
                  feintPressed: false,
                  roulettePressed: false,
                };

            sim.step(dt, input);

            while (sim.pendingSoundEvents.length > 0) {
              const ev = sim.pendingSoundEvents.shift()!;
              soundEngine.playSimEvent(ev);
              if (ev === 'goal') {
                soundEngine.announceEvent(
                  'goal',
                  `${sim.lastScoringSide === 'home' ? sim.homeTeam.name : sim.awayTeam.name}!`
                );
              } else if (ev === 'whistle-full') {
                soundEngine.announceEvent(sim.phase === 'halftime' ? 'halftime' : 'fulltime');
              }
            }
          }

          const shadowTex = (this.ballShadow.material as THREE.MeshBasicMaterial).map!;
          this.syncPlayerRigs(sim, shadowTex);
          this.syncTrainingMarkers(sim);
          this.updateSetPieceGuide(sim);

          this.ballMesh.position.set(sim.ball.x, sim.ball.y, sim.ball.z);
          this.ballMesh.rotation.set(sim.ball.rotX, 0, sim.ball.rotZ);
          this.ballShadow.position.set(sim.ball.x, 0.015, sim.ball.z);
          const heightScale = Math.max(0.45, 1 - sim.ball.y * 0.12);
          this.ballShadow.scale.set(heightScale, heightScale, 1);

          const cColor = this.options.cursorColor ?? 'orange';
          for (const p of sim.players) {
            const rig = this.playerRigs.get(p.id);
            if (rig) updatePlayerRig(rig, p, dt, cColor);
          }

          this.updateRefereeRig(sim);
          this.updateManagerRig(this.homeManagerRig, sim.homeManagerReaction);
          this.updateManagerRig(this.awayManagerRig, sim.awayManagerReaction);
          stepGoalNetRipple(this.netEntries, sim.netWaveTimer, sim.lastScoringSide);

          if (sim.phase === 'walkout') {
            this.cameraRig.updateWalkout(this.camera, sim.walkoutProgress, dt);
          } else if (sim.phase === 'card-cutscene' && sim.cardCutscene) {
            this.cameraRig.updateCardCutscene(
              this.camera,
              sim.cardCutscene.offenderX,
              sim.cardCutscene.offenderZ,
              sim.cardCutscene.refX,
              sim.cardCutscene.refZ,
              dt
            );
          } else {
            const focusPlayer = sim.players.find((p) => p.id === sim.controlledId);
            this.cameraRig.updateMatch(
              this.camera,
              this.options.cameraPreset,
              this.options.cameraDistance,
              this.options.cameraHeight,
              sim.ball.x,
              sim.ball.z,
              sim.cameraTrauma,
              sim.phase === 'penalty-shootout',
              dt,
              focusPlayer?.x,
              focusPlayer?.z
            );
          }

          this.hudThrottle += dt;
          if (this.hudThrottle >= 0.08 && this.options.onSnapshot) {
            this.hudThrottle = 0;
            this.options.onSnapshot(sim.getSnapshot());
          }
        }
      } else {
        this.cameraRig.updateFlyover(this.camera, dt);
      }

      this.postProcessing.render();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private stopLoop(): void {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
  }

  public dispose(): void {
    this.disposed = true;
    this.stopLoop();
    this.resizeObserver.disconnect();
    this.postProcessing.dispose();
    this.stadiumDisposables.forEach((d) => d.dispose());
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
