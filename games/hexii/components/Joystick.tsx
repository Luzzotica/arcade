import { useRef, useEffect, useState, useCallback } from "react";
import { useGameStore } from "../store/gameStore";

const JOYSTICK_BASE_RADIUS = 60; // Outer circle radius
const JOYSTICK_HANDLE_RADIUS = 25; // Inner circle radius
const JOYSTICK_SIZE = JOYSTICK_BASE_RADIUS * 2;

export function Joystick() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [joystickCenter, setJoystickCenter] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const activeTouchIdRef = useRef<number | null>(null); // Track which touch is controlling the joystick
  const setJoystickInput = useGameStore((state) => state.setJoystickInput);
  const clearJoystickInput = useGameStore((state) => state.clearJoystickInput);

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

  const getPositionFromEvent = useCallback(
    (
      e: TouchEvent | MouseEvent,
      touchId?: number | null,
      center?: { x: number; y: number },
    ) => {
      if (!center) return { x: 0, y: 0 };

      let clientX: number;
      let clientY: number;

      if ("touches" in e) {
        // Find the touch with the matching identifier, or use the first touch for start events
        const targetTouchId = touchId ?? activeTouchIdRef.current;
        let touch: Touch | undefined;

        if (
          targetTouchId !== null &&
          targetTouchId !== undefined &&
          targetTouchId !== -1
        ) {
          touch = Array.from(e.touches).find(
            (t) => t.identifier === targetTouchId,
          );
        }

        // Fallback to first touch if not found (for start events)
        if (!touch && e.touches.length > 0) {
          touch = e.touches[0];
        }

        if (!touch) return { x: 0, y: 0 };

        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        const mouseEvent = e as MouseEvent;
        clientX = mouseEvent.clientX;
        clientY = mouseEvent.clientY;
      }

      let x = clientX - center.x;
      let y = clientY - center.y;

      const maxDistance = JOYSTICK_BASE_RADIUS - JOYSTICK_HANDLE_RADIUS;
      const distance = Math.sqrt(x * x + y * y);

      if (distance > maxDistance) {
        x = (x / distance) * maxDistance;
        y = (y / distance) * maxDistance;
      }

      return { x, y };
    },
    [],
  );

  const handleStart = useCallback(
    (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Get the touch/mouse position
      let clientX: number;
      let clientY: number;
      let touchId: number | null = null;

      if ("touches" in e && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
        touchId = touch.identifier;
        activeTouchIdRef.current = touchId;
      } else {
        const mouseEvent = e as MouseEvent;
        clientX = mouseEvent.clientX;
        clientY = mouseEvent.clientY;
        activeTouchIdRef.current = -1; // Use -1 for mouse events
      }

      // Check if touch is in bottom half of screen
      const isInBottomHalf = clientY > window.innerHeight / 2;

      if (isInBottomHalf) {
        // Set joystick center to touch position
        setJoystickCenter({ x: clientX, y: clientY });
        setIsDragging(true);
        setPosition({ x: 0, y: 0 });
        clearJoystickInput();
      } else {
        // If joystick already exists, use it
        if (joystickCenter) {
          setIsDragging(true);
          const pos = getPositionFromEvent(e, touchId, joystickCenter);
          setPosition(pos);
          const maxDistance = JOYSTICK_BASE_RADIUS - JOYSTICK_HANDLE_RADIUS;
          const normalizedX = pos.x / maxDistance;
          const normalizedY = pos.y / maxDistance; // Removed inversion
          setJoystickInput(normalizedX, normalizedY);
        }
      }
    },
    [
      getPositionFromEvent,
      setJoystickInput,
      clearJoystickInput,
      joystickCenter,
    ],
  );

  const handleMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!isDragging || !joystickCenter) return;
      if (activeTouchIdRef.current === null) return;

      // For touch events, only process if it's our tracked touch
      if ("touches" in e) {
        // Find the touch with our identifier
        const ourTouch = Array.from(e.touches).find(
          (touch) => touch.identifier === activeTouchIdRef.current,
        );
        if (!ourTouch) return; // Our touch is gone, but don't end yet (might be temporary)
      }

      e.preventDefault();
      e.stopPropagation();
      const pos = getPositionFromEvent(
        e,
        activeTouchIdRef.current,
        joystickCenter,
      );
      setPosition(pos);
      const maxDistance = JOYSTICK_BASE_RADIUS - JOYSTICK_HANDLE_RADIUS;
      const normalizedX = pos.x / maxDistance;
      const normalizedY = pos.y / maxDistance; // Removed inversion
      setJoystickInput(normalizedX, normalizedY);
    },
    [isDragging, joystickCenter, getPositionFromEvent, setJoystickInput],
  );

  const handleEnd = useCallback(
    (e?: TouchEvent | MouseEvent) => {
      // For touch events, only end if it's our tracked touch
      if (e && "changedTouches" in e) {
        const touchEvent = e as TouchEvent;
        if (activeTouchIdRef.current === null) return;

        // Check if the ended touch is our tracked touch
        const ourTouch = Array.from(touchEvent.changedTouches).find(
          (touch) => touch.identifier === activeTouchIdRef.current,
        );
        if (!ourTouch) return; // Not our touch, ignore
      }

      // Only end if we have an active touch (mouse uses -1)
      if (activeTouchIdRef.current === null) return;

      setIsDragging(false);
      setPosition({ x: 0, y: 0 });
      setJoystickCenter(null);
      activeTouchIdRef.current = null;
      clearJoystickInput();
    },
    [clearJoystickInput],
  );

  useEffect(() => {
    // Create a full-screen touch area for bottom half
    const touchArea = document.createElement("div");
    touchArea.style.position = "fixed";
    touchArea.style.bottom = "0";
    touchArea.style.left = "0";
    touchArea.style.right = "0";
    touchArea.style.height = "50%";
    touchArea.style.zIndex = "5";
    touchArea.style.pointerEvents = "auto";
    touchArea.style.touchAction = "none";
    document.body.appendChild(touchArea);

    touchArea.addEventListener("mousedown", handleStart);
    touchArea.addEventListener("touchstart", handleStart, { passive: false });
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchend", handleEnd, { passive: false });
    window.addEventListener("touchcancel", handleEnd, { passive: false });

    return () => {
      touchArea.removeEventListener("mousedown", handleStart);
      touchArea.removeEventListener("touchstart", handleStart);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
      document.body.removeChild(touchArea);
    };
  }, [handleStart, handleMove, handleEnd]);

  if (!defaultPosition) return null;

  const currentCenter = joystickCenter || defaultPosition;

  return (
    <div className="fixed inset-0 z-[5] touch-none pointer-events-none">
      {/* Faint joystick outline when not active */}
      {!isDragging && !joystickCenter && (
        <>
          {/* Joystick Base Outline */}
          <div
            className="absolute rounded-full border border-white/15 bg-black/10 backdrop-blur-sm pointer-events-none"
            style={{
              left: `${defaultPosition.x}px`,
              top: `${defaultPosition.y}px`,
              width: `${JOYSTICK_SIZE}px`,
              height: `${JOYSTICK_SIZE}px`,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 10px rgba(255, 255, 255, 0.1)",
            }}
          />
          {/* Joystick Handle Outline */}
          <div
            className="absolute rounded-full border border-white/15 bg-white/10 pointer-events-none"
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
      {joystickCenter && (
        <div
          ref={containerRef}
          className="absolute rounded-full border-2 border-white/40 bg-black/30 backdrop-blur-sm pointer-events-none"
          style={{
            left: `${currentCenter.x}px`,
            top: `${currentCenter.y}px`,
            width: `${JOYSTICK_SIZE}px`,
            height: `${JOYSTICK_SIZE}px`,
            transform: "translate(-50%, -50%)",
            boxShadow: isDragging
              ? "0 0 20px rgba(255, 255, 255, 0.3)"
              : "0 0 10px rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Joystick Handle */}
          <div
            className="absolute rounded-full bg-white/60 border-2 border-white/80 transition-all duration-75"
            style={{
              width: `${JOYSTICK_HANDLE_RADIUS * 2}px`,
              height: `${JOYSTICK_HANDLE_RADIUS * 2}px`,
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              boxShadow: isDragging
                ? "0 0 15px rgba(255, 255, 255, 0.5)"
                : "0 0 8px rgba(255, 255, 255, 0.3)",
            }}
          />
        </div>
      )}
    </div>
  );
}
