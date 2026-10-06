export interface Product {
  id: number;
  name: string;
  url: string;
  price: number;
  image_url: string | null;
  availability?: "unknown" | "available" | "out_of_stock" | "removed";
  last_checked_at?: string | null;
  last_successful_check_at?: string | null;
  removed_at?: string | null;
  last_check_error?: string | null;
  target_price?: number | null;
  threshold_reached?: boolean;
  email_alerts_available?: boolean;
}

export interface PriceHistory {
  id: number;
  product_id: number;
  price: number;
  checked_at: string;
}

export interface ProductHistoryResponse {
  product: Product;
  history: PriceHistory[];
}

export type PriceChangeStatus =
  | "new"
  | "existing"
  | "decreased"
  | "increased"
  | "unchanged";

export interface ProductTrackResponse {
  message: string;
  status: PriceChangeStatus;
  old_price: number | null;
  new_price: number;
  difference: number | null;
  percentage: number | null;
  product: Product;
}

export interface ProductUpdateRequest {
  name: string;
  url: string;
  price: number;
}

export interface ProductCompareRequest {
  daraz_url?: string;
  onlinesaathi_url?: string;
  hamrobazar_url?: string;
  mychoice_url?: string;
}

export type CompareSiteStatus =
  | "success"
  | "error"
  | "not_found"
  | "unavailable";

export interface CompareSiteResponse {
  site: string;
  status: string;
  name: string | null;
  price: number | null;
  url: string | null;
  image_url: string | null;
}

export interface ProductCompareResponse {
  product: string | null;
  sites: CompareSiteResponse[];
  offers: CompareSiteResponse[];
  cheapest: CompareSiteResponse | null;
  highest: CompareSiteResponse | null;
  difference: number;
}

export interface ApiError {
  detail: string;
}
