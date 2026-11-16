import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Box,
  Check,
  Code2,
  Copy,
  Cpu,
  Eye,
  Layers,
  Play,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { createPlayerRig, setPlayerRigPose } from '../game/renderer/playerMesh';
import {
  createContactShadowTexture,
  createFootballTexture,
  getKitNormalAndSpecularMaps,
  getSkinSweatSpecularMap,
} from '../game/renderer/proceduralTextures';
import { SimPlayer } from '../game/players/playerKinematics';
import { KitDesign } from '../types/football';

interface Pes2012EngineStudioModalProps {
  onClose: () => void;
}

export const UNITY_URP_HLSL_SHADER = `// ============================================================================
// PES 2012 (PS3 / Xbox 360 Era) SkinSweat & Polyester Kit Shader — Unity URP HLSL
// Replicates Konami's early-2010s Blinn-Phong sweat sheen, rigid cloth folds,
// and high-contrast golden-hour / stadium floodlight response.
// ============================================================================
Shader "PES2012/PS3_SkinAndKitBlinnPhong"
{
    Properties
    {
        _BaseMap ("Diffuse Texture (RGB)", 2D) = "white" {}
        _BaseColor ("Tint Color", Color) = (1, 1, 1, 1)
        _BumpMap ("Rigid Cloth Folds / Skin Pore Normal Map", 2D) = "bump" {}
        _BumpScale ("Normal Fold Intensity", Range(0.0, 2.0)) = 0.85
        _SpecGlossMap ("Sweat / Polyester Specular Map (RGB)", 2D) = "white" {}
        _SpecColor ("Blinn-Phong Specular Tint", Color) = (0.65, 0.72, 0.80, 1)
        _Shininess ("PS3 Specular Power (Sweat=38, Kit=48, Boot=92)", Range(8, 128)) = 46
        _RimPower ("Stadium Floodlight Rim Power", Range(1.0, 8.0)) = 3.2
        _RimIntensity ("Floodlight Rim Boost", Range(0.0, 1.5)) = 0.42
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }

        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS   : NORMAL;
                float4 tangentOS  : TANGENT;
                float2 uv         : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 positionWS : TEXCOORD0;
                float3 normalWS   : TEXCOORD1;
                float3 tangentWS  : TEXCOORD2;
                float3 bitangentWS: TEXCOORD3;
                float2 uv         : TEXCOORD4;
            };

            TEXTURE2D(_BaseMap);       SAMPLER(sampler_BaseMap);
            TEXTURE2D(_BumpMap);       SAMPLER(sampler_BumpMap);
            TEXTURE2D(_SpecGlossMap);  SAMPLER(sampler_SpecGlossMap);

            float4 _BaseColor;
            float4 _SpecColor;
            float  _BumpScale;
            float  _Shininess;
            float  _RimPower;
            float  _RimIntensity;

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                VertexPositionInputs posInputs = GetVertexPositionInputs(IN.positionOS.xyz);
                VertexNormalInputs normInputs  = GetVertexNormalInputs(IN.normalOS, IN.tangentOS);

                OUT.positionCS  = posInputs.positionCS;
                OUT.positionWS  = posInputs.positionWS;
                OUT.normalWS    = normInputs.normalWS;
                OUT.tangentWS   = normInputs.tangentWS;
                OUT.bitangentWS = normInputs.bitangentWS;
                OUT.uv          = IN.uv;
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                half4 albedo = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv) * _BaseColor;
                half3 specMask = SAMPLE_TEXTURE2D(_SpecGlossMap, sampler_SpecGlossMap, IN.uv).rgb;

                // Unpack rigid jersey cloth folds / skin normal map
                half3 normalTS = UnpackNormalScale(SAMPLE_TEXTURE2D(_BumpMap, sampler_BumpMap, IN.uv), _BumpScale);
                float3x3 TBN = float3x3(normalize(IN.tangentWS), normalize(IN.bitangentWS), normalize(IN.normalWS));
                float3 N = normalize(mul(normalTS, TBN));

                float3 V = GetWorldSpaceNormalizeViewDir(IN.positionWS);
                float4 shadowCoord = TransformWorldToShadowCoord(IN.positionWS);
                Light mainLight = GetMainLight(shadowCoord);
                float3 L = normalize(mainLight.direction);
                float3 H = normalize(L + V);

                // 1. High-Contrast PS3 Half-Lambert / Hard Shadow Diffuse
                float NdotL = saturate(dot(N, L));
                float hardShadow = smoothstep(0.15, 0.55, mainLight.shadowAttenuation);
                float3 diffuse = albedo.rgb * mainLight.color * (NdotL * hardShadow + 0.22);

                // 2. Classic Blinn-Phong Sweat & Polyester Specular Highlight
                float NdotH = saturate(dot(N, H));
                float specTerm = pow(NdotH, _Shininess) * NdotL * hardShadow;
                float3 specular = _SpecColor.rgb * specMask * specTerm * 1.45;

                // 3. Stadium Floodlight Grazing Rim Highlight (drives Bloom on white kits)
                float rim = pow(1.0 - saturate(dot(N, V)), _RimPower) * _RimIntensity;
                float3 finalColor = diffuse + specular + (mainLight.color * rim);

                return half4(finalColor, 1.0);
            }
            ENDHLSL
        }
    }
}`;

