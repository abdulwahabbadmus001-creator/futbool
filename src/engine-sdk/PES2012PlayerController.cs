// ============================================================================
// PES2012PlayerController.cs — Unity C# Gameplay & AI Navigation Controller
// Replicates Pro Evolution Soccer 2012 (Winning Eleven 2012) mechanics:
//  1) 8-Way & 360-Degree Dribbling with a "Knock-On" Sprint Button that pushes
//     the ball further ahead, plus snappy 45-degree planted-pivot cuts.
//  2) Off-the-Ball Teammate AI that makes diagonal overlapping runs into open
//     space when the ball carrier faces forward.
//  3) Defensive Jockeying State where the defender strafes facing the ball
//     carrier while maintaining a fixed contain distance (~2.8m).
// ============================================================================
using UnityEngine;

public class PES2012PlayerController : MonoBehaviour
{
    public enum PlayerRoleState
    {
        BallCarrier,
        OffBallTeammate,
        DefensiveJockey
    }

    [Header("Role & Scene References")]
    public PlayerRoleState currentState = PlayerRoleState.BallCarrier;
    public Rigidbody playerRb;
    public Rigidbody ballRb;
    public Transform ballCarrier;
    public Animator characterAnimator;
    public bool use8WayDigitalDribble = false; // Toggle 8-way D-Pad vs 360-degree analog

    [Header("1. Dribbling, 45° Pivot Cuts & Knock-On Sprint")]
    public float baseDribbleSpeed = 6.4f;
    public float sprintSpeed = 8.9f;
    public float closeControlTapForce = 4.2f;
    public float knockOnSprintImpulse = 11.8f;
    public float dribbleTouchCadence = 0.22f;
    public float directionalCutSnapSpeed = 16.0f;

    [Header("2. Off-the-Ball Diagonal Overlapping Run AI")]
    public float forwardFacingDotThreshold = 0.35f;
    public float diagonalOverlapAngleDeg = 32.0f;
    public float overlapSprintSpeed = 8.6f;

    [Header("3. Defensive Jockeying (Contain Strafe)")]
    public float jockeyContainDistance = 2.8f;
    public float jockeyStrafeSpeed = 4.8f;

    private float nextTouchTimer = 0f;
    private Vector3 lastMoveDir = Vector3.forward;

    private void FixedUpdate()
    {
        float dt = Time.fixedDeltaTime;

        switch (currentState)
        {
            case PlayerRoleState.BallCarrier:
                UpdateDribblingAndKnockOn(dt);
                break;

            case PlayerRoleState.OffBallTeammate:
                UpdateDiagonalOverlappingRunAI(dt);
                break;

            case PlayerRoleState.DefensiveJockey:
                UpdateDefensiveJockeyState(dt);
                break;
        }
    }

