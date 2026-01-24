// Boss dialogue data - witty exchanges about hexagon superiority
// Each boss has multiple dialogue sets that are randomly chosen

export type BossShape = 'CIRCLE' | 'TRIANGLE' | 'SQUARE' | 'PENTAGON' | 'SEPTAGON';

export interface BossDialogue {
  boss: string;
  player: string;
}

export interface BossInfo {
  name: string;
  shape: BossShape;
  dialogues: BossDialogue[];
}

export const BOSS_INFO: Record<BossShape, BossInfo> = {
  CIRCLE: {
    name: 'The Infinite One',
    shape: 'CIRCLE',
    dialogues: [
      {
        boss: "Behold my infinite perfection! No beginning, no end!",
        player: "Infinite... emptiness. Hexagons maximize area with minimum perimeter. You're just wasted space."
      },
      {
        boss: "I have no weak points! My symmetry is absolute!",
        player: "You also have no tessellation. Ever tried tiling a floor with circles? Gaps everywhere."
      },
      {
        boss: "Wheels, coins, planets - the universe chose ME!",
        player: "Bees chose hexagons for honeycomb. Nature's best engineers disagree with the universe."
      },
      {
        boss: "My curves are mathematically elegant!",
        player: "Elegant but inefficient. Pack circles together and you waste 21% of space. Hexagons? Zero waste."
      },
      {
        boss: "Pi makes me special! An infinite, transcendental number!",
        player: "Cool story. My 120-degree angles distribute stress perfectly. What does pi do for structural integrity?"
      }
    ]
  },
  
  TRIANGLE: {
    name: 'The Triad',
    shape: 'TRIANGLE',
    dialogues: [
      {
        boss: "Three is the magic number! The strongest shape in engineering!",
        player: "For bridges, maybe. For honeycombs, storage, and efficiency? Hexagons reign supreme."
      },
      {
        boss: "I am the foundation of all structures! Trusses worship me!",
        player: "And yet bees, who've been engineering for 100 million years, chose six sides. Not three."
      },
      {
        boss: "My angles are sharp! My points are deadly!",
        player: "Sharp angles concentrate stress at the vertices. My 120-degree angles distribute it evenly. Engineering 101."
      },
      {
        boss: "The pyramid of Giza was built with triangles!",
        player: "And honeycombs are built with hexagons. One stores treasure, the other stores life itself."
      },
      {
        boss: "Three vertices, three edges - minimalist perfection!",
        player: "Minimalist? You mean 'missing three sides worth of structural optimization.' Hexagons are complete."
      }
    ]
  },
  
  SQUARE: {
    name: 'The Grid Lord',
    shape: 'SQUARE',
    dialogues: [
      {
        boss: "Grids are everywhere! Cities, screens, chess boards - I am universal!",
        player: "Universal mediocrity. Hexagonal grids have 21% less wasted space and equal distance to all neighbors."
      },
      {
        boss: "Four equal sides - perfect balance and symmetry!",
        player: "Perfect? Your 90-degree corners concentrate stress. My 120-degree angles distribute it evenly."
      },
      {
        boss: "I tile perfectly! No gaps, no overlaps!",
        player: "So do hexagons. But we also give each cell six neighbors instead of your measly four. More connections, better networks."
      },
      {
        boss: "Boxes, rooms, pixels - civilization runs on squares!",
        player: "Saturn has a hexagonal storm that's raged for centuries. The cosmos chose six sides."
      },
      {
        boss: "Right angles make calculations easy!",
        player: "Easy isn't optimal. Game designers use hex grids because movement is more natural. No diagonal cheating."
      }
    ]
  },
  
  PENTAGON: {
    name: 'The Golden One',
    shape: 'PENTAGON',
    dialogues: [
      {
        boss: "Five sides - I contain the golden ratio! Divine proportion flows through me!",
        player: "And yet you can't tile a plane without gaps. All that divine proportion, wasted on impracticality."
      },
      {
        boss: "The Pentagon building houses the world's mightiest military!",
        player: "Named for politics, not geometry. Bees house millions in hexagonal perfection."
      },
      {
        boss: "I'm so close to perfection! One more side than a square!",
        player: "Almost only counts in horseshoes. Five doesn't tessellate. Six does. Mathematics doesn't grade on a curve."
      },
      {
        boss: "Starfish, flowers, sand dollars - nature loves five!",
        player: "Nature loves five for symmetry. For BUILDING? Basalt columns, turtle shells, honeycombs - all hexagons."
      },
      {
        boss: "My interior angles are 108 degrees - so elegant!",
        player: "108 degrees can't tile. 120 degrees - my angles - tile perfectly. Elegance without function is just decoration."
      }
    ]
  },
  
  SEPTAGON: {
    name: 'The Overreacher',
    shape: 'SEPTAGON',
    dialogues: [
      {
        boss: "Seven sides! More than you! More is always better!",
        player: "More isn't better - it's overengineering. You can't even tile without gaps. I'm optimal, you're excessive."
      },
      {
        boss: "I am the ultimate polygon! Seven days in a week, seven wonders!",
        player: "Seven is culturally significant, not geometrically optimal. There's a reason there's no 'septagonal honeycomb.'"
      },
      {
        boss: "My angles are 128.57 degrees - mathematically unique!",
        player: "Uniquely useless for tessellation. My 120-degree angles are why I actually appear in nature."
      },
      {
        boss: "I have one more side than you! I am your superior!",
        player: "You're the polygon equivalent of a participation trophy. More sides doesn't mean better design."
      },
      {
        boss: "Seven vertices of power! Seven edges of destruction!",
        player: "And zero efficiency. Graphene - the strongest material known - is a hexagonal lattice. Not septagonal."
      }
    ]
  }
};

// Get a random dialogue for a boss
export function getRandomDialogue(shape: BossShape): BossDialogue {
  const info = BOSS_INFO[shape];
  const index = Math.floor(Math.random() * info.dialogues.length);
  return info.dialogues[index];
}

// Get boss name
export function getBossName(shape: BossShape): string {
  return BOSS_INFO[shape].name;
}

// Map boss number (1-5) to shape
export function getBossShapeFromNumber(bossNumber: number): BossShape {
  const shapes: BossShape[] = ['CIRCLE', 'TRIANGLE', 'SQUARE', 'PENTAGON', 'SEPTAGON'];
  return shapes[(bossNumber - 1) % 5];
}
