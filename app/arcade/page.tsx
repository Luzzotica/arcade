import Link from 'next/link';
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

export default function ArcadePage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Link href="/" className={styles.backLink}>
          ← Back to Home
        </Link>
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
              <div className={styles.playButton}>Play →</div>
            </Link>
          ))}
        </div>
      </div>
      <div className={styles.background}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={styles.floatingHex}
            style={{
              animationDelay: `${i * 0.2}s`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          >
            ⬡
          </div>
        ))}
      </div>
    </div>
  );
}
