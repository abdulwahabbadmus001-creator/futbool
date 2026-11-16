import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';

export interface PostProcessingPipeline {
  render: () => void;
  setSize: (width: number, height: number) => void;
  dispose: () => void;
}

export function createPostProcessingPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  isSoftwareGl: boolean,
  isNightOrDusk: boolean
): PostProcessingPipeline {
  // Mandatory software WebGL fallback: bypass multi-pass composer to prevent SwiftShader lag/blackouts
  if (isSoftwareGl) {
    return {
      render: () => {
        renderer.render(scene, camera);
      },
      setSize: () => {},
      dispose: () => {},
    };
  }

  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    samples: 4,
  });
  const composer = new EffectComposer(renderer, renderTarget);
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    isNightOrDusk ? 0.36 : 0.2,
    0.35,
    0.86
  );
  composer.addPass(bloomPass);

  const vignettePass = new ShaderPass(VignetteShader);
  vignettePass.uniforms['offset'].value = 1.05;
  vignettePass.uniforms['darkness'].value = 0.85;
  composer.addPass(vignettePass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    render: () => {
      composer.render();
    },
    setSize: (w: number, h: number) => {
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
    },
    dispose: () => {
      bloomPass.dispose();
      renderTarget.dispose();
      composer.dispose();
    },
  };
}
