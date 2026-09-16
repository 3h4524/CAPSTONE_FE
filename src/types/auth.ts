export type RegisterResult = {
  userId: string;
  email: string;
  requiresEmailVerification: boolean;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
};

export type LoginResult = {
  user?: AuthenticatedUser;
  requiresTwoFactor?: boolean;
  tempToken?: string;
  twoFactorExpiresAtUtc?: string;
};

export type AdminTwoFactorPayload = {
  tempToken: string;
  otpCode: string;
};

export type AdminTwoFactorResponse = {
  tempToken: string;
  expiresAtUtc: string;
};
