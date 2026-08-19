export interface CreateDepartmentDTO {
  name: string;
  description?: string;
}

export interface UpdateDepartmentDTO {
  name?: string;
  description?: string;
}
