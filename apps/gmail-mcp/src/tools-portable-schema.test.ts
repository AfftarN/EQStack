import { describe, expect, it } from "vitest";
import { zodToJsonSchema } from "zod-to-json-schema";
import { normalizeToolArgs } from "./core/normalize-args.js";
import { getToolByName, SendEmailSchema, toMcpTools, toolDefinitions } from "./tools.js";

describe("MCP input schemas with portable schemas OFF (default)", () => {
  it("publishes exactly zodToJsonSchema's output for every tool", () => {
    const published = toMcpTools(toolDefinitions);
    expect(published).toHaveLength(toolDefinitions.length);
    for (const [index, tool] of published.entries()) {
      expect(JSON.stringify(tool.inputSchema)).toBe(
        JSON.stringify(zodToJsonSchema(toolDefinitions[index]!.schema as any)),
      );
    }
  });

  it("treats an explicit false the same as the default", () => {
    expect(JSON.stringify(toMcpTools(toolDefinitions, { portableSchemas: false }))).toBe(
      JSON.stringify(toMcpTools(toolDefinitions)),
    );
  });

  it("keeps optional fields optional and the inline-image cid pattern", () => {
    const schema = toMcpTools([getToolByName("draft_email")!])[0]!.inputSchema as any;
    expect(schema.required).toEqual(["to", "subject", "body"]);
    expect(schema.properties.cc.anyOf).toBeUndefined();
    expect(schema.properties.inlineImages.items.properties.cid.pattern).toBeDefined();
  });
});

describe("MCP input schemas with portable schemas ON", () => {
  it("publishes optional object fields as required nullable fields", () => {
    const tool = toMcpTools([getToolByName("draft_email")!], { portableSchemas: true })[0]!;
    const schema = tool.inputSchema as any;
    const item = schema.properties.inlineImages.anyOf[0].items;

    expect(schema.required).toEqual([
      "to",
      "subject",
      "body",
      "from",
      "htmlBody",
      "mimeType",
      "cc",
      "bcc",
      "threadId",
      "inReplyTo",
      "attachments",
      "inlineImages",
    ]);
    expect(item.required).toEqual(["cid", "path", "content", "contentType", "filename"]);
    expect(item.properties.path.anyOf).toEqual([
      expect.objectContaining({ type: "string" }),
      { type: "null" },
    ]);
    expect(item.properties.content.anyOf).toEqual([
      expect.objectContaining({ type: "string" }),
      { type: "null" },
    ]);
    expect(item.properties.contentType.anyOf[0].enum).toEqual([
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/x-icon",
    ]);
    expect(item.properties.cid.pattern).toBeUndefined();
  });
});

describe("tool argument normalization (always on)", () => {
  it("returns an empty object for missing arguments", () => {
    expect(normalizeToolArgs(undefined)).toEqual({});
    expect(normalizeToolArgs(null)).toEqual({});
  });

  it("leaves null-free arguments unchanged", () => {
    const args = { to: ["a@example.com"], subject: "S", body: "B", labelIds: ["INBOX"] };
    expect(normalizeToolArgs(args)).toEqual(args);
  });

  it("removes nulls before strict Zod validation", () => {
    const result = SendEmailSchema.safeParse(
      normalizeToolArgs({
        to: ["recipient@example.com"],
        subject: "Subject",
        body: "Body",
        htmlBody: '<img src="cid:hero">',
        inlineImages: [
          {
            cid: "hero",
            path: "/tmp/hero.png",
            content: null,
            contentType: null,
            filename: null,
          },
        ],
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inlineImages?.[0]).toEqual({ cid: "hero", path: "/tmp/hero.png" });
    }
  });

  it("preserves strict inline-image validation", () => {
    const base = {
      to: ["recipient@example.com"],
      subject: "Subject",
      body: "Body",
      htmlBody: '<img src="cid:hero">',
    };
    const invalidImages = [
      {
        cid: "hero",
        path: "/tmp/hero.png",
        content: "YQ==",
        contentType: "image/png",
        filename: null,
      },
      { cid: "hero", path: null, content: null, contentType: null, filename: null },
      { cid: "hero", path: null, content: "YQ==", contentType: null, filename: null },
    ];

    for (const inlineImage of invalidImages) {
      expect(
        SendEmailSchema.safeParse(normalizeToolArgs({ ...base, inlineImages: [inlineImage] }))
          .success,
      ).toBe(false);
    }
  });
});
