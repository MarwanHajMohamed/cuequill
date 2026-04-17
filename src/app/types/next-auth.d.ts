import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    firstname: string;
    surname: string;
    email: string;
    timezone: string;
  }

  interface Session {
    user: {
      id: string;
      firstname: string;
      surname: string;
      email: string;
      timezone: string;
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
  }
}
