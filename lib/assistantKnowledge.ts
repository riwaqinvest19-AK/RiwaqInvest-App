export type AssistantKnowledgeEntry = {
  id: string;
  section: string;
  question: string;
  answer: string;
  /** Extra phrasings that should resolve to the same canonical answer. */
  aliases?: string[];
  patterns: RegExp[];
};

export type KnowledgeBaseEntry = {
  keywords: string[];
  question: string;
  answer: string;
};

/** Priority Q&A — matched first via keywords before the broader knowledge base. */
export const KNOWLEDGE_BASE: KnowledgeBaseEntry[] = [
  {
    keywords: ['إشعارات', 'اشعارات', 'إشعار', 'اشعار', 'تنبيهات'],
    question: 'هل سأحصل على إشعارات؟',
    answer:
      'يمكن للتطبيق إرسال إشعارات حول الاستثمارات والمشاريع والتحديثات المهمة.',
  },
  {
    keywords: ['تمويل استثماري', 'تمويل استثماراتي', 'كيف أثول استثماري', 'طريقة التمويل'],
    question: 'كيف يمكنني تمويل استثماري؟',
    answer:
      'تتم عمليات التمويل من خلال وسائل الدفع الإلكتروني التي سيتم اعتمادها وربطها بالتطبيق وفق الإطار القانوني والتنظيمي.',
  },
  {
    keywords: ['الفرق بين رصيد المحفظة', 'رصيد المحفظة والاستثمار', 'فرق المحفظة'],
    question: 'ما الفرق بين رصيد المحفظة والاستثمار؟',
    answer:
      'رصيد المحفظة يمثل الأموال المتاحة للاستخدام وفق النظام، بينما الاستثمار يمثل المبلغ المخصص لمشروع معين.',
  },
  {
    keywords: ['سحب أموالي', 'سحب الأموال', 'كيف أسحب'],
    question: 'هل يمكنني سحب أموالي؟',
    answer:
      'تعتمد إمكانية السحب على طبيعة الرصيد، ومرحلة الاستثمار، وشروط المشروع والأنظمة المعتمدة.',
  },
  {
    keywords: ['سجل معاملاتي', 'سجل المعاملات', 'معاملاتي', 'History'],
    question: 'أين أجد سجل معاملاتي؟',
    answer: 'من قسم المعاملات / Transaction History داخل حسابك.',
  },
  {
    keywords: ['CIB', 'الذهبية', 'EDAHABIA', 'بطاقة نقدية'],
    question: 'هل يدعم التطبيق CIB أو EDAHABIA؟',
    answer:
      'يمكن دعم وسائل الدفع المحلية المعتمدة (CIB و EDAHABIA) بعد استكمال إجراءات الربط والتراخيص اللازمة.',
  },
  {
    keywords: ['المطور تحديد مبلغ', 'تحديد التمويل للمطور'],
    question: 'هل يمكن للمطور تحديد مبلغ التمويل؟',
    answer:
      'يتم تحديد قيمة التمويل المستهدف وفق دراسة المشروع وشروط الإدراج والتقييم المعتمد.',
  },
  {
    keywords: ['أتابع استثماري', 'متابعة استثماري', 'كيف أتابع'],
    question: 'كيف أتابع استثماري؟',
    answer:
      'من قسم استثماراتي يمكنك الاطلاع على المشاريع التي شاركت فيها وحالة كل استثمار.',
  },
  {
    keywords: ['تقدم المشروع', 'متابعة المشروع العقاري', 'نسبة الإنجاز'],
    question: 'هل يمكنني متابعة تقدم المشروع العقاري؟',
    answer:
      'نعم، يمكن توفير تحديثات حول مراحل تنفيذ المشروع ونسبة الإنجاز وفق المعلومات التي يقدمها المطور وآلية المتابعة المعتمدة.',
  },
];

