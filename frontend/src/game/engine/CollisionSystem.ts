import { ClassroomDef, DoorDef, Position } from "../types";

export interface HitBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CollisionSystem {
  /**
   * Returns the player's physical feet collision box in grid tile units.
   * A realistic feet-based hitbox gives natural movement and lets the player
   * smoothly navigate aisles and doorway openings.
   */
  static getPlayerHitbox(pos: Position): HitBox {
    return {
      x: pos.x + 0.2,
      y: pos.y + 0.6,
      width: 0.6,
      height: 0.35,
    };
  }

  /**
   * Checks standard Axis-Aligned Bounding Box (AABB) intersection.
   */
  static boxesIntersect(a: HitBox, b: HitBox): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  /**
   * Checks if placing the player at tile position (x, y) would collide with:
   * 1. Room boundaries
   * 2. Wall rectangles (excluding doorway openings)
   * 3. Solid furniture (excluding chairs)
   * 4. Teacher NPC
   */
  static isSolid(room: ClassroomDef, x: number, y: number): boolean {
    const box = this.getPlayerHitbox({ x, y });

    // 1. Boundary bounds check
    if (
      box.x < 0 ||
      box.x + box.width > room.gridWidth ||
      box.y < 0 ||
      box.y + box.height > room.gridHeight
    ) {
      return true;
    }

    // 2. Room wall rects check
    for (const wall of room.walls) {
      if (this.boxesIntersect(box, wall)) {
        return true;
      }
    }

    // 3. Furniture collision check
    for (const item of room.furniture) {
      // Chairs and small rugs are walkable, other items are solid
      if (item.type === "chair") continue;

      if (this.boxesIntersect(box, item)) {
        return true;
      }
    }

    // 4. Teacher NPC collision
    if (room.teacher) {
      const teacherBox: HitBox = {
        x: room.teacher.position.x + 0.2,
        y: room.teacher.position.y + 0.2,
        width: 0.6,
        height: 0.7,
      };
      if (this.boxesIntersect(box, teacherBox)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if player has stepped onto a door transition trigger.
   * Uses both feet box intersection and center-point check for maximum reliability.
   */
  static checkDoor(room: ClassroomDef, pos: Position): DoorDef | null {
    const box = this.getPlayerHitbox(pos);
    const centerFeetX = pos.x + 0.5;
    const centerFeetY = pos.y + 0.75;

    for (const door of room.doors) {
      const { triggerArea } = door;

      // Check AABB overlap with feet
      if (this.boxesIntersect(box, triggerArea)) {
        return door;
      }

      // Also check center of feet point in trigger area
      if (
        centerFeetX >= triggerArea.x &&
        centerFeetX <= triggerArea.x + triggerArea.width &&
        centerFeetY >= triggerArea.y &&
        centerFeetY <= triggerArea.y + triggerArea.height
      ) {
        return door;
      }
    }

    return null;
  }

  /**
   * Proximity check to teacher NPC for dialogue trigger.
   */
  static isNearTeacher(room: ClassroomDef, pos: Position): boolean {
    if (!room.teacher) return false;
    const playerCenterX = pos.x + 0.5;
    const playerCenterY = pos.y + 0.5;
    const teacherCenterX = room.teacher.position.x + 0.5;
    const teacherCenterY = room.teacher.position.y + 0.5;
    const dx = playerCenterX - teacherCenterX;
    const dy = playerCenterY - teacherCenterY;
    const distance = Math.hypot(dx, dy);
    return distance <= 2.2;
  }
}

