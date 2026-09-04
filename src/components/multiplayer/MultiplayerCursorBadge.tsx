import React from 'react';

interface MultiplayerCursorBadgeProps {
  name: string;
  avatar: string;
  color?: string;
  cursorPosition?: { x: number; y: number };
  isTyping?: boolean;
}

export const MultiplayerCursorBadge: React.FC<MultiplayerCursorBadgeProps> = ({
  name,
  avatar,
  color = '#38bdf8',
  cursorPosition,
  isTyping = false,
}) => {
  if (!cursorPosition || !isTyping) return null;

  // Approximate character cell sizing (xterm default ~9.2px wide x 18px high)
  const cellWidth = 9.2;
  const cellHeight = 18.5;
  const left = Math.max(16, cursorPosition.x * cellWidth + 14);
  const top = Math.max(8, cursorPosition.y * cellHeight + 10);

  return (
    <div
      className="absolute pointer-events-none transition-all duration-150 ease-out z-20 flex flex-col items-center select-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {/* Name and Avatar Capsule */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-2xl text-[11px] font-medium border backdrop-blur-md animate-in fade-in zoom-in duration-150"
        style={{
          backgroundColor: 'rgba(17, 17, 18, 0.94)',
          borderColor: color,
          boxShadow: `0 0 16px ${color}55, 0 4px 12px rgba(0,0,0,0.7)`,
        }}
      >
        {/* Avatar */}
        <div className="relative">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="w-4 h-4 rounded-full object-cover border"
              style={{ borderColor: color }}
            />
          ) : (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black"
              style={{ backgroundColor: color }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <span
            className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-ping"
            style={{ backgroundColor: color }}
          />
        </div>

        {/* User Handle */}
        <span className="text-white font-sans text-[11px] tracking-wide font-semibold">
          {name}
        </span>

        {/* Typing pulse indicator */}
        <div className="flex items-center gap-0.5 ml-0.5">
          <span
            className="w-1 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: color, animationDelay: '0ms' }}
          />
          <span
            className="w-1 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: color, animationDelay: '150ms' }}
          />
          <span
            className="w-1 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: color, animationDelay: '300ms' }}
          />
        </div>
      </div>

      {/* Downward Pointer Arrow pointing directly to terminal cursor */}
      <div
        className="w-0 h-0 border-x-[5px] border-x-transparent border-t-[6px] -mt-[1px]"
        style={{ borderTopColor: color }}
      />
    </div>
  );
};