/** Full Riwaq Assistant knowledge base — competition Q&A (7 sections, 26 entries). */
export const ASSISTANT_KNOWLEDGE: AssistantKnowledgeEntry[] = [
  // ── 1. أسئلة عامة ──
  {
    id: 'general_what_is',
    section: 'general',
    question: 'ما هو Riwaq Invest؟',
    answer:
      'تطبيق رقمي للتمويل الجماعي العقاري يهدف إلى ربط المستثمرين بالمشاريع العقارية، وتمكينهم من المشاركة في تمويل المشاريع بمبالغ مناسبة مع توفير المعلومات اللازمة.',
    patterns: [
      /ما\s+هو\s+riwaq/u,
      /what\s+is\s+riwaq/u,
      /qu\s+est\s+ce\s+que\s+riwaq/u,
      /تعريف\s+riwaq/u,
      /ما\s+هو\s+رواق/u,
    ],
  },
  {
    id: 'general_concept',
    section: 'general',
    question: 'ما فكرة Riwaq Invest؟',
    answer:
      'تقوم الفكرة على تجميع مساهمات عدد من المستثمرين لتمويل مشاريع عقارية وفق شروط الاستثمار المحددة للحصول على العوائد المرتبطة به.',
    patterns: [
      /فكرة\s+riwaq/u,
      /فكرة\s+رواق/u,
      /concept\s+riwaq/u,
      /idee\s+riwaq/u,
      /ما\s+فكرة\s+التطبيق/u,
    ],
  },
  {
    id: 'general_app_or_platform',
    section: 'general',
    question: 'هل Riwaq Invest تطبيق أم منصة؟',
    answer: 'هو تطبيق رقمي للهاتف مخصص للتمويل الجماعي العقاري.',
    patterns: [
      /تطبيق\s+ام\s+منص/u,
      /تطبيق\s+أم\s+منص/u,
      /app\s+or\s+platform/u,
      /application\s+ou\s+plateforme/u,
      /منصة\s+ام\s+تطبيق/u,
    ],
  },
  {
    id: 'general_app_goal',
    section: 'general',
    question: 'ما الهدف من التطبيق؟',
    answer:
      'تسهيل الوصول إلى الاستثمار العقاري، وتوفير وسيلة رقمية لربط المستثمرين بالمطورين العقاريين مع تعزيز الشفافية.',
    patterns: [
      /هدف\s+(من\s+)?التطبيق/u,
      /objectif\s+(de\s+l\s*)?app/u,
      /goal\s+of\s+the\s+app/u,
      /لماذا\s+riwaq/u,
    ],
  },
  {
    id: 'general_algeria',
    section: 'general',
    question: 'هل التطبيق مخصص للجزائريين؟',
    answer:
      'يستهدف التطبيق السوق الجزائرية وتخضع إمكانية استخدامه لشروط الأهلية والمتطلبات التنظيمية.',
    patterns: [
      /مخصص\s+للجزائر/u,
      /algeria|algerian|algerien/u,
      /السوق\s+الجزائر/u,
      /جزائري/u,
    ],
  },
  {
    id: 'general_bank_or_company',
    section: 'general',
    question: 'هل Riwaq Invest بنك أو شركة استثمار؟',
    answer:
      'لا، ليس بنكاً وإنما تطبيق رقمي مخصص لنشاط التمويل الجماعي العقاري ووسيلة رقمية لتسهيل الاستثمار.',
    patterns: [
      /بنك\s+او\s+شركة/u,
      /بنك\s+أم\s+شركة/u,
      /bank\s+or\s+investment\s+company/u,
      /banque\s+ou\s+societe/u,
      /هل\s+.*\s+بنك/u,
    ],
  },

  // ── 2. التسجيل والحساب ──
  {
    id: 'account_create',
    section: 'account',
    question: 'كيف يمكنني إنشاء حساب؟',
    answer:
      'إدخال البيانات المطلوبة (الاسم الكامل، البريد، رقم الهاتف، كلمة المرور) ثم تأكيد البريد الإلكتروني عبر الرابط المرسل.',
    patterns: [
      /انشاء\s+حساب/u,
      /إنشاء\s+حساب/u,
      /create\s+account/u,
      /creer\s+un\s+compte/u,
      /تسجيل\s+حساب/u,
      /فتح\s+حساب/u,
      /sign\s*up/u,
    ],
  },
  {
    id: 'account_email_confirm',
    section: 'account',
    question: 'لم يصلني رابط تأكيد البريد؟',
    answer:
      'تحقق من مجلد الرسائل غير المرغوب فيها (Spam) أو حاول إعادة إرسال الرسالة أو تواصل مع الدعم.',
    patterns: [
      /رابط\s+تأكيد/u,
      /لم\s+يصل/u,
      /confirm.*email/u,
      /email\s+confirm/u,
      /verification\s+email/u,
      /spam/u,
      /رسائل\s+غير\s+مرغوب/u,
    ],
  },
  {
    id: 'account_password',
    section: 'account',
    question: 'نسيت أو أريد تغيير كلمة المرور؟',
    answer:
      'استخدم خيار "نسيت كلمة المرور" لاستلام التعليمات، أو غيرها من إعدادات الحساب بعد الدخول.',
    patterns: [
      /نسيت\s+كلمة/u,
      /تغيير\s+كلمة\s+المرور/u,
      /forgot\s+password/u,
      /reset\s+password/u,
      /mot\s+de\s+passe/u,
      /change\s+password/u,
    ],
  },
  {
    id: 'account_phone_delete',
    section: 'account',
    question: 'هل يمكن تغيير الهاتف أو حذف الحساب؟',
    answer:
      'يمكن تغيير البيانات وفق آلية التحقق المعتمدة، ويمكن تقديم طلب حذف الحساب وفق سياسة الاستخدام.',
    patterns: [
      /تغيير\s+الهاتف/u,
      /حذف\s+الحساب/u,
      /delete\s+account/u,
      /change\s+phone/u,
      /supprimer\s+compte/u,
      /changer\s+telephone/u,
    ],
  },
  {
    id: 'notifications',
    section: 'account',
    question: 'هل سأحصل على إشعارات؟',
    answer:
      'يمكن للتطبيق إرسال إشعارات حول الاستثمارات والمشاريع والتحديثات المهمة.',
    aliases: [
      'هل احصل على اشعارات',
      'هل أحصل على إشعارات',
      'إشعارات التطبيق',
      'التنبيهات',
      'هل توجد إشعارات',
    ],
    patterns: [
      /إشعار/u,
      /اشعار/u,
      /تنبيه/u,
      /notification/u,
      /notif/u,
      /push\s*alert/u,
      /alertes/u,
    ],
  },

  // ── 3. التحقق من الهوية KYC ──
  {
    id: 'kyc_what',
    section: 'kyc',
    question: 'ما هو KYC ولماذا أحتاجه؟',
    answer:
      'إجراء "اعرف عميلك" للتحقق من هوية المستخدم قبل الاستفادة من الخدمات المالية للامتثال التنظيمي ومنع الأحتيال.',
    patterns: [
      /ما\s+هو\s+kyc/u,
      /kyc.*لماذا/u,
      /لماذا\s+kyc/u,
      /اعرف\s+عميلك/u,
      /know\s+your\s+customer/u,
    ],
  },
  {
    id: 'kyc_documents',
    section: 'kyc',
    question: 'ما الوثائق المطلوبة للتحقق؟',
    answer:
      'وثيقة هوية رسمية وصورة شخصية وبيانات إضافية وفق الإجراءات المعتمدة.',
    patterns: [
      /وثائق\s+مطلوب/u,
      /documents.*verif/u,
      /required.*document/u,
      /pieces\s+.*identite/u,
      /مستندات\s+التحقق/u,
    ],
  },
  {
    id: 'kyc_rejected',
    section: 'kyc',
    question: 'ماذا يحدث إذا تم رفض التحقق؟',
    answer: 'سيظهر لك سبب الرفض لتصحيح البيانات وإعادة تقديم الوثائق.',
    patterns: [
      /رفض\s+التحقق/u,
      /rejected.*verif/u,
      /verification\s+reject/u,
      /refus.*verif/u,
      /رفض\s+الهوية/u,
    ],
  },

  // ── 4. المشاريع العقارية ──
  {
    id: 'projects_find',
    section: 'projects',
    question: 'كيف أجد مشروعاً للاستثمار؟',
    answer:
      'انتقل إلى قسم المشاريع لاستعراض المشاريع العقارية المتاحة ومعلوماتها.',
    patterns: [
      /أجد\s+مشروع/u,
      /find.*project/u,
      /trouver.*projet/u,
      /اين\s+المشاريع/u,
      /قسم\s+المشاريع/u,
      /browse\s+project/u,
    ],
  },
  {
    id: 'projects_info',
    section: 'projects',
    question: 'ما المعلومات المعروضة عن المشروع؟',
    answer:
      'الاسم، الموقع، الوصف، قيمة التمويل، المبلغ الممول، نسبة التقدم، المدة، العائد المتوقع، الحد الأدنى، ومعلومات المطور.',
    patterns: [
      /معلومات\s+معروض/u,
      /معلومات\s+المشروع/u,
      /project\s+information/u,
      /details.*projet/u,
      /what\s+info.*project/u,
    ],
  },
  {
    id: 'projects_selection',
    section: 'projects',
    question: 'كيف يتم اختيار المشاريع وهل هي مضمونة؟',
    answer:
      'تخضع لتقييممالي وقانوني قبل الإدراج لتقليل المخاطر، لكن العرض لا يعني ضمان النجاح أو تحقق العائد.',
    patterns: [
      /اختيار\s+المشاريع/u,
      /مشاريع.*مضمون/u,
      /هل\s+.*\s+مضمون/u,
      /guaranteed.*project/u,
      /selection.*projet/u,
      /due\s+diligence/u,
    ],
  },
  {
    id: 'projects_fully_funded',
    section: 'projects',
    question: 'ماذا يحدث عند التمويل الكامل؟',
    answer: 'تتوقف عمليات الاستثمار وتنتقل العملية إلى مرحلة التنفيذ والمتابعة.',
    patterns: [
      /التمويل\s+الكامل/u,
      /fully\s+funded/u,
      /100.*fund/u,
      /completement\s+finance/u,
      /اكتمال\s+التمويل/u,
    ],
  },

  // ── 5. الاستثمار ──
  {
    id: 'invest_how',
    section: 'invest',
    question: 'كيف أستثمر وبكم؟',
    answer:
      'اختر المشروع، راجع الشروط، حدد المبلغ (يبدأ من الحد الأدنى المعروض في الصفحة)، ثم أكد العملية.',
    patterns: [
      /كيف\s+أستثمر/u,
      /how\s+to\s+invest/u,
      /investir.*comment/u,
      /بكم\s+أستثمر/u,
      /how\s+much.*invest/u,
      /استثمر\s+وبكم/u,
    ],
  },
  {
    id: 'invest_multiple',
    section: 'invest',
    question: 'هل يمكن الاستثمار في أكثر من مشروع أو زيادة المبلغ؟',
    answer: 'نعم، وفق حدود الأهلية والشروط المعتمدة.',
    patterns: [
      /اكثر\s+من\s+مشروع/u,
      /أكثر\s+من\s+مشروع/u,
      /زيادة\s+المبلغ/u,
      /multiple\s+project/u,
      /plusieurs\s+projets/u,
      /increase\s+amount/u,
    ],
  },
  {
    id: 'invest_cancel_sell',
    section: 'invest',
    question: 'هل يمكن إلغاء الاستثمار أو بيعه؟',
    answer:
      'تعتمد الإلغاءات على شروط العقد، ولا يفترض البيع أو التداول إلا في حال وجود سوق ثانوية معتمدة.',
    patterns: [
      /الغاء\s+الاستثمار/u,
      /إلغاء\s+الاستثمار/u,
      /بيع.*استثمار/u,
      /cancel.*invest/u,
      /sell.*invest/u,
      /annuler.*invest/u,
      /سوق\s+ثانو/u,
    ],
  },

  // ── 6. العوائد والمخاطر ──
  {
    id: 'returns_guarantee',
    section: 'returns',
    question: 'كيف أحصل على العائد وهل هو مضمون؟',
    answer:
      'تتحدد الطريقة في شروط المشروع (أرباح أو إيرادات)، والعائد تقديري وغير مضمون لاحتمالية وجود مخاطر عقارية.',
    patterns: [
      /كيف\s+أحصل\s+على\s+العائد/u,
      /العائد.*مضمون/u,
      /return.*guarantee/u,
      /rendement.*garanti/u,
      /guaranteed\s+return/u,
    ],
  },
  {
    id: 'returns_timing_loss',
    section: 'returns',
    question: 'متى أحصل على أرباحي وهل يمكن الخسارة؟',
    answer:
      'يختلف التوقيت حسب طبيعة المشروع، وتوجد مخاطر قد تؤدي لخسارة جزء من رأس المال.',
    patterns: [
      /متى\s+أحصل\s+على\s+أرباح/u,
      /when.*profit/u,
      /quand.*profit/u,
      /خسارة/u,
      /loss/u,
      /perte/u,
      /can\s+i\s+lose/u,
    ],
  },
  {
    id: 'returns_risk_reduction',
    section: 'returns',
    question: 'كيف يقلل التطبيق المخاطر؟',
    answer: 'بتقييم المشاريع مالياً وقانونياً وتعزيز الشفافية والإفصاح.',
    patterns: [
      /يقلل\s+المخاطر/u,
      /تقليل\s+المخاطر/u,
      /reduce.*risk/u,
      /reduire.*risque/u,
      /risk\s+management/u,
    ],
  },

  // ── 7. المطورون والمدفوعات والأمان ──
  {
    id: 'developer_submit',
    section: 'developers',
    question: 'كيف يعرض المطور مشروعه؟',
    answer:
      'يقدّم طلباً يخضع للتقييم والمراجعة المالية والفنية وفق المعايير المعتمدة.',
    patterns: [
      /المطور.*مشروع/u,
      /developer.*project/u,
      /promoteur/u,
      /عرض\s+مشروع/u,
      /submit.*project/u,
    ],
  },
  {
    id: 'payments_methods',
    section: 'payments',
    question: 'طرق الدفع والسحب؟',
    answer:
      'يدعم الوسائل الإلكترونية المعتمدة (CIB / EDAHABIA / التحويل البنكي / CCP)، وتظهر المعاملات في قسم المحفظة.',
    patterns: [
      /طرق\s+الدفع/u,
      /payment.*method/u,
      /mode\s+de\s+paiement/u,
      /سحب/u,
      /withdraw/u,
      /retrait/u,
      /cib|edahabia|ccp|rib|rip/u,
      /شحن\s+المحفظ/u,
    ],
  },
  {
    id: 'security_data',
    section: 'security',
    question: 'هل البيانات آمنة؟',
    answer:
      'نعم، بالاعتماد على التشفير والمصادقة، ولا تُحفظ بيانات البطاقات الحساسة داخل التطبيق مباشرة.',
    patterns: [
      /البيانات\s+آمن/u,
      /data\s+safe/u,
      /donnees.*secur/u,
      /security.*data/u,
      /امان\s+البيانات/u,
      /تشفير/u,
      /encryption/u,
    ],
  },
];

