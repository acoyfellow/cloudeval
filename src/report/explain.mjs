function round(n) {
  return n.toFixed(3);
}

export function renderExplanation(result) {
  const models = [...result.modelRuns].sort((a, b) => b.summary.avgScore - a.summary.avgScore);
  const best = models[0];
  const worst = models[models.length - 1];
  const lines = [];

  lines.push(`# CloudEval explanation`);
  lines.push("");
  lines.push(`This run compared **${result.models.join(", ")}** on **${result.dataset}**.`);
  lines.push(`The judge was **${result.judgeModel}** and the provider was **${result.provider}**.`);
  lines.push("");

  if (best) {
    lines.push(`## Bottom line`);
    lines.push("");
    lines.push(`- Best overall model: **${best.model}** (${round(best.summary.avgScore)} avg, ${Math.round((best.summary.passRate ?? 0) * 100)}% pass rate)`);
    if (worst && worst.model !== best.model) {
      lines.push(`- Weakest overall model: **${worst.model}** (${round(worst.summary.avgScore)} avg)`);
      lines.push(`- Gap between best and worst: **${round(best.summary.avgScore - worst.summary.avgScore)}**`);
    }
  }

  const biggestMiss = models
    .flatMap((model) => model.rows.map((row) => ({ model: model.model, row })))
    .sort((a, b) => a.row.score - b.row.score)[0];

  if (biggestMiss) {
    lines.push("");
    lines.push("## Biggest miss to look at");
    lines.push("");
    lines.push(`- **${biggestMiss.model} / ${biggestMiss.row.id}** (${biggestMiss.row.scorer})`);
    lines.push(`  - input: ${biggestMiss.row.input}`);
    lines.push(`  - score: ${biggestMiss.row.score}`);
    lines.push(`  - output: ${JSON.stringify(biggestMiss.row.output).slice(0, 260)}`);
  }

  if (models.length > 1) {
    lines.push("");
    lines.push("## What to do next");
    lines.push("");
    lines.push("- If the best model is the one you wanted, promote it as the candidate.");
    lines.push("- If the scores are close, inspect the biggest misses before deciding.");
    lines.push("- If one model is consistently worse, use the row-level failures to guide prompt or tool fixes.");
  }

  return lines.join("\n");
}