export const UNITY_CSHARP_CONTROLLER = `// ============================================================================
// PES2012PlayerController.cs — Unity C# Gameplay & AI Navigation Controller
// Implements:
//  1) 8-Way & 360-Degree Dribbling with "Knock-On" Sprint Ball Push & 45° Cuts
//  2) Off-the-Ball Teammate AI Diagonal Overlapping Runs into Open Space
//  3) Defensive Jockeying State (Strafe Facing Ball Carrier at Fixed Distance)
// ============================================================================
using UnityEngine;

public class PES2012PlayerController : MonoBehaviour
{
    public enum PlayerRoleState { BallCarrier, OffBallTeammate, DefensiveJockey }

    [Header("PES 2012 Role & References")]
    public PlayerRoleState currentState = PlayerRoleState.BallCarrier;
    public Rigidbody playerRb;
    public Rigidbody ballRb;
    public Transform ballCarrier;
    public Transform teammateWingTarget;
    public bool use8WayDigitalDribble = false; // Toggle 8-way d-pad vs 360-degree analog

    [Header("1. Dribbling, 45-Deg Cuts & Knock-On Sprint")]
    public float baseDribbleSpeed = 6.4f;
    public float sprintSpeed = 8.9f;
    public float closeControlTapForce = 4.2f;
    public float knockOnSprintImpulse = 11.8f;
    public float dribbleTouchCadence = 0.22f;
    public float directionalCutSnapSpeed = 16.0f;

    [Header("2. Off-Ball Diagonal Overlapping Run AI")]
    public float forwardFacingDotThreshold = 0.35f;
    public float diagonalOverlapAngleDeg = 32.0f;
    public float overlapSprintSpeed = 8.6f;

    [Header("3. Defensive Jockeying (Contain State)")]
    public float jockeyContainDistance = 2.8f;
    public float jockeyStrafeSpeed = 4.8f;

    private float nextTouchTimer = 0f;
    private Vector3 lastMoveDir = Vector3.forward;

    void FixedUpdate()
    {
        switch (currentState)
        {
            case PlayerRoleState.BallCarrier:
                UpdateDribblingAndKnockOn(Time.fixedDeltaTime);
                break;
            case PlayerRoleState.OffBallTeammate:
                UpdateDiagonalOverlappingRunAI(Time.fixedDeltaTime);
                break;
            case PlayerRoleState.DefensiveJockey:
                UpdateDefensiveJockeyState(Time.fixedDeltaTime);
                break;
        }
    }

    // ------------------------------------------------------------------------
    // 1. 8-WAY & 360-DEGREE DRIBBLING + "KNOCK-ON" SPRINT PUSH
    // ------------------------------------------------------------------------
    private void UpdateDribblingAndKnockOn(float dt)
    {
        Vector2 rawInput = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
        bool isSprinting = Input.GetKey(KeyCode.LeftShift) || Input.GetButton("Sprint_R1");
        bool knockOnPressed = Input.GetKeyDown(KeyCode.E) || Input.GetButtonDown("KnockOn_DoubleR1");

        if (rawInput.sqrMagnitude < 0.04f) return;

        // Quantize to 8-way digital angles (45-deg steps) or smooth 360-degree analog
        float angleRad = Mathf.Atan2(rawInput.x, rawInput.y);
        if (use8WayDigitalDribble)
        {
            float step = Mathf.PI / 4f; // 45-degree directional snap
            angleRad = Mathf.Round(angleRad / step) * step;
        }
        Vector3 moveDir = new Vector3(Mathf.Sin(angleRad), 0f, Mathf.Cos(angleRad)).normalized;

        // Detect sharp 45-degree directional cut -> planted pivot foot snap
        float cutAngle = Vector3.Angle(lastMoveDir, moveDir);
        float turnRate = cutAngle >= 40f ? directionalCutSnapSpeed * 1.45f : directionalCutSnapSpeed;
        transform.rotation = Quaternion.Slerp(
            transform.rotation,
            Quaternion.LookRotation(moveDir),
            turnRate * dt
        );
        lastMoveDir = moveDir;

        float targetSpeed = isSprinting ? sprintSpeed : baseDribbleSpeed;
        playerRb.linearVelocity = new Vector3(moveDir.x * targetSpeed, playerRb.linearVelocity.y, moveDir.z * targetSpeed);

        // Rhythmic foot taps & "Knock-On" sprint ball push
        nextTouchTimer -= dt;
        float distToBall = Vector3.Distance(transform.position, ballRb.position);
        if (distToBall < 1.35f && (knockOnPressed || nextTouchTimer <= 0f))
        {
            float pushForce = knockOnPressed
                ? knockOnSprintImpulse
                : (isSprinting ? closeControlTapForce * 1.55f : closeControlTapForce);

            Vector3 ballTargetVel = moveDir * pushForce;
            ballRb.linearVelocity = new Vector3(ballTargetVel.x, ballRb.linearVelocity.y, ballTargetVel.z);
            nextTouchTimer = knockOnPressed ? 0.42f : dribbleTouchCadence;
        }
    }

    // ------------------------------------------------------------------------
    // 2. OFF-THE-BALL TEAMMATE AI: DIAGONAL OVERLAPPING RUNS INTO OPEN SPACE
    // ------------------------------------------------------------------------
    private void UpdateDiagonalOverlappingRunAI(float dt)
    {
        if (ballCarrier == null) return;

        // Attacking forward direction (+Z pitch axis)
        Vector3 pitchAttackAxis = Vector3.forward;
        float carrierFacingForwardDot = Vector3.Dot(ballCarrier.forward, pitchAttackAxis);

        // When the ball carrier faces forward, trigger a diagonal overlapping run into open space
        if (carrierFacingForwardDot > forwardFacingDotThreshold)
        {
            float wingSign = Mathf.Sign(transform.position.x - ballCarrier.position.x);
            if (Mathf.Abs(wingSign) < 0.1f) wingSign = 1f;

            Quaternion diagRot = Quaternion.Euler(0f, wingSign * diagonalOverlapAngleDeg, 0f);
            Vector3 diagonalRunDir = (diagRot * pitchAttackAxis).normalized;

            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(diagonalRunDir), 10f * dt);
            playerRb.linearVelocity = new Vector3(
                diagonalRunDir.x * overlapSprintSpeed,
                playerRb.linearVelocity.y,
                diagonalRunDir.z * overlapSprintSpeed
            );
        }
    }

    // ------------------------------------------------------------------------
    // 3. DEFENSIVE JOCKEYING STATE: STRAFE FACING CARRIER AT FIXED DISTANCE
    // ------------------------------------------------------------------------
    private void UpdateDefensiveJockeyState(float dt)
    {
        if (ballCarrier == null) return;

        Vector3 toCarrier = ballCarrier.position - transform.position;
        toCarrier.y = 0f;
        float currentDist = toCarrier.magnitude;
        Vector3 dirToCarrier = toCarrier.normalized;

        // Always lock body orientation to face the ball carrier
        transform.rotation = Quaternion.Slerp(
            transform.rotation,
            Quaternion.LookRotation(dirToCarrier),
            18f * dt
        );

        // Maintain fixed jockey contain distance (e.g. 2.8m) while strafing laterally
        float radialError = currentDist - jockeyContainDistance;
        float lateralInput = Input.GetAxisRaw("Horizontal");
        Vector3 rightStrafe = Vector3.Cross(Vector3.up, dirToCarrier);

        Vector3 jockeyVel = (dirToCarrier * Mathf.Clamp(radialError * 3.2f, -jockeyStrafeSpeed, jockeyStrafeSpeed))
                          + (rightStrafe * (lateralInput * jockeyStrafeSpeed));

        playerRb.linearVelocity = new Vector3(jockeyVel.x, playerRb.linearVelocity.y, jockeyVel.z);
    }
}`;

