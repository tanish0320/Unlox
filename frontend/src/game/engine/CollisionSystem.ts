import { ClassroomDef, Position } from "../types";

export class CollisionSystem {
  static isSolid(room: ClassroomDef, x: number, y: number): boolean {
    const roundedX = Math.round(x);
    const roundedY = Math.round(y);

    // 1. Boundary bounds check
    if (
      roundedX < 0 ||
      roundedX >= room.gridWidth ||
      roundedY < 0 ||
      roundedY >= room.gridHeight
    ) {
      return true;
    }

    // 2. Room wall rects check
    for (const wall of room.walls) {
      if (
        roundedX >= wall.x &&
        roundedX < wall.x + wall.width &&
        roundedY >= wall.y &&
        roundedY < wall.y + wall.height
      ) {
        return true;
      }
    }

    // 3. Furniture collision check
    for (const item of room.furniture) {
      // Chairs and small rugs are walkable, other items are solid
      if (item.type === "chair") continue;

      if (
        roundedX >= item.x &&
        roundedX < item.x + item.width &&
        roundedY >= item.y &&
        roundedY < item.y + item.height
      ) {
        return true;
      }
    }

    // 4. Teacher NPC collision
    if (room.teacher) {
      const tx = Math.round(room.teacher.position.x);
      const ty = Math.round(room.teacher.position.y);
      if (roundedX === tx && roundedY === ty) {
        return true;
      }
    }

    return false;
  }

  static checkDoor(room: ClassroomDef, pos: Position) {
    const rx = Math.round(pos.x);
    const ry = Math.round(pos.y);

    for (const door of room.doors) {
      const { triggerArea } = door;
      if (
        rx >= triggerArea.x &&
        rx < triggerArea.x + triggerArea.width &&
        ry >= triggerArea.y &&
        ry < triggerArea.y + triggerArea.height
      ) {
        return door;
      }
    }
    return null;
  }

  static isNearTeacher(room: ClassroomDef, pos: Position): boolean {
    if (!room.teacher) return false;
    const dx = pos.x - room.teacher.position.x;
    const dy = pos.y - room.teacher.position.y;
    const distanceSq = dx * dx + dy * dy;
    // Within ~1.8 tiles distance
    return distanceSq <= 3.6;
  }
}
