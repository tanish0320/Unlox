import React, { useEffect, useRef, useState, useCallback } from "react";
import { ClassroomDef, Direction, Position, RoomId, TeacherDef } from "../types";
import { CollisionSystem } from "../engine/CollisionSystem";
import { InputManager } from "../engine/InputManager";
import { PixelRenderer, TILE_SIZE, getCameraTransform } from "../engine/PixelRenderer";
import { NPCManager } from "../engine/NPCManager";
import { CLASSROOMS } from "../data/classrooms";

export interface GameCanvasProps {
  currentRoom: ClassroomDef;
  spawnPosition?: Position;
  onRoomChange: (newRoomId: RoomId, spawnPos?: Position) => void;
  onInteractTeacher: (teacher: TeacherDef) => void;
  isPaused: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  currentRoom,
  spawnPosition,
  onRoomChange,
  onInteractTeacher,
  isPaused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 720,
  });

  // Track parent container resize to keep canvas buffer matching screen dimensions
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width || window.innerWidth || 1280);
      const h = Math.floor(rect.height || window.innerHeight || 720);
      if (w > 0 && h > 0) {
        setDimensions((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      }
    };

    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", updateSize);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const getSafeDefaultSpawn = (room: ClassroomDef): Position => {
    if (room.id === "corridor") return { x: 13, y: 9 };
    if (["maths", "cs", "physics"].includes(room.id)) return { x: 9.5, y: 11.0 };
    return { x: 9.5, y: 2.2 };
  };

  // Player position state in grid tile units
  const [playerPos, setPlayerPos] = useState<Position>(() => {
    return spawnPosition || getSafeDefaultSpawn(currentRoom);
  });

  const [playerDirection, setPlayerDirection] = useState<Direction>("down");
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [walkFrame, setWalkFrame] = useState<number>(0);
  const [isNearTeacher, setIsNearTeacher] = useState<boolean>(false);

  // Target destination for click-to-move accessibility
  const clickTargetRef = useRef<Position | null>(null);

  const inputManagerRef = useRef<InputManager | null>(null);
  const npcManagerRef = useRef<NPCManager>(new NPCManager());
  const animFrameIdRef = useRef<number | null>(null);
  const animTickRef = useRef<number>(0);
  const transitionCooldownRef = useRef<number>(0);

  // Position reference for loop
  const posRef = useRef<Position>(playerPos);
  posRef.current = playerPos;

  const dirRef = useRef<Direction>(playerDirection);
  dirRef.current = playerDirection;

  const roomRef = useRef<ClassroomDef>(currentRoom);
  roomRef.current = currentRoom;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  // Reset and synchronize player state whenever the active room or spawn position changes
  useEffect(() => {
    const targetPos = spawnPosition || getSafeDefaultSpawn(currentRoom);

    setPlayerPos(targetPos);
    posRef.current = targetPos;
    clickTargetRef.current = null;
    setIsMoving(false);

    // Initialize NPCs for this room
    npcManagerRef.current.initRoom(currentRoom.id);

    // Initial facing direction based on destination entrance:
    if (["maths", "cs", "physics"].includes(currentRoom.id)) {
      setPlayerDirection("up");
      dirRef.current = "up";
    } else if (["chemistry", "biology", "social"].includes(currentRoom.id)) {
      setPlayerDirection("down");
      dirRef.current = "down";
    } else {
      // In hallway, face down if coming from north towers, up if coming from south wings
      const dir = targetPos.y < 8 ? "down" : "up";
      setPlayerDirection(dir);
      dirRef.current = dir;
    }

    // Set transition cooldown for 600ms to prevent immediate re-entry/bounce
    transitionCooldownRef.current = performance.now() + 600;
  }, [currentRoom.id, spawnPosition]);

  // Initialize InputManager once
  useEffect(() => {
    const input = new InputManager();
    input.attach(window);
    inputManagerRef.current = input;

    // Interaction key handler
    const unbind = input.onInteract(() => {
      if (isPausedRef.current) return;
      const room = roomRef.current;
      const pos = posRef.current;

      // 1. Prioritize Teacher Interaction (Launches lesson studio)
      if (room.teacher && CollisionSystem.isNearTeacher(room, pos)) {
        onInteractTeacher(room.teacher);
        return;
      }

      // 2. Ambient NPC Dialogue (Students, staff, peers)
      const nearNPC = npcManagerRef.current.getNearNPC(pos);
      if (nearNPC) {
        npcManagerRef.current.interactWith(nearNPC, pos);
      }
    });

    return () => {
      unbind();
      input.destroy();
      inputManagerRef.current = null;
    };
  }, [onInteractTeacher]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();
    let moveCounter = 0;

    const gameLoop = (now: number) => {
      animTickRef.current += 1;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const room = roomRef.current;
      const currentPos = { ...posRef.current };
      let moving = false;
      let newDirection = dirRef.current;

      // Update ambient NPCs
      if (!isPausedRef.current) {
        npcManagerRef.current.update(dt, room, currentPos);
      }

      if (!isPausedRef.current && inputManagerRef.current) {
        const { dx, dy, direction } = inputManagerRef.current.getMovement();

        // 1. Keyboard movement priority
        if (dx !== 0 || dy !== 0) {
          clickTargetRef.current = null; // Clear click target when keyboard is used
          moving = true;
          if (direction) newDirection = direction;

          // Normalized speed: 4.8 tiles per second
          const speed = 4.8 * dt;
          const mag = Math.sqrt(dx * dx + dy * dy);
          const stepX = (dx / mag) * speed;
          const stepY = (dy / mag) * speed;

          // Try moving horizontally with collision buffer
          const testX = currentPos.x + stepX;
          if (!CollisionSystem.isSolid(room, testX, currentPos.y)) {
            currentPos.x = testX;
          }

          // Try moving vertically with collision buffer
          const testY = currentPos.y + stepY;
          if (!CollisionSystem.isSolid(room, currentPos.x, testY)) {
            currentPos.y = testY;
          }
        } else if (clickTargetRef.current) {
          // 2. Click-to-move accessibility
          const target = clickTargetRef.current;
          const diffX = target.x - currentPos.x;
          const diffY = target.y - currentPos.y;
          const dist = Math.sqrt(diffX * diffX + diffY * diffY);

          if (dist > 0.2) {
            moving = true;
            const speed = Math.min(dist, 4.8 * dt);
            const stepX = (diffX / dist) * speed;
            const stepY = (diffY / dist) * speed;

            if (Math.abs(diffX) > Math.abs(diffY)) {
              newDirection = diffX > 0 ? "right" : "left";
            } else {
              newDirection = diffY > 0 ? "down" : "up";
            }

            if (!CollisionSystem.isSolid(room, currentPos.x + stepX, currentPos.y)) {
              currentPos.x += stepX;
            }
            if (!CollisionSystem.isSolid(room, currentPos.x, currentPos.y + stepY)) {
              currentPos.y += stepY;
            }
          } else {
            clickTargetRef.current = null;
          }
        }

        // Check door transitions with cooldown protection
        if (now > transitionCooldownRef.current) {
          const door = CollisionSystem.checkDoor(room, currentPos);
          if (door) {
            transitionCooldownRef.current = now + 600;
            clickTargetRef.current = null;
            setIsMoving(false);
            if (door.targetPosition) {
              posRef.current = door.targetPosition;
              setPlayerPos(door.targetPosition);
            }
            onRoomChange(door.targetRoom, door.targetPosition);
            animFrameIdRef.current = requestAnimationFrame(gameLoop);
            return;
          }
        }

        // Check teacher proximity
        const nearTeacher = CollisionSystem.isNearTeacher(room, currentPos);
        setIsNearTeacher(nearTeacher);

        if (moving) {
          moveCounter += dt * 10;
          setWalkFrame(Math.floor(moveCounter));
        }

        setPlayerPos(currentPos);
        setPlayerDirection(newDirection);
        setIsMoving(moving);
      }

      // Check near NPC for ambient prompt
      const nearNPC = npcManagerRef.current.getNearNPC(currentPos);

      // Render Frame
      PixelRenderer.render({
        ctx,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        room,
        playerPos: currentPos,
        playerDirection: newDirection,
        isMoving: moving,
        walkFrame: Math.floor(moveCounter),
        animTick: animTickRef.current,
        isNearTeacher: Boolean(room.teacher && CollisionSystem.isNearTeacher(room, currentPos)),
        npcs: npcManagerRef.current.getNPCs(),
        nearNPC,
      });

      animFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [onRoomChange]);

  // Click on Canvas handler for accessibility (tap to move, tap NPC, or tap teacher to talk)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickCanvasX = (e.clientX - rect.left) * scaleX;
    const clickCanvasY = (e.clientY - rect.top) * scaleY;

    // Convert canvas coordinates to world coordinates based on unified camera transform
    const room = roomRef.current;
    const { camX, camY, zoom } = getCameraTransform(room, posRef.current, canvas.width, canvas.height);

    const worldX = (clickCanvasX + camX) / (TILE_SIZE * zoom);
    const worldY = (clickCanvasY + camY) / (TILE_SIZE * zoom);

    // 1. If teacher is clicked, open lesson dialogue
    if (room.teacher) {
      const tx = room.teacher.position.x + 0.5;
      const ty = room.teacher.position.y + 0.5;
      if (Math.hypot(worldX - tx, worldY - ty) <= 2.2) {
        onInteractTeacher(room.teacher);
        return;
      }
    }

    // 2. If an ambient NPC is clicked, trigger speech bubble
    const clickedNPC = npcManagerRef.current.findClickedNPC(worldX, worldY);
    if (clickedNPC) {
      npcManagerRef.current.interactWith(clickedNPC, posRef.current);
      return;
    }

    // 3. Otherwise set walking destination target
    clickTargetRef.current = {
      x: Math.max(1, Math.min(room.gridWidth - 2, worldX)),
      y: Math.max(2, Math.min(room.gridHeight - 2, worldY)),
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "#080C16",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onClick={handleCanvasClick}
        tabIndex={0}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          imageRendering: "pixelated",
          cursor: isNearTeacher ? "pointer" : "crosshair",
          outline: "none",
        }}
      />

      {/* Movement instruction hint banner at bottom center */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          borderRadius: 20,
          padding: "7px 18px",
          color: "#E2E8F0",
          fontSize: 11,
          fontWeight: 600,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--blu-font-sans, system-ui, sans-serif)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        }}
      >
        <span>⌨️ [W, A, S, D] or [Arrow Keys] to Move</span>
        <span>•</span>
        <span>🖱️ Click to Walk / Tap Characters</span>
        <span>•</span>
        <span>🗣️ [E] or [Enter] to Talk with Teachers & Peers</span>
      </div>
    </div>
  );
};
