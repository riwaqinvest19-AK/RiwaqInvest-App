import {
  ASSISTANT_SUGGESTION_PROMPT,
  assistantKnowledgeAsFaq,
  getAnswerForQuestion,
  matchAssistantKnowledge,
  resolveAssistantInteraction,
  type AssistantInteractionResult,
} from '@/lib/assistantKnowledge';

export type { AssistantInteractionResult };

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

/** Map quick-chip labels to canonical knowledge questions for exact answers. */
const QUICK_CHIP_CANONICAL: Record<keyof QuickChipLabels, string> = {
  invest: 'كيف أستثمر وبكم؟',
  returns: 'كيف أحصل على العائد وهل هو مضمون؟',
  topUp: 'طرق الدفع والسحب؟',
  verify: 'ما هو KYC ولماذا أحتاج\u0647؟',
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

  const interaction = resolveInstantAssistantInteraction(userMessage, ctx, quickLabels);
  if (interaction.kind === 'answer') return interaction.answer;
  return null;
}

export function resolveInstantAssistantInteraction(
  userMessage: string,
  ctx: SmartReplyContext = {},
  quickLabels?: QuickChipLabels,
  prompt = ASSISTANT_SUGGESTION_PROMPT,
): AssistantInteractionResult {
  const trimmed = userMessage.trim();

  if (quickLabels) {
    const chip = getQuickChipReply(trimmed, quickLabels, ctx);
    if (chip) {
      return { kind: 'answer', answer: chip, confidence: 100 };
    }
  }

  return resolveAssistantInteraction(trimmed, prompt);
}

export function getDirectAnswerForQuestion(question: string): string | null {
  return getAnswerForQuestion(question);
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
