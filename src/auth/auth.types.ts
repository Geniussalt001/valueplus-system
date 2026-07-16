export type UserRole =
  | "admin"
  | "user";

export interface AppUser {
  userCode: string;
  displayName: string;
  role: UserRole;
}

export interface AuthSession {
  token: string;
  sessionToken: string;
  expiresAt: string;
  user: AppUser;
}

export interface LoginInput {
  userCode: string;
  password: string;
}