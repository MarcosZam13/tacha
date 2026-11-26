# Plan E2E: recetas

Deriva de [SPEC.md](SPEC.md). Formato y reglas: `.agents/skills/playwright-e2e`. Los tests están en `e2e/features/recipes/recipes.spec.ts`. Cubre la foto (SCRUM-161) y compartir (SCRUM-162); asignar, agregar y eliminar recetas tienen escenarios en `features/meal-planner/specs/E2E.md` y `features/shopping-list/specs/E2E.md`.

Nivel más bajo que alcanza: tipos y tamaño, el orden al guardar, los fallos de la base y la limpieza están en `features/recipes/tests/`; permisos, rutas y políticas del bucket, en `supabase/tests/059_recipe_photos.test.sql`.

## Datos y entorno

- **Usuario:** cada test abre un navegador nuevo, así que la app crea un usuario anónimo nuevo sin recetas.
- **Producto:** se busca `leche` y se elige el primer resultado. Supuesto: el catálogo de la base compartida tiene al menos uno.
- **Foto:** un PNG de 1 × 1 creado en el test.
- **Migración:** requiere la `059` y la `060` aplicadas.
- **Limpieza:** se borran los archivos y las recetas con el token de esa sesión. El usuario anónimo queda.

## Escenarios

### E2E-RECETAS-01: crear una receta con foto y verla después de recargar

- **Cubre:** SCRUM-161 CA-01 y CA-03.
- **Pasos:** llenar una receta nueva, elegir una foto, guardar, recargar el catálogo.
- **Resultado esperado:** se ve la vista previa antes de guardar; después, la tarjeta muestra la foto, y sigue (cargada, no rota) tras recargar.

### E2E-RECETAS-02: cambiar, quitar y eliminar borra el archivo anterior

- **Cubre:** CA-02 y CA-07.
- **Precondición:** una receta propia sin foto.
- **Pasos:** agregar una foto, cambiarla, quitarla, agregar otra y eliminar la receta.
- **Resultado esperado:** la tarjeta muestra lo que corresponde en cada paso. En la carpeta de la receta queda un archivo después de cambiar, ninguno después de quitar y ninguno después de eliminar.

### E2E-RECETAS-03: un archivo que no es una foto se rechaza

- **Cubre:** CA-04 (caso representativo; la matriz está en los unitarios).
- **Pasos:** elegir una foto y después un archivo de texto.
- **Resultado esperado:** "Elige una foto JPG, PNG o WebP." y sigue la vista previa de la primera.

### E2E-RECETAS-04: si la foto falla, la receta se guarda y reintentar no la duplica

- **Cubre:** CA-05.
- **Frontera controlada:** la subida a Storage responde 500 en el primer intento.
- **Pasos:** crear una receta con foto, ver el aviso, guardar otra vez con la subida funcionando.
- **Resultado esperado:** el aviso, con lo escrito y la vista previa intactos; después, una sola tarjeta, con su foto.

### E2E-RECETAS-05: cancelar no sube la foto elegida

- **Cubre:** regla 38 de la SPEC.
- **Precondición:** una receta propia sin foto.
- **Pasos:** elegir una foto y tocar "Cancelar".
- **Resultado esperado:** la tarjeta sigue sin foto y la carpeta de la receta está vacía.

### E2E-RECETAS-06: la foto se guarda sin ubicación y con su orientación

- **Cubre:** SCRUM-162 CA-08.
- **Dato:** un JPEG con GPS y orientación girada en sus metadatos.
- **Pasos:** crear una receta con esa foto y descargar el archivo guardado.
- **Resultado esperado:** el archivo no tiene metadatos EXIF y se ve vertical.

### E2E-RECETAS-07: sin familia no se ofrece compartir

- **Cubre:** SCRUM-162 CA-01.
- **Pasos:** abrir una receta nueva con una sesión sin familia.
- **Resultado esperado:** la base responde y no aparece "¿Para quién es?".

### Fuera del navegador

- Compartir, copiar, salir y disolver (varias cuentas registradas): `supabase/tests/060_share_recipes.test.sql` y prueba manual con dos cuentas.

- Que otro usuario no vea, suba, cambie ni borre la foto: `supabase/tests/059_recipe_photos.test.sql`.
- El límite de 5 MB y los tipos del bucket: prueba manual de QA contra la API.
