// backend/google/oauthClient.js
import { google } from "googleapis";

export default function createOAuthClient(CONFIG) {
  if (!CONFIG) throw new Error("CONFIG is required");

  if (!CONFIG.GOOGLE_CLIENT_ID)
    throw new Error("Missing GOOGLE_CLIENT_ID");
  if (!CONFIG.GOOGLE_CLIENT_SECRET)
    throw new Error("Missing GOOGLE_CLIENT_SECRET");
  if (!CONFIG.GOOGLE_REDIRECT_URI)
    throw new Error("Missing GOOGLE_REDIRECT_URI");

  const SCOPES = ["https://www.googleapis.com/auth/drive"];

  const oauth2Client = new google.auth.OAuth2(
    CONFIG.GOOGLE_CLIENT_ID,
    CONFIG.GOOGLE_CLIENT_SECRET,
    CONFIG.GOOGLE_REDIRECT_URI
  );

  return { oauth2Client, SCOPES };
}