    // ------------------------------------------------------------------------
    // 1. 8-WAY & 360-DEGREE DRIBBLING WITH "KNOCK-ON" SPRINT BUTTON
    // ------------------------------------------------------------------------
    private void UpdateDribblingAndKnockOn(float dt)
    {
        Vector2 rawInput = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
        bool isSprinting = Input.GetKey(KeyCode.LeftShift) || Input.GetButton("Sprint_R1");
        bool knockOnPressed = Input.GetKeyDown(KeyCode.E) || Input.GetButtonDown("KnockOn_DoubleR1");

        if (rawInput.sqrMagnitude < 0.04f)
        {
            if (characterAnimator != null) characterAnimator.SetFloat("Speed", 0f);
            return;
        }

        // Quantize to 8-way (45-degree increments) or smooth 360-degree analog angle
        float angleRad = Mathf.Atan2(rawInput.x, rawInput.y);
        if (use8WayDigitalDribble)
        {
            float step = Mathf.PI / 4f; // 45-degree directional snap
            angleRad = Mathf.Round(angleRad / step) * step;
        }

        Vector3 moveDir = new Vector3(Mathf.Sin(angleRad), 0f, Mathf.Cos(angleRad)).normalized;

        // Sharp, snappy 45-degree directional cut with planted pivot foot
        float cutAngle = Vector3.Angle(lastMoveDir, moveDir);
        bool isSharpCut = cutAngle >= 40f;
        float turnRate = isSharpCut ? directionalCutSnapSpeed * 1.45f : directionalCutSnapSpeed;

        transform.rotation = Quaternion.Slerp(
            transform.rotation,
            Quaternion.LookRotation(moveDir),
            turnRate * dt
        );
        lastMoveDir = moveDir;

        float targetSpeed = isSprinting ? sprintSpeed : baseDribbleSpeed;
        playerRb.linearVelocity = new Vector3(
            moveDir.x * targetSpeed,
            playerRb.linearVelocity.y,
            moveDir.z * targetSpeed
        );

        if (characterAnimator != null)
        {
            characterAnimator.SetFloat("Speed", targetSpeed);
            characterAnimator.SetBool("PlantedPivotCut45", isSharpCut);
        }

        // Quick rhythmic foot taps & "Knock-On" sprint ball push further ahead
        nextTouchTimer -= dt;
        if (ballRb != null && Vector3.Distance(transform.position, ballRb.position) < 1.35f)
        {
            if (knockOnPressed || nextTouchTimer <= 0f)
            {
                float pushForce = knockOnPressed
                    ? knockOnSprintImpulse
                    : (isSprinting ? closeControlTapForce * 1.55f : closeControlTapForce);

                Vector3 ballVel = moveDir * pushForce;
                ballRb.linearVelocity = new Vector3(ballVel.x, ballRb.linearVelocity.y, ballVel.z);
                nextTouchTimer = knockOnPressed ? 0.42f : dribbleTouchCadence;
            }
        }
    }

    // ------------------------------------------------------------------------
    // 2. OFF-THE-BALL TEAMMATE AI: DIAGONAL OVERLAPPING RUNS INTO OPEN SPACE
    // ------------------------------------------------------------------------
    private void UpdateDiagonalOverlappingRunAI(float dt)
    {
        if (ballCarrier == null) return;

        Vector3 attackAxis = Vector3.forward; // +Z attacking goal direction
        float carrierFacingForwardDot = Vector3.Dot(ballCarrier.forward, attackAxis);

        // When the ball carrier faces forward, trigger a diagonal overlapping run into open space
        if (carrierFacingForwardDot > forwardFacingDotThreshold)
        {
            float flankSign = Mathf.Sign(transform.position.x - ballCarrier.position.x);
            if (Mathf.Abs(flankSign) < 0.1f) flankSign = 1f;

            Quaternion diagRotation = Quaternion.Euler(0f, flankSign * diagonalOverlapAngleDeg, 0f);
            Vector3 diagonalOverlapDir = (diagRotation * attackAxis).normalized;

            transform.rotation = Quaternion.Slerp(
                transform.rotation,
                Quaternion.LookRotation(diagonalOverlapDir),
                10f * dt
            );

            playerRb.linearVelocity = new Vector3(
                diagonalOverlapDir.x * overlapSprintSpeed,
                playerRb.linearVelocity.y,
                diagonalOverlapDir.z * overlapSprintSpeed
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
        float dist = toCarrier.magnitude;
        Vector3 dirToCarrier = toCarrier.normalized;

        // Lock defender orientation to face the ball carrier at all times
        transform.rotation = Quaternion.Slerp(
            transform.rotation,
            Quaternion.LookRotation(dirToCarrier),
            18f * dt
        );

        // Maintain fixed contain distance (~2.8m) while strafing laterally
        float radialError = dist - jockeyContainDistance;
        float lateralInput = Input.GetAxisRaw("Horizontal");
        Vector3 rightStrafeAxis = Vector3.Cross(Vector3.up, dirToCarrier);

        Vector3 radialCorrection = dirToCarrier * Mathf.Clamp(radialError * 3.2f, -jockeyStrafeSpeed, jockeyStrafeSpeed);
        Vector3 lateralStrafe = rightStrafeAxis * (lateralInput * jockeyStrafeSpeed);
        Vector3 jockeyVelocity = radialCorrection + lateralStrafe;

        playerRb.linearVelocity = new Vector3(
            jockeyVelocity.x,
            playerRb.linearVelocity.y,
            jockeyVelocity.z
        );
    }
}
