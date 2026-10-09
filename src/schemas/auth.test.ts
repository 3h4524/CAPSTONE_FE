import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/schemas/auth";

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
});