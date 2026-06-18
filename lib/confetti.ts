import confetti from 'canvas-confetti';

export function fireCelebrationConfetti(durationMs = 3000) {
  const end = Date.now() + durationMs;
  const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'];

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors,
  });
  frame();
}
