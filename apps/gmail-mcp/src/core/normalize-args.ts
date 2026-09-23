// Tool-argument normalisation applied before every op's Zod parse.
//
// Some MCP clients send explicit `null` for fields they are not using —
// always when the server publishes portable (required-but-nullable) schemas,
// and sometimes even when it does not. Every input schema treats absence as
// "not set" and none accepts null, so dropping null-valued keys is a pure
// widening: anything that parsed before still parses the same way.
//
// Lives in core/ (not tools.ts) so the registry can use it without core/
// depending on the tool catalogue.

function stripNulls<T>(value: T): T {
  if (Array.isArray(value))
    return (value as unknown[]).map((v) => stripNulls(v as unknown)) as unknown as T;
  if (value === null || value === undefined || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== null)
      .map(([key, item]) => [key, stripNulls(item as unknown)]),
  ) as unknown as T;
}

export function normalizeToolArgs<T>(args: T): T {
  if (args === null || args === undefined) return {} as T;
  return stripNulls(args);
}
