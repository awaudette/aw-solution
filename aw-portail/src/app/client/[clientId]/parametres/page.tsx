"use client";

import { use, useEffect, useRef, useState } from "react";
import {
  doc, onSnapshot, getDoc, setDoc,
  collection, updateDoc, Timestamp,
} from "firebase/firestore";
import {
  EmailAuthProvider, reauthenticateWithCredential,
  updatePassword, verifyBeforeUpdateEmail,
} from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { PORTAL_SECTIONS, DEFAULT_PERMISSIONS } from "@/config/sections";
import type { Permissions, Permission, SectionKey } from "@/config/sections";
import {
  User, Shield, Bell, Users, Plus, Trash2, Check,
  Phone, Mail, Eye, EyeOff, Pencil,
} from "lucide-react";

// ─── Styles communs ────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "#fff", border: "1px solid #F3F4F6",
  borderRadius: 16, padding: "28px 32px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 20,
};
const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#9CA3AF",
  textTransform: "uppercase", letterSpacing: "0.06em",
  display: "block", marginBottom: 6,
};
const INPUT: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 9,
  border: "1px solid #E5E7EB", fontSize: 14, color: "#1F2937",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const SELECT_STYLE: React.CSSProperties = {
  padding: "7px 10px", borderRadius: 8, border: "1px solid #E5E7EB",
  fontSize: 13, color: "#374151", background: "#fff",
  outline: "none", fontFamily: "inherit", cursor: "pointer",
};
const BTN_PRIMARY: React.CSSProperties = {
  padding: "10px 24px", borderRadius: 10, border: "none",
  background: "#0362E3", color: "#fff", fontSize: 13,
  fontWeight: 600, cursor: "pointer",
};
const BTN_GHOST: React.CSSProperties = {
  padding: "8px 16px", borderRadius: 8, border: "1px solid #E5E7EB",
  background: "#F9FAFB", color: "#374151", fontSize: 13,
  fontWeight: 500, cursor: "pointer",
};
const SECTION_TITLE: React.CSSProperties = {
  fontSize: 16, fontWeight: 700, color: "#0A0A0A",
  margin: "0 0 20px", display: "flex", alignItems: "center", gap: 10,
};
const DIVIDER: React.CSSProperties = {
  height: 1, background: "#F3F4F6", margin: "20px 0",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function passwordStrength(pwd: string): { score: 0 | 1 | 2; label: string; color: string } {
  if (!pwd) return { score: 0, label: "", color: "" };
  const checks = [
    pwd.length >= 8,
    /[A-Z]/.test(pwd),
    /[a-z]/.test(pwd),
    /[0-9]/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ];
  const n = checks.filter(Boolean).length;
  if (n <= 2) return { score: 0, label: "Faible", color: "#EF4444" };
  if (n <= 3) return { score: 1, label: "Moyen", color: "#F59E0B" };
  return { score: 2, label: "Fort", color: "#22C55E" };
}

function permissionSummary(perms: Permissions): string {
  const entries = Object.entries(perms) as [SectionKey, Permission][];
  const active = entries.filter(([, v]) => v !== null);
  if (active.length === 0) return "Aucune section";
  const hasEcriture = active.some(([, v]) => v === "ecriture");
  const level = hasEcriture ? "lecture et écriture" : "lecture seulement";
  return `${active.length} section${active.length > 1 ? "s" : ""} — ${level}`;
}

// ─── PasswordInput ─────────────────────────────────────────────────────────────

function PasswordInput({
  value, onChange, placeholder, autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        style={{ ...INPUT, paddingRight: 42 }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        style={{
          position: "absolute", right: 10, top: "50%",
          transform: "translateY(-50%)", background: "none", border: "none",
          cursor: "pointer", color: "#9CA3AF", padding: 2,
        }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ─── Notification toggle ───────────────────────────────────────────────────────

function NotifToggle({
  checked, onChange, locked,
}: {
  checked: boolean; onChange: () => void; locked?: boolean;
}) {
  // Locked + actif → bleu pâle pour distinguer des toggles modifiables
  const trackColor = locked && checked ? "#BFDBFE" : checked ? "#0362E3" : "#E5E7EB";
  return (
    <button
      type="button"
      onClick={locked ? undefined : onChange}
      style={{
        width: 42, height: 24, borderRadius: 12, border: "none",
        cursor: locked ? "default" : "pointer", position: "relative",
        background: trackColor, transition: "background 200ms", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3,
        left: checked ? 21 : 3, width: 18, height: 18,
        background: "#fff", borderRadius: "50%",
        transition: "left 200ms", display: "block",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ─── Question tooltip pour notifications verrouillées ────────────────────────

function InfoTip({ id, active, onEnter, onLeave }: {
  id: string; active: boolean;
  onEnter: () => void; onLeave: () => void;
}) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <span
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 16, height: 16, borderRadius: "50%",
          background: "#E5E7EB", color: "#6B7280",
          fontSize: 10, fontWeight: 700, cursor: "help", flexShrink: 0,
          userSelect: "none",
        }}
      >
        ?
      </span>
      {active && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)", width: 270, padding: "9px 13px",
          background: "#1F2937", color: "#fff", borderRadius: 9, fontSize: 11,
          lineHeight: 1.6, zIndex: 100, pointerEvents: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        }}>
          Cette notification est obligatoire — elle ne peut pas être désactivée pour des raisons importantes liées à votre compte ou à vos rencontres.
        </div>
      )}
    </div>
  );
}

// ─── BLOC 1 — Informations du compte ──────────────────────────────────────────

interface ContactAdd { type: "telephone" | "courriel"; label: string; valeur: string }

function BlocCompte({ clientId }: { clientId: string }) {
  const [data,         setData]         = useState<Record<string, string>>({});
  const [contacts,     setContacts]     = useState<ContactAdd[]>([]);
  const [initData,     setInitData]     = useState<Record<string, string> | null>(null);
  const [initContacts, setInitContacts] = useState<ContactAdd[] | null>(null);
  const initDataSet     = useRef(false);
  const initContactsSet = useRef(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [addRow,   setAddRow]   = useState(false);
  const [newC,     setNewC]     = useState<ContactAdd>({ type: "telephone", label: "", valeur: "" });
  const [emailMsg, setEmailMsg] = useState("");

  useEffect(() => {
    let unsubClient: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;
    let cancelled = false;

    async function init() {
      // 1. Lire branding/main pour le fallback (une seule lecture)
      let b: Record<string, string> = {};
      try {
        const brandingSnap = await getDoc(doc(db, "clients", clientId, "branding", "main"));
        if (brandingSnap.exists()) {
          const bd = brandingSnap.data();
          b = {
            nomContactPrincipal: bd.nomContactPrincipal ?? "",
            nomLegal:            bd.nomLegal            ?? "",
            telephoneEntreprise: bd.telephoneEntreprise ?? "",
            telephoneContact:    bd.telephoneContact    ?? "",
            courrielEntreprise:  bd.courrielEntreprise  ?? "",
            courrielContact:     bd.courrielContact     ?? "",
          };
        }
      } catch { /* branding pas encore créé */ }

      if (cancelled) return;

      // 2. Écouter le doc client — fallback vers branding sur champs vides
      unsubClient = onSnapshot(doc(db, "clients", clientId), snap => {
        if (!snap.exists()) return;
        const d = snap.data();
        const newData = {
          contact:              d.contact              || b.nomContactPrincipal || "",
          restaurant:           d.restaurant           || b.nomLegal            || "",
          telephone_restaurant: d.telephone_restaurant || b.telephoneEntreprise || "",
          telephone_contact:    d.telephone_contact    || b.telephoneContact    || "",
          courriel_restaurant:  d.courriel_restaurant  || b.courrielEntreprise  || "",
          courriel_contact:     d.courriel             || b.courrielContact     || "",
        };
        if (!initDataSet.current) {
          setInitData({ ...newData });
          initDataSet.current = true;
        }
        setData(newData);
      });

      // 3. Écouter les contacts additionnels
      unsubSettings = onSnapshot(doc(db, "clients", clientId, "settings", "main"), snap => {
        const list: ContactAdd[] = snap.exists() ? (snap.data().contactsAdditionnels ?? []) : [];
        if (!initContactsSet.current) {
          setInitContacts(JSON.parse(JSON.stringify(list)));
          initContactsSet.current = true;
        }
        setContacts(list);
      });
    }

    init();
    return () => {
      cancelled = true;
      unsubClient?.();
      unsubSettings?.();
    };
  }, [clientId]);

  function field(key: string): string { return data[key] ?? ""; }
  function setField(key: string, val: string) {
    setData(d => ({ ...d, [key]: val }));
  }

  function addContact() {
    if (!newC.label.trim() || !newC.valeur.trim()) return;
    setContacts(c => [...c, newC]);
    setNewC({ type: "telephone", label: "", valeur: "" });
    setAddRow(false);
  }

  // Détection de modification
  const isDirty = initData !== null && (
    JSON.stringify(data) !== JSON.stringify(initData) ||
    JSON.stringify(contacts) !== JSON.stringify(initContacts ?? [])
  );

  async function handleSave() {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      const loginEmail = auth.currentUser?.email ?? "";
      const emailChanged = data.courriel_contact && data.courriel_contact !== loginEmail;

      await updateDoc(doc(db, "clients", clientId), {
        contact:              data.contact,
        restaurant:           data.restaurant,
        telephone_restaurant: data.telephone_restaurant,
        telephone_contact:    data.telephone_contact,
        courriel_restaurant:  data.courriel_restaurant,
        courriel:             data.courriel_contact,
      });
      await setDoc(
        doc(db, "clients", clientId, "settings", "main"),
        { contactsAdditionnels: contacts },
        { merge: true }
      );

      // Changement du courriel de connexion Firebase Auth
      if (emailChanged && auth.currentUser && auth.currentUser.email !== data.courriel_contact) {
        try {
          await verifyBeforeUpdateEmail(auth.currentUser, data.courriel_contact);
          setEmailMsg("Un courriel de confirmation a été envoyé à votre nouvelle adresse.");
        } catch (e: unknown) {
          const msg = (e as { message?: string })?.message ?? "";
          if (msg.includes("requires-recent-login")) {
            setEmailMsg("Reconnectez-vous puis réessayez de changer le courriel.");
          }
        }
      }

      // Mettre à jour les valeurs initiales après sauvegarde
      setInitData({ ...data });
      setInitContacts(JSON.parse(JSON.stringify(contacts)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  return (
    <div style={CARD}>
      <p style={SECTION_TITLE as React.CSSProperties}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <User size={17} color="#0362E3" />
        </span>
        Informations du compte
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={LABEL}>Nom complet</label>
          <input style={INPUT} value={field("contact")} onChange={e => setField("contact", e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>Nom du restaurant</label>
          <input style={INPUT} value={field("restaurant")} onChange={e => setField("restaurant", e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={LABEL}>Courriel de connexion</label>
        <input
          style={INPUT}
          type="email"
          value={field("courriel_contact")}
          onChange={e => setField("courriel_contact", e.target.value)}
          placeholder={auth.currentUser?.email ?? ""}
        />
        {emailMsg && <p style={{ fontSize: 12, color: "#0362E3", marginTop: 4 }}>{emailMsg}</p>}
        <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, margin: 0 }}>
          Un courriel de confirmation sera envoyé avant d'appliquer le changement.
        </p>
      </div>

      <div style={DIVIDER} />

      {/* Coordonnées principales */}
      <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Coordonnées principales</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label style={LABEL}><Phone size={10} style={{ marginRight: 4 }} />Téléphone du restaurant</label>
          <input style={INPUT} value={field("telephone_restaurant")} onChange={e => setField("telephone_restaurant", e.target.value)} placeholder="514-XXX-XXXX" />
        </div>
        <div>
          <label style={LABEL}><Phone size={10} style={{ marginRight: 4 }} />Téléphone du contact principal</label>
          <input style={INPUT} value={field("telephone_contact")} onChange={e => setField("telephone_contact", e.target.value)} placeholder="514-XXX-XXXX" />
        </div>
        <div>
          <label style={LABEL}><Mail size={10} style={{ marginRight: 4 }} />Courriel du restaurant</label>
          <input style={INPUT} value={field("courriel_restaurant")} onChange={e => setField("courriel_restaurant", e.target.value)} placeholder="info@restaurant.ca" />
        </div>
        <div>
          <label style={LABEL}><Mail size={10} style={{ marginRight: 4 }} />Courriel du contact principal</label>
          <input style={INPUT} value={field("courriel_contact")} onChange={e => setField("courriel_contact", e.target.value)} />
        </div>
      </div>

      <div style={DIVIDER} />

      {/* Contacts additionnels */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>Coordonnées supplémentaires</p>
        {!addRow && (
          <button
            onClick={() => setAddRow(true)}
            style={{ display: "flex", alignItems: "center", gap: 5, ...BTN_GHOST, padding: "6px 12px", fontSize: 12 }}
          >
            <Plus size={12} /> Ajouter un contact
          </button>
        )}
      </div>

      {contacts.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "10px 14px", background: "#F9FAFB", borderRadius: 9, border: "1px solid #F3F4F6" }}>
          <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0, minWidth: 60 }}>
            {c.type === "telephone" ? "📞" : "📧"} {c.label}
          </span>
          <span style={{ flex: 1, fontSize: 13, color: "#374151" }}>{c.valeur}</span>
          <button
            onClick={() => setContacts(prev => prev.filter((_, j) => j !== i))}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#9CA3AF" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {addRow && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", padding: "12px 14px", background: "#F9FAFB", borderRadius: 10, border: "1px dashed #E5E7EB", marginBottom: 8 }}>
          <div style={{ minWidth: 130 }}>
            <label style={LABEL}>Type</label>
            <select
              value={newC.type}
              onChange={e => setNewC(c => ({ ...c, type: e.target.value as "telephone" | "courriel" }))}
              style={{ ...SELECT_STYLE, width: "100%" }}
            >
              <option value="telephone">📞 Téléphone</option>
              <option value="courriel">📧 Courriel</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Label</label>
            <input style={INPUT} placeholder="Ex. Numéro du gérant" value={newC.label} onChange={e => setNewC(c => ({ ...c, label: e.target.value }))} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={LABEL}>Valeur</label>
            <input style={INPUT} placeholder="514-XXX-XXXX" value={newC.valeur} onChange={e => setNewC(c => ({ ...c, valeur: e.target.value }))} />
          </div>
          <button onClick={addContact} style={{ ...BTN_PRIMARY, padding: "10px 14px" }}><Check size={14} /></button>
          <button onClick={() => setAddRow(false)} style={{ ...BTN_GHOST, padding: "10px 14px" }}><Trash2 size={14} /></button>
        </div>
      )}

      <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        {isDirty && !saved && (
          <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Des modifications non sauvegardées</p>
        )}
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          style={{
            ...BTN_PRIMARY,
            background: isDirty ? (saved ? "#22C55E" : "#0362E3") : "#E5E7EB",
            color: isDirty ? "#fff" : "#9CA3AF",
            cursor: isDirty ? "pointer" : "not-allowed",
          }}
        >
          {saved ? "✓ Sauvegardé" : saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}

// ─── BLOC 2 — Sécurité ────────────────────────────────────────────────────────

function BlocSecurite({ clientId }: { clientId: string }) {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [updating, setUpdating] = useState(false);
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null);

  const strength    = passwordStrength(next);
  const passwordsOk = next.length >= 6 && next === confirm && current.length >= 1;

  async function handleUpdate() {
    if (!passwordsOk || updating) return;
    setUpdating(true); setMsg(null);
    try {
      const user = auth.currentUser;
      if (!user?.email) throw new Error("Non connecté");

      const credential = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, next);

      await setDoc(
        doc(db, "clients", clientId, "settings", "main"),
        { motDePasseChangedAt: Timestamp.now() },
        { merge: true }
      );

      setCurrent(""); setNext(""); setConfirm("");
      setMsg({ text: "Mot de passe mis à jour avec succès.", ok: true });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setMsg({ text: "Mot de passe actuel incorrect.", ok: false });
      } else if (code === "auth/requires-recent-login") {
        setMsg({ text: "Session expirée. Reconnectez-vous puis réessayez.", ok: false });
      } else {
        setMsg({ text: "Une erreur est survenue. Réessayez.", ok: false });
      }
    } finally { setUpdating(false); }
  }

  return (
    <div style={CARD}>
      <p style={SECTION_TITLE as React.CSSProperties}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: "#FFF7ED", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Shield size={17} color="#F59E0B" />
        </span>
        Sécurité
      </p>

      <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Mot de passe actuel */}
        <div>
          <label style={LABEL}>Mot de passe actuel</label>
          <PasswordInput
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />
        </div>

        {/* Nouveau mot de passe */}
        <div>
          <label style={LABEL}>Nouveau mot de passe</label>
          <PasswordInput
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />
          {next && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: i <= strength.score ? strength.color : "#E5E7EB",
                    transition: "background 200ms",
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: strength.color, margin: 0, fontWeight: 600 }}>{strength.label}</p>
            </div>
          )}
        </div>

        {/* Confirmer */}
        <div>
          <label style={LABEL}>Confirmer le nouveau mot de passe</label>
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
          {confirm && confirm !== next && (
            <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>Les mots de passe ne correspondent pas.</p>
          )}
        </div>

        {msg && (
          <div style={{
            padding: "10px 14px", borderRadius: 9, fontSize: 13,
            background: msg.ok ? "#F0FDF4" : "#FEF2F2",
            color: msg.ok ? "#166534" : "#991B1B",
            border: `1px solid ${msg.ok ? "#BBF7D0" : "#FECACA"}`,
          }}>
            {msg.text}
          </div>
        )}

        <div>
          <button
            onClick={handleUpdate}
            disabled={!passwordsOk || updating}
            style={{
              ...BTN_PRIMARY,
              background: passwordsOk ? "#0362E3" : "#E5E7EB",
              color: passwordsOk ? "#fff" : "#9CA3AF",
              cursor: passwordsOk ? "pointer" : "not-allowed",
            }}
          >
            {updating ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BLOC 3 — Gestion des utilisateurs ────────────────────────────────────────

interface UserDoc {
  id: string;
  nom: string;
  titre: string;
  courriel: string;
  statut: "actif" | "invitation_en_attente";
  permissions: Permissions;
}

// Dropdown de permission par section (checkbox + select)
function SectionPermRow({
  label, maxPermission, value, onChange, error,
}: {
  label: string;
  maxPermission: "lecture" | "ecriture";
  value: Permission;
  onChange: (v: Permission) => void;
  error?: boolean;
}) {
  const isEnabled = value !== null;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "9px 0", gap: 14,
      borderBottom: "1px solid #F3F4F6",
    }}>
      {/* Checkbox + label */}
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1, minWidth: 0 }}>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={e => onChange(e.target.checked ? "lecture" : null)}
          style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#0362E3", flexShrink: 0 }}
        />
        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</span>
      </label>

      {/* Dropdown niveau (visible seulement si coché) */}
      {isEnabled ? (
        <select
          value={value ?? ""}
          onChange={e => onChange(e.target.value as Permission)}
          style={{
            ...SELECT_STYLE,
            borderColor: error ? "#EF4444" : "#E5E7EB",
            flexShrink: 0,
          }}
        >
          <option value="lecture">Lecture</option>
          {maxPermission === "ecriture" && <option value="ecriture">Lecture et écriture</option>}
        </select>
      ) : (
        <span style={{ fontSize: 12, color: "#D1D5DB", flexShrink: 0 }}>Aucun accès</span>
      )}
    </div>
  );
}

