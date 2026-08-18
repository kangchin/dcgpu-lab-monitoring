import React from "react";

interface AnimatedCirclesProps {
  color: string;
  width?: number;
  height?: number;
  startX: number;
  startY: number;
}

export function AnimatedCircles({
  color,
  width = 220,
  height = 60,
  startX,
  startY,
}: AnimatedCirclesProps) {
  const circles = Array.from({ length: 100 }).map((_, i) => {
    const cx = startX + Math.random() * width;
    const cy = startY - 5 + Math.random() * height;
    const r = (0.1 + Math.random() * (0.8 - 0.1)).toFixed(2);
    const delay = (Math.random() * 2).toFixed(2) + "s";

    const dx_start = (Math.random() * 15).toFixed(2);
    const dy_start = (Math.random() * 15).toFixed(2);
    const dx_end = (Math.random() * 15).toFixed(2);
    const dy_end = (Math.random() * 15).toFixed(2);

    const opacities = Array.from({ length: 500 })
      .map(() => Math.random().toFixed(2))
      .join(";");
    const opacityValues = `0;${opacities};0`;

    return (
      <circle key={i} cx={cx} cy={cy} r={r} fill={color}>
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`${dx_start},${dy_start}; ${dx_end},${dy_end}`}
          dur="6s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values={opacityValues}
          dur={`${(Math.random() * 3.2 + 2).toFixed(2)}s`}
          repeatCount="indefinite"
          begin={delay}
        />
      </circle>
    );
  });

  return <>{circles}</>;
}