/** Arabic/English stop-words ignored in fuzzy question matching. */
const STOP_WORDS = new Set([
  'هل',
  'ما',
  'من',
  'في',
  'على',
  'الى',
  'إلى',
  'ان',
  'أن',
  'او',
  'أو',
  'هو',
  'هي',
  'the',
  'is',
  'are',
  'will',
  'can',
  'do',
  'i',
  'my',
  'me',
  'to',
  'of',
  'and',
  'or',
  'a',
  'an',
]);

/** User intent buckets — prevent cross-topic false positives (e.g. invest vs notifications). */
const TOPIC_HINTS = {
  notifications: /إشعار|اشعار|تنبيه|notification|notif|alerte|push/u,
  email: /ايميل|إيميل|email|e\s*mail|بريد\s+الكترون|courriel/u,
  returns: /ربح|ارباح|عائد|عوائد|profit|return|rendement|gain|roi/u,
  invest: /استثمر|استثمار|invest|investir|مبلغ\s+استث/u,
} as const;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[؟?!.,؛:]/g, ' ')
    .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeQuestion(s: string): Set<string> {
  const n = normalize(s);
  const parts = n.split(/\s+/).filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(parts);
}

function tokenOverlapScore(userMsg: string, question: string): number {
  const u = tokenizeQuestion(userMsg);
  const q = tokenizeQuestion(question);
  let score = 0;
  for (const w of u) {
    if (q.has(w)) score += 5;
  }
  return score;
}

