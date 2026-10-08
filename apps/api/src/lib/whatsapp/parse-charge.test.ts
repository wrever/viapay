import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNaturalCharge } from "./parse-charge";

describe("parseNaturalCharge", () => {
  it("parses cobro 20 xlm a juanito", () => {
    const r = parseNaturalCharge("cobro 20 xlm a juanito");
    assert.ok(r);
    assert.equal(r!.asset, "XLM");
    assert.equal(r!.amount, "20.0000000");
    assert.equal(r!.contactQuery, "juanito");
  });

  it("parses long form with llamado", () => {
    const r = parseNaturalCharge(
      "cobrar 5,5 usdc a mi contacto llamado Juan Pérez",
    );
    assert.ok(r);
    assert.equal(r!.asset, "USDC");
    assert.equal(r!.amount, "5.5000000");
    assert.equal(r!.contactQuery, "Juan Pérez");
  });

  it("rejects garbage", () => {
    assert.equal(parseNaturalCharge("hola"), null);
    assert.equal(parseNaturalCharge("1"), null);
  });
});
