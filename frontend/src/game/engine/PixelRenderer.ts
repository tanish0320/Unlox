import { ClassroomDef, Direction, Position, TeacherDef } from "../types";
import { CollisionSystem } from "./CollisionSystem";

export const TILE_SIZE = 32;

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  room: ClassroomDef;
  playerPos: Position;
  playerDirection: Direction;
  isMoving: boolean;
  walkFrame: number;
  animTick: number;
  isNearTeacher: boolean;
}

export class PixelRenderer {
  /**
   * Main render function called inside requestAnimationFrame
   */
  static render(rc: RenderContext) {
    const { ctx, canvasWidth, canvasHeight, room, playerPos } = rc;

    // Enable crisp pixel-art scaling
    ctx.imageSmoothingEnabled = false;

    // Fill background
    ctx.fillStyle = "#0D111A";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Calculate camera offset to center player on screen
    const roomPxW = room.gridWidth * TILE_SIZE;
    const roomPxH = room.gridHeight * TILE_SIZE;

    // Center viewport
    const targetCamX = playerPos.x * TILE_SIZE - canvasWidth / 2 + TILE_SIZE / 2;
    const targetCamY = playerPos.y * TILE_SIZE - canvasHeight / 2 + TILE_SIZE / 2;

    // Clamp camera within room boundaries (or center if room is smaller than canvas)
    let camX = 0;
    if (roomPxW > canvasWidth) {
      camX = Math.max(0, Math.min(roomPxW - canvasWidth, targetCamX));
    } else {
      camX = (roomPxW - canvasWidth) / 2;
    }

    let camY = 0;
    if (roomPxH > canvasHeight) {
      camY = Math.max(0, Math.min(roomPxH - canvasHeight, targetCamY));
    } else {
      camY = (roomPxH - canvasHeight) / 2;
    }

    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));

    // 1. Draw Floor
    this.drawFloor(ctx, room);

    // 2. Draw Walls & Exterior
    this.drawWalls(ctx, room);

    // 3. Draw Doors & Signs
    this.drawDoors(ctx, room, rc.animTick);

    // 4. Draw Furniture (Background layer: chalkboard, wall items)
    this.drawWallFurniture(ctx, room);

    // 5. Draw Floor Furniture (desks, computers, benches)
    this.drawFloorFurniture(ctx, room, rc.animTick);

    // 6. Draw Teacher NPC
    if (room.teacher) {
      this.drawTeacher(ctx, room.teacher, rc.animTick);
    }

    // 7. Draw Student Avatar
    this.drawPlayer(
      ctx,
      playerPos.x * TILE_SIZE,
      playerPos.y * TILE_SIZE,
      rc.playerDirection,
      rc.isMoving,
      rc.walkFrame
    );

    // 8. Draw Interaction Prompt if close to teacher
    if (rc.isNearTeacher && room.teacher) {
      this.drawInteractionPrompt(ctx, room.teacher, rc.animTick);
    }

    // 9. Developer-Only Collision Debug Mode (enabled via ?debugCollisions=1)
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugCollisions") === "1") {
      this.drawCollisionDebug(ctx, rc);
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // COLLISION & NAVIGATION DEBUG OVERLAY
  // -------------------------------------------------------------
  private static drawCollisionDebug(ctx: CanvasRenderingContext2D, rc: RenderContext) {
    const { room, playerPos } = rc;

    // 1. Draw Wall Collision Rectangles (Red)
    for (const wall of room.walls) {
      const wx = wall.x * TILE_SIZE;
      const wy = wall.y * TILE_SIZE;
      const ww = wall.width * TILE_SIZE;
      const wh = wall.height * TILE_SIZE;

      ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
      ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wx, wy, ww, wh);

      ctx.fillStyle = "#FEE2E2";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`WALL [${wall.width}x${wall.height}]`, wx + 4, wy + 12);
    }

    // 2. Draw Furniture Colliders (Orange)
    for (const f of room.furniture) {
      if (f.type === "chair") continue; // walkable
      const fx = f.x * TILE_SIZE;
      const fy = f.y * TILE_SIZE;
      const fw = f.width * TILE_SIZE;
      const fh = f.height * TILE_SIZE;

      ctx.fillStyle = "rgba(249, 115, 22, 0.45)";
      ctx.fillRect(fx, fy, fw, fh);
      ctx.strokeStyle = "#F97316";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(fx, fy, fw, fh);

      ctx.fillStyle = "#FFEDD5";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${f.id}`, fx + 4, fy + 12);
    }

    // 3. Draw Door Transition Zones (Yellow) & Destination Spawns (Cyan)
    for (const d of room.doors) {
      const dx = d.triggerArea.x * TILE_SIZE;
      const dy = d.triggerArea.y * TILE_SIZE;
      const dw = d.triggerArea.width * TILE_SIZE;
      const dh = d.triggerArea.height * TILE_SIZE;

      ctx.fillStyle = "rgba(234, 179, 8, 0.5)";
      ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = "#EAB308";
      ctx.lineWidth = 2;
      ctx.strokeRect(dx, dy, dw, dh);

      ctx.fillStyle = "#FEF08A";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`DOOR ➔ ${d.targetRoom}`, dx + dw / 2, dy + dh / 2 + 3);

      // Draw destination spawn marker
      const sx = d.targetPosition.x * TILE_SIZE;
      const sy = d.targetPosition.y * TILE_SIZE;
      ctx.strokeStyle = "#06B6D4";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);
      ctx.beginPath();
      ctx.arc(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#06B6D4";
      ctx.fill();
    }

    // 4. Draw Teacher Proximity Zone (Purple)
    if (room.teacher) {
      const tx = (room.teacher.position.x + 0.5) * TILE_SIZE;
      const ty = (room.teacher.position.y + 0.5) * TILE_SIZE;
      ctx.beginPath();
      ctx.arc(tx, ty, 2.2 * TILE_SIZE, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
      ctx.fill();
      ctx.strokeStyle = "#A855F7";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#E9D5FF";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("INTERACT ZONE (2.2t)", tx, ty - 2.2 * TILE_SIZE - 4);
    }

    // 5. Draw Player Feet Hitbox (Green / Red if colliding)
    const pBox = CollisionSystem.getPlayerHitbox(playerPos);
    const px = pBox.x * TILE_SIZE;
    const py = pBox.y * TILE_SIZE;
    const pw = pBox.width * TILE_SIZE;
    const ph = pBox.height * TILE_SIZE;

    const isColliding = CollisionSystem.isSolid(room, playerPos.x, playerPos.y);
    ctx.fillStyle = isColliding ? "rgba(239, 68, 68, 0.8)" : "rgba(34, 197, 94, 0.75)";
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = isColliding ? "#EF4444" : "#22C55E";
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`(${playerPos.x.toFixed(2)}, ${playerPos.y.toFixed(2)})`, px + pw / 2, py - 4);
  }

  // -------------------------------------------------------------
  // FLOOR RENDERING
  // -------------------------------------------------------------
  private static drawFloor(ctx: CanvasRenderingContext2D, room: ClassroomDef) {
    const { gridWidth, gridHeight, floorTheme } = room;

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (floorTheme === "wood") {
          // Warm wooden floorboards
          const isAlt = (x + y * 2) % 3 === 0;
          ctx.fillStyle = isAlt ? "#C2854A" : "#B57A42";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          // Plank border lines
          ctx.strokeStyle = "#9E6430";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE, TILE_SIZE);
        } else if (floorTheme === "tile_check") {
          // Ivory & Sage checkered tiles
          const isCheck = (x + y) % 2 === 0;
          ctx.fillStyle = isCheck ? "#F4EFE6" : "#E2DDD2";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = "#CBC4B5";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE, TILE_SIZE);
        } else if (floorTheme === "stone") {
          // Observatory flagstones
          const isDark = (x * 3 + y * 7) % 5 === 0;
          ctx.fillStyle = isDark ? "#3A3E4E" : "#44495C";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = "#2A2D39";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE, TILE_SIZE);
        } else if (floorTheme === "carpet") {
          // Royal library carpet
          const isBorder = x === 1 || x === gridWidth - 2 || y === 2 || y === gridHeight - 2;
          ctx.fillStyle = isBorder ? "#991B1B" : "#7F1D1D";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          if (isBorder) {
            ctx.fillStyle = "#F59E0B";
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, 2);
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // WALLS RENDERING
  // -------------------------------------------------------------
  private static drawWalls(ctx: CanvasRenderingContext2D, room: ClassroomDef) {
    const { walls } = room;

    for (const w of walls) {
      const px = w.x * TILE_SIZE;
      const py = w.y * TILE_SIZE;
      const pw = w.width * TILE_SIZE;
      const ph = w.height * TILE_SIZE;

      // Base wall color (rich stone/cream)
      ctx.fillStyle = "#2D3748";
      ctx.fillRect(px, py, pw, ph);

      // Top wall moulding trim
      ctx.fillStyle = "#4A5568";
      ctx.fillRect(px, py, pw, 8);

      // Wainscoting base trim
      ctx.fillStyle = "#1A202C";
      ctx.fillRect(px, py + ph - 8, pw, 8);

      // Shadow cast from wall onto floor
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.fillRect(px, py + ph, pw, 6);
    }
  }

  // -------------------------------------------------------------
  // DOORS & PORTALS
  // -------------------------------------------------------------
  private static drawDoors(ctx: CanvasRenderingContext2D, room: ClassroomDef, animTick: number) {
    for (const d of room.doors) {
      const px = d.triggerArea.x * TILE_SIZE;
      const py = d.triggerArea.y * TILE_SIZE;
      const pw = d.triggerArea.width * TILE_SIZE;
      const ph = d.triggerArea.height * TILE_SIZE;

      // Illuminated Doorway
      const pulse = (Math.sin(animTick * 0.08) + 1) * 0.5;
      ctx.fillStyle = `rgba(245, 158, 11, ${0.15 + pulse * 0.15})`;
      ctx.fillRect(px, py, pw, ph);

      // Door Frame
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

      // Door Arch Label
      if (d.label) {
        ctx.fillStyle = "#1E293B";
        ctx.fillRect(px - 10, py - 18, pw + 20, 16);
        ctx.strokeStyle = "#F59E0B";
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 10, py - 18, pw + 20, 16);

        ctx.fillStyle = "#F8FAFC";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(d.label, px + pw / 2, py - 7);
      }
    }
  }

  // -------------------------------------------------------------
  // WALL FURNITURE (Chalkboards, Bookshelves, Notice boards)
  // -------------------------------------------------------------
  private static drawWallFurniture(ctx: CanvasRenderingContext2D, room: ClassroomDef) {
    for (const f of room.furniture) {
      if (["chalkboard", "bookshelf", "notice_board", "trophy_case"].includes(f.type)) {
        const px = f.x * TILE_SIZE;
        const py = f.y * TILE_SIZE;
        const pw = f.width * TILE_SIZE;
        const ph = f.height * TILE_SIZE;

        if (f.type === "chalkboard") {
          // Pine wood frame
          ctx.fillStyle = "#92400E";
          ctx.fillRect(px, py, pw, ph);
          // Dark green chalkboard slate
          ctx.fillStyle = "#064E3B";
          ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);
          // White chalk text / equations
          ctx.fillStyle = "#FEF3C7";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.fillText(f.label || "E = mc²", px + pw / 2, py + ph / 2 + 4);
        } else if (f.type === "bookshelf") {
          // Shelf frame
          ctx.fillStyle = "#78350F";
          ctx.fillRect(px, py, pw, ph);
          // Book spines
          const bookColors = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"];
          for (let row = 0; row < ph / 16; row++) {
            const shelfY = py + 4 + row * 16;
            for (let bx = px + 4; bx < px + pw - 6; bx += 7) {
              const color = bookColors[Math.abs(Math.sin(bx * 13 + row)) * bookColors.length | 0];
              ctx.fillStyle = color;
              ctx.fillRect(bx, shelfY, 5, 12);
            }
          }
        } else if (f.type === "notice_board") {
          // Cork board
          ctx.fillStyle = "#D97706";
          ctx.fillRect(px, py, pw, ph);
          ctx.fillStyle = "#B45309";
          ctx.fillRect(px + 3, py + 3, pw - 6, ph - 6);
          // Pinned papers
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(px + 8, py + 6, 18, 18);
          ctx.fillRect(px + 32, py + 8, 22, 16);
          ctx.fillStyle = "#EF4444";
          ctx.fillRect(px + 16, py + 4, 3, 3); // pin
        } else if (f.type === "trophy_case") {
          // Golden trophy display
          ctx.fillStyle = "#1E293B";
          ctx.fillRect(px, py, pw, ph);
          ctx.strokeStyle = "#F59E0B";
          ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);
          ctx.fillStyle = "#F59E0B";
          ctx.font = "16px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("🏆 🌟 🥇", px + pw / 2, py + ph / 2 + 6);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // FLOOR FURNITURE (Desks, Computers, Lab Benches, Telescopes, Plants)
  // -------------------------------------------------------------
  private static drawFloorFurniture(
    ctx: CanvasRenderingContext2D,
    room: ClassroomDef,
    animTick: number
  ) {
    for (const f of room.furniture) {
      if (!["chalkboard", "bookshelf", "notice_board", "trophy_case"].includes(f.type)) {
        const px = f.x * TILE_SIZE;
        const py = f.y * TILE_SIZE;
        const pw = f.width * TILE_SIZE;
        const ph = f.height * TILE_SIZE;

        if (f.type === "desk") {
          // Wooden desk
          ctx.fillStyle = "#A16207";
          ctx.fillRect(px, py, pw, ph);
          ctx.fillStyle = "#CA8A04";
          ctx.fillRect(px + 2, py + 2, pw - 4, 6);
          // Notebook / paper
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(px + 6, py + 10, 14, 12);
          ctx.fillStyle = "#2563EB";
          ctx.fillRect(px + 8, py + 12, 10, 2);
        } else if (f.type === "computer") {
          // Desk
          ctx.fillStyle = "#475569";
          ctx.fillRect(px, py, pw, ph);
          // Monitor
          ctx.fillStyle = "#0F172A";
          ctx.fillRect(px + pw / 2 - 12, py + 4, 24, 16);
          // Screen with green glowing cursor
          ctx.fillStyle = "#22C55E";
          const blink = animTick % 30 < 15;
          ctx.fillRect(px + pw / 2 - 9, py + 7, blink ? 6 : 4, 10);
          // Keyboard
          ctx.fillStyle = "#94A3B8";
          ctx.fillRect(px + pw / 2 - 10, py + 22, 20, 6);
        } else if (f.type === "lab_bench") {
          // Lab slate counter
          ctx.fillStyle = "#334155";
          ctx.fillRect(px, py, pw, ph);
          ctx.fillStyle = "#64748B";
          ctx.fillRect(px + 2, py + 2, pw - 4, 4);
          // Flasks & glassware
          ctx.fillStyle = "#06B6D4"; // Cyan flask
          ctx.fillRect(px + 8, py + 10, 10, 14);
          ctx.fillStyle = "#10B981"; // Emerald flask
          ctx.fillRect(px + pw - 18, py + 10, 10, 14);
        } else if (f.type === "telescope") {
          // Brass telescope
          ctx.fillStyle = "#F59E0B";
          ctx.fillRect(px + 10, py + 6, 24, 8);
          ctx.fillStyle = "#78350F"; // Tripod legs
          ctx.fillRect(px + 18, py + 14, 4, 28);
          ctx.fillRect(px + 10, py + 26, 4, 18);
          ctx.fillRect(px + 26, py + 26, 4, 18);
        } else if (f.type === "globe") {
          // Stand
          ctx.fillStyle = "#78350F";
          ctx.fillRect(px + pw / 2 - 3, py + ph / 2, 6, ph / 2);
          // Rotating ocean sphere
          ctx.fillStyle = "#0284C7";
          ctx.beginPath();
          ctx.arc(px + pw / 2, py + 14, 12, 0, Math.PI * 2);
          ctx.fill();
          // Landmass green
          ctx.fillStyle = "#22C55E";
          ctx.beginPath();
          ctx.arc(px + pw / 2 - 2, py + 12, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (f.type === "plant") {
          // Terracotta pot
          ctx.fillStyle = "#C2410C";
          ctx.fillRect(px + 6, py + ph - 14, pw - 12, 14);
          // Leaves
          ctx.fillStyle = "#16A34A";
          ctx.beginPath();
          ctx.arc(px + pw / 2, py + 12, 12, 0, Math.PI * 2);
          ctx.fill();
        } else if (f.type === "cabinet") {
          ctx.fillStyle = "#1E293B";
          ctx.fillRect(px, py, pw, ph);
          ctx.fillStyle = "#334155";
          ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
          // Handles
          ctx.fillStyle = "#F59E0B";
          ctx.fillRect(px + 6, py + ph / 2, 4, 6);
          ctx.fillRect(px + pw - 10, py + ph / 2, 4, 6);
        } else if (f.type === "chair") {
          ctx.fillStyle = "#94A3B8";
          ctx.fillRect(px + 6, py + 8, pw - 12, ph - 16);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // TEACHER NPC RENDERING
  // -------------------------------------------------------------
  private static drawTeacher(ctx: CanvasRenderingContext2D, teacher: TeacherDef, animTick: number) {
    const px = teacher.position.x * TILE_SIZE;
    const py = teacher.position.y * TILE_SIZE;

    // Subtle breathing / idle sway
    const bob = Math.sin(animTick * 0.06) * 1.5;

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 30, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body / Outfit
    ctx.fillStyle = teacher.color;
    ctx.fillRect(px + 8, py + 14 + bob, 16, 16);

    // Head / Face
    ctx.fillStyle = "#FCD34D";
    ctx.fillRect(px + 9, py + 4 + bob, 14, 12);

    // Hair
    ctx.fillStyle = "#3E2723";
    ctx.fillRect(px + 7, py + 2 + bob, 18, 6);

    // Eyes
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(px + 11, py + 9 + bob, 2, 3);
    ctx.fillRect(px + 19, py + 9 + bob, 2, 3);

    // Subject Accessory based on teacher
    if (teacher.subject === "maths") {
      // Golden spectacles
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 10, py + 8 + bob, 4, 4);
      ctx.strokeRect(px + 18, py + 8 + bob, 4, 4);
    } else if (teacher.subject === "cs") {
      // Headset
      ctx.fillStyle = "#0284C7";
      ctx.fillRect(px + 6, py + 6 + bob, 3, 6);
      ctx.fillRect(px + 23, py + 6 + bob, 3, 6);
    } else if (teacher.subject === "physics") {
      // White cravat
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(px + 14, py + 15 + bob, 4, 5);
    } else if (teacher.subject === "chemistry") {
      // Safety goggles on forehead
      ctx.fillStyle = "#06B6D4";
      ctx.fillRect(px + 10, py + 4 + bob, 12, 3);
    } else if (teacher.subject === "biology") {
      // Flower in hair
      ctx.fillStyle = "#EC4899";
      ctx.fillRect(px + 21, py + 3 + bob, 4, 4);
    } else if (teacher.subject === "social") {
      // Explorer scarf
      ctx.fillStyle = "#D97706";
      ctx.fillRect(px + 11, py + 14 + bob, 10, 4);
    }

    // Teacher Nametag
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.fillRect(px - 14, py - 18, 60, 14);
    ctx.strokeStyle = teacher.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 14, py - 18, 60, 14);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(teacher.name, px + 16, py - 8);
  }

  // -------------------------------------------------------------
  // STUDENT AVATAR RENDERING
  // -------------------------------------------------------------
  private static drawPlayer(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    direction: Direction,
    isMoving: boolean,
    walkFrame: number
  ) {
    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 30, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Walking animation cycle offset
    const legOffset = isMoving ? Math.sin(walkFrame * 0.4) * 3 : 0;

    // Legs / Pants (Dark denim)
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(px + 10, py + 22 + (legOffset > 0 ? legOffset : 0), 4, 8);
    ctx.fillRect(px + 18, py + 22 - (legOffset < 0 ? legOffset : 0), 4, 8);

    // Torso / Jacket (Blu Teal `#0D9488`)
    ctx.fillStyle = "#0D9488";
    ctx.fillRect(px + 8, py + 13, 16, 11);

    // Teal Backpack (Behind or on sides depending on direction)
    if (direction === "up" || direction === "left" || direction === "right") {
      ctx.fillStyle = "#E59866";
      ctx.fillRect(direction === "left" ? px + 18 : px + 6, py + 14, 8, 9);
    }

    // Head / Face
    ctx.fillStyle = "#FED7AA";
    ctx.fillRect(px + 9, py + 4, 14, 11);

    // Hair (Chestnut brown)
    ctx.fillStyle = "#451A03";
    ctx.fillRect(px + 8, py + 2, 16, 5);

    // Eyes (according to direction)
    if (direction === "down") {
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(px + 11, py + 9, 2, 3);
      ctx.fillRect(px + 19, py + 9, 2, 3);
    } else if (direction === "left") {
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(px + 9, py + 9, 2, 3);
    } else if (direction === "right") {
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(px + 21, py + 9, 2, 3);
    }
  }

  // -------------------------------------------------------------
  // FLOATING INTERACTION PROMPT
  // -------------------------------------------------------------
  private static drawInteractionPrompt(
    ctx: CanvasRenderingContext2D,
    teacher: TeacherDef,
    animTick: number
  ) {
    const px = teacher.position.x * TILE_SIZE;
    const py = teacher.position.y * TILE_SIZE;

    const bounce = Math.sin(animTick * 0.12) * 3;

    // Glowing Pill Banner
    const bannerW = 140;
    const bannerH = 22;
    const bx = px + 16 - bannerW / 2;
    const by = py - 46 + bounce;

    ctx.fillStyle = "#234E3C";
    ctx.fillRect(bx, by, bannerW, bannerH);
    ctx.strokeStyle = "#E59866";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bannerW, bannerH);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`[E] Speak with ${teacher.name}`, px + 16, by + 14);

    // Small pointing triangle
    ctx.fillStyle = "#234E3C";
    ctx.beginPath();
    ctx.moveTo(px + 12, by + bannerH);
    ctx.lineTo(px + 20, by + bannerH);
    ctx.lineTo(px + 16, by + bannerH + 5);
    ctx.closePath();
    ctx.fill();
  }
}
