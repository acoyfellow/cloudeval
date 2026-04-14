function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function round(n) {
  return Number.isFinite(n) ? n.toFixed(3) : "0.000";
}

function summarizeModels(result) {
  return [...result.modelRuns].sort((a, b) => b.summary.avgScore - a.summary.avgScore);
}

export function renderHtmlReport(result) {
  const sortedModels = summarizeModels(result);
  const best = sortedModels[0];
  const worst = sortedModels[sortedModels.length - 1];
  const allRows = result.modelRuns.flatMap((model) =>
    model.rows.map((row) => ({
      model: model.model,
      id: row.id,
      input: row.input,
      score: row.score,
      scorer: row.scorer,
      output: row.output,
    })),
  );
  const misses = [...allRows]
    .filter((row) => row.score < 1)
    .sort((a, b) => a.score - b.score)
    .slice(0, 8);

  const rowGroups = new Map();
  for (const model of result.modelRuns) {
    for (const row of model.rows) {
      if (!rowGroups.has(row.id)) rowGroups.set(row.id, []);
      rowGroups.get(row.id).push({ model: model.model, score: row.score, input: row.input });
    }
  }

  const spreads = [...rowGroups.entries()]
    .map(([id, items]) => {
      const sorted = [...items].sort((a, b) => b.score - a.score);
      const bestItem = sorted[0];
      const worstItem = sorted[sorted.length - 1];
      return { id, best: bestItem, worst: worstItem, spread: bestItem.score - worstItem.score };
    })
    .sort((a, b) => b.spread - a.spread)
    .slice(0, 5);

  const tableRows = sortedModels
    .map(
      (model, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><code>${escapeHtml(model.model)}</code></td>
          <td>${round(model.summary.avgScore)}</td>
          <td>${pct(model.summary.passRate ?? 0)}</td>
          <td>${model.summary.rows}</td>
          <td>${model.summary.failures}</td>
        </tr>`,
    )
    .join("");

  const missRows =
    misses.length === 0
      ? `<p>None 🎉</p>`
      : `<div class="stack">${misses
          .map(
            (row) => `
          <article class="card">
            <h3><code>${escapeHtml(row.model)} / ${escapeHtml(row.id)}</code></h3>
            <p><strong>Input:</strong> ${escapeHtml(row.input)}</p>
            <p><strong>Scorer:</strong> ${escapeHtml(row.scorer)}</p>
            <p><strong>Score:</strong> ${round(row.score)}</p>
            <details>
              <summary>Output</summary>
              <pre>${escapeHtml(JSON.stringify(row.output, null, 2))}</pre>
            </details>
          </article>`,
          )
          .join("")}</div>`;

  const spreadRows =
    spreads.length === 0
      ? `<p>None</p>`
      : `<ul>${spreads
          .map(
            (row) => `<li><code>${escapeHtml(row.id)}</code> — spread ${round(row.spread)} (best: ${escapeHtml(row.best.model)} ${round(row.best.score)}, worst: ${escapeHtml(row.worst.model)} ${round(row.worst.score)})</li>`,
          )
          .join("")}</ul>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CloudEval report — ${escapeHtml(result.dataset)}</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
      margin: 0;
      padding: 32px;
      background: #0b1020;
      color: #e7ecff;
    }
    main { max-width: 1100px; margin: 0 auto; }
    .hero {
      background: linear-gradient(180deg, rgba(92, 124, 250, 0.18), rgba(11, 16, 32, 0.98));
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 24px;
    }
    h1, h2, h3 { line-height: 1.15; }
    h1 { margin: 0 0 8px; font-size: 2.1rem; }
    h2 { margin-top: 30px; }
    p { color: #c8d0f2; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    code { background: rgba(255,255,255,0.08); padding: 0.15rem 0.35rem; border-radius: 6px; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .metric, .card {
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      border-radius: 16px;
      padding: 16px;
    }
    .metric strong { display: block; font-size: 1.4rem; color: white; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 14px; }
    th, td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left; vertical-align: top; }
    th { color: #9fb0ff; font-size: 0.9rem; }
    tr:hover td { background: rgba(255,255,255,0.03); }
    .stack { display: grid; gap: 12px; }
    details { margin-top: 10px; }
    summary { cursor: pointer; color: #9fb0ff; }
    pre { white-space: pre-wrap; word-break: break-word; margin: 10px 0 0; }
    .muted { color: #9aa6cf; }
    .pill { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 999px; background: rgba(92,124,250,0.2); color: #dfe7ff; font-size: 0.85rem; }
  </style>
</head>
<body>
<main>
  <section class="hero">
    <span class="pill">CloudEval</span>
    <h1>Report for <code>${escapeHtml(result.dataset)}</code></h1>
    <p class="muted">Run <code>${escapeHtml(result.runId)}</code> • provider <code>${escapeHtml(result.provider)}</code> • judge <code>${escapeHtml(result.judgeModel)}</code></p>
    <div class="grid">
      <div class="metric"><span>Best model</span><strong>${escapeHtml(best?.model ?? "n/a")}</strong><div>${best ? `${round(best.summary.avgScore)} avg · ${pct(best.summary.passRate ?? 0)} pass` : "No results"}</div></div>
      <div class="metric"><span>Weakest model</span><strong>${escapeHtml(worst?.model ?? "n/a")}</strong><div>${worst ? `${round(worst.summary.avgScore)} avg` : "No results"}</div></div>
      <div class="metric"><span>Models</span><strong>${result.models.length}</strong><div>compared in this run</div></div>
      <div class="metric"><span>Rows</span><strong>${sortedModels.reduce((sum, model) => sum + model.summary.rows, 0)}</strong><div>total scored examples</div></div>
    </div>
  </section>

  <section>
    <h2>Summary</h2>
    <table>
      <thead>
        <tr><th>Rank</th><th>Model</th><th>Avg score</th><th>Pass rate</th><th>Rows</th><th>Failures</th></tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </section>

  <section>
    <h2>Biggest misses</h2>
    ${missRows}
  </section>

  <section>
    <h2>Largest model spread by row</h2>
    ${spreadRows}
  </section>
</main>
</body>
</html>`;
}
