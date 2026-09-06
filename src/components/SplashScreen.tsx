import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Zap, Sparkles, CheckCircle2 } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDurationMs = 2200,
}) => {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Initializing secure cryptographic engine...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Step 1: Crypto & Vault initialization
    const timer1 = setTimeout(() => {
      setProgress(45);
      setStatusText('Configuring network protocols & bridge services...');
    }, 550);

    // Step 2: Workstation & sessions
    const timer2 = setTimeout(() => {
      setProgress(78);
      setStatusText('Loading workstation sessions & terminal profiles...');
    }, 1200);

    // Step 3: Complete
    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Starting xTerminal Workstation...');
    }, 1750);

    // Step 4: Trigger fade out
    const timer4 = setTimeout(() => {
      setIsFadingOut(true);
    }, minDurationMs);

    // Step 5: Completely unmount
    const timer5 = setTimeout(() => {
      onFinish?.();
    }, minDurationMs + 650);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [minDurationMs, onFinish]);

  // Allow instant skip on click or keypress
  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onFinish?.();
    }, 300);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-[#0A0A0B] select-none cursor-pointer overflow-hidden transition-all duration-700 ease-out ${
        isFadingOut
          ? 'opacity-0 scale-105 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
      title="Click or press any key to skip"
    >
      {/* Ambient background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
      
      {/* Decorative Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #0A0A0B 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px',
        }}
      />

      {/* Top Spacer & Subtle Version Tag */}
      <div className="w-full pt-8 px-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400/80 tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>SYSTEM READY</span>
        </div>
        <div className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">
          V2.4.0 PRO
        </div>
      </div>

      {/* Center Branding & Progress */}
      <div className="flex flex-col items-center justify-center relative z-10 px-6 max-w-md w-full">
        {/* Animated App Icon */}
        <div className="relative mb-7 group">
          <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition duration-1000 animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-[#111113] border border-emerald-500/30 p-2 shadow-2xl flex items-center justify-center overflow-hidden">
            <img
              src="/icon.png"
              alt="xTerminal Logo"
              className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]"
              onError={(e) => {
                // Fallback icon if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            {/* Fallback Icon */}
            <Terminal className="w-10 h-10 text-emerald-400 absolute" style={{ zIndex: -1 }} />
          </div>
        </div>

        {/* Title */}
        <div className="flex items-center gap-2.5 mb-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent font-sans">
            xTerminal
          </h1>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-xs font-bold font-mono tracking-widest border border-emerald-500/30 uppercase shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            PRO
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-gray-400 text-xs font-mono tracking-wide text-center mb-8">
          Enterprise Remote Access &amp; Infrastructure Suite
        </p>

        {/* Modern Progress Bar */}
        <div className="w-full bg-[#161618] border border-[#26262a] rounded-full h-2 p-0.5 overflow-hidden shadow-inner mb-3">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(16,185,129,0.6)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Dynamic Status Text */}
        <div className="w-full flex items-center justify-between text-[11px] font-mono text-gray-400 px-1">
          <span className="truncate pr-2 flex items-center gap-1.5 text-gray-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            {statusText}
          </span>
          <span className="text-emerald-400 font-semibold shrink-0">{progress}%</span>
        </div>
      </div>

      {/* Bottom Footer with "Powered by Lyarinet" */}
      <div className="w-full pb-8 px-8 flex flex-col items-center justify-center relative z-10 gap-1.5">
        <div className="flex items-center gap-2 text-xs font-sans tracking-wide">
          <span className="text-gray-500 uppercase tracking-widest font-mono text-[10px]">
            Powered by
          </span>
          <span className="font-bold text-sm tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Lyarinet
          </span>
        </div>
        <p className="text-[10px] text-gray-600 font-mono">
          Click anywhere to skip
        </p>
      </div>
    </div>
  );
};
