import Anthropic from "@anthropic-ai/sdk";
import type { AIModelConfig } from "@/lib/types";

// A single transaction the model extracted from a statement.
export interface ExtractedTxn {
  txn_date: string; // YYYY-MM-DD
  txn_time: string | null; // HH:MM as printed on the statement, if any
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
      "time": "HH:MM",             // 24-hour time exactly as printed on the statement, or null if the statement shows no time
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
- "time" must come from the statement itself — never invent it. Use null when the row has no time.
- If there are no transactions, return {"transactions": []}.
- Do not wrap the JSON in markdown fences or add commentary.`;

// Turn one raw model row into a validated ExtractedTxn, or null to skip it.
function normalizeRow(r: unknown): ExtractedTxn | null {
  if (!r || typeof r !== "object") return null;
  const row = r as Record<string, unknown>;
  const date = String(row.date ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null; // skip unparseable dates

  const rawAmount = Number(row.amount);
  if (!Number.isFinite(rawAmount)) return null;
  const amount = Math.abs(rawAmount);

  let direction: "debit" | "credit";
  if (row.direction === "credit" || row.direction === "debit") {
    direction = row.direction;
  } else {
    direction = rawAmount >= 0 ? "credit" : "debit";
  }

  // Normalize a "time" like "14:32" / "2:05 pm" to HH:MM (24h-ish text); keep null otherwise.
  let txn_time: string | null = null;
  const tRaw = String(row.time ?? "").trim();
  const tMatch = tRaw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?$/i);
  if (tMatch) {
    let hh = Number(tMatch[1]);
    const mm = tMatch[2];
    const mer = tMatch[3]?.toLowerCase();
    if (mer?.startsWith("p") && hh < 12) hh += 12;
    if (mer?.startsWith("a") && hh === 12) hh = 0;
    if (hh >= 0 && hh <= 23) txn_time = `${String(hh).padStart(2, "0")}:${mm}`;
  }

  return {
    txn_date: date,
    txn_time,
    description: String(row.description ?? "").slice(0, 500) || "—",
    amount,
    direction,
    category: row.category ? String(row.category).slice(0, 100) : null,
  };
}

// Salvage complete transaction objects from a JSON string that failed to parse
// as a whole (usually because the reply was truncated at the token limit, or
// carried a stray trailing comma). Walks the `transactions` array and pulls out
// each balanced { ... } block, parsing them one at a time; an incomplete final
// object is simply dropped instead of failing the entire run.
function salvageRows(text: string): unknown[] {
  const key = text.indexOf('"transactions"');
  const from = text.indexOf("[", key >= 0 ? key : 0);
  if (from < 0) return [];

  const objs: unknown[] = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let objStart = -1;

  for (let i = from + 1; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        const chunk = text.slice(objStart, i + 1);
        try {
          objs.push(JSON.parse(chunk));
        } catch {
          // Tolerate a trailing comma inside the object, e.g. {"a":1,}.
          try {
            objs.push(JSON.parse(chunk.replace(/,(\s*})$/, "$1")));
          } catch {
            // Unrecoverable single object — skip it.
          }
        }
        objStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      break; // end of the transactions array
    }
  }
  return objs;
}

/** Best-effort parse of a model response into transactions. */
export function parseTransactions(raw: string): ExtractedTxn[] {
  let text = raw.trim();
  // Strip accidental ```json fences.
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // Fall back to the first {...} block if there is surrounding prose.
  if (text.startsWith("{")) {
    // leave as-is
  } else {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) text = text.slice(start, end + 1);
  }

  let rows: unknown[] | null = null;
  try {
    const parsed = JSON.parse(text) as { transactions?: unknown };
    rows = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  } catch {
    // Whole-document parse failed (commonly a reply truncated at the token
    // limit). Salvage whatever complete transaction objects we can.
    rows = salvageRows(text);
    if (rows.length === 0) {
      throw new Error(
        "The model did not return valid JSON (and no transactions could be " +
          "recovered). The statement may be too large for one pass, or the " +
          "model returned an unexpected format — try again, or split the file."
      );
    }
  }

  const out: ExtractedTxn[] = [];
  for (const r of rows) {
    const row = normalizeRow(r);
    if (row) out.push(row);
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
      "PDF parsing is currently supported only with the Claude provider. Upload a CSV, or ask an admin to set Claude active in the admin panel."
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

/** Generic text completion across providers (used by the AI audit). */
export async function chat(
  config: AIModelConfig,
  system: string,
  user: string,
  maxTokens = 2000
): Promise<{ text: string; usage: TokenUsage }> {
  if (config.provider === "claude") {
    const client = new Anthropic({ apiKey: config.api_key });
    const message = await client.messages.create({
      model: config.model_name,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return {
      text,
      usage: {
        input_tokens: message.usage.input_tokens ?? 0,
        output_tokens: message.usage.output_tokens ?? 0,
      },
    };
  }
  return openAICompatChat(
    config,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    maxTokens
  );
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