/** Priority layer — exact question or keyword overlap in KNOWLEDGE_BASE. */
function matchKnowledgeBase(userMessage: string): string | null {
  const trimmed = userMessage.trim();
  if (!trimmed) return null;

  const normalizedUser = normalize(trimmed);

  for (const entry of KNOWLEDGE_BASE) {
    if (normalize(entry.question) === normalizedUser) {
      return entry.answer;
    }
  }

  let bestAnswer: string | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (!normalizedKeyword) continue;
      if (normalizedUser.includes(normalizedKeyword)) {
        score += normalizedKeyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = entry.answer;
    }
  }

  if (bestScore > 0) return bestAnswer;
  return null;
}

function entryAllowedForMessage(entry: AssistantKnowledgeEntry, normalizedUser: string): boolean {
  const hasNotifications = TOPIC_HINTS.notifications.test(normalizedUser);
  const hasEmail = TOPIC_HINTS.email.test(normalizedUser);
  const hasReturns = TOPIC_HINTS.returns.test(normalizedUser);
  const hasInvest = TOPIC_HINTS.invest.test(normalizedUser);

  if (hasNotifications || hasEmail) {
    if (entry.section === 'invest' && !hasInvest) return false;
    if (entry.section === 'returns' && !hasReturns) return false;
  }

  if (hasNotifications && entry.id !== 'notifications') {
    if (entry.section === 'invest' || entry.section === 'returns') return false;
  }

  return true;
}