function InviteForm({
  clientId,
  initial,
  userId,
  onDone,
}: {
  clientId: string;
  initial?: UserDoc;
  userId?: string;
  onDone: () => void;
}) {
  const [nom,      setNom]      = useState(initial?.nom ?? "");
  const [titre,    setTitre]    = useState(initial?.titre ?? "");
  const [courriel, setCourriel] = useState(initial?.courriel ?? "");
  const [perms,    setPerms]    = useState<Permissions>(initial?.permissions ?? { ...DEFAULT_PERMISSIONS });
  const [sending,  setSending]  = useState(false);
  const [errors,   setErrors]   = useState<string[]>([]);
  const isEdit = !!userId;

  function setPermission(key: SectionKey, val: Permission) {
    setPerms(p => ({ ...p, [key]: val }));
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!nom.trim())     errs.push("Le nom complet est requis.");
    if (!titre.trim())   errs.push("Le titre est requis.");
    if (!courriel.trim() || !courriel.includes("@"))
      errs.push("Un courriel valide est requis.");
    return errs;
  }

  async function handleSubmit() {
    setErrors([]);
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }

    setSending(true);
    try {
      if (isEdit) {
        const res = await fetch("/api/client/invite", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, userId, permissions: perms }),
        });
        if (!res.ok) throw new Error("Erreur lors de la mise à jour.");
      } else {
        const res = await fetch("/api/client/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, nom, titre, courriel, permissions: perms }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Erreur lors de l'envoi.");
        }
      }
      onDone();
    } catch (e: unknown) {
      setErrors([(e as Error).message || "Erreur lors de l'envoi."]);
    } finally { setSending(false); }
  }

  return (
    <div style={{ background: "#F9FAFB", border: "1px dashed #E5E7EB", borderRadius: 12, padding: "20px 22px", marginBottom: 16 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: "0 0 16px" }}>
        {isEdit ? "Modifier les permissions" : "Inviter un utilisateur"}
      </p>

      {!isEdit && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={LABEL}>Nom complet *</label>
            <input style={{ ...INPUT, borderColor: errors.some(e => e.includes("nom")) ? "#EF4444" : "#E5E7EB" }} value={nom} onChange={e => setNom(e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Titre *</label>
            <input style={{ ...INPUT, borderColor: errors.some(e => e.includes("titre")) ? "#EF4444" : "#E5E7EB" }} placeholder="Ex. Gérant" value={titre} onChange={e => setTitre(e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Courriel *</label>
            <input style={{ ...INPUT, borderColor: errors.some(e => e.includes("courriel")) ? "#EF4444" : "#E5E7EB" }} type="email" value={courriel} onChange={e => setCourriel(e.target.value)} />
          </div>
        </div>
      )}

      {/* Permissions par section */}
      <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Accès aux sections
      </p>
      <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 12px" }}>
        Cochez les sections auxquelles cet utilisateur a accès, puis choisissez le niveau.
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {PORTAL_SECTIONS.map(section => (
          <SectionPermRow
            key={section.key}
            label={section.label}
            maxPermission={section.maxPermission as "lecture" | "ecriture"}
            value={perms[section.key as SectionKey] ?? null}
            onChange={val => setPermission(section.key as SectionKey, val)}
          />
        ))}
      </div>

      {errors.length > 0 && (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 9, background: "#FEF2F2", border: "1px solid #FECACA" }}>
          {errors.map((e, i) => (
            <p key={i} style={{ fontSize: 13, color: "#DC2626", margin: i === 0 ? 0 : "4px 0 0" }}>• {e}</p>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={handleSubmit} disabled={sending} style={BTN_PRIMARY}>
          {sending ? "Envoi…" : isEdit ? "Enregistrer" : "Envoyer l'invitation"}
        </button>
        <button onClick={onDone} style={BTN_GHOST}>Annuler</button>
      </div>
    </div>
  );
}

function BlocUtilisateurs({ clientId }: { clientId: string }) {
  const [users,    setUsers]    = useState<UserDoc[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserDoc | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(collection(db, "clients", clientId, "users"), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserDoc)));
    });
  }, [clientId]);

  async function handleRevoke(u: UserDoc) {
    if (!confirm(`Révoquer l'accès de ${u.nom} ?`)) return;
    setRevoking(u.id);
    try {
      await fetch("/api/client/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, userId: u.id }),
      });
    } finally { setRevoking(null); }
  }

  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ ...SECTION_TITLE as React.CSSProperties, margin: 0 }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={17} color="#22C55E" />
          </span>
          Gestion des utilisateurs
        </p>
        {!showForm && !editUser && (
          <button
            onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, ...BTN_PRIMARY, padding: "9px 16px" }}
          >
            <Plus size={13} /> Inviter un utilisateur
          </button>
        )}
      </div>

      {(showForm && !editUser) && (
        <InviteForm clientId={clientId} onDone={() => setShowForm(false)} />
      )}
      {editUser && (
        <InviteForm
          clientId={clientId}
          initial={editUser}
          userId={editUser.id}
          onDone={() => setEditUser(null)}
        />
      )}

      {users.length === 0 && !showForm && !editUser ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF", fontSize: 13 }}>
          Aucun utilisateur invité pour l'instant.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 18px", background: "#FAFAFA",
              border: "1px solid #F3F4F6", borderRadius: 12,
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <User size={17} color="#0362E3" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>{u.nom}</p>
                  {u.titre && <span style={{ fontSize: 11, color: "#9CA3AF" }}>{u.titre}</span>}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                    background: u.statut === "actif" ? "#F0FDF4" : "#FFFBEB",
                    color: u.statut === "actif" ? "#166534" : "#92400E",
                    border: `1px solid ${u.statut === "actif" ? "#BBF7D0" : "#FDE68A"}`,
                  }}>
                    {u.statut === "actif" ? "Actif" : "Invitation en attente"}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
                  {u.courriel} · {permissionSummary(u.permissions)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setEditUser(u)}
                  style={{ display: "flex", alignItems: "center", gap: 4, ...BTN_GHOST, padding: "7px 12px", fontSize: 12 }}
                >
                  <Pencil size={12} /> Modifier
                </button>
                <button
                  onClick={() => handleRevoke(u)}
                  disabled={revoking === u.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
                    background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626",
                  }}
                >
                  <Trash2 size={12} /> Révoquer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BLOC 4 — Notifications ────────────────────────────────────────────────────

