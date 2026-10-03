import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { RECAPTCHA, RECAPTCHA_SITE_KEY } from "../constants/login.constants";
import type { RecaptchaWidgetProps } from "../models/RecaptchaWidgetProps.interface";
import type { RecaptchaWidgetViewModel } from "../models/RecaptchaWidgetViewModel.interface";
import type { RecaptchaWindow } from "../models/RecaptchaWindow.interface";

const getRecaptchaWindow = (): RecaptchaWindow => window as RecaptchaWindow;

const createRecaptchaScript = (): HTMLScriptElement => {
  const script = document.createElement("script");
  script.id = RECAPTCHA.SCRIPT_ID;
  script.src = RECAPTCHA.SCRIPT_URL;
  script.async = true;
  return script;
};

export const useRecaptchaWidgetViewModel = ({
  onTokenChange,
  resetCount,
}: RecaptchaWidgetProps): RecaptchaWidgetViewModel => {
  const containerRef = useRef<NullableRef<HTMLDivElement>>(null);
  const widgetIdRef = useRef<NullableRef<number>>(null);
  const [hasLoadError, setHasLoadError] = useState(false);

  // Sincroniza con algo externo (el script de Google): por eso es un efecto.
  useEffect(() => {
    let isCancelled = false;

    const renderWidget = (): void => {
      const grecaptcha = getRecaptchaWindow().grecaptcha;
      const container = containerRef.current;
      if (isCancelled || !grecaptcha || !container) return;

      grecaptcha.ready(() => {
        // Se revisa acá y no antes: ready() puede disparar después, y dos llamadas dibujarían el widget dos veces.
        if (isCancelled || widgetIdRef.current !== null) return;
        widgetIdRef.current = grecaptcha.render(container, {
          callback: onTokenChange,
          "error-callback": () => onTokenChange(undefined),
          "expired-callback": () => onTokenChange(undefined),
          sitekey: RECAPTCHA_SITE_KEY,
        });
      });
    };

    const handleError = (): void => setHasLoadError(true);

    const existingScript = document.getElementById(RECAPTCHA.SCRIPT_ID);
    const script = existingScript ?? createRecaptchaScript();
    script.addEventListener("load", renderWidget);
    script.addEventListener("error", handleError);
    if (!existingScript) document.head.appendChild(script);
    renderWidget(); // si el script ya estaba cargado

    return () => {
      isCancelled = true;
      script.removeEventListener("load", renderWidget);
      script.removeEventListener("error", handleError);
    };
  }, [onTokenChange]);

  // Cada vez que el ViewModel del login sube el contador, el widget se reinicia (el token ya se gastó).
  useEffect(() => {
    const grecaptcha = getRecaptchaWindow().grecaptcha;
    const widgetId = widgetIdRef.current;
    if (grecaptcha && widgetId !== null) grecaptcha.reset(widgetId);
  }, [resetCount]);

  return { containerRef, hasLoadError };
};