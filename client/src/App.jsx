import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import "./styles/theme.css";
import "./styles/grid.css";
import "./styles/animations.css";

import UploadZone from "./components/UploadZone";
import SudokuGrid from "./components/SudokuGrid";
import NumberPad from "./components/NumberPad";
import Controls from "./components/Controls";

import { isValidMove } from "./utils/validation";
import { solveGrid } from "./utils/solverClient";

const emptyGrid = Array.from({ length: 9 }, () => Array(9).fill(null));

export default function App() {
  const [grid, setGrid] = useState(emptyGrid);
  const [selectedCell, setSelectedCell] = useState(null);
  const [invalidCells, setInvalidCells] = useState([]);
  const [lockedCells, setLockedCells] = useState([]);
  const [solvedCells, setSolvedCells] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const isLocked = (r, c) =>
    lockedCells.some(([lr, lc]) => lr === r && lc === c);

  const applyValue = (value) => {
    if (!selectedCell) return;

    const [row, col] = selectedCell;
    if (isLocked(row, col)) return; // block edit if given

    const newGrid = grid.map((r) => [...r]);
    newGrid[row][col] = value;

    // Remove from solved status if manually typing
    setSolvedCells(prev => prev.filter(([sr, sc]) => sr !== row || sc !== col));
    setError(null);

    // Validate if non-empty
    if (value !== null && value !== 0 && !isValidMove(newGrid, row, col, value)) {
      setInvalidCells((prev) => {
        // Only add if not already in array to prevent duplicates
        if (!prev.some(([ir,ic]) => ir === row && ic === col)) {
          return [...prev, [row, col]];
        }
        return prev;
      });
    } else {
      setInvalidCells((prev) => prev.filter(([ir,ic]) => ir !== row || ic !== col));
    }

    setGrid(newGrid);
  };

  // Process OCR extracted grid
  const handleGridExtracted = (extractedGrid) => {
    setIsProcessing(false);
    
    // Transform formatting (0 -> null for UI)
    const formattedGrid = extractedGrid.map(row => row.map(cell => cell === 0 ? null : cell));
    setGrid(formattedGrid);
    
    // Auto-lock non-null cells as givens
    const locked = [];
    formattedGrid.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell !== null) locked.push([r, c]);
      })
    );
    setLockedCells(locked);
    setSolvedCells([]);
    setInvalidCells([]);
    setSelectedCell(null);
  };

  // Trigger Backend Solver
  const handleSolve = async () => {
    if (invalidCells.length > 0) {
      setError("Please fix invalid cells before solving.");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      // Backend expects 0s for empty spaces
      const requestGrid = grid.map(row => row.map(cell => cell === null ? 0 : cell));
      
      const solution = await solveGrid(requestGrid);
      
      // Determine which cells were filled by the AI
      const newlySolved = [];
      solution.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (grid[r][c] === null || grid[r][c] === 0) {
            newlySolved.push([r, c]);
          }
        });
      });

      // Format back to null (though solution shouldn't have any) and set
      setGrid(solution.map(row => row.map(c => c === 0 ? null : c)));
      setSolvedCells(newlySolved);
    } catch(err) {
      setError(err.message || "Failed to solve puzzle.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard input
  useEffect(() => {
    const handleKey = (e) => {
      if (!selectedCell) return;
      if (e.key >= "1" && e.key <= "9") applyValue(Number(e.key));
      if (e.key === "Backspace" || e.key === "Delete") applyValue(null);
      
      // Basic navigation
      const [r, c] = selectedCell;
      if (e.key === "ArrowUp" && r > 0) setSelectedCell([r - 1, c]);
      if (e.key === "ArrowDown" && r < 8) setSelectedCell([r + 1, c]);
      if (e.key === "ArrowLeft" && c > 0) setSelectedCell([r, c - 1]);
      if (e.key === "ArrowRight" && c < 8) setSelectedCell([r, c + 1]);
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedCell, grid, lockedCells]);

  return (
    <div className="min-h-screen bg-[#111827] text-white flex flex-col items-center py-12 px-4 font-sans relative overflow-hidden">
      
      {/* Background Neon Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4fd1c5] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#9f7aea] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Left Column: UI Controls & Upload */}
        <div className="flex flex-col space-y-8">
          <div className="text-center lg:text-left">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black mb-4 tracking-tight"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4fd1c5] to-[#9f7aea]">AI Sudoku</span> Solver
            </motion.h1>
            <p className="text-gray-400 text-lg">
              Upload an image, snap a photo, or enter manually. Let AI do the heavy lifting instantly.
            </p>
          </div>

          <UploadZone 
            onGridReady={handleGridExtracted} 
            isProcessing={isProcessing}
          />

          <NumberPad onInput={applyValue} />

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-center font-medium shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              {error}
            </motion.div>
          )}

          <Controls
            isProcessing={isProcessing}
            onSolve={handleSolve}
            onLock={() => {
              const locked = [];
              grid.forEach((row, r) => row.forEach((cell, c) => { if (cell !== null) locked.push([r, c]); }));
              setLockedCells(locked);
            }}
            onReset={() => {
              setGrid(emptyGrid);
              setSelectedCell(null);
              setInvalidCells([]);
              setLockedCells([]);
              setSolvedCells([]);
              setError(null);
            }}
          />
        </div>

        {/* Right Column: The Grid */}
        <div className="flex justify-center items-center h-full pt-8 lg:pt-0">
          <SudokuGrid
            grid={grid}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            invalidCells={invalidCells}
            lockedCells={lockedCells}
            solvedCells={solvedCells}
          />
        </div>

      </div>
    </div>
  );
}
