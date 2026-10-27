import React, { useEffect, useRef, useState, useCallback } from "react";
import { ClassroomDef, Direction, Position, RoomId, TeacherDef } from "../types";
import { CollisionSystem } from "../engine/CollisionSystem";
import { InputManager } from "../engine/InputManager";
import { PixelRenderer, TILE_SIZE } from "../engine/PixelRenderer";
import { CLASSROOMS } from "../data/classrooms";

interface GameCanvasProps {
  currentRoom: ClassroomDef;
  onRoomChange: (newRoomId: RoomId, spawnPos?: Position) => void;
  onInteractTeacher: (teacher: TeacherDef) => void;
  isPaused: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  currentRoom,
  onRoomChange,
  onInteractTeacher,
  isPaused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Player position state in grid tile units
  const [playerPos, setPlayerPos] = useState<Position>(() => {
    return currentRoom.id === "corridor" ? { x: 13, y: 9 } : { x: 10, y: 11 };
  });

  const [playerDirection, setPlayerDirection] = useState<Direction>("down");
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [walkFrame, setWalkFrame] = useState<number>(0);
  const [isNearTeacher, setIsNearTeacher] = useState<boolean>(false);

  // Target destination for click-to-move accessibility
  const clickTargetRef = useRef<Position | null>(null);

  const inputManagerRef = useRef<InputManager | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const animTickRef = useRef<number>(0);

  // Position reference for loop
  const posRef = useRef<Position>(playerPos);
  posRef.current = playerPos;

  const dirRef = useRef<Direction>(playerDirection);
  dirRef.current = playerDirection;

  const roomRef = useRef<ClassroomDef>(currentRoom);
  roomRef.current = currentRoom;

  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

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
      if (room.teacher && CollisionSystem.isNearTeacher(room, pos)) {
        onInteractTeacher(room.teacher);
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

        // Check door transitions
        const door = CollisionSystem.checkDoor(room, currentPos);
        if (door) {
          onRoomChange(door.targetRoom, door.targetPosition);
          return; // Pause loop until room switch settles
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

  // Click on Canvas handler for accessibility (tap to move or tap teacher to talk)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPaused) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickCanvasX = (e.clientX - rect.left) * scaleX;
    const clickCanvasY = (e.clientY - rect.top) * scaleY;

    // Convert canvas coordinates to world coordinates based on camera
    const room = roomRef.current;
    const roomPxW = room.gridWidth * TILE_SIZE;
    const roomPxH = room.gridHeight * TILE_SIZE;

    let camX = 0;
    if (roomPxW > canvas.width) {
      camX = Math.max(0, Math.min(roomPxW - canvas.width, playerPos.x * TILE_SIZE - canvas.width / 2 + TILE_SIZE / 2));
    } else {
      camX = (roomPxW - canvas.width) / 2;
    }

    let camY = 0;
    if (roomPxH > canvas.height) {
      camY = Math.max(0, Math.min(roomPxH - canvas.height, playerPos.y * TILE_SIZE - canvas.height / 2 + TILE_SIZE / 2));
    } else {
      camY = (roomPxH - canvas.height) / 2;
    }

    const worldX = (clickCanvasX + camX) / TILE_SIZE;
    const worldY = (clickCanvasY + camY) / TILE_SIZE;

    // If teacher is clicked, open dialogue directly or move to teacher
    if (room.teacher) {
      const tx = room.teacher.position.x;
      const ty = room.teacher.position.y;
      if (Math.hypot(worldX - tx, worldY - ty) <= 2.2) {
        onInteractTeacher(room.teacher);
        return;
      }
    }

    // Set destination target
    clickTargetRef.current = { x: Math.max(1, Math.min(room.gridWidth - 2, worldX)), y: Math.max(2, Math.min(room.gridHeight - 2, worldY)) };
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 1280,
        aspectRatio: "16 / 9",
        backgroundColor: "#0B1020",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.5)",
        border: "3px solid #234E3C",
        margin: "0 auto",
      }}
    >
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
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
          backgroundColor: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(4px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 20,
          padding: "6px 16px",
          color: "#E2E8F0",
          fontSize: 11,
          fontWeight: 600,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "var(--blu-font-sans, system-ui, sans-serif)",
        }}
      >
        <span>⌨️ [W, A, S, D] or [Arrow Keys] to Move</span>
        <span>•</span>
        <span>🖱️ Click to Walk / Tap Teacher</span>
        <span>•</span>
        <span>🗣️ [E] or [Enter] to Talk</span>
      </div>
    </div>
  );
};
