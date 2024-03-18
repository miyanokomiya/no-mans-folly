export const GOOGLE_AUTH_URL = `${process.env.API_HOST}api/google/auth/`;
export const GOOGLE_AUTH_RETIEVAL_URL = `${GOOGLE_AUTH_URL}?retrieval=1`;

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
 * Should clean up state to take care of "bfcache" via "onBeforeRedirect".
 */
export async function fetchGoogleAuthTokenOrRedirect(onBeforeRedirect?: () => void): Promise<string | undefined> {
  const [status, token] = await fetchGoogleAuthToken();
  if (status === 401 && !token) {
    onBeforeRedirect?.();
    document.location.href = GOOGLE_AUTH_URL;
  }
  return token;
}
