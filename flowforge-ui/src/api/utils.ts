/**
 * Unwrap the ApiResponse envelope `{ success, data, ... }` that the backend
 * (and the mock adapter) wraps every response in.
 *
 * If the response is already the raw value (no `.data` wrapper) it is returned
 * as-is so callers are safe against both shapes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const unwrap = <T>(resData: any): T => (resData?.data ?? resData) as T
