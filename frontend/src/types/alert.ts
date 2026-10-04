export interface Alert {
  id: number;
  user_id: number;
  product_id: number;

  old_price: number;
  new_price: number;
  difference: number;
  percentage: number;

  message: string;
  is_read: number;
  created_at: string;
}

export interface AlertListResponse {
  alerts: Alert[];
  count: number;
  unread_count: number;
}