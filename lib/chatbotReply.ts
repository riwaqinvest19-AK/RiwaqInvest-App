import {
  assistantKnowledgeAsFaq,
  matchAssistantKnowledge,
} from '@/lib/assistantKnowledge';

export type FaqChatEntry = { question: string; answer: string };

export type SmartReplyContext = {
  topUpReply?: string;
  investReply?: string;
  returnsReply?: string;
  verifyReply?: string;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, ' ')
    .trim();
}

function tokenize(s: string): Set<string> {
  const n = normalize(s);
  const parts = n.split(/\s+/).filter((w) => w.length > 2);
  return new Set(parts);
}

function scoreQuestion(userMsg: string, faq: FaqChatEntry): number {
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

function localFaqAnswer(userMessage: string, faqItems: FaqChatEntry[]): string {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return faqItems[0]?.answer ?? '';
  }

  let best: FaqChatEntry | null = null;
  let bestScore = 0;
  for (const item of faqItems) {
    const s = scoreQuestion(trimmed, item);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }

  if (best && bestScore >= 2) {
    return best.answer;
  }

  const lower = normalize(trimmed);
  if (/(hello|hi|salam|مرحب|bonjour|ahlan|assalam)/u.test(lower)) {
    return faqItems[0]?.answer ?? '';
  }

  return faqItems[0]?.answer ?? '';
}

/** Map quick-chip labels to canonical knowledge questions for exact answers. */
const QUICK_CHIP_CANONICAL: Record<'invest' | 'returns' | 'topUp' | 'verify', string> = {
  invest: 'كيف أستثمر وبكم؟',
  returns: 'كيف أحصل على العائد وهل هو مضمون؟',
  topUp: 'طرق الدفع والسحب؟',
  verify: 'ما هو KYC ولماذا أحتاجه؟',
};

/** Map localized quick-chip labels to dedicated smart replies when available. */
export function getQuickChipReply(
  chipLabel: string,
  quickLabels: { invest: string; returns: string; topUp: string; verify: string },
  ctx: SmartReplyContext,
): string | null {
  const trimmed = chipLabel.trim();
  const keys = ['invest', 'returns', 'topUp', 'verify'] as const;
  for (const key of keys) {
    if (trimmed === quickLabels[key].trim()) {
      const canonical = QUICK_CHIP_CANONICAL[key];
      const knowledge = matchAssistantKnowledge(canonical);
      if (knowledge) return knowledge;
      const ctxKey = `${key}Reply` as keyof SmartReplyContext;
      if (ctx[ctxKey]) return ctx[ctxKey] as string;
    }
  }
  return null;
}

export type ChatbotApiPayload = {
  message: string;
  locale: string;
  faq: FaqChatEntry[];
};

/** Instant smart reply — full knowledge base + quick chips (no network). */
export function getInstantAssistantReply(
  userMessage: string,
  ctx: SmartReplyContext = {},
  quickLabels?: { invest: string; returns: string; topUp: string; verify: string },
): string {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return ASSISTANT_KNOWLEDGE_FIRST_ANSWER;
  }

  if (quickLabels) {
    const chip = getQuickChipReply(trimmed, quickLabels, ctx);
    if (chip) return chip;
  }

  const knowledgeHit = matchAssistantKnowledge(trimmed);
  if (knowledgeHit) return knowledgeHit;

  return localFaqAnswer(trimmed, assistantKnowledgeAsFaq());
}

const ASSISTANT_KNOWLEDGE_FIRST_ANSWER =
  'تطبيق رقمي للتمويل الجماعي العقاري يهدف إلى ربط المستثمرين بالمشاريع العقارية، وتمكينهم من المشاركة في تمويل المشاريع بمبالغ مناسبة مع توفير المعلومات اللازمة.';

export async function getAssistantReply(
  userMessage: string,
  locale: string,
  ctx: SmartReplyContext = {},
): Promise<string> {
  const faq = assistantKnowledgeAsFaq();
  const local = getInstantAssistantReply(userMessage, ctx);
  const apiUrl = process.env.EXPO_PUBLIC_CHATBOT_API_URL?.trim();
  if (!apiUrl) {
    return local;
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept-Language': locale,
    };
    const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (anon && /supabase\.co\/functions\/v1\//i.test(apiUrl)) {
      headers.Authorization = `Bearer ${anon}`;
      headers.apikey = anon;
    }
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: userMessage, locale, faq } satisfies ChatbotApiPayload),
    });
    if (res.ok) {
      const data = (await res.json()) as { reply?: string };
      if (data?.reply && typeof data.reply === 'string') {
        return data.reply.trim();
      }
    }
  } catch {
    /* fall back */
  }
  return local;
}
