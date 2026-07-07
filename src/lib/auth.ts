import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";

// Fail fast if the secret isn't set in production. NextAuth will
// otherwise fall back to a per-instance random value that silently
// invalidates every session on redeploy and makes cookies forgeable
// across environments. Better to blow up on boot than to sign
// production tokens with an unknown secret.
if (!process.env.NEXTAUTH_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXTAUTH_SECRET is required in production.");
  } else {
    console.warn(
      "[auth] NEXTAUTH_SECRET is not set. Fine in dev; will crash prod.",
    );
  }
}

type DbUser = {
  _id: string;
  firstname: string;
  surname: string;
  email: string;
  password: string;
  timezone: string;
  isPro?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
};

// How long a token's isPro value is trusted before the jwt callback
// re-reads it from the DB. Bounds how long a membership change can lag
// in the client UI; server-side gates always read the live DB.
const PRO_TTL_MS = 5 * 60 * 1000;

// Account lockout policy: after this many consecutive failed
// attempts, the account is locked for LOCKOUT_MS. Counter resets on
// a successful login.
const LOCKOUT_THRESHOLD = 8;
const LOCKOUT_MS = 15 * 60 * 1000;

// Fixed dummy hash used for constant-time email enumeration defense.
// `bcrypt.compare` against this takes roughly the same time as a
// real comparison, so an attacker can't distinguish "no such user"
// from "user exists, wrong password" via response timing. The value
// itself is public — it just needs to be a syntactically-valid
// bcrypt hash so the compare doesn't short-circuit.
const DUMMY_HASH =
  "$2b$12$abcdefghijklmnopqrstuu4Xr4rBQY7HGGN4kZbFXOAcgc1eZ.GXG";

// Case-insensitive collation for legacy mixed-case emails. Shared by
// the credentials `authorize` and the OAuth signIn/jwt callbacks so
// every lookup path matches the same set of rows.
const EMAIL_COLLATION = { locale: "en", strength: 2 } as const;

// Providers are built at module load and filtered so Google/Apple
// only appear when their credentials are configured. That way you
// can ship Apple later without a code change — just drop the env
// vars in.
const providers: Provider[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }),
  );
}

providers.push(
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const email = credentials.email.trim().toLowerCase();
      const password = credentials.password;

      await connectDb();

      // `+password` opts back in to the hash that the schema hides
      // by default; without it the compare below sees undefined and
      // always fails. Collation makes the lookup case-insensitive so
      // a legacy user stored as "Marwan@…" still matches
      // "marwan@…" after the schema switched to lowercase:true.
      const user = (await User.findOne({ email })
        .collation(EMAIL_COLLATION)
        .select("+password")) as unknown as DbUser | null;

      // No user → still burn a compare cycle against the dummy hash
      // so the response time matches the "user found, wrong
      // password" path. Prevents email enumeration.
      if (!user) {
        await bcrypt.compare(password, DUMMY_HASH);
        return null;
      }

      // Account locked from a prior burst of bad guesses. Throwing
      // (rather than returning null) surfaces the specific code to
      // the client via res.error so the login UI can show a
      // lockout-specific message.
      if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
        throw new Error("ACCOUNT_LOCKED");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        try {
          const attempts = (user.failedLoginAttempts ?? 0) + 1;
          const update: Record<string, unknown> = {
            $inc: { failedLoginAttempts: 1 },
          };
          let justLocked = false;
          if (attempts >= LOCKOUT_THRESHOLD) {
            update.$set = { lockedUntil: new Date(Date.now() + LOCKOUT_MS) };
            justLocked = true;
          }
          await User.findByIdAndUpdate(user._id, update);
          if (justLocked) throw new Error("ACCOUNT_LOCKED");
        } catch (e) {
          if (e instanceof Error && e.message === "ACCOUNT_LOCKED") throw e;
          // Failing to record a bad attempt shouldn't turn into a
          // login-side error — worst case, one attempt isn't
          // counted.
        }
        return null;
      }

      if ((user.failedLoginAttempts ?? 0) > 0 || user.lockedUntil) {
        try {
          await User.findByIdAndUpdate(user._id, {
            $set: { failedLoginAttempts: 0, lockedUntil: null },
          });
        } catch {
          // Non-fatal.
        }
      }

      return {
        id: user._id.toString(),
        email: user.email,
        firstname: user.firstname,
        surname: user.surname,
        timezone: user.timezone,
        isPro: !!user.isPro,
      };
    },
  }),
);

