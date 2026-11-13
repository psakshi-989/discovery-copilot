"use client";

import { useState } from "react";
import type { DemoSpec } from "@/lib/schemas";

type Block = DemoSpec["screens"][number]["blocks"][number];

/** Picks black or white text for a background colour, and falls back if the model gave a bad hex. */
function accentColors(hex: string): { accent: string; on: string } {
  const ok = /^#[0-9a-f]{6}$/i.test(hex);
  const accent = ok ? hex : "#4338ca";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(accent.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return { accent, on: lum > 0.4 ? "#111111" : "#ffffff" };
}

function BlockView({ block }: { block: Block }) {
  const [saved, setSaved] = useState(false);
  const cell = (row: string[], i: number) => row[i] ?? "";

  switch (block.type) {
    case "stat_row": {
      const row = block.rows[0] ?? [];
      return (
        <div className="stats">
          {block.columns.map((label, i) => (
            <div className="stat" key={i}><b>{cell(row, i)}</b><span className="muted small">{label}</span></div>
          ))}
        </div>
      );
    }
    case "table":
      return (
        <div className="tablewrap">
          <table>
            <thead><tr>{block.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>{block.rows.map((r, n) => <tr key={n}>{block.columns.map((_, i) => <td key={i}>{cell(r, i)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    case "form":
      return (
        <form onSubmit={(e) => { e.preventDefault(); setSaved(true); }}>
          {block.columns.map((label, i) => (
            <label className="field" key={i}>
              <span>{label}</span>
              <input defaultValue={cell(block.rows[0] ?? [], i)} />
            </label>
          ))}
          <button className="btn" type="submit">Save</button>
          {saved && <p role="status" className="muted small">Saved in the demo only. Nothing is stored.</p>}
        </form>
      );
    case "chart": {
      const values = block.rows.map((r) => parseFloat(cell(r, 1).replace(/[^0-9.\-]/g, "")) || 0);
      const max = Math.max(1, ...values);
      return (
        <div className="bars">
          {block.rows.map((r, n) => (
            <div className="bar-row" key={n}>
              <span>{cell(r, 0)}</span>
              <span className="bar-track"><span className="bar-fill" style={{ display: "block", width: `${(values[n] / max) * 100}%` }} /></span>
              <span className="num">{cell(r, 1)}</span>
            </div>
          ))}
        </div>
      );
    }
    case "kanban":
      return (
        <div className="kanban">
          {block.columns.map((lane, i) => (
            <div className="kcol" key={i}>
              <b>{lane}</b>
              {block.rows.map((r, n) => (cell(r, i) ? <div className="kcard" key={n}>{cell(r, i)}</div> : null))}
            </div>
          ))}
        </div>
      );
    case "timeline":
      return (
        <ol className="tl">
          {block.rows.map((r, n) => (
            <li key={n}><b>{cell(r, 0)}</b>{r.slice(1).filter(Boolean).map((t, i) => <div key={i} className="muted small">{t}</div>)}</li>
          ))}
        </ol>
      );
    case "card_grid":
      return (
        <div className="cards">
          {block.rows.map((r, n) => (
            <div className="card" key={n}>
              <b>{cell(r, 0)}</b>
              {r.slice(1).map((t, i) => (t ? <div key={i} className="small"><span className="muted">{block.columns[i + 1]}: </span>{t}</div> : null))}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function DemoRenderer({ spec }: { spec: DemoSpec }) {
  const [current, setCurrent] = useState(0);
  const { accent, on } = accentColors(spec.theme.primary);
  const screen = spec.screens[current] ?? spec.screens[0];
  return (
    <div className="demo" data-tone={spec.theme.tone} style={{ "--accent": accent, "--on-accent": on } as React.CSSProperties}>
      <div className="demo-top"><b>{spec.app_name}</b><span>{spec.tagline}</span></div>
      <nav className="demo-nav" aria-label="Demo screens">
        {spec.screens.map((s, i) => (
          <button key={s.id} type="button" aria-current={i === current ? "page" : undefined} onClick={() => setCurrent(i)}>{s.title}</button>
        ))}
      </nav>
      <div className="demo-body">
        <p className="muted small" style={{ margin: 0 }}>{screen.purpose.replace(/[.\s]+$/, "")}. All data on this screen is made-up sample data.</p>
        {screen.blocks.map((b, i) => (
          <section className="block" key={i}>
            <h3>{b.title}</h3>
            <BlockView block={b} />
          </section>
        ))}
      </div>
    </div>
  );
}
