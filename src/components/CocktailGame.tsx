import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { Trophy, RotateCcw, Play, AlertCircle } from 'lucide-react';

// --- Constants & Types ---

interface DrinkLevel {
  level: number;
  name: string;
  radius: number;
  color: string;
  imagePath: string;
}

const DRINK_LEVELS: DrinkLevel[] = [
  { 
    level: 1, name: 'Ice Level 1', radius: 20, color: '#4FC3F7',
    imagePath: '/item/ice_1.png'
  },
  { 
    level: 2, name: 'Ice Level 2', radius: 30, color: '#FFF176',
    imagePath: '/item/ice_2.png'
  },
  { 
    level: 3, name: 'Ice Level 3', radius: 40, color: '#81C784',
    imagePath: '/item/ice_3.png'
  },
  { 
    level: 4, name: 'Ice Level 4', radius: 50, color: '#BA68C8',
    imagePath: '/item/ice_4.png'
  },
  { 
    level: 5, name: 'Ice Level 5', radius: 60, color: '#FFB74D',
    imagePath: '/item/ice_5.png'
  },
  { 
    level: 6, name: 'Ice Level 6', radius: 70, color: '#FF7043',
    imagePath: '/item/ice_6.png'
  },
  { 
    level: 7, name: 'Ice Level 7', radius: 80, color: '#AB47BC',
    imagePath: '/item/ice_7.png'
  },
];

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const DANGER_LINE_Y = 480; // Aligned to white dashed line in image
const LAUNCH_Y = 540;
const WALL_THICKNESS = 50;
const TABLE_TOP_Y = 120; // Wood texture ends here (20% of height)
const TABLE_LEFT = 40;
const TABLE_RIGHT = 360;

// --- Main Component ---

