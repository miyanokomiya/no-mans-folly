import { expect, describe, test, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AuthResult } from "./AuthResult";

describe("AuthResult", () => {
  beforeEach(() => {
    cleanup();
  });

  test("Successful view", () => {
    render(<AuthResult callbackAction="" backHome={false} />);
    expect(screen.queryByText("successful", { exact: false })).toBeTruthy();
    expect(screen.queryByText("open external workspace", { exact: false })).toBeTruthy();
  });
  test("Error view", () => {
    render(<AuthResult callbackAction="auth_error" backHome={false} />);
    expect(screen.queryByText("failed", { exact: false })).toBeTruthy();
    expect(screen.queryByText("retry Google Auth", { exact: false })).toBeTruthy();
  });
  test("Retrieval view", () => {
    render(<AuthResult callbackAction="retrieval" backHome={false} />);
    expect(screen.queryByText("Data syncing will work", { exact: false })).toBeTruthy();
  });
  test("No drive scope view", () => {
    render(<AuthResult callbackAction="no_google_drive_scope" backHome={false} />);
    expect(screen.queryByText("not yet granted", { exact: false })).toBeTruthy();
  });
  test("Close view", () => {
    render(<AuthResult callbackAction="" backHome={true} />);
    expect(screen.queryByText("Back", { exact: false })).toBeTruthy();
  });
  test("Close view", () => {
    render(<AuthResult callbackAction="" backHome={false} />);
    expect(screen.queryByText("may not work", { exact: false })).toBeTruthy();
  });
});
