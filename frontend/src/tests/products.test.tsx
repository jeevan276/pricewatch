import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useProducts } from "../hooks/useProducts";
import { getProducts, trackProduct } from "../api/productApi";
import { setAuthData } from "../utills/auth";
import type { Product, ProductTrackResponse } from "../types/product";

vi.mock("../api/productApi", () => ({ getProducts: vi.fn(), trackProduct: vi.fn(), deleteProduct: vi.fn() }));
const product: Product = { id: 1, name: "Product", url: "https://daraz.com.np/products/x-i123.html", price: 100, image_url: null };
const response: ProductTrackResponse = { message: "Saved", status: "new", product, old_price: null, new_price: 100, difference: null, percentage: null };
beforeEach(() => {
  vi.resetAllMocks();
  setAuthData("token", { id: 1, email: "test@example.com", created_at: "2026-01-01" });
});
afterEach(() => { cleanup(); localStorage.clear(); });

it("allows tracking during a slow list request and keeps the new item", async () => {
  let resolveList!: (products: Product[]) => void;
  vi.mocked(getProducts).mockImplementation(() => new Promise((resolve) => { resolveList = resolve; }));
  vi.mocked(trackProduct).mockResolvedValue(response);
  const { result } = renderHook(() => useProducts());
  await waitFor(() => expect(result.current.fetching).toBe(true));
  expect(result.current.loading).toBe(false);
  await act(async () => { await result.current.addProduct(product.url); });
  await act(async () => { resolveList([{ ...product, id: 2, name: "Existing" }]); });
  expect(result.current.products.map((p) => p.id)).toEqual([1, 2]);
  expect(result.current.loading).toBe(false);
});

it("unlocks tracking after failure so the next attempt can succeed", async () => {
  vi.mocked(getProducts).mockResolvedValue([]);
  vi.mocked(trackProduct).mockRejectedValueOnce(new Error("Temporary retailer failure")).mockResolvedValueOnce(response);
  const { result } = renderHook(() => useProducts());
  await waitFor(() => expect(getProducts).toHaveBeenCalled());
  await act(async () => { await result.current.addProduct(product.url).catch(() => undefined); });
  expect(result.current.loading).toBe(false);
  expect(result.current.error).toContain("Temporary");
  await act(async () => { await result.current.addProduct(product.url); });
  expect(result.current.products).toHaveLength(1);
  expect(result.current.error).toBeNull();
  expect(localStorage.getItem("access_token")).toBe("token");
});

it("ignores a late list response after switching accounts", async () => {
  let resolveOld!: (products: Product[]) => void;
  vi.mocked(getProducts).mockImplementationOnce(() => new Promise((r) => { resolveOld = r; })).mockResolvedValue([]);
  const { result } = renderHook(() => useProducts());
  await waitFor(() => expect(getProducts).toHaveBeenCalledTimes(1));
  act(() => setAuthData("other-token", { id: 2, email: "other@example.com", created_at: "2026-01-01" }));
  await waitFor(() => expect(getProducts).toHaveBeenCalledTimes(2));
  await act(async () => { resolveOld([product]); });
  expect(result.current.products).toEqual([]);
});