export default function CocktailGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [nextFruitType, setNextFruitType] = useState<DrinkLevel>(DRINK_LEVELS[0]);
  const [previewX, setPreviewX] = useState(CANVAS_WIDTH / 2);
  const [previewY, setPreviewY] = useState(LAUNCH_Y);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);

  // Refs to track interaction state
  const isDraggingRef = useRef(false);
  const isFirstTimeRef = useRef(true);

  // Refs to avoid stale closures in the render loop
  const nextFruitTypeRef = useRef(nextFruitType);
  const previewXRef = useRef(previewX);
  const previewYRef = useRef(previewY);
  const isLaunchingRef = useRef(isLaunching);
  const imageCache = useRef<Map<number, HTMLImageElement>>(new Map());

  useEffect(() => {
    // Pre-cache ice images
    DRINK_LEVELS.forEach(level => {
      const img = new Image();
      img.onload = () => {
        imageCache.current.set(level.level, img);
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${level.imagePath}`);
      };
      img.src = level.imagePath;
    });
  }, []);

  useEffect(() => {
    // Check storage (web or WeChat)
    let firstTime = true;
    try {
      // @ts-ignore - Check for WeChat environment
      if (typeof wx !== 'undefined' && wx.getStorageSync) {
        // @ts-ignore
        const val = wx.getStorageSync('gelato_merge_first_time');
        if (val === 'false') firstTime = false;
      } else {
        const val = localStorage.getItem('gelato_merge_first_time');
        if (val === 'false') firstTime = false;
      }
    } catch (e) {
      console.error('Storage error', e);
    }
    setIsFirstTime(firstTime);
    isFirstTimeRef.current = firstTime;
  }, []);

  useEffect(() => { nextFruitTypeRef.current = nextFruitType; }, [nextFruitType]);
  useEffect(() => { previewXRef.current = previewX; }, [previewX]);
  useEffect(() => { previewYRef.current = previewY; }, [previewY]);
  useEffect(() => { isLaunchingRef.current = isLaunching; }, [isLaunching]);

  // Helper to get a random starting drink (Level 1-3)
  const getRandomDrink = () => {
    const level = Math.floor(Math.random() * 3) + 1;
    return DRINK_LEVELS.find(d => d.level === level)!;
  };

  // Initialize Physics Engine
  useEffect(() => {
    const engine = gameStarted && !gameOver ? Matter.Engine.create() : null;
    if (engine) {
      engine.gravity.y = 0;
      engineRef.current = engine;
    }

    if (gameStarted && !gameOver) {
      // Initialize the first fruit type
      setNextFruitType(getRandomDrink());

      const runner = Matter.Runner.create();
      runnerRef.current = runner;
      Matter.Runner.run(runner, engine!);

      // Add Walls
      const walls = [
        Matter.Bodies.rectangle(TABLE_LEFT - WALL_THICKNESS / 2, CANVAS_HEIGHT / 2, WALL_THICKNESS, CANVAS_HEIGHT, { isStatic: true, friction: 0.4, restitution: 0.15 }),
        Matter.Bodies.rectangle(TABLE_RIGHT + WALL_THICKNESS / 2, CANVAS_HEIGHT / 2, WALL_THICKNESS, CANVAS_HEIGHT, { isStatic: true, friction: 0.4, restitution: 0.15 }),
        Matter.Bodies.rectangle(CANVAS_WIDTH / 2, TABLE_TOP_Y - WALL_THICKNESS / 2, CANVAS_WIDTH, WALL_THICKNESS, { isStatic: true, friction: 0.4, restitution: 0.1 }),
        Matter.Bodies.rectangle(CANVAS_WIDTH / 2, CANVAS_HEIGHT + WALL_THICKNESS / 2, CANVAS_WIDTH, WALL_THICKNESS, { isStatic: true, friction: 0.4, restitution: 0.15 }),
      ];
      Matter.World.add(engine.world, walls);

      // Collision Handling for Merging
      Matter.Events.on(engine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
          const bodyA = pair.bodyA as any;
          const bodyB = pair.bodyB as any;

          if (bodyA.drinkLevel && bodyB.drinkLevel && bodyA.drinkLevel === bodyB.drinkLevel) {
            const currentLevel = bodyA.drinkLevel;
            if (currentLevel < 7) {
              const newLevel = currentLevel + 1;
              const midX = (bodyA.position.x + bodyB.position.x) / 2;
              const midY = (bodyA.position.y + bodyB.position.y) / 2;

              Matter.Composite.remove(engine.world, [bodyA, bodyB]);

              const nextLevelData = DRINK_LEVELS.find(d => d.level === newLevel)!;
              const newBody = createDrinkBody(midX, midY, nextLevelData);
              Matter.Composite.add(engine.world, newBody);

              setScore(prev => prev + (currentLevel * 10));
            }
          }
        });
      });
    }

    // --- WeChat Mini Program Adaptation Note ---
    // In a WeChat Mini Program, you would use:
    // 1. const query = wx.createSelectorQuery();
    // 2. query.select('#gameCanvas').fields({ node: true, size: true }).exec((res) => { ... });
    // 3. const canvas = res[0].node;
    // 4. const ctx = canvas.getContext('2d');
    // The Matter.js logic remains identical.
    // Use wx.onTouchStart, wx.onTouchMove, wx.onTouchEnd for input.

    // --- Background Rendering ---
    const drawBackground = (ctx: CanvasRenderingContext2D) => {
      const width = CANVAS_WIDTH;
      const height = CANVAS_HEIGHT;

      // Sky & Sea
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, width, height * 0.3);
      ctx.fillStyle = '#00BFFF';
      ctx.fillRect(0, height * 0.25, width, height * 0.1);
      
      // Sand
      ctx.fillStyle = '#F5DEB3';
      ctx.fillRect(0, height * 0.35, width, height * 0.65);

      // Beach Chairs (Striped)
      const drawChair = (x: number, y: number, color: string, angle: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = '#D2B48C'; // Wood frame
        ctx.fillRect(-20, -40, 40, 80);
        ctx.fillStyle = color; // Stripes
        for(let i = -35; i < 35; i += 10) {
          ctx.fillRect(-15, i, 30, 5);
        }
        ctx.restore();
      };
      drawChair(40, 400, '#FF4444', -0.2); // Red chair
      drawChair(width - 40, 400, '#4444FF', 0.2); // Blue chair

      // The Wooden Table
      ctx.fillStyle = '#DEB887';
      ctx.beginPath();
      ctx.moveTo(40, TABLE_TOP_Y);
      ctx.lineTo(width - 40, TABLE_TOP_Y);
      ctx.lineTo(width + 60, height);
      ctx.lineTo(-60, height);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      for(let i = 60; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, TABLE_TOP_Y);
        ctx.lineTo(i * 1.3 - 60, height);
        ctx.stroke();
      }
    };

    // Animation Loop
    let animationId: number;
    const render = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      // Clear
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Perspective Background
      drawBackground(ctx);

      // --- Visual Clipping for Table Area ---
      // This ensures items don't appear on the sand even if they slightly overlap walls
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(TABLE_LEFT, TABLE_TOP_Y);
      ctx.lineTo(TABLE_RIGHT, TABLE_TOP_Y);
      ctx.lineTo(CANVAS_WIDTH + 60, CANVAS_HEIGHT);
      ctx.lineTo(-60, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.clip();

      // 2. Draw Bodies (Already launched)
      const bodies = engineRef.current ? Matter.Composite.allBodies(engineRef.current.world) : [];
      
      // Sort bodies by Y position + radius for depth ordering (painter's algorithm)
      // Bodies lower on screen (higher Y) draw last so they appear on top
      const sortedBodies = bodies.filter((body: any) => !body.isStatic).sort((a: any, b: any) => {
        const levelA = DRINK_LEVELS.find(d => d.level === a.drinkLevel);
        const levelB = DRINK_LEVELS.find(d => d.level === b.drinkLevel);
        const depthA = (levelA?.radius || 0) + a.position.y;
        const depthB = (levelB?.radius || 0) + b.position.y;
        return depthA - depthB;
      });
      
      sortedBodies.forEach((body: any) => {
        const levelData = DRINK_LEVELS.find(d => d.level === body.drinkLevel);
        if (!levelData) return;

        // 1. Draw Ground Shadow (Entity sense)
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(body.position.x, body.position.y + levelData.radius * 0.7, levelData.radius * 0.6, levelData.radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(body.position.x, body.position.y);

        // 2. Draw image from cache
        const cachedImg = imageCache.current.get(levelData.level);
        if (cachedImg) {
          ctx.drawImage(cachedImg, -levelData.radius, -levelData.radius, levelData.radius * 2, levelData.radius * 2);
        } else {
          // Fallback if not cached yet
          ctx.fillStyle = levelData.color;
          ctx.beginPath();
          ctx.arc(0, 0, levelData.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Check Lose Condition
        // Game Over if body stops moving below the danger line (didn't make it into play area)
        const isSettled = Matter.Vector.magnitude(body.velocity) < 0.2;
        if (isSettled && body.position.y >= DANGER_LINE_Y && !body.launched) {
          body.launched = true; // Mark that we checked this body
          setGameOver(true);
        }
      });

      // 3. Draw Danger Line (White Decorative Line from Image)
      ctx.setLineDash([10, 5]);
      ctx.strokeStyle = isDraggingRef.current ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, DANGER_LINE_Y);
      ctx.lineTo(CANVAS_WIDTH, DANGER_LINE_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4. Draw Preview Drink, Finger, and Guide Line (Top Layer)
      if (!isLaunchingRef.current && !gameOver) {
        const currentNext = nextFruitTypeRef.current;
        
        // --- Tutorial Layer (Guide Line) ---
        if (isFirstTimeRef.current) {
          ctx.save();
          ctx.globalAlpha = 0.3; // Independent transparency for guide line
          ctx.setLineDash([8, 8]);
          ctx.strokeStyle = '#FFFFFF';
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(previewXRef.current, previewYRef.current);
          ctx.lineTo(previewXRef.current, 50); // Extend to top
          ctx.stroke();
          ctx.restore();
        }

        // Preview Shadow
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(previewXRef.current, previewYRef.current + currentNext.radius * 0.7, currentNext.radius * 0.6, currentNext.radius * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Preview Object (Opaque 1.0)
        ctx.save();
        ctx.globalAlpha = 1.0; 
        ctx.translate(previewXRef.current, previewYRef.current);
        
        const cachedPreview = imageCache.current.get(currentNext.level);
        if (cachedPreview) {
          ctx.drawImage(cachedPreview, -currentNext.radius, -currentNext.radius, currentNext.radius * 2, currentNext.radius * 2);
        } else {
          // Fallback
          ctx.fillStyle = currentNext.color;
          ctx.beginPath();
          ctx.arc(0, 0, currentNext.radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // --- Tutorial Layer (Finger Animation) ---
        if (isFirstTimeRef.current) {
          const time = Date.now() * 0.003;
          const animY = Math.sin(time) * 30; // Float up and down
          const opacity = 0.4 + Math.sin(time) * 0.2;
          
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.translate(previewXRef.current + 20, previewYRef.current + 40 + animY);
          
          // Draw a simple finger SVG-like shape
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(255,255,255,0.5)';
          
          // Palm/Hand base
          ctx.beginPath();
          ctx.roundRect(-15, 0, 30, 40, 10);
          ctx.fill();
          // Pointing finger
          ctx.beginPath();
          ctx.roundRect(-5, -35, 12, 40, 6);
          ctx.fill();
          
          // "Tap & Flick" text
          ctx.font = 'bold 10px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText('TAP & FLICK', 0, 55);
          
          ctx.restore();
        }
      }

      ctx.restore(); // End of Visual Clipping

      // Draw Canopy Edges (Top) - Occluding game objects for natural look
      ctx.fillStyle = '#FFFFFF';
      for(let i = 0; i < CANVAS_WIDTH; i += 60) {
        ctx.beginPath();
        ctx.arc(i + 30, 0, 40, 0, Math.PI);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      if (gameStarted && !gameOver && runnerRef.current && engineRef.current) {
        Matter.Runner.stop(runnerRef.current);
        Matter.Engine.clear(engineRef.current);
      }
    };
  }, [gameStarted, gameOver]);

  // Helper to create a drink body
  const createDrinkBody = (x: number, y: number, levelData: DrinkLevel) => {
    const body = Matter.Bodies.circle(x, y, levelData.radius, {
      restitution: 0.08, // Very low restitution - heavy collisions, minimal bounce
      friction: 0.4,    // Higher friction - more solid, less bouncy
      frictionAir: 0.05, // Slightly higher air resistance
      density: 0.012 * levelData.level, // Much higher density - heavy, weighty collisions
      label: `drink-${levelData.level}`,
    });
    (body as any).drinkLevel = levelData.level;
    return body;
  };

  // Handle Input
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameOver || isLaunching) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const radius = nextFruitType.radius;
    
    // Horizontal Constraints: Stay within table edges
    const clampedX = Math.max(radius + TABLE_LEFT, Math.min(TABLE_RIGHT - radius, x));
    
    // Vertical Constraints: MUST be BELOW the Danger Line
    // Min Y (Upper bound) is DANGER_LINE_Y + radius
    // Max Y (Lower bound) is CANVAS_HEIGHT - radius
    const clampedY = Math.max(DANGER_LINE_Y + radius, Math.min(CANVAS_HEIGHT - radius, y));
    
    setPreviewX(clampedX);
    setPreviewY(clampedY);
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameOver || isLaunching) return;
    isDraggingRef.current = true;
    // Update position immediately on start
    handleMouseMove(e);
  };

  const handleEnd = () => {
    if (gameOver || isLaunching || !isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    executeLaunch();
  };

  const executeLaunch = () => {
    if (gameOver || isLaunching || !engineRef.current) return;

    // Clear tutorial on first launch
    if (isFirstTimeRef.current) {
      setIsFirstTime(false);
      isFirstTimeRef.current = false;
      try {
        // @ts-ignore
        if (typeof wx !== 'undefined' && wx.setStorageSync) {
          // @ts-ignore
          wx.setStorageSync('gelato_merge_first_time', 'false');
        } else {
          localStorage.setItem('gelato_merge_first_time', 'false');
        }
      } catch (e) {}
    }

    setIsLaunching(true);
    // Use the current nextFruitType and current preview position for the physical entity
    const body = createDrinkBody(previewX, previewY, nextFruitType);
    (body as any).isLaunching = true;
    (body as any).hasEnteredPlay = false;

    Matter.Composite.add(engineRef.current.world, body);
    
    // Launch upwards with a FIXED velocity of -18
    Matter.Body.setVelocity(body, { x: 0, y: -18 });

    // Refresh nextFruitType IMMEDIATELY for the next round
    const newFruit = getRandomDrink();
    setNextFruitType(newFruit);

    // After a short time, it's no longer "launching"
    setTimeout(() => {
      (body as any).isLaunching = false;
      setIsLaunching(false);
    }, 800);
  };

  const resetGame = () => {
    if (engineRef.current) {
      const bodies = Matter.Composite.allBodies(engineRef.current.world);
      bodies.forEach(body => {
        if (!body.isStatic) {
          Matter.Composite.remove(engineRef.current!.world, body);
        }
      });
    }
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setNextFruitType(getRandomDrink());
    setPreviewX(CANVAS_WIDTH / 2);
    setPreviewY(LAUNCH_Y);
    setIsFirstTime(false);
    isFirstTimeRef.current = false;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1a1a] text-white p-4 font-sans">
      {/* Header */}
      <div className="w-full max-w-[400px] flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">BEACH GELATO</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">Premium Dessert Merge</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-white/10 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-xl font-mono font-bold">{score}</span>
          </div>
          <button 
            onClick={resetGame}
            className="bg-slate-800/50 hover:bg-slate-700/50 px-3 py-2 rounded-xl border border-white/10 flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold">Reset</span>
          </button>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-900" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
        {!gameStarted && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm">
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Play className="w-12 h-12 text-white fill-current" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Ready for Dessert?</h2>
            <p className="text-slate-400 text-center px-8 mb-8">
              Slide to aim, release to launch. Merge identical sundaes to create the Ultimate Giant Sundae!
            </p>
            <button 
              onClick={() => setGameStarted(true)}
              className="px-8 py-3 bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-full transition-all transform hover:scale-105 active:scale-95"
            >
              START SERVING
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-md">
            <AlertCircle className="w-20 h-20 text-white mb-4" />
            <h2 className="text-4xl font-black mb-2">GAME OVER</h2>
            <p className="text-xl mb-6">Final Score: <span className="font-bold">{score}</span></p>
            <button 
              onClick={resetGame}
              className="flex items-center gap-2 px-8 py-4 bg-white text-red-600 font-bold rounded-full hover:bg-slate-100 transition-all transform hover:scale-105"
            >
              <RotateCcw className="w-5 h-5" />
              TRY AGAIN
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseDown={handleStart}
          onMouseUp={handleEnd}
          onTouchStart={handleStart}
          onTouchEnd={handleEnd}
          className="cursor-crosshair touch-none"
        />

        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2">
          <div className="bg-blue-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-blue-500/30 text-[10px] uppercase tracking-tighter text-blue-400 flex items-center gap-2">
            <span className="opacity-70">NEXT:</span>
            <span className="font-bold">{nextFruitType.name}</span>
          </div>
        </div>
      </div>

      {/* Instructions / Legend */}
      <div className="mt-8 w-full max-w-[400px]">
        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Evolution Chain</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {DRINK_LEVELS.map((level) => (
            <div 
              key={level.level}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold border border-white/5 shadow-inner transition-all ${nextFruitType.level === level.level ? 'ring-2 ring-blue-400 scale-110' : 'opacity-50'}`}
              style={{ backgroundColor: level.color }}
              title={level.name}
            >
              L{level.level}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6 text-slate-500 text-[10px] uppercase tracking-[0.2em] text-center">
        Built with Matter.js & React
      </div>
    </div>
  );
}
