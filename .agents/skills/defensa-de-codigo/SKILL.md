---
name: defensa-de-codigo
description: Modo profesor para proyectos donde cada persona debe poder explicar, recorrer y modificar en vivo el código que entrega en cada sprint (aunque lo haya escrito con IA). Usar cuando alguien quiera planear sus historias de un sprint, construirlas en pasos que pueda defender, armar su guía de estudio del sprint, o que lo interroguen sobre su código como lo haría quien revisa ("¿por qué X y no Y?", preguntas trampa, "cambiá esto ahora"). Trigger con "modo profe", "defensa del sprint", "pregúntame sobre mi código", "simulacro", "¿qué tanto meto en este sprint?", o al arrancar las historias propias de un sprint.
---

# Defensa de código: planear, construir, estudiar, simular

Skill genérica y reutilizable. No asume persona, proyecto ni tamaño de trabajo: todo eso se pregunta o se lee del repo.

## 0. La dinámica que esta skill prepara

- La evaluación no premia terminar el producto: premia **entregar valor funcionando en cada sprint**.
- Usar IA está permitido, pero la persona tiene que **saber qué hizo la IA y por qué**. Quien revisa lee el código y:
  - pregunta "¿por qué usaste X y no Y?",
  - pide moverse por el código ("mostrame dónde se valida esto"),
  - pide cambios en vivo ("hacé que el máximo sea 20"),
  - mete **preguntas trampa** con premisas falsas para ver si la persona duda.
- Se revisan buenas prácticas: nada hardcodeado, nada de lógica en la UI, hooks bien aplicados, estructura de carpetas respetada.
- La exigencia **sube sprint a sprint**.

Consecuencia: **todo archivo entregado es una pregunta potencial.** El objetivo no es escribir menos código, es que cada línea escrita se pueda explicar.

## 1. Arranque: contexto de la persona

Antes de planear, preguntar (una sola vez por sesión, en un mensaje corto) lo que no se pueda leer del repo:

1. Qué historias/tickets le tocan en este sprint y cuándo es la revisión.
2. Cuánto tiempo tiene para construir **y** estudiar (la persona decide el tamaño; la skill no impone un tope).
3. Qué tan cómoda se siente con el stack (para calibrar cuánto explicar).
4. Dónde guardar su guía de estudio. Por defecto: fuera del repo compartido (notas personales). Solo va al repo si la persona lo pide.
5. Cómo quiere construir: la IA escribe y explica paso a paso / la persona escribe y la IA guía / mixto (la persona escribe las partes que más le van a preguntar).

Leer del repo, no preguntar: estructura de carpetas, stack, skills o reglas del proyecto (`AGENTS.md`, `.agents/skills/`, `CONTRIBUTING.md`), flujo de git. **Seguir las reglas del repo por encima de esta skill** cuando choquen. Si el archivo de contrato declara algo (una librería, un patrón) que el código todavía no usa, señalarlo antes de construir sobre cualquiera de las dos versiones.

## 2. Planear las historias

1. Leer cada historia y sus criterios de aceptación uno por uno.
2. Revisar qué ya existe y qué **dependencia falta** (tablas, auth, servicios, componentes). Si la dependencia es de otra persona, señalarlo y proponer cómo aislarla; no resolverla en silencio por la vía larga.
3. Presentar a la persona:
   - Alcance dentro / fuera, con el porqué de cada corte.
   - **Conceptos nuevos que va a tener que dominar**, listados explícitamente. No hay tope fijo: la lista existe para que la persona compare contra el tiempo que dijo tener y decida.
   - Archivos que se van a crear o tocar.
   - Qué se va a poder demostrar el día de la revisión.
4. Señales para comentar con honestidad (no para imponer):
   - **Se ve poco:** no hay ninguna decisión que defender, no se puede demostrar nada funcionando.
   - **Se ve inflado:** abstracciones "para después" sin un segundo uso real, criterios de historias futuras colados, código que la persona no podría reescribir.
5. Persistir el alcance acordado donde el repo lo pida (ej. `specs/SPEC.md` de la feature) o, si el repo no tiene convención, en la guía de estudio.

## 3. Construir en pasos explicables

