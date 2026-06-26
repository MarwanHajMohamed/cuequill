import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    firstname: string;
    surname: string;
    email: string;
    timezone: string;
    isPro: boolean;
  }

  interface Session {
    user: {
      id: string;
      firstname: string;
      surname: string;
      email: string;
      timezone: string;
      isPro: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    firstname: string;
    surname: string;
    email: string;
    timezone: string;
    isPro: boolean;
  }
}