/** Returns the best-matching canonical answer, or null if no confident match. */
export function matchAssistantKnowledge(userMessage: string): string | null {
  const trimmed = userMessage.trim();
  if (!trimmed) return null;

  const normalizedUser = normalize(trimmed);

  const knowledgeBaseHit = matchKnowledgeBase(trimmed);
  if (knowledgeBaseHit) return knowledgeBaseHit;

  // 1) Exact normalized match — 100% priority, immediate return.
  for (const entry of ASSISTANT_KNOWLEDGE) {
    if (normalize(entry.question) === normalizedUser) {
      return entry.answer;
    }
    for (const alias of entry.aliases ?? []) {
      if (normalize(alias) === normalizedUser) {
        return entry.answer;
      }
    }
  }

  // 2) Regex pattern match — topic-aware, highest pattern score wins.
  let patternAnswer: string | null = null;
  let patternScore = 0;
  for (const entry of ASSISTANT_KNOWLEDGE) {
    if (!entryAllowedForMessage(entry, normalizedUser)) continue;
    for (const re of entry.patterns) {
      if (re.test(trimmed) || re.test(normalizedUser)) {
        const score = entry.id === 'notifications' ? 900 : 800;
        if (score > patternScore) {
          patternScore = score;
          patternAnswer = entry.answer;
        }
        break;
      }
    }
  }
  if (patternAnswer) return patternAnswer;

  // 3) Fuzzy question-token overlap — question text only, stricter threshold.
  let bestAnswer: string | null = null;
  let bestScore = 0;
  for (const entry of ASSISTANT_KNOWLEDGE) {
    if (!entryAllowedForMessage(entry, normalizedUser)) continue;
    const score = tokenOverlapScore(trimmed, entry.question);
    if (score > bestScore) {
      bestScore = score;
      bestAnswer = entry.answer;
    }
  }

  if (bestScore >= 10) return bestAnswer;
  return null;
}

export function assistantKnowledgeAsFaq(): { question: string; answer: string }[] {
  return getAssistantQuestionCatalog().map(({ question, answer }) => ({ question, answer }));
}

export type AssistantCatalogEntry = {
  question: string;
  answer: string;
  topics: string[];
};

export type AssistantInteractionResult =
  | { kind: 'answer'; answer: string; confidence: number }
  | { kind: 'suggestions'; prompt: string; questions: string[] };

export const ASSISTANT_SUGGESTION_PROMPT = 'اختر السؤال الأقرب لما تبحث عنه:';

const SECTION_TO_TOPICS: Record<string, string[]> = {
  general: ['general'],
  account: ['account', 'wallet', 'notifications'],
  kyc: ['verify', 'kyc'],
  projects: ['projects', 'invest'],
  invest: ['invest'],
  returns: ['returns'],
  developers: ['developer'],
  payments: ['payment', 'wallet'],
  security: ['security'],
};

const KNOWLEDGE_BASE_TOPICS: Record<string, string[]> = {
  'هل سأحصل على إشعارات؟': ['notifications', 'account'],
  'كيف يمكنني تمويل استثماري؟': ['invest', 'payment'],
  'ما الفرق بين رصيد المحفظة والاستثمار؟': ['wallet', 'invest', 'payment'],
  'هل يمكنني سحب أموالي؟': ['wallet', 'payment'],
  'أين أجد سجل معاملاتي؟': ['wallet', 'payment', 'account'],
  'هل يدعم التطبيق CIB أو EDAHABIA؟': ['payment'],
  'هل يمكن للمطور تحديد مبلغ التمويل؟': ['developer', 'projects'],
  'كيف أتابع استثماري؟': ['invest', 'projects'],
  'هل يمكنني متابعة تقدم المشروع العقاري؟': ['projects', 'developer'],
};

/** Profile FAQ entries merged into the assistant catalog. */
const SUPPLEMENTARY_FAQ: AssistantCatalogEntry[] = [
  {
    question: 'كيف أبدأ الاستثمار؟',
    answer:
      'تصفح المشاريع المنشورة، افتح مشروعاً، اختر مبلغاً يحقق الحد الأدنى، وأكد استثمارك من رصيد محفظتك.',
    topics: ['invest', 'projects'],
  },
  {
    question: 'ما الحد الأدنى للاستثمار؟',
    answer:
      'الحد الأدنى للاستثمار هو 10,000 دج كما يختلف من مشروع إلى آخر ويعرض في صفحة الاستثمار قبل التأكيد.',
    topics: ['invest'],
  },
  {
    question: 'كيف أوثق حسابي؟',
    answer: 'استخدم «بدء التوثيق» في ملفك الشخصي واتبع خطوات الهوية عند توفرها.',
    topics: ['verify', 'kyc'],
  },
  {
    question: 'كيف أتواصل مع الدعم؟',
    answer: 'من الملف الشخصي اختر «التواصل مع الدعم» ثم البريد أو واتساب.',
    topics: ['account'],
  },
  {
    question: 'هل بياناتي آمنة؟',
    answer: 'نطبّق ممارسات أمان معيارية لحماية حسابك. لا تشارك كلمة المرور مع أي شخص.',
    topics: ['security'],
  },
];

