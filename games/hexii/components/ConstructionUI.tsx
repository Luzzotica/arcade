import { useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import type { HexColor, HexModule } from '../store/gameStore';
import { HexGrid } from '../game/utils/HexGrid';
import { HEX_SIZE } from '../game/config';
import './ConstructionUI.css';

const hexGrid = new HexGrid(HEX_SIZE);

const COLOR_VALUES: Record<HexColor, string> = {
  RED: '#ff4757',
  GREEN: '#2ed573',
  YELLOW: '#ffa502',
  BLUE: '#3742fa',
};

const COLOR_DESCRIPTIONS: Record<HexColor, { stat: string; ability: string }> = {
  RED: { stat: '+5% Global Damage', ability: 'Weapon: Shoots projectiles' },
  GREEN: { stat: '+10 Max HP', ability: 'Healer: HP regen, buffs bullet size' },
  YELLOW: { stat: '+5% Move Speed', ability: 'Thruster: Acceleration, buffs fire rate' },
  BLUE: { stat: '+10 Max Shield', ability: 'Barrier: Shield regen, buffs penetration' },
};

interface HexagonProps {
  x: number;
  y: number;
  color: string;
  size: number;
  isCore?: boolean;
  isSlot?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

function Hexagon({ x, y, color, size, isCore, isSlot, isSelected, onClick }: HexagonProps) {
  // Generate pointy-top hexagon points
  const points = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = size * Math.cos(angle);
      const py = size * Math.sin(angle);
      pts.push(`${px},${py}`);
    }
    return pts.join(' ');
  }, [size]);

  return (
    <g 
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className={`hex ${isSlot ? 'hex-slot' : ''} ${isSelected ? 'hex-selected' : ''}`}
    >
      <polygon
        points={points}
        fill={isSlot ? 'rgba(255, 255, 255, 0.1)' : color}
        stroke={isSelected ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
        strokeWidth={isSelected ? 3 : 1.5}
        opacity={isSlot ? 0.6 : 0.85}
      />
      {isCore && (
        <>
          <circle cx={0} cy={0} r={size * 0.3} fill="rgba(255,255,255,0.9)" />
          <circle cx={0} cy={0} r={size * 0.15} fill="#000" />
        </>
      )}
      {isSlot && (
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize={16}
          fontWeight="bold"
        >
          +
        </text>
      )}
    </g>
  );
}

export function ConstructionUI() {
  const ship = useGameStore((state) => state.ship);
  const pendingHex = useGameStore((state) => state.pendingHex);
  const attachHex = useGameStore((state) => state.attachHex);
  const setConstructionMode = useGameStore((state) => state.setConstructionMode);
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Calculate valid attachment points
  const validSlots = useMemo(() => {
    const occupied = new Set(Object.keys(ship));
    const slots: string[] = [];
    const checked = new Set<string>();
    
    Object.keys(ship).forEach((key) => {
      const coord = HexGrid.fromKey(key);
      const neighbors = hexGrid.getNeighbors(coord);
      
      neighbors.forEach((neighbor) => {
        const neighborKey = HexGrid.toKey(neighbor);
        if (!occupied.has(neighborKey) && !checked.has(neighborKey)) {
          checked.add(neighborKey);
          slots.push(neighborKey);
        }
      });
    });
    
    return slots;
  }, [ship]);

  // Calculate SVG viewBox to fit all hexes
  const viewBox = useMemo(() => {
    const allKeys = [...Object.keys(ship), ...validSlots];
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    allKeys.forEach((key) => {
      const coord = HexGrid.fromKey(key);
      const pixel = hexGrid.axialToPixel(coord);
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxY = Math.max(maxY, pixel.y);
    });
    
    const padding = HEX_SIZE * 2;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }, [ship, validSlots]);

  const handleSlotClick = (key: string) => {
    setSelectedSlot(key);
  };

  const handleConfirm = () => {
    if (selectedSlot && pendingHex) {
      attachHex(selectedSlot, pendingHex);
    }
  };

  const handleCancel = () => {
    setConstructionMode(false);
  };

  // For testing: allow selecting a random hex color if no pending hex
  const testHex: HexModule = pendingHex || {
    type: 'MODULE',
    color: 'GREEN',
    health: 100,
  };

  return (
    <div className="construction-overlay">
      <div className="construction-panel">
        <h2 className="construction-title">CONSTRUCTION MODE</h2>
        <p className="construction-subtitle">Select a slot to attach the new module</p>
        
        {/* Ship Preview */}
        <div className="ship-preview">
          <svg 
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            className="ship-svg"
          >
            {/* Render existing hexes */}
            {Object.entries(ship).map(([key, hex]) => {
              const coord = HexGrid.fromKey(key);
              const pixel = hexGrid.axialToPixel(coord);
              return (
                <Hexagon
                  key={key}
                  x={pixel.x}
                  y={pixel.y}
                  color={COLOR_VALUES[hex.color]}
                  size={HEX_SIZE - 2}
                  isCore={hex.type === 'CORE'}
                />
              );
            })}
            
            {/* Render valid slots */}
            {validSlots.map((key) => {
              const coord = HexGrid.fromKey(key);
              const pixel = hexGrid.axialToPixel(coord);
              const isSelected = key === selectedSlot;
              
              return (
                <Hexagon
                  key={`slot-${key}`}
                  x={pixel.x}
                  y={pixel.y}
                  color={isSelected ? COLOR_VALUES[testHex.color] : 'transparent'}
                  size={HEX_SIZE - 2}
                  isSlot={!isSelected}
                  isSelected={isSelected}
                  onClick={() => handleSlotClick(key)}
                />
              );
            })}
          </svg>
        </div>

        {/* New Hex Info */}
        <div className="new-hex-info">
          <div 
            className="hex-color-badge"
            style={{ backgroundColor: COLOR_VALUES[testHex.color] }}
          >
            {testHex.color}
          </div>
          <div className="hex-stats">
            <div className="hex-stat">{COLOR_DESCRIPTIONS[testHex.color].stat}</div>
            <div className="hex-ability">{COLOR_DESCRIPTIONS[testHex.color].ability}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="construction-actions">
          <button 
            className="btn btn-cancel"
            onClick={handleCancel}
          >
            CANCEL
          </button>
          <button 
            className="btn btn-confirm"
            onClick={handleConfirm}
            disabled={!selectedSlot}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}
