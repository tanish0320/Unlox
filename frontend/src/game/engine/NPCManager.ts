import { ClassroomDef, Direction, Position, RoomId } from "../types";
import { NPCDef, getRoomNPCs } from "../data/npcDefinitions";
import { CollisionSystem } from "./CollisionSystem";

export interface SpeechBubble {
  text: string;
  expiresAt: number;
}

export interface NPCState {
  def: NPCDef;
  currentPos: Position;
  direction: Direction;
  isMoving: boolean;
  walkFrame: number;
  pauseTimer: number;
  targetPos: Position | null;
  activeSpeechBubble: SpeechBubble | null;
}

export class NPCManager {
  private npcs: NPCState[] = [];
  private currentRoomId: RoomId = "corridor";

  initRoom(roomId: RoomId) {
    this.currentRoomId = roomId;
    const defs = getRoomNPCs(roomId);

    this.npcs = defs.map((def, idx) => ({
      def,
      currentPos: { ...def.position },
      direction: def.direction,
      isMoving: false,
      walkFrame: 0,
      pauseTimer: 1.0 + (idx * 0.8) % 3.0,
      targetPos: null,
      activeSpeechBubble: null,
    }));
  }

  getNPCs(): NPCState[] {
    return this.npcs;
  }

  update(dt: number, room: ClassroomDef, playerPos: Position) {
    const now = performance.now();

    for (const npc of this.npcs) {
      // 1. Expire speech bubbles
      if (npc.activeSpeechBubble && now > npc.activeSpeechBubble.expiresAt) {
        npc.activeSpeechBubble = null;
      }

      // 2. Only wandering NPCs change position
      if (npc.def.activity !== "wandering" || !npc.def.patrolBounds) {
        continue;
      }

      const bounds = npc.def.patrolBounds;

      if (npc.pauseTimer > 0) {
        npc.pauseTimer -= dt;
        // If player is close, face the player politely while paused
        const distToPlayer = Math.hypot(playerPos.x - npc.currentPos.x, playerPos.y - npc.currentPos.y);
        if (distToPlayer < 1.8) {
          const dx = playerPos.x - npc.currentPos.x;
          const dy = playerPos.y - npc.currentPos.y;
          npc.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        }
        continue;
      }

      // If idle and pause finished, choose a new patrol destination
      if (!npc.targetPos) {
        let chosen: Position | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const candX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
          const candY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);

          // Bounds & wall collision check
          if (CollisionSystem.isSolid(room, candX, candY)) continue;

          // Never block doorways: keep distance > 1.8 from any door trigger
          let nearDoor = false;
          for (const door of room.doors) {
            const doorCenterX = door.triggerArea.x + door.triggerArea.width / 2;
            const doorCenterY = door.triggerArea.y + door.triggerArea.height / 2;
            if (Math.hypot(candX - doorCenterX, candY - doorCenterY) < 2.0) {
              nearDoor = true;
              break;
            }
          }
          if (nearDoor) continue;

          // Keep distance from player
          if (Math.hypot(candX - playerPos.x, candY - playerPos.y) < 1.2) continue;

          chosen = { x: candX, y: candY };
          break;
        }

        if (chosen) {
          npc.targetPos = chosen;
          npc.isMoving = true;
        } else {
          npc.pauseTimer = 2.0;
        }
      }

      // Move toward target
      if (npc.targetPos) {
        const diffX = npc.targetPos.x - npc.currentPos.x;
        const diffY = npc.targetPos.y - npc.currentPos.y;
        const dist = Math.hypot(diffX, diffY);

        if (dist > 0.1) {
          const walkSpeed = 1.6 * dt; // Gentle ambient walking speed
          const stepX = (diffX / dist) * Math.min(dist, walkSpeed);
          const stepY = (diffY / dist) * Math.min(dist, walkSpeed);

          // Update facing direction
          if (Math.abs(diffX) > Math.abs(diffY)) {
            npc.direction = diffX > 0 ? "right" : "left";
          } else {
            npc.direction = diffY > 0 ? "down" : "up";
          }

          npc.currentPos.x += stepX;
          npc.currentPos.y += stepY;
          npc.walkFrame += dt * 8;
          npc.isMoving = true;
        } else {
          // Reached destination
          npc.currentPos = { ...npc.targetPos };
          npc.targetPos = null;
          npc.isMoving = false;
          npc.pauseTimer = 2.0 + Math.random() * 3.5;
        }
      }
    }
  }

  getNearNPC(pos: Position, radius = 2.0): NPCState | null {
    for (const npc of this.npcs) {
      const dist = Math.hypot(pos.x - npc.currentPos.x, pos.y - npc.currentPos.y);
      if (dist <= radius) {
        return npc;
      }
    }
    return null;
  }

  findClickedNPC(worldX: number, worldY: number, radius = 1.3): NPCState | null {
    for (const npc of this.npcs) {
      const dist = Math.hypot(worldX - npc.currentPos.x, worldY - npc.currentPos.y);
      if (dist <= radius) {
        return npc;
      }
    }
    return null;
  }

  interactWith(npc: NPCState, playerPos?: Position): string {
    // Face player
    if (playerPos) {
      const dx = playerPos.x - npc.currentPos.x;
      const dy = playerPos.y - npc.currentPos.y;
      npc.direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    }

    // Pick dialogue line
    const dialogueList = npc.def.dialogue;
    const lineIndex = Math.floor(Math.random() * dialogueList.length);
    const line = dialogueList[lineIndex] || "Hello there!";

    npc.activeSpeechBubble = {
      text: line,
      expiresAt: performance.now() + 4500, // 4.5 seconds display
    };

    return line;
  }
}
