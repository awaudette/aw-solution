import { Timestamp } from "firebase/firestore";

// clients/{clientId}/branding/main
export interface BrandingMain {
  // Identité légale
  nomLegal:              string;
  adresse:               string;
  neq:                   string;
  slogan:                string;

  // Contact principal
  nomContactPrincipal:   string;
  roleContactPrincipal:  string;
  telephoneEntreprise:   string;
  telephoneContact:      string;
  courrielEntreprise:    string;
  courrielContact:       string;

  // Visuel (logos dans sous-collection branding/main/logos)
  couleurPrincipale:     string;
  couleurSecondaire:     string;

  // Programme de fidélité
  ratioPointsParDollar:  number;

  // Setup technique
  posUtilise:            string;
  posAutre:              string;
  iPad:                  boolean;
  cleAPI:                string;
  descriptionSetup:      string;

  // Sections app
  sectionsApp:           string[];
  sectionsAppAutre:      string;

  // Progression du formulaire
  completedSections:     string[];
  brandingSubmittedAt:   Timestamp | null;
  brandingCompletedAt:   Timestamp | null;
}

// clients/{clientId}/branding/main/logos (sous-collection)
export interface LogoBranding {
  id:         string;
  url:        string;
  nom:        string;
  storageRef: string;
  uploadedAt: Timestamp;
}

// clients/{clientId}/branding/main/recompenses (sous-collection)
export interface Recompense {
  id:          string;
  nom:         string;
  description: string;
  valeurPts:   number;
  imageUrl:    string;
  storageRef:  string;
  ordre:       number;
  createdAt:   Timestamp;
}

// clients/{clientId}/branding/templates
export interface TemplateSection {
  templateId:  string;
  commentaire: string;
}

export interface BrandingTemplates {
  accueil:        TemplateSection;
  recompenses:    TemplateSection;
  promotions:     TemplateSection;
  bonus:          TemplateSection;
  centreControle: TemplateSection;
  menu:           TemplateSection;
  creationPromo:  TemplateSection;
}

// clients/{clientId}/branding/main/fichiers (sous-collection)
export type StatutFichier = "recu" | "en_traitement" | "approuve" | "a_refaire";

export interface FichierBranding {
  id:               string;
  nom:              string;
  url:              string;
  storageRef:       string;
  taille:           number;
  statut:           StatutFichier;
  commentaireAdmin: string;
  uploadedAt:       Timestamp;
  updatedAt:        Timestamp;
}
