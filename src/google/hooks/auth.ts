import { useEffect, useState } from "react";

export function useGoogleAuth() {
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    if (token) return;

    fetchGoogleAuthToken()
      .then(([, token]) => {
        if (token) {
          setToken(token);
        } else {
          document.location.href = `${process.env.API_HOST}api/google/auth/`;
        }
      })
      .catch((e) => {
        console.log(e);
      });
  }, [token]);

  return token;
}

async function fetchGoogleAuthToken(): Promise<[status: number, token?: string]> {
  const res = await fetch(`${process.env.API_HOST}api/google/token/`, { credentials: "include" });
  if (res.status === 200) {
    const data = await res.json();
    return [200, data.token];
  } else {
    return [res.status];
  }
}

export async function fetchGoogleAuthTokenOrRedirect(): Promise<string | undefined> {
  const [status, token] = await fetchGoogleAuthToken();
  if (status === 401 && !token) {
    document.location.href = `${process.env.API_HOST}api/google/auth/`;
  }
  return token;
}
