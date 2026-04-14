export default {
  name: "chat-response",
  rows: [
    {
      id: "kv",
      input: "What is Cloudflare Workers KV?",
      expected: "Workers KV is a globally distributed, eventually consistent key-value store built for low-latency reads at the edge.",
      scorer: "Factuality"
    },
    {
      id: "r2",
      input: "What is Cloudflare R2?",
      expected: "R2 is Cloudflare's object storage service compatible with the S3 API that has no egress fees.",
      scorer: "Factuality"
    },
    {
      id: "do",
      input: "What are Cloudflare Durable Objects?",
      expected: "Durable Objects provide strongly consistent, stateful storage and coordination for Workers, each with a unique identity and single-threaded execution.",
      scorer: "Factuality"
    }
  ]
};
