"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Trash2, RotateCcw, Loader2, Check } from "lucide-react";
import { AssigneePicker } from "./AssigneePicker";
import { CompleterTacheDialog } from "./CompleterTacheDialog";
import { toDateInputValue, toTimeInputValue, combineDateTimeToIso } from "@/lib/dateInputs";
import type { Portee, Priorite, TacheDTO, CommentaireDTO } from "@/config/taches";
import type { StaffMember, TacheUpdateInput } from "@/hooks/useTaches";

function staffLabel(uid: string | null, staff: StaffMember[]): string {
  if (!uid) return "";
  const s = staff.find(x => x.uid === uid);
  if (!s) return uid;
  return (`${s.prenom} ${s.nom}`.trim()) || s.courriel;
}

function formatDateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateHeureCourte(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-CA", { day: "numeric", month: "short" });
  const heure = d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${heure}`;
}

export function TacheDetailDialog({
  tache, staff, currentUid, isAdmin,
  onClose, onUpdate, onComplete, onReopen, onDelete,
  fetchComments, addComment,
}: {
  tache: TacheDTO;
  staff: StaffMember[];
  currentUid: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate: (input: TacheUpdateInput) => Promise<void>;
  onComplete: (input: { completedAt: string; commentaire?: string }) => Promise<void>;
  onReopen: () => Promise<void>;
  onDelete: () => Promise<void>;
  fetchComments: () => Promise<CommentaireDTO[]>;
  addComment: (texte: string) => Promise<void>;
}) {
  const [titre, setTitre]             = useState(tache.titre);
  const [description, setDescription] = useState(tache.description ?? "");
  const [portee, setPortee]           = useState<Portee>(tache.portee);
  const [assignes, setAssignes]       = useState<string[]>(tache.assignes);
  const [priorite, setPriorite]       = useState<Priorite>(tache.priorite);
  const [dateEcheance, setDateEcheance] = useState(toDateInputValue(tache.dateEcheance));
  const [heureEcheance, setHeureEcheance] = useState(tache.heureEcheance ? toTimeInputValue(tache.dateEcheance) : "");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const [comments, setComments]                 = useState<CommentaireDTO[]>([]);
  const [loadingComments, setLoadingComments]   = useState(true);
  const [nouveauCommentaire, setNouveauCommentaire] = useState("");
  const [postingComment, setPostingComment]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    fetchComments()
      .then(list => { if (!cancelled) setComments(list); })
      .finally(() => { if (!cancelled) setLoadingComments(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tache.id]);

  const isDirty =
    titre !== tache.titre ||
    description !== (tache.description ?? "") ||
    portee !== tache.portee ||
    JSON.stringify([...assignes].sort()) !== JSON.stringify([...tache.assignes].sort()) ||
    priorite !== tache.priorite ||
    dateEcheance !== toDateInputValue(tache.dateEcheance) ||
    heureEcheance !== (tache.heureEcheance ? toTimeInputValue(tache.dateEcheance) : "");

  const canDelete = isAdmin || tache.creePar === currentUid;

  async function handleSave() {
    if (!titre.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onUpdate({
        titre: titre.trim(),
        description: description.trim() || null,
        portee,
        assignes: portee === "individuel" ? assignes : undefined,
        priorite,
        dateEcheance: combineDateTimeToIso(dateEcheance, heureEcheance),
        heureEcheance: !!heureEcheance,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddComment() {
    if (!nouveauCommentaire.trim() || postingComment) return;
    setPostingComment(true);
    setError(null);
    try {
      await addComment(nouveauCommentaire.trim());
      setNouveauCommentaire("");
      setComments(await fetchComments());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'ajout du commentaire");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    setError(null);
    try {
      await onDelete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la suppression");
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détail de la tâche</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Input value={titre} onChange={(e) => setTitre(e.target.value)} className="font-medium" />
          <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

          <AssigneePicker
            staff={staff}
            portee={portee}
            assignes={assignes}
            onChange={(p, a) => { setPortee(p); setAssignes(a); }}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setPriorite(priorite === "urgente" ? "normale" : "urgente")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                priorite === "urgente"
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              Priorité urgente
            </button>

            <Input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)} className="w-36" />
            <Input
              type="time"
              value={heureEcheance}
              onChange={(e) => setHeureEcheance(e.target.value)}
              className="w-28"
              disabled={!dateEcheance}
            />

            {tache.statut === "complete" && (
              <span className="ml-auto text-xs text-green-600 font-medium">
                Complétée{tache.completePar ? ` par ${staffLabel(tache.completePar, staff)}` : ""}
                {tache.completedAt ? ` · ${formatDateCourte(tache.completedAt)}` : ""}
              </span>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center gap-2 pt-1">
            {tache.statut === "complete" ? (
              <button
                onClick={onReopen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw size={13} /> Rouvrir
              </button>
            ) : (
              <button
                onClick={() => setShowCompleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
              >
                <Check size={13} /> Marquer complétée
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={!isDirty || saving || !titre.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#0362E3] hover:bg-[#0350c0] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Sauvegarde…" : "Enregistrer"}
            </button>

            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  confirmDelete
                    ? "bg-red-600 border-red-600 text-white hover:bg-red-700"
                    : "bg-red-50 border-red-100 text-red-600 hover:bg-red-100"
                }`}
              >
                <Trash2 size={13} /> {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
              </button>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Commentaires</p>

            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-gray-300" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Aucun commentaire.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {comments.map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-gray-700">{staffLabel(c.auteur, staff) || "?"}</p>
                      {c.createdAt && (
                        <p className="text-[11px] text-gray-400 flex-shrink-0">{formatDateHeureCourte(c.createdAt)}</p>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.texte}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="Ajouter un commentaire…"
                value={nouveauCommentaire}
                onChange={(e) => setNouveauCommentaire(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }}
              />
              <button
                onClick={handleAddComment}
                disabled={!nouveauCommentaire.trim() || postingComment}
                className="p-2 rounded-lg bg-[#0362E3] text-white disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>

      {showCompleteConfirm && (
        <CompleterTacheDialog
          onClose={() => setShowCompleteConfirm(false)}
          onConfirm={async (input) => {
            await onComplete(input);
            // Un commentaire peut avoir été ajouté par la confirmation —
            // on rafraîchit le fil pour qu'il apparaisse sans réouvrir le panneau.
            setComments(await fetchComments());
          }}
        />
      )}
    </Dialog>
  );
}
