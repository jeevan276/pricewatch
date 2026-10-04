export interface BackendApiErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export function parseBackendValidationErrors(errorResponse: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!errorResponse || typeof errorResponse !== "object" || !("detail" in errorResponse)) return fieldErrors;
  if (Array.isArray(errorResponse.detail)) {
    errorResponse.detail.forEach((err: BackendApiErrorDetail) => {
      const fieldName = err.loc[err.loc.length - 1];
      if (fieldName) {
        fieldErrors[fieldName.toString()] = err.msg;
      }
    });
  } else if (typeof errorResponse?.detail === "string") {
    fieldErrors["general"] = errorResponse.detail;
  }

  return fieldErrors;
}