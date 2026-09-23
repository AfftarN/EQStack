import { describe, expect, it } from "vitest";
import { canonicalToolName, resolvePortableSchemas, resolveToolPrefix } from "./tool-prefix.js";

describe("resolveToolPrefix", () => {
  it("defaults to empty and accepts both CLI forms", () => {
    expect(resolveToolPrefix([], {})).toBe("");
    expect(resolveToolPrefix(["mcp", "--tool-prefix=work_"], {})).toBe("work_");
    expect(resolveToolPrefix(["mcp", "--tool-prefix", "personal_"], {})).toBe("personal_");
  });

  it("prefers CLI over GMAIL_MCP_TOOL_PREFIX", () => {
    expect(
      resolveToolPrefix(["mcp", "--tool-prefix=cli_"], { GMAIL_MCP_TOOL_PREFIX: "env_" }),
    ).toBe("cli_");
  });

  it("strips only a matching non-empty prefix", () => {
    expect(canonicalToolName("work_read_email", "work_")).toBe("read_email");
    expect(canonicalToolName("read_email", "work_")).toBe("read_email");
    expect(canonicalToolName("read_email", "")).toBe("read_email");
  });
});

describe("resolvePortableSchemas", () => {
  it("is off by default and for unrecognised values", () => {
    expect(resolvePortableSchemas([], {})).toBe(false);
    expect(resolvePortableSchemas(["mcp"], { GMAIL_MCP_PORTABLE_SCHEMAS: "0" })).toBe(false);
    expect(resolvePortableSchemas(["mcp"], { GMAIL_MCP_PORTABLE_SCHEMAS: "" })).toBe(false);
    expect(resolvePortableSchemas(["mcp"], { GMAIL_MCP_PORTABLE_SCHEMAS: "no" })).toBe(false);
  });

  it("turns on with the CLI flag or GMAIL_MCP_PORTABLE_SCHEMAS=1/true", () => {
    expect(resolvePortableSchemas(["mcp", "--portable-schemas"], {})).toBe(true);
    expect(resolvePortableSchemas(["mcp"], { GMAIL_MCP_PORTABLE_SCHEMAS: "1" })).toBe(true);
    expect(resolvePortableSchemas(["mcp"], { GMAIL_MCP_PORTABLE_SCHEMAS: "TRUE" })).toBe(true);
  });
});
