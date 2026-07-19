import Anthropic from "@anthropic-ai/sdk";
import type { AIModelConfig } from "@/lib/types";

// A single transaction the model extracted from a statement.
export interface ExtractedTxn {
  txn_date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive magnitude
  direction: "debit" | "credit";
  category: string | null;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface ExtractResult {
  transactions: ExtractedTxn[];
  usage: TokenUsage;
}

interface FileInput {
  bytes: Uint8Array;
  fileName: string;
  isPdf: boolean;
}

const SYSTEM_PROMPT =
  "You are a meticulous bookkeeping assistant that extracts transactions from a bank statement. " +
  "Return ONLY the transactions that actually appear on the statement. Do not invent data.";

const INSTRUCTION = `Extract every transaction from this bank statement.

Respond with ONLY a JSON object of this exact shape, and nothing else:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "short cleaned-up description",
      "amount": 1234.56,            // positive number, no currency symbol or thousands separators
      "direction": "debit" | "credit",  // debit = money out, credit = money in
      "category": "one of: Revenue, Cost of goods, Payroll, Utilities, Fees, Software, Government, Transfer, Other"
    }
  ]
}

Rules:
- "amount" is always a positive magnitude; use "direction" to indicate money in vs out.
- Use ISO dates (YYYY-MM-DD). Infer the year from the statement period if a row omits it.
- If there are no transactions, return {"transactions": []}.
- Do not wrap the JSON in markdown fences or add commentary.`;

/** Best-effort parse of a model response into transactions. */
export function parseTransactions(raw: string): ExtractedTxn[] {
  let text = raw.trim();
  // Strip accidental ```json fences.
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // Fall back to the first {...} block if there is surrounding prose.
  if (!text.startsWith("{")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("The model did not return valid JSON.");
  }

  const rows = (parsed as { transactions?: unknown }).transactions;
  if (!Array.isArray(rows)) return [];

  const out: ExtractedTxn[] = [];
  for (const r of rows) {
    const row = r as Record<string, unknown>;
    const date = String(row.date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue; // skip unparseable dates

    const rawAmount = Number(row.amount);
    if (!Number.isFinite(rawAmount)) continue;
    const amount = Math.abs(rawAmount);

    let direction: "debit" | "credit";
    if (row.direction === "credit" || row.direction === "debit") {
      direction = row.direction;
    } else {
      direction = rawAmount >= 0 ? "credit" : "debit";
    }

    out.push({
      txn_date: date,
      description: String(row.description ?? "").slice(0, 500) || "—",
      amount,
      direction,
      category: row.category ? String(row.category).slice(0, 100) : null,
    });
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

const OPENAI_COMPAT_ENDPOINT: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
};

// --- Claude (official Anthropic SDK): native PDF + CSV -------------------
async function extractWithClaude(
  config: AIModelConfig,
  file: FileInput
): Promise<ExtractResult> {
  const client = new Anthropic({ apiKey: config.api_key });

  const content: Anthropic.ContentBlockParam[] = [];
  if (file.isPdf) {
    content.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: toBase64(file.bytes),
      },
    });
    content.push({ type: "text", text: INSTRUCTION });
  } else {
    const csv = Buffer.from(file.bytes).toString("utf-8");
    content.push({ type: "text", text: `${INSTRUCTION}\n\nCSV contents:\n${csv}` });
  }

  const message = await client.messages.create({
    model: config.model_name,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const text = message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return {
    transactions: parseTransactions(text),
    usage: {
      input_tokens: message.usage.input_tokens ?? 0,
      output_tokens: message.usage.output_tokens ?? 0,
    },
  };
}

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/**
 * Call an OpenAI-compatible chat endpoint. If the provider rejects the request
 * with a 402 "can only afford N" (common on free OpenRouter accounts), retry
 * once with the affordable token budget instead of failing outright.
 */
async function openAICompatChat(
  config: AIModelConfig,
  messages: ChatMessage[],
  maxTokens: number
): Promise<{ text: string; usage: TokenUsage }> {
  const endpoint = OPENAI_COMPAT_ENDPOINT[config.provider];

  async function call(mt: number) {
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.api_key}`,
      },
      body: JSON.stringify({ model: config.model_name, max_tokens: mt, messages }),
    });
  }

  let res = await call(maxTokens);
  if (res.status === 402) {
    const detail = await res.text().catch(() => "");
    const affordable = Number(detail.match(/can only afford (\d+)/i)?.[1]);
    if (Number.isFinite(affordable) && affordable >= 256) {
      // Leave a little headroom below the stated ceiling.
      res = await call(Math.max(256, affordable - 64));
    } else {
      throw new Error(
        `${config.provider} request failed (402): ${detail.slice(0, 500)}`
      );
    }
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `${config.provider} request failed (${res.status}): ${detail.slice(0, 500)}`
    );
  }
  const json = await res.json();
  return {
    text: json?.choices?.[0]?.message?.content ?? "",
    usage: {
      input_tokens: json?.usage?.prompt_tokens ?? 0,
      output_tokens: json?.usage?.completion_tokens ?? 0,
    },
  };
}

// --- OpenAI / OpenRouter (OpenAI-compatible chat): CSV text only ---------
async function extractWithOpenAICompatible(
  config: AIModelConfig,
  file: FileInput
): Promise<ExtractResult> {
  if (file.isPdf) {
    throw new Error(
      "PDF parsing is currently supported only with the Claude provider. Upload a CSV, or set Claude active in Settings → Models."
    );
  }
  const csv = Buffer.from(file.bytes).toString("utf-8");
  const { text, usage } = await openAICompatChat(
    config,
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${INSTRUCTION}\n\nCSV contents:\n${csv}` },
    ],
    16000
  );
  return { transactions: parseTransactions(text), usage };
}

/** Run the configured provider to extract transactions from a statement file. */
export async function extractTransactions(
  config: AIModelConfig,
  file: FileInput
): Promise<ExtractResult> {
  if (config.provider === "claude") return extractWithClaude(config, file);
  return extractWithOpenAICompatible(config, file);
}

/**
 * Minimal round-trip to verify a provider's key + model actually work.
 * Returns the model's reply text and the token usage of the ping.
 */
export async function pingProvider(
  config: AIModelConfig
): Promise<{ reply: string; usage: TokenUsage }> {
  if (!config.api_key) throw new Error("No API key saved for this provider.");

  if (config.provider === "claude") {
    const client = new Anthropic({ apiKey: config.api_key });
    const message = await client.messages.create({
      model: config.model_name,
      max_tokens: 16,
      messages: [
        { role: "user", content: "Reply with exactly: OK" },
      ],
    });
    const reply = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return {
      reply: reply || "(empty reply)",
      usage: {
        input_tokens: message.usage.input_tokens ?? 0,
        output_tokens: message.usage.output_tokens ?? 0,
      },
    };
  }

  const { text, usage } = await openAICompatChat(
    config,
    [{ role: "user", content: "Reply with exactly: OK" }],
    16
  );
  return { reply: text.trim() || "(empty reply)", usage };
}
