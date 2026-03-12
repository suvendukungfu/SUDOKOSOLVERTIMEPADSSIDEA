import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

import "./styles/theme.css";
import "./styles/grid.css";
import "./styles/animations.css";

import UploadZone from "./components/UploadZone";
import SudokuGrid from "./components/SudokuGrid";
import NumberPad from "./components/NumberPad";
import Controls from "./components/Controls";

import { findGridConflicts } from "./utils/validation";
import { solveGrid } from "./utils/solverClient";
import { loadAIModel } from "./utils/modelLoader";

const emptyGrid = Array.from({ length: 9 }, () => Array(9).fill(null));

export default function App() {
  const [grid, setGrid] = useState(emptyGrid);
  const [selectedCell, setSelectedCell] = useState(null);
  const [invalidCells, setInvalidCells] = useState([]);
  const [lockedCells, setLockedCells] = useState([]);
  const [solvedCells, setSolvedCells] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [modelStatus, setModelStatus] = useState("loading");
  const [uncertainties, setUncertainties] = useState({});
  const [debugImages, setDebugImages] = useState(new Array(81).fill(null));
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    loadAIModel().then(({ status }) => setModelStatus(status));
  }, []);

  const MotionH1 = motion.h1;
  const MotionDiv = motion.div;

  const isLocked = useCallback((r, c) =>
    lockedCells.some(([lr, lc]) => lr === r && lc === c), [lockedCells]);

  const applyValue = useCallback((value) => {
    if (!selectedCell) return;

    const [row, col] = selectedCell;
    if (isLocked(row, col)) return; // block edit if given

    const newGrid = grid.map((r) => [...r]);
    newGrid[row][col] = value;

    // Remove from solved status if manually typing
    setSolvedCells(prev => prev.filter(([sr, sc]) => sr !== row || sc !== col));
    setError(null);

    // Refresh all conflicts
    const allConflicts = findGridConflicts(newGrid);
    setInvalidCells(allConflicts);

    setGrid(newGrid);
  }, [grid, isLocked, selectedCell]);

  // Process OCR extracted grid
  const handleGridExtracted = (extractedGrid, uncertaintiesMap, statusObj) => {
    setIsProcessing(false);
    if (statusObj?.ocrStatus) setModelStatus(statusObj.ocrStatus);
    
    // Transform formatting (0 -> null for UI)
    const formattedGrid = extractedGrid.map(row => row.map(cell => cell === 0 ? null : cell));
    setGrid(formattedGrid);
    setUncertainties(uncertaintiesMap || {});
    setDebugImages(statusObj.debugImages || new Array(81).fill(null));
    
    // Auto-lock non-null cells as givens
    const locked = [];
    formattedGrid.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell !== null) locked.push([r, c]);
      })
    );
    setLockedCells(locked);
    setSolvedCells([]);
    
    // Auto-detect conflicts from OCR
    const conflicts = findGridConflicts(formattedGrid);
    setInvalidCells(conflicts);
    
    if (conflicts.length > 0) {
      setError("AI detected some conflicts in the image. Please verify highlighted cells.");
    }

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
      
      const solution = await solveGrid(requestGrid, uncertainties);
      
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
  }, [applyValue, selectedCell]);

  return (
    <div className="min-h-screen bg-[#111827] text-white flex flex-col items-center py-12 px-4 font-sans relative overflow-hidden">
      
      {/* Background Neon Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4fd1c5] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#9f7aea] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

      {/* Model Status Indicator */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1c23]/80 border border-gray-700 backdrop-blur-md shadow-lg">
        <span className="font-semibold text-sm">
          Model Status:{" "}
          {modelStatus === "loading" && <span className="text-gray-400">⏳ Loading...</span>}
          {modelStatus === "local" && <span className="text-green-400">✔ AI model loaded</span>}
          {modelStatus === "demo" && <span className="text-yellow-400">⚠ Running in demo mode</span>}
        </span>
      </div>

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Left Column: UI Controls & Upload */}
        <div className="flex flex-col space-y-8">
          <div className="text-center lg:text-left">
            <MotionH1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black mb-4 tracking-tight"
            >
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#4fd1c5] to-[#9f7aea]">AI Sudoku</span> Solver
            </MotionH1>
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
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-center font-medium shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              {error}
            </MotionDiv>
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
              setDebugImages(new Array(81).fill(null));
              setUncertainties({});
              setError(null);
            }}
            showDebug={showDebug}
            onToggleDebug={setShowDebug}
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
            debugImages={debugImages}
            showDebug={showDebug}
          />
        </div>

      </div>
    </div>
  );
}
