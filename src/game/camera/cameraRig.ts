import * as THREE from 'three';
import { CameraPreset, ReplayCameraPreset } from '../../types/football';

const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

export class MatchCameraRig {
  public currentTarget = new THREE.Vector3(0, 0, 0);
  public currentPos = new THREE.Vector3(0, 28, 38);
  private flyoverAngle = 0;

  public resetToMatch(ballX: number, ballZ: number): void {
    this.currentTarget.set(ballX * 0.7, 0.5, ballZ * 0.6);
    this.currentPos.set(ballX * 0.65, 28, ballZ * 0.4 + 38);
  }

  public snapFlyover(camera: THREE.PerspectiveCamera): void {
    this.flyoverAngle = 0.55;
    this.currentPos.set(
      Math.cos(this.flyoverAngle) * 48,
      21,
      Math.sin(this.flyoverAngle) * 34
    );
    this.currentTarget.set(0, 1.0, 0);
    camera.position.copy(this.currentPos);
    camera.lookAt(this.currentTarget);
  }

  public updateFlyover(camera: THREE.PerspectiveCamera, dt: number): void {
    this.flyoverAngle += dt * 0.14;
    const rX = 48;
    const rZ = 34;
    _desiredPos.set(
      Math.cos(this.flyoverAngle) * rX,
      20 + Math.sin(this.flyoverAngle * 1.5) * 4,
      Math.sin(this.flyoverAngle) * rZ
    );
    _desiredTarget.set(0, 1.2, 0);

    const alpha = 1 - Math.exp(-3.5 * dt);
    this.currentPos.lerp(_desiredPos, alpha);
    this.currentTarget.lerp(_desiredTarget, alpha);

    camera.position.copy(this.currentPos);
    camera.lookAt(this.currentTarget);
  }

  public updateWalkout(camera: THREE.PerspectiveCamera, progress: number, dt: number): void {
    const t = Math.max(0, Math.min(1, progress));
    _desiredPos.set(-14 + t * 24, 6.5 + Math.sin(t * Math.PI) * 3.5, 16 - t * 6);
    _desiredTarget.set(0, 1.1, 0);
    const alpha = 1 - Math.exp(-4.0 * dt);
    this.currentPos.lerp(_desiredPos, alpha);
    this.currentTarget.lerp(_desiredTarget, alpha);
    camera.position.copy(this.currentPos);
    camera.lookAt(this.currentTarget);
  }

  public updateCardCutscene(
    camera: THREE.PerspectiveCamera,
    offenderX: number,
    offenderZ: number,
    refX: number,
    refZ: number,
    dt: number
  ): void {
    const midX = (offenderX + refX) * 0.5;
    const midZ = (offenderZ + refZ) * 0.5;
    _desiredTarget.set(midX, 1.25, midZ);
    _desiredPos.set(midX + 3.2, 2.5, midZ + 6.4);
    const alpha = 1 - Math.exp(-5.0 * dt);
    this.currentPos.lerp(_desiredPos, alpha);
    this.currentTarget.lerp(_desiredTarget, alpha);
    camera.position.copy(this.currentPos);
    camera.lookAt(this.currentTarget);
  }

