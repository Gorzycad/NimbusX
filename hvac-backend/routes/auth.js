import express from "express";
import createOAuthClient from "../google/oauthClient.js";

export default function authRoutes(CONFIG) {
  const router = express.Router();

  const { oauth2Client, SCOPES } = createOAuthClient(CONFIG);

  router.get("/google", (req, res) => {
    const redirect = req.query.redirect;
    if (redirect) req.session.redirectTo = redirect;

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
    });

    res.redirect(url);
  });

  router.get("/oauth2callback", async (req, res) => {
    try {
      const { code } = req.query;
      const { tokens } = await oauth2Client.getToken(code);

      req.session.googleTokens = tokens;

      const redirectTo =
        req.session.redirectTo ||
        "http://localhost:3000/CompanyDashboard/leads";

      delete req.session.redirectTo;

      res.redirect(`${redirectTo}?oauth=success`);
    } catch (err) {
      console.error(err);
      res.status(500).send("OAuth failed");
    }
  });

  router.get("/status", (req, res) => {
    res.json({ authenticated: !!req.session.googleTokens });
  });

  return router;
}

