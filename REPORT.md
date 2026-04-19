# Riwaq Invest — Project Report

**آخر تحديث:** 2026-04-19

## الحالة الحالية

- **المرحلة:** تمت تهيئة تطبيق Expo (Expo Router + TypeScript + NativeWind v4) في جذر المستودع.
- **المرجع المعياري للمشروع:** [`docs/SKELETON.md`](docs/SKELETON.md)
- **ملاحظة تنفيذية:** `create-expo-app` يرفض المجلد غير الفارغ؛ تم إنشاء القالب داخل `_scaffold` ثم نقل الملفات إلى الجذر مع الإبقاء على `docs/` و `logs/` دون تغيير.

## ملخص تنفيذي

مشروع **Riwaq Invest** (فنتك / تمويل جماعي عقاري، السوق الجزائري) يستهدف تقديم MVP آمن وجيد الجودة على iOS و Android للاستثمار في حصص عقارية. التفاصيل التقنية والوظيفية مُوثَّقة في الملف المرجعي أعلاه.

تم إعداد **Expo SDK 54** مع قالب **Tabs / Expo Router**، و**NativeWind v4** (`babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`)، وتحديث أسماء التطبيق في `app.json` و`package.json`. التحقق: `npx tsc --noEmit` و`npx expo export --platform web` ناجحان.

## الخطوات التالية (مقترحة)

1. ربط Supabase (Auth، قاعدة البيانات، التخزين).
2. إعداد الترجمة (AR افتراضيًا، FR، EN) واتجاه RTL.

## سجل العمليات

راجع [`logs/LOG.md`](logs/LOG.md) لأحداث النشر والتشغيل.
