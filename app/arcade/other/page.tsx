import type { Metadata } from "next";
import Link from "next/link";
import { otherGames, otherGameHost } from "@/lib/otherGames";

// Shareable standalone page: www.sterlinglong.me/arcade/other
// Deliberately NOT linked from the site home — only from the arcade floor.
export const metadata: Metadata = {
  title: "Other Games · Partii Arcade",
  description: "A hand-picked shelf of other games to play in your browser — Block Brawl, Neon Drift, Ultimate Kart, and Sting.",
  openGraph: {
    title: "Other Games · Partii Arcade",
    description: "Block Brawl, Neon Drift, Ultimate Kart, and Sting — play them in your browser.",
  },
};

export default function OtherGamesPage() {
  return (
    <div className="relative w-full min-h-screen bg-[radial-gradient(ellipse_at_30%_20%,rgba(55,66,250,0.15)_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(255,71,87,0.1)_0%,transparent_50%),linear-gradient(180deg,#0a0a14_0%,#1a1a2e_50%,#0a0a14_100%)] p-5 pb-16 overflow-hidden">
      <div className="relative z-20 flex justify-between items-center max-w-[1200px] mx-auto mb-10">
        <Link
          href="/arcade"
          className="inline-block text-white/60 no-underline text-sm tracking-wider transition-colors hover:text-white/90"
        >
          ← Arcade
        </Link>
      </div>

      <div className="relative z-10 max-w-[900px] mx-auto">
        <h1 className="font-orbitron text-4xl md:text-5xl font-black tracking-[10px] mb-2 text-center bg-gradient-to-r from-white via-[#a8a8ff] to-white bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(100,100,255,0.5)]">
          Other Games
        </h1>
        <p className="font-orbitron text-base text-white/50 tracking-[4px] text-center mb-12 uppercase">
          The side shelf · played in your browser
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {otherGames.map((game) => (
            <a
              key={game.id}
              href={game.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white/5 border-2 border-white/10 rounded-2xl p-8 no-underline text-inherit transition-all hover:bg-white/10 hover:border-white/30 hover:-translate-y-1.5 hover:shadow-[0_16px_50px_rgba(0,0,0,0.4)] flex flex-col items-center text-center"
            >
              <span
                className="text-5xl mb-5 drop-shadow-[0_0_20px_rgba(100,100,255,0.5)]"
                aria-hidden
              >
                {game.icon}
              </span>
              <h2 className="font-orbitron text-2xl font-bold tracking-[3px] mb-2 text-white">
                {game.name}
              </h2>
              <p className="text-xs text-white/40 mb-6 break-all">{otherGameHost(game)}</p>
              <div
                className="font-orbitron text-sm font-bold tracking-[2px] transition-all group-hover:translate-x-1"
                style={{ color: game.color }}
              >
                Play →
              </div>
            </a>
          ))}
        </div>

        <p className="text-center text-white/30 text-xs mt-12 tracking-wider">
          These games live on their own sites — links open in a new tab.
        </p>
      </div>
    </div>
  );
}
