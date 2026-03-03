import { describe, it, expect } from "vitest";
import { extractBearerToken } from "@/lib/server/api-auth";

describe("extractBearerToken", () => {
  it("extracts token from valid Bearer header", () => {
    const req = new Request("https://d3.local/api/files", {
      headers: { Authorization: "Bearer abc.def.ghi" },
    });

    expect(extractBearerToken(req)).toBe("abc.def.ghi");
  });

  it("returns null when header is missing", () => {
    const req = new Request("https://d3.local/api/files");
    expect(extractBearerToken(req)).toBeNull();
  });

  it("returns null for malformed headers", () => {
    const req = new Request("https://d3.local/api/files", {
      headers: { Authorization: "Token abc123" },
    });
    expect(extractBearerToken(req)).toBeNull();
  });
});
