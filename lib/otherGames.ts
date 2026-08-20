/**
 * "Other Games" — externally hosted games shown in the arcade and on the
 * shareable /arcade/other page. These live on their own deployments (not
 * /arcade/<id> cabinets), so cards link straight out.
 */

export interface OtherGame {
  id: string;
  name: string;
  url: string;
  icon: string; // emoji
  color: string;
}

export const otherGames: OtherGame[] = [
  {
    id: "block-brawl",
    name: "Block Brawl",
    url: "https://block-brawl.vercel.app",
    icon: "🧱",
    color: "#ff6b35",
  },
  {
    id: "neon-drift",
    name: "Neon Drift",
    url: "https://neon-drift-one.vercel.app",
    icon: "🏎️",
    color: "#00e5ff",
  },
  {
    id: "ultimate-kart",
    name: "Ultimate Kart",
    url: "https://ultimate-kart.vercel.app",
    icon: "🏁",
    color: "#ffd166",
  },
  {
    id: "sting",
    name: "Sting",
    url: "https://sting-duel.vercel.app",
    icon: "🐝",
    color: "#f7d51d",
  },
];

/** Bare hostname for display under the name (e.g. "block-brawl.vercel.app"). */
export function otherGameHost(g: OtherGame): string {
  try {
    return new URL(g.url).hostname;
  } catch {
    return g.url;
  }
}
