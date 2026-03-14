import { useCallback, useEffect, useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";

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
  const [statusMessage, setStatusMessage] = useState("Upload a Sudoku image or start entering digits manually.");

  useEffect(() => {
    let mounted = true;
    let cleanup = () => {};

    const warmModel = () => {
      loadAIModel()
        .then(({ status }) => {
          if (mounted) {
            setModelStatus(status);
          }
        })
        .catch(() => {
          if (mounted) {
            setModelStatus("demo");
          }
        });
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(warmModel, { timeout: 1200 });
      cleanup = () => window.cancelIdleCallback(idleId);
    } else {
      const timer = window.setTimeout(warmModel, 200);
      cleanup = () => window.clearTimeout(timer);
    }

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  const MotionH1 = m.h1;
  const MotionDiv = m.div;

  const isLocked = useCallback((r, c) =>
    lockedCells.some(([lr, lc]) => lr === r && lc === c), [lockedCells]);

  const applyValue = useCallback((value) => {
    if (!selectedCell) return;

    const [row, col] = selectedCell;
    const cellIndex = row * 9 + col;
    if (isLocked(row, col)) return; // block edit if given

    const newGrid = grid.map((r) => [...r]);
    newGrid[row][col] = value;

    // Remove from solved status if manually typing
    setSolvedCells(prev => prev.filter(([sr, sc]) => sr !== row || sc !== col));
    setError(null);

    // Refresh all conflicts
    const allConflicts = findGridConflicts(newGrid);
    setInvalidCells(allConflicts);
    setStatusMessage(
      value === null
        ? `Cleared row ${row + 1}, column ${col + 1}.`
        : `Updated row ${row + 1}, column ${col + 1} to ${value}.`
    );
    setUncertainties((prev) => {
      if (!(cellIndex in prev)) return prev;
      const next = { ...prev };
      delete next[cellIndex];
      return next;
    });

    setGrid(newGrid);
  }, [grid, isLocked, selectedCell]);

  const handleProcessingStateChange = useCallback((active, message) => {
    setIsProcessing(active);
    if (active) {
      setError(null);
      if (message) {
        setStatusMessage(message);
      }
    }
  }, []);

  // Process OCR extracted grid
  const handleGridExtracted = (extractedGrid, uncertaintiesMap, statusObj) => {
    setIsProcessing(false);
    if (statusObj?.ocrStatus) setModelStatus(statusObj.ocrStatus);
    
    // Transform formatting (0 -> null for UI)
    const formattedGrid = extractedGrid.map(row => row.map(cell => cell === 0 ? null : cell));
    const uncertaintyCount = Object.keys(uncertaintiesMap || {}).length;
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
      setStatusMessage(
        `OCR finished with ${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} and ${uncertaintyCount} uncertain cell${uncertaintyCount === 1 ? "" : "s"}.`
      );
    } else {
      const givens = formattedGrid.flat().filter((cell) => cell !== null).length;
      setStatusMessage(
        uncertaintyCount > 0
          ? `Sudoku grid extracted with ${givens} filled cells. ${uncertaintyCount} OCR cell${uncertaintyCount === 1 ? "" : "s"} flagged as uncertain.`
          : `Sudoku grid extracted successfully with ${givens} filled cells.`
      );
    }

    setSelectedCell(null);
  };

  // Trigger Backend Solver
  const handleSolve = async () => {
    const filledCells = grid.flat().filter((cell) => cell !== null && cell !== 0).length;
    const autoCorrectionCandidates = Object.keys(uncertainties).length;
    if (filledCells === 0) {
      setError("Add a puzzle before requesting a solution.");
      return;
    }

    if (invalidCells.length > 0 && autoCorrectionCandidates === 0) {
      setError("Please fix invalid cells before solving.");
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setStatusMessage(
        autoCorrectionCandidates > 0
          ? "Solving puzzle and checking uncertain OCR digits..."
          : "Solving puzzle and validating the board..."
      );
      // Backend expects 0s for empty spaces
      const requestGrid = grid.map(row => row.map(cell => cell === null ? 0 : cell));
      
      const result = await solveGrid(requestGrid, uncertainties);
      const solution = result.solved;
      const corrections = result.corrections || [];
      
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
      setInvalidCells([]);
      setUncertainties({});
      setStatusMessage(
        corrections.length > 0
          ? `Solved successfully. Corrected ${corrections.length} uncertain OCR cell${corrections.length === 1 ? "" : "s"} and filled ${newlySolved.length} open cell${newlySolved.length === 1 ? "" : "s"}.`
          : `Solved successfully. ${newlySolved.length} cells were filled automatically.`
      );
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

  const filledCells = grid.flat().filter((cell) => cell !== null && cell !== 0).length;
  const remainingCells = 81 - filledCells;
  const conflictCount = invalidCells.length;
  const selectedLabel = selectedCell
    ? `Row ${selectedCell[0] + 1}, Column ${selectedCell[1] + 1}`
    : "No cell selected";

  const modelTone =
    modelStatus === "local"
      ? "text-emerald-300 border-emerald-400/30 bg-emerald-400/10"
      : modelStatus === "demo"
        ? "text-amber-200 border-amber-400/30 bg-amber-400/10"
        : "text-slate-200 border-white/10 bg-white/5";

  const resetBoard = () => {
    setGrid(emptyGrid);
    setSelectedCell(null);
    setInvalidCells([]);
    setLockedCells([]);
    setSolvedCells([]);
    setDebugImages(new Array(81).fill(null));
    setUncertainties({});
    setError(null);
    setStatusMessage("Board reset. Upload a new puzzle or enter one manually.");
  };

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-[#111827] text-white px-4 py-6 md:px-6 md:py-8 font-sans relative overflow-hidden">
      
      {/* Background Neon Gradients */}
      <div className="absolute top-[-8%] left-[-8%] h-72 w-72 bg-[#4fd1c5] rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-12%] right-[-8%] h-80 w-80 bg-[#9f7aea] rounded-full blur-[140px] opacity-10 pointer-events-none"></div>

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[28px] border border-white/10 bg-[#111827]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8">
            <MotionH1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-black tracking-tight sm:text-5xl"
            >
              <span className="text-transparent bg-clip-text bg-linear-to-r from-[#4fd1c5] to-[#9f7aea]">AI Sudoku</span> Solver
            </MotionH1>
            <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
              Capture a Sudoku from camera or file, review the OCR result, and correct any uncertain cells before solving.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Filled</p>
                <p className="mt-2 text-2xl font-semibold text-white">{filledCells}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Remaining</p>
                <p className="mt-2 text-2xl font-semibold text-white">{remainingCells}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Conflicts</p>
                <p className={`mt-2 text-2xl font-semibold ${conflictCount ? "text-rose-300" : "text-white"}`}>{conflictCount}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0f172a]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${modelTone}`}>
              {modelStatus === "loading" && "Model loading"}
              {modelStatus === "local" && "AI model ready"}
              {modelStatus === "demo" && "Demo mode"}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{statusMessage}</p>

            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="font-medium text-white">Selection</p>
                <p className="mt-1 text-slate-400">{selectedLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="font-medium text-white">Workflow</p>
                <p className="mt-1 text-slate-400">Upload, inspect highlighted conflicts, then solve. Arrow keys and number keys work for manual editing.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-[#111827]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Capture & Extract</h2>
                  <p className="mt-1 text-sm text-slate-400">Use a clean top-down photo for the best OCR accuracy.</p>
                </div>
                {isProcessing && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#4fd1c5]/20 bg-[#4fd1c5]/10 px-3 py-1 text-xs font-semibold text-[#4fd1c5]">
                    <span className="h-2 w-2 rounded-full bg-[#4fd1c5] animate-pulse"></span>
                    Working
                  </div>
                )}
              </div>

              <UploadZone 
                onGridReady={handleGridExtracted}
                onProcessingChange={handleProcessingStateChange}
                isProcessing={isProcessing}
              />
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#111827]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-6">
              <NumberPad onInput={applyValue} disabled={!selectedCell || isProcessing} />

              {error && (
                <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.12)]">
                  {error}
                </MotionDiv>
              )}

              <Controls
                isProcessing={isProcessing}
                canSolve={filledCells > 0}
                canLock={filledCells > 0}
                onSolve={handleSolve}
                onLock={() => {
                  const locked = [];
                  grid.forEach((row, r) => row.forEach((cell, c) => { if (cell !== null) locked.push([r, c]); }));
                  setLockedCells(locked);
                  setStatusMessage(`Locked ${locked.length} filled cells as givens.`);
                }}
                onReset={resetBoard}
                showDebug={showDebug}
                onToggleDebug={setShowDebug}
              />
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#0f172a]/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Puzzle Board</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Tap a cell to edit. Locked cells are OCR givens, violet cells were solved by the engine.
                </p>
              </div>
              <div className="text-sm text-slate-400">
                {selectedCell ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    Editing {selectedLabel}
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    Select a cell to start
                  </span>
                )}
              </div>
            </div>

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
      </div>
    </LazyMotion>
  );
}
