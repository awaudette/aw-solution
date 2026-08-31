import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Routes publiques
  // /activation : page de définition de mot de passe suite à un lien
  // d'invitation (client ou employé) — voir actionCodeSettings dans
  // /api/client/invite et /api/admin/staff/invite. Doit rester accessible
  // sans session, l'utilisateur n'en a pas encore une à ce stade.
  if (pathname === "/login" || pathname === "/" || pathname === "/activation") {
    return NextResponse.next();
  }

  // Détermine quel cookie de session utiliser selon la route :
  //   /admin/...              → session_admin (admin ET employé — même
  //                              cookie, voir /api/auth/session:33-35)
  //   /client/{clientId}/...  → session_admin en priorité s'il existe
  //                              (un admin/employé doit pouvoir accéder à
  //                              n'importe quel client sans y avoir ouvert
  //                              de session cliente séparée — la
  //                              vérification de rôle plus bas laisse déjà
  //                              passer admin/employé pour tout clientId ;
  //                              encore fallait-il atteindre cette
  //                              vérification, ce que l'ancienne version ne
  //                              permettait jamais), sinon le cookie client
  //                              spécifique à ce clientId.
  // Cela permet aussi d'avoir admin + plusieurs clients ouverts
  // simultanément dans des onglets séparés sans interférence de session.
  let sessionCookie: string | undefined;
  if (pathname.startsWith("/admin")) {
    sessionCookie = request.cookies.get("session_admin")?.value;
  } else if (pathname.startsWith("/client/")) {
    const routeClientId = pathname.split("/")[2];
    sessionCookie = request.cookies.get("session_admin")?.value
      ?? request.cookies.get(`session_client_${routeClientId}`)?.value;
  } else {
    sessionCookie = request.cookies.get("session_admin")?.value;
  }

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
      if (role !== "admin" && role !== "employe" && routeClientId !== clientId) {
        return NextResponse.redirect(
          new URL(`/client/${clientId}/accueil`, request.url)
        );
      }
    }

    // Protection de la route admin
    if (pathname.startsWith("/admin") && role !== "admin" && role !== "employe") {
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
