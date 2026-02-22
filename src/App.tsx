/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RotateCcw, 
  Trophy, 
  Clock, 
  Zap, 
  Pause, 
  Home,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { 
  GameMode, 
  GameStatus, 
  BlockData, 
  GRID_COLS, 
  GRID_ROWS, 
  INITIAL_ROWS, 
  TIME_LIMIT 
} from './types';

// Helper to generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper to generate a random number (1-9)
const getRandomValue = () => Math.floor(Math.random() * 9) + 1;

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [mode, setMode] = useState<GameMode>(GameMode.CLASSIC);
  const [grid, setGrid] = useState<(BlockData | null)[][]>([]);
  const [target, setTarget] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize the grid
  const initGame = useCallback((selectedMode: GameMode) => {
    const newGrid: (BlockData | null)[][] = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));
    
    // Fill initial rows from the bottom
    for (let r = GRID_ROWS - 1; r >= GRID_ROWS - INITIAL_ROWS; r--) {
      for (let c = 0; c < GRID_COLS; c++) {
        newGrid[r][c] = {
          id: generateId(),
          value: getRandomValue(),
          row: r,
          col: c
        };
      }
    }

    setGrid(newGrid);
    setMode(selectedMode);
    setStatus(GameStatus.PLAYING);
    setScore(0);
    setLevel(1);
    setTimeLeft(TIME_LIMIT);
    setSelectedIds([]);
    generateNewTarget(newGrid);
  }, []);

  // Generate a new target sum based on available blocks
  const generateNewTarget = (currentGrid: (BlockData | null)[][]) => {
    const flatBlocks = currentGrid.flat().filter(b => b !== null) as BlockData[];
    if (flatBlocks.length === 0) return;

    // Pick 2-4 random blocks to sum up for a realistic target
    const numToSum = Math.min(flatBlocks.length, Math.floor(Math.random() * 3) + 2);
    const shuffled = [...flatBlocks].sort(() => 0.5 - Math.random());
    const sum = shuffled.slice(0, numToSum).reduce((acc, b) => acc + b.value, 0);
    
    setTarget(sum);
  };

  // Add a new row from the bottom
  const addNewRow = useCallback(() => {
    setGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      
      // Check if top row has any blocks (Game Over)
      if (newGrid[0].some(b => b !== null)) {
        setStatus(GameStatus.GAMEOVER);
        return prev;
      }

      // Shift everything up
      for (let r = 0; r < GRID_ROWS - 1; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          newGrid[r][c] = newGrid[r + 1][c];
          if (newGrid[r][c]) {
            newGrid[r][c] = { ...newGrid[r][c]!, row: r };
          }
        }
      }

      // Add new row at the bottom
      for (let c = 0; c < GRID_COLS; c++) {
        newGrid[GRID_ROWS - 1][c] = {
          id: generateId(),
          value: getRandomValue(),
          row: GRID_ROWS - 1,
          col: c
        };
      }

      return newGrid;
    });
    
    if (mode === GameMode.TIME) {
      setTimeLeft(TIME_LIMIT);
    }
  }, [mode]);

  // Handle block click
  const handleBlockClick = (id: string) => {
    if (status !== GameStatus.PLAYING || isPaused) return;

    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  // Check sum when selectedIds changes
  useEffect(() => {
    const flatBlocks = grid.flat().filter(b => b !== null) as BlockData[];
    const selectedBlocks = flatBlocks.filter(b => selectedIds.includes(b.id));
    const currentSum = selectedBlocks.reduce((acc, b) => acc + b.value, 0);

    if (currentSum === target && target > 0) {
      // Success!
      setTimeout(() => {
        eliminateBlocks(selectedIds);
      }, 100);
    } else if (currentSum > target) {
      // Failed - over sum
      setSelectedIds([]);
    }
  }, [selectedIds, target, grid]);

  // Eliminate blocks and handle gravity
  const eliminateBlocks = (ids: string[]) => {
    setGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      
      // Remove blocks
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (newGrid[r][c] && ids.includes(newGrid[r][c]!.id)) {
            newGrid[r][c] = null;
          }
        }
      }

      // Apply gravity
      for (let c = 0; c < GRID_COLS; c++) {
        let emptyRow = GRID_ROWS - 1;
        for (let r = GRID_ROWS - 1; r >= 0; r--) {
          if (newGrid[r][c] !== null) {
            const block = newGrid[r][c]!;
            newGrid[r][c] = null;
            newGrid[emptyRow][c] = { ...block, row: emptyRow };
            emptyRow--;
          }
        }
      }

      return newGrid;
    });

    setScore(s => s + ids.length * 10);
    setSelectedIds([]);
    
    if (mode === GameMode.CLASSIC) {
      addNewRow();
    }
    
    // Generate new target after grid updates
    setTimeout(() => {
      setGrid(currentGrid => {
        generateNewTarget(currentGrid);
        return currentGrid;
      });
    }, 50);
  };

  // Timer for Time Mode
  useEffect(() => {
    if (status === GameStatus.PLAYING && mode === GameMode.TIME && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            addNewRow();
            return TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, mode, isPaused, addNewRow]);

  // Level progression
  useEffect(() => {
    const newLevel = Math.floor(score / 500) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
    }
  }, [score, level]);

  const getBlockColor = (value: number) => {
    const colors = [
      'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 
      'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 
      'bg-sky-500', 'bg-indigo-500', 'bg-violet-500'
    ];
    return colors[(value - 1) % colors.length];
  };

  if (status === GameStatus.MENU) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-md w-full"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              数字堆叠
            </h1>
            <p className="text-slate-400 font-medium tracking-widest">终极数字求和消除挑战</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => initGame(GameMode.CLASSIC)}
              className="group relative overflow-hidden bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-6 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-900/20"
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-left">
                  <span className="block text-xl font-bold">经典模式</span>
                  <span className="text-sm opacity-80">每次消除新增一行。努力生存。</span>
                </div>
                <Zap className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </div>
            </button>

            <button 
              onClick={() => initGame(GameMode.TIME)}
              className="group relative overflow-hidden bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-6 rounded-2xl transition-all duration-300 shadow-lg shadow-cyan-900/20"
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="text-left">
                  <span className="block text-xl font-bold">计时模式</span>
                  <span className="text-sm opacity-80">挑战倒计时。保持专注。</span>
                </div>
                <Clock className="w-8 h-8 group-hover:scale-110 transition-transform" />
              </div>
            </button>
          </div>

          <div className="pt-8 grid grid-cols-3 gap-4 text-slate-500">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-2">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-xs">防止触顶</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-2">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-xs">匹配求和</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="text-xs">挑战高分</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === GameStatus.GAMEOVER) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel p-12 text-center space-y-8 max-w-sm w-full"
        >
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-rose-500">游戏结束</h2>
            <p className="text-slate-400">方块堆积已触顶！</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <span className="block text-xs text-slate-500 uppercase tracking-wider">得分</span>
              <span className="text-2xl font-bold text-white">{score}</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <span className="block text-xs text-slate-500 uppercase tracking-wider">等级</span>
              <span className="text-2xl font-bold text-white">{level}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => initGame(mode)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              再试一次
            </button>
            <button 
              onClick={() => setStatus(GameStatus.MENU)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Home className="w-5 h-5" />
              主菜单
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center overflow-hidden touch-none">
      {/* Game Header */}
      <div className="w-full max-w-md px-4 pt-6 pb-4 space-y-4 z-20">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setStatus(GameStatus.MENU)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest">得分</span>
              <span className="text-xl font-black text-emerald-400">{score.toLocaleString()}</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="text-left">
              <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest">等级</span>
              <span className="text-xl font-black text-cyan-400">{level}</span>
            </div>
          </div>

          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </button>
        </div>

        {/* Target Display */}
        <div className="relative h-32 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 blur-2xl animate-pulse" />
          </div>
          <div className="relative text-center">
            <span className="block text-xs text-slate-500 uppercase font-bold tracking-[0.2em] mb-1">目标数字</span>
            <motion.span 
              key={target}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            >
              {target}
            </motion.span>
          </div>
        </div>

        {/* Time Bar (Time Mode Only) */}
        {mode === GameMode.TIME && (
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-cyan-500"
              initial={{ width: "100%" }}
              animate={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
        )}
      </div>

      {/* Game Grid */}
      <div className="flex-1 w-full max-w-md px-4 pb-8 relative">
        {/* Top Warning Line */}
        <div className="absolute top-0 left-4 right-4 h-[2px] bg-rose-500/30 z-10" />
        
        <div 
          className="grid gap-2 h-full"
          style={{ 
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`
          }}
        >
          {grid.map((row, r) => 
            row.map((block, c) => (
              <div key={`${r}-${c}`} className="relative aspect-square">
                <AnimatePresence mode="popLayout">
                  {block && (
                    <motion.div
                      layoutId={block.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: 1, 
                        opacity: 1,
                        y: 0
                      }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 300, 
                        damping: 25,
                        layout: { duration: 0.2 }
                      }}
                      onClick={() => handleBlockClick(block.id)}
                      className={`
                        absolute inset-0 number-block
                        ${getBlockColor(block.value)}
                        ${selectedIds.includes(block.id) ? 'ring-4 ring-white scale-95 z-10' : 'hover:brightness-110'}
                        shadow-lg shadow-black/20
                      `}
                    >
                      {block.value}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* Pause Overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="text-center space-y-6">
                <h3 className="text-3xl font-black text-white">已暂停</h3>
                <button 
                  onClick={() => setIsPaused(false)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition-colors"
                >
                  继续游戏
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-md px-6 py-4 flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          {mode === GameMode.CLASSIC ? '经典模式' : '计时模式'}
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw className="w-3 h-3 cursor-pointer hover:text-white" onClick={() => initGame(mode)} />
          重置游戏
        </div>
      </div>
    </div>
  );
}