const NOTIF_GROUPS = [
  {
    label: "Votre application",
    items: [
      { key: "journalMiseAJour",   label: "Nouvelle mise à jour dans le journal de développement", locked: false },
      { key: "etapeDeploiement",   label: "Étapes du déploiement de votre app complétées",          locked: false },
      { key: "documentAWS",        label: "Documents déposés par AW Solution",                      locked: false },
      { key: "formationDisponible",label: "Formation disponible",                                   locked: false },
      { key: "materielLancement",  label: "Matériel de lancement disponible",                       locked: false },
    ],
  },
  {
    label: "Votre compte",
    items: [
      { key: "nouveauMessage",    label: "Nouveau message de l'équipe AW Solution", locked: true  },
      { key: "factureDisponible", label: "Facture disponible",                      locked: false },
      { key: "renouvellement60j", label: "Renouvellement dans 60 jours",            locked: true  },
      { key: "paiementRefuse",    label: "Paiement refusé ou en retard",            locked: true  },
    ],
  },
  {
    label: "Rencontres",
    items: [
      { key: "confirmationRencontre", label: "Confirmation de rencontre",            locked: true  },
      { key: "rappelRencontre",       label: "Rappel de rencontre 2 heures avant",   locked: false },
    ],
  },
] as const;

type NotifKey = (typeof NOTIF_GROUPS)[number]["items"][number]["key"];

