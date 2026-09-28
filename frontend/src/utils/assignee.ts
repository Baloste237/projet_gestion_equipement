import type { Assignment, AssigneeInfo, AssigneeType } from '../services/api';

export const ASSIGNEE_TYPES: AssigneeType[] = ['USER', 'DEPARTMENT', 'POSITION'];

export const ASSIGNEE_TYPE_LABELS: Record<AssigneeType, string> = {
  USER: 'Utilisateur',
  DEPARTMENT: 'Département',
  POSITION: 'Poste',
};

export const ASSIGNEE_TYPE_ICONS: Record<AssigneeType, string> = {
  USER: 'person',
  DEPARTMENT: 'lan',
  POSITION: 'badge',
};

export const UNAVAILABLE_ASSIGNEE_LABEL = 'Bénéficiaire indisponible';

export interface AssigneeDisplay {
  type: AssigneeType;
  typeLabel: string;
  icon: string;
  name: string;
  /** Département de l'utilisateur ou du poste, e-mail, ou libellé du type */
  subtitle: string;
  avatarUrl?: string;
  /** false si le bénéficiaire n'a pas pu être résolu par le backend */
  available: boolean;
}

const fullName = (info: AssigneeInfo) => `${info.firstName || ''} ${info.lastName || ''}`.trim();

// Décrit le bénéficiaire d'une affectation quel que soit son type ; ne lève jamais d'erreur
export const describeAssignee = (assignment: Pick<Assignment, 'assigneeType' | 'assignee' | 'user'>): AssigneeDisplay => {
  const type: AssigneeType = assignment.assigneeType ?? 'USER';
  const base = { type, typeLabel: ASSIGNEE_TYPE_LABELS[type], icon: ASSIGNEE_TYPE_ICONS[type] };
  // `user` reste lu pour les anciennes réponses qui ne contenaient pas `assignee`
  const info: AssigneeInfo | null | undefined = assignment.assignee ?? (type === 'USER' ? assignment.user : null);

  if (!info) {
    return { ...base, name: UNAVAILABLE_ASSIGNEE_LABEL, subtitle: base.typeLabel, available: false };
  }

  if (type === 'USER') {
    return {
      ...base,
      name: fullName(info) || info.email || 'Utilisateur',
      subtitle: info.department?.name || info.email || base.typeLabel,
      avatarUrl: info.avatarUrl,
      available: true,
    };
  }

  const name = info.name || base.typeLabel;
  return {
    ...base,
    name,
    subtitle: type === 'POSITION' ? info.department?.name || base.typeLabel : base.typeLabel,
    available: true,
  };
};

// Texte agrégé sur lequel porte la recherche de la liste des affectations
export const assigneeSearchText = (assignment: Pick<Assignment, 'assigneeType' | 'assignee' | 'user'>): string => {
  const display = describeAssignee(assignment);
  const email = assignment.assignee?.email || assignment.user?.email || '';
  return [display.name, display.subtitle, display.typeLabel, email].join(' ').toLowerCase();
};

// Seules les affectations à un utilisateur peuvent être transférées (le backend n'accepte que toUserId)
export const canTransfer = (assignment: Pick<Assignment, 'assigneeType' | 'status'>): boolean =>
  assignment.status === 'ACTIVE' && (assignment.assigneeType ?? 'USER') === 'USER';

export const TRANSFER_UNAVAILABLE_HINT =
  "Transfert impossible : une affectation à un département ou à un poste se restitue, puis se recrée pour le nouveau bénéficiaire.";
