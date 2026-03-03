import { google } from "googleapis";

export default async function handleGoogleTokenFlow(CONFIG, code = null) {
  if (!CONFIG) {
    throw new Error("CONFIG is required");
  }

  if (!CONFIG.GOOGLE_CLIENT_ID)
    throw new Error("Missing GOOGLE_CLIENT_ID");

  if (!CONFIG.GOOGLE_CLIENT_SECRET)
    throw new Error("Missing GOOGLE_CLIENT_SECRET");

  if (!CONFIG.GOOGLE_REDIRECT_URI)
    throw new Error("Missing GOOGLE_REDIRECT_URI");

  const oauth2Client = new google.auth.OAuth2(
    CONFIG.GOOGLE_CLIENT_ID,
    CONFIG.GOOGLE_CLIENT_SECRET,
    CONFIG.GOOGLE_REDIRECT_URI
  );

  const scopes = ["https://www.googleapis.com/auth/drive"];

  // STEP 1 — Generate URL
  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
    });

    return { authUrl };
  }

  // STEP 2 — Exchange code for refresh token
  try {
    const { tokens } = await oauth2Client.getToken(code);
    return { refreshToken: tokens.refresh_token };
  } catch (err) {
    throw new Error(`Token exchange failed: ${err.message}`);
  }
}