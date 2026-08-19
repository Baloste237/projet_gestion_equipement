export interface CreateCategoryDTO {
  name: string;
  description?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
}

export interface CategoryResponseDTO {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}
