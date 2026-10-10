import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRelativeTime } from "./relative-time";

describe("formatRelativeTime", () => {
  it("formats minutes ago", () => {
    const now = Date.parse("2026-10-10T12:00:00.000Z");
    const iso = "2026-10-10T11:45:00.000Z";
    const out = formatRelativeTime(iso, "en", now);
    assert.match(out, /minute|min/i);
  });

  it("returns raw string for invalid iso", () => {
    assert.equal(formatRelativeTime("not-a-date", "es"), "not-a-date");
  });
});
