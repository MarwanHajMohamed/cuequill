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
    // Epoch ms of the last DB read of isPro; drives the TTL-bounded
    // refresh in the jwt callback.
    proCheckedAt?: number;
  }
}
