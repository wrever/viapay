import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyChargeDestination } from "@/lib/contacts";
import { parseNaturalCharge } from "./parse-charge";
import { tryParseNewContact } from "./parse-contact";

describe("parseNaturalCharge", () => {
  it("parses cobro 20 xlm a juanito", () => {
    const r = parseNaturalCharge("cobro 20 xlm a juanito");
    assert.ok(r);
    assert.equal(r!.scheme, "exact");
    assert.equal(r!.amount, "20.0000000");
    assert.equal(r!.asset, "XLM");
    assert.equal(r!.contactQuery, "juanito");
  });

  it("parses long form with llamado", () => {
    const r = parseNaturalCharge(
      "cobrar 5,5 usdc a mi contacto llamado Juan Pérez",
    );
    assert.ok(r);
    assert.equal(r!.scheme, "exact");
    assert.equal(r!.amount, "5.5000000");
    assert.equal(r!.asset, "USDC");
    assert.equal(r!.contactQuery, "Juan Pérez");
  });

  it("parses email destination", () => {
    const r = parseNaturalCharge("cobro 20 xlm a cliente@tienda.com");
    assert.ok(r);
    assert.equal(r!.contactQuery, "cliente@tienda.com");
    assert.equal(classifyChargeDestination(r!.contactQuery).kind, "email");
  });

  it("parses phone destination", () => {
    const r = parseNaturalCharge("cobro 5 usdc a +56912345678");
    assert.ok(r);
    assert.equal(r!.asset, "USDC");
    assert.equal(classifyChargeDestination(r!.contactQuery).kind, "phone");
  });

  it("parses chilean pesos exact-pay (default USDC)", () => {
    const r = parseNaturalCharge("cobro 20000 pesos a juanito");
    assert.ok(r);
    assert.equal(r!.scheme, "exact_pay");
    assert.equal(r!.fiatCurrency, "CLP");
    assert.equal(r!.fiatAmount, "20000");
    assert.equal(r!.asset, "USDC");
    assert.equal(r!.contactQuery, "juanito");
  });

  it("parses pesos chilenos + mil + phone", () => {
    const r = parseNaturalCharge("cobro 15 mil pesos chilenos a +56912345678");
    assert.ok(r);
    assert.equal(r!.scheme, "exact_pay");
    assert.equal(r!.fiatAmount, "15000");
    assert.equal(r!.fiatCurrency, "CLP");
    assert.equal(classifyChargeDestination(r!.contactQuery).kind, "phone");
  });

  it("parses clp en xlm", () => {
    const r = parseNaturalCharge("cobro 20000 clp en xlm a maria");
    assert.ok(r);
    assert.equal(r!.scheme, "exact_pay");
    assert.equal(r!.asset, "XLM");
    assert.equal(r!.fiatCurrency, "CLP");
  });

  it("parses exact-split reseller percent", () => {
    const r = parseNaturalCharge(
      "cobro 20000 pesos a juanito con hubby 7%",
    );
    assert.ok(r);
    assert.equal(r!.scheme, "exact_pay");
    assert.equal(r!.contactQuery, "juanito");
    assert.equal(r!.resellerQuery, "hubby");
    assert.equal(r!.resellerFeeBps, 700);
  });

  it("rejects garbage", () => {
    assert.equal(parseNaturalCharge("hola"), null);
    assert.equal(parseNaturalCharge("1"), null);
  });
});

describe("tryParseNewContact", () => {
  it("parses Nuevo: pipe phone", () => {
    const r = tryParseNewContact("Nuevo: Juanito|+56911223344");
    assert.ok(r);
    assert.equal(r!.display_name, "Juanito");
    assert.equal(r!.phone_e164, "+56911223344");
  });

  it("parses Contacto: pipe email", () => {
    const r = tryParseNewContact("Contacto: Ana|ana@tienda.com");
    assert.ok(r);
    assert.equal(r!.display_name, "Ana");
    assert.equal(r!.email, "ana@tienda.com");
  });

  it("parses space-separated phone", () => {
    const r = tryParseNewContact("Nuevo: Juan +56911223344");
    assert.ok(r);
    assert.equal(r!.display_name, "Juan");
    assert.equal(r!.phone_e164, "+56911223344");
  });

  it("parses agregar contacto", () => {
    const r = tryParseNewContact("agregar contacto Pedro|+5491112345678");
    assert.ok(r);
    assert.equal(r!.display_name, "Pedro");
  });
});