const DEFAULT_NOTIFS: Record<NotifKey, boolean> = {
  journalMiseAJour: true, etapeDeploiement: true, documentAWS: true,
  formationDisponible: true, materielLancement: true,
  nouveauMessage: true, factureDisponible: true, renouvellement60j: true,
  paiementRefuse: true, confirmationRencontre: true, rappelRencontre: true,
};

function BlocNotifications({ clientId }: { clientId: string }) {
  const [notifs,  setNotifs]  = useState<Record<NotifKey, boolean>>({ ...DEFAULT_NOTIFS });
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "clients", clientId, "settings", "notifications"), snap => {
      if (snap.exists()) setNotifs({ ...DEFAULT_NOTIFS, ...snap.data() as Record<NotifKey, boolean> });
    });
    return unsub;
  }, [clientId]);

  async function handleSave() {
    setSaving(true);
    try {
      await setDoc(doc(db, "clients", clientId, "settings", "notifications"), notifs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  return (
    <div style={CARD}>
      <p style={SECTION_TITLE as React.CSSProperties}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: "#FAF5FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Bell size={17} color="#9333EA" />
        </span>
        Préférences de notifications
      </p>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.6 }}>
        Choisissez les événements pour lesquels vous souhaitez recevoir un courriel de notification.
        Les notifications avec <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", background: "#E5E7EB", color: "#6B7280", fontSize: 9, fontWeight: 700, verticalAlign: "middle", margin: "0 2px" }}>?</span> sont obligatoires et ne peuvent pas être désactivées.
      </p>

      {NOTIF_GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 10px" }}>
            {group.label}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {group.items.map(item => (
              <div
                key={item.key}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 16, padding: "11px 14px", borderRadius: 9,
                  background: "#FAFAFA",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>{item.label}</p>
                  {item.locked && (
                    <InfoTip
                      id={item.key}
                      active={tooltip === item.key}
                      onEnter={() => setTooltip(item.key)}
                      onLeave={() => setTooltip(null)}
                    />
                  )}
                </div>
                <NotifToggle
                  checked={notifs[item.key as NotifKey]}
                  locked={item.locked}
                  onChange={() =>
                    !item.locked && setNotifs(n => ({ ...n, [item.key]: !n[item.key as NotifKey] }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
        <button onClick={handleSave} disabled={saving} style={BTN_PRIMARY}>
          {saved ? "✓ Préférences sauvegardées" : saving ? "Sauvegarde…" : "Sauvegarder mes préférences"}
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function ParametresPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 48px 80px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px" }}>Paramètres</h1>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>Gérez les informations de votre compte, la sécurité et vos préférences.</p>
        </div>
        <BlocCompte         clientId={clientId} />
        <BlocSecurite       clientId={clientId} />
        <BlocUtilisateurs   clientId={clientId} />
        <BlocNotifications  clientId={clientId} />
      </div>
    </div>
  );
}
