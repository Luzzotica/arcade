import { useState, useMemo, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import type { HexColor, HexModule } from '../store/gameStore';
import { HexGrid } from '../game/utils/HexGrid';
import { HEX_SIZE } from '../game/config';
import { BASE_STATS_DISPLAY } from '../game/config/SynergyConfig';
import { audioManager } from '../game/audio/AudioManager';

const hexGrid = new HexGrid(HEX_SIZE);

const COLOR_VALUES: Record<HexColor, string> = {
  RED: '#ff4757',
  GREEN: '#2ed573',
  YELLOW: '#ffa502',
  BLUE: '#3742fa',
  CYAN: '#00d9ff',
  ORANGE: '#ff8800',
};

// Use config values for descriptions
const COLOR_DESCRIPTIONS: Record<HexColor, { stat: string; ability: string }> = BASE_STATS_DISPLAY;

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

  const computedFill = isSlot ? 'rgba(255, 255, 255, 0.1)' : color;
  const computedOpacity = isSlot ? 0.6 : 0.85;

  return (
    <g 
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      className={`transition-all duration-200 ${isSlot ? 'hover:[&_polygon]:fill-white/25 hover:[&_polygon]:stroke-white/80 hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]' : ''}`}
    >
      <g 
        className={isSelected ? 'animate-[hex-pulse_1s_ease-in-out_infinite]' : ''} 
        style={isSelected ? { transformOrigin: '0px 0px' } : {}}
      >
        <polygon
          points={points}
          fill={computedFill}
          stroke={isSelected ? '#fff' : 'rgba(255, 255, 255, 0.5)'}
          strokeWidth={isSelected ? 3 : 1.5}
          opacity={computedOpacity}
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
    </g>
  );
}

export function ConstructionUI() {
  const ship = useGameStore((state) => state.ship);
  const pendingHex = useGameStore((state) => state.pendingHex);
  const pendingHexChoices = useGameStore((state) => state.pendingHexChoices);
  const attachHex = useGameStore((state) => state.attachHex);
  const setConstructionMode = useGameStore((state) => state.setConstructionMode);
  const selectHexChoice = useGameStore((state) => state.selectHexChoice);
  
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // If we have choices, show the choice selection UI
  const showChoices = pendingHexChoices && pendingHexChoices.length > 0 && !pendingHex;
  
  // Play level-up SFX when the choice screen first appears
  const prevShowChoices = useRef(false);
  useEffect(() => {
    if (showChoices && !prevShowChoices.current) {
      audioManager.playSFX('levelup');
    }
    prevShowChoices.current = !!showChoices;
  }, [showChoices]);

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
    audioManager.playSFX('ui-click');
    setSelectedSlot(key);
  };

  const handleConfirm = () => {
    if (selectedSlot && pendingHex) {
      audioManager.playSFX('ui-click');
      attachHex(selectedSlot, pendingHex);
    }
  };

  const handleHexChoice = (index: number) => {
    audioManager.playSFX('ui-click');
    selectHexChoice(index);
  };
  
  const handleHover = () => {
    audioManager.playSFX('ui-hover');
  };

  // For testing: allow selecting a random hex color if no pending hex
  const testHex: HexModule = pendingHex || {
    type: 'MODULE',
    color: 'GREEN',
    health: 100,
  };

  // Show hex choice selection screen
  if (showChoices) {
    return (
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-[rgba(10,10,20,0.95)] backdrop-blur-sm flex justify-center items-center z-[100] animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-gradient-to-br from-[rgba(30,30,50,0.95)] to-[rgba(20,20,35,0.98)] border-2 border-white/15 rounded-2xl p-6 md:p-8 min-w-[320px] md:min-w-[500px] max-w-[90vw] shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(100,100,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <h2 className="font-orbitron text-2xl md:text-3xl font-bold text-white text-center m-0 mb-2 tracking-[2px] md:tracking-[4px] drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">LEVEL UP!</h2>
          <p className="font-orbitron text-xs md:text-sm text-white/50 text-center m-0 mb-6 tracking-wide">Choose your new module</p>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-5 mt-5">
            {pendingHexChoices.map((hex, index) => (
              <button
                key={index}
                className="bg-white/5 border-3 rounded-2xl p-4 md:p-6 min-w-[140px] md:min-w-[160px] cursor-pointer transition-all flex flex-col items-center text-center hover:bg-white/15 hover:-translate-y-2 hover:shadow-[0_15px_40px_rgba(0,0,0,0.4)]"
                onClick={() => handleHexChoice(index)}
                onMouseEnter={handleHover}
                style={{ borderColor: COLOR_VALUES[hex.color] }}
              >
                <div 
                  className="text-5xl md:text-6xl mb-4 drop-shadow-[0_0_15px_currentColor]"
                  style={{ color: COLOR_VALUES[hex.color] }}
                >
                  ⬢
                </div>
                <div className="font-orbitron text-base md:text-lg font-bold text-white tracking-wide mb-3">{hex.color}</div>
                <div className="font-orbitron text-xs text-[#2ed573] mb-1.5">{COLOR_DESCRIPTIONS[hex.color].stat}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 bottom-0 bg-[rgba(10,10,20,0.95)] backdrop-blur-sm flex justify-center items-center z-[100] animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-gradient-to-br from-[rgba(30,30,50,0.95)] to-[rgba(20,20,35,0.98)] border-2 border-white/15 rounded-2xl p-6 md:p-8 min-w-[320px] md:min-w-[500px] max-w-[90vw] shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(100,100,255,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h2 className="font-orbitron text-2xl md:text-3xl font-bold text-white text-center m-0 mb-2 tracking-[2px] md:tracking-[4px] drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">CONSTRUCTION MODE</h2>
        <p className="font-orbitron text-xs md:text-sm text-white/50 text-center m-0 mb-6 tracking-wide">Select a slot to attach the new module</p>
        
        {/* Ship Preview */}
        <div className="bg-black/40 rounded-xl p-5 mb-6 border border-white/10">
          <svg 
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            className="w-full h-[200px] md:h-[250px] block"
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
        <div className="flex items-center gap-4 p-4 bg-black/30 rounded-lg mb-6">
          <div 
            className="px-4 py-2 rounded-md font-orbitron text-sm font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
            style={{ backgroundColor: COLOR_VALUES[testHex.color] }}
          >
            {testHex.color}
          </div>
          <div className="flex-1">
            <div className="font-orbitron text-sm text-[#2ed573]">{COLOR_DESCRIPTIONS[testHex.color].stat}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center items-center">
          <button 
            className="font-orbitron text-sm font-bold px-8 py-3.5 border-none rounded-lg cursor-pointer uppercase tracking-[2px] transition-all min-h-[44px] bg-gradient-to-r from-[#2ed573] to-[#1abc9c] text-white shadow-[0_4px_20px_rgba(46,213,115,0.4)] hover:bg-gradient-to-r hover:from-[#3ae374] hover:to-[#26d9a4] hover:-translate-y-0.5 hover:shadow-[0_6px_25px_rgba(46,213,115,0.5)] active:translate-y-0.5 disabled:bg-[rgba(100,100,100,0.3)] disabled:text-white/30 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
            onClick={handleConfirm}
            onMouseEnter={handleHover}
            disabled={!selectedSlot}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}
