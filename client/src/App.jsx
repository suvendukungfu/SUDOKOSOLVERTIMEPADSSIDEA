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
      <UploadZone />
      <SudokuGrid />
      <NumberPad />
      <Controls />
    </div>
  );
}
