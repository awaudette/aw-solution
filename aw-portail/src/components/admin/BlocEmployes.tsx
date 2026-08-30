"use client";

/**
 * BlocEmployes.tsx
 *
 * Gestion des comptes employé du portail admin — miroir de BlocUtilisateurs/
 * InviteForm côté portail client (src/app/client/[clientId]/parametres/page.tsx),
 * mais pour users/{uid}.role === "employe" plutôt que
 * clients/{clientId}/users/{uid}.
 *
 * Étape 1 seulement : structure + écran d'invitation. Aucune section n'est
 * encore réellement filtrée nulle part (AdminSidebar, routes API) sur la
 * base de ces permissions — voir config/adminSections.ts.
 */

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, Plus, Pencil, Trash2, UserCog } from "lucide-react";
import {
  ADMIN_PORTAL_SECTIONS, DEFAULT_ADMIN_PERMISSIONS,
  type AdminSectionKey, type AdminPermission, type AdminPermissions,
} from "@/config/adminSections";

// ─── Styles (repris du même vocabulaire visuel que parametres/page.tsx côté client) ──
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

interface EmployeDoc {
  id: string;
  nom: string;
  courriel: string;
  statut: "actif" | "invitation_en_attente" | "revoque";
  permissions: AdminPermissions;
}

function permissionSummary(perms: AdminPermissions): string {
  const entries = Object.entries(perms) as [AdminSectionKey, AdminPermission][];
  const active = entries.filter(([, v]) => v !== null);
  if (active.length === 0) return "Aucune section";
  const hasEcriture = active.some(([, v]) => v === "ecriture");
  const level = hasEcriture ? "lecture et écriture" : "lecture seulement";
  return `${active.length} section${active.length > 1 ? "s" : ""} — ${level}`;
}

function SectionPermRow({
  label, value, onChange,
}: {
  label: string;
  value: AdminPermission;
  onChange: (v: AdminPermission) => void;
}) {
  const isEnabled = value !== null;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "9px 0", gap: 14,
      borderBottom: "1px solid #F3F4F6",
    }}>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1, minWidth: 0 }}>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={e => onChange(e.target.checked ? "lecture" : null)}
          style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#0362E3", flexShrink: 0 }}
        />
        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>{label}</span>
      </label>

      {isEnabled ? (
        <select
          value={value ?? ""}
          onChange={e => onChange(e.target.value as AdminPermission)}
          style={SELECT_STYLE}
        >
          <option value="lecture">Lecture</option>
          <option value="ecriture">Lecture et écriture</option>
        </select>
      ) : (
        <span style={{ fontSize: 12, color: "#D1D5DB", flexShrink: 0 }}>Aucun accès</span>
      )}
    </div>
  );
}

function InviteEmployeForm({
  initial, userId, onDone,
}: {
  initial?: EmployeDoc;
  userId?: string;
  onDone: () => void;
}) {
  const [nom,      setNom]      = useState(initial?.nom ?? "");
  const [courriel, setCourriel] = useState(initial?.courriel ?? "");
  const [perms,    setPerms]    = useState<AdminPermissions>(initial?.permissions ?? { ...DEFAULT_ADMIN_PERMISSIONS });
  const [sending,  setSending]  = useState(false);
  const [errors,   setErrors]   = useState<string[]>([]);
  const isEdit = !!userId;

  function setPermission(key: AdminSectionKey, val: AdminPermission) {
    setPerms(p => ({ ...p, [key]: val }));
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!isEdit) {
      if (!nom.trim()) errs.push("Le nom complet est requis.");
      if (!courriel.trim() || !courriel.includes("@")) errs.push("Un courriel valide est requis.");
    }
    return errs;
  }

  async function handleSubmit() {
    setErrors([]);
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }

    setSending(true);
    try {
      if (isEdit) {
        const res = await fetch("/api/admin/staff/invite", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, permissions: perms }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Erreur lors de la mise à jour.");
        }
      } else {
        const res = await fetch("/api/admin/staff/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom, courriel, permissions: perms }),
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
        {isEdit ? "Modifier les permissions" : "Inviter un employé"}
      </p>

      {!isEdit && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div>
            <label style={LABEL}>Nom complet *</label>
            <input style={{ ...INPUT, borderColor: errors.some(e => e.includes("nom")) ? "#EF4444" : "#E5E7EB" }} value={nom} onChange={e => setNom(e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Courriel *</label>
            <input style={{ ...INPUT, borderColor: errors.some(e => e.includes("courriel")) ? "#EF4444" : "#E5E7EB" }} type="email" value={courriel} onChange={e => setCourriel(e.target.value)} />
          </div>
        </div>
      )}

      <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Accès aux sections
      </p>
      <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 12px" }}>
        Cochez les sections auxquelles cet employé a accès, puis choisissez le niveau.
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {ADMIN_PORTAL_SECTIONS.map(section => (
          <SectionPermRow
            key={section.key}
            label={section.label}
            value={perms[section.key]}
            onChange={val => setPermission(section.key, val)}
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

const STATUT_STYLE: Record<EmployeDoc["statut"], { label: string; bg: string; color: string; border: string }> = {
  actif:                 { label: "Actif",                 bg: "#F0FDF4", color: "#166534", border: "#BBF7D0" },
  invitation_en_attente: { label: "Invitation en attente",  bg: "#FFFBEB", color: "#92400E", border: "#FDE68A" },
  revoque:               { label: "Révoqué",                bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB" },
};

export function BlocEmployes() {
  const [employes, setEmployes] = useState<EmployeDoc[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<EmployeDoc | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "employe"));
    return onSnapshot(q, snap => {
      setEmployes(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeDoc)));
    });
  }, []);

  async function handleRevoke(u: EmployeDoc) {
    if (!confirm(`Révoquer l'accès de ${u.nom} ?`)) return;
    setRevoking(u.id);
    try {
      await fetch("/api/admin/staff/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id }),
      });
    } finally { setRevoking(null); }
  }

  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <p style={{ ...SECTION_TITLE }}>
          <span style={{ width: 34, height: 34, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserCog size={17} color="#0362E3" />
          </span>
          Employés
        </p>
        {!showForm && !editUser && (
          <button
            onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, ...BTN_PRIMARY, padding: "9px 16px" }}
          >
            <Plus size={13} /> Inviter un employé
          </button>
        )}
      </div>

      {(showForm && !editUser) && (
        <InviteEmployeForm onDone={() => setShowForm(false)} />
      )}
      {editUser && (
        <InviteEmployeForm
          initial={editUser}
          userId={editUser.id}
          onDone={() => setEditUser(null)}
        />
      )}

      {employes.length === 0 && !showForm && !editUser ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF", fontSize: 13 }}>
          Aucun employé invité pour l'instant.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {employes.map(u => {
            const s = STATUT_STYLE[u.statut] ?? STATUT_STYLE.actif;
            return (
              <div key={u.id} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 18px", background: "#FAFAFA",
                border: "1px solid #F3F4F6", borderRadius: 12,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={17} color="#0362E3" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>{u.nom}</p>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                    }}>
                      {s.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
                    {u.courriel} · {permissionSummary(u.permissions ?? DEFAULT_ADMIN_PERMISSIONS)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setEditUser(u)}
                    disabled={u.statut === "revoque"}
                    style={{ display: "flex", alignItems: "center", gap: 4, ...BTN_GHOST, padding: "7px 12px", fontSize: 12, opacity: u.statut === "revoque" ? 0.5 : 1 }}
                  >
                    <Pencil size={12} /> Modifier
                  </button>
                  {u.statut !== "revoque" && (
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
