"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Small dependency-free charts for the back office. The SVG stretches to its box
 * (preserveAspectRatio="none", non-scaling strokes); labels and the tooltip are HTML so text never
 * distorts. Each chart carries a visually hidden table with the same numbers.
 */

export interface Series<T> {
  key: keyof T & string;
  label: string;
  /** Tailwind fill/stroke + swatch classes, e.g. "fill-glow stroke-glow bg-glow". */
  tone: string;
}

interface ChartProps<T extends { label: string }> {
  data: T[];
  series: Series<T>[];
  format: (n: number) => string;
  /** Extra tooltip line, e.g. net for the money chart. */
  footer?: (row: T) => ReactNode;
  height?: number;
  title: string;
  /** Whole-number data (counts): keeps the axis ticks on whole numbers. */
  integer?: boolean;
  /** Smallest axis maximum, so an empty or tiny series doesn't scale to fractions. */
  floor?: number;
}

function niceMax(v: number, integer = false): number {
  if (integer) {
    const m = niceMax(Math.max(v, 2));
    return m % 2 === 0 ? m : Math.ceil(m / 2) * 2;
  }
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= v)!;
  return step * pow;
}

function Frame<T extends { label: string }>({
  data,
  series,
  format,
  footer,
  height,
  title,
  max,
  children,
}: ChartProps<T> & { max: number; children: ReactNode }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const ticks = [max, max / 2, 0];
  const row = hover === null ? null : data[hover];
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <figure aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="sr-only">
        {title}
      </figcaption>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-2 text-xs font-semibold text-muted">
            <span aria-hidden className={cn("size-2.5 rounded-sm", s.tone)} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative pl-12" style={{ height }}>
        {ticks.map((t, i) => (
          <div key={i} className="absolute inset-x-0 border-t border-dashed border-line" style={{ top: `${(i / 2) * 100}%` }}>
            <span className="absolute -top-2 left-0 w-11 text-right text-[11px] text-subtle tabular">{format(t)}</span>
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-12" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${data.length} 100`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            {children}
            {hover !== null && <rect x={hover} y={0} width={1} height={100} className="fill-fg/5" />}
          </svg>
          <div className="absolute inset-0 flex">
            {data.map((d, i) => (
              <div key={d.label} className="h-full flex-1" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={-1} />
            ))}
          </div>
          {row && hover !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-48 rounded-xl border border-line bg-bg/95 p-3 text-xs shadow-[0_16px_40px_-16px_var(--shadow-strong)]"
              style={hover > data.length / 2 ? { right: `${((data.length - hover) / data.length) * 100}%` } : { left: `${((hover + 1) / data.length) * 100}%` }}
            >
              <p className="mb-1.5 font-semibold">{row.label}</p>
              {series.map((s) => (
                <p key={s.key} className="flex justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span aria-hidden className={cn("size-2 rounded-sm", s.tone)} />
                    {s.label}
                  </span>
                  <span className="font-semibold tabular">{format(Number(row[s.key]))}</span>
                </p>
              ))}
              {footer && <div className="mt-1.5 border-t border-line pt-1.5">{footer(row)}</div>}
            </div>
          )}
        </div>
      </div>
      <div aria-hidden className="relative mt-2 ml-12 h-4 text-[11px] text-subtle">
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <span key={d.label} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${((i + 0.5) / data.length) * 100}%` }}>
              {d.label}
            </span>
          ) : null,
        )}
      </div>
      <table className="sr-only">
        <thead>
          <tr>
            <th>Day</th>
            {series.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th>{d.label}</th>
              {series.map((s) => (
                <td key={s.key}>{format(Number(d[s.key]))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Grouped bars per day. */
export function BarChart<T extends { label: string }>(props: ChartProps<T>) {
  const { data, series, height = 220, integer } = props;
  const max = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => Number(d[s.key])))), integer);
  const gap = 0.24;
  const w = (1 - gap) / series.length;
  return (
    <Frame {...props} height={height} max={max}>
      {data.map((d, i) =>
        series.map((s, j) => {
          const h = (Number(d[s.key]) / max) * 100;
          return <rect key={`${i}-${s.key}`} x={i + gap / 2 + j * w} y={100 - h} width={w * 0.92} height={h} className={s.tone} />;
        }),
      )}
    </Frame>
  );
}

/** One line per series, with a soft area under the first. */
export function LineChart<T extends { label: string }>(props: ChartProps<T>) {
  const { data, series, height = 220, floor = 0 } = props;
  const max = niceMax(Math.max(floor, ...data.flatMap((d) => series.map((s) => Number(d[s.key])))));
  const y = (v: number) => 100 - (v / max) * 100;
  return (
    <Frame {...props} height={height} max={max}>
      {series.map((s, j) => {
        const points = data.map((d, i) => `${i + 0.5},${y(Number(d[s.key]))}`).join(" ");
        return (
          <g key={s.key}>
            {j === 0 && data.length > 1 && <polygon points={`0.5,100 ${points} ${data.length - 0.5},100`} className={cn(s.tone, "stroke-none opacity-15")} />}
            <polyline points={points} fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" className={cn(s.tone, "fill-none")} />
          </g>
        );
      })}
    </Frame>
  );
}
