export type CommonResponse<T> = {
  success: true;
  data: T;
};

export type ErrorResponse = {
  success: false;
  code: string;
  message: string;
};

export type ApiResponse<T> = CommonResponse<T> | ErrorResponse;
