import { motion } from 'framer-motion';

export default function Controls({ isProcessing, onSolve, onLock, onReset }) {
  return (
    <div className="flex flex-wrap gap-4 justify-center mt-6">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSolve}
        disabled={isProcessing}
        className={`px-8 py-3 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(79,209,197,0.4)] transition-all ${
          isProcessing 
            ? 'bg-[#4fd1c5]/50 text-gray-800 cursor-not-allowed' 
            : 'bg-gradient-to-r from-[#4fd1c5] to-[#38b2a6] text-black hover:shadow-[0_0_30px_rgba(79,209,197,0.6)]'
        }`}
      >
        {isProcessing ? 'Solving...' : '🚀 Solve Puzzle'}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLock}
        className="px-6 py-3 rounded-xl bg-[#1a202c] text-[#4fd1c5] border-2 border-[#4fd1c5] font-semibold hover:bg-[#4fd1c5]/10 transition-colors"
      >
        🔒 Set as Given
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onReset}
        className="px-6 py-3 rounded-xl bg-transparent text-[#9f7aea] border-2 border-[#9f7aea] font-semibold hover:bg-[#9f7aea]/10 transition-colors"
      >
        ↺ Reset
      </motion.button>
    </div>
  );
}
