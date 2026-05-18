-- KYC storage: allow WEBP in identity-verifications bucket
-- Some mobile devices provide picked images as image/webp by default.

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'identity-verifications';
