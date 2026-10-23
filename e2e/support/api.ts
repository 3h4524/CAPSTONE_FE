import type { Page, Response } from "@playwright/test";

import { E2E_API_BASE_URL } from "./auth";

export const apiPath = (path: string): string => `${E2E_API_BASE_URL}${path}`;

export type RecordedCall = {
  method: string;
  path: string;
  status: number;
};

export const recordApiCalls = (page: Page): RecordedCall[] => {
  const calls: RecordedCall[] = [];

  page.on("response", (response: Response) => {
    const url = response.url();
    if (!url.startsWith(E2E_API_BASE_URL)) return;

    calls.push({
      method: response.request().method(),
      path: new URL(url).pathname,
      status: response.status(),
    });
  });

  return calls;
};

export const findCalls = (calls: RecordedCall[], method: string, path: string | RegExp) =>
  calls.filter(
    (call) => call.method === method && (typeof path === "string" ? call.path === path : path.test(call.path))
  );