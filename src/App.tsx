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
  ChevronLeft,
  Check
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

const createEmptyGrid = () => 
  Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(null));

export default function App() {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [mode, setMode] = useState<GameMode>(GameMode.CLASSIC);
  const [grid, setGrid] = useState<(BlockData | null)[][]>(createEmptyGrid());
  const [target, setTarget] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize the grid
  const initGame = useCallback((selectedMode: GameMode) => {
    const newGrid = createEmptyGrid();
    
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
      'rgba(251, 113, 133, 0.85)', // rose-400
      'rgba(251, 146, 60, 0.85)',  // orange-400
      'rgba(251, 191, 36, 0.85)',  // amber-400
      'rgba(52, 211, 153, 0.85)',  // emerald-400
      'rgba(45, 212, 191, 0.85)',  // teal-400
      'rgba(34, 211, 238, 0.85)',  // cyan-400
      'rgba(56, 189, 248, 0.85)',  // sky-400
      'rgba(129, 140, 248, 0.85)', // indigo-400
      'rgba(167, 139, 250, 0.85)'  // violet-400
    ];
    return colors[(value - 1) % colors.length];
  };

  const blockCount = grid.flat().filter(b => b !== null).length;
  const currentSum = grid.flat()
    .filter(b => b !== null && selectedIds.includes(b.id))
    .reduce((acc, b) => acc + (b?.value || 0), 0);
  const gap = target - currentSum;

  if (status === GameStatus.MENU) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-100 via-violet-50 to-purple-100">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-md w-full"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
              数字堆叠
            </h1>
            <p className="text-slate-600 font-medium tracking-widest">终极数字求和消除挑战</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => initGame(GameMode.CLASSIC)}
              className="group relative overflow-hidden bg-purple-600 hover:bg-purple-500 text-white px-8 py-6 rounded-2xl transition-all duration-300 shadow-lg shadow-purple-900/10"
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
              className="group relative overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-6 rounded-2xl transition-all duration-300 shadow-lg shadow-indigo-900/10"
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

          <div className="pt-8 grid grid-cols-3 gap-4 text-slate-400">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                <AlertCircle className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-xs">防止触顶</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                <Zap className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-xs">匹配求和</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center mb-2 shadow-sm">
                <Trophy className="w-5 h-5 text-purple-500" />
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-purple-50">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel p-12 text-center space-y-8 max-w-sm w-full"
        >
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-rose-500">游戏结束</h2>
            <p className="text-slate-600">方块堆积已触顶！</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
              <span className="block text-xs text-slate-400 uppercase tracking-wider">得分</span>
              <span className="text-2xl font-bold text-purple-600">{score}</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100">
              <span className="block text-xs text-slate-400 uppercase tracking-wider">等级</span>
              <span className="text-2xl font-bold text-purple-600">{level}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => initGame(mode)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <RotateCcw className="w-5 h-5" />
              再试一次
            </button>
            <button 
              onClick={() => setStatus(GameStatus.MENU)}
              className="w-full bg-white hover:bg-slate-50 text-slate-600 border border-purple-200 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
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
    <div className="min-h-screen bg-[#f5f3ff] flex flex-col items-center overflow-hidden touch-none">
      {/* Game Header & Target Combined */}
      <div className="w-full max-w-md px-4 pt-4 pb-2 z-20">
        <div className="flex items-center justify-between mb-2">
          <button 
            onClick={() => setStatus(GameStatus.MENU)}
            className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-slate-600"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 hover:bg-purple-100 rounded-lg transition-colors text-slate-600"
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </button>
        </div>

        <div className="flex items-center justify-between bg-white/50 rounded-2xl p-3 border border-purple-100 shadow-sm">
          {/* Target Display */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">目标数字</span>
            <div className="flex items-center gap-3">
              <motion.span 
                key={target}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-black text-purple-900 leading-none"
              >
                {target}
              </motion.span>
              <AnimatePresence mode="wait">
                {selectedIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    className="flex items-center"
                  >
                    <div className="flex flex-col items-start bg-purple-100 px-2 py-1 rounded-lg border border-purple-200 shadow-sm">
                      <span className="text-[8px] text-purple-400 uppercase font-bold leading-none mb-0.5">还差</span>
                      <span className="text-sm font-black text-purple-600 leading-none">{gap}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Stats Display */}
          <div className="flex items-center gap-4 pr-2">
            <div className="text-right">
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-widest">得分</span>
              <span className="text-xl font-black text-purple-600 leading-none">{score.toLocaleString()}</span>
            </div>
            <div className="h-8 w-[1px] bg-purple-200" />
            <div className="text-left">
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-widest">等级</span>
              <span className="text-xl font-black text-indigo-600 leading-none">{level}</span>
            </div>
          </div>
        </div>

        {/* Time Bar (Time Mode Only) */}
        {mode === GameMode.TIME && (
          <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden mt-3">
            <motion.div 
              className="h-full bg-indigo-500"
              initial={{ width: "100%" }}
              animate={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
        )}
      </div>

      {/* Game Grid */}
      <div className="flex-1 w-full max-w-md px-4 pb-6 flex flex-col min-h-0">
        <div className="relative flex-1 bg-white/90 rounded-2xl border border-purple-200 shadow-xl overflow-hidden">
          {/* Top Warning Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500/20 rounded-t-2xl z-30" />
          
          {/* Grid Container - Using Absolute Inset for guaranteed sizing */}
          <div 
            className="absolute inset-2 grid gap-1"
            style={{ 
              gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            }}
          >
            {grid.map((row, r) => 
              row.map((block, c) => (
                <div key={`cell-${r}-${c}`} className="relative bg-purple-50/50 rounded-sm border border-purple-100/50">
                  <AnimatePresence>
                    {block && (
                      <motion.div
                        key={block.id}
                        initial={{ opacity: 1, scale: 1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleBlockClick(block.id)}
                        style={{ 
                          backgroundColor: selectedIds.includes(block.id) ? 'rgba(148, 163, 184, 0.9)' : getBlockColor(block.value) 
                        }}
                        className={`
                          absolute inset-0.5 number-block z-10
                          ${selectedIds.includes(block.id) 
                            ? 'ring-4 ring-white z-20 shadow-xl scale-90' 
                            : 'hover:brightness-105 border-t border-white/30'}
                          cursor-pointer flex items-center justify-center shadow-sm overflow-hidden
                        `}
                      >
                        <AnimatePresence>
                          {selectedIds.includes(block.id) && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="absolute inset-0 bg-white/30 flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-white drop-shadow-md" strokeWidth={4} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <span className="relative z-10 text-lg sm:text-xl font-black text-white leading-none select-none drop-shadow-md">
                          {block.value}
                        </span>
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
                className="absolute inset-0 z-30 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-2xl"
              >
                <div className="text-center space-y-6">
                  <h3 className="text-3xl font-black text-purple-900">已暂停</h3>
                  <button 
                    onClick={() => setIsPaused(false)}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-xl font-bold transition-colors shadow-lg"
                  >
                    继续游戏
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-md px-6 py-4 flex justify-between items-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          {mode === GameMode.CLASSIC ? '经典模式' : '计时模式'}
          <span className="ml-2 opacity-50">({blockCount} 方块)</span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw className="w-3 h-3 cursor-pointer hover:text-purple-600" onClick={() => initGame(mode)} />
          重置游戏
        </div>
      </div>
    </div>
  );
}
