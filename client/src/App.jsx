import { useState } from "react";
import "./styles/theme.css";
import "./styles/grid.css";
import "./styles/animations.css";

import { isValidMove } from "./utils/validation";

import UploadZone from "./components/UploadZone";
import SudokuGrid from "./components/SudokuGrid";
import NumberPad from "./components/NumberPad";
import Controls from "./components/Controls";

export default function App() {
  const [grid, setGrid] = useState(
    Array.from({ length: 9 }, () => Array(9).fill(0))
  );
  const [invalidCells, setInvalidCells] = useState([]);

  const handleCellChange = (row, col, value) => {
    const newGrid = grid.map((r) => [...r]);
    newGrid[row][col] = value;

    if (!isValidMove(newGrid, row, col, value)) {
      setInvalidCells([[row, col]]);
    } else {
      setInvalidCells([]);
    }

    setGrid(newGrid);
  };

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
            invalidCells={invalidCells}
            onCellChange={handleCellChange}
          />
          <NumberPad />
          <Controls />
        </div>
      </div>
    </div>
  );
}
