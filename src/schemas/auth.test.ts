import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} from "@/schemas/auth";

const validLogin = { email: "seller@apcs.test", password: "Valid1234" };

const validRegister = {
  fullName: "Nhat Nguyen",
  email: "seller@apcs.test",
  password: "Valid1234",
  confirmPassword: "Valid1234",
};

const issueMessages = (result: { error?: { issues: Array<{ message: string }> } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("loginSchema", () => {
  it("rejects empty input", () => {
    const result = loginSchema.safeParse({ email: "", password: "" });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toEqual(
      expect.arrayContaining(["Please enter a valid email address", "Password is required"])
    );
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({ ...validLogin, email: "not-an-email" });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Please enter a valid email address");
  });

  it("accepts valid credentials and strips nothing else", () => {
    const result = loginSchema.safeParse(validLogin);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validLogin);
  });
});

describe("registerSchema", () => {
  it("rejects empty input", () => {
    const result = registerSchema.safeParse({
      email: "",
      password: "",
      confirmPassword: "",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toEqual(
      expect.arrayContaining([
        "Please enter a valid email address",
        "Please confirm your password",
      ])
    );
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ ...validRegister, email: "seller@" });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Please enter a valid email address");
  });

  it("rejects a password below the minimum length", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: "Aa1",
      confirmPassword: "Aa1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must be at least 8 characters");
  });

  it("rejects a password without an uppercase letter", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: "lowercase1",
      confirmPassword: "lowercase1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must contain at least one uppercase letter");
  });

  it("rejects a password without a digit", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: "NoDigitsHere",
      confirmPassword: "NoDigitsHere",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must contain at least one digit");
  });

  it("rejects mismatched confirmation", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      confirmPassword: "Different1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Passwords do not match");
  });

  it("rejects a full name longer than 255 characters", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      fullName: "a".repeat(256),
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Full name is too long");
  });

  it("accepts a valid payload and keeps fullName optional", () => {
    const withoutFullName = registerSchema.safeParse({
      email: validRegister.email,
      password: validRegister.password,
      confirmPassword: validRegister.confirmPassword,
    });

    expect(withoutFullName.success).toBe(true);
    expect(withoutFullName.success && withoutFullName.data.fullName).toBeUndefined();

    const result = registerSchema.safeParse(validRegister);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validRegister);
  });

  it("rejects a password without a lowercase letter", () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password: "UPPERCASE1",
      confirmPassword: "UPPERCASE1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must contain at least one lowercase letter");
  });

  it("rejects a password longer than 128 characters", () => {
    const longPassword = `Aa1${"a".repeat(126)}`;
    const result = registerSchema.safeParse({
      ...validRegister,
      password: longPassword,
      confirmPassword: longPassword,
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must be at most 128 characters");
  });
});

describe("forgotPasswordSchema", () => {
  it("rejects empty input", () => {
    const result = forgotPasswordSchema.safeParse({ email: "" });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Please enter a valid email address");
  });

  it("rejects an invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "not-an-email" });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Please enter a valid email address");
  });

  it("accepts a valid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "seller@apcs.test" });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ email: "seller@apcs.test" });
  });
});

describe("resendVerificationSchema", () => {
  it("rejects empty input", () => {
    const result = resendVerificationSchema.safeParse({ email: "" });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Please enter a valid email address");
  });

  it("rejects an invalid email", () => {
    const result = resendVerificationSchema.safeParse({ email: "seller@" });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Please enter a valid email address");
  });

  it("accepts a valid email", () => {
    const result = resendVerificationSchema.safeParse({ email: "seller@apcs.test" });

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual({ email: "seller@apcs.test" });
  });
});

const validReset = { newPassword: "Valid1234", confirmPassword: "Valid1234" };

describe("resetPasswordSchema", () => {
  it("rejects empty input", () => {
    const result = resetPasswordSchema.safeParse({ newPassword: "", confirmPassword: "" });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toEqual(
      expect.arrayContaining(["Please confirm your password"])
    );
  });

  it("rejects a password below the minimum length", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "Aa1",
      confirmPassword: "Aa1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must be at least 8 characters");
  });

  it("rejects a password without an uppercase letter", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "lowercase1",
      confirmPassword: "lowercase1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must contain at least one uppercase letter");
  });

  it("rejects a password without a lowercase letter", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "UPPERCASE1",
      confirmPassword: "UPPERCASE1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must contain at least one lowercase letter");
  });

  it("rejects a password without a digit", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "NoDigitsHere",
      confirmPassword: "NoDigitsHere",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must contain at least one digit");
  });

  it("rejects mismatched confirmation", () => {
    const result = resetPasswordSchema.safeParse({
      ...validReset,
      confirmPassword: "Different1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Passwords do not match");
  });

  it("accepts a valid payload", () => {
    const result = resetPasswordSchema.safeParse(validReset);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validReset);
  });
});

const validChange = {
  currentPassword: "OldValid123",
  newPassword: "NewValid123",
  confirmNewPassword: "NewValid123",
};

describe("changePasswordSchema", () => {
  it("rejects empty input", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toEqual(
      expect.arrayContaining([
        "Please enter your current password",
        "Please confirm your new password",
      ])
    );
  });

  it("rejects a new password below the minimum length", () => {
    const result = changePasswordSchema.safeParse({
      ...validChange,
      newPassword: "Aa1",
      confirmNewPassword: "Aa1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must be at least 8 characters");
  });

  it("rejects a new password without an uppercase letter", () => {
    const result = changePasswordSchema.safeParse({
      ...validChange,
      newPassword: "lowercase1",
      confirmNewPassword: "lowercase1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must contain at least one uppercase letter");
  });

  it("rejects a new password without a digit", () => {
    const result = changePasswordSchema.safeParse({
      ...validChange,
      newPassword: "NoDigitsHere",
      confirmNewPassword: "NoDigitsHere",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Password must contain at least one digit");
  });

  it("rejects mismatched confirmation", () => {
    const result = changePasswordSchema.safeParse({
      ...validChange,
      confirmNewPassword: "Different1",
    });

    expect(result.success).toBe(false);
    expect(issueMessages(result)).toContain("Passwords do not match");
  });

  it("accepts a valid payload", () => {
    const result = changePasswordSchema.safeParse(validChange);

    expect(result.success).toBe(true);
    expect(result.success && result.data).toEqual(validChange);
  });
});