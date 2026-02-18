import { motion, AnimatePresence } from "framer-motion";

// 1. Make sure this "export interface" part is here!
export interface DamageInstance {
  id: number;
  value: number;
  x: number;
  y: number;
}

interface Props {
  damages: DamageInstance[];
  onComplete: (id: number) => void;
}

export default function DamageNumber({ damages, onComplete }: Props) {
  return (
    <AnimatePresence>
      {damages.map((dmg) => (
        <motion.div
          key={dmg.id}
          initial={{ opacity: 1, y: dmg.y, x: dmg.x, scale: 0.5 }}
          animate={{
            opacity: 0,
            y: dmg.y - 100, // Float UP
            scale: 1.5, // Grow larger
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          onAnimationComplete={() => onComplete(dmg.id)}
          className="absolute text-5xl font-black text-red-500 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none z-50"
          style={{ left: "50%", top: "40%" }}
        >
          -{dmg.value}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
