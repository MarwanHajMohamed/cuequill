import CredentialsProvider from "next-auth/providers/credentials";
import connectDb from "@/lib/db";
import { User } from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";

type User = {
  _id: string;
  firstname: string;
  surname: string;
  email: string;
  password: string;
  timezone: string;
  isPro?: boolean;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDb();

        const user: User | null = await User.findOne({
          email: credentials.email,
        });
        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) return null;

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
  ],
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.firstname = user.firstname;
        token.surname = user.surname;
        token.email = user.email;
        token.timezone = user.timezone;
        token.isPro = !!user.isPro;
      }
      // Profile updates from /api/user/profile flow back through
      // session.update({ ... }) - propagate them onto the JWT so future
      // useSession() reads see the new values.
      if (trigger === "update" && session) {
        if (session.timezone !== undefined) token.timezone = session.timezone;
        if (session.firstname !== undefined)
          token.firstname = session.firstname;
        if (session.surname !== undefined) token.surname = session.surname;
        if (session.email !== undefined) token.email = session.email;
        if (session.isPro !== undefined) token.isPro = !!session.isPro;
      }
      // Keep the membership flag in sync with the DB on every token
      // refresh. Without this, a session minted before an upgrade (or
      // before the backfill ran) keeps a stale isPro forever and the
      // client gates never unlock until the user logs out and back in.
      // It's a single indexed-field read keyed on the user id.
      if (token.id) {
        try {
          await connectDb();
          const fresh = await User.findById(token.id)
            .select("isPro")
            .lean<{ isPro?: boolean }>();
          if (fresh) token.isPro = !!fresh.isPro;
        } catch {
          // Leave the existing token value in place on a transient DB
          // error rather than flipping the user to free.
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
