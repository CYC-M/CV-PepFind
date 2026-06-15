import { useEffect, useRef, useCallback } from "react";

interface Peptide2DViewerProps {
  sequence: string;
  width?: number;
  height?: number;
}

// Amino acid properties for coloring
const AA_PROPS: Record<string, { color: string; bg: string; type: string }> = {
  A: { color: '#f59e0b', bg: '#f59e0b22', type: 'H' },
  V: { color: '#f59e0b', bg: '#f59e0b22', type: 'H' },
  I: { color: '#f59e0b', bg: '#f59e0b22', type: 'H' },
  L: { color: '#f59e0b', bg: '#f59e0b22', type: 'H' },
  M: { color: '#f59e0b', bg: '#f59e0b22', type: 'H' },
  F: { color: '#f59e0b', bg: '#f59e0b22', type: 'H' },
  W: { color: '#f59e0b', bg: '#f59e0b22', type: 'H' },
  P: { color: '#f59e0b', bg: '#f59e0b22', type: 'H' },
  S: { color: '#10b981', bg: '#10b98122', type: 'P' },
  T: { color: '#10b981', bg: '#10b98122', type: 'P' },
  N: { color: '#10b981', bg: '#10b98122', type: 'P' },
  Q: { color: '#10b981', bg: '#10b98122', type: 'P' },
  Y: { color: '#10b981', bg: '#10b98122', type: 'P' },
  C: { color: '#10b981', bg: '#10b98122', type: 'P' },
  K: { color: '#6366f1', bg: '#6366f122', type: '+' },
  R: { color: '#6366f1', bg: '#6366f122', type: '+' },
  H: { color: '#6366f1', bg: '#6366f122', type: '+' },
  D: { color: '#ef4444', bg: '#ef444422', type: '-' },
  E: { color: '#ef4444', bg: '#ef444422', type: '-' },
  G: { color: '#94a3b8', bg: '#94a3b822', type: 'S' },
};

export default function Peptide2DViewer({ sequence, width = 400, height = 160 }: Peptide2DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sequence) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    // Background
    ctx.clearRect(0, 0, width, height);

    const len = sequence.length;
    if (len === 0) return;

    // Layout parameters
    const nodeR = Math.min(18, Math.max(10, (width - 40) / (len * 2.2)));
    const spacing = nodeR * 2.4;
    const totalW = (len - 1) * spacing;
    const startX = (width - totalW) / 2;

    // Draw in a snake pattern if sequence is long
    const maxPerRow = Math.floor((width - 40) / spacing);
    const rows = Math.ceil(len / maxPerRow);
    const rowH = (height - 40) / Math.max(rows, 1);

    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < len; i++) {
      const row = Math.floor(i / maxPerRow);
      const col = i % maxPerRow;
      const rowLen = Math.min(maxPerRow, len - row * maxPerRow);
      const rowStartX = (width - (rowLen - 1) * spacing) / 2;
      const x = rowStartX + col * spacing;
      const y = 30 + row * rowH + rowH / 2;
      positions.push({ x, y });
    }

    // Draw bonds (peptide backbone)
    ctx.lineWidth = 2;
    for (let i = 0; i < len - 1; i++) {
      const from = positions[i];
      const to = positions[i + 1];
      const aa = sequence[i];
      const props = AA_PROPS[aa] ?? { color: '#94a3b8', bg: '#94a3b822', type: 'S' };

      // Gradient bond
      const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      grad.addColorStop(0, props.color + '80');
      const nextProps = AA_PROPS[sequence[i + 1]] ?? { color: '#94a3b8' };
      grad.addColorStop(1, nextProps.color + '80');
      ctx.strokeStyle = grad;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);

      // Curved connector for same-row nodes, straight for row transitions
      const sameRow = Math.floor(i / maxPerRow) === Math.floor((i + 1) / maxPerRow);
      if (sameRow) {
        ctx.lineTo(to.x, to.y);
      } else {
        // Arc connector between rows
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        ctx.quadraticCurveTo(midX + 20, midY, to.x, to.y);
      }
      ctx.stroke();
    }

    // Draw nodes
    for (let i = 0; i < len; i++) {
      const { x, y } = positions[i];
      const aa = sequence[i];
      const props = AA_PROPS[aa] ?? { color: '#94a3b8', bg: '#94a3b822', type: 'S' };

      // Outer glow
      ctx.shadowColor = props.color;
      ctx.shadowBlur = 8;

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, nodeR, 0, Math.PI * 2);
      ctx.fillStyle = props.bg;
      ctx.fill();
      ctx.strokeStyle = props.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // AA letter
      ctx.fillStyle = props.color;
      ctx.font = `bold ${Math.max(9, nodeR * 0.85)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(aa, x, y);

      // Position number (every 5th)
      if ((i + 1) % 5 === 0 || i === 0 || i === len - 1) {
        ctx.fillStyle = '#64748b';
        ctx.font = `${Math.max(7, nodeR * 0.55)}px Inter, sans-serif`;
        ctx.fillText(String(i + 1), x, y + nodeR + 8);
      }
    }

    // N-terminus and C-terminus labels
    if (positions.length > 0) {
      ctx.fillStyle = '#6366f1';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', positions[0].x, positions[0].y - nodeR - 8);
      ctx.fillStyle = '#ef4444';
      ctx.fillText('C', positions[len - 1].x, positions[len - 1].y - nodeR - 8);
    }

    // Legend
    const legendItems = [
      { label: '疏水', color: '#f59e0b' },
      { label: '极性', color: '#10b981' },
      { label: '正电', color: '#6366f1' },
      { label: '负电', color: '#ef4444' },
    ];
    ctx.font = '8px Inter, sans-serif';
    ctx.textAlign = 'left';
    let lx = 8;
    for (const item of legendItems) {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(lx + 4, height - 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.fillText(item.label, lx + 10, height - 5);
      lx += 38;
    }
  }, [sequence, width, height]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: 'auto' }}
    />
  );
}
