import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AxiosError } from "axios";
import ProductCompare from "../pages/ProductCompare";
import ProtectedRoute from "../routes/ProtectedRoute";
import { compareProducts } from "../api/productApi";
import { getApiErrorMessage } from "../utills/AuthError";
import { signUpSchema } from "../utills/validationSchemas";
import { clearAuth, setAuthData } from "../utills/auth";

vi.mock("../api/productApi", () => ({ compareProducts: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); });
afterEach(() => { cleanup(); localStorage.clear(); });

it("submits OnlineSaathi with the backend's field name", async () => {
  vi.mocked(compareProducts).mockResolvedValue({ product: null, sites: [], offers: [], cheapest: null, highest: null, difference: 0 });
  render(createElement(ProductCompare));
  fireEvent.click(screen.getByRole("button", { name: "Daraz" }));
  fireEvent.click(screen.getByRole("button", { name: "OnlineSathi" }));
  fireEvent.change(screen.getByLabelText("Daraz Product URL"), { target: { value: "https://daraz.com.np/products/x-i123.html" } });
  fireEvent.change(screen.getByLabelText("OnlineSathi Product URL"), { target: { value: "https://onlinesaathi.com/product/test" } });
  fireEvent.click(screen.getByRole("button", { name: "Compare Prices" }));
  await waitFor(() => expect(compareProducts).toHaveBeenCalledWith({
    daraz_url: "https://daraz.com.np/products/x-i123.html", onlinesaathi_url: "https://onlinesaathi.com/product/test",
  }));
});

it("reacts to sign-out immediately on a protected route", async () => {
  setAuthData("token", { id: 1, email: "test@example.com", created_at: "2026-01-01" });
  render(createElement(MemoryRouter, { initialEntries: ["/protected"] }, createElement(Routes, null,
    createElement(Route, { path: "/protected", element: createElement(ProtectedRoute, { children: createElement("p", null, "Private page") }) }),
    createElement(Route, { path: "/signin", element: createElement("p", null, "Sign in page") }))));
  expect(screen.getByText("Private page")).toBeTruthy();
  act(() => clearAuth());
  expect(await screen.findByText("Sign in page")).toBeTruthy();
});

it("explains backend validation and network timeout errors", () => {
  const error = new AxiosError("Validation failed");
  Object.assign(error, { response: { data: { detail: [{ msg: "Password must be 72 UTF-8 bytes or fewer." }] } } });
  expect(getApiErrorMessage(error, "Failed")).toContain("72 UTF-8 bytes");
  expect(getApiErrorMessage(new AxiosError("timeout", "ECONNABORTED"), "Invalid password")).toContain("took too long");
});

it("rejects passwords that exceed bcrypt's byte limit before sending signup", () => {
  const password = "A1!" + "é".repeat(36);
  expect(signUpSchema.safeParse({ email: "test@example.com", password, confirmPassword: password }).success).toBe(false);
});
