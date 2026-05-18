/**
 * Riwaq Invest — Investor chatbot (Supabase Edge Function).
 *
 * Deploy: `supabase functions deploy investor-chatbot --no-verify-jwt`
 *   (or set verify_jwt true and call with `Authorization: Bearer <anon key>` from the app.)
 *
 * Optional secret (Dashboard → Edge Functions → Secrets):
 *   OPENAI_API_KEY — if set, replies use OpenAI with FAQ as context; otherwise FAQ heuristics only.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type FaqEntry = { question: string; answer: string };
type Payload = { message?: string; locale?: string; faq?: FaqEntry[] };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept-language",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, " ")
    .trim();
}

function tokenize(s: string): Set<string> {
  const n = normalize(s);
  const parts = n.split(/\s+/).filter((w) => w.length > 2);
  return new Set(parts);
}

function scoreQuestion(userMsg: string, faq: FaqEntry): number {
  const u = tokenize(userMsg);
  const q = tokenize(faq.question);
  const a = tokenize(faq.answer);
  let score = 0;
  for (const w of u) {
    if (q.has(w)) score += 3;
    if (a.has(w)) score += 1;
  }
  return score;
}

function faqFallbackReply(userMessage: string, faqItems: FaqEntry[]): string {
  const trimmed = userMessage.trim();
  if (!trimmed) return faqItems[0]?.answer ?? "";

  let best: FaqEntry | null = null;
  let bestScore = 0;
  for (const item of faqItems) {
    const s = scoreQuestion(trimmed, item);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  if (best && bestScore >= 3) return `${best.answer}\n\n(${best.question})`;
  if (best && bestScore > 0) return best.answer;

  const lower = normalize(trimmed);
  if (/(hello|hi|salam|مرحبا|bonjour)/u.test(lower)) return faqItems[0]?.answer ?? "";
  if (/(new|جديد|debut|start|ابدأ)/u.test(lower)) {
    const intro = faqItems[0];
    const invest = faqItems.find((x) => /invest|استثمار|investir/i.test(x.question));
    return [intro?.answer, invest?.answer].filter(Boolean).join("\n\n");
  }
  return faqItems[2]?.answer ?? faqItems[0]?.answer ?? "";
}

function buildFaqContext(faq: FaqEntry[], maxChars: number): string {
  let out = "";
  for (const { question, answer } of faq) {
    const block = `Q: ${question}\nA: ${answer}\n\n`;
    if (out.length + block.length > maxChars) break;
    out += block;
  }
  return out.trim() || "(no FAQ entries)";
}

async function openAiReply(
  userMessage: string,
  locale: string,
  faq: FaqEntry[],
  apiKey: string,
): Promise<string | null> {
  const faqText = buildFaqContext(faq, 12000);
  const system = `You are Riwaq Invest's concise assistant for retail investors. Language: prefer ${locale}. 
Use ONLY the FAQ knowledge below for factual claims; if something is not covered, say you are not sure and suggest contacting support or reading the in-app FAQ.
Keep answers short (under 180 words), friendly, and practical. No investment advice that guarantees returns.

FAQ knowledge:
${faqText}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 500,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.warn("[investor-chatbot] OpenAI error", res.status, t.slice(0, 500));
    return null;
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...cors } });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const message = typeof payload.message === "string" ? payload.message : "";
  const locale = typeof payload.locale === "string" ? payload.locale : "en";
  const faq = Array.isArray(payload.faq)
    ? payload.faq.filter(
        (x): x is FaqEntry =>
          x != null &&
          typeof x.question === "string" &&
          typeof x.answer === "string",
      )
    : [];

  if (!message.trim()) {
    return json({ reply: faq[0]?.answer ?? "" });
  }

  if (faq.length === 0) {
    return json({ reply: "No FAQ context was sent." }, 200);
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (openaiKey) {
    const ai = await openAiReply(message, locale, faq, openaiKey);
    if (ai) return json({ reply: ai });
  }

  const reply = faqFallbackReply(message, faq);
  return json({ reply });
});
