import type { TermsSection } from "../models/TermsSection.interface";

export const TERMS_TEXT = {
  LAST_UPDATED: "Última actualización: 5 de octubre de 2026",
  TITLE: "Términos y condiciones",
} as const;

export const TERMS_SECTIONS: readonly TermsSection[] = [
  {
    id: "aceptacion",
    paragraphs: ["Al crear una cuenta o usar Tacha aceptás estos términos. Si no estás de acuerdo, no uses la plataforma."],
    title: "Aceptación",
  },
  {
    id: "servicio",
    paragraphs: [
      "Tacha es un proyecto académico que permite organizar listas de compras compartidas, registrar gastos y consultar precios de referencia de supermercados.",
      "El servicio es gratuito y no garantiza disponibilidad continua.",
    ],
    title: "Qué es Tacha",
  },
  {
    id: "cuenta",
    paragraphs: ["Sos responsable de mantener tu contraseña en secreto y de la actividad de tu cuenta."],
    title: "Tu cuenta",
  },
  {
    id: "hogares",
    paragraphs: [
      "Quien administra un hogar puede invitar y quitar integrantes.",
      "Lo que agregás a una lista compartida lo ven todos los integrantes del hogar.",
    ],
    title: "Hogares compartidos",
  },
  {
    id: "precios",
    paragraphs: [
      "Los precios se toman de los sitios públicos de los supermercados y son aproximados. Pueden diferir del precio en tienda.",
    ],
    title: "Precios de referencia",
  },
  {
    id: "uso",
    paragraphs: [
      "No se permite usar Tacha para actividades ilegales, intentar entrar a cuentas ajenas ni enviar solicitudes automatizadas.",
    ],
    title: "Uso permitido",
  },
  {
    id: "datos",
    paragraphs: [
      "Guardamos solo los datos necesarios para que la app funcione: nombre, correo, listas y compras. No los vendemos ni los compartimos con terceros.",
      "Podés pedir que eliminemos tu cuenta escribiéndonos por Instagram.",
    ],
    title: "Datos personales",
  },
  {
    id: "cambios",
    paragraphs: ["Podemos actualizar estos términos. La fecha de la última actualización aparece al inicio."],
    title: "Cambios",
  },
];
