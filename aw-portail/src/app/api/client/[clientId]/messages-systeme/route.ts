import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { requireClientAccess } from "@/lib/requireClientAccess";

/**
 * Messages "système" — confirmations automatiques affichées comme venant
 * d'AW Solution (auteurRole "admin") suite à une action du client.
 *
 * Écrites ici (SDK Admin) plutôt que directement par le client : depuis la
 * Partie 4A, firestore.rules interdit à un client de créer lui-même un
 * message avec auteurRole autre que "client" — cette route est le seul
 * chemin autorisé pour ces 4 confirmations, dont le texte est un gabarit
 * fixe (jamais du texte libre fourni par l'appelant).
 */

type Payload =
  | { kind: "support_confirm"; catLabel: string }
  | { kind: "rencontre_confirmee"; label: string }
  | { kind: "date_alternative_demandee" }
  | { kind: "branding_complet" };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;
  const access = await requireClientAccess(req, clientId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  let texte: string;
  let typeMsg: string | undefined;

  switch (body.kind) {
    case "support_confirm": {
      const catLabel = String(body.catLabel ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 120);
      texte = `Votre demande de support a bien été reçue. Catégorie : ${catLabel}. Notre équipe vous revient sous peu.`;
      typeMsg = "support_confirm";
      break;
    }
    case "rencontre_confirmee": {
      const label = String(body.label ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 120);
      texte = `Rencontre confirmée pour le ${label}. Vous recevrez un lien de connexion sous peu.`;
      break;
    }
    case "date_alternative_demandee": {
      texte = "Votre demande de date alternative a été reçue. Nous vous confirmons sous peu.";
      break;
    }
    case "branding_complet": {
      texte = "Nous avons bien reçu vos informations de branding ! Notre équipe va débuter la conception de votre application très prochainement. Si nous avons des questions en cours de route, nous vous écrirons directement ici — gardez un œil sur vos messages. Au plaisir de vous présenter le résultat !";
      break;
    }
    default:
      return NextResponse.json({ error: "Type de message inconnu" }, { status: 400 });
  }

  await adminDb.collection("clients").doc(clientId).collection("messages").add({
    texte,
    auteur: "AW Solution",
    auteurRole: "admin",
    date: Timestamp.now(),
    lu: false,
    ...(typeMsg ? { typeMsg } : {}),
  });

  return NextResponse.json({ ok: true });
}
