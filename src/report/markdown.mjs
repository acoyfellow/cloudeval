function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function round(n) {
  return n.toFixed(3);
}

function sortByScoreDesc(a, b) {
  return b.summary.avgScore - a.summary.avgScore;
}

export function renderMarkdownReport(result) {
  const lines = [];
  const sortedModels = [...result.modelRuns].sort(sortByScoreDesc);
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

  lines.push(`# CloudEval report`);
  lines.push("");
  lines.push(`- Dataset: **${result.dataset}**`);
  lines.push(`- Models: **${result.models.join(", ")}**`);
  lines.push(`- Judge: **${result.judgeModel}**`);
  lines.push(`- Run ID: **${result.runId}**`);
  lines.push(`- Provider: **${result.provider}**`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Rank | Model | Avg score | Pass rate | Rows | Failures |");
  lines.push("| ---: | --- | ---: | ---: | ---: | ---: |");
  sortedModels.forEach((model, index) => {
    lines.push(
      `| ${index + 1} | ${model.model} | ${round(model.summary.avgScore)} | ${pct(model.summary.passRate ?? 0)} | ${model.summary.rows} | ${model.summary.failures} |`,
    );
  });

  if (sortedModels.length > 1) {
    const best = sortedModels[0];
    const worst = sortedModels[sortedModels.length - 1];
    lines.push("");
    lines.push(
      `Best model in this run: **${best.model}** (${round(best.summary.avgScore)} avg)`,
    );
    lines.push(
      `Largest gap in this run: **${best.model}** vs **${worst.model}** (${round(best.summary.avgScore - worst.summary.avgScore)})`,
    );
  }

  lines.push("");
  lines.push("## Biggest misses");
  lines.push("");
  const misses = [...allRows]
    .filter((row) => row.score < 1)
    .sort((a, b) => a.score - b.score)
    .slice(0, 8);
  if (misses.length === 0) {
    lines.push("- None 🎉");
  } else {
    for (const row of misses) {
      lines.push(`- **${row.model} / ${row.id}** — ${row.input}`);
      lines.push(`  - scorer: ${row.scorer}`);
      lines.push(`  - score: ${row.score}`);
      lines.push(`  - output: ${JSON.stringify(row.output).slice(0, 240)}`);
    }
  }

  if (sortedModels.length > 1) {
    lines.push("");
    lines.push("## Largest model spread by row");
    lines.push("");
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
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];
        return { id, best, worst, spread: best.score - worst.score };
      })
      .sort((a, b) => b.spread - a.spread)
      .slice(0, 5);

    if (spreads.length === 0) {
      lines.push("- None");
    } else {
      for (const row of spreads) {
        lines.push(`- **${row.id}** — spread ${round(row.spread)}`);
        lines.push(`  - best: ${row.best.model} (${row.best.score})`);
        lines.push(`  - worst: ${row.worst.model} (${row.worst.score})`);
      }
    }
  }

  return lines.join("\n");
}
