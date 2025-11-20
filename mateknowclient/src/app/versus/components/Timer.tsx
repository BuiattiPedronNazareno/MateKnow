'use client';

import { useEffect, useState } from 'react';

interface TimerProps {
  initialTime: number; // Segundos
  onTimeUp?: () => void;
  startTime?: Date;
}

export default function Timer({ initialTime, onTimeUp, startTime }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    // Si hay startTime, calcular tiempo transcurrido
    if (startTime) {
      const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
      const remaining = Math.max(0, initialTime - elapsed);
      setTimeLeft(remaining);
    } else {
      setTimeLeft(initialTime);
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeUp) {
            onTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [initialTime, startTime, onTimeUp]);

  const percentage = (timeLeft / initialTime) * 100;
  const isLow = percentage < 30;
  const isCritical = percentage < 10;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-600">
          ⏱️ Tiempo restante
        </span>
        <span
          className={`text-2xl font-bold ${
            isCritical
              ? 'text-red-600 animate-pulse'
              : isLow
                ? 'text-orange-500'
                : 'text-green-600'
          }`}
        >
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isCritical
              ? 'bg-red-500'
              : isLow
                ? 'bg-orange-500'
                : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}