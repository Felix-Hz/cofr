import { isPasswordValid, PASSWORD_RULES } from "./password";

describe("password validation", () => {
  it("rejects short password", () => {
    expect(isPasswordValid("Aa1!xy")).toBe(false);
  });

  it("rejects no uppercase", () => {
    expect(isPasswordValid("abcd1234!")).toBe(false);
  });

  it("rejects no lowercase", () => {
    expect(isPasswordValid("ABCD1234!")).toBe(false);
  });

  it("rejects no number", () => {
    expect(isPasswordValid("Abcdefgh!")).toBe(false);
  });

  it("rejects no special char", () => {
    expect(isPasswordValid("Abcdefg1")).toBe(false);
  });

  it("accepts valid password", () => {
    expect(isPasswordValid("Test1234!")).toBe(true);
  });

  it("PASSWORD_RULES has 5 rules with label and test", () => {
    expect(PASSWORD_RULES).toHaveLength(5);
    for (const rule of PASSWORD_RULES) {
      expect(rule).toHaveProperty("label");
      expect(rule).toHaveProperty("test");
      expect(typeof rule.label).toBe("string");
      expect(typeof rule.test).toBe("function");
    }
  });
});
