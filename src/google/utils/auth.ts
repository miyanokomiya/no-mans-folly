export const GOOGLE_AUTH_URL = `${process.env.API_HOST}api/google/auth/`;
export const GOOGLE_AUTH_RETIEVAL_URL = `${GOOGLE_AUTH_URL}?callback_action=retrieval`;
export const GOOGLE_AUTH_INITIATE_URL = `${GOOGLE_AUTH_URL}?callback_action=initiate`;

export async function fetchGoogleAuthToken(): Promise<[status: number, token?: string]> {
  const res = await fetch(`${process.env.API_HOST}api/google/token/`, { credentials: "include" });
  if (res.status === 200) {
    const data = await res.json();
    return [200, data.token];
  } else {
    return [res.status];
  }
}

/**
 * Use "usePageShowBackEffect" to clean up state against "BFCache".
 */
export async function fetchGoogleAuthTokenOrRedirect(): Promise<string | undefined> {
  const [status, token] = await fetchGoogleAuthToken();
  if (status === 401 && !token) {
    document.location.href = GOOGLE_AUTH_URL;
  }
  return token;
}
