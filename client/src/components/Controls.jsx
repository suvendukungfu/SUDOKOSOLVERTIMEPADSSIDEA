import { m } from 'framer-motion';

export default function Controls({
  isProcessing,
  onSolve,
  onLock,
  onReset,
  showDebug,
  onToggleDebug,
  canSolve = true,
  canLock = true
}) {
  const MotionButton = m.button;

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <MotionButton
          whileHover={{ scale: isProcessing || !canSolve ? 1 : 1.02 }}
          whileTap={{ scale: isProcessing || !canSolve ? 1 : 0.98 }}
          onClick={onSolve}
          disabled={isProcessing || !canSolve}
          className={`min-h-14 rounded-2xl px-6 py-3 text-base font-bold shadow-[0_0_20px_rgba(79,209,197,0.25)] transition-all ${
            isProcessing || !canSolve
              ? 'bg-[#4fd1c5]/25 text-slate-300 cursor-not-allowed'
              : 'bg-linear-to-r from-[#4fd1c5] to-[#38b2a6] text-black hover:shadow-[0_0_30px_rgba(79,209,197,0.45)]'
          }`}
        >
          {isProcessing ? 'Working...' : 'Solve Puzzle'}
        </MotionButton>

        <MotionButton
          whileHover={{ scale: canLock ? 1.02 : 1 }}
          whileTap={{ scale: canLock ? 0.98 : 1 }}
          onClick={onLock}
          disabled={!canLock || isProcessing}
          className={`min-h-14 rounded-2xl border px-6 py-3 text-base font-semibold transition-colors ${
            canLock && !isProcessing
              ? 'border-[#4fd1c5] bg-[#4fd1c5]/10 text-[#4fd1c5] hover:bg-[#4fd1c5]/16'
              : 'border-white/10 bg-white/5 text-slate-500 cursor-not-allowed'
          }`}
        >
          Set Filled Cells as Givens
        </MotionButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <MotionButton
          whileHover={{ scale: isProcessing ? 1 : 1.01 }}
          whileTap={{ scale: isProcessing ? 1 : 0.99 }}
          onClick={onReset}
          disabled={isProcessing}
          className={`min-h-12 rounded-2xl border px-6 py-3 text-sm font-semibold transition-colors ${
            isProcessing
              ? 'border-white/10 bg-white/5 text-slate-500 cursor-not-allowed'
              : 'border-[#9f7aea] bg-[#9f7aea]/8 text-[#d8b4fe] hover:bg-[#9f7aea]/14'
          }`}
        >
          Reset Board
        </MotionButton>

        <button
          type="button"
          role="switch"
          aria-checked={showDebug}
          onClick={() => onToggleDebug(!showDebug)}
          className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
            showDebug
              ? 'border-[#4fd1c5] bg-[#4fd1c5]/10 text-[#4fd1c5]'
              : 'border-white/10 bg-white/5 text-slate-300'
          }`}
        >
          <span>AI View Overlay</span>
          <span className={`relative h-6 w-11 rounded-full transition-colors ${showDebug ? 'bg-[#4fd1c5]/60' : 'bg-white/10'}`}>
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${showDebug ? 'translate-x-6' : 'translate-x-1'}`}></span>
          </span>
        </button>
      </div>
    </div>
  );
}
