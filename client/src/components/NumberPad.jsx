import { m } from 'framer-motion';

export default function NumberPad({ onInput, disabled = false }) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const MotionButton = m.button;

  return (
    <div className="mt-2">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Manual Entry</h3>
          <p className="mt-1 text-sm text-slate-400">Use the keypad or your keyboard after selecting a cell.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {numbers.map((num) => (
          <MotionButton
            key={num}
            whileHover={{ scale: disabled ? 1 : 1.03, backgroundColor: disabled ? undefined : "rgba(79, 209, 197, 0.16)" }}
            whileTap={{ scale: disabled ? 1 : 0.97 }}
            onClick={() => onInput(num)}
            disabled={disabled}
            className="h-14 rounded-2xl bg-[#121a2b] text-white border border-white/10 font-semibold text-xl shadow-lg transition-colors hover:border-[#4fd1c5] hover:text-[#4fd1c5] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {num}
          </MotionButton>
        ))}
        <MotionButton
          whileHover={{ scale: disabled ? 1 : 1.03, backgroundColor: disabled ? undefined : "rgba(239, 68, 68, 0.16)" }}
          whileTap={{ scale: disabled ? 1 : 0.97 }}
          onClick={() => onInput(null)}
          disabled={disabled}
          className="col-span-3 h-12 rounded-2xl bg-[#2a1418] text-[#fda4af] border border-red-900/60 font-semibold text-sm shadow-lg flex items-center justify-center transition-colors hover:border-[#ef4444] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Clear Selected Cell
        </MotionButton>
      </div>
    </div>
  );
}
