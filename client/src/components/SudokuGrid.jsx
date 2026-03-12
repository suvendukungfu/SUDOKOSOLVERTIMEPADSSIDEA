import { motion } from 'framer-motion';

export default function SudokuGrid({
  grid,
  selectedCell,
  onSelectCell,
  invalidCells = [],
  lockedCells = [],
  solvedCells = []
}) {
  const isLocked = (r, c) => lockedCells.some(([lr, lc]) => lr === r && lc === c);
  const isSolved = (r, c) => solvedCells.some(([sr, sc]) => sr === r && sc === c);
  const isInvalid = (r, c) => invalidCells.some(([ir, ic]) => ir === r && ic === c);

  return (
    <div className="w-full max-w-md mx-auto aspect-square bg-[#2d3748] rounded border-4 border-[#1a202c] shadow-[0_0_25px_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="grid grid-cols-9 grid-rows-9 h-full w-full">
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const selected = selectedCell?.[0] === r && selectedCell?.[1] === c;
            const locked = isLocked(r, c);
            const solved = isSolved(r, c);
            const invalid = isInvalid(r, c);

            // Calculate thicker borders for 3x3 blocks
            const borderRight = c % 3 === 2 && c !== 8 ? 'border-r-2 border-[#1a202c]' : 'border-r border-[#4a5568]';
            const borderBottom = r % 3 === 2 && r !== 8 ? 'border-b-2 border-[#1a202c]' : 'border-b border-[#4a5568]';

            return (
              <motion.div
                key={`${r}-${c}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: (r * 9 + c) * 0.005 }}
                onClick={() => onSelectCell([r, c])}
                className={`
                  flex items-center justify-center text-xl md:text-2xl font-medium cursor-pointer transition-colors
                  ${borderRight} ${borderBottom}
                  ${locked ? 'bg-[#4fd1c5]/10 text-[#4fd1c5] cursor-not-allowed font-bold' : ''}
                  ${solved ? 'text-[#9f7aea] font-bold shadow-[inset_0_0_10px_rgba(159,122,234,0.3)]' : ''}
                  ${invalid ? 'bg-red-500/20 text-red-500 shadow-[inset_0_0_8px_rgba(239,68,68,0.5)]' : ''}
                  ${!locked && !solved && !invalid ? 'text-gray-200 hover:bg-[#4a5568]/50' : ''}
                  ${selected && !locked ? 'ring-2 ring-inset ring-[#4fd1c5] bg-[#4fd1c5]/20' : ''}
                `}
              >
                {cell !== 0 && cell !== null ? (
                  <motion.span
                    initial={solved ? { scale: 0.5, opacity: 0 } : false}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {cell}
                  </motion.span>
                ) : ''}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
