import { describe, expect, it, vi } from "vitest";
import { enterEditMode, loginAndEnterEditMode } from "./editSession";

describe("CMS edit-session flow", () => {
  it("does not start editing before authentication", async () => {
    const startEditing = vi.fn();

    const result = await enterEditMode("home", {
      sessionStatus: vi.fn().mockResolvedValue({ authenticated: false }),
      startEditing,
    });

    expect(result).toBe("login-required");
    expect(startEditing).not.toHaveBeenCalled();
  });

  it("reuses an authenticated browser session", async () => {
    const startEditing = vi.fn();

    const result = await enterEditMode("about", {
      sessionStatus: vi.fn().mockResolvedValue({ authenticated: true }),
      startEditing,
    });

    expect(result).toBe("started");
    expect(startEditing).toHaveBeenCalledWith("about");
  });

  it("starts editing only after login succeeds", async () => {
    const calls: string[] = [];

    await loginAndEnterEditMode("key", "services", {
      login: vi.fn(async () => {
        calls.push("login");
      }),
      startEditing: vi.fn(async () => {
        calls.push("edit");
      }),
    });

    expect(calls).toEqual(["login", "edit"]);
  });

  it("does not start editing when login fails", async () => {
    const startEditing = vi.fn();

    await expect(
      loginAndEnterEditMode("wrong", "home", {
        login: vi.fn().mockRejectedValue(new Error("Unauthorized")),
        startEditing,
      }),
    ).rejects.toThrow("Unauthorized");
    expect(startEditing).not.toHaveBeenCalled();
  });
});
