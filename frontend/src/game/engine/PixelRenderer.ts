import { ClassroomDef, Direction, Position, TeacherDef, RoomId, DoorDef } from "../types";
import { CollisionSystem } from "./CollisionSystem";
import { NPCState } from "./NPCManager";

export const TILE_SIZE = 32;

export interface DoorPromptLayout {
  lines: string[];
  promptW: number;
  promptH: number;
  promptX: number;
  promptY: number;
  accentColor: string;
}

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
  npcs?: NPCState[];
  nearNPC?: NPCState | null;
}

export function getCameraZoom(
  roomId: RoomId,
  canvasWidth?: number,
  canvasHeight?: number
): number {
  if (!canvasWidth || !canvasHeight) {
    return roomId === "corridor" ? 1.3 : 1.45;
  }
  if (roomId === "corridor") {
    // Grand Hallway (26x18 tiles): Fit screen width on widescreen displays,
    // allowing vertical scrolling to track player between North and South wings without letterboxing.
    const scaleW = canvasWidth / (26 * TILE_SIZE);
    const scaleH = canvasHeight / (18 * TILE_SIZE);
    const targetZoom = Math.max(scaleW, scaleH * 0.95);
    return Math.max(1.15, Math.min(2.8, targetZoom));
  } else {
    // Classrooms (20x14 tiles): Comfortably frame the room inside the viewport
    // with neat margins on all sides so all walls and furniture are fully visible.
    const scaleW = canvasWidth / (20 * TILE_SIZE);
    const scaleH = canvasHeight / (14 * TILE_SIZE);
    const fitZoom = Math.min(scaleW * 0.95, scaleH * 0.92);
    return Math.max(1.2, Math.min(2.6, fitZoom));
  }
}

