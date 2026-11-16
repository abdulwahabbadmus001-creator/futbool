// ============================================================================
// PES2012Character.cpp — Unreal Engine 5 C++ Player & AI Locomotion Controller
// Replicates Pro Evolution Soccer 2012 (Winning Eleven 2012) mechanics:
//  1) 8-Way & 360-Degree Dribbling with "Knock-On" Sprint Ball Push & 45° Cuts
//  2) Off-the-Ball Teammate AI Diagonal Overlapping Runs when Carrier Faces Forward
//  3) Defensive Jockeying State (Strafe Facing Ball Carrier at Fixed Distance)
// ============================================================================
#if __has_include("PES2012Character.h")
#include "PES2012Character.h"
#elif __has_include("Public/PES2012Character.h")
#include "Public/PES2012Character.h"
#elif __has_include("Private/PES2012Character.h")
#include "Private/PES2012Character.h"
#elif __has_include("../PES2012Character.h")
#include "../PES2012Character.h"
#elif __has_include("../include/PES2012Character.h")
#include "../include/PES2012Character.h"
#elif __has_include("../Public/PES2012Character.h")
#include "../Public/PES2012Character.h"
#elif __has_include("../../include/PES2012Character.h")
#include "../../include/PES2012Character.h"
#else
#error "PES2012Character.h was not found. Place it beside this source file or add its directory to the compiler include path."
#endif

#if __has_include("GameFramework/CharacterMovementComponent.h")
#include "GameFramework/CharacterMovementComponent.h"
#elif __has_include("Runtime/Engine/Classes/GameFramework/CharacterMovementComponent.h")
#include "Runtime/Engine/Classes/GameFramework/CharacterMovementComponent.h"
#elif __has_include("Engine/Source/Runtime/Engine/Classes/GameFramework/CharacterMovementComponent.h")
#include "Engine/Source/Runtime/Engine/Classes/GameFramework/CharacterMovementComponent.h"
#else
#error "CharacterMovementComponent.h not found. Add Unreal Engine's Engine/Source/Runtime/Engine/Classes directory to the compiler include path."
#endif

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
    SetActorRotation(FMath::RInterpTo(GetActorRotation(), DesiredDir.Rotation(), DeltaTime, 15.0f));

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
}
