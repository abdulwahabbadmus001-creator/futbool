import { KeyBindings } from '../../types/football';
import { UserMatchInput } from '../engine/Simulation';

export interface TouchInputState {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  shortPass: boolean;
  throughPass: boolean;
  loftedPass: boolean;
  shoot: boolean;
  switchPlayer: boolean;
  tackle: boolean;
  tacticalMod: boolean;
  feint: boolean;
  roulette: boolean;
}

export class InputManager {
  private heldKeys = new Set<string>();
  private justPressed = new Set<string>();
  private justReleased = new Set<string>();
  private bindings: KeyBindings;
  private onPauseCallback: (() => void) | null = null;

  public touchState: TouchInputState = {
    moveX: 0,
    moveZ: 0,
    sprint: false,
    shortPass: false,
    throughPass: false,
    loftedPass: false,
    shoot: false,
    switchPlayer: false,
    tackle: false,
    tacticalMod: false,
    feint: false,
    roulette: false,
  };

  private prevTouchShoot = false;
  private prevTouchPass = false;
  private prevTouchThrough = false;
  private prevTouchLoft = false;
  private prevTouchSwitch = false;
  private prevTouchTackle = false;
  private prevTouchTactical = false;
  private prevTouchFeint = false;
  private prevTouchRoulette = false;

  private prevPadButtons: boolean[] = [];

  constructor(bindings: KeyBindings) {
    this.bindings = { ...bindings };
  }

  public updateBindings(bindings: KeyBindings): void {
    this.bindings = { ...bindings };
  }

  public setPauseHandler(cb: (() => void) | null): void {
    this.onPauseCallback = cb;
  }

