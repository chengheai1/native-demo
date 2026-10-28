export type ApiResponse<T> = {
  code: number | string;
  data: T;
  message: string;
};

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  return response.data;
}
