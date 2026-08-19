"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection, onSnapshot, addDoc, deleteDoc, doc,
  getDoc, setDoc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Plus, Trash2, FileText, Video, Image, Link as LinkIcon,
  GripVertical, Pencil, Check, X, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocItem {
  id: string;
  titre: string;
  description: string;
  categorie: string;
  categorieLabel: string;
  sousSection: string;
  sousSectionLabel: string;
  type: string;
  url: string;
  prestige: boolean;
  postLancement: boolean;
  publishedAt: Date;
}

interface CustomSub      { id: string; nom: string }
interface CustomCategory { id: string; nom: string; soussections: CustomSub[] }

interface FaqQuestion {
  id: string; question: string; reponse: string;
  ordre: number; active: boolean;
}

// ─── Catégories statiques ──────────────────────────────────────────────────────

const STATIC_SECTIONS = [
  {
    id: "demarrage", label: "Démarrage",
    soussections: [
      { id: "tour",     label: "Tour de l'application" },
      { id: "script",   label: "Script de lancement au comptoir" },
      { id: "materiel", label: "Matériel de lancement" },
    ],
  },
  {
    id: "guides", label: "Guides d'utilisation",
    soussections: [
      { id: "validation_facture", label: "Validation de facture" },
      { id: "tableau_bord",       label: "Tableau de bord admin" },
      { id: "centre_controle",    label: "Centre de contrôle et alertes" },
      { id: "tableau_analytique", label: "Lecture du tableau analytique" },
    ],
  },
  { id: "videos", label: "Vidéos tutorielles", soussections: [] },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "1px solid #E5E7EB", fontSize: 13, color: "#1F2937",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};
const LABEL_S: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#6B7280",
  textTransform: "uppercase", letterSpacing: "0.05em",
  display: "block", marginBottom: 5,
};
const BTN_BLUE: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 18px", borderRadius: 9, border: "none",
  background: "#0362E3", color: "#fff", fontSize: 13,
  fontWeight: 600, cursor: "pointer",
};
const BTN_GHOST: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "8px 14px", borderRadius: 8,
  border: "1px solid #E5E7EB", background: "#F9FAFB",
  color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectType(file: File): string {
  const m = file.type;
  if (m.startsWith("video/"))     return "video";
  if (m === "application/pdf")    return "pdf";
  if (m.startsWith("image/"))     return "image";
  return "fichier";
}

function typeIcon(type: string) {
  if (type === "video") return <Video    size={13} color="#7C3AED" />;
  if (type === "pdf")   return <FileText size={13} color="#DC2626" />;
  if (type === "image") return <Image    size={13} color="#0891B2" />;
  if (type === "lien")  return <LinkIcon size={13} color="#0362E3" />;
  return <FileText size={13} color="#6B7280" />;
}

function typeLabel(type: string): string {
  if (type === "video")  return "Vidéo";
  if (type === "pdf")    return "PDF";
  if (type === "image")  return "Image";
  if (type === "lien")   return "Lien";
  return "Fichier";
}

// ─── Formulaire d'ajout ────────────────────────────────────────────────────────

interface FormState {
  titre: string; description: string;
  section: string; autreSection: string;
  sousSection: string; autreSousSection: string;
  lien: string; prestige: boolean; postLancement: boolean;
}
const EMPTY: FormState = {
  titre: "", description: "",
  section: "", autreSection: "",
  sousSection: "", autreSousSection: "",
  lien: "", prestige: false, postLancement: false,
};

