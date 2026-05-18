-- RiwaqInvest — بيانات تجريبية: 3 مشاريع عقارية

-- المتطلبات: أعمدة cover_image_url (text), target_amount (bigint), current_amount (bigint)

--

-- الأعمدة المالية المعتمدة: target_amount = الهدف الإجمالي بالدينار، current_amount = المبلغ المحصّل.

-- يُحذف أي صف تجريبي قديم بالعناوين القديمة أو الثلاثة الحالية ثم يُعاد الإدراج.



delete from public.projects

where title in (

  'إقامة جنان السفيرة',

  'برج تيقصراين',

  'مركب النخيل',

  'إقامة النخيل - العاصمة',

  'برج وهران',

  'مجمع قسنطينة العقاري'

);



insert into public.projects (

  title,

  location,

  expected_return,

  investment_progress,

  total_units,

  status,

  cover_image_url,

  target_amount,

  current_amount,

  document_url

)

values

  (

    'إقامة النخيل - العاصمة',

    'الجزائر العاصمة',

    15.25,

    72,

    156,

    'published',

    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80',

    5200000000,

    3744000000,

    null

  ),

  (

    'برج وهران',

    'وهران',

    13.40,

    48,

    88,

    'published',

    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=900&q=80',

    6800000000,

    3264000000,

    null

  ),

  (

    'مجمع قسنطينة العقاري',

    'قسنطينة',

    16.10,

    91,

    240,

    'published',

    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80',

    4100000000,

    3731000000,

    'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf'

  );


