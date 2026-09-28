export const ASSIGNEE_TYPES = ["USER", "DEPARTMENT", "POSITION"] as const;
export type AssigneeType = (typeof ASSIGNEE_TYPES)[number];

export const ASSIGNMENT_STATUSES = ["ACTIVE", "TRANSFERRED", "RETURNED"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

// Filtres optionnels de GET /assignments : sans filtre, toutes les affectations sont renvoyées
export interface AssignmentFilters {
  assigneeType?: AssigneeType;
  assigneeId?: string;
  status?: AssignmentStatus;
}

export interface CreateAssignmentDTO {
  equipmentId: string;
  assigneeType: AssigneeType;
  assigneeId: string;
  notes?: string;
  expectedReturnDate?: string;
  handoverCondition?: string;
}

export interface CreateTransferDTO {
  toUserId: string;
  reason?: string;
}

export interface CreateReturnDTO {
  condition: "GOOD" | "DAMAGED" | "LOST";
  note?: string;
}
