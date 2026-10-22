import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { RECAPTCHA, RECAPTCHA_SITE_KEY } from "@/constants";
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
  // Sin clave del sitio, Google lanza "Missing required parameters: sitekey" al dibujar (SCRUM-137, F3):
  // se muestra el mismo aviso que cuando el script no carga y ni se pide el script.
  const isMissingSiteKey = RECAPTCHA_SITE_KEY === "";

  // Sincroniza con algo externo (el script de Google): por eso es un efecto.
  useEffect(() => {
    if (isMissingSiteKey) return undefined;
    let isCancelled = false;

    const renderWidget = (): void => {
      const grecaptcha = getRecaptchaWindow().grecaptcha;
      const container = containerRef.current;
      if (isCancelled || !grecaptcha || !container) return;

      grecaptcha.ready(() => {
        // Se revisa acá y no antes: ready() puede disparar después, y dos llamadas dibujarían el widget dos veces.
        if (isCancelled || widgetIdRef.current !== null) return;
        // render lanza si Google rechaza la configuración (clave inválida, contenedor ya usado): sin este
        // try/catch el error quedaba sin atrapar y el botón seguía deshabilitado sin ningún mensaje.
        try {
          widgetIdRef.current = grecaptcha.render(container, {
            callback: onTokenChange,
            "error-callback": () => onTokenChange(undefined),
            "expired-callback": () => onTokenChange(undefined),
            sitekey: RECAPTCHA_SITE_KEY,
          });
        } catch {
          setHasLoadError(true);
        }
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
  }, [onTokenChange, isMissingSiteKey]);

  // Cada vez que el ViewModel del login sube el contador, el widget se reinicia (el token ya se gastó).
  useEffect(() => {
    const grecaptcha = getRecaptchaWindow().grecaptcha;
    const widgetId = widgetIdRef.current;
    if (grecaptcha && widgetId !== null) grecaptcha.reset(widgetId);
  }, [resetCount]);

  return { containerRef, hasLoadError: hasLoadError || isMissingSiteKey };
};