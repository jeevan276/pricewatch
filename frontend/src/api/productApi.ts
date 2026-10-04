import api from "../lib/api";

import type {
  Product,
  ProductCompareRequest,
  ProductCompareResponse,
  ProductHistoryResponse,
  ProductTrackResponse,
  ProductUpdateRequest,
} from "../types/product";

const PRODUCT_ENDPOINTS = {
  base: "/products",
  track: "/products/track",
  compare: "/products/compare",
} as const;

const productEndpoint = (id: number) =>
  `${PRODUCT_ENDPOINTS.base}/${id}`;

const productHistoryEndpoint = (id: number) =>
  `${productEndpoint(id)}/history`;

export const getProducts = async (): Promise<Product[]> => {
  const { data } = await api.get<Product[]>(
    `${PRODUCT_ENDPOINTS.base}/`,
  );

  return data;
};


export const trackProduct = async (
  url: string,
): Promise<ProductTrackResponse> => {
  try {
    const { data } = await api.post<ProductTrackResponse>(
      PRODUCT_ENDPOINTS.track,
      { url },
      { timeout: 50_000 },
    );

    return data;
  } catch (error: unknown) {
    const detail =
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof error.response === "object" &&
      error.response !== null &&
      "data" in error.response &&
      typeof error.response.data === "object" &&
      error.response.data !== null &&
      "detail" in error.response.data &&
      typeof error.response.data.detail === "string"
        ? error.response.data.detail
        : null;

    if (detail) {
      throw new Error(detail, { cause: error });
    }

    throw new Error("Could not reach the server or retailer. Please retry; you do not need to sign in again.", {
      cause: error,
    });
  }
};



export const getProductHistory = async (
  id: number,
): Promise<ProductHistoryResponse> => {
  const { data } = await api.get<ProductHistoryResponse>(
    productHistoryEndpoint(id),
  );

  return data;
};

export const updateProduct = async (
  id: number,
  data: ProductUpdateRequest,
): Promise<Product> => {
  const { data: product } = await api.put<Product>(
    productEndpoint(id),
    data,
  );

  return product;
};

export const deleteProduct = async (
  id: number,
): Promise<void> => {
  await api.delete(productEndpoint(id));
};

export const compareProducts = async (
  data: ProductCompareRequest,
): Promise<ProductCompareResponse> => {
  const { data: comparison } =
    await api.post<ProductCompareResponse>(
      PRODUCT_ENDPOINTS.compare,
      data,
      { timeout: 50_000 },
    );

  return comparison;
};


export const checkProductNow = async (id: number): Promise<ProductHistoryResponse> => {
  const { data } = await api.post<ProductHistoryResponse>(`${productEndpoint(id)}/check`, {}, { timeout: 50_000 });
  return data;
};

export const setProductThreshold = async (id: number, targetPrice: number | null): Promise<Product> => {
  const { data } = await api.patch<Product>(`${productEndpoint(id)}/threshold`, { target_price: targetPrice });
  return data;
};
