export interface CreateUserDTO {
  firstName: string;
  lastName: string;
  email: string;
  authUserId: string;
  role?: string;
  departmentId?: string;
  avatarUrl?: string;
}

export interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface UpdateRoleDTO {
  role: string;
  departmentId?: string;
}

export interface DeactivateUserDTO {
  isActive: boolean;
  deactivatedAt: Date;
}
