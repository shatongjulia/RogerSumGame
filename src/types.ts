import { Type } from "@google/genai";

export enum GameMode {
  CLASSIC = "CLASSIC",
  TIME = "TIME",
}

export enum GameStatus {
  MENU = "MENU",
  PLAYING = "PLAYING",
  GAMEOVER = "GAMEOVER",
}

export interface BlockData {
  id: string;
  value: number;
  row: number;
  col: number;
}

export interface GameState {
  grid: (BlockData | null)[][];
  target: number;
  selectedIds: string[];
  score: number;
  level: number;
  status: GameStatus;
  mode: GameMode;
  timeLeft: number;
}

export const GRID_COLS = 6;
export const GRID_ROWS = 10;
export const INITIAL_ROWS = 4;
export const TIME_LIMIT = 20; // seconds for time mode
