export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
};

export type LoginResult = {
  accessToken: string;
  expiresAtUtc: string;
  user: AuthenticatedUser;
};
