export interface RegisterDTO {
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RefreshDTO {
  refreshToken: string;
}

export interface JwtPayload {
  id: string;       // credentialId (authUserId)
  role: string;
  permissions: string[];
}
