export default function SudokuGrid({
  grid,
  selectedCell,
  onSelectCell,
  invalidCells = [],
  lockedCells = [],
}) {
  const isLocked = (r, c) =>
    lockedCells.some(([lr, lc]) => lr === r && lc === c);

  return (
    <div className="sudoku-grid">
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const selected =
            selectedCell?.[0] === r && selectedCell?.[1] === c;

          const invalid = invalidCells.some(
            ([ir, ic]) => ir === r && ic === c
          );

          const locked = isLocked(r, c);

          return (
            <div
              key={`${r}-${c}`}
              className="cell"
              onClick={() => onSelectCell([r, c])}
              style={{
                background: locked
                  ? "rgba(79,209,197,0.15)" // cyan = given
                  : invalid
                  ? "rgba(239,68,68,0.25)" // red = conflict
                  : selected
                  ? "rgba(79,209,197,0.18)"
                  : "transparent",

                color: locked
                  ? "#4fd1c5"
                  : invalid
                  ? "#ef4444"
                  : "inherit",

                fontWeight: locked ? 600 : 400,
                cursor: locked ? "not-allowed" : "pointer",

                boxShadow: selected
                  ? "inset 0 0 0 2px rgba(79,209,197,0.6)"
                  : "none",
              }}
            >
              {cell}
            </div>
          );
        })
      )}
    </div>
  );
}
