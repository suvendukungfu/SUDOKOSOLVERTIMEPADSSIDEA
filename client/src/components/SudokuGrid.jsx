import { m } from 'framer-motion';

export default function SudokuGrid({
  grid,
  selectedCell,
  onSelectCell,
  invalidCells = [],
  reviewCells = [],
  lockedCells = [],
  solvedCells = [],
  debugImages = [],
  showDebug = false
}) {
  const isLocked = (r, c) => lockedCells.some(([lr, lc]) => lr === r && lc === c);
  const isSolved = (r, c) => solvedCells.some(([sr, sc]) => sr === r && sc === c);
  const isInvalid = (r, c) => invalidCells.some(([ir, ic]) => ir === r && ic === c);
  const isReview = (r, c) => reviewCells.some(([rr, rc]) => rr === r && rc === c);
  const MotionButton = m.button;
  const MotionSpan = m.span;

  return (
    <div className="w-full max-w-[min(92vw,34rem)] mx-auto aspect-square bg-[#111827] rounded-[28px] border border-white/10 p-2 shadow-[0_0_25px_rgba(0,0,0,0.35)] overflow-hidden">
      <div className="grid grid-cols-9 grid-rows-9 h-full w-full">
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const selected = selectedCell?.[0] === r && selectedCell?.[1] === c;
            const locked = isLocked(r, c);
            const solved = isSolved(r, c);
            const invalid = isInvalid(r, c);
            const review = isReview(r, c);
            const sameRow = selectedCell?.[0] === r;
            const sameCol = selectedCell?.[1] === c;
            const sameBox = selectedCell
              ? Math.floor(selectedCell[0] / 3) === Math.floor(r / 3) &&
                Math.floor(selectedCell[1] / 3) === Math.floor(c / 3)
              : false;
            const related = !selected && selectedCell && (sameRow || sameCol || sameBox);

            // Calculate thicker borders for 3x3 blocks
            const borderRight = c % 3 === 2 && c !== 8 ? 'border-r-2 border-[#0b1220]' : 'border-r border-white/8';
            const borderBottom = r % 3 === 2 && r !== 8 ? 'border-b-2 border-[#0b1220]' : 'border-b border-white/8';

            return (
              <MotionButton
                key={`${r}-${c}`}
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: (r * 9 + c) * 0.005 }}
                onClick={() => onSelectCell([r, c])}
                aria-label={`Row ${r + 1}, column ${c + 1}${cell !== 0 && cell !== null ? `, value ${cell}` : ", empty"}`}
                className={`
                  relative flex items-center justify-center p-0 text-lg sm:text-xl md:text-2xl font-medium transition-colors select-none focus-visible:outline-none
                  ${borderRight} ${borderBottom}
                  ${related ? 'bg-white/5' : 'bg-[#162032]'}
                  ${locked ? 'text-[#67e8f9] font-bold' : ''}
                  ${solved ? 'text-[#c4b5fd] font-bold shadow-[inset_0_0_18px_rgba(159,122,234,0.18)]' : ''}
                  ${invalid ? 'bg-red-500/18 text-red-300 shadow-[inset_0_0_10px_rgba(239,68,68,0.35)]' : ''}
                  ${review && !invalid ? 'bg-amber-500/12 text-amber-200 shadow-[inset_0_0_10px_rgba(245,158,11,0.18)] ring-1 ring-inset ring-amber-400/35' : ''}
                  ${!locked && !solved && !invalid ? 'text-slate-100 hover:bg-white/8' : ''}
                  ${selected ? 'ring-2 ring-inset ring-[#4fd1c5] bg-[#4fd1c5]/18 shadow-[0_0_0_1px_rgba(79,209,197,0.25)]' : ''}
                `}
              >
                {showDebug && debugImages[r * 9 + c] && (
                  <img 
                    src={debugImages[r * 9 + c]} 
                    alt="AI View" 
                    className="absolute inset-0 w-full h-full opacity-50 pointer-events-none mix-blend-screen"
                  />
                )}
                {cell !== 0 && cell !== null ? (
                  <MotionSpan
                    initial={solved ? { scale: 0.5, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative z-10"
                  >
                    {cell}
                  </MotionSpan>
                ) : ''}
              </MotionButton>
            );
          })
        )}
      </div>
    </div>
  );
}
