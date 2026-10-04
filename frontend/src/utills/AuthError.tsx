import axios from "axios";

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const detail = error.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail.flatMap((item: unknown) =>
      item && typeof item === "object" && "msg" in item && typeof item.msg === "string" ? [item.msg] : []);
    if (messages.length) return messages.join(" ");
  }
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return "The server took too long to respond. Please try again.";
  if (!error.response) return "Could not reach the server. Check your connection and retry.";
  return fallback;
};