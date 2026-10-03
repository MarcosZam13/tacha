interface RecaptchaRenderOptions {
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
  sitekey: string;
}

export interface RecaptchaWindow extends Window {
  grecaptcha?: {
    ready: (callback: () => void) => void;
    render: (container: HTMLElement, options: RecaptchaRenderOptions) => number;
    reset: (widgetId: number) => void;
  };
}