"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isSignInWithEmailLink, signInWithEmailLink, updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Page publique de destination des liens d'invitation (client et employé).
 * Utilise generateSignInWithEmailLink (pas generatePasswordResetLink) côté
 * src/app/api/client/invite/route.ts et src/app/api/admin/staff/invite/route.ts
 * — testé empiriquement : un lien de réinitialisation de mot de passe
 * atterrit sur la page générique hébergée par Firebase, qui consomme le
 * code elle-même et ne transmet RIEN à cette page (mode/oobCode absents,
 * même avec handleCodeInApp: true). Un lien de connexion par courriel, lui,
 * transmet bien mode=signIn et oobCode jusqu'ici — confirmé par un clic réel.
 *
 * Flux : signInWithEmailLink (authentifie réellement l'utilisateur, sans
 * traiter de code nous-mêmes) → formulaire de mot de passe sur l'utilisateur
 * maintenant authentifié (updatePassword, plus de code à gérer) → session
 * complétée automatiquement (POST /api/auth/session, même appel que
 * /login) → redirection selon le rôle. L'utilisateur ne retape jamais son
 * mot de passe une seconde fois.
 *
 * Rendue publique dans src/middleware.ts.
 */
type Step = "verifying" | "needEmail" | "setPassword" | "done" | "error";

function ActivationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>("verifying");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function completeSignIn(emailToUse: string, href: string) {
    try {
      await signInWithEmailLink(auth, emailToUse, href);
      setStep("setPassword");
    } catch {
      setError("Ce lien n'est plus valide — il a peut-être déjà été utilisé ou a expiré. Demandez une nouvelle invitation.");
      setStep("error");
    }
  }

  useEffect(() => {
    const href = window.location.href;
    if (!isSignInWithEmailLink(auth, href)) {
      setError("Ce lien est invalide.");
      setStep("error");
      return;
    }
    // Le courriel n'est pas un paramètre renvoyé par Firebase — ajouté par
    // nos routes d'invitation. Repli défensif si jamais perdu en chemin
    // (lien retransmis, tronqué) : on le demande explicitement.
    const emailParam = searchParams.get("email");
    if (emailParam) {
      void completeSignIn(emailParam, href);
    } else {
      setStep("needEmail");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStep("verifying");
    await completeSignIn(email, window.location.href);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("no-current-user");

      await updatePassword(user, password);

      // Session complétée automatiquement — mêmes appels que /login, pas
      // besoin de retaper le mot de passe qu'on vient de choisir.
      const idToken = await user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("session-failed");
      const { role, clientId } = await res.json();

      setStep("done");
      if (role === "admin" || role === "employe") {
        router.push("/admin");
      } else {
        router.push(`/client/${clientId}/accueil`);
      }
    } catch {
      setError("Impossible de terminer l'activation. Réessayez, ou demandez une nouvelle invitation.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <img src="/logo.png" alt="AW Solution" width="48" height="48" />
          <span className="text-gray-900 font-semibold text-lg tracking-tight">AW Solution</span>
        </div>

        {step === "verifying" && (
          <p className="text-sm text-gray-500">Vérification du lien…</p>
        )}

        {step === "error" && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Lien invalide</h1>
            <p className="text-sm text-gray-500">{error}</p>
          </>
        )}

        {step === "done" && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Compte activé</h1>
            <p className="text-sm text-gray-500">Redirection…</p>
          </>
        )}

        {step === "needEmail" && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Confirmez votre courriel</h1>
            <p className="text-sm text-gray-500 mb-8">
              Pour des raisons de sécurité, confirmez l&apos;adresse à laquelle cette invitation a été envoyée.
            </p>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition"
                style={{ backgroundColor: "#0362E3" }}
              >
                Continuer
              </button>
            </form>
          </>
        )}

        {step === "setPassword" && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">Créer votre mot de passe</h1>
            <p className="text-sm text-gray-500 mb-8">Dernière étape pour activer votre compte.</p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nouveau mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#0362E3" }}
              >
                {submitting ? "Activation en cours…" : "Créer mon mot de passe"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ActivationPage() {
  return (
    <Suspense fallback={null}>
      <ActivationForm />
    </Suspense>
  );
}
