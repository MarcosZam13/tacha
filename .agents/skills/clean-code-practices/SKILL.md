# Clean Code & Repository Practices

Usar este skill al escribir, revisar, o reestructurar código. Aplica en cualquier cambio no trivial, no solo cuando alguien pide explícitamente "código limpio".

El estándar: **alguien sin ningún contexto debería poder abrir este repo, leer la estructura, y entender qué está pasando en 5 minutos — sin tener que preguntarle a nadie del equipo.**

Para este stack (Next.js/React/TypeScript), aplicar también [nextjs-enterprise-patterns](../nextjs-enterprise-patterns/SKILL.md) y sus complementos ([component-architecture](../component-architecture/SKILL.md), [constants-standards](../constants-standards/SKILL.md), [unit-testing-standards](../unit-testing-standards/SKILL.md)) encima de esto — cubren arquitectura por feature, separación ViewModel, eliminación de magic numbers/strings, y testing con Page Object Model que este skill genérico no trata.

## 1. Nombrado

- Los nombres dicen qué ES o qué HACE algo, nunca cómo está implementado. `getActiveUsers()`, no `loopUsersAndFilter()`.
- Los booleanos se leen como pregunta sí/no: `isLoading`, `hasPermission`, `canEdit`.
- Sin abreviaciones salvo que sean estándar de dominio (`id`, `url` están bien; `usrCfg` no). Lista concreta prohibida:

  | Evitar | Usar en su lugar |
  |---|---|
  | `err` | `error` |
  | `res` | `response` |
  | `req` | `request` |
  | `cb` | `callback` |
  | `ctx` | `context` |
  | `val` | `value` |
  | `idx` | `index` (`i` está bien para un contador de loop simple) |
  | `msg` | `message` |
  | `evt` | `event` |
  | `data` solo | prefijar con el dominio: `householdData`, `shoppingItems` |

- Vocabulario consistente en todo el código: elegir un término (`fetch` vs `get` vs `retrieve`) y usarlo siempre — mezclarlos hace pensar que hay una diferencia semántica cuando no la hay.
- Los nombres de archivo coinciden con su export/contenido principal: `UserCard.tsx` exporta `UserCard`.

## 2. Funciones y módulos

- Una función hace una sola cosa. Si hace falta un "y" para describirla, hay que dividirla.
- Preferir funciones puras (mismo input → mismo output, sin efectos secundarios ocultos) donde viva la lógica de negocio; aislar efectos secundarios (llamadas a DB, API, I/O de archivos) en los bordes.
- Funciones lo bastante cortas para verse en una pantalla. Si una función necesita scroll para leerse, probablemente hace demasiado.
- Guard clauses sobre if/else anidados — retornar temprano en vez de envolver el "happy path" en tres niveles de indentación.
- Evitar números/strings mágicos — nombrarlos como constantes con intención (`MAX_RETRIES = 3`, no un `3` suelto en medio de la lógica).

## 3. Patrones de diseño — usar cuando resuelven un problema real, no por defecto

| Patrón | Usarlo cuando |
|---|---|
| Repository | Hace falta poder cambiar/mockear la fuente de datos (Supabase hoy, otra cosa mañana) sin tocar la lógica de negocio |
| Strategy | Hay varios algoritmos/comportamientos intercambiables elegidos en runtime |
| Factory | La creación de un objeto tiene suficiente lógica de ramificación como para merecer su propia función/clase |
| Observer / pub-sub | Varias partes de la app necesitan reaccionar al mismo evento (ej. actualizaciones de Supabase Realtime) |
| Adapter | Envolver una API/SDK de terceros para que el resto de la app no dependa de su forma exacta |
| Singleton | Raro — sobre todo para cosas como una única instancia de conexión a DB. Patrón sobreusado; evitar usarlo por defecto |

Regla general: **no introducir un patrón para verse sofisticado.** Introducirlo cuando quitarlo haría el código más difícil de cambiar. Si hay duda, escribir primero la versión simple — los patrones emergen cuando aparece duplicación o complejidad de ramificación real.

## 4. Estructura del repositorio — lo que determina si alguien "se pierde"

Un desconocido debería poder predecir dónde vive un archivo sin buscar:

```
tacha/
├── README.md                 ← qué es esto, cómo correrlo, cómo desplegarlo. Lo primero que abre cualquiera.
├── docs/                      ← documento de proyecto, decisiones de arquitectura, modelo de datos
├── app/
│   ├── (rutas)/                ← solo rutas, delgadas — sin lógica de negocio acá
│   ├── components/             ← features de UI, una carpeta por feature (ver component-architecture)
│   ├── lib/ o services/        ← clientes de API, wrappers de terceros, funciones utilitarias puras
│   ├── constants/               ← constantes (ver constants-standards)
│   └── types/                   ← tipos TypeScript compartidos
├── supabase/
│   ├── migrations/            ← numeradas, una migración = un cambio revisable
│   └── seed.sql
└── .github/workflows/          ← CI/CD
```

Reglas estructurales clave:
- **Agrupar por dominio/feature, no por tipo técnico**, una vez que el proyecto crece más allá de un puñado de archivos.
- **Las rutas se mantienen delgadas.** Llaman a `components/<feature>/` o a `services/` — no contienen lógica de negocio ellas mismas. Esto es lo que hace un repo navegable: la lógica vive en un solo lugar predecible.
- **Sin archivos huérfanos en la raíz.** La ubicación de cada archivo debería poder inferirse de lo que hace.
- **Una migración nueva por cambio de schema**, secuencial y nombrada descriptivamente (`003_add_purchase_sessions.sql`), nunca editada después de aplicada.

## 5. Documentación que no es decoración

- **README.md es obligatorio** y responde, en orden: qué es esto, cómo correrlo localmente, cómo desplegarlo, dónde están los puntos de entrada principales.
- Los comentarios explican **por qué**, nunca **qué** — el código ya dice qué hace. `// reintentando porque el sandbox del gateway corta conexiones después de 30s` es útil; `// recorre los usuarios` es ruido.
- Documentar decisiones que no son obvias desde el código mismo (por qué Supabase en vez de Firebase, por qué este modelo de datos en vez de una alternativa) en `docs/`, no dispersas en comentarios.
- Toda función/API pública en un módulo compartido lleva un docstring: propósito, parámetros, retorno, y casos límite — no una repetición de la firma.

## 6. Checklist de escalabilidad (aplicar proporcionalmente — no sobre-ingenierizar un proyecto de curso)

- La lógica de negocio no conoce el framework de UI ni el cliente de DB específico directamente — pasa por una abstracción (capa de servicio/repository) para que cambiar cualquiera de los dos después no genere cascada.
- Los valores específicos de entorno viven en variables de entorno/config, nunca hardcodeados.
- El manejo de errores es consistente en toda la app (una sola convención de forma de error), no ad hoc por archivo.
- Las features nuevas deberían poder agregarse sin modificar archivos no relacionados — si agregar una cosa implica tocar código en cinco lugares no relacionados, la estructura necesita revisarse.

## 7. Aplicando esto en la práctica

1. Revisar naming y tamaño de función primero — son los arreglos más baratos con mayor retorno en legibilidad.
2. Revisar si el archivo está en el lugar correcto según la estructura de arriba; sugerir moverlo si no.
3. Solo sugerir un patrón de diseño si hay un problema concreto de duplicación/complejidad que resuelve — nombrar el problema, no solo el patrón.
4. Al revisar un repo existente, señalar problemas estructurales antes que nitpicks a nivel de línea — la estructura es lo que determina si alguien se pierde.
