import "./styles/theme.css";
import "./styles/grid.css";
import "./styles/animations.css";

import UploadZone from "./components/UploadZone";
import SudokuGrid from "./components/SudokuGrid";
import NumberPad from "./components/NumberPad";
import Controls from "./components/Controls";

export default function App() {
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
          <SudokuGrid />
          <NumberPad />
          <Controls />
        </div>
      </div>
    </div>
  );
}
