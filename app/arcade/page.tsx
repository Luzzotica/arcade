'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserMenu } from '@/components/auth/UserMenu';
import { usePresence } from '@/lib/supabase/hooks';
import styles from './page.module.css';

const games = [
  {
    id: 'hexii',
    name: 'Hexii',
    description: 'Prove that Hexagons are the Bestagons. Build your hex cluster and survive!',
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
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/" className={styles.backLink}>
          ← Back to Home
        </Link>
        <div className={styles.headerRight}>
          {totalOnline > 0 && (
            <div className={styles.onlineIndicator}>
              <span className={styles.onlineDot} />
              {totalOnline} online
            </div>
          )}
          <UserMenu />
        </div>
      </div>
      <div className={styles.content}>
        <h1 className={styles.title}>Arcade</h1>
        <p className={styles.subtitle}>Select a game to play</p>
        <div className={styles.gamesGrid}>
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/arcade/${game.id}`}
              className={styles.gameCard}
            >
              <div className={styles.gameIcon}>⬡</div>
              <h2 className={styles.gameName}>{game.name}</h2>
              <p className={styles.gameDescription}>{game.description}</p>
              <div className={styles.cardStats}>
                {playersInGame.get(game.id) ? (
                  <span className={styles.playingNow}>
                    <span className={styles.statDot} />
                    {playersInGame.get(game.id)} playing now
                  </span>
                ) : null}
                {gameAnalytics[game.id]?.total_sessions ? (
                  <span className={styles.totalPlays}>
                    {gameAnalytics[game.id].total_sessions.toLocaleString()} total plays
                  </span>
                ) : null}
              </div>
              <div className={styles.playButton}>Play →</div>
            </Link>
          ))}
        </div>
      </div>
      <div className={styles.background}>
        {hexPositions.map((pos, i) => (
          <div
            key={i}
            className={styles.floatingHex}
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