const GENERAL_TOPIC_KEYWORDS = [
  'استثمار',
  'استثمر',
  'محفظة',
  'المحفظة',
  'سحب',
  'دفع',
  'توثيق',
  'مطور',
  'kyc',
] as const;

const TOPIC_KEYWORD_MAP: Array<{ keywords: string[]; topics: string[] }> = [
  { keywords: ['استثمار', 'استثمر', 'استثمارات'], topics: ['invest', 'returns', 'projects'] },
  { keywords: ['محفظة', 'المحفظة', 'رصيد'], topics: ['wallet', 'payment', 'invest'] },
  { keywords: ['سحب'], topics: ['wallet', 'payment'] },
  { keywords: ['دفع', 'cib', 'edahabia', 'تحويل', 'شحن'], topics: ['payment', 'wallet'] },
  { keywords: ['توثيق', 'kyc', 'هوية', 'تحقق'], topics: ['verify', 'kyc'] },
  { keywords: ['مطور', 'مطورين'], topics: ['developer', 'projects'] },
  { keywords: ['إشعار', 'اشعار', 'تنبيه'], topics: ['notifications', 'account'] },
  { keywords: ['ارباح', 'عائد', 'ربح', 'عوائد'], topics: ['returns', 'invest'] },
  { keywords: ['مشروع', 'مشاريع'], topics: ['projects', 'invest', 'developer'] },
  { keywords: ['حساب', 'تسجيل', 'بريد'], topics: ['account'] },
  { keywords: ['riwaq', 'رواق'], topics: ['general'] },
];

let catalogCache: AssistantCatalogEntry[] | null = null;

export function getAssistantQuestionCatalog(): AssistantCatalogEntry[] {
  if (catalogCache) return catalogCache;

  const map = new Map<string, AssistantCatalogEntry>();
  const add = (question: string, answer: string, topics: string[]) => {
    const key = normalize(question);
    if (!key) return;
    map.set(key, { question, answer, topics });
  };

  for (const entry of KNOWLEDGE_BASE) {
    add(entry.question, entry.answer, KNOWLEDGE_BASE_TOPICS[entry.question] ?? ['general']);
  }
  for (const entry of ASSISTANT_KNOWLEDGE) {
    add(entry.question, entry.answer, SECTION_TO_TOPICS[entry.section] ?? ['general']);
  }
  for (const entry of SUPPLEMENTARY_FAQ) {
    add(entry.question, entry.answer, entry.topics);
  }

  catalogCache = Array.from(map.values());
  return catalogCache;
}

export function getAnswerForQuestion(question: string): string | null {
  const normalized = normalize(question.trim());
  if (!normalized) return null;

  for (const entry of getAssistantQuestionCatalog()) {
    if (normalize(entry.question) === normalized) {
      return entry.answer;
    }
  }

  for (const entry of ASSISTANT_KNOWLEDGE) {
    for (const alias of entry.aliases ?? []) {
      if (normalize(alias) === normalized) {
        return entry.answer;
      }
    }
  }

  return matchAssistantKnowledge(question);
}

function isGeneralKeywordMessage(message: string): boolean {
  const normalizedUser = normalize(message);
  if (!normalizedUser) return false;

  return GENERAL_TOPIC_KEYWORDS.some((keyword) => {
    const normalizedKeyword = normalize(keyword);
    return normalizedUser === normalizedKeyword;
  });
}

function detectTopicsFromMessage(message: string): Set<string> {
  const normalizedUser = normalize(message);
  const topics = new Set<string>();

  for (const group of TOPIC_KEYWORD_MAP) {
    for (const keyword of group.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedKeyword && normalizedUser.includes(normalizedKeyword)) {
        for (const topic of group.topics) topics.add(topic);
      }
    }
  }

  return topics;
}

function scoreCatalogQuestion(message: string, entry: AssistantCatalogEntry): number {
  const normalizedUser = normalize(message);
  let score = tokenOverlapScore(message, entry.question);

  for (const keyword of TOPIC_KEYWORD_MAP.flatMap((group) => group.keywords)) {
    const normalizedKeyword = normalize(keyword);
    if (
      normalizedKeyword &&
      normalizedUser.includes(normalizedKeyword) &&
      normalize(entry.question).includes(normalizedKeyword)
    ) {
      score += normalizedKeyword.length;
    }
  }

  const messageTopics = detectTopicsFromMessage(message);
  for (const topic of entry.topics) {
    if (messageTopics.has(topic)) score += 12;
  }

  return score;
}

