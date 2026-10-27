import { Direction } from "../types";

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
}

export class InputManager {
  private keys: Record<string, boolean> = {};
  private onInteractCallbacks: (() => void)[] = [];
  private attachedElement: HTMLElement | Window | null = null;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  attach(element: HTMLElement | Window = window) {
    this.detach();
    this.attachedElement = element;
    element.addEventListener("keydown", this.handleKeyDown as EventListener, { passive: false });
    element.addEventListener("keyup", this.handleKeyUp as EventListener, { passive: false });
  }

  detach() {
    if (this.attachedElement) {
      this.attachedElement.removeEventListener("keydown", this.handleKeyDown as EventListener);
      this.attachedElement.removeEventListener("keyup", this.handleKeyUp as EventListener);
      this.attachedElement = null;
    }
    this.keys = {};
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Prevent default scroll behavior for arrow keys and space when playing
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", " "].includes(e.key) &&
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
    ) {
      e.preventDefault();
    }

    const key = e.key.toLowerCase();
    this.keys[key] = true;

    // Trigger interact on 'e', 'enter', or space press
    if (
      (key === "e" || key === "enter" || key === " ") &&
      !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
    ) {
      this.onInteractCallbacks.forEach((cb) => cb());
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    this.keys[key] = false;
  }

  onInteract(callback: () => void) {
    this.onInteractCallbacks.push(callback);
    return () => {
      this.onInteractCallbacks = this.onInteractCallbacks.filter((cb) => cb !== callback);
    };
  }

  getMovement(): { dx: number; dy: number; direction: Direction | null } {
    const up = Boolean(this.keys["arrowup"] || this.keys["w"]);
    const down = Boolean(this.keys["arrowdown"] || this.keys["s"]);
    const left = Boolean(this.keys["arrowleft"] || this.keys["a"]);
    const right = Boolean(this.keys["arrowright"] || this.keys["d"]);

    let dx = 0;
    let dy = 0;

    if (left) dx -= 1;
    if (right) dx += 1;
    if (up) dy -= 1;
    if (down) dy += 1;

    let direction: Direction | null = null;
    if (dy < 0) direction = "up";
    else if (dy > 0) direction = "down";
    else if (dx < 0) direction = "left";
    else if (dx > 0) direction = "right";

    return { dx, dy, direction };
  }

  destroy() {
    this.detach();
    this.onInteractCallbacks = [];
  }
}
