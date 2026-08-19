export interface CreateAssignmentDTO {
  equipmentId: string;
  userId: string;
  notes?: string;
}

export interface CreateTransferDTO {
  toUserId: string;
  reason?: string;
}

export interface CreateReturnDTO {
  condition: "GOOD" | "DAMAGED" | "LOST";
  note?: string;
}
