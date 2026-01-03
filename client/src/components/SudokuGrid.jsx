const emptyGrid = Array.from({ length: 9 }, () =>
  Array(9).fill("")
);

export default function SudokuGrid() {
  return (
    <div className="sudoku-grid">
      {emptyGrid.flat().map((_, index) => (
        <div key={index} className="cell" />
      ))}
    </div>
  );
}
