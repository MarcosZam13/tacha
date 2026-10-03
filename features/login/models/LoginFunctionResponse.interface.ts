export interface LoginFunctionResponse {
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export interface LoginFunctionError {
  code?: string;
}
