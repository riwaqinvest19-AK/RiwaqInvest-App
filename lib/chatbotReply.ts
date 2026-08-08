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

export type QuickChipLabels = {
  invest: string;
  returns: string;
  topUp: string;
  verify: string;
  notifications: string;
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
  let score = 0;
  for (const w of u) {
    if (q.has(w)) score += 3;
  }
  return score;
}

function localFaqAnswer(userMessage: string, faqItems: FaqChatEntry[]): string | null {
  const trimmed = userMessage.trim();
  if (!trimmed) return null;

  let best: FaqChatEntry | null = null;
  let bestScore = 0;
  for (const item of faqItems) {
    const s = scoreQuestion(trimmed, item);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }

  if (best && bestScore >= 9) {
    return best.answer;
  }

  return null;
}

/** Map quick-chip labels to canonical knowledge questions for exact answers. */
const QUICK_CHIP_CANONICAL: Record<keyof QuickChipLabels, string> = {
  invest: 'كيف أستثمر وبكم؟',
  returns: 'كيف أحصل على العائد وهل هو مضمون؟',
  topUp: 'طرق الدفع والسحب؟',
  verify: 'ما هو KYC ولماذا أحتاجhe؟',
  notifications: 'هل سأحصل على إشعارات؟',
};

/** Map localized quick-chip labels to dedicated smart replies when available. */
export function getQuickChipReply(
  chipLabel: string,
  quickLabels: QuickChipLabels,
  ctx: SmartReplyContext,
): string | null {
  const trimmed = chipLabel.trim();
  const keys: (keyof QuickChipLabels)[] = [
    'invest',
    'returns',
    'topUp',
    'verify',
    'notifications',
  ];
  for (const key of keys) {
    if (trimmed === quickLabels[key].trim()) {
      const knowledge = matchAssistantKnowledge(QUICK_CHIP_CANONICAL[key]);
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

const ASSISTANT_KNOWLEDGE_FIRST_ANSWER =
  'تطبيق رقمي للتمويل الجماعي العقاري يهدف إلى ربط المستثمرين بالمشاريع العقارية، وتمكينهم من المشاركة في تمويل المشاريع بمبالغ مناسبة مع توفير المعلومات اللازمة.';

/** Instant smart reply — full knowledge base + quick chips (no network). */
export function getInstantAssistantReply(
  userMessage: string,
  ctx: SmartReplyContext = {},
  quickLabels?: QuickChipLabels,
): string | null {
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

export async function getAssistantReply(
  userMessage: string,
  locale: string,
  ctx: SmartReplyContext = {},
): Promise<string> {
  const faq = assistantKnowledgeAsFaq();
  const local = getInstantAssistantReply(userMessage, ctx);
  const apiUrl = process.env.EXPO_PUBLIC_CHATBOT_API_URL?.trim();
  if (!apiUrl) {
    return local ?? ASSISTANT_KNOWLEDGE_FIRST_ANSWER;
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
  return local ?? ASSISTANT_KNOWLEDGE_FIRST_ANSWER;
}
