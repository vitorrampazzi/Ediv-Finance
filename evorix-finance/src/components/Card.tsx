import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'blue' | 'green' | 'yellow' | 'none';
  style?: React.CSSProperties;
}

export const Card = ({ children, className = '', glow = 'none', style }: CardProps) => {
  const glowMap = {
    blue: "shadow-[0_0_40px_-15px_rgba(22,127,130,0.2)] border-evo-accent/20",
    green: "shadow-[0_0_40px_-15px_rgba(121,168,142,0.1)] border-evo-green/20",
    yellow: "shadow-[0_0_40px_-15px_rgba(234,179,8,0.15)] border-yellow-500/20",
    none: "border-white/5",
  };

  return (
    <div style={style} className={`relative rounded-2xl bg-white/[0.02] backdrop-blur-xl p-5 border ${glowMap[glow]} 
      before:absolute before:inset-0 before:rounded-2xl before:p-px 
      before:bg-gradient-to-b before:from-white/10 before:to-transparent 
      before:-z-10 before:content-[''] transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};
