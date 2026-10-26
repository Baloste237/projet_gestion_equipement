export interface CreateUserDTO {
  firstName: string;
  lastName: string;
  email: string;
  // Renseigné par le serveur après rapprochement par e-mail ; jamais fourni par le client
  authUserId?: string | null;
  role?: string;
  departmentId?: string;
  avatarUrl?: string;
  phone?: string | null;
  countryCode?: string | null;
}

export interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  phone?: string | null;
  countryCode?: string | null;
}

export interface UpdateRoleDTO {
  role: string;
  departmentId?: string;
  isActive?: boolean;
  status?: string;
}

export interface DeactivateUserDTO {
  isActive: boolean;
  deactivatedAt: Date;
}
