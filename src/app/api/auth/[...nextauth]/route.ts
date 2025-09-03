  import NextAuth, { NextAuthOptions } from "next-auth";
  import CredentialsProvider from "next-auth/providers/credentials";
  import connectDb from "@/lib/db";
  import { User } from "@/lib/models/User";
  import bcrypt from "bcryptjs";

  const authOptions: NextAuthOptions = {
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

          const user = await User.findOne({ email: credentials.email });
          if (!user) return null;

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) return null;

          return { id: user._id.toString(), email: user.email, name: user.name };
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
      async jwt({ token, user }) {
        if (user) token.id = user.id;
        return token;
      },
      async session({ session, token }) {
        if (token) session.user.id = token.id as string;
        return session;
      },
    },
  };

  const handler = NextAuth(authOptions);
  export { handler as GET, handler as POST };
