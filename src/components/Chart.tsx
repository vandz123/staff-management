"use client";

import { useRef, useEffect } from "react";

/* ====== BAR CHART ====== */
type BarChartProps = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
  height?: number;
};

export function BarChart({ labels, datasets, height = 220 }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.height = `${height}px`;

    const w = rect.width;
    const h = height;
    const padding = { top: 30, right: 20, bottom: 40, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    // Calculate max value
    const allValues = datasets.flatMap((d) => d.data);
    const maxVal = Math.max(...allValues, 1);
    const niceMax = Math.ceil(maxVal / 5) * 5;

    // Draw grid lines
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 0.5;
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "right";
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + chartH - (i / 5) * chartH;
      const val = Math.round((i / 5) * niceMax);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.fillText(String(val), padding.left - 8, y + 4);
    }

    // Draw bars
    const groupCount = labels.length;
    const barCount = datasets.length;
    const groupWidth = chartW / groupCount;
    const barWidth = Math.min(groupWidth * 0.6 / barCount, 28);
    const groupBarWidth = barWidth * barCount + (barCount - 1) * 2;

    labels.forEach((label, i) => {
      const groupX = padding.left + i * groupWidth + (groupWidth - groupBarWidth) / 2;
      datasets.forEach((ds, j) => {
        const barX = groupX + j * (barWidth + 2);
        const barH = (ds.data[i] / niceMax) * chartH;
        const barY = padding.top + chartH - barH;

        // Bar with rounded top
        const radius = Math.min(4, barWidth / 2);
        ctx.fillStyle = ds.color;
        ctx.beginPath();
        ctx.moveTo(barX, barY + radius);
        ctx.arcTo(barX, barY, barX + barWidth, barY, radius);
        ctx.arcTo(barX + barWidth, barY, barX + barWidth, barY + barH, radius);
        ctx.lineTo(barX + barWidth, padding.top + chartH);
        ctx.lineTo(barX, padding.top + chartH);
        ctx.closePath();
        ctx.fill();

        // Value on top
        if (ds.data[i] > 0) {
          ctx.fillStyle = "#475569";
          ctx.font = "10px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(ds.data[i]), barX + barWidth / 2, barY - 5);
        }
      });

      // X-axis label
      ctx.fillStyle = "#64748b";
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, padding.left + i * groupWidth + groupWidth / 2, h - 8);
    });

    // Legend
    let legendX = padding.left;
    ctx.font = "11px Inter, system-ui, sans-serif";
    datasets.forEach((ds) => {
      ctx.fillStyle = ds.color;
      ctx.fillRect(legendX, 6, 12, 12);
      ctx.fillStyle = "#475569";
      ctx.textAlign = "left";
      ctx.fillText(ds.label, legendX + 16, 16);
      legendX += ctx.measureText(ds.label).width + 30;
    });
  }, [labels, datasets, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: `${height}px` }}
      className="rounded-lg"
    />
  );
}

/* ====== DONUT CHART ====== */
type DonutChartProps = {
  segments: {
    label: string;
    value: number;
    color: string;
  }[];
  size?: number;
};

export function DonutChart({ segments, size = 200 }: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.clearRect(0, 0, size, size);

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return;

    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 10;
    const innerR = outerR * 0.55;

    let startAngle = -Math.PI / 2;

    segments.forEach((seg) => {
      const sliceAngle = (seg.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Center text
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 22px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(total), cx, cy - 6);
    ctx.fillStyle = "#64748b";
    ctx.font = "11px Inter, system-ui, sans-serif";
    ctx.fillText("Total", cx, cy + 14);
  }, [segments, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        style={{ width: `${size}px`, height: `${size}px` }}
      />
      <div className="flex flex-wrap justify-center gap-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5 text-xs">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-slate-600">
              {seg.label}: <span className="font-semibold text-slate-800">{seg.value}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
