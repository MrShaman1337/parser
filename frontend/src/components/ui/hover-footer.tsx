import React from "react";

export const FooterBackgroundGradient: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none hover-footer__bg"
    >
      <div className="absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#3ca2fa]/30 blur-[140px]" />
      <div className="absolute -bottom-40 right-0 h-[26rem] w-[26rem] rounded-full bg-[#6ee7ff]/20 blur-[120px]" />
      <div className="absolute -bottom-32 left-0 h-[22rem] w-[22rem] rounded-full bg-[#1f2937]/40 blur-[100px]" />
    </div>
  );
};

export const TextHoverEffect: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  return (
    <div className={`relative w-full select-none ${className ?? ""}`}>
      <div
        className="text-center text-[10rem] font-extrabold uppercase tracking-[0.6rem] text-transparent hover-footer__outline"
        style={{ WebkitTextStroke: "1px rgba(255,255,255,0.2)" }}
      >
        {text}
      </div>
      <div className="absolute inset-0 text-center text-[10rem] font-extrabold uppercase tracking-[0.6rem] text-[#3ca2fa]/10 hover-footer__float">
        {text}
      </div>
    </div>
  );
};
