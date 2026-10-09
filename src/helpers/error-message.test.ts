import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { DEFAULT_ERROR_MESSAGE, getErrorMessage } from "@/helpers/error-message";

const axiosErrorWith = (data: unknown, status = 400) => {
  const error = new AxiosError("Request failed with status code " + status);
  error.response = {
    data,
    status,
    statusText: "Bad Request",
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  };
  return error;
};

describe("DEFAULT_ERROR_MESSAGE", () => {
  it("stays the implicit fallback", () => {
    expect(DEFAULT_ERROR_MESSAGE).toBe("Something went wrong");
    expect(getErrorMessage(undefined)).toBe(DEFAULT_ERROR_MESSAGE);
  });
});

describe("getErrorMessage with an AxiosError", () => {
  it("prefers the ProblemDetails detail field", () => {
    expect(getErrorMessage(axiosErrorWith({ detail: "Batch not found." }))).toBe(
      "Batch not found."
    );
  });

  it("falls back to the message field when detail is absent", () => {
    expect(getErrorMessage(axiosErrorWith({ message: "Invalid payload." }))).toBe(
      "Invalid payload."
    );
  });

  it("falls back to the error field when detail and message are absent", () => {
    expect(getErrorMessage(axiosErrorWith({ error: "quota_exceeded" }))).toBe("quota_exceeded");
  });

  it("falls back to the title field as the last payload field", () => {
    expect(getErrorMessage(axiosErrorWith({ title: "Bad Request" }))).toBe("Bad Request");
  });

  it("prefers detail over message, error and title", () => {
    const data = { detail: "D", message: "M", error: "E", title: "T" };

    expect(getErrorMessage(axiosErrorWith(data))).toBe("D");
  });

  it("ignores the axios message in favour of the payload", () => {
    const error = axiosErrorWith({ detail: "Token expired." });

    expect(error.message).toBe("Request failed with status code 400");
    expect(getErrorMessage(error)).toBe("Token expired.");
  });

  it("falls through to the axios message when the payload has no usable text", () => {
    expect(getErrorMessage(axiosErrorWith({}))).toBe("Request failed with status code 400");
    expect(getErrorMessage(axiosErrorWith({ detail: "   " }))).toBe(
      "Request failed with status code 400"
    );
  });

  it("falls through to the axios message when the payload field is not a string", () => {
    expect(getErrorMessage(axiosErrorWith({ detail: 7, message: null, error: {} }))).toBe(
      "Request failed with status code 400"
    );
  });

  it("maps a known error code to a localized message", () => {
    expect(getErrorMessage(axiosErrorWith({ code: "auth.admin_2fa_invalid" }))).toBe(
      "Mã OTP không đúng. Vui lòng kiểm tra email và thử lại."
    );
    expect(getErrorMessage(axiosErrorWith({ code: "auth.admin_2fa_expired" }))).toBe(
      "Mã OTP đã hết hạn. Vui lòng gửi lại mã mới."
    );
  });

  it("wins the known code over any payload text", () => {
    expect(getErrorMessage(axiosErrorWith({ code: "auth.admin_2fa_invalid", detail: "raw" }))).toBe(
      "Mã OTP không đúng. Vui lòng kiểm tra email và thử lại."
    );
  });

  it("ignores an unknown or non-string error code", () => {
    expect(getErrorMessage(axiosErrorWith({ code: "auth.unknown", detail: "raw" }))).toBe("raw");
    expect(getErrorMessage(axiosErrorWith({ code: 12, detail: "raw" }))).toBe("raw");
  });

  it("does not read the code from a nested object", () => {
    expect(
      getErrorMessage(axiosErrorWith({ code: { inner: "auth.admin_2fa_invalid" }, detail: "raw" }))
    ).toBe("raw");
  });
});

describe("getErrorMessage with a response-like object", () => {
  it.each([
    ["an empty object", {}],
    ["an object without a message", { unrelated: "value" }],
    ["a null response", { response: null }],
    ["a response without data", { response: {} }],
    ["a response with empty data", { response: { data: {} } }],
  ])("returns the fallback for %s", (_label, error) => {
    expect(getErrorMessage(error)).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it("ignores the top level message when a response is present", () => {
    expect(
      getErrorMessage({ response: { data: { detail: "from payload" } }, message: "top" })
    ).toBe("from payload");
  });

  it("returns the top level message when there is no response", () => {
    expect(getErrorMessage({ message: "top level" })).toBe("top level");
  });

  it("ignores a non-string top level message", () => {
    expect(getErrorMessage({ message: 42 })).toBe(DEFAULT_ERROR_MESSAGE);
  });
});

describe("getErrorMessage with a plain Error", () => {
  it("returns the error message", () => {
    expect(getErrorMessage(new Error("Network unreachable"))).toBe("Network unreachable");
  });

  it("returns the message of a TypeError subclass", () => {
    expect(getErrorMessage(new TypeError("x is not a function"))).toBe("x is not a function");
  });

  it("returns the fallback for an error with an empty message", () => {
    expect(getErrorMessage(new Error(""))).toBe(DEFAULT_ERROR_MESSAGE);
    expect(getErrorMessage(new Error("   "))).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it("preserves a multi-line error message", () => {
    expect(getErrorMessage(new Error("line one\nline two"))).toBe("line one\nline two");
  });
});

describe("getErrorMessage with a raw string", () => {
  it.each([
    ["a plain message", "Something specific failed"],
    ["a message with newlines", "first\nsecond"],
    ["a padded message", "  padded  "],
    ["a unicode message", "Không thể kết nối máy chủ"],
  ])("returns %s unchanged", (_label, error) => {
    expect(getErrorMessage(error)).toBe(error);
  });

  it.each([
    ["an empty string", ""],
    ["a whitespace-only string", "   "],
    ["a newline-only string", "\n\t"],
  ])("returns the fallback for %s", (_label, error) => {
    expect(getErrorMessage(error)).toBe(DEFAULT_ERROR_MESSAGE);
  });
});

describe("getErrorMessage with a non-error value", () => {
  const cases: Array<[string, unknown]> = [
    ["null", null],
    ["undefined", undefined],
    ["zero", 0],
    ["a positive number", 42],
    ["NaN", Number.NaN],
    ["false", false],
    ["true", true],
    ["an array", ["Error message"]],
    ["a symbol", Symbol("message")],
  ];

  it.each(cases)("returns the fallback for %s", (_label, error) => {
    expect(getErrorMessage(error)).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it("returns the fallback for a bigint", () => {
    expect(getErrorMessage(BigInt(7))).toBe(DEFAULT_ERROR_MESSAGE);
  });
});

describe("getErrorMessage with a custom fallback", () => {
  it("uses the fallback when nothing can be extracted", () => {
    expect(getErrorMessage(null, "Không tải được dữ liệu")).toBe("Không tải được dữ liệu");
    expect(getErrorMessage({}, "Không tải được dữ liệu")).toBe("Không tải được dữ liệu");
  });

  it("prefers a real message over the custom fallback", () => {
    expect(getErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("supports an empty custom fallback", () => {
    expect(getErrorMessage(null, "")).toBe("");
  });
});