  public attach(): () => void {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === this.bindings.pause || code === 'Escape') {
        if (!e.repeat && this.onPauseCallback) {
          this.onPauseCallback();
        }
        return;
      }

      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code) &&
        document.body.dataset.state === 'playing'
      ) {
        e.preventDefault();
      }

      if (!this.heldKeys.has(code)) {
        this.justPressed.add(code);
      }
      this.heldKeys.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      this.heldKeys.delete(code);
      this.justReleased.add(code);
    };

    const onBlur = () => {
      this.clearAll();
    };

    const onVisibility = () => {
      if (document.hidden) this.clearAll();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }

  public clearAll(): void {
    this.heldKeys.clear();
    this.justPressed.clear();
    this.justReleased.clear();
    this.touchState.moveX = 0;
    this.touchState.moveZ = 0;
    this.touchState.sprint = false;
    this.touchState.shortPass = false;
    this.touchState.throughPass = false;
    this.touchState.loftedPass = false;
    this.touchState.shoot = false;
    this.touchState.switchPlayer = false;
    this.touchState.tackle = false;
    this.touchState.tacticalMod = false;
    this.touchState.feint = false;
    this.touchState.roulette = false;
    this.prevTouchShoot = false;
    this.prevTouchPass = false;
    this.prevTouchThrough = false;
    this.prevTouchLoft = false;
    this.prevTouchSwitch = false;
    this.prevTouchTackle = false;
    this.prevTouchTactical = false;
    this.prevTouchFeint = false;
    this.prevTouchRoulette = false;
  }

  public pollMatchInput(): UserMatchInput {
    let moveX = this.touchState.moveX;
    let moveZ = this.touchState.moveZ;

    if (this.heldKeys.has(this.bindings.moveUp) || this.heldKeys.has('ArrowUp')) moveZ -= 1;
    if (this.heldKeys.has(this.bindings.moveDown) || this.heldKeys.has('ArrowDown')) moveZ += 1;
    if (this.heldKeys.has(this.bindings.moveLeft) || this.heldKeys.has('ArrowLeft')) moveX -= 1;
    if (this.heldKeys.has(this.bindings.moveRight) || this.heldKeys.has('ArrowRight')) moveX += 1;

    let sprint = this.heldKeys.has(this.bindings.sprint) || this.heldKeys.has('ShiftRight') || this.touchState.sprint;
    let shortPassPressed = this.consumePressed(this.bindings.shortPass);
    let throughPassPressed = this.consumePressed(this.bindings.throughPass);
    let loftedPassPressed = this.consumePressed(this.bindings.loftedPass);
    let shootHeld = this.heldKeys.has(this.bindings.shoot) || this.touchState.shoot;
    let shootReleased = this.consumeReleased(this.bindings.shoot);
    let switchPlayerPressed = this.consumePressed(this.bindings.switchPlayer);
    let tacklePressed = this.consumePressed(this.bindings.tackle);
    let tacticalModPressed = this.consumePressed(this.bindings.tacticalMod);
    let tacticalModHeld = this.heldKeys.has(this.bindings.tacticalMod) || this.touchState.tacticalMod;
    let feintPressed = this.consumePressed(this.bindings.feint || 'KeyC');
    let roulettePressed = this.consumePressed(this.bindings.roulette || 'KeyV');

    // Touch edge triggers
    if (this.touchState.shortPass && !this.prevTouchPass) shortPassPressed = true;
    if (this.touchState.throughPass && !this.prevTouchThrough) throughPassPressed = true;
    if (this.touchState.loftedPass && !this.prevTouchLoft) loftedPassPressed = true;
    if (!this.touchState.shoot && this.prevTouchShoot) shootReleased = true;
    if (this.touchState.switchPlayer && !this.prevTouchSwitch) switchPlayerPressed = true;
    if (this.touchState.tackle && !this.prevTouchTackle) tacklePressed = true;
    if (this.touchState.tacticalMod && !this.prevTouchTactical) tacticalModPressed = true;
    if (this.touchState.feint && !this.prevTouchFeint) feintPressed = true;
    if (this.touchState.roulette && !this.prevTouchRoulette) roulettePressed = true;

    this.prevTouchPass = this.touchState.shortPass;
    this.prevTouchThrough = this.touchState.throughPass;
    this.prevTouchLoft = this.touchState.loftedPass;
    this.prevTouchShoot = this.touchState.shoot;
    this.prevTouchSwitch = this.touchState.switchPlayer;
    this.prevTouchTackle = this.touchState.tackle;
    this.prevTouchTactical = this.touchState.tacticalMod;
    this.prevTouchFeint = this.touchState.feint;
    this.prevTouchRoulette = this.touchState.roulette;

    // Gamepad API polling (Standard mapping: 0=A/Cross pass, 1=B/Circle loft, 2=X/Square shoot, 3=Y/Tri through, 4=LB switch, 5/7=RB/RT sprint)
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const pads = navigator.getGamepads();
      const pad = pads?.[0];
      if (pad) {
        if (Math.abs(pad.axes[0] ?? 0) > 0.18) moveX += pad.axes[0];
        if (Math.abs(pad.axes[1] ?? 0) > 0.18) moveZ += pad.axes[1];

        const btn = (idx: number) => Boolean(pad.buttons[idx]?.pressed);
        const edge = (idx: number) => btn(idx) && !this.prevPadButtons[idx];
        const rel = (idx: number) => !btn(idx) && Boolean(this.prevPadButtons[idx]);

        if (btn(5) || btn(7)) sprint = true;
        if (btn(6)) tacticalModHeld = true;
        if (edge(6)) tacticalModPressed = true;
        if (edge(0)) shortPassPressed = true;
        if (edge(3)) throughPassPressed = true;
        if (edge(1)) loftedPassPressed = true;
        if (btn(2)) shootHeld = true;
        if (rel(2)) shootReleased = true;
        if (edge(4)) switchPlayerPressed = true;
        if (edge(0) && !shootHeld) tacklePressed = tacklePressed || edge(2);

        this.prevPadButtons = pad.buttons.map((b) => b.pressed);
      }
    }

    // Clamp movement vector
    const len = Math.hypot(moveX, moveZ);
    if (len > 1) {
      moveX /= len;
      moveZ /= len;
    }

    this.justPressed.clear();
    this.justReleased.clear();

    return {
      moveX,
      moveZ,
      sprint,
      shortPassPressed,
      throughPassPressed,
      loftedPassPressed,
      shootHeld,
      shootReleased,
      switchPlayerPressed,
      tacklePressed,
      tacticalModPressed,
      tacticalModHeld,
      feintPressed,
      roulettePressed,
    };
  }

  private consumePressed(code: string): boolean {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  private consumeReleased(code: string): boolean {
    if (this.justReleased.has(code)) {
      this.justReleased.delete(code);
      return true;
    }
    return false;
  }
}
