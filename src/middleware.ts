import { withAuth } from "next-auth/middleware";

// Edge-level auth guard. Runs before any page renders, so protected
// routes never serve HTML to unauthenticated visitors — this closes
// the gap the client-side <withAuth> HOC left open (initial SSR /
// no-JS clients could briefly see the page shell). The HOC still
// exists for the loading UX while NextAuth resolves the session on
// the client.
//
// `withAuth` uses the same JWT cookie the app already issues; the
// `signIn` page from authOptions (/login) drives the redirect.
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/calendar/:path*",
    "/trades/:path*",
    "/chat/:path*",
    "/strategies/:path*",
    "/strategies_used/:path*",
    "/rules/:path*",
    "/affirmations/:path*",
    "/earnings/:path*",
    "/community/:path*",
  ],
};
