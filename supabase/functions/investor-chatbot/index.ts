/**
 * Riwaq Invest — Investor chatbot (Supabase Edge Function).
 *
 * Deploy: `supabase functions deploy investor-chatbot --no-verify-jwt`
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { assistantKnowledgeAsFaq, matchAssistantKnowledge } from "./knowledge.ts";

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
Use ONLY the FAQ knowledge below for factual claims; if something is not covered, say you are not sure and suggest contacting support.
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
  const faq = assistantKnowledgeAsFaq();

  if (!message.trim()) {
    return json({ reply: faq[0]?.answer ?? "" });
  }

  const knowledgeHit = matchAssistantKnowledge(message);
  if (knowledgeHit) {
    return json({ reply: knowledgeHit });
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (openaiKey) {
    const ai = await openAiReply(message, locale, faq, openaiKey);
    if (ai) return json({ reply: ai });
  }

  return json({ reply: faq[0]?.answer ?? "" });
});
