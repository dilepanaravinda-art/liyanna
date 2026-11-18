import { describe, it, expect } from "vitest";
import { canTransition, requireTransition } from "./lifecycle";

describe("commercial lifecycle policy", () => {
  it("permits approved quotation progress", () => {
    expect(canTransition("quote", "draft", "pending_approval")).toBe(true);
    expect(canTransition("quote", "accepted", "converted")).toBe(true);
  });
  it("blocks approval bypass and reversal of final states", () => {
    expect(canTransition("quote", "draft", "sent")).toBe(false);
    expect(canTransition("invoice", "paid", "draft")).toBe(false);
    expect(() => requireTransition("invoice", "draft", "paid")).toThrow();
  });
});