export const UNREAL_CPP_CONTROLLER = `// ============================================================================
// PES2012Character.cpp — Unreal Engine 5 C++ Player & AI Locomotion Controller
// Replicates PES 2012 8-Way/360 Dribbling + Knock-On Sprint, Diagonal Overlap
// Teammate AI Runs, and Defensive Jockeying Strafe State.
// ============================================================================
#include "PES2012Character.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Components/PrimitiveComponent.h"
#include "Kismet/KismetMathLibrary.h"

void APES2012Character::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    switch (RoleState)
    {
        case EPES2012Role::BallCarrier:
            TickDribblingAndKnockOn(DeltaTime);
            break;
        case EPES2012Role::OffBallTeammate:
            TickDiagonalOverlapRunAI(DeltaTime);
            break;
        case EPES2012Role::DefensiveJockey:
            TickDefensiveJockey(DeltaTime);
            break;
    }
}

// 1. 8-Way & 360-Degree Dribbling with "Knock-On" Sprint Ball Push
void APES2012Character::TickDribblingAndKnockOn(float DeltaTime)
{
    if (MoveInput.SizeSquared() < 0.04f) return;

    float AngleRad = FMath::Atan2(MoveInput.X, MoveInput.Y);
    if (bUse8WayDribble)
    {
        const float Step = PI / 4.0f; // 45-degree snappy directional cuts
        AngleRad = FMath::RoundToFloat(AngleRad / Step) * Step;
    }

    const FVector DesiredDir = FVector(FMath::Cos(AngleRad), FMath::Sin(AngleRad), 0.f).GetSafeNormal();
    const FRotator TargetRot = DesiredDir.Rotation();
    SetActorRotation(FMath::RInterpTo(GetActorRotation(), TargetRot, DeltaTime, 15.0f));

    GetCharacterMovement()->MaxWalkSpeed = bIsSprinting ? 890.f : 640.f;
    AddMovementInput(DesiredDir, 1.0f);

    if (MatchBallMesh && FVector::Dist(GetActorLocation(), MatchBallMesh->GetComponentLocation()) < 135.f)
    {
        TouchCooldown -= DeltaTime;
        if (bKnockOnTriggered || TouchCooldown <= 0.f)
        {
            const float ImpulseMag = bKnockOnTriggered ? 1180.f : (bIsSprinting ? 660.f : 420.f);
            MatchBallMesh->SetPhysicsLinearVelocity(DesiredDir * ImpulseMag);
            TouchCooldown = bKnockOnTriggered ? 0.42f : 0.22f;
            bKnockOnTriggered = false;
        }
    }
}

// 2. Off-the-Ball Teammate AI: Diagonal Overlapping Runs when Carrier Faces Forward
void APES2012Character::TickDiagonalOverlapRunAI(float DeltaTime)
{
    if (!BallCarrierActor) return;

    const FVector AttackDirection = FVector(1.f, 0.f, 0.f);
    const float ForwardDot = FVector::DotProduct(BallCarrierActor->GetActorForwardVector(), AttackDirection);

    if (ForwardDot > 0.35f)
    {
        const float WingSign = FMath::Sign(GetActorLocation().Y - BallCarrierActor->GetActorLocation().Y);
        const FVector OverlapDir = AttackDirection.RotateAngleAxis(WingSign * 32.f, FVector::UpVector);

        SetActorRotation(FMath::RInterpTo(GetActorRotation(), OverlapDir.Rotation(), DeltaTime, 10.f));
        GetCharacterMovement()->MaxWalkSpeed = 860.f;
        AddMovementInput(OverlapDir, 1.0f);
    }
}

// 3. Defensive Jockeying State: Strafe Facing Ball Carrier at Fixed Distance
void APES2012Character::TickDefensiveJockey(float DeltaTime)
{
    if (!BallCarrierActor) return;

    FVector ToCarrier = BallCarrierActor->GetActorLocation() - GetActorLocation();
    ToCarrier.Z = 0.f;
    const float Dist = ToCarrier.Size();
    const FVector DirToCarrier = ToCarrier.GetSafeNormal();

    // Lock defender orientation onto the ball carrier
    SetActorRotation(FMath::RInterpTo(GetActorRotation(), DirToCarrier.Rotation(), DeltaTime, 18.f));

    // Maintain fixed contain distance (280 cm = 2.8m) while strafing
    const float RadialDelta = FMath::Clamp((Dist - 280.f) / 120.f, -1.f, 1.f);
    const FVector RightStrafe = FVector::CrossProduct(FVector::UpVector, DirToCarrier);

    GetCharacterMovement()->MaxWalkSpeed = 480.f;
    AddMovementInput(DirToCarrier * RadialDelta + RightStrafe * MoveInput.X, 1.0f);
}`;

