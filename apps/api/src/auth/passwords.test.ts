import { describe, expect, it } from "vitest";
import { hashPassword, validPassword, verifyPassword } from "./passwords.js";

describe("password storage",()=>{
 it("requires strong minimum length and caps input size",()=>{
  expect(validPassword("short")).toBe(false);
  expect(validPassword("a".repeat(12))).toBe(true);
  expect(validPassword("a".repeat(1025))).toBe(false);
 });
 it("uses unique salts and verifies only the matching password",async()=>{
  const password="a-long-unique-password";
  const a=await hashPassword(password),b=await hashPassword(password);
  expect(a).not.toBe(b);
  expect(a).toMatch(/^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/);
  expect(a).not.toContain(password);
  expect(await verifyPassword(password,a)).toBe(true);
  expect(await verifyPassword("another-long-password",a)).toBe(false);
  expect(await verifyPassword(password,"invalid-hash")).toBe(false);
 });
});
