import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number; // 0 to 255
  isActive: boolean;
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  // Use a ref to store volume so we don't need to re-bind the animation loop on every volume change
  const volumeRef = useRef(volume);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Initialize particles once
  useEffect(() => {
    const particleCount = 50; // High density for futuristic look
    particlesRef.current = Array.from({ length: particleCount }).map(() => ({
      angle: Math.random() * Math.PI * 2,
      radius: 80 + Math.random() * 120,
      speed: (Math.random() - 0.5) * 0.02,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.3
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const render = () => {
      if (!ctx || !canvas) return;
      
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Use the ref value instead of the prop directly to avoid dependency cycle
      const currentVolume = volumeRef.current;

      // CRITICAL: Use clearRect to ensure full transparency
      ctx.clearRect(0, 0, width, height);

      const rawNormVol = currentVolume / 255;
      const normVol = Math.pow(rawNormVol, 0.8) * 1.5;
      const activeScale = isActive ? 1 + normVol : 1;

      // 1. Render Particles
      particlesRef.current.forEach((p, i) => {
        p.angle += p.speed * (isActive ? (1 + normVol * 2) : 1);
        const currentRadius = p.radius + (Math.sin(time * 0.05 + i) * 10 * normVol);
        
        const px = centerX + Math.cos(p.angle) * currentRadius;
        const py = centerY + Math.sin(p.angle) * currentRadius;

        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        // Use cyan/purple theme colors
        ctx.fillStyle = isActive 
          ? `rgba(6, 182, 212, ${p.opacity})` // Cyan
          : `rgba(148, 163, 184, ${p.opacity * 0.5})`; // Slate
        ctx.fill();
      });

      if (!isActive) {
          // --- IDLE STATE (Breathing Gyroscope) ---
          const breath = Math.sin(time * 0.02);
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, 60 + breath * 5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(time * 0.01);
          ctx.beginPath();
          ctx.arc(0, 0, 40, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
          ctx.setLineDash([5, 15]);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();

          // Tiny center dot
          ctx.beginPath();
          ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fill();

      } else {
        // --- ACTIVE STATE (Energy Core) ---
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Rotating Outer Ring
        ctx.rotate(time * 0.01);
        ctx.beginPath();
        ctx.ellipse(0, 0, 140 * activeScale, 130 * activeScale, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(6, 182, 212, ${0.3 + normVol * 0.3})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Counter-Rotating Inner Ring
        ctx.rotate(-time * 0.03);
        ctx.beginPath();
        ctx.arc(0, 0, 100 + (normVol * 50), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + normVol * 0.4})`; // Purple
        ctx.setLineDash([20, 30]);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();

        // Central Glow (Additive Blending)
        const glowRadius = 50 + (normVol * 80);
        const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, glowRadius);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)'); 
        gradient.addColorStop(0.5, 'rgba(147, 51, 234, 0.4)'); 
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0)'); 
        
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Solid Core
        const jitterX = (Math.random() - 0.5) * normVol * 5;
        const jitterY = (Math.random() - 0.5) * normVol * 5;
        const coreSize = 30 + (normVol * 20);

        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 30;
        
        ctx.beginPath();
        ctx.arc(centerX + jitterX, centerY + jitterY, coreSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      time++;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [isActive]); // Removed 'volume' from dependency array to prevent re-binding loop

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={800} 
      className="w-full h-full object-contain pointer-events-none"
    />
  );
};

export default Visualizer;