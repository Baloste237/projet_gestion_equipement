export const ASSIGNEE_TYPES = ["USER", "DEPARTMENT", "POSITION"] as const;
export type AssigneeType = (typeof ASSIGNEE_TYPES)[number];

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
