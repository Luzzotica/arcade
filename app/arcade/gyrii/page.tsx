"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useGyriiStore } from "@/games/gyrii/store/gameStore";

// Dynamically import the game component with no SSR
const GyriiGame = dynamic(() => import("@/games/gyrii/components/Game"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-screen bg-black">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-cyan-400 text-xl font-bold">Loading Gyrii...</p>
      </div>
    </div>
  ),
});

export default function GyriiPage() {
  const [mounted, setMounted] = useState(false);
  const gameState = useGyriiStore((state) => state.gameState);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cyan-400 text-xl font-bold">Initializing...</p>
        </div>
      </div>
    );
  }

  // Only show back button when not playing
  const showBackButton = gameState !== "playing";

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black">
      {/* Back Button - only show when not playing */}
      {showBackButton && (
        <div className="absolute top-5 left-5 z-50">
          <Link
            href="/arcade"
            className="font-orbitron inline-block text-white/60 no-underline text-sm tracking-wider transition-colors hover:text-white/90"
          >
            ← Back to Arcade
          </Link>
        </div>
      )}

      <Suspense
        fallback={
          <div className="flex items-center justify-center w-full h-screen bg-black">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-cyan-400 text-xl font-bold">
                Loading Gyrii...
              </p>
            </div>
          </div>
        }
      >
        <GyriiGame />
      </Suspense>
    </main>
  );
}