export function getCameraTransform(
  room: ClassroomDef,
  playerPos: Position,
  canvasWidth: number,
  canvasHeight: number
): { camX: number; camY: number; zoom: number } {
  const zoom = getCameraZoom(room.id, canvasWidth, canvasHeight);
  const roomScreenW = room.gridWidth * TILE_SIZE * zoom;
  const roomScreenH = room.gridHeight * TILE_SIZE * zoom;

  const targetCamX = (playerPos.x + 0.5) * TILE_SIZE * zoom - canvasWidth / 2;
  const targetCamY = (playerPos.y + 0.5) * TILE_SIZE * zoom - canvasHeight / 2;

  let camX = 0;
  if (roomScreenW > canvasWidth) {
    camX = Math.max(0, Math.min(roomScreenW - canvasWidth, targetCamX));
  } else {
    camX = (roomScreenW - canvasWidth) / 2;
  }

  let camY = 0;
  if (roomScreenH > canvasHeight) {
    camY = Math.max(0, Math.min(roomScreenH - canvasHeight, targetCamY));
  } else {
    camY = (roomScreenH - canvasHeight) / 2;
  }

  return { camX, camY, zoom };
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
    ctx.fillStyle = "#080C16";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Compute camera offset with room-appropriate zoom
    const { camX, camY, zoom } = getCameraTransform(room, playerPos, canvasWidth, canvasHeight);

    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));
    ctx.scale(zoom, zoom);

    // 1. Floor
    this.drawFloor(ctx, room);

    // 2. Walls & Trim
    this.drawWalls(ctx, room);

    // 3. Wall Furniture (Chalkboards, Bookshelves, Notice boards)
    this.drawWallFurniture(ctx, room);

    // 4. Floor Furniture (Desks, Computers, Lab Benches, Telescopes)
    this.drawFloorFurniture(ctx, room, rc.animTick);

    // 5. Doorways & Redesigned Classroom Signboards
    this.drawDoorsAndSignboards(ctx, room, rc.playerPos, rc.animTick, {
      camX,
      camY,
      zoom,
      canvasWidth,
      canvasHeight,
    });

    // 6. NPCs (Seated students, wandering peers, visiting scholars)
    if (rc.npcs && rc.npcs.length > 0) {
      this.drawNPCs(ctx, rc.npcs, rc.animTick);
    }

    // 7. Teacher NPC
    if (room.teacher) {
      this.drawTeacher(ctx, room.teacher, rc.animTick);
    }

    // 8. Player Avatar (Scaled 1.5x)
    this.drawPlayer(
      ctx,
      playerPos,
      rc.playerDirection,
      rc.isMoving,
      rc.walkFrame,
      rc.animTick
    );

    // 9. Floating Prompts & Speech Bubbles
    if (rc.isNearTeacher && room.teacher) {
      this.drawTeacherPrompt(ctx, room.teacher, rc.animTick);
    } else if (rc.nearNPC) {
      this.drawNPCPrompt(ctx, rc.nearNPC, rc.animTick);
    }

    // 10. Developer Collision Debug Mode (enabled via ?debugCollisions=1)
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debugCollisions") === "1") {
      this.drawCollisionDebug(ctx, rc);
    }

    ctx.restore();
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
          const isAlt = (x + y * 2) % 3 === 0;
          ctx.fillStyle = isAlt ? "#C2854A" : "#B57A42";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = "#9E6430";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE, TILE_SIZE);
        } else if (floorTheme === "tile_check") {
          const isCheck = (x + y) % 2 === 0;
          ctx.fillStyle = isCheck ? "#F4EFE6" : "#E2DDD2";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = "#CBC4B5";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE, TILE_SIZE);
        } else if (floorTheme === "stone") {
          const isDark = (x * 3 + y * 7) % 5 === 0;
          ctx.fillStyle = isDark ? "#3A3E4E" : "#44495C";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = "#2A2D39";
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE, TILE_SIZE);
        } else if (floorTheme === "carpet") {
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
  // WALL RENDERING
  // -------------------------------------------------------------
  private static drawWalls(ctx: CanvasRenderingContext2D, room: ClassroomDef) {
    for (const w of room.walls) {
      const px = w.x * TILE_SIZE;
      const py = w.y * TILE_SIZE;
      const pw = w.width * TILE_SIZE;
      const ph = w.height * TILE_SIZE;

      // Base wall color
      ctx.fillStyle = "#2D3748";
      ctx.fillRect(px, py, pw, ph);

      // Top wall moulding trim
      ctx.fillStyle = "#4A5568";
      ctx.fillRect(px, py, pw, 8);

      // Wainscoting base trim
      ctx.fillStyle = "#1A202C";
      ctx.fillRect(px, py + ph - 8, pw, 8);

      // Shadow cast onto floor
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      ctx.fillRect(px, py + ph, pw, 6);
    }
  }

  // -------------------------------------------------------------
  // WALL FURNITURE
  // -------------------------------------------------------------
  private static drawWallFurniture(ctx: CanvasRenderingContext2D, room: ClassroomDef) {
    for (const f of room.furniture) {
      if (!["chalkboard", "bookshelf", "notice_board", "trophy_case"].includes(f.type)) continue;

      const px = f.x * TILE_SIZE;
      const py = f.y * TILE_SIZE;
      const pw = f.width * TILE_SIZE;
      const ph = f.height * TILE_SIZE;

      if (f.type === "chalkboard") {
        ctx.fillStyle = "#92400E";
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = "#064E3B";
        ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);
        ctx.fillStyle = "#FEF3C7";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(f.label || "E = mc²", px + pw / 2, py + ph / 2 + 4);
      } else if (f.type === "bookshelf") {
        ctx.fillStyle = "#78350F";
        ctx.fillRect(px, py, pw, ph);
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
        ctx.fillStyle = "#D97706";
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = "#B45309";
        ctx.fillRect(px + 3, py + 3, pw - 6, ph - 6);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(px + 8, py + 6, 18, 18);
        ctx.fillRect(px + 32, py + 8, 22, 16);
        ctx.fillStyle = "#EF4444";
        ctx.fillRect(px + 16, py + 4, 3, 3);
      } else if (f.type === "trophy_case") {
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

  // -------------------------------------------------------------
  // FLOOR FURNITURE
  // -------------------------------------------------------------
  private static drawFloorFurniture(
    ctx: CanvasRenderingContext2D,
    room: ClassroomDef,
    animTick: number
  ) {
    for (const f of room.furniture) {
      if (["chalkboard", "bookshelf", "notice_board", "trophy_case"].includes(f.type)) continue;

      const px = f.x * TILE_SIZE;
      const py = f.y * TILE_SIZE;
      const pw = f.width * TILE_SIZE;
      const ph = f.height * TILE_SIZE;

      if (f.type === "desk") {
        ctx.fillStyle = "#A16207";
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = "#CA8A04";
        ctx.fillRect(px + 2, py + 2, pw - 4, 6);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(px + 6, py + 10, 14, 12);
        ctx.fillStyle = "#2563EB";
        ctx.fillRect(px + 8, py + 12, 10, 2);
      } else if (f.type === "computer") {
        ctx.fillStyle = "#475569";
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = "#0F172A";
        ctx.fillRect(px + pw / 2 - 12, py + 4, 24, 16);
        ctx.fillStyle = "#22C55E";
        const blink = animTick % 30 < 15;
        ctx.fillRect(px + pw / 2 - 9, py + 7, blink ? 6 : 4, 10);
        ctx.fillStyle = "#94A3B8";
        ctx.fillRect(px + pw / 2 - 10, py + 22, 20, 6);
      } else if (f.type === "lab_bench") {
        ctx.fillStyle = "#334155";
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = "#64748B";
        ctx.fillRect(px + 2, py + 2, pw - 4, 4);
        ctx.fillStyle = "#06B6D4";
        ctx.fillRect(px + 8, py + 10, 10, 14);
        ctx.fillStyle = "#10B981";
        ctx.fillRect(px + pw - 18, py + 10, 10, 14);
      } else if (f.type === "telescope") {
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(px + 10, py + 6, 24, 8);
        ctx.fillStyle = "#78350F";
        ctx.fillRect(px + 18, py + 14, 4, 28);
        ctx.fillRect(px + 10, py + 26, 4, 18);
        ctx.fillRect(px + 26, py + 26, 4, 18);
      } else if (f.type === "globe") {
        ctx.fillStyle = "#78350F";
        ctx.fillRect(px + pw / 2 - 3, py + ph / 2, 6, ph / 2);
        ctx.fillStyle = "#0284C7";
        ctx.beginPath();
        ctx.arc(px + pw / 2, py + 14, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#22C55E";
        ctx.beginPath();
        ctx.arc(px + pw / 2 - 2, py + 12, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.type === "plant") {
        ctx.fillStyle = "#C2410C";
        ctx.fillRect(px + 6, py + ph - 14, pw - 12, 14);
        ctx.fillStyle = "#16A34A";
        ctx.beginPath();
        ctx.arc(px + pw / 2, py + 12, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.type === "cabinet") {
        ctx.fillStyle = "#1E293B";
        ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = "#334155";
        ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(px + 6, py + ph / 2, 4, 6);
        ctx.fillRect(px + pw - 10, py + ph / 2, 4, 6);
      } else if (f.type === "chair") {
        ctx.fillStyle = "#94A3B8";
        ctx.fillRect(px + 6, py + 8, pw - 12, ph - 16);
      }
    }
  }

  // -------------------------------------------------------------
  // DOORS & REDESIGNED CLASSROOM SIGNBOARDS (PART 4)
  // -------------------------------------------------------------
  /**
   * Computes dynamic, non-overflowing dimensions, line wrapping, and screen/room boundary clamping
   * for interaction prompts when approaching classroom doors or exits.
   */
  static calculateDoorPromptLayout(
    door: DoorDef,
    room: ClassroomDef,
    signCenterX: number,
    measureTextWidth?: (text: string, font: string) => number,
    cam?: { camX: number; camY: number; zoom: number; canvasWidth: number; canvasHeight: number }
  ): DoorPromptLayout {
    const isCorridor = room.id === "corridor";
    const isTopDoor = door.triggerArea.y < 5;

    // Extract mainTitle from door label
    let mainTitle = "CLASSROOM";
    if (door.label) {
      const match = door.label.match(/^(.*?)\s*\[(.*?)\]$/);
      if (match) {
        mainTitle = match[1].trim().toUpperCase();
      } else {
        mainTitle = door.label.toUpperCase();
      }
    }

    // Faculty accent color
    let accentColor = "#F59E0B";
    if (door.targetRoom === "maths") accentColor = "#F59E0B";
    else if (door.targetRoom === "cs") accentColor = "#0284C7";
    else if (door.targetRoom === "physics") accentColor = "#8B5CF6";
    else if (door.targetRoom === "chemistry") accentColor = "#10B981";
    else if (door.targetRoom === "biology") accentColor = "#22C55E";
    else if (door.targetRoom === "social") accentColor = "#D97706";
    else if (door.targetRoom === "corridor") accentColor = "#0D9488";

    const dirKey = isCorridor ? (isTopDoor ? "[W] or [↑]" : "[S] or [↓]") : "[Step Through]";
    const actionLabel = isCorridor ? `Enter ${mainTitle}` : "Return to Hallway";
    const singleLineCandidate = `${dirKey} ${actionLabel}`;

    // Approximate width fallback if canvas measureText isn't available
    const defaultMeasure = (str: string) => str.length * 6.2;
    const measure = measureTextWidth || defaultMeasure;

    const font = "bold 9.5px sans-serif";
    const singleLineW = measure(singleLineCandidate, font);

    // Responsive line wrapping: If the single line candidate exceeds compact width (> 135px),
    // cleanly format across 2 lines to prevent text clipping and preserve readability.
    let lines: string[];
    if (singleLineW <= 135) {
      lines = [singleLineCandidate];
    } else {
      lines = isCorridor
        ? [`${dirKey} Enter`, mainTitle]
        : [dirKey, "Return to Hallway"];
    }

    // Measure maximum line width to guarantee adequate horizontal breathing room
    const maxLineW = Math.max(...lines.map((l) => measure(l, font)));
    const horizontalPadding = 24; // 12px padding on each side
    const promptW = Math.max(140, Math.ceil(maxLineW + horizontalPadding));
    const promptH = lines.length === 1 ? 22 : 36;

    // Center horizontally on door signboard
    let promptX = Math.round(signCenterX - promptW / 2);

    // Position vertically relative to doorway
    let promptY = 0;
    if (isTopDoor) {
      // Top wall doorway: place prompt directly below doorway opening
      promptY = Math.round((door.triggerArea.y + door.triggerArea.height + 0.25) * TILE_SIZE);
    } else {
      // Bottom wall doorway: place prompt cleanly above doorway/signboard
      const baseSignY = isCorridor ? 464 : 368;
      promptY = baseSignY - promptH - 4;
    }

    // 1. Clamp to room boundaries with safe margins
    const minRoomX = 8;
    const maxRoomX = room.gridWidth * TILE_SIZE - promptW - 8;
    const minRoomY = 6;
    const maxRoomY = room.gridHeight * TILE_SIZE - promptH - 6;

    if (minRoomX <= maxRoomX) {
      promptX = Math.max(minRoomX, Math.min(maxRoomX, promptX));
    }
    if (minRoomY <= maxRoomY) {
      promptY = Math.max(minRoomY, Math.min(maxRoomY, promptY));
    }

    // 2. Clamp to visible viewport boundaries (in world coordinates)
    if (cam && cam.zoom > 0) {
      const visMinX = Math.round((cam.camX + 8) / cam.zoom);
      const visMaxX = Math.round((cam.camX + cam.canvasWidth - 8) / cam.zoom - promptW);
      const visMinY = Math.round((cam.camY + 8) / cam.zoom);
      const visMaxY = Math.round((cam.camY + cam.canvasHeight - 8) / cam.zoom - promptH);

      if (visMinX <= visMaxX) {
        promptX = Math.max(visMinX, Math.min(visMaxX, promptX));
      }
      if (visMinY <= visMaxY) {
        promptY = Math.max(visMinY, Math.min(visMaxY, promptY));
      }
    }

    return {
      lines,
      promptW,
      promptH,
      promptX,
      promptY,
      accentColor,
    };
  }

  private static drawDoorsAndSignboards(
    ctx: CanvasRenderingContext2D,
    room: ClassroomDef,
    playerPos: Position,
    animTick: number,
    cam?: { camX: number; camY: number; zoom: number; canvasWidth: number; canvasHeight: number }
  ) {
    const isCorridor = room.id === "corridor";

    for (const d of room.doors) {
      const px = d.triggerArea.x * TILE_SIZE;
      const py = d.triggerArea.y * TILE_SIZE;
      const pw = d.triggerArea.width * TILE_SIZE;
      const ph = d.triggerArea.height * TILE_SIZE;

      // Illuminated Doorway Threshold
      const pulse = (Math.sin(animTick * 0.08) + 1) * 0.5;
      ctx.fillStyle = `rgba(245, 158, 11, ${0.15 + pulse * 0.15})`;
      ctx.fillRect(px, py, pw, ph);

      // Door Frame
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);

      // Check proximity of player to this door
      const doorCenterX = d.triggerArea.x + d.triggerArea.width / 2;
      const doorCenterY = d.triggerArea.y + d.triggerArea.height / 2;
      const distToDoor = Math.hypot(playerPos.x + 0.5 - doorCenterX, playerPos.y + 0.5 - doorCenterY);
      const isPlayerNear = distToDoor < 2.5;

      // Extract titles from label or classroom lookup
      let mainTitle = "CLASSROOM";
      let subtitle = "";
      let accentColor = "#F59E0B";

      if (d.label) {
        const match = d.label.match(/^(.*?)\s*\[(.*?)\]$/);
        if (match) {
          mainTitle = match[1].trim().toUpperCase();
          subtitle = match[2].trim();
        } else {
          mainTitle = d.label.toUpperCase();
        }
      }

      // Department color mapping
      if (d.targetRoom === "maths") accentColor = "#F59E0B";
      else if (d.targetRoom === "cs") accentColor = "#0284C7";
      else if (d.targetRoom === "physics") accentColor = "#8B5CF6";
      else if (d.targetRoom === "chemistry") accentColor = "#10B981";
      else if (d.targetRoom === "biology") accentColor = "#22C55E";
      else if (d.targetRoom === "social") accentColor = "#D97706";
      else if (d.targetRoom === "corridor") accentColor = "#0D9488";

      // -----------------------------------------------------------
      // Signboard Geometry (Calculated to prevent any edge clipping!)
      // -----------------------------------------------------------
      const signW = 156;
      const signH = 32;
      const signCenterX = (doorCenterX) * TILE_SIZE;
      const signX = Math.round(signCenterX - signW / 2);

      let signY = 0;
      if (isCorridor) {
        if (d.triggerArea.y < 5) {
          // Top Row Doors: place sign inside top wall header (y = 4px)
          signY = 4;
        } else {
          // Bottom Row Doors: place sign above southern doorway (y = 464px)
          signY = 464;
        }
      } else {
        if (d.triggerArea.y < 5) {
          // Exit door at top: place sign at y = 6px
          signY = 6;
        } else {
          // Exit door at bottom: place sign at y = 368px
          signY = 368;
        }
      }

      // Signboard Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(signX + 2, signY + 3, signW, signH);

      // Signboard Base Background
      ctx.fillStyle = "#0B1120";
      ctx.fillRect(signX, signY, signW, signH);

      // Accent color left strip (4px wide)
      ctx.fillStyle = accentColor;
      ctx.fillRect(signX, signY, 5, signH);

      // Signboard Gold Frame (with proximity breathing glow)
      ctx.strokeStyle = isPlayerNear
        ? `rgba(245, 158, 11, ${0.7 + pulse * 0.3})`
        : "#D97706";
      ctx.lineWidth = isPlayerNear ? 2 : 1.5;
      ctx.strokeRect(signX, signY, signW, signH);

      // Top corner brass mounting rivets
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(signX + 7, signY + 3, 2, 2);
      ctx.fillRect(signX + signW - 9, signY + 3, 2, 2);

      // Main Title Text (Uppercase, cream, high contrast)
      ctx.fillStyle = "#FEF3C7";
      ctx.font = "bold 9.5px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(mainTitle, signX + signW / 2 + 2, signY + 13);

      // Subtitle / Faculty Name (Soft pastel)
      if (subtitle) {
        ctx.fillStyle = "#93C5FD";
        ctx.font = "600 8.5px sans-serif";
        ctx.fillText(subtitle, signX + signW / 2 + 2, signY + 25);
      }

      // Interactive Doorway Contextual Prompt (When player is near)
      if (isPlayerNear) {
        const layout = PixelRenderer.calculateDoorPromptLayout(
          d,
          room,
          signCenterX,
          (text, font) => {
            ctx.font = font;
            return ctx.measureText(text).width;
          },
          cam
        );

        const { promptX, promptY, promptW, promptH, lines, accentColor: promptAccent } = layout;

        // Prompt Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(promptX + 2, promptY + 2, promptW, promptH);

        // Prompt Base (Dark Academy Slate)
        ctx.fillStyle = "#0B1120";
        ctx.fillRect(promptX, promptY, promptW, promptH);

        // Faculty Accent Left Strip (3px)
        ctx.fillStyle = promptAccent;
        ctx.fillRect(promptX, promptY, 3, promptH);

        // Gold Frame with subtle proximity breathing glow
        ctx.strokeStyle = `rgba(245, 158, 11, ${0.75 + pulse * 0.25})`;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(promptX, promptY, promptW, promptH);

        // Text Rendering
        ctx.font = "bold 9.5px sans-serif";
        ctx.textAlign = "center";

        if (lines.length === 1) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillText(lines[0], promptX + promptW / 2 + 1, promptY + 15);
        } else {
          // Line 1: Action / Key guidance (soft warm cream)
          ctx.fillStyle = "#FEF3C7";
          ctx.fillText(lines[0], promptX + promptW / 2 + 1, promptY + 14);

          // Line 2: Classroom destination (warm gold / yellow)
          ctx.fillStyle = "#FDE68A";
          ctx.fillText(lines[1], promptX + promptW / 2 + 1, promptY + 27.5);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // SHARED CHARACTER SPRITE RENDERER (SCALED 1.5x)
  // -------------------------------------------------------------
  private static drawCharacterSprite(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    direction: Direction,
    isMoving: boolean,
    walkFrame: number,
    animTick: number,
    config: {
      outfitColor: string;
      hairColor: string;
      skinTone: string;
      role?: "player" | "teacher" | "student" | "staff" | "visitor";
      name?: string;
      nametagColor?: string;
      accessory?: string;
      activity?: string;
    }
  ) {
    const bob = isMoving ? 0 : Math.sin(animTick * 0.07) * 1.2;

    // 1. Soft Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Animated Stride (Legs)
    const stride = isMoving ? Math.sin(walkFrame * 0.4) * 4 : 0;
    const isSeated = config.activity === "sitting";

    ctx.fillStyle = "#1E293B";
    if (isSeated) {
      ctx.fillRect(cx - 7, cy - 9, 6, 8);
      ctx.fillRect(cx + 1, cy - 9, 6, 8);
    } else {
      ctx.fillRect(cx - 6, cy - 11 + (stride > 0 ? stride : 0), 5, 11);
      ctx.fillRect(cx + 1, cy - 11 - (stride < 0 ? stride : 0), 5, 11);
    }

    // 3. Torso / Jacket (Width: 20, Height: 15)
    ctx.fillStyle = config.outfitColor;
    ctx.fillRect(cx - 10, cy - 24 + bob, 20, 14);

    // Collar detail
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(cx - 3, cy - 24 + bob, 6, 4);

    // Backpack / Bag straps
    if (config.role === "player" || config.accessory === "backpack") {
      ctx.fillStyle = "#E59866";
      if (direction === "up") {
        ctx.fillRect(cx - 7, cy - 23 + bob, 14, 11);
      } else if (direction === "left") {
        ctx.fillRect(cx + 6, cy - 22 + bob, 5, 9);
      } else if (direction === "right") {
        ctx.fillRect(cx - 11, cy - 22 + bob, 5, 9);
      }
    }

    // Arms
    ctx.fillStyle = config.outfitColor;
    if (config.activity === "typing") {
      ctx.fillRect(cx - 8, cy - 16 + bob, 4, 8);
      ctx.fillRect(cx + 4, cy - 16 + bob, 4, 8);
      ctx.fillStyle = config.skinTone;
      ctx.fillRect(cx - 7, cy - 8 + bob, 14, 3);
    } else if (config.activity === "reading") {
      ctx.fillRect(cx - 8, cy - 17 + bob, 4, 8);
      ctx.fillRect(cx + 4, cy - 17 + bob, 4, 8);
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(cx - 7, cy - 14 + bob, 14, 7);
      ctx.fillStyle = "#2563EB";
      ctx.fillRect(cx - 7, cy - 14 + bob, 2, 7);
      ctx.fillRect(cx + 5, cy - 14 + bob, 2, 7);
    } else {
      const armSwing = isMoving ? Math.sin(walkFrame * 0.4) * 3 : 0;
      ctx.fillRect(cx - 13, cy - 23 + bob - armSwing, 4, 12);
      ctx.fillRect(cx + 9, cy - 23 + bob + armSwing, 4, 12);
    }

    // 4. Head / Face (Width: 18, Height: 14)
    ctx.fillStyle = config.skinTone;
    ctx.fillRect(cx - 9, cy - 37 + bob, 18, 14);

    // 5. Hair
    ctx.fillStyle = config.hairColor;
    ctx.fillRect(cx - 10, cy - 41 + bob, 20, 8);

    if (direction === "down") {
      ctx.fillRect(cx - 10, cy - 34 + bob, 3, 6);
      ctx.fillRect(cx + 7, cy - 34 + bob, 3, 6);

      ctx.fillStyle = "#0F172A";
      ctx.fillRect(cx - 5, cy - 31 + bob, 3, 4);
      ctx.fillRect(cx + 2, cy - 31 + bob, 3, 4);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(cx - 5, cy - 31 + bob, 1, 1);
      ctx.fillRect(cx + 2, cy - 31 + bob, 1, 1);
    } else if (direction === "left") {
      ctx.fillRect(cx + 3, cy - 34 + bob, 6, 8);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(cx - 7, cy - 31 + bob, 3, 4);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(cx - 7, cy - 31 + bob, 1, 1);
    } else if (direction === "right") {
      ctx.fillRect(cx - 9, cy - 34 + bob, 6, 8);
      ctx.fillStyle = "#0F172A";
      ctx.fillRect(cx + 4, cy - 31 + bob, 3, 4);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(cx + 4, cy - 31 + bob, 1, 1);
    } else {
      ctx.fillRect(cx - 10, cy - 37 + bob, 20, 12);
    }

    // 6. Accessories
    if (config.accessory === "glasses") {
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 1;
      if (direction === "down") {
        ctx.strokeRect(cx - 6, cy - 32 + bob, 5, 5);
        ctx.strokeRect(cx + 1, cy - 32 + bob, 5, 5);
      }
    } else if (config.accessory === "headphones") {
      ctx.fillStyle = "#0284C7";
      ctx.fillRect(cx - 12, cy - 35 + bob, 4, 7);
      ctx.fillRect(cx + 8, cy - 35 + bob, 4, 7);
      ctx.fillRect(cx - 10, cy - 42 + bob, 20, 3);
    } else if (config.accessory === "safety_goggles") {
      ctx.fillStyle = "#06B6D4";
      ctx.fillRect(cx - 8, cy - 37 + bob, 16, 4);
    } else if (config.accessory === "cap") {
      ctx.fillStyle = "#15803D";
      ctx.fillRect(cx - 11, cy - 43 + bob, 22, 6);
      if (direction === "down" || direction === "right") {
        ctx.fillRect(cx + 3, cy - 37 + bob, 8, 3);
      } else if (direction === "left") {
        ctx.fillRect(cx - 11, cy - 37 + bob, 8, 3);
      }
    } else if (config.accessory === "scarf") {
      ctx.fillStyle = "#D97706";
      ctx.fillRect(cx - 8, cy - 25 + bob, 16, 5);
    }

    // 7. Nametag / Character Badge
    if (config.name && config.role !== "player") {
      const tagText = config.name;
      ctx.font = "bold 8.5px sans-serif";
      const tagW = ctx.measureText(tagText).width + 12;
      const tagH = 13;
      const tagX = Math.round(cx - tagW / 2);
      const tagY = Math.round(cy - 52 + bob);

      ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
      ctx.fillRect(tagX, tagY, tagW, tagH);
      ctx.strokeStyle = config.nametagColor || config.outfitColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(tagX, tagY, tagW, tagH);

      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.fillText(tagText, cx, tagY + 9.5);
    }
  }

  // -------------------------------------------------------------
  // STUDENT AVATAR (PLAYER) RENDERING
  // -------------------------------------------------------------
  private static drawPlayer(
    ctx: CanvasRenderingContext2D,
    pos: Position,
    direction: Direction,
    isMoving: boolean,
    walkFrame: number,
    animTick: number
  ) {
    const cx = Math.round((pos.x + 0.5) * TILE_SIZE);
    const cy = Math.round((pos.y + 0.9) * TILE_SIZE);

    this.drawCharacterSprite(ctx, cx, cy, direction, isMoving, walkFrame, animTick, {
      role: "player",
      outfitColor: "#0D9488",
      hairColor: "#451A03",
      skinTone: "#FED7AA",
      accessory: "backpack",
    });
  }

  // -------------------------------------------------------------
  // TEACHER NPC RENDERING
  // -------------------------------------------------------------
  private static drawTeacher(
    ctx: CanvasRenderingContext2D,
    teacher: TeacherDef,
    animTick: number
  ) {
    const cx = Math.round((teacher.position.x + 0.5) * TILE_SIZE);
    const cy = Math.round((teacher.position.y + 0.9) * TILE_SIZE);

    let accessory: string | undefined;
    if (teacher.subject === "maths") accessory = "glasses";
    else if (teacher.subject === "cs") accessory = "headphones";
    else if (teacher.subject === "chemistry") accessory = "safety_goggles";
    else if (teacher.subject === "social") accessory = "scarf";

    this.drawCharacterSprite(ctx, cx, cy, teacher.direction, false, 0, animTick, {
      role: "teacher",
      name: teacher.name,
      nametagColor: teacher.color,
      outfitColor: teacher.color,
      hairColor: "#2D1B14",
      skinTone: "#FCD34D",
      accessory,
    });
  }

  // -------------------------------------------------------------
  // NPC RENDERING & SPEECH BUBBLE OVERLAYS (PART 1)
  // -------------------------------------------------------------
  private static drawNPCs(
    ctx: CanvasRenderingContext2D,
    npcs: NPCState[],
    animTick: number
  ) {
    for (const npc of npcs) {
      const cx = Math.round((npc.currentPos.x + 0.5) * TILE_SIZE);
      const cy = Math.round((npc.currentPos.y + 0.9) * TILE_SIZE);

      this.drawCharacterSprite(
        ctx,
        cx,
        cy,
        npc.direction,
        npc.isMoving,
        npc.walkFrame,
        animTick,
        {
          role: npc.def.role,
          name: npc.def.name,
          nametagColor: npc.def.role === "staff" ? "#22C55E" : "#38BDF8",
          outfitColor: npc.def.outfitColor,
          hairColor: npc.def.hairColor,
          skinTone: npc.def.skinTone,
          accessory: npc.def.accessory,
          activity: npc.def.activity,
        }
      );

      if (npc.activeSpeechBubble) {
        this.drawSpeechBubble(ctx, cx, cy, npc.def.name, npc.activeSpeechBubble.text);
      }
    }
  }

  private static drawSpeechBubble(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    speakerName: string,
    message: string
  ) {
    ctx.font = "10px sans-serif";
    const textWidth = ctx.measureText(message).width;
    const bubbleW = Math.max(160, Math.min(230, textWidth + 24));
    
    const approxLines = Math.ceil((textWidth + 10) / (bubbleW - 20));
    const bubbleH = 26 + approxLines * 12;

    const bubbleX = Math.round(cx - bubbleW / 2);
    const bubbleY = Math.round(cy - 56 - bubbleH);

    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillRect(bubbleX + 3, bubbleY + 3, bubbleW, bubbleH);

    ctx.fillStyle = "#0B1120";
    ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);

    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bubbleX, bubbleY, bubbleW, bubbleH);

    ctx.fillStyle = "#0B1120";
    ctx.beginPath();
    ctx.moveTo(cx - 6, bubbleY + bubbleH);
    ctx.lineTo(cx + 6, bubbleY + bubbleH);
    ctx.lineTo(cx, bubbleY + bubbleH + 6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#38BDF8";
    ctx.beginPath();
    ctx.moveTo(cx - 6, bubbleY + bubbleH);
    ctx.lineTo(cx, bubbleY + bubbleH + 6);
    ctx.lineTo(cx + 6, bubbleY + bubbleH);
    ctx.stroke();

    ctx.fillStyle = "#FCD34D";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(speakerName, bubbleX + 10, bubbleY + 12);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "10px sans-serif";
    const words = message.split(" ");
    let line = "";
    let lineY = bubbleY + 24;

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > bubbleW - 20 && line) {
        ctx.fillText(line, bubbleX + 10, lineY);
        line = word;
        lineY += 12;
      } else {
        line = testLine;
      }
    }
    if (line) {
      ctx.fillText(line, bubbleX + 10, lineY);
    }
  }

  // -------------------------------------------------------------
  // FLOATING INTERACTION PROMPTS
  // -------------------------------------------------------------
  private static drawTeacherPrompt(
    ctx: CanvasRenderingContext2D,
    teacher: TeacherDef,
    animTick: number
  ) {
    const px = Math.round((teacher.position.x + 0.5) * TILE_SIZE);
    const py = Math.round((teacher.position.y + 0.9) * TILE_SIZE);
    const bounce = Math.sin(animTick * 0.12) * 3;

    const bannerW = 150;
    const bannerH = 22;
    const bx = px - bannerW / 2;
    const by = py - 62 + bounce;

    ctx.fillStyle = "#234E3C";
    ctx.fillRect(bx, by, bannerW, bannerH);
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bannerW, bannerH);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`[E] Speak with ${teacher.name}`, px, by + 14);

    ctx.fillStyle = "#234E3C";
    ctx.beginPath();
    ctx.moveTo(px - 5, by + bannerH);
    ctx.lineTo(px + 5, by + bannerH);
    ctx.lineTo(px, by + bannerH + 5);
    ctx.closePath();
    ctx.fill();
  }

  private static drawNPCPrompt(
    ctx: CanvasRenderingContext2D,
    npc: NPCState,
    animTick: number
  ) {
    const px = Math.round((npc.currentPos.x + 0.5) * TILE_SIZE);
    const py = Math.round((npc.currentPos.y + 0.9) * TILE_SIZE);
    const bounce = Math.sin(animTick * 0.12) * 2;

    const bannerW = 120;
    const bannerH = 20;
    const bx = px - bannerW / 2;
    const by = py - 60 + bounce;

    ctx.fillStyle = "#0F172A";
    ctx.fillRect(bx, by, bannerW, bannerH);
    ctx.strokeStyle = "#38BDF8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bannerW, bannerH);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 9.5px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`[E] Talk with ${npc.def.name}`, px, by + 13.5);

    ctx.fillStyle = "#0F172A";
    ctx.beginPath();
    ctx.moveTo(px - 4, by + bannerH);
    ctx.lineTo(px + 4, by + bannerH);
    ctx.lineTo(px, by + bannerH + 4);
    ctx.closePath();
    ctx.fill();
  }

  // -------------------------------------------------------------
  // COLLISION & NAVIGATION DEBUG OVERLAY
  // -------------------------------------------------------------
  private static drawCollisionDebug(ctx: CanvasRenderingContext2D, rc: RenderContext) {
    const { room, playerPos } = rc;

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

    for (const f of room.furniture) {
      if (f.type === "chair") continue;
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
}
