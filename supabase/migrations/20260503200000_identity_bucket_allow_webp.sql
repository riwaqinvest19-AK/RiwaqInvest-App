-- Allow WebP uploads in identity-verifications (common on Android / modern cameras)
update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
where id = 'identity-verifications';
