import { motion } from 'framer-motion';

export default function NumberPad({ onInput }) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const MotionButton = motion.button;

  return (
    <div className="flex justify-center mt-6">
      <div className="grid grid-cols-5 gap-3 max-w-sm">
        {numbers.map((num) => (
          <MotionButton
            key={num}
            whileHover={{ scale: 1.1, backgroundColor: "rgba(79, 209, 197, 0.2)" }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onInput(num)}
            className="w-12 h-12 rounded-xl bg-[#1a202c] text-white border border-gray-700 font-semibold text-xl shadow-lg transition-colors hover:border-[#4fd1c5] hover:text-[#4fd1c5]"
          >
            {num}
          </MotionButton>
        ))}
        <MotionButton
          whileHover={{ scale: 1.1, backgroundColor: "rgba(239, 68, 68, 0.2)" }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onInput(null)}
          className="w-12 h-12 rounded-xl bg-[#2a1418] text-[#ef4444] border border-red-900 font-semibold text-lg shadow-lg flex items-center justify-center transition-colors hover:border-[#ef4444]"
        >
          ✕
        </MotionButton>
      </div>
    </div>
  );
}
