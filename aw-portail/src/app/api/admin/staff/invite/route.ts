import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { resend } from "@/lib/resend";
import { FieldValue } from "firebase-admin/firestore";
import type { AdminPermissions } from "@/config/adminSections";
import { requireAdminDetailed } from "@/lib/requireAdmin";

/**
 * Invitation d'un employé au portail admin — miroir de /api/client/invite,
 * réservé à requireAdminDetailed (strict, admin seulement) : un employé ne
 * doit pas pouvoir s'inviter lui-même ni modifier les permissions d'un
 * autre employé.
 *
 * DELETE ne supprime jamais users/{uid} — voir la note sur la fonction
 * DELETE plus bas.
 */

export async function POST(req: NextRequest) {
  const access = await requireAdminDetailed(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { nom, courriel, permissions } = await req.json() as {
      nom: string; courriel: string; permissions: AdminPermissions;
    };

    if (!nom || !courriel) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    // 1. Créer (ou trouver) le compte Firebase Auth
    let uid: string;
    try {
      const existingUser = await adminAuth.getUserByEmail(courriel);
      uid = existingUser.uid;
    } catch {
      const newUser = await adminAuth.createUser({ email: courriel, displayName: nom });
      uid = newUser.uid;
    }

    // 2. Ne jamais écraser un compte admin existant qui utiliserait ce
    // courriel — cette route ne doit créer/gérer que des comptes employé.
    const existingDoc = await adminDb.collection("users").doc(uid).get();
    if (existingDoc.exists && existingDoc.data()?.role === "admin") {
      return NextResponse.json(
        { error: "Ce courriel correspond déjà à un compte administrateur." },
        { status: 409 },
      );
    }

    // 3. Générer le lien d'activation (password reset → l'utilisateur définit son mot de passe)
    const activationLink = await adminAuth.generatePasswordResetLink(courriel);

    // 4. Créer/mettre à jour le document utilisateur
    const now = FieldValue.serverTimestamp();
    await adminDb.collection("users").doc(uid).set({
      role: "employe",
      nom,
      courriel,
      permissions,
      statut: "invitation_en_attente",
      createdAt: existingDoc.exists ? (existingDoc.data()?.createdAt ?? now) : now,
      invitedAt: now,
    }, { merge: true });

    // 5. Envoyer le courriel d'invitation
    await resend.emails.send({
      from: "AW Solution <noreply@awsolution.ca>",
      to: courriel,
      subject: "Invitation — Portail admin AW Solution",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:40px 28px;color:#1F2937;background:#fff">
          <div style="margin-bottom:28px">
            <span style="display:inline-block;background:#0362E3;color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.04em">AW Solution</span>
          </div>
          <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#0A0A0A">Vous avez été invité(e) au portail admin AW Solution</h2>
          <p style="font-size:14px;color:#6B7280;margin:0 0 24px;line-height:1.6">
            Vous avez maintenant un accès au portail interne AW Solution. Vous pouvez vous connecter à tout moment avec l'adresse <strong>${courriel}</strong>.
          </p>
          <p style="font-size:14px;color:#374151;margin:0 0 6px;font-weight:600">Étape unique pour activer votre compte :</p>
          <p style="font-size:14px;color:#374151;margin:0 0 24px;line-height:1.6">
            Cliquez sur le bouton ci-dessous pour créer votre mot de passe. Une fois fait, vous pourrez vous connecter directement avec votre courriel et votre nouveau mot de passe.
          </p>
          <div style="margin:0 0 32px">
            <a href="${activationLink}"
               style="display:inline-block;background:#0362E3;color:#fff;text-decoration:none;padding:13px 30px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.02em">
              Créer mon mot de passe →
            </a>
          </div>
          <div style="border-top:1px solid #F3F4F6;padding-top:20px">
            <p style="font-size:12px;color:#9CA3AF;margin:0;line-height:1.6">
              Ce lien est valide pour les prochaines 24 heures. Si vous n'attendiez pas cette invitation, vous pouvez ignorer ce message en toute sécurité.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, uid });
  } catch (err) {
    console.error("[staff invite API]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Modifier les permissions d'un employé
export async function PATCH(req: NextRequest) {
  const access = await requireAdminDetailed(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { userId, permissions } = await req.json() as {
      userId: string; permissions: AdminPermissions;
    };
    if (!userId) return NextResponse.json({ error: "userId manquant" }, { status: 400 });

    const targetSnap = await adminDb.collection("users").doc(userId).get();
    if (!targetSnap.exists || targetSnap.data()?.role !== "employe") {
      return NextResponse.json({ error: "Compte employé introuvable" }, { status: 404 });
    }

    await adminDb.collection("users").doc(userId).update({ permissions });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[staff update-permissions API]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Révoquer l'accès d'un employé — désactive plutôt que supprimer.
// users/{uid} est CONSERVÉ (statut: "revoque") : le compte Firebase Auth
// reste toujours associé à un document Firestore. Le blocage réel de
// connexion se fait dans /api/auth/session, qui refuse toute session pour
// statut === "revoque".
export async function DELETE(req: NextRequest) {
  const access = await requireAdminDetailed(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { userId } = await req.json() as { userId: string };
    if (!userId) return NextResponse.json({ error: "userId manquant" }, { status: 400 });

    const targetSnap = await adminDb.collection("users").doc(userId).get();
    if (!targetSnap.exists || targetSnap.data()?.role !== "employe") {
      return NextResponse.json({ error: "Compte employé introuvable" }, { status: 404 });
    }

    await adminDb.collection("users").doc(userId).update({
      statut: "revoque",
      revokedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[staff revoke API]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
