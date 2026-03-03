import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

export default function configurePassport(CONFIG) {
  if (!CONFIG) {
    throw new Error("CONFIG is required for Passport setup");
  }
passport.use(
  new GoogleStrategy(
    {
      clientID: CONFIG.GOOGLE_CLIENT_ID,
      clientSecret: CONFIG.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:4000/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      // You can store user in DB here if needed
      return done(null, {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
      });
    }
  )
);

// ✅ REQUIRED for session persistence
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

return passport;

}
