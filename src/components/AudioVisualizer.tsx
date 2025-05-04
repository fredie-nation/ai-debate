
import React, { useState, useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  color: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, color }) => {
  const [bars] = useState(Array.from({ length: 10 }, (_, i) => i));
  const animationRef = useRef<number | null>(null);
  const barsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isActive || !barsRef.current) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animateBars = () => {
      if (!barsRef.current) return;
      
      const barElements = barsRef.current.querySelectorAll('.audio-bar');
      barElements.forEach((bar) => {
        if (isActive) {
          const height = Math.floor(Math.random() * 20) + 5;
          (bar as HTMLElement).style.height = `${height}px`;
        } else {
          (bar as HTMLElement).style.height = '5px';
        }
      });
      
      animationRef.current = requestAnimationFrame(animateBars);
    };

    animationRef.current = requestAnimationFrame(animateBars);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isActive]);

  return (
    <div 
      ref={barsRef} 
      className="audio-visualizer" 
      style={{ color }}
    >
      {bars.map((_, index) => (
        <div
          key={index}
          className={`audio-bar ${isActive ? 'active' : ''}`}
          style={{ '--delay': index } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
