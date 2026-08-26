import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { resend } from "@/lib/resend";
import { FieldValue } from "firebase-admin/firestore";
import type { Permissions } from "@/config/sections";
import { requireClientAccess } from "@/lib/requireClientAccess";

export async function POST(req: NextRequest) {
  try {
    const { clientId, nom, titre, courriel, permissions } = await req.json() as {
      clientId: string;
      nom: string;
      titre: string;
      courriel: string;
      permissions: Permissions;
    };

    if (!clientId) {
      return NextResponse.json({ error: "clientId manquant" }, { status: 400 });
    }
    const access = await requireClientAccess(req, clientId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!nom || !courriel) {
      return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
    }

    // 1. Récupérer le nom du restaurant pour l'email
    const clientSnap = await adminDb.doc(`clients/${clientId}`).get();
    const restaurantNom = clientSnap.exists ? (clientSnap.data()?.nom ?? clientSnap.data()?.restaurant ?? "votre portail") : "votre portail";

    // 2. Créer (ou trouver) le compte Firebase Auth
    let uid: string;
    try {
      const existingUser = await adminAuth.getUserByEmail(courriel);
      uid = existingUser.uid;
    } catch {
      const newUser = await adminAuth.createUser({
        email: courriel,
        displayName: nom,
      });
      uid = newUser.uid;
    }

    // 3. Claims : role client + clientId
    await adminAuth.setCustomUserClaims(uid, { role: "client", clientId });

    // 4. Générer le lien d'activation (password reset → l'utilisateur définit son mot de passe)
    const activationLink = await adminAuth.generatePasswordResetLink(courriel);

    // 5. Créer le document utilisateur dans Firestore
    const now = FieldValue.serverTimestamp();
    await adminDb
      .collection("clients").doc(clientId)
      .collection("users").doc(uid)
      .set({
        nom,
        titre,
        courriel,
        statut: "invitation_en_attente",
        permissions,
        createdAt: now,
        invitedAt: now,
      });

    // 6. Envoyer l'email d'invitation
    await resend.emails.send({
      from: "AW Solution <noreply@awsolution.ca>",
      to: courriel,
      subject: `Invitation — Portail AW Solution (${restaurantNom})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:40px 28px;color:#1F2937;background:#fff">
          <div style="margin-bottom:28px">
            <span style="display:inline-block;background:#0362E3;color:#fff;font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.04em">AW Solution</span>
          </div>
          <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#0A0A0A">Vous avez été invité(e) au portail AW Solution</h2>
          <p style="font-size:14px;color:#6B7280;margin:0 0 24px;line-height:1.6">
            <strong>${restaurantNom}</strong> vous a accordé un accès au portail client AW Solution.
            Vous pouvez vous connecter à tout moment avec l'adresse <strong>${courriel}</strong>.
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
    console.error("[invite API]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Révoquer l'accès d'un utilisateur
export async function DELETE(req: NextRequest) {
  try {
    const { clientId, userId } = await req.json() as { clientId: string; userId: string };
    if (!clientId) return NextResponse.json({ error: "clientId manquant" }, { status: 400 });

    const access = await requireClientAccess(req, clientId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!userId) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

    await adminDb.collection("clients").doc(clientId).collection("users").doc(userId).delete();

    // Retirer les custom claims Firebase Auth
    try {
      const user = await adminAuth.getUser(userId);
      const claims = user.customClaims ?? {};
      if (claims.clientId === clientId) {
        await adminAuth.setCustomUserClaims(userId, { role: "client", clientId: null });
      }
    } catch { /* user might not exist */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[revoke API]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Modifier les permissions
export async function PATCH(req: NextRequest) {
  try {
    const { clientId, userId, permissions } = await req.json() as {
      clientId: string; userId: string; permissions: Permissions;
    };
    if (!clientId) return NextResponse.json({ error: "clientId manquant" }, { status: 400 });

    const access = await requireClientAccess(req, clientId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    if (!userId) return NextResponse.json({ error: "Champs manquants" }, { status: 400 });

    await adminDb.collection("clients").doc(clientId).collection("users").doc(userId)
      .update({ permissions });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[update-permissions API]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
