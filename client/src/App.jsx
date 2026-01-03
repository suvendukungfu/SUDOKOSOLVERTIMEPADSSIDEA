import { useEffect, useState } from "react";

import "./styles/theme.css";
import "./styles/grid.css";
import "./styles/animations.css";

import UploadZone from "./components/UploadZone";
import SudokuGrid from "./components/SudokuGrid";
import NumberPad from "./components/NumberPad";
import Controls from "./components/Controls";

import { isValidMove } from "./utils/validation";

const emptyGrid = Array.from({ length: 9 }, () =>
  Array(9).fill(null)
);

export default function App() {
  const [grid, setGrid] = useState(emptyGrid);
  const [selectedCell, setSelectedCell] = useState(null);
  const [invalidCells, setInvalidCells] = useState([]);

  // Handle number input (NumberPad + Keyboard)
  const applyValue = (value) => {
    if (!selectedCell) return;

    const [row, col] = selectedCell;
    const newGrid = grid.map((r) => [...r]);
    newGrid[row][col] = value;

    if (!isValidMove(newGrid, row, col, value)) {
      setInvalidCells([[row, col]]);
    } else {
      setInvalidCells([]);
    }

    setGrid(newGrid);
  };

  // Keyboard support
  useEffect(() => {
    const handleKey = (e) => {
      if (!selectedCell) return;

      if (e.key >= "1" && e.key <= "9") {
        applyValue(Number(e.key));
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        applyValue(null);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedCell, grid]);

  return (
    <div className="app-container">
      <div className="page">
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "36px", marginBottom: "8px" }}>
            ✨ <span style={{ color: "#4fd1c5" }}>Sudoku</span>{" "}
            <span style={{ color: "#9f7aea" }}>Solver</span>
          </h1>
          <p style={{ color: "#9ca3af" }}>
            Upload an image or enter manually • AI-powered digit recognition
          </p>
        </div>

        {/* Upload */}
        <UploadZone />

        {/* Sudoku Card */}
        <div className="card">
          <SudokuGrid
            grid={grid}
            selectedCell={selectedCell}
            onSelectCell={setSelectedCell}
            invalidCells={invalidCells}
          />

          <NumberPad onInput={applyValue} />

          <Controls
            onReset={() => {
              setGrid(emptyGrid);
              setSelectedCell(null);
              setInvalidCells([]);
            }}
          />
        </div>
      </div>
    </div>
  );
}
