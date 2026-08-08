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

type TopicRule = {
  id: string;
  patterns: RegExp[];
  pick: (faqItems: FaqChatEntry[], ctx: SmartReplyContext) => string;
};

function buildTopicRules(ctx: SmartReplyContext): TopicRule[] {
  return [
    {
      id: 'topup',
      patterns: [
        /شحن|محفظ|رصيد|تحويل|ccp|rip|rib|virement|recharge|top.?up|fund|wallet|deposit|alimenter|crediter/u,
      ],
      pick: (_faq, c) =>
        c.topUpReply ??
        'Use bank transfer or CCP Algeria Post from the payment screen. Account: Riwaq Invest SARL — BNA Agence Alger Centre.',
    },
    {
      id: 'returns',
      patterns: [
        /ربح|ارباح|عائد|عوائد|return|profit|rendement|gain|roi|interest|yield|احسب|calculate|calcul/u,
      ],
      pick: (_faq, c) =>
        c.returnsReply ??
        'Returns depend on the project annual rate and duration. Check the simulator tab for projections and your portfolio for actual performance.',
    },
    {
      id: 'invest',
      patterns: [
        /استثمار|استثمر|invest|investir|projet|project|portfolio|محفظ|amount|مبلغ|ابد|commencer|start/u,
      ],
      pick: (_faq, c) =>
        c.investReply ??
        'Browse published projects, pick an amount that meets the minimum, and confirm from your wallet balance.',
    },
    {
      id: 'verify',
      patterns: [
        /وثق|توثيق|verify|verification|kyc|identity|identite|هوية|حساب/u,
      ],
      pick: (_faq, c) =>
        c.verifyReply ??
        faq.find((x) => /verify|وثق|verification/i.test(x.question))?.answer ??
        faq[2]?.answer ??
        '',
    },
  ];
}

function matchTopicReply(
  userMessage: string,
  faqItems: FaqChatEntry[],
  ctx: SmartReplyContext,
): string | null {
  const lower = normalize(userMessage);
  for (const rule of buildTopicRules(ctx)) {
    if (rule.patterns.some((re) => re.test(lower))) {
      const reply = rule.pick(faqItems, ctx).trim();
      if (reply) return reply;
    }
  }
  return null;
}

function localFaqAnswer(
  userMessage: string,
  faqItems: FaqChatEntry[],
  ctx: SmartReplyContext,
): string {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return faqItems[0]?.answer ?? '';
  }

  const topicReply = matchTopicReply(trimmed, faqItems, ctx);
  if (topicReply) return topicReply;

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
    return bestScore >= 3 ? `${best.answer}\n\n(${best.question})` : best.answer;
  }

  const lower = normalize(trimmed);
  if (/(hello|hi|salam|مرحب|bonjour|ahlan|assalam)/u.test(lower)) {
    return faqItems[0]?.answer ?? '';
  }
  if (/(new|جديد|debut|start|ابد|commencer|debuter)/u.test(lower)) {
    const intro = faqItems[0];
    const invest = faqItems.find((x) => /invest|استثمار|investir/i.test(x.question));
    return [intro?.answer, invest?.answer].filter(Boolean).join('\n\n');
  }

  return faqItems[0]?.answer ?? faqItems[2]?.answer ?? '';
}

/** Map localized quick-chip labels to dedicated smart replies when available. */
export function getQuickChipReply(
  chipLabel: string,
  quickLabels: { invest: string; returns: string; topUp: string; verify: string },
  ctx: SmartReplyContext,
): string | null {
  const trimmed = chipLabel.trim();
  if (trimmed === quickLabels.invest.trim() && ctx.investReply) return ctx.investReply;
  if (trimmed === quickLabels.returns.trim() && ctx.returnsReply) return ctx.returnsReply;
  if (trimmed === quickLabels.topUp.trim() && ctx.topUpReply) return ctx.topUpReply;
  if (trimmed === quickLabels.verify.trim() && ctx.verifyReply) return ctx.verifyReply;
  return null;
}

export type ChatbotApiPayload = {
  message: string;
  locale: string;
  faq: FaqChatEntry[];
};

/** Instant smart reply — local FAQ + topic rules (no network wait). */
export function getInstantAssistantReply(
  userMessage: string,
  faqItems: FaqChatEntry[],
  ctx: SmartReplyContext = {},
): string {
  return localFaqAnswer(userMessage, faqItems, ctx);
}

export async function getAssistantReply(
  userMessage: string,
  locale: string,
  faqItems: FaqChatEntry[],
  ctx: SmartReplyContext = {},
): Promise<string> {
  const local = getInstantAssistantReply(userMessage, faqItems, ctx);
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
      body: JSON.stringify({ message: userMessage, locale, faq: faqItems } satisfies ChatbotApiPayload),
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
