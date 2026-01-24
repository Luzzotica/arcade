/**
 * HexGrid Utility Class
 * Uses Axial Coordinates (q, r) for hexagon positioning
 * Reference: https://www.redblobgames.com/grids/hexagons/
 */

export interface HexCoord {
  q: number;
  r: number;
}

export interface PixelCoord {
  x: number;
  y: number;
}

// The 6 axial direction vectors for pointy-top hexagons
export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },   // East
  { q: 1, r: -1 },  // Northeast
  { q: 0, r: -1 },  // Northwest
  { q: -1, r: 0 },  // West
  { q: -1, r: 1 },  // Southwest
  { q: 0, r: 1 },   // Southeast
];

export class HexGrid {
  private size: number; // Distance from center to corner (outer radius)

  constructor(hexSize: number = 32) {
    this.size = hexSize;
  }

  /**
   * Convert axial coordinates (q, r) to pixel coordinates (x, y)
   * For pointy-top hexagons
   */
  axialToPixel(hex: HexCoord): PixelCoord {
    const x = this.size * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
    const y = this.size * ((3 / 2) * hex.r);
    return { x, y };
  }

  /**
   * Convert pixel coordinates (x, y) to axial coordinates (q, r)
   * Returns the nearest hex
   */
  pixelToAxial(pixel: PixelCoord): HexCoord {
    const q = ((Math.sqrt(3) / 3) * pixel.x - (1 / 3) * pixel.y) / this.size;
    const r = ((2 / 3) * pixel.y) / this.size;
    return this.roundHex({ q, r });
  }

  /**
   * Round floating-point axial coordinates to the nearest hex
   * Uses cube coordinate conversion for accurate rounding
   */
  roundHex(hex: HexCoord): HexCoord {
    // Convert to cube coordinates
    const x = hex.q;
    const z = hex.r;
    const y = -x - z;

    // Round
    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    // Fix rounding errors
    const xDiff = Math.abs(rx - x);
    const yDiff = Math.abs(ry - y);
    const zDiff = Math.abs(rz - z);

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz;
    } else if (yDiff > zDiff) {
      ry = -rx - rz;
    } else {
      rz = -rx - ry;
    }

    return { q: rx, r: rz };
  }

  /**
   * Get all 6 neighboring hex coordinates
   */
  getNeighbors(hex: HexCoord): HexCoord[] {
    return HEX_DIRECTIONS.map((dir) => ({
      q: hex.q + dir.q,
      r: hex.r + dir.r,
    }));
  }

  /**
   * Get a specific neighbor by direction index (0-5)
   */
  getNeighbor(hex: HexCoord, direction: number): HexCoord {
    const dir = HEX_DIRECTIONS[direction % 6];
    return {
      q: hex.q + dir.q,
      r: hex.r + dir.r,
    };
  }

  /**
   * Calculate distance between two hexes
   */
  distance(a: HexCoord, b: HexCoord): number {
    // Convert to cube coordinates for distance calculation
    const ax = a.q;
    const az = a.r;
    const ay = -ax - az;

    const bx = b.q;
    const bz = b.r;
    const by = -bx - bz;

    return Math.max(
      Math.abs(ax - bx),
      Math.abs(ay - by),
      Math.abs(az - bz)
    );
  }

  /**
   * Get all hexes within a certain range
   */
  getHexesInRange(center: HexCoord, range: number): HexCoord[] {
    const results: HexCoord[] = [];
    
    for (let q = -range; q <= range; q++) {
      for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
        results.push({
          q: center.q + q,
          r: center.r + r,
        });
      }
    }
    
    return results;
  }

  /**
   * Convert hex coordinate to string key for Map/Dictionary storage
   */
  static toKey(hex: HexCoord): string {
    return `${hex.q},${hex.r}`;
  }

  /**
   * Parse string key back to hex coordinate
   */
  static fromKey(key: string): HexCoord {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }

  /**
   * Get the hex size
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Get the width of a pointy-top hexagon
   */
  getWidth(): number {
    return Math.sqrt(3) * this.size;
  }

  /**
   * Get the height of a pointy-top hexagon
   */
  getHeight(): number {
    return 2 * this.size;
  }

  /**
   * Check if a hex has all 6 neighbors of the same color (for Ring of Perfection)
   */
  checkSurrounded(
    centerHex: HexCoord,
    shipData: Map<string, { color: string }>,
    targetColor: string
  ): boolean {
    const neighbors = this.getNeighbors(centerHex);
    return neighbors.every((neighbor) => {
      const key = HexGrid.toKey(neighbor);
      const hex = shipData.get(key);
      return hex && hex.color === targetColor;
    });
  }
}

// Export singleton instance with default size
export const hexGrid = new HexGrid(32);
