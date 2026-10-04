import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import ProductDetails from "../pages/productDetails";
import { checkProductNow, getProductHistory } from "../api/productApi";
import type { ProductHistoryResponse } from "../types/product";

vi.mock("../api/productApi", () => ({ checkProductNow: vi.fn(), getProductHistory: vi.fn() }));
vi.mock("../components/pricechart/priceChart", () => ({ default: () => createElement("div", null, "Price chart") }));
const data: ProductHistoryResponse = {
  product: { id: 1, name: "Saved Daraz item", url: "https://daraz.com.np/products/x-i123.html", price: 1000,
    image_url: null, availability: "removed", last_checked_at: "2026-10-02T12:00:00Z" },
  history: [{ id: 1, product_id: 1, price: 1000, checked_at: "2026-10-01T12:00:00Z" }],
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.mocked(getProductHistory).mockResolvedValue(data);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const showDetails = () => render(createElement(MemoryRouter, { initialEntries: ["/product/1"] },
  createElement(Routes, null, createElement(Route, { path: "/product/:id", element: createElement(ProductDetails) }))));

it("shows confirmed Daraz removal while retaining the recorded price chart", async () => {
  showDetails();
  expect(await screen.findByText(/This product has been removed from/)).toBeTruthy();
  expect(screen.getByText("Price chart")).toBeTruthy();
  expect(screen.getByText(/The price shown is its last recorded price/)).toBeTruthy();
});

it("keeps saved history visible when a manual check fails, and permits retry", async () => {
  vi.mocked(checkProductNow).mockRejectedValueOnce(new Error("Network timeout"))
    .mockResolvedValueOnce({ ...data, product: { ...data.product, availability: "available" } });
  showDetails();
  const button = await screen.findByRole("button", { name: "Check now" });
  fireEvent.click(button);
  expect(await screen.findByText(/The check could not finish/)).toBeTruthy();
  expect(screen.getByText("Price chart")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Check now" }));
  await waitFor(() => expect(screen.getByText("Listing available at the last successful check.")).toBeTruthy());
});

it("never lets an old manual check replace the next product's details", async () => {
  let finishCheck!: (response: ProductHistoryResponse) => void;
  vi.mocked(checkProductNow).mockReturnValue(new Promise((resolve) => { finishCheck = resolve; }));
  const next = { ...data, product: { ...data.product, id: 2, name: "Second item" } };
  vi.mocked(getProductHistory).mockImplementation(async (id) => id === 1 ? data : next);
  render(createElement(MemoryRouter, { initialEntries: ["/product/1"] },
    createElement(Link, { to: "/product/2" }, "Next item"),
    createElement(Routes, null, createElement(Route, { path: "/product/:id", element: createElement(ProductDetails) }))));
  fireEvent.click(await screen.findByRole("button", { name: "Check now" }));
  fireEvent.click(screen.getByRole("link", { name: "Next item" }));
  expect(await screen.findByRole("heading", { name: "Second item" })).toBeTruthy();
  await act(async () => { finishCheck(data); });
  expect(screen.getByRole("heading", { name: "Second item" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Saved Daraz item" })).toBeNull();
});

it("rejects a non-positive product ID without requesting history", () => {
  render(createElement(MemoryRouter, { initialEntries: ["/product/0"] },
    createElement(Routes, null, createElement(Route, { path: "/product/:id", element: createElement(ProductDetails) }))));
  expect(screen.getByText("Invalid product ID.")).toBeTruthy();
  expect(getProductHistory).not.toHaveBeenCalled();
});