function DocAddForm({
  clientId, clientNom, customCats, onDone, onStructureChange,
}: {
  clientId: string; clientNom: string;
  customCats: CustomCategory[];
  onDone: () => void;
  onStructureChange: () => void;
}) {
  const [form,   setForm]   = useState<FormState>({ ...EMPTY });
  const [file,   setFile]   = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const allSections = [
    ...STATIC_SECTIONS,
    ...customCats.map(c => ({
      id: c.id, label: c.nom,
      soussections: c.soussections.map(s => ({ id: s.id, label: s.nom })),
    })),
  ];

  const selectedSection    = allSections.find(s => s.id === form.section);
  const isNouvelleSection  = form.section === "__autre__";
  // Afficher le dropdown sous-section seulement si section existante avec sous-sections
  const hasSousSections    = !isNouvelleSection && !!selectedSection && selectedSection.soussections.length > 0;

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function onSectionChange(val: string) {
    setForm(f => ({ ...f, section: val, autreSection: "", autreSousSection: "", sousSection: "" }));
  }

  async function handleSubmit() {
    if (!form.titre.trim())   { setErr("Le titre est requis.");    return; }
    if (!form.section)        { setErr("La section est requise."); return; }
    if (!file && !form.lien.trim()) {
      setErr("Veuillez uploader un fichier ou fournir un lien externe.");
      return;
    }
    if (isNouvelleSection) {
      if (!form.autreSection.trim())     { setErr("Le nom de la nouvelle section est requis."); return; }
      if (!form.autreSousSection.trim()) { setErr("Le nom de la sous-section est requis.");    return; }
    }

    setSaving(true); setErr("");
    try {
      let catId    = form.section;
      let catLabel = selectedSection?.label ?? "";

      // ── Nouvelle section ──────────────────────────────────────────────────
      if (isNouvelleSection) {
        catId    = `custom_${Date.now()}`;
        catLabel = form.autreSection.trim();
        const snap     = await getDoc(doc(db, "admin_config", "documentation_structure"));
        const existing: CustomCategory[] = snap.exists() ? (snap.data()?.categories ?? []) : [];
        await setDoc(doc(db, "admin_config", "documentation_structure"), {
          categories: [...existing, { id: catId, nom: catLabel, soussections: [] }],
        });
        onStructureChange();
      }

      // ── Sous-section ───────────────────────────────────────────────────────
      let ssId    = "";
      let ssLabel = "";

      if (isNouvelleSection) {
        // Nouvelle section → nouvelle sous-section obligatoire
        ssId    = `custom_${Date.now() + 1}`;
        ssLabel = form.autreSousSection.trim();
        const snap     = await getDoc(doc(db, "admin_config", "documentation_structure"));
        const existing: CustomCategory[] = snap.exists() ? (snap.data()?.categories ?? []) : [];
        const updated  = existing.map(c => c.id === catId
          ? { ...c, soussections: [...(c.soussections ?? []), { id: ssId, nom: ssLabel }] }
          : c
        );
        await setDoc(doc(db, "admin_config", "documentation_structure"), { categories: updated });
        onStructureChange();

      } else if (form.sousSection === "__autre__") {
        if (!form.autreSousSection.trim()) { setErr("Nommez la nouvelle sous-section."); setSaving(false); return; }
        ssId    = `custom_${Date.now()}`;
        ssLabel = form.autreSousSection.trim();
        const snap     = await getDoc(doc(db, "admin_config", "documentation_structure"));
        const existing: CustomCategory[] = snap.exists() ? (snap.data()?.categories ?? []) : [];
        const isStatic = STATIC_SECTIONS.find(s => s.id === catId);
        if (isStatic) {
          const found   = existing.find(c => c.id === catId);
          const updated = found
            ? existing.map(c => c.id === catId ? { ...c, soussections: [...c.soussections, { id: ssId, nom: ssLabel }] } : c)
            : [...existing, { id: catId, nom: catLabel, soussections: [{ id: ssId, nom: ssLabel }] }];
          await setDoc(doc(db, "admin_config", "documentation_structure"), { categories: updated });
        } else {
          const updated = existing.map(c => c.id === catId
            ? { ...c, soussections: [...(c.soussections ?? []), { id: ssId, nom: ssLabel }] }
            : c
          );
          await setDoc(doc(db, "admin_config", "documentation_structure"), { categories: updated });
        }
        onStructureChange();

      } else if (form.sousSection) {
        ssId    = form.sousSection;
        ssLabel = selectedSection?.soussections.find(s => s.id === ssId)?.label
          ?? customCats.flatMap(c => c.soussections).find(s => s.id === ssId)?.nom
          ?? ssId;
      }

      // ── URL finale : lien prioritaire sur fichier ─────────────────────────
      let url          = form.lien.trim();
      let detectedType = "lien";

      if (!url && file) {
        const folder = `clients/${clientId}/documentation/${catId}`;
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Erreur lors de l'upload.");
        const data = await res.json();
        url          = data.url;
        detectedType = detectType(file);
      }

      const now            = Timestamp.now();
      const nouveauJusquau = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      await addDoc(collection(db, "clients", clientId, "documentation"), {
        titre: form.titre.trim(), description: form.description.trim(),
        categorie: catId, categorieLabel: catLabel,
        sousSection: ssId, sousSectionLabel: ssLabel,
        type: detectedType, url,
        prestige: form.prestige, postLancement: form.postLancement,
        publishedAt: now, nouveauJusquau,
      });

      await fetch("/api/admin/documentation/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, titre: form.titre.trim(), clientNom }),
      });

      onDone();
    } catch (e: unknown) {
      setErr((e as Error).message ?? "Erreur");
    } finally { setSaving(false); }
  }

  return (
    <div style={{
      background: "#F9FAFB", border: "1px dashed #D1D5DB",
      borderRadius: 14, padding: "22px 24px", marginBottom: 20,
    }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: "0 0 18px" }}>
        Ajouter un document
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Titre */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={LABEL_S}>Titre *</label>
          <input style={INPUT} value={form.titre} onChange={e => set("titre", e.target.value)} />
        </div>

        {/* Description */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={LABEL_S}>Description</label>
          <textarea style={{ ...INPUT, resize: "vertical", minHeight: 60 }} value={form.description} onChange={e => set("description", e.target.value)} />
        </div>

        {/* Section */}
        <div>
          <label style={LABEL_S}>Section *</label>
          <select style={INPUT} value={form.section} onChange={e => onSectionChange(e.target.value)}>
            <option value="">— Choisir une section —</option>
            {allSections.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            <option value="__autre__">+ Créer une nouvelle section</option>
          </select>
          {/* Nouvelle section : nom de la section */}
          {isNouvelleSection && (
            <input
              style={{ ...INPUT, marginTop: 8, borderColor: "#0362E3" }}
              placeholder="Nom de la nouvelle section *"
              value={form.autreSection}
              onChange={e => set("autreSection", e.target.value)}
            />
          )}
        </div>

        {/* Sous-section — nouvelle section : champ texte obligatoire */}
        {isNouvelleSection && (
          <div>
            <label style={LABEL_S}>Sous-section *</label>
            <input
              style={{ ...INPUT, borderColor: "#0362E3" }}
              placeholder="Nom de la sous-section *"
              value={form.autreSousSection}
              onChange={e => set("autreSousSection", e.target.value)}
            />
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: "5px 0 0" }}>
              Une nouvelle section doit avoir au moins une sous-section.
            </p>
          </div>
        )}

        {/* Sous-section — section existante avec sous-sections */}
        {hasSousSections && (
          <div>
            <label style={LABEL_S}>Sous-section</label>
            <select style={INPUT} value={form.sousSection} onChange={e => setForm(f => ({ ...f, sousSection: e.target.value, autreSousSection: "" }))}>
              <option value="">— Aucune —</option>
              {selectedSection?.soussections.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
              {customCats.find(c => c.id === form.section)?.soussections.map(s => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
              <option value="__autre__">+ Créer une nouvelle sous-section</option>
            </select>
            {form.sousSection === "__autre__" && (
              <input
                style={{ ...INPUT, marginTop: 6, borderColor: "#0362E3" }}
                placeholder="Nom de la nouvelle sous-section *"
                value={form.autreSousSection}
                onChange={e => set("autreSousSection", e.target.value)}
              />
            )}
          </div>
        )}

        {/* Upload fichier — tous types */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={LABEL_S}>Fichier (tous types acceptés)</label>
          <input type="file" accept="*/*" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ fontSize: 13, color: "#374151", cursor: "pointer" }} />
          {file && (
            <p style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
              Sélectionné : <strong>{file.name}</strong> ({(file.size / 1024).toFixed(0)} Ko — {typeLabel(detectType(file))})
            </p>
          )}
        </div>

        {/* Lien externe optionnel */}
        <div style={{ gridColumn: "1/-1" }}>
          <label style={LABEL_S}>Lien externe (optionnel — prioritaire sur le fichier si renseigné)</label>
          <input style={INPUT} type="url" placeholder="https://…" value={form.lien} onChange={e => set("lien", e.target.value)} />
        </div>

        {/* Toggles */}
        <div style={{ gridColumn: "1/-1", display: "flex", gap: 28 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
            <input type="checkbox" checked={form.prestige} onChange={e => set("prestige", e.target.checked)} style={{ accentColor: "#9333EA", width: 15, height: 15 }} />
            Prestige seulement
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
            <input type="checkbox" checked={form.postLancement} onChange={e => set("postLancement", e.target.checked)} style={{ accentColor: "#0362E3", width: 15, height: 15 }} />
            Disponible après lancement seulement
          </label>
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", fontSize: 13, color: "#DC2626" }}>
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button onClick={handleSubmit} disabled={saving} style={BTN_BLUE}>
          {saving ? "Envoi en cours…" : "Ajouter le document"}
        </button>
        <button onClick={onDone} style={BTN_GHOST}>Annuler</button>
      </div>
    </div>
  );
}

// ─── Ligne de document ────────────────────────────────────────────────────────

function DocRow({ item, clientId }: { item: DocItem; clientId: string }) {
  const [del, setDel] = useState(false);
  async function handleDelete() {
    if (!confirm(`Supprimer "${item.titre}" ?`)) return;
    setDel(true);
    await deleteDoc(doc(db, "clients", clientId, "documentation", item.id));
    setDel(false);
  }
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 14px", background: "#fff",
      border: "1px solid #F3F4F6", borderRadius: 10, marginBottom: 6,
    }}>
      <span style={{ flexShrink: 0 }}>{typeIcon(item.type)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.titre}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>
            {item.publishedAt.toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" })}
          </span>
          {item.sousSectionLabel && (
            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "#F3F4F6", color: "#6B7280", fontWeight: 600 }}>
              {item.sousSectionLabel}
            </span>
          )}
          <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "#F3F4F6", color: "#6B7280", fontWeight: 600 }}>
            {typeLabel(item.type)}
          </span>
          {item.prestige && (
            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "#FAF5FF", color: "#9333EA", fontWeight: 600 }}>Prestige</span>
          )}
          {item.postLancement && (
            <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "#FFF7ED", color: "#C2410C", fontWeight: 600 }}>Post-lancement</span>
          )}
        </div>
      </div>
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: "#0362E3", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}>
          Voir →
        </a>
      )}
      <button onClick={handleDelete} disabled={del}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4, flexShrink: 0 }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Vue groupée (sections fermables, ouvertes par défaut) ────────────────────

