// Password-protects the dashboard with HTTP Basic auth (any username,
// password = DASHBOARD_PASSWORD). Cron routes check CRON_SECRET themselves and
// the poster route must stay public for Facebook.
import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  const auth = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = auth.split(" ");
  if (password && scheme === "Basic" && encoded) {
    const supplied = atob(encoded).split(":").slice(1).join(":");
    if (supplied === password) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Social Autopilot"' },
  });
}

export const config = {
  matcher: ["/((?!api/cron|api/poster|_next|favicon.ico).*)"],
};