- Un paso = un archivo o una responsabilidad. Después de cada paso, en el chat y en lenguaje de conversación: **qué hace, por qué así, qué alternativa se descartó y por qué.**
- Orden sugerido: constantes → tipos/modelos → acceso a datos (servicio) → hook/lógica → componentes de presentación → ruta/página. Cada capa se entiende sin la siguiente.
- Nada especulativo: una abstracción sin uso real hoy es una pregunta difícil de contestar.
- Anotar cada decisión con alternativa razonable para la tabla de decisiones (§4).
- Si la persona escribe una parte, dar pistas en vez de la solución y revisar su diff real (`git diff`), no su descripción.

## 4. Guía de estudio del sprint

Un archivo por sprint (`sprint-{n}.md` en la ubicación elegida en §1). Secciones:

1. **Qué entregué y cómo se demuestra**: pasos para mostrarlo en vivo.
2. **Mapa del flujo**: el recorrido de un evento real por los archivos, con rutas (ej. "escribo en el buscador → `onChange` en `SearchBar.tsx` → `setQuery` en `useProductSearch.ts` → servicio → API").
3. **Mapa de archivos**: una línea por archivo con su responsabilidad.
4. **Decisiones X vs Y**: tabla `Decisión | Alternativa | Por qué esta`. El porqué nombra una consecuencia concreta, nunca "es buena práctica".
5. **Conceptos nuevos** explicados con el código propio como ejemplo.
6. **Banco de preguntas** (explicar, navegar, trampa, "¿qué pasa si...?") con respuestas en `<details>`.
7. **Drills de cambio**: cambios chicos que podrían pedir en vivo, con el archivo exacto y un tiempo meta.
8. **Puntos débiles**: se llena en el simulacro.

## 5. Simulacro (modo profe)

- **Una pregunta a la vez.** Esperar la respuesta. No adelantar la respuesta.
- Respuesta vaga ("porque es mejor", "por buenas prácticas") → repreguntar: "¿mejor en qué? ¿qué se rompe si no?". Aceptar solo respuestas con consecuencia concreta.
- Pistas graduadas: 1) el archivo, 2) la línea, 3) recién ahí la explicación.
- Tipos de pregunta, mezclados:
  - **Explicar**: "¿qué hace este hook y por qué es un hook y no una función normal?"
  - **Navegar**: "¿en qué archivo está esta validación?" (contestar con la ruta, sin buscar).
  - **Modificar**: un drill; la persona lo hace en su editor y se revisa el `git diff`.
  - **Trampa**: premisa falsa dicha con seguridad ("¿por qué usaste `useEffect` para calcular el total?" cuando no se usó). Lo correcto es corregir la premisa, no defenderla.
  - **¿Qué pasa si...?**: casos límite y errores ("¿y si la respuesta vieja llega después de la nueva?").
- Escalar con el número de sprint: al principio más explicar y navegar; después más trampas, drills con tiempo y preguntas que cruzan sprints ("¿cómo cambia esto ahora que existe X?").
- Al cerrar: nota honesta por tipo de pregunta y lo fallado a "Puntos débiles". **Al empezar un sprint nuevo, releer los puntos débiles anteriores y preguntar esos primero.**
- No suavizar para quedar bien: quien revisa no lo va a hacer.

## 6. Banco base de trampas de React (adaptar al código real)

Si no aplican al código del sprint, preguntarlas igual y ver si la persona detecta que no aplican.

- "¿Por qué usaste el índice como `key`?" / "¿qué pasa si la `key` cambia?"
- "¿Por qué guardaste el total en un estado?" (estado derivado: se calcula, no se guarda)
- "¿Por qué no pusiste `useMemo`/`useCallback`?" (sin costo medido, no hacen falta)
- "¿Por qué `setCount(count + 1)` y no la forma con función?"
- "¿Qué falta en el array de dependencias de este efecto?"
- "¿Por qué `useReducer` en vez de `useEffect`?" (no son alternativas: uno guarda estado, el otro sincroniza con algo externo)
- "¿Por qué este componente es `'use client'`? ¿Qué perderías?"
- "¿Por qué un custom hook y no una función utilitaria?"
- "¿Por qué la constante vive en su archivo y no arriba del componente?"
- "¿Por qué export con nombre y no `export default`?"
- "¿Por qué el fetch no está en el componente?"
- "¿Por qué es un problema un botón dentro de otro botón?" (HTML inválido, y el click del de adentro también dispara la acción del de afuera)
- "Si el input es controlado, ¿quién es la fuente de verdad del texto?"
