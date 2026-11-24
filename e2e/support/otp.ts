import { readFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_MAIL_FILE = path.resolve(process.cwd(), "..", "CAPSTONE_BE", "scripts", "e2e", ".run", "mail.jsonl");

export const MAIL_FILE_PATH = process.env.E2E_MAIL_FILE ?? process.env.E2E_SMTP_FILE ?? DEFAULT_MAIL_FILE;

type MailLine = {
  subject?: unknown;
  to?: unknown;
  body?: unknown;
};

const parseLine = (line: string): MailLine | null => {
  try {
    return JSON.parse(line) as MailLine;
  } catch {
    return null;
  }
};

export const readLatestAdminOtp = (recipient = "demo.admin@apcs.test"): string => {
  const lines = readFileSync(MAIL_FILE_PATH, "utf8").split("\n").filter((line) => line.trim().length > 0);
  const otpLine = [...lines].reverse().map(parseLine).find(
    (entry): entry is MailLine & { subject: string; body: string } =>
      entry !== null &&
      typeof entry.subject === "string" &&
      /verification code/i.test(entry.subject) &&
      (entry.to === undefined ||
        (Array.isArray(entry.to)
          ? (entry.to as string[]).some((address) => address.includes(recipient))
          : String(entry.to).includes(recipient))) &&
      typeof entry.body === "string"
  );

  if (!otpLine) {
    throw new Error(`No admin 2FA email found in ${MAIL_FILE_PATH}. Log in as admin first so the server sends one.`);
  }

  const match = otpLine.body.match(/code is:\s*(\d{6})/);
  if (!match?.[1]) {
    throw new Error(`Could not extract the 6-digit code from the latest admin 2FA email in ${MAIL_FILE_PATH}.`);
  }
  return match[1];
};
