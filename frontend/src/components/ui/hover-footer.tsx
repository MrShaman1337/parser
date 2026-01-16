import { motion } from "framer-motion";
import React from "react";

export const FooterBackgroundGradient: React.FC = () => {
  return (
    <motion.div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#3ca2fa]/30 blur-[140px]" />
      <div className="absolute -bottom-40 right-0 h-[26rem] w-[26rem] rounded-full bg-[#6ee7ff]/20 blur-[120px]" />
      <div className="absolute -bottom-32 left-0 h-[22rem] w-[22rem] rounded-full bg-[#1f2937]/40 blur-[100px]" />
    </motion.div>
  );
};

export const TextHoverEffect: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  return (
    <div className={`relative w-full select-none ${className ?? ""}`}>
      <motion.div
        className="text-center text-[10rem] font-extrabold uppercase tracking-[0.6rem] text-transparent"
        style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}
        whileHover={{ textShadow: "0 0 30px rgba(60,162,250,0.45)" }}
        transition={{ duration: 0.3 }}
      >
        {text}
      </motion.div>
      <motion.div
        className="absolute inset-0 text-center text-[10rem] font-extrabold uppercase tracking-[0.6rem] text-[#3ca2fa]/10"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        {text}
      </motion.div>
    </div>
  );
};
