"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { useGameStore } from "../store/gameStore";

export function JumpButton() {
  const setJumpPressed = useGameStore((state) => state.setJumpPressed);
  const graceOrbs = useGameStore((state) => state.graceOrbs);
  const [isPressed, setIsPressed] = useState(false);
  const activeTouchIdRef = useRef<number | null>(null);

  const handleStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if ("touches" in e && e.changedTouches.length > 0) {
        activeTouchIdRef.current = e.changedTouches[0].identifier;
      } else {
        activeTouchIdRef.current = -1;
      }

      setIsPressed(true);
      setJumpPressed(true);

      // Auto-release after a short time (tap to jump)
      setTimeout(() => {
        setJumpPressed(false);
      }, 100);
    },
    [setJumpPressed],
  );

  const handleEnd = useCallback((e?: TouchEvent | MouseEvent) => {
    if (e && "changedTouches" in e) {
      const touchEvent = e as TouchEvent;
      const ourTouch = Array.from(touchEvent.changedTouches).find(
        (touch) => touch.identifier === activeTouchIdRef.current,
      );
      if (!ourTouch) return;
    }

    setIsPressed(false);
    activeTouchIdRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchend", handleEnd, { passive: false });
    window.addEventListener("touchcancel", handleEnd, { passive: false });

    return () => {
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchend", handleEnd);
      window.removeEventListener("touchcancel", handleEnd);
    };
  }, [handleEnd]);

  return (
    <div
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      className="fixed bottom-0 right-0 z-[10] touch-none select-none cursor-pointer flex items-center justify-center"
      style={{
        width: "50%",
        height: "50%",
      }}
    >
      {/* Visual button */}
      <div
        className={`
          w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center
          transition-all duration-100 pointer-events-none
          ${
            isPressed
              ? "bg-amber-400/40 border-amber-300 scale-95 shadow-lg shadow-amber-500/50"
              : "bg-black/20 border-amber-300/40 backdrop-blur-sm"
          }
        `}
        style={{
          boxShadow: isPressed
            ? "0 0 30px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(255, 215, 0, 0.2)"
            : "0 0 15px rgba(255, 215, 0, 0.1)",
        }}
      >
        {/* Rocket icon */}
        <div className="text-4xl mb-1">🚀</div>
        <div
          className={`text-sm font-bold uppercase tracking-wider ${
            isPressed ? "text-amber-200" : "text-amber-300/60"
          }`}
        >
          Jump
        </div>

        {/* Grace orb indicator */}
        {graceOrbs > 0 && (
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border-2 border-amber-200 flex items-center justify-center shadow-lg shadow-amber-500/50">
            <span className="text-white font-bold text-sm">{graceOrbs}</span>
          </div>
        )}
      </div>
    </div>
  );
}