  public updateReplay(
    camera: THREE.PerspectiveCamera,
    preset: ReplayCameraPreset,
    ballX: number,
    ballZ: number,
    ballY: number,
    elapsed: number,
    dt: number
  ): void {
    switch (preset) {
      case 'goalcam': {
        const goalSign = ballX >= 0 ? 1 : -1;
        _desiredPos.set(goalSign * 55.2, 2.2, ballZ * 0.3);
        _desiredTarget.set(ballX, Math.max(0.8, ballY), ballZ);
        break;
      }
      case 'sideline': {
        _desiredPos.set(ballX * 0.85, 3.2, 34);
        _desiredTarget.set(ballX, Math.max(0.7, ballY * 0.7), ballZ);
        break;
      }
      case 'helicopter': {
        const angle = elapsed * 0.45;
        _desiredPos.set(
          ballX * 0.4 + Math.cos(angle) * 28,
          29,
          ballZ * 0.4 + Math.sin(angle) * 24
        );
        _desiredTarget.set(ballX * 0.7, 0.5, ballZ * 0.6);
        break;
      }
      case 'director':
      default: {
        const orbit = elapsed * 0.35;
        _desiredPos.set(
          ballX - Math.cos(orbit) * 14,
          7.5,
          ballZ + Math.sin(orbit) * 14 + 6
        );
        _desiredTarget.set(ballX, Math.max(0.7, ballY * 0.8), ballZ);
        break;
      }
    }

    const alpha = 1 - Math.exp(-6.5 * dt);
    this.currentPos.lerp(_desiredPos, alpha);
    this.currentTarget.lerp(_desiredTarget, alpha);
    camera.position.copy(this.currentPos);
    camera.lookAt(this.currentTarget);
  }

  public updateMatch(
    camera: THREE.PerspectiveCamera,
    preset: CameraPreset,
    distanceScale: number,
    heightScale: number,
    ballX: number,
    ballZ: number,
    trauma: number,
    isPenaltyShootout: boolean,
    dt: number,
    focusX?: number,
    focusZ?: number
  ): void {
    if (isPenaltyShootout) {
      _desiredPos.set(29, 4.2, 0);
      _desiredTarget.set(52.5, 1.1, 0);
    } else {
      switch (preset) {
        case 'player-lock': {
          const px = focusX ?? ballX;
          const pz = focusZ ?? ballZ;
          const lookX = px * 0.6 + ballX * 0.4 + 6;
          const lookZ = pz * 0.65 + ballZ * 0.35;
          _desiredTarget.set(lookX, 0.9, lookZ);
          _desiredPos.set(
            px - 17 * distanceScale,
            7.8 * heightScale,
            pz * 0.8 + ballZ * 0.2
          );
          break;
        }
        case 'broadcast':
        case 'tele':
          _desiredTarget.set(ballX * 0.85, 0.4, ballZ * 0.65);
          _desiredPos.set(ballX * 0.72, 26 * heightScale, ballZ * 0.35 + 39 * distanceScale);
          break;
        case 'dynamic':
        case 'end-to-end':
          _desiredTarget.set(ballX * 0.9, 0.6, ballZ * 0.75);
          _desiredPos.set(ballX * 0.82 - 4, 17.5 * heightScale, ballZ * 0.45 + 25 * distanceScale);
          break;
        case 'vertical':
          _desiredTarget.set(ballX * 0.78, 0.4, ballZ * 0.55);
          _desiredPos.set(ballX - 25 * distanceScale, 15 * heightScale, ballZ * 0.45);
          break;
        case 'stadium':
          _desiredTarget.set(ballX * 0.68, 0.5, ballZ * 0.5);
          _desiredPos.set(ballX * 0.48 - 10, 38 * heightScale, ballZ * 0.25 + 48 * distanceScale);
          break;
        case 'wide':
        case 'broadcast-wide':
        default:
          _desiredTarget.set(ballX * 0.78, 0.5, ballZ * 0.55);
          _desiredPos.set(ballX * 0.68, 29 * heightScale, ballZ * 0.32 + 43 * distanceScale);
          break;
      }
    }

    const alpha = 1 - Math.exp(-5.5 * dt);
    this.currentPos.lerp(_desiredPos, alpha);
    this.currentTarget.lerp(_desiredTarget, alpha);

    camera.position.copy(this.currentPos);
    if (trauma > 0.01) {
      const shake = trauma * trauma * 0.45;
      camera.position.x += Math.sin(performance.now() * 0.04) * shake;
      camera.position.y += Math.cos(performance.now() * 0.05) * shake;
    }
    camera.lookAt(this.currentTarget);
  }
}
