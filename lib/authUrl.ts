/**
 * Parse Supabase implicit auth tokens from a deep link or web callback URL
 * (hash or query: access_token, refresh_token, type).
 */
export function parseSupabaseSessionParamsFromUrl(url: string): {
  access_token: string;
  refresh_token: string;
  type?: string;
} | null {
  try {
    const hashPart = url.includes('#') ? (url.split('#')[1] ?? '') : '';
    const beforeHash = url.split('#')[0] ?? url;
    const queryPart = beforeHash.includes('?') ? (beforeHash.split('?').pop() ?? '') : '';
    const tryParse = (segment: string) => {
      const qs = new URLSearchParams(segment);
      const access_token = qs.get('access_token');
      const refresh_token = qs.get('refresh_token');
      const type = qs.get('type') ?? undefined;
      if (access_token && refresh_token) {
        return { access_token, refresh_token, type };
      }
      return null;
    };
    return tryParse(hashPart) ?? tryParse(queryPart);
  } catch {
    return null;
  }
}