export const authOptions: NextAuthOptions = {
  providers,
  pages: {
    // Route unauthenticated redirects to the sign-in card, not the
    // marketing homepage, so users actually see the form. Also
    // where NextAuth sends failed OAuth attempts with an error
    // param (e.g. AccessDenied).
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Gate OAuth sign-ins to users already on the platform. The
    // app is invite-only; letting a Google user auto-create an
    // account would side-step the waitlist funnel. Unknown OAuth
    // emails get redirected to /signup with a reason param.
    async signIn({ user, account }) {
      if (!account) return false;
      if (account.provider === "credentials") return true;
      const email = user.email?.trim().toLowerCase();
      if (!email) return "/login?error=OAuthNoEmail";
      await connectDb();
      const existing = await User.findOne({ email })
        .collation(EMAIL_COLLATION)
        .select("_id");
      if (!existing) return "/signup?reason=oauth-not-invited";
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      // Credentials sign-in: the returned user is already keyed on
      // the DB _id, so copy it straight onto the token.
      if (user && (!account || account.provider === "credentials")) {
        token.id = user.id;
        token.firstname = user.firstname;
        token.surname = user.surname;
        token.email = user.email;
        token.timezone = user.timezone;
        token.isPro = !!user.isPro;
      }
      // OAuth sign-in: the provider hands us profile data keyed on
      // *their* id. Re-hydrate from the DB user (guaranteed to exist
      // — the signIn callback rejected the flow otherwise) so
      // token.id matches the credentials path and downstream code
      // can rely on session.user.id being a Mongo ObjectId string.
      if (user && account && account.provider !== "credentials") {
        try {
          await connectDb();
          const email = user.email?.trim().toLowerCase();
          if (email) {
            const dbUser = await User.findOne({ email })
              .collation(EMAIL_COLLATION)
              .lean<DbUser>();
            if (dbUser) {
              token.id = dbUser._id.toString();
              token.firstname = dbUser.firstname;
              token.surname = dbUser.surname;
              token.email = dbUser.email;
              token.timezone = dbUser.timezone;
              token.isPro = !!dbUser.isPro;
            }
          }
        } catch {
          // If DB hydration fails at OAuth callback time, the
          // downstream isPro TTL branch will retry on the next
          // request.
        }
      }
      // Profile updates from /api/user/profile flow back through
      // session.update({ ... }) — propagate them onto the JWT so
      // future useSession() reads see the new values.
      if (trigger === "update" && session) {
        if (session.timezone !== undefined) token.timezone = session.timezone;
        if (session.firstname !== undefined)
          token.firstname = session.firstname;
        if (session.surname !== undefined) token.surname = session.surname;
        if (session.email !== undefined) token.email = session.email;
        if (session.isPro !== undefined) token.isPro = !!session.isPro;
      }
      // Keep the membership flag in sync with the DB so a session
      // minted before an upgrade unlocks the client gates without a
      // logout. Batched by PRO_TTL_MS so this becomes roughly one
      // read per user per window rather than per request.
      const now = Date.now();
      const lastChecked =
        typeof token.proCheckedAt === "number" ? token.proCheckedAt : 0;
      const forceCheck = !!user || (trigger === "update" && !!session);
      if (token.id && (forceCheck || now - lastChecked > PRO_TTL_MS)) {
        try {
          await connectDb();
          const fresh = await User.findById(token.id)
            .select("isPro")
            .lean<{ isPro?: boolean }>();
          if (fresh) {
            token.isPro = !!fresh.isPro;
            token.proCheckedAt = now;
          }
        } catch {
          // Leave the existing token value in place on a transient
          // DB error rather than flipping the user to free.
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.firstname = token.firstname as string;
        session.user.surname = token.surname as string;
        session.user.email = token.email as string;
        session.user.timezone = token.timezone as string;
        session.user.isPro = !!token.isPro;
      }
      return session;
    },
  },
};
