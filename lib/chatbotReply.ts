export type FaqChatEntry = { question: string; answer: string };

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

  if (best && bestScore >= 3) {
    return `${best.answer}\n\n(${best.question})`;
  }

  if (best && bestScore > 0) {
    return best.answer;
  }

  const lower = normalize(trimmed);
  if (/(hello|hi|salam|مرحبا|bonjour)/u.test(lower)) {
    return faqItems[0]?.answer ?? '';
  }
  if (/(new|جديد|debut|start|ابدأ)/u.test(lower)) {
    const intro = faqItems[0];
    const invest = faqItems.find((x) => /invest|استثمار|investir/i.test(x.question));
    return [intro?.answer, invest?.answer].filter(Boolean).join('\n\n');
  }

  return (
    faqItems[2]?.answer ??
    faqItems[0]?.answer ??
    ''
  );
}

export type ChatbotApiPayload = {
  message: string;
  locale: string;
  faq: FaqChatEntry[];
};

export async function getAssistantReply(
  userMessage: string,
  locale: string,
  faqItems: FaqChatEntry[],
): Promise<string> {
  const apiUrl = process.env.EXPO_PUBLIC_CHATBOT_API_URL?.trim();
  if (apiUrl) {
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
  }
  return localFaqAnswer(userMessage, faqItems);
}
