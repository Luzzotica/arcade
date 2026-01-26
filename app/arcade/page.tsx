'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserMenu } from '@/components/auth/UserMenu';
import { usePresence } from '@/lib/supabase/hooks';

const games = [
  {
    id: 'hexii',
    name: 'Hexii',
    description: 'Prove that Hexagons are the Bestagons. Build your hex cluster and defeat the evil Septagon!',
    color: '#3742fa',
  },
  // Add more games here in the future
];

interface HexPosition {
  left: number;
  top: number;
}

interface GameAnalytics {
  total_sessions: number;
}

export default function ArcadePage() {
  const [hexPositions, setHexPositions] = useState<HexPosition[]>([]);
  const [gameAnalytics, setGameAnalytics] = useState<Record<string, GameAnalytics>>({});
  const { totalOnline, playersInGame } = usePresence();

  useEffect(() => {
    // Generate random positions only on client side
    setHexPositions(
      Array.from({ length: 15 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
      }))
    );

    // Fetch analytics for each game
    const fetchAnalytics = async () => {
      const analytics: Record<string, GameAnalytics> = {};
      for (const game of games) {
        try {
          const res = await fetch(`/api/analytics/${game.id}`);
          if (res.ok) {
            const data = await res.json();
            analytics[game.id] = data;
          }
        } catch (err) {
          console.error(`Failed to fetch analytics for ${game.id}:`, err);
        }
      }
      setGameAnalytics(analytics);
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="relative w-full min-h-screen bg-[radial-gradient(ellipse_at_30%_20%,rgba(55,66,250,0.15)_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(255,71,87,0.1)_0%,transparent_50%),linear-gradient(180deg,#0a0a14_0%,#1a1a2e_50%,#0a0a14_100%)] p-5 pb-10 overflow-hidden">
      <div className="relative z-20 flex justify-between items-center max-w-[1200px] mx-auto mb-10">
        <Link href="/" className="inline-block text-white/60 no-underline text-sm tracking-wider transition-colors hover:text-white/90">
          ← Back to Home
        </Link>
        <div className="flex items-center gap-4">
          {totalOnline > 0 && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span className="w-2 h-2 rounded-full bg-[#2ed573] shadow-[0_0_8px_#2ed573] animate-pulse" />
              {totalOnline} online
            </div>
          )}
          <UserMenu />
        </div>
      </div>
      <div className="relative z-10 max-w-[1200px] mx-auto">
        <h1 className="font-orbitron text-4xl md:text-5xl lg:text-6xl font-black tracking-[12px] mb-2 text-center bg-gradient-to-r from-white via-[#a8a8ff] to-white bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(100,100,255,0.5)]">
          Arcade
        </h1>
        <p className="font-orbitron text-base text-white/50 tracking-[4px] text-center mb-15 uppercase">
          Select a game to play
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-15">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/arcade/${game.id}`}
              className="bg-white/5 border-2 border-white/10 rounded-2xl p-8 md:p-10 no-underline text-inherit transition-all hover:bg-white/10 hover:border-white/30 hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)] flex flex-col items-center text-center"
            >
              <div className="text-6xl mb-6 drop-shadow-[0_0_20px_rgba(100,100,255,0.5)]">⬡</div>
              <h2 className="font-orbitron text-2xl md:text-3xl font-bold tracking-[4px] mb-4 text-white">
                {game.name}
              </h2>
              <p className="font-orbitron text-sm text-white/60 leading-relaxed mb-6 flex-grow">
                {game.description}
              </p>
              <div className="flex flex-col items-center gap-1.5 mt-auto mb-4 min-h-[40px]">
                {playersInGame.get(game.id) ? (
                  <span className="text-[13px] text-[#2ed573] flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2ed573] shadow-[0_0_6px_#2ed573] animate-pulse" />
                    {playersInGame.get(game.id)} playing now
                  </span>
                ) : null}
                {gameAnalytics[game.id]?.total_sessions ? (
                  <span className="text-xs text-white/40">
                    {gameAnalytics[game.id].total_sessions.toLocaleString()} total plays
                  </span>
                ) : null}
              </div>
              <div className="font-orbitron text-base font-bold tracking-[2px] text-white/80 transition-all group-hover:text-white group-hover:translate-x-1">
                Play →
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        {hexPositions.map((pos, i) => (
          <div
            key={i}
            className="absolute text-[60px] text-white/[0.03] animate-[float_20s_ease-in-out_infinite]"
            style={{
              animationDelay: `${i * 0.2}s`,
              left: `${pos.left}%`,
              top: `${pos.top}%`,
            }}
          >
            ⬡
          </div>
        ))}
      </div>
    </div>
  );
}
