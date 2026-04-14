import { callWorkersAi } from "../providers/workers-ai.mjs";

const CHOICES = { A: 1, B: 0.5, C: 0 };

export function parseChoice(text) {
  const match = text.match(/\b([ABC])\b/);
  return match?.[1] ?? null;
}

export function buildPrompt({ input, expected, output, rubric }) {
  return `${rubric}\n\nUser asked: ${input}\nExpected behavior: ${expected}\nAgent response: ${output}\n\nAnswer with a single letter A, B, or C.`;
}

export async function judgeScore({ accountId, apiToken, judgeModel, input, expected, output, rubric, name }) {
  const prompt = buildPrompt({ input, expected, output, rubric });
  const response = await callWorkersAi({
    accountId,
    apiToken,
    model: judgeModel,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 32
  });

  const choice = parseChoice(response);
  if (!choice) {
    return {
      name,
      score: 0.5,
      metadata: { error: "unrecognized choice", raw: response.slice(0, 200) }
    };
  }

  return {
    name,
    score: CHOICES[choice] ?? 0,
    metadata: { choice, raw: response.slice(0, 200) }
  };
}
