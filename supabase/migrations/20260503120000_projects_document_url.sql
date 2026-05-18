-- Project brochure / legal PDF URL for in-app download (expo-file-system + expo-sharing)
alter table public.projects
  add column if not exists document_url text;

comment on column public.projects.document_url is 'HTTPS URL to a PDF or document file for the project download action';

-- Trial PDF for development / QA (W3C sample PDF). Replace in production with your Storage URL.
update public.projects
set document_url = 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.pdf'
where title = 'مجمع قسنطينة العقاري';
