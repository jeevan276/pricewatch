import { useCallback, useEffect, useRef, useState } from "react";
import { deleteProduct, getProducts, trackProduct } from "../api/productApi";
import { useAuth } from "./useAuth";
import { getAccessToken } from "../utills/auth";
import type { Product, ProductTrackResponse } from "../types/product";

export const useProducts = (enabled = true) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false); // Only mutations disable tracking.
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const revision = useRef(0);
  const removed = useRef(new Set<number>());

  const fetchProducts = useCallback(async () => {
    if (!enabled) return;
    const token = getAccessToken();
    const version = revision.current;
    setFetching(true);
    try {
      const data = await getProducts();
      // A pre-add list response must not overwrite a newly tracked product.
      if (token === getAccessToken()) {
        if (version === revision.current) setProducts(data);
        else setProducts((current) => [
          ...current,
          ...data.filter((item) => !removed.current.has(item.id) && !current.some((p) => p.id === item.id)),
        ]);
        setError(null);
      }
    } catch {
      if (token === getAccessToken()) setError("Could not load products. You can retry or track a product.");
    } finally {
      if (token === getAccessToken()) setFetching(false);
    }
  }, [enabled]);

  useEffect(() => {
    revision.current += 1;
    pending.current = false;
    removed.current.clear();
    const timer = window.setTimeout(() => {
      setProducts([]);
      setLoading(false);
      setFetching(false);
      setError(null);
      if (enabled) void fetchProducts();
    }, 0);
    return () => { window.clearTimeout(timer); revision.current += 1; };
  }, [enabled, user?.id, fetchProducts]);

  const addProduct = useCallback(async (url: string): Promise<ProductTrackResponse | null> => {
    if (pending.current) return null;
    const token = getAccessToken();
    ++revision.current;
    pending.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await trackProduct(url);
      if (token === getAccessToken()) {
        setProducts((items) => [response.product, ...items.filter((p) => p.id !== response.product.id)]);
      }
      return response;
    } catch (err) {
      if (token === getAccessToken()) setError(err instanceof Error ? err.message : "Could not track product. Please retry.");
      throw err;
    } finally {
      if (token === getAccessToken()) {
        pending.current = false;
        setLoading(false);
      }
    }
  }, []);

  const removeProduct = useCallback(async (id: number) => {
    const token = getAccessToken();
    ++revision.current;
    try {
      await deleteProduct(id);
      if (token === getAccessToken()) removed.current.add(id);
      if (token === getAccessToken()) setProducts((items) => items.filter((p) => p.id !== id));
    } catch (err) {
      if (token === getAccessToken()) setError("Could not delete product. Please retry.");
      console.error(err);
    }
  }, []);

  return { products, loading, fetching, error, fetchProducts, addProduct, removeProduct };
};