export const Pes2012EngineStudioModal: React.FC<Pes2012EngineStudioModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'character-3d' | 'shader-guide' | 'movement-ai'>('character-3d');
  const [pose, setPose] = useState<'dribble-cycle' | 'cut-45' | 'a-pose' | 't-pose'>('dribble-cycle');
  const [lightingMode, setLightingMode] = useState<'golden-hour' | 'floodlight-bloom'>('golden-hour');
  const [bootColor, setBootColor] = useState<string>('#CCFF00');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const poseRef = useRef(pose);
  poseRef.current = pose;

  const copyCode = (id: string, code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Mount interactive Three.js 3D PES 2012 Character Model & Ball Dribble Viewport
  useEffect(() => {
    if (activeTab !== 'character-3d' || !viewportRef.current) return;
    const container = viewportRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(lightingMode === 'golden-hour' ? 0x0c192c : 0x050e21);
    scene.fog = new THREE.FogExp2(lightingMode === 'golden-hour' ? 0x16243b : 0x061229, 0.085);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(1.85, 1.35, 3.15);
    camera.lookAt(0, 0.92, 0);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = lightingMode === 'golden-hour' ? 1.25 : 1.38;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
    } catch {
      return;
    }

    // Lighting: Golden-Hour Directional Sun vs Stadium Floodlight Bloom
    const ambient = new THREE.AmbientLight(
      lightingMode === 'golden-hour' ? 0xffe4b5 : 0x93c5fd,
      lightingMode === 'golden-hour' ? 0.65 : 0.58
    );
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(
      lightingMode === 'golden-hour' ? 0xffcf75 : 0xe0f7fa,
      lightingMode === 'golden-hour' ? 3.1 : 2.95
    );
    keyLight.position.set(3.5, 5.8, 3.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00e5ff, lightingMode === 'floodlight-bloom' ? 2.1 : 1.15);
    rimLight.position.set(-3.2, 3.2, -2.8);
    scene.add(rimLight);

    // Pitch turf pedestal
    const turfGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.08, 48);
    const turfMat = new THREE.MeshPhongMaterial({
      color: 0x1e632d,
      specular: 0x287c39,
      shininess: 18,
    });
    const turf = new THREE.Mesh(turfGeo, turfMat);
    turf.position.y = -0.04;
    turf.receiveShadow = true;
    scene.add(turf);

    // Build PS3/Xbox 360 Era PES 2012 Male Footballer Rig
    const demoSimPlayer: SimPlayer = {
      id: 'pes2012-hero',
      name: 'L. MESSI / CRISTIANO',
      shortName: 'MESSI',
      number: 10,
      side: 'home',
      slotIndex: 9,
      role: 'ST',
      archetype: 'classic-10',
      morale: 95,
      formArrow: 'up-hot',
      attributes: {
        pace: 94,
        shooting: 93,
        passing: 92,
        dribbling: 97,
        defending: 48,
        physical: 76,
        goalkeeping: 15,
      },
      appearance: {
        skinTone: '#e2b18f',
        hairColor: '#1a1615',
        hairStyle: 'short',
        bootColor,
      },
      overall: 96,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vz: 0,
      wallJumpVy: 0,
      facing: Math.PI / 2,
      stamina: 1,
      kickCooldown: 0,
      tackleCooldown: 0,
      stunTimer: 0,
      actionAnim: 'run',
      actionTimer: 0,
      walkCycle: 0,
      diveDirZ: 0,
      yellowCards: 0,
      redCard: false,
      isControlled: true,
      shielding: false,
      teammateRunTimer: 0,
      teammateRunTargetX: 0,
      teammateRunTargetZ: 0,
      skillCooldown: 0,
      skillSpin: 0,
      feintDir: 1,
      recentSkillTimer: 0,
    };

    const demoKit: KitDesign = {
      primary: '#A50044',
      secondary: '#004D98',
      shorts: '#004D98',
      socks: '#A50044',
      gkPrimary: '#10B981',
      pattern: 'stripes',
    };

    const shadowTex = createContactShadowTexture();
    const playerRig = createPlayerRig(demoSimPlayer, demoKit, shadowTex, true);
    scene.add(playerRig.root);

    // 32-Panel Starball Match Ball at the player's feet
    const ballTex = createFootballTexture(4);
    const ballMat = new THREE.MeshPhongMaterial({
      map: ballTex,
      specular: 0xffffff,
      shininess: 68,
    });
    const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.145, 24, 24), ballMat);
    ballMesh.castShadow = true;
    ballMesh.position.set(0, 0.145, 0.42);
    scene.add(ballMesh);

    let animId = 0;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = (performance.now() - startTime) * 0.001;
      setPlayerRigPose(playerRig, poseRef.current, t);

      if (poseRef.current === 'dribble-cycle') {
        const tap = Math.abs(Math.sin(t * 10.5));
        ballMesh.visible = true;
        ballMesh.position.set(0, 0.145, 0.36 + tap * 0.18);
        ballMesh.rotation.x += 0.12;
      } else if (poseRef.current === 'cut-45') {
        const cut = Math.sin(t * 4.2);
        ballMesh.visible = true;
        ballMesh.position.set(cut * 0.28, 0.145, 0.38);
        ballMesh.rotation.z -= cut * 0.1;
        ballMesh.rotation.x += 0.09;
      } else {
        ballMesh.visible = false;
      }

      // Gentle camera orbit for 360-degree model inspection
      const camAng = Math.sin(t * 0.45) * 0.55;
      camera.position.x = Math.sin(camAng) * 3.25;
      camera.position.z = Math.cos(camAng) * 3.25;
      camera.lookAt(0, 0.92, 0);

      renderer?.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer?.dispose();
    };
  }, [activeTab, lightingMode, bootColor]);

  // Generate data URLs for the procedural Diffuse/Normal/Specular maps preview
  const mapPreviews = React.useMemo(() => {
    const { normalMap, specularMap } = getKitNormalAndSpecularMaps();
    const sweatMap = getSkinSweatSpecularMap();
    return {
      normalUrl: (normalMap.image as HTMLCanvasElement)?.toDataURL?.() ?? '',
      kitSpecUrl: (specularMap.image as HTMLCanvasElement)?.toDataURL?.() ?? '',
      sweatSpecUrl: (sweatMap.image as HTMLCanvasElement)?.toDataURL?.() ?? '',
    };
  }, []);

  return (
    <div
      data-testid="pes2012-engine-studio-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(4, 10, 24, 0.88)' }}
    >
      <div className="broadcast-panel rounded-sm max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#00E5FF]/75 shadow-[0_0_45px_rgba(0,229,255,0.32)]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-cyan-400/35 flex flex-wrap items-center justify-between gap-3 bg-[#061229]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xs bg-[#00E5FF]/20 border border-[#00E5FF] flex items-center justify-center text-[#00E5FF]">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-display font-bold uppercase tracking-[0.22em] text-[#00E5FF]">
                PS3 / XBOX 360 ERA GRAPHICS & ENGINE SDK
              </div>
              <h3 className="font-display text-lg sm:text-xl font-extrabold uppercase text-white">
                PES 2012 3D Character Model, Blinn-Phong Shaders & Locomotion Controller
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xs bg-[#0B3B8C]/50 hover:bg-rose-600/80 border border-white/25 text-xs font-display font-bold uppercase text-white flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Close Studio</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-2.5 border-b border-cyan-400/25 flex flex-wrap gap-2 bg-[#071633]">
          <button
            type="button"
            onClick={() => setActiveTab('character-3d')}
            className={`px-4 py-2 rounded-t-xs font-display text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'character-3d'
                ? 'bg-[#00E5FF] text-[#041024]'
                : 'bg-[#061229]/75 text-cyan-200 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>1. 3D Character Rig & 2012 Dribble Cycle</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shader-guide')}
            className={`px-4 py-2 rounded-t-xs font-display text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'shader-guide'
                ? 'bg-[#00E5FF] text-[#041024]'
                : 'bg-[#061229]/75 text-cyan-200 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2. Unity URP / UE5 Blinn-Phong Shader & Bloom Guide</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movement-ai')}
            className={`px-4 py-2 rounded-t-xs font-display text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'movement-ai'
                ? 'bg-[#00E5FF] text-[#041024]'
                : 'bg-[#061229]/75 text-cyan-200 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>3. C# (Unity) & C++ (UE5) Dribbling, Overlap AI & Jockey Controller</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {activeTab === 'character-3d' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left 7 Cols: Interactive 3D WebGL Character & Animation Viewport */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="relative rounded-xs border-2 border-[#00E5FF]/65 bg-[#050E21] overflow-hidden h-[380px]">
                  <div ref={viewportRef} className="w-full h-full" />

                  {/* Top-Left Topology & Material Telemetry Overlay */}
                  <div className="absolute top-3 left-3 p-2.5 rounded-xs bg-[#061229]/90 border border-[#00E5FF]/45 text-[11px] font-mono-tabular text-cyan-100 space-y-0.5 pointer-events-none">
                    <div className="text-[#00E5FF] font-bold">PES 2012 PS3/X360 CHARACTER SPEC</div>
                    <div>TOPOLOGY: ~15,000 TRIS (LOD0 GAME-READY)</div>
                    <div>HAIR MESH: SCULPTED SOLID 3D WEDGES (NO ALPHA STRANDS)</div>
                    <div>SHADER: BLINN-PHONG SWEAT & RIGID CLOTH FOLDS</div>
                  </div>
                </div>

                {/* Animation Pose & Lighting Controls */}
                <div className="p-3.5 rounded-xs bg-[#061229]/90 border border-cyan-400/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'dribble-cycle', label: '2012 Dribble Cycle (Foot Taps)' },
                        { id: 'cut-45', label: '45° Planted-Pivot Cut' },
                        { id: 'a-pose', label: 'A-Pose (Rig)' },
                        { id: 't-pose', label: 'T-Pose (Rig)' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPose(item.id)}
                        className={`px-3 py-1.5 rounded-xs font-display text-xs font-extrabold uppercase cursor-pointer ${
                          pose === item.id
                            ? 'bg-[#00E5FF] text-[#041024]'
                            : 'bg-[#0B3B8C]/50 text-cyan-100 border border-cyan-400/30'
                        }`}
                      >
                        <Play className="w-3 h-3 inline mr-1" />
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setLightingMode((m) => (m === 'golden-hour' ? 'floodlight-bloom' : 'golden-hour'))
                      }
                      className="px-3 py-1.5 rounded-xs bg-amber-500/20 border border-amber-400/60 text-amber-200 font-display text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>{lightingMode === 'golden-hour' ? 'Golden-Hour Sun' : 'Night Floodlight Bloom'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Character Model Specs, 2012 Neon Boots & Texture Maps */}
              <div className="lg:col-span-5 space-y-3">
                <div className="p-3.5 rounded-xs bg-[#061229]/90 border border-cyan-400/35 space-y-2">
                  <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[#00E5FF]">
                    CHARACTER & LOCOMOTION SPECIFICATIONS
                  </div>
                  <ul className="text-xs text-cyan-100/90 space-y-1.5 leading-relaxed">
                    <li>
                      • <strong className="text-white">Athletic Build & Solid 3D Hair:</strong> Broad deltoid shoulders, V-taper 2011–2012 fitted jersey with rigid cloth fold ridges, and sculpted solid 3D hair wedges.
                    </li>
                    <li>
                      • <strong className="text-white">Sweat & Polyester Specular Maps:</strong> Blinn-Phong shader (`shininess: 38` skin / `48` kit) with forehead/cheekbone sweat sheen and micro-mesh polyester reflections.
                    </li>
                    <li>
                      • <strong className="text-white">2012 Arcade-Sim Dribble Cycle:</strong> Forward torso lean (`12.5°`), quick rhythmic foot taps on the ball, elbows bent (`~62°`) for balance with minimal shoulder sway, and snappy 45° pivot cuts.
                    </li>
                  </ul>
                </div>

                {/* Classic 2012 Neon Boot Selector */}
                <div className="p-3.5 rounded-xs bg-[#061229]/90 border border-cyan-400/35">
                  <div className="text-[10px] font-display font-bold uppercase tracking-widest text-[#00E5FF] mb-2">
                    CLASSIC 2012 NEON FOOTBALL BOOTS
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { hex: '#CCFF00', name: '2012 Volt Neon' },
                      { hex: '#FF1E56', name: '2012 Crimson Clash' },
                      { hex: '#00E5FF', name: '2012 Electric Cyan' },
                      { hex: '#FF6B00', name: '2012 Solar Orange' },
                    ].map((b) => (
                      <button
                        key={b.hex}
                        type="button"
                        onClick={() => setBootColor(b.hex)}
                        className={`px-3 py-1.5 rounded-xs border text-left flex items-center gap-2 text-xs font-display font-bold uppercase cursor-pointer ${
                          bootColor === b.hex
                            ? 'border-[#00E5FF] bg-[#0B3B8C]/70 text-white'
                            : 'border-white/15 bg-[#040B1A] text-cyan-200'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white"
                          style={{ backgroundColor: b.hex }}
                        />
                        <span>{b.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Procedural Normal & Specular Texture Maps Preview */}
                <div className="p-3.5 rounded-xs bg-[#061229]/90 border border-cyan-400/35">
                  <div className="flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-widest text-[#00E5FF] mb-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>INCLUDED TEXTURE MAPS (NORMAL / KIT SPEC / SWEAT SPEC)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 rounded-xs bg-[#040B1A] border border-white/15">
                      {mapPreviews.normalUrl && (
                        <img
                          src={mapPreviews.normalUrl}
                          alt="Rigid Cloth Fold Normal Map"
                          className="w-full h-16 object-cover rounded-xs mb-1"
                        />
                      )}
                      <span className="text-[10px] font-mono-tabular text-cyan-200">Cloth Normal</span>
                    </div>
                    <div className="p-1.5 rounded-xs bg-[#040B1A] border border-white/15">
                      {mapPreviews.kitSpecUrl && (
                        <img
                          src={mapPreviews.kitSpecUrl}
                          alt="Polyester Specular Map"
                          className="w-full h-16 object-cover rounded-xs mb-1"
                        />
                      )}
                      <span className="text-[10px] font-mono-tabular text-cyan-200">Kit Specular</span>
                    </div>
                    <div className="p-1.5 rounded-xs bg-[#040B1A] border border-white/15">
                      {mapPreviews.sweatSpecUrl && (
                        <img
                          src={mapPreviews.sweatSpecUrl}
                          alt="Sweat Specular Map"
                          className="w-full h-16 object-cover rounded-xs mb-1"
                        />
                      )}
                      <span className="text-[10px] font-mono-tabular text-cyan-200">Sweat Specular</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shader-guide' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xs bg-[#061229]/90 border border-cyan-400/35">
                  <div className="text-xs font-display font-extrabold uppercase text-[#00E5FF]">
                    1. Skin & Kit Blinn-Phong Shader
                  </div>
                  <p className="text-xs text-cyan-100/85 mt-1">
                    Uses `NdotH^Shininess` (`38` for sweaty skin, `48` for polyester kits, `92` for neon boots) multiplied by a sweat/weave specular map and tangent-space rigid cloth fold normals.
                  </p>
                </div>
                <div className="p-3.5 rounded-xs bg-[#061229]/90 border border-cyan-400/35">
                  <div className="text-xs font-display font-extrabold uppercase text-amber-300">
                    2. Golden-Hour Hard Shadows
                  </div>
                  <p className="text-xs text-cyan-100/85 mt-1">
                    Directional Light at `5600K–4500K` (`#FFCF75`), Intensity `3.1`, Pitch Rotation `(38°, -35°, 0°)` with 4-cascade crisp shadow step (`smoothstep(0.15, 0.55, shadowAtten)`).
                  </p>
                </div>
                <div className="p-3.5 rounded-xs bg-[#061229]/90 border border-cyan-400/35">
                  <div className="text-xs font-display font-extrabold uppercase text-emerald-300">
                    3. Heavy Bloom & Stadium DoF
                  </div>
                  <p className="text-xs text-cyan-100/85 mt-1">
                    URP / UE5 Post-Process Volume: Bloom `Threshold = 0.82`, `Intensity = 1.65`, `Scatter = 0.78` (glows on floodlights & white kits) + Bokeh DoF (`FocusDistance = 24m`, `Aperture = f/4.0`).
                  </p>
                </div>
              </div>

              <div className="rounded-xs bg-[#040B1A] border border-cyan-400/35 overflow-hidden">
                <div className="px-4 py-2 bg-[#061229] border-b border-cyan-400/25 flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-bold text-[#00E5FF]">
                    PES2012_PS3_SkinAndKitBlinnPhong.shader (Unity URP HLSL)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode('shader', UNITY_URP_HLSL_SHADER)}
                    className="px-2.5 py-1 rounded-xs bg-[#0B3B8C] hover:bg-[#00E5FF] hover:text-[#041024] text-xs font-display font-bold uppercase text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === 'shader' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'shader' ? 'Copied' : 'Copy Shader'}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono-tabular text-cyan-100 overflow-x-auto max-h-[340px]">
                  {UNITY_URP_HLSL_SHADER}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'movement-ai' && (
            <div className="space-y-4">
              <div className="rounded-xs bg-[#040B1A] border border-cyan-400/35 overflow-hidden">
                <div className="px-4 py-2 bg-[#061229] border-b border-cyan-400/25 flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-bold text-[#00E5FF]">
                    Unity C# — PES2012PlayerController.cs (8-Way/360 Dribbling + Knock-On + Overlap AI + Jockey)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode('csharp', UNITY_CSHARP_CONTROLLER)}
                    className="px-2.5 py-1 rounded-xs bg-[#0B3B8C] hover:bg-[#00E5FF] hover:text-[#041024] text-xs font-display font-bold uppercase text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === 'csharp' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'csharp' ? 'Copied' : 'Copy C#'}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono-tabular text-cyan-100 overflow-x-auto max-h-[260px]">
                  {UNITY_CSHARP_CONTROLLER}
                </pre>
              </div>

              <div className="rounded-xs bg-[#040B1A] border border-cyan-400/35 overflow-hidden">
                <div className="px-4 py-2 bg-[#061229] border-b border-cyan-400/25 flex items-center justify-between">
                  <span className="font-mono-tabular text-xs font-bold text-amber-300">
                    Unreal Engine 5 C++ — PES2012Character.cpp (Locomotion, Overlap Run AI & Defensive Jockey)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode('cpp', UNREAL_CPP_CONTROLLER)}
                    className="px-2.5 py-1 rounded-xs bg-[#0B3B8C] hover:bg-[#00E5FF] hover:text-[#041024] text-xs font-display font-bold uppercase text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === 'cpp' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'cpp' ? 'Copied' : 'Copy C++'}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono-tabular text-cyan-100 overflow-x-auto max-h-[240px]">
                  {UNREAL_CPP_CONTROLLER}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
