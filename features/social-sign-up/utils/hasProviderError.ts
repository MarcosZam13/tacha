import { OAUTH_ERROR_PARAM } from "../constants/social-sign-up.constants";

// El error puede llegar en la query (?error=...) o en el fragmento (#error=...).
export const hasProviderError = (search: string, hash: string): boolean =>
  new URLSearchParams(search).has(OAUTH_ERROR_PARAM) ||
  new URLSearchParams(hash.slice(1)).has(OAUTH_ERROR_PARAM);
