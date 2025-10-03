import { Buffer } from "buffer";

const AUTH_URL = "https://auth.cmegroup.com/as/token.oauth2";
const CLIENT_ID = process.env.CME_CLIENT_ID || "";
const CLIENT_SECRET = process.env.CME_CLIENT_SECRET || "";

let accessToken: string | null = null;
let tokenExpiry: number = 0;

export async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
    "base64"
  );

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch CME token: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000 - 30_000;

  return accessToken!;
}
