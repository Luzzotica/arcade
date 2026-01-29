import { useState, useRef, useEffect, useCallback } from "react";
import { useGameStore } from "../store/gameStore";

const JOYSTICK_BASE_RADIUS = 60; // Outer circle radius
const JOYSTICK_HANDLE_RADIUS = 25; // Inner circle radius
const MAX_DISTANCE = JOYSTICK_BASE_RADIUS - JOYSTICK_HANDLE_RADIUS; // Max distance handle can move from center

export function Joystick() {
  const [centerPosition, setCenterPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [handlePosition, setHandlePosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const centerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isActiveRef = useRef(false);
  const setJoystickInput = useGameStore((state) => state.setJoystickInput);
  const clearJoystickInput = useGameStore((state) => state.clearJoystickInput);

  // Keep refs in sync with state
  useEffect(() => {
    centerPositionRef.current = centerPosition;
    isActiveRef.current = isActive;
  }, [centerPosition, isActive]);

  // Calculate normalized joystick input (-1 to 1)
  const calculateInput = useCallback((offsetX: number, offsetY: number) => {
    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    const clampedDistance = Math.min(distance, MAX_DISTANCE);

    if (clampedDistance === 0) {
      return { x: 0, y: 0 };
    }

    const normalizedX =
      (offsetX / clampedDistance) * (clampedDistance / MAX_DISTANCE);
    const normalizedY =
      (offsetY / clampedDistance) * (clampedDistance / MAX_DISTANCE);

    return { x: normalizedX, y: normalizedY };
  }, []);

  // Get touch position relative to container
  const getTouchPosition = useCallback(
    (e: TouchEvent): { x: number; y: number } | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    },
    [],
  );

  // Get mouse position relative to container
  const getMousePosition = useCallback(
    (e: MouseEvent): { x: number; y: number } | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [],
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const pos = getTouchPosition(e);
      if (!pos) return;

      // Always reset and clear any previous state first
      clearJoystickInput();
      setHandlePosition({ x: 0, y: 0 });

      // Set new center position and activate
      setCenterPosition(pos);
      setIsActive(true);
    },
    [getTouchPosition, clearJoystickInput],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isActiveRef.current || !centerPositionRef.current) return;
      e.preventDefault();

      const pos = getTouchPosition(e);
      if (!pos) return;

      // Calculate offset from center
      const offsetX = pos.x - centerPositionRef.current.x;
      const offsetY = pos.y - centerPositionRef.current.y;

      // Constrain handle within max distance
      const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      const clampedDistance = Math.min(distance, MAX_DISTANCE);

      if (clampedDistance > 0) {
        const angle = Math.atan2(offsetY, offsetX);
        const handleX = Math.cos(angle) * clampedDistance;
        const handleY = Math.sin(angle) * clampedDistance;
        setHandlePosition({ x: handleX, y: handleY });

        // Update gameStore with normalized input
        const input = calculateInput(offsetX, offsetY);
        setJoystickInput(input.x, input.y);
      } else {
        setHandlePosition({ x: 0, y: 0 });
        clearJoystickInput();
      }
    },
    [getTouchPosition, calculateInput, setJoystickInput, clearJoystickInput],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();

      // Always reset state, even if ref says not active (handles race conditions)
      setIsActive(false);
      setHandlePosition({ x: 0, y: 0 });
      setCenterPosition(null);
      clearJoystickInput();
    },
    [clearJoystickInput],
  );

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      const pos = getMousePosition(e);
      if (!pos) return;

      // Set center to mouse position
      setCenterPosition(pos);
      setIsActive(true);
      setHandlePosition({ x: 0, y: 0 });
      clearJoystickInput();
    },
    [getMousePosition, clearJoystickInput],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isActiveRef.current || !centerPositionRef.current) return;
      e.preventDefault();

      const pos = getMousePosition(e);
      if (!pos) return;

      // Calculate offset from center
      const offsetX = pos.x - centerPositionRef.current.x;
      const offsetY = pos.y - centerPositionRef.current.y;

      // Constrain handle within max distance
      const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      const clampedDistance = Math.min(distance, MAX_DISTANCE);

      if (clampedDistance > 0) {
        const angle = Math.atan2(offsetY, offsetX);
        const handleX = Math.cos(angle) * clampedDistance;
        const handleY = Math.sin(angle) * clampedDistance;
        setHandlePosition({ x: handleX, y: handleY });

        // Update gameStore with normalized input
        const input = calculateInput(offsetX, offsetY);
        setJoystickInput(input.x, input.y);
      } else {
        setHandlePosition({ x: 0, y: 0 });
        clearJoystickInput();
      }
    },
    [getMousePosition, calculateInput, setJoystickInput, clearJoystickInput],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!isActiveRef.current) return;
      e.preventDefault();

      setIsActive(false);
      setHandlePosition({ x: 0, y: 0 });
      setCenterPosition(null);
      clearJoystickInput();
    },
    [clearJoystickInput],
  );

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      if (!isActiveRef.current) return;
      // Cancel joystick if mouse leaves the window
      setIsActive(false);
      setHandlePosition({ x: 0, y: 0 });
      setCenterPosition(null);
      clearJoystickInput();
    },
    [clearJoystickInput],
  );

  // Set up touch event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: false });
    container.addEventListener("touchcancel", handleTouchEnd, {
      passive: false,
    });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Set up mouse event listeners (for desktop testing)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave]);

  // Calculate default position for inactive joystick (centered horizontally, moved up)
  const [defaultPosition, setDefaultPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    // Calculate position on mount and window resize
    const updatePosition = () => {
      setDefaultPosition({
        x: window.innerWidth / 2, // Center horizontally
        y: window.innerHeight - JOYSTICK_BASE_RADIUS - 100, // Moved up from bottom
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[5] touch-none"
      style={{ pointerEvents: "auto" }}
    >
      {/* Faint joystick outline when not active (centered horizontally, moved up) */}
      {!isActive && defaultPosition && (
        <>
          {/* Joystick Base Outline */}
          <div
            className="absolute rounded-full border border-white/15 bg-black/10 backdrop-blur-sm"
            style={{
              left: `${defaultPosition.x}px`,
              top: `${defaultPosition.y}px`,
              width: `${JOYSTICK_BASE_RADIUS * 2}px`,
              height: `${JOYSTICK_BASE_RADIUS * 2}px`,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)",
            }}
          />
          {/* Joystick Handle Outline */}
          <div
            className="absolute rounded-full border border-white/15 bg-white/10"
            style={{
              left: `${defaultPosition.x}px`,
              top: `${defaultPosition.y}px`,
              width: `${JOYSTICK_HANDLE_RADIUS * 2}px`,
              height: `${JOYSTICK_HANDLE_RADIUS * 2}px`,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 8px rgba(255, 255, 255, 0.1)",
            }}
          />
        </>
      )}

      {/* Active joystick */}
      {isActive && centerPosition && (
        <>
          {/* Joystick Base (outer circle) */}
          <div
            className="absolute rounded-full border-2 border-white/40 bg-black/30 backdrop-blur-sm"
            style={{
              left: `${centerPosition.x}px`,
              top: `${centerPosition.y}px`,
              width: `${JOYSTICK_BASE_RADIUS * 2}px`,
              height: `${JOYSTICK_BASE_RADIUS * 2}px`,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 20px rgba(255, 255, 255, 0.2)",
            }}
          />

          {/* Joystick Handle (inner circle) */}
          <div
            className="absolute rounded-full bg-white/60 border-2 border-white/80"
            style={{
              left: `${centerPosition.x + handlePosition.x}px`,
              top: `${centerPosition.y + handlePosition.y}px`,
              width: `${JOYSTICK_HANDLE_RADIUS * 2}px`,
              height: `${JOYSTICK_HANDLE_RADIUS * 2}px`,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 15px rgba(255, 255, 255, 0.4)",
              transition: isActive ? "none" : "all 0.2s ease-out",
            }}
          />
        </>
      )}
    </div>
  );
}
