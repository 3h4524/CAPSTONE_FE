import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { getResponseStatus } from "@/helpers/response-status";

const cases: Array<[string, unknown, number | undefined]> = [
  ["a client error status", { response: { status: 404 } }, 404],
  ["a server error status", { response: { status: 500 } }, 500],
  ["a redirect status", { response: { status: 302 } }, 302],
  ["a zero status", { response: { status: 0 } }, 0],
  ["a numeric-string status", { response: { status: "404" } }, undefined],
  ["a null status", { response: { status: null } }, undefined],
  ["a missing status", { response: {} }, undefined],
  ["a null response", { response: null }, undefined],
  ["an undefined response", { response: undefined }, undefined],
  ["an object without a response", {}, undefined],
  ["an object with a null response", { response: { data: null } }, undefined],
  ["null", null, undefined],
  ["undefined", undefined, undefined],
  ["a string", "Request failed", undefined],
  ["a number", 404, undefined],
  ["zero", 0, undefined],
  ["a boolean", false, undefined],
  ["an array", [{ status: 404 }], undefined],
  ["a bigint", BigInt(404), undefined],
];

describe("getResponseStatus", () => {
  it.each(cases)("returns the status for %s", (_label, error, expected) => {
    expect(getResponseStatus(error)).toBe(expected);
  });

  it("reads the status of a real AxiosError", () => {
    const error = new AxiosError("Request failed with status code 401");
    error.response = {
      data: {},
      status: 401,
      statusText: "Unauthorized",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };

    expect(getResponseStatus(error)).toBe(401);
  });

  it("returns undefined for an AxiosError without a response", () => {
    expect(getResponseStatus(new AxiosError("Network Error"))).toBeUndefined();
  });

  it("returns undefined for a plain Error", () => {
    expect(getResponseStatus(new Error("Network Error"))).toBeUndefined();
  });

  it("prefers the response status over any other status-like field", () => {
    expect(getResponseStatus({ response: { status: 422 }, status: 500 })).toBe(422);
  });

  it("passes through a NaN status because only the typeof check guards it", () => {
    expect(getResponseStatus({ response: { status: Number.NaN } })).toBeNaN();
  });
});
