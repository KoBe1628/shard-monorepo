import { motion } from "framer-motion";

interface BossProps {
  hp: number;
  maxHp: number;
  isHit: boolean; // New Trigger
}

export default function Boss({ hp, maxHp, isHit }: BossProps) {
  const healthPercent = (hp / maxHp) * 100;

  return (
    <div className="flex flex-col items-center justify-center h-full relative">
      {/* THE BOSS (Floating Crystal) */}
      <motion.div
        // If hit, shake! If not, just float.
        animate={
          isHit
            ? { x: [-10, 10, -10, 10, 0], color: "#ff0000" }
            : { y: [0, -20, 0] }
        }
        transition={
          isHit
            ? { duration: 0.4 }
            : { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }
        className="relative z-10"
      >
        <svg
          width="300"
          height="300"
          viewBox="0 0 100 100"
          className="drop-shadow-2xl"
        >
          {/* Flash Red on Hit */}
          <polygon
            points="50,5 90,25 90,75 50,95 10,75 10,25"
            fill={isHit ? "#ef4444" : "#6366f1"}
            opacity="0.8"
          />
          <polygon
            points="50,20 75,35 75,65 50,80 25,65 25,35"
            fill={isHit ? "#f87171" : "#a5b4fc"}
          />
          <rect x="35" y="45" width="10" height="10" fill="#1e1b4b" />
          <rect x="55" y="45" width="10" height="10" fill="#1e1b4b" />
        </svg>
      </motion.div>

      {/* HEALTH BAR */}
      <div className="w-96 h-8 bg-gray-800 rounded-full mt-8 border-2 border-gray-700 overflow-hidden relative z-10">
        <motion.div
          className="h-full bg-gradient-to-r from-red-500 to-purple-600"
          initial={{ width: "100%" }}
          animate={{ width: `${healthPercent}%` }}
          transition={{ type: "spring", stiffness: 50 }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm tracking-widest drop-shadow-md">
          BOSS HP: {hp} / {maxHp}
        </span>
      </div>
    </div>
  );
}
