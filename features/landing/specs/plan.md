# Plan técnico: landing pública

Deriva de [SPEC.md](SPEC.md). Pasos en [tasks.md](tasks.md).

## Archivos

```
features/landing/
  Landing.tsx                  arma la página: navbar, hero y footer
  components/
    PublicNavbar.tsx           navbar (HU-01)
    Logo.tsx                   logo enlazado al inicio (HU-01, HU-11)
    ButtonLink.tsx             enlace con forma de botón (navbar y hero)
    HeroSection.tsx            sección principal (HU-02)
    PublicFooter.tsx           pie de página (HU-08)
    SocialLinks.tsx            redes sociales (HU-09)
  models/NavLink.interface.ts  forma de un enlace de la navbar
  constants/landing.constants.ts  textos, rutas y URLs
public/logo-marca/logo.png     logo provisional
app/page.tsx                   ruta: renderiza <Landing />
```

## Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Todo dentro de `features/landing/` | Navbar y footer en una carpeta compartida | Hoy hay una sola página pública; se comparten cuando exista About |
| `ButtonLink` (enlace con estilo de botón) | `<Link><Button/></Link>` | Un botón dentro de un enlace es HTML inválido |
| Enlaces de la navbar desde un array de constantes | Escribir cada enlace a mano | Agregar una sección es una línea, sin tocar el componente |
| En móvil los enlaces bajan de fila | Menú hamburguesa con estado | Sin estado no hace falta `"use client"` ni ViewModel |
| Logo guardado en `public/` | Cargarlo desde otra web | No depende de otro sitio ni requiere configuración extra |
| Contacto por Instagram | Inventar un correo | Un correo falso sería un enlace roto |