function DocsView({ docs, clientId, customCats }: {
  docs: DocItem[]; clientId: string; customCats: CustomCategory[];
}) {
  // undefined = pas encore interagi → ouvert par défaut; false = fermé
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const allSections = [
    ...STATIC_SECTIONS.map(s => ({ id: s.id, label: s.label })),
    ...customCats.map(c => ({ id: c.id, label: c.nom })),
  ];

  const activeSections = allSections.filter(s => docs.some(d => d.categorie === s.id));
  const isOpen = (id: string) => open[id] !== false; // undefined → true (ouvert)

  if (docs.length === 0) {
    return <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic", padding: "8px 0" }}>Aucun document déposé pour ce client.</p>;
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {activeSections.map(section => {
        const sectionDocs = docs.filter(d => d.categorie === section.id);
        const sOpen = isOpen(section.id);
        return (
          <div key={section.id} style={{ marginBottom: 8, border: "1px solid #F3F4F6", borderRadius: 12, overflow: "hidden" }}>
            {/* En-tête cliquable */}
            <button
              onClick={() => setOpen(o => ({ ...o, [section.id]: !sOpen }))}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", background: "#FAFAFA", border: "none", cursor: "pointer", textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{section.label}</span>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                  {sectionDocs.length} document{sectionDocs.length !== 1 ? "s" : ""}
                </span>
              </div>
              {sOpen ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
            </button>
            {/* Contenu */}
            {sOpen && (
              <div style={{ padding: "12px 16px" }}>
                {sectionDocs.map(d => <DocRow key={d.id} item={d} clientId={clientId} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── FAQ Management ────────────────────────────────────────────────────────────

const EMPTY_FAQ_FORM = { question: "", reponse: "", active: true };

function FaqSection() {
  const [questions, setQuestions] = useState<FaqQuestion[]>([]);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [form,      setForm]      = useState({ ...EMPTY_FAQ_FORM });
  const [saving,    setSaving]    = useState(false);
  const [expanded,  setExpanded]  = useState<Record<string, boolean>>({});
  const [listOpen,  setListOpen]  = useState(true); // FAQ fermable, ouvert par défaut
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/faq/seed", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    return onSnapshot(doc(db, "admin_config", "faq"), snap => {
      if (!snap.exists()) { setQuestions([]); return; }
      const list: FaqQuestion[] = (snap.data()?.questions ?? [])
        .sort((a: FaqQuestion, b: FaqQuestion) => (a.ordre ?? 0) - (b.ordre ?? 0));
      setQuestions(list);
    });
  }, []);

  async function save(list: FaqQuestion[]) {
    const reordered = list.map((q, i) => ({ ...q, ordre: i }));
    await setDoc(doc(db, "admin_config", "faq"), { initialized: true, questions: reordered });
  }

  async function handleSave() {
    if (!form.question.trim() || !form.reponse.trim()) return;
    setSaving(true);
    try {
      const q: FaqQuestion = {
        id:       editId ?? `faq_${Date.now()}`,
        question: form.question.trim(),
        reponse:  form.reponse.trim(),
        active:   form.active,
        ordre:    editId ? (questions.find(q => q.id === editId)?.ordre ?? questions.length) : questions.length,
      };
      const updated = editId ? questions.map(item => item.id === editId ? q : item) : [...questions, q];
      await save(updated);
      setForm({ ...EMPTY_FAQ_FORM });
      setShowForm(false); setEditId(null);
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette question ?")) return;
    await save(questions.filter(q => q.id !== id));
  }

  async function toggleActive(q: FaqQuestion) {
    await save(questions.map(item => item.id === q.id ? { ...item, active: !item.active } : item));
  }

  function startEdit(q: FaqQuestion) {
    setEditId(q.id);
    setForm({ question: q.question, reponse: q.reponse, active: q.active });
    setShowForm(true); setListOpen(true);
    setExpanded(e => ({ ...e, [q.id]: false }));
  }

  function handleDragStart(id: string) { dragId.current = id; }
  async function handleDrop(targetId: string) {
    if (!dragId.current || dragId.current === targetId) return;
    const from = questions.findIndex(q => q.id === dragId.current);
    const to   = questions.findIndex(q => q.id === targetId);
    const reordered = [...questions];
    const [removed] = reordered.splice(from, 1);
    reordered.splice(to, 0, removed);
    await save(reordered);
    dragId.current = null;
  }

  const activeCount = questions.filter(q => q.active).length;

  return (
    <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 16, marginTop: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: listOpen ? 14 : 0 }}>
        {/* En-tête fermable */}
        <button
          onClick={() => setListOpen(o => !o)}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "#FAFAFA", border: "1px solid #F3F4F6", borderRadius: 10,
            padding: "12px 16px", cursor: "pointer", textAlign: "left",
          }}
        >
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 2 }}>
              FAQ — Questions fréquentes
            </span>
            <span style={{ fontSize: 11, color: "#9CA3AF" }}>
              Globale · {activeCount} question{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""}
            </span>
          </div>
          {listOpen ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
        </button>
        {!showForm && (
          <button
            onClick={() => { setEditId(null); setForm({ ...EMPTY_FAQ_FORM }); setShowForm(true); setListOpen(true); }}
            style={{ ...BTN_BLUE, flexShrink: 0 }}
          >
            <Plus size={12} /> Ajouter une question
          </button>
        )}
      </div>

      {listOpen && (
        <>
          {showForm && (
            <div style={{ background: "#F9FAFB", border: "1px dashed #D1D5DB", borderRadius: 12, padding: "18px 20px", marginBottom: 14 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL_S}>Question *</label>
                <input style={INPUT} value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL_S}>Réponse *</label>
                <textarea style={{ ...INPUT, minHeight: 90, resize: "vertical" }} value={form.reponse} onChange={e => setForm(f => ({ ...f, reponse: e.target.value }))} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151", marginBottom: 14 }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={{ accentColor: "#0362E3" }} />
                Active — visible par les clients
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleSave} disabled={saving} style={BTN_BLUE}>
                  {saving ? "Sauvegarde…" : editId ? "Mettre à jour" : "Ajouter"}
                </button>
                <button onClick={() => { setShowForm(false); setEditId(null); setForm({ ...EMPTY_FAQ_FORM }); }} style={BTN_GHOST}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {questions.length === 0 && !showForm ? (
            <p style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>Chargement des questions…</p>
          ) : (
            <div>
              {questions.map((q, idx) => {
                const isQOpen = expanded[q.id] ?? false;
                return (
                  <div
                    key={q.id}
                    draggable
                    onDragStart={() => handleDragStart(q.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(q.id)}
                    style={{
                      marginBottom: 6, border: "1px solid #F3F4F6", borderRadius: 10,
                      background: q.active ? "#fff" : "#F9FAFB",
                      opacity: q.active ? 1 : 0.55,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px" }}>
                      <span style={{ color: "#D1D5DB", cursor: "grab", flexShrink: 0 }}><GripVertical size={14} /></span>
                      <span style={{
                        minWidth: 22, height: 22, borderRadius: "50%", background: "#F3F4F6",
                        fontSize: 10, fontWeight: 700, color: "#9CA3AF",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {idx + 1}
                      </span>
                      <p
                        style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: 0, flex: 1, cursor: "pointer" }}
                        onClick={() => setExpanded(e => ({ ...e, [q.id]: !isQOpen }))}
                      >
                        {q.question}
                      </p>
                      {!q.active && (
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#F3F4F6", color: "#9CA3AF", fontWeight: 600, flexShrink: 0 }}>Inactive</span>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                        <button onClick={() => setExpanded(e => ({ ...e, [q.id]: !isQOpen }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}>
                          <ChevronDown size={14} style={{ transform: isQOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                        </button>
                        <button onClick={() => toggleActive(q)} title={q.active ? "Désactiver" : "Activer"} style={{ background: "none", border: "none", cursor: "pointer", color: q.active ? "#22C55E" : "#9CA3AF", padding: 4 }}>
                          {q.active ? <Check size={13} /> : <X size={13} />}
                        </button>
                        <button onClick={() => startEdit(q)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 4 }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(q.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: 4 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    {isQOpen && (
                      <div style={{ padding: "0 14px 14px 50px" }}>
                        <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.65 }}>{q.reponse}</p>
                      </div>
                    )}
                  </div>
                );
              })}
              <p style={{ fontSize: 11, color: "#D1D5DB", marginTop: 8 }}>
                Glissez-déposez pour réorganiser · Les questions inactives ne sont pas visibles côté client
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export function AdminDocumentationTab({
  clientId, clientNom, clientCourriel,
}: {
  clientId: string; clientNom: string; clientCourriel: string;
}) {
  const [docs,       setDocs]       = useState<DocItem[]>([]);
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);
  const [showForm,   setShowForm]   = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, "clients", clientId, "documentation"), snap => {
      setDocs(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          titre:            data.titre ?? "",
          description:      data.description ?? "",
          categorie:        data.categorie ?? "",
          categorieLabel:   data.categorieLabel ?? "",
          sousSection:      data.sousSection ?? "",
          sousSectionLabel: data.sousSectionLabel ?? "",
          type:             data.type ?? "fichier",
          url:              data.url ?? "",
          prestige:         data.prestige ?? false,
          postLancement:    data.postLancement ?? false,
          publishedAt:      data.publishedAt instanceof Timestamp ? data.publishedAt.toDate() : new Date(),
        };
      }));
    });
  }, [clientId]);

  function loadStructure() {
    getDoc(doc(db, "admin_config", "documentation_structure")).then(snap => {
      setCustomCats(snap.exists() ? (snap.data()?.categories ?? []) : []);
    });
  }

  useEffect(() => { loadStructure(); }, []);

  return (
    <div>
      <div style={{
        background: "#fff", border: "1px solid #F3F4F6",
        borderRadius: 14, padding: "24px 28px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showForm ? 16 : 20 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: "0 0 2px" }}>Documents & ressources</p>
            <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
              {docs.length} document{docs.length !== 1 ? "s" : ""} déposé{docs.length !== 1 ? "s" : ""}
            </p>
          </div>
          {!showForm && (
            <button onClick={() => setShowForm(true)} style={BTN_BLUE}>
              <Plus size={13} /> Ajouter un document
            </button>
          )}
        </div>

        {showForm && (
          <DocAddForm
            clientId={clientId}
            clientNom={clientNom}
            customCats={customCats}
            onStructureChange={loadStructure}
            onDone={() => setShowForm(false)}
          />
        )}

        <DocsView docs={docs} clientId={clientId} customCats={customCats} />
        <FaqSection />
      </div>
    </div>
  );
}
