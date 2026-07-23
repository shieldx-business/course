"use client";

import { useEffect, useState } from "react";

export function WatermarkOverlay({ email }: { email?: string }) {
  const [pos, setPos] = useState({ top: 10, left: 10 });

  useEffect(() => {
    if (!email) return;
    const move = () => {
      setPos({
        top: 10 + Math.random() * 70,
        left: 5 + Math.random() * 70,
      });
    };
    move();
    const id = setInterval(move, 30000);
    return () => clearInterval(id);
  }, [email]);

  if (!email) return null;

  return (
    <div
      className="pointer-events-none absolute z-10 rounded bg-black/30 px-2 py-1 text-xs font-medium text-white/70 select-none"
      style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
      aria-hidden="true"
    >
      {email}
    </div>
  );
}
