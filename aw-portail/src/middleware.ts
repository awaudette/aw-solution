import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques
  if (pathname === "/login" || pathname === "/") {
    return NextResponse.next();
  }

  // Détermine le nom du cookie selon la route :
  //   /admin/...              → session_admin
  //   /client/{clientId}/...  → session_client_{clientId}
  // Cela permet d'avoir admin + plusieurs clients ouverts simultanément
  // dans des onglets séparés sans interférence de session.
  let cookieName: string;
  if (pathname.startsWith("/admin")) {
    cookieName = "session_admin";
  } else if (pathname.startsWith("/client/")) {
    const routeClientId = pathname.split("/")[2];
    cookieName = `session_client_${routeClientId}`;
  } else {
    cookieName = "session_admin";
  }

  const sessionCookie = request.cookies.get(cookieName)?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const verifyRes = await fetch(new URL("/api/auth/verify", request.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionCookie }),
    });

    if (!verifyRes.ok) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { role, clientId } = await verifyRes.json();

    // Protection des routes client : un client ne peut accéder qu'à son propre clientId
    if (pathname.startsWith("/client/")) {
      const routeClientId = pathname.split("/")[2];
      if (role !== "admin" && routeClientId !== clientId) {
        return NextResponse.redirect(
          new URL(`/client/${clientId}/accueil`, request.url)
        );
      }
    }

    // Protection de la route admin
    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(
        new URL(`/client/${clientId}/accueil`, request.url)
      );
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp|.*\\.ico).*)",
  ],
};
