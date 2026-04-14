import { judgeScore } from "./workers-ai-judge.mjs";
import { SCORERS } from "./registry.mjs";

export function makeJudgeScorer(name, { accountId, apiToken, judgeModel }) {
  const rubric = SCORERS[name];
  if (!rubric) throw new Error(`Unknown scorer: ${name}`);

  return async ({ input, output, expected, metadata }) => {
    return judgeScore({
      accountId,
      apiToken,
      judgeModel,
      input,
      expected,
      output,
      rubric,
      name,
      metadata,
    });
  };
}