function rankSuggestedQuestions(message: string, limit = 8): string[] {
  const catalog = getAssistantQuestionCatalog();
  const messageTopics = detectTopicsFromMessage(message);
  const normalizedUser = normalize(message);

  const ranked = catalog
    .map((entry) => {
      let score = scoreCatalogQuestion(message, entry);
      if (messageTopics.size === 0 && isGeneralKeywordMessage(message)) {
        score = 0;
      }
      if (normalize(entry.question) === normalizedUser) {
        score += 1000;
      }
      return { question: entry.question, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return catalog.slice(0, limit).map((entry) => entry.question);
  }

  return ranked.slice(0, limit).map((item) => item.question);
}

type EvaluatedMatch = {
  answer: string;
  confidence: number;
  matchedQuestion: string;
};

function evaluateAssistantMatch(userMessage: string): EvaluatedMatch | null {
  const trimmed = userMessage.trim();
  if (!trimmed) return null;

  const normalizedUser = normalize(trimmed);

  for (const entry of getAssistantQuestionCatalog()) {
    if (normalize(entry.question) === normalizedUser) {
      return { answer: entry.answer, confidence: 100, matchedQuestion: entry.question };
    }
  }

  for (const entry of ASSISTANT_KNOWLEDGE) {
    for (const alias of entry.aliases ?? []) {
      if (normalize(alias) === normalizedUser) {
        return { answer: entry.answer, confidence: 100, matchedQuestion: entry.question };
      }
    }
  }

  for (const entry of KNOWLEDGE_BASE) {
    if (normalize(entry.question) === normalizedUser) {
      return { answer: entry.answer, confidence: 100, matchedQuestion: entry.question };
    }

    let keywordScore = 0;
    let longestKeyword = 0;
    for (const keyword of entry.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedKeyword && normalizedUser.includes(normalizedKeyword)) {
        keywordScore += normalizedKeyword.length;
        longestKeyword = Math.max(longestKeyword, normalizedKeyword.length);
      }
    }

    if (keywordScore > 0) {
      const overlap = tokenOverlapScore(trimmed, entry.question);
      const coverage = longestKeyword / Math.max(normalizedUser.length, 1);
      const confidence = Math.min(
        100,
        Math.round(coverage * 100 + overlap * 2 + (coverage >= 0.75 ? 10 : 0)),
      );
      return { answer: entry.answer, confidence, matchedQuestion: entry.question };
    }
  }

  for (const entry of ASSISTANT_KNOWLEDGE) {
    if (!entryAllowedForMessage(entry, normalizedUser)) continue;
    for (const re of entry.patterns) {
      if (re.test(trimmed) || re.test(normalizedUser)) {
        return { answer: entry.answer, confidence: 88, matchedQuestion: entry.question };
      }
    }
  }

  let best: EvaluatedMatch | null = null;
  for (const entry of ASSISTANT_KNOWLEDGE) {
    if (!entryAllowedForMessage(entry, normalizedUser)) continue;
    const overlap = tokenOverlapScore(trimmed, entry.question);
    if (overlap < 10) continue;
    const confidence = Math.min(89, overlap * 4);
    if (!best || confidence > best.confidence) {
      best = { answer: entry.answer, confidence, matchedQuestion: entry.question };
    }
  }

  return best;
}

/** Smart interaction — direct answer when confidence ≥ 90%, otherwise related question chips. */
export function resolveAssistantInteraction(
  userMessage: string,
  prompt = ASSISTANT_SUGGESTION_PROMPT,
): AssistantInteractionResult {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return {
      kind: 'suggestions',
      prompt,
      questions: getAssistantQuestionCatalog()
        .slice(0, 8)
        .map((entry) => entry.question),
    };
  }

  if (isGeneralKeywordMessage(trimmed)) {
    return {
      kind: 'suggestions',
      prompt,
      questions: rankSuggestedQuestions(trimmed),
    };
  }

  const evaluated = evaluateAssistantMatch(trimmed);
  if (evaluated && evaluated.confidence >= 90) {
    return {
      kind: 'answer',
      answer: evaluated.answer,
      confidence: evaluated.confidence,
    };
  }

  return {
    kind: 'suggestions',
    prompt,
    questions: rankSuggestedQuestions(trimmed),
  };
}
