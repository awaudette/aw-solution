"use client";

import { useEffect, useState, useRef } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
  getDocs, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Plus, X, Send, Trash2, Sparkles, RefreshCw,
  Users, Globe, Paperclip, FileText, Image,
} from "lucide-react";

interface Nouveaute {
  id: string;
  titre: string;
  contenu: string;
  type: "nouveaute" | "mise_a_jour";
  destinataires: "tous" | string[];
  date: Date;
  publie: boolean;
  fichierUrl: string | null;
  fichierNom: string | null;
  fichierType: string | null;
}

interface ClientOption { id: string; nom: string; }

function formatDate(d: Date) {
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
}

const LABEL: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600, color: "#9CA3AF",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
};
const INPUT: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 9,
  border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

function TypeBadge({ type }: { type: "nouveaute" | "mise_a_jour" }) {
  return type === "nouveaute" ? (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      background: "#FDF4FF", color: "#9333EA", border: "1px solid #E9D5FF",
    }}>Nouveauté</span>
  ) : (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE",
    }}>Mise à jour</span>
  );
}

export default function AdminNouveautesPage() {
  const [items,       setItems]       = useState<Nouveaute[]>([]);
  const [clients,     setClients]     = useState<ClientOption[]>([]);
  const [showForm,    setShowForm]    = useState(false);
  const [loading,     setLoading]     = useState(true);

  // Champs du formulaire
  const [titre,       setTitre]       = useState("");
  const [contenu,     setContenu]     = useState("");
  const [type,        setType]        = useState<"nouveaute" | "mise_a_jour">("nouveaute");
  const [destMode,    setDestMode]    = useState<"tous" | "choix">("tous");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [publishing,  setPublishing]  = useState(false);

  // Fichier joint
  const [fichier,         setFichier]         = useState<File | null>(null);
  const [uploadProgress,  setUploadProgress]  = useState<"idle" | "uploading" | "done" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, "nouveautes"), orderBy("date", "desc"));
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({
        id: d.id,
        titre: d.data().titre,
        contenu: d.data().contenu,
        type: d.data().type,
        destinataires: d.data().destinataires,
        date: d.data().date instanceof Timestamp ? d.data().date.toDate() : new Date(),
        publie: d.data().publie,
        fichierUrl:  d.data().fichierUrl  ?? null,
        fichierNom:  d.data().fichierNom  ?? null,
        fichierType: d.data().fichierType ?? null,
      })));
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    getDocs(collection(db, "clients")).then(snap => {
      setClients(snap.docs.map(d => ({ id: d.id, nom: d.data().nom ?? d.id })));
    });
  }, []);

  function toggleClient(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function resetForm() {
    setTitre(""); setContenu(""); setType("nouveaute");
    setDestMode("tous"); setSelectedIds([]);
    setFichier(null); setUploadProgress("idle");
    if (fileRef.current) fileRef.current.value = "";
    setShowForm(false);
  }

  async function uploadFichier(): Promise<{ url: string; nom: string; type: string } | null> {
    if (!fichier) return null;
    setUploadProgress("uploading");
    const form = new FormData();
    form.append("file", fichier);
    form.append("folder", "nouveautes");
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    if (!res.ok) { setUploadProgress("error"); return null; }
    const data = await res.json();
    setUploadProgress("done");
    return { url: data.url, nom: data.nom, type: data.type };
  }

  async function handlePublish() {
    if (!titre.trim() || !contenu.trim() || publishing) return;
    if (destMode === "choix" && selectedIds.length === 0) return;
    setPublishing(true);
    try {
      const fileData = await uploadFichier();
      const now = Timestamp.now();
      const titreVal = titre.trim();
      const typeLabel = type === "nouveaute" ? "Nouveauté disponible" : "Mise à jour disponible";

      // 1. Créer la publication
      await addDoc(collection(db, "nouveautes"), {
        titre: titreVal,
        contenu: contenu.trim(),
        type,
        destinataires: destMode === "tous" ? "tous" : selectedIds,
        date: now,
        publie: true,
        fichierUrl:  fileData?.url  ?? null,
        fichierNom:  fileData?.nom  ?? null,
        fichierType: fileData?.type ?? null,
      });

      // 2. Envoyer un message à chaque client ciblé
      const ciblesIds = destMode === "tous"
        ? clients.map(c => c.id)
        : selectedIds;

      await Promise.all(
        ciblesIds.map(cId =>
          addDoc(collection(db, "clients", cId, "messages"), {
            texte: `${typeLabel} : ${titreVal}`,
            auteur: "AW Solution",
            auteurRole: "admin",
            date: now,
            lu: false,
            lien: "nouveautes",
            typeMsg: type,
          })
        )
      );

      resetForm();
    } finally { setPublishing(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette publication ?")) return;
    await deleteDoc(doc(db, "nouveautes", id));
  }

  async function handleTogglePublie(item: Nouveaute) {
    await updateDoc(doc(db, "nouveautes", item.id), { publie: !item.publie });
  }

  const canPublish = titre.trim() && contenu.trim() &&
    (destMode === "tous" || selectedIds.length > 0) &&
    uploadProgress !== "uploading";

  const isImage = fichier?.type.startsWith("image/");

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6F9", padding: "32px 48px 80px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 24,
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px" }}>
              Mises à jour & Nouveautés
            </h1>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}>
              Publiez des nouveautés ou des mises à jour pour vos clients
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 18px", borderRadius: 10, border: "none",
                background: "#0362E3", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Plus size={14} /> Nouvelle publication
            </button>
          )}
        </div>

        {/* Formulaire */}
        {showForm && (
          <div style={{
            background: "#fff", border: "1px solid #E5E7EB",
            borderRadius: 16, padding: "22px 24px", marginBottom: 20,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 18,
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0A0A0A", margin: 0 }}>
                Nouvelle publication
              </p>
              <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={16} color="#9CA3AF" />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Type */}
              <div>
                <label style={LABEL}>Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {([
                    { key: "nouveaute",   label: "Nouveauté",   color: "#9333EA", bg: "#FDF4FF", border: "#E9D5FF" },
                    { key: "mise_a_jour", label: "Mise à jour", color: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
                  ] as const).map(t => (
                    <button
                      key={t.key}
                      onClick={() => setType(t.key)}
                      style={{
                        flex: 1, padding: "10px 16px", borderRadius: 10,
                        cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 150ms",
                        background: type === t.key ? t.bg : "#F9FAFB",
                        border: `1.5px solid ${type === t.key ? t.border : "#E5E7EB"}`,
                        color: type === t.key ? t.color : "#9CA3AF",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Titre */}
              <div>
                <label style={LABEL}>Titre</label>
                <input
                  type="text"
                  value={titre}
                  onChange={e => setTitre(e.target.value)}
                  placeholder="Ex : Nouvelle fonctionnalité calendrier"
                  style={INPUT}
                />
              </div>

              {/* Contenu */}
              <div>
                <label style={LABEL}>Description</label>
                <textarea
                  value={contenu}
                  onChange={e => setContenu(e.target.value)}
                  placeholder="Décrivez la nouveauté ou la mise à jour en détail…"
                  rows={4}
                  style={{ ...INPUT, resize: "vertical" }}
                />
              </div>

              {/* Fichier joint */}
              <div>
                <label style={LABEL}>Fichier joint (optionnel)</label>
                <div style={{
                  border: "1.5px dashed #E5E7EB", borderRadius: 10,
                  padding: "14px 18px", display: "flex", alignItems: "center",
                  gap: 12, cursor: "pointer", background: "#FAFAFA",
                  transition: "border-color 150ms",
                }}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) setFichier(f);
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    style={{ display: "none" }}
                    onChange={e => { if (e.target.files?.[0]) setFichier(e.target.files[0]); }}
                  />
                  {fichier ? (
                    <>
                      {isImage
                        ? <Image size={18} color="#9333EA" />
                        : <FileText size={18} color="#1D4ED8" />
                      }
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", margin: "0 0 2px" }}>
                          {fichier.name}
                        </p>
                        <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                          {(fichier.size / 1024).toFixed(0)} Ko
                        </p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setFichier(null); setUploadProgress("idle"); if (fileRef.current) fileRef.current.value = ""; }}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <X size={14} color="#9CA3AF" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Paperclip size={16} color="#9CA3AF" />
                      <div>
                        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 2px", fontWeight: 500 }}>
                          Glisser-déposer ou cliquer pour choisir
                        </p>
                        <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>
                          Images, PDF, Word, Excel — max 10 Mo
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {uploadProgress === "uploading" && (
                  <p style={{ fontSize: 12, color: "#0362E3", marginTop: 6 }}>Upload en cours…</p>
                )}
                {uploadProgress === "error" && (
                  <p style={{ fontSize: 12, color: "#DC2626", marginTop: 6 }}>Erreur lors de l'upload</p>
                )}
              </div>

              {/* Destinataires */}
              <div>
                <label style={LABEL}>Destinataires</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <button
                    onClick={() => setDestMode("tous")}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      flex: 1, padding: "9px 14px", borderRadius: 9, cursor: "pointer",
                      fontSize: 13, fontWeight: 600,
                      background: destMode === "tous" ? "#EFF6FF" : "#F9FAFB",
                      border: `1.5px solid ${destMode === "tous" ? "#BFDBFE" : "#E5E7EB"}`,
                      color: destMode === "tous" ? "#1D4ED8" : "#9CA3AF",
                    }}
                  >
                    <Globe size={13} /> Tous les clients
                  </button>
                  <button
                    onClick={() => setDestMode("choix")}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      flex: 1, padding: "9px 14px", borderRadius: 9, cursor: "pointer",
                      fontSize: 13, fontWeight: 600,
                      background: destMode === "choix" ? "#EFF6FF" : "#F9FAFB",
                      border: `1.5px solid ${destMode === "choix" ? "#BFDBFE" : "#E5E7EB"}`,
                      color: destMode === "choix" ? "#1D4ED8" : "#9CA3AF",
                    }}
                  >
                    <Users size={13} /> Clients spécifiques
                  </button>
                </div>
                {destMode === "choix" && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {clients.map(c => {
                      const sel = selectedIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleClient(c.id)}
                          style={{
                            padding: "6px 12px", borderRadius: 20, cursor: "pointer",
                            fontSize: 12, fontWeight: 600,
                            background: sel ? "#0362E3" : "#F9FAFB",
                            border: `1.5px solid ${sel ? "#0362E3" : "#E5E7EB"}`,
                            color: sel ? "#fff" : "#6B7280",
                          }}
                        >
                          {c.nom}
                        </button>
                      );
                    })}
                    {clients.length === 0 && (
                      <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Chargement…</p>
                    )}
                  </div>
                )}
              </div>

              {/* Bouton publier */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handlePublish}
                  disabled={!canPublish || publishing}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 22px", borderRadius: 10, border: "none",
                    fontSize: 13, fontWeight: 600,
                    cursor: canPublish && !publishing ? "pointer" : "not-allowed",
                    background: canPublish ? "#0362E3" : "#E5E7EB",
                    color: canPublish ? "#fff" : "#9CA3AF",
                  }}
                >
                  <Send size={13} />
                  {publishing ? "Publication…" : "Publier"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", padding: 40 }}>
            Chargement…
          </p>
        ) : items.length === 0 ? (
          <div style={{
            background: "#fff", border: "1px solid #F3F4F6", borderRadius: 14,
            padding: "48px 24px", textAlign: "center",
          }}>
            <Sparkles size={28} color="#E9D5FF" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "#9CA3AF", margin: 0 }}>
              Aucune publication — créez votre première nouveauté ou mise à jour
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map(item => (
              <div key={item.id} style={{
                background: "#fff", border: "1px solid #F3F4F6", borderRadius: 12,
                padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14,
                opacity: item.publie ? 1 : 0.55,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: "flex", alignItems: "center",
                    gap: 8, marginBottom: 6, flexWrap: "wrap",
                  }}>
                    <TypeBadge type={item.type} />
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>{formatDate(item.date)}</span>
                    {item.destinataires !== "tous" && (
                      <span style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic" }}>
                        {Array.isArray(item.destinataires)
                          ? `${item.destinataires.length} client(s)`
                          : item.destinataires}
                      </span>
                    )}
                    {item.destinataires === "tous" && (
                      <span style={{ fontSize: 11, color: "#9CA3AF", fontStyle: "italic" }}>
                        Tous les clients
                      </span>
                    )}
                    {item.fichierUrl && (
                      <span style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, color: "#6B7280",
                      }}>
                        {item.fichierType?.startsWith("image/")
                          ? <Image size={11} /> : <FileText size={11} />}
                        Fichier joint
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 14, fontWeight: 700, color: "#0A0A0A", margin: "0 0 4px",
                  }}>{item.titre}</p>
                  <p style={{
                    fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.6,
                    whiteSpace: "pre-line",
                  }}>
                    {item.contenu.slice(0, 180)}{item.contenu.length > 180 ? "…" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleTogglePublie(item)}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: "5px 10px",
                      borderRadius: 7, cursor: "pointer", border: "1px solid",
                      background: item.publie ? "#F0FDF4" : "#F9FAFB",
                      color: item.publie ? "#166534" : "#9CA3AF",
                      borderColor: item.publie ? "#BBF7D0" : "#E5E7EB",
                    }}
                  >
                    {item.publie ? "Publié ✓" : "Masqué"}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "5px 10px", borderRadius: 7,
                      border: "1px solid #FECACA", background: "#FEF2F2",
                      color: "#DC2626", cursor: "pointer",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
