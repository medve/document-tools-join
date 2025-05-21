import { Download } from "lucide-react";
import React, { useRef, useEffect, useState } from "react";

interface AnimatedDownloadButtonProps {
  onClick: () => Promise<void> | void;
  children?: React.ReactNode;
  isLoading?: boolean;
  isSuccess?: boolean;
}

export function AnimatedDownloadButton({ onClick, children, isLoading = false, isSuccess = false }: AnimatedDownloadButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonCenter, setButtonCenter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const disabled = isLoading;

  // Track button position for confetti
  useEffect(() => {
    function updateButtonCenter() {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setButtonCenter({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    }
    updateButtonCenter();
    window.addEventListener('resize', updateButtonCenter);
    window.addEventListener('scroll', updateButtonCenter, true);
    return () => {
      window.removeEventListener('resize', updateButtonCenter);
      window.removeEventListener('scroll', updateButtonCenter, true);
    };
  }, []);

  // Confetti logic (unchanged, but uses buttonCenter)
  useEffect(() => {
    if (!isSuccess) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrame: number;
    type ConfettoType = {
      randomModifier: number;
      color: { front: string; back: string };
      dimensions: { x: number; y: number };
      position: { x: number; y: number };
      rotation: number;
      scale: { x: number; y: number };
      velocity: { x: number; y: number };
      update: () => void;
    };
    type SequinType = {
      color: string;
      radius: number;
      position: { x: number; y: number };
      velocity: { x: number; y: number };
      update: () => void;
    };
    let confetti: ConfettoType[] = [];
    let sequins: SequinType[] = [];
    const confettiCount = 20;
    const sequinCount = 10;
    const gravityConfetti = 0.3;
    const gravitySequins = 0.55;
    const dragConfetti = 0.075;
    const dragSequins = 0.02;
    const terminalVelocity = 3;
    const colors = [
      { front: '#7b5cff', back: '#6245e0' },
      { front: '#b3c7ff', back: '#8fa5e5' },
      { front: '#5c86ff', back: '#345dd1' }
    ];
    function randomRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }
    function initConfettoVelocity(xRange: [number, number], yRange: [number, number]) {
      const x = randomRange(xRange[0], xRange[1]);
      const range = yRange[1] - yRange[0] + 1;
      let y = yRange[1] - Math.abs(randomRange(0, range) + randomRange(0, range) - range);
      if (y >= yRange[1] - 1) {
        y += (Math.random() < .25) ? randomRange(1, 3) : 0;
      }
      return { x, y: -y };
    }
    function Confetto(this: ConfettoType) {
      this.randomModifier = randomRange(0, 99);
      this.color = colors[Math.floor(randomRange(0, colors.length))];
      this.dimensions = {
        x: randomRange(5, 9),
        y: randomRange(8, 15),
      };
      const button = buttonRef.current;
      this.position = {
        x: randomRange(buttonCenter.x - (button?.offsetWidth ?? 0) / 4, buttonCenter.x + (button?.offsetWidth ?? 0) / 4),
        y: randomRange(buttonCenter.y + (button?.offsetHeight ?? 0) / 2 + 8, buttonCenter.y + 1.5 * (button?.offsetHeight ?? 0) - 8),
      };
      this.rotation = randomRange(0, 2 * Math.PI);
      this.scale = { x: 1, y: 1 };
      this.velocity = initConfettoVelocity([-9, 9], [6, 11]);
    }
    Confetto.prototype.update = function (this: ConfettoType) {
      this.velocity.x -= this.velocity.x * dragConfetti;
      this.velocity.y = Math.min(this.velocity.y + gravityConfetti, terminalVelocity);
      this.velocity.x += Math.random() > 0.5 ? Math.random() : -Math.random();
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.scale.y = Math.cos((this.position.y + this.randomModifier) * 0.09);
    };
    function Sequin(this: SequinType) {
      this.color = colors[Math.floor(randomRange(0, colors.length))].back;
      this.radius = randomRange(1, 2);
      const button = buttonRef.current;
      this.position = {
        x: randomRange(buttonCenter.x - (button?.offsetWidth ?? 0) / 3, buttonCenter.x + (button?.offsetWidth ?? 0) / 3),
        y: randomRange(buttonCenter.y + (button?.offsetHeight ?? 0) / 2 + 8, buttonCenter.y + 1.5 * (button?.offsetHeight ?? 0) - 8),
      };
      this.velocity = {
        x: randomRange(-6, 6),
        y: randomRange(-8, -12)
      };
    }
    Sequin.prototype.update = function (this: SequinType) {
      this.velocity.x -= this.velocity.x * dragSequins;
      this.velocity.y = this.velocity.y + gravitySequins;
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
    };
    function initBurst() {
      for (let i = 0; i < confettiCount; i++) confetti.push(new (Confetto as unknown as { new(): ConfettoType })());
      for (let i = 0; i < sequinCount; i++) sequins.push(new (Sequin as unknown as { new(): SequinType })());
    }
    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confetti.forEach((confetto) => {
        const width = confetto.dimensions.x * confetto.scale.x;
        const height = confetto.dimensions.y * confetto.scale.y;
        ctx.translate(confetto.position.x, confetto.position.y);
        ctx.rotate(confetto.rotation);
        confetto.update();
        ctx.fillStyle = confetto.scale.y > 0 ? confetto.color.front : confetto.color.back;
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (confetto.velocity.y < 0 && canvas && buttonRef.current) {
          ctx.clearRect(canvas.width / 2 - (buttonRef.current.offsetWidth ?? 0) / 2, canvas.height / 2 + (buttonRef.current.offsetHeight ?? 0) / 2, buttonRef.current.offsetWidth ?? 0, buttonRef.current.offsetHeight ?? 0);
        }
      });
      sequins.forEach((sequin) => {
        ctx.translate(sequin.position.x, sequin.position.y);
        sequin.update();
        ctx.fillStyle = sequin.color;
        ctx.beginPath();
        ctx.arc(0, 0, sequin.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        if (sequin.velocity.y < 0 && canvas && buttonRef.current) {
          ctx.clearRect(canvas.width / 2 - (buttonRef.current.offsetWidth ?? 0) / 2, canvas.height / 2 + (buttonRef.current.offsetHeight ?? 0) / 2, buttonRef.current.offsetWidth ?? 0, buttonRef.current.offsetHeight ?? 0);
        }
      });
      confetti = confetti.filter(c => c.position.y < (canvas?.height ?? 0));
      sequins = sequins.filter(s => s.position.y < (canvas?.height ?? 0));
      animationFrame = window.requestAnimationFrame(render);
    }
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initBurst();
    render();
    return () => {
      window.cancelAnimationFrame(animationFrame);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [isSuccess, buttonCenter]);

  // Handle button click and state transitions
  const handleClick = async () => {
    if (disabled) return;
    if (onClick) await onClick();
  };

  // Responsive canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="w-full flex justify-center">
      <button
        ref={buttonRef}
        className="flex items-center gap-2 bg-neutral-800 hover:bg-black text-white rounded-full text-base font-semibold px-8 py-4 shadow transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={handleClick}
        disabled={disabled}
        type="button"
        style={{ minWidth: 240 }}
      >
        {isLoading ? (
          <svg className="animate-spin w-5 h-5 mr-2 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <Download className="w-5 h-5" />
        )}
        <span>{isLoading ? 'Loading...' : children}</span>
      </button>
      <canvas ref={canvasRef} className="confetti-canvas pointer-events-none fixed top-0 left-0 w-full h-full z-50" />
    </div>
  );
} 