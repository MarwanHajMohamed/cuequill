// Marketing surfaces that show the top navbar (SiteHeader) instead of the
// app sidebar - even for signed-in users. NavbarWrapper suppresses the
// sidebar on these routes and ContentShell drops its content offset, so a
// logged-in visitor browses them behind the marketing chrome.
const MARKETING_ROUTES = new Set(["/", "/features", "/pricing"]);

export function isMarketingRoute(pathname: string | null): boolean {
  return !!pathname && MARKETING_ROUTES.has(pathname);
}
