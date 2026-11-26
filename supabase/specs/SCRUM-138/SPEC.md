# SPEC — SCRUM-138: parse_size_text no reconoce "gr", "uds", "gal" y ruido de scraping como "grea"

Ticket: [SCRUM-138](https://tacha.atlassian.net/browse/SCRUM-138) · Dueño: Daniel Salas · Sprint 4
Origen: encontrado validando SCRUM-131 contra los datos reales de `scrap-bd` (2026-10-10). Fuera de alcance de ese PR por convención del proyecto (no expandir el alcance de un PR en silencio).

Ver también: [docs/documento-proyecto.md §4.7](../../../docs/documento-proyecto.md#47-web-scraping--motor-de-datos-prioridad-alta-del-proyecto) (decisión de arquitectura, 2026-11-01) · [supabase/specs/SCRUM-131/tasks.md](../SCRUM-131/tasks.md) tarea 6 (de donde sale este ticket) · [SCRUM-139/SPEC.md](../SCRUM-139/SPEC.md) (mismo origen, arreglar ambos antes de SCRUM-132) · [SCRUM-132/SPEC.md](../SCRUM-132/SPEC.md) (depende de este ticket)

## 1. Intención

`parse_size_text` (migración `002_add_normalize_staging_functions.sql`) solo reconoce litros, mililitros, kilogramos, gramos (en sus formas largas) y unidades (`paquete x N`, `pack x N`, `N unidades/u/und`). 8 filas reales de `product_catalog_staging` quedan `rejected` por esto — 2 de ellas son arroz real que de otra forma hubiera matcheado limpio a la madre "Arroz" (ver tabla en §2). El parseo de tamaño ocurre **antes** de que el normalizador de SCRUM-131 intente asignar una madre, así que estas filas nunca llegan a esa lógica — cada scrape futuro va a seguir perdiendo productos con este tipo de texto de tamaño.

## 2. Evidencia (datos reales, confirmados en el ticket de Jira contra `scrap-bd`, 2026-10-10)

| `scraped_name` | `scraped_size_text` | Problema |
|---|---|---|
| Arroz Precocido Tio Pelon 6p 6000gr | Arroz Precocido Tio Pelon 6p 6000gr | abreviatura `gr`, no `g`/`gramo`/`gramos`; además notación de multipack `6p` |
| Arroz Y Frijol Tio Pelon 5p 7000gr | Arroz Y Frijol Tio Pelon 5p 7000gr | igual, `5p` |
| Cereal Vitalisimo Pocketini Leche 375gr | Cereal Vitalisimo Pocketini Leche 375gr | abreviatura `gr` |
| Paleta Pops Leche Galleta Choc 60 Gr | Paleta Pops Leche Galleta Choc 60 Gr | abreviatura `Gr` |
| Empanada Marcelino Dulce De Leche - 8 uds | Empanada Marcelino Dulce De Leche - 8 uds | `uds` no reconocido (solo `unidad`/`u`/`und`) |
| Leche Semidescremada Dos Pinos Liquida - 1 gal | Leche Semidescremada Dos Pinos Liquida - 1 gal | galones (`gal`), sin ningún patrón hoy |
| Helado Dulce De Leche Alaska 500grea | Helado Dulce De Leche Alaska 500grea | ruido de scraping: `grea` |
| Helado Dulce De Leche Alaska 972grea | Helado Dulce De Leche Alaska 972grea | igual |

Las 8 devuelven `parsed_unit = null` contra `parse_size_text(scraped_size_text)`.

### Causa raíz de "grea" (confirmada en el código, 2026-11-01 — no es un bug de nuestro scraping)

`catalogRepository.ts:60` llena `scraped_size_text` directo desde `item.nameComplete` de la respuesta de VTEX (tipo `VtexItem.nameComplete`, `_shared/types.ts`). VTEX entrega ese campo ya con el sufijo pegado (ej. "...500g ea", donde "ea" es la abreviatura de VTEX para "each"/unidad suelta, sin espacio) — es el formato de origen del dato, no algo que introduce nuestra Edge Function. El patrón de `parse_size_text` usa `\M` (límite de palabra) justo después de la unidad, así que aunque se agregue el alias `gr`, "500grea" sigue sin matchear porque después de "gr" viene "ea" (sigue siendo texto de palabra, no hay límite ahí). El fix es solo en `parse_size_text` — tolerar ese sufijo conocido — no en `stageProducts`/la Edge Function, al contrario de lo que especulaba el ticket original.

## 3. Alcance

**Sí incluye:**
- Alias `gr` para gramos (junto a `g`/`gramo`/`gramos`).
- Alias `uds` para unidades (junto a `unidad`/`u`/`und`).
- Patrón para galones (`gal`, `galon`, `galones`), convertido a `ml` (decisión 2026-11-01, documento-proyecto.md §4.7: 1 gal ≈ 3785 ml, mismo patrón que litros→ml y kg→g).
- Tolerar el sufijo de ruido "ea" pegado a la unidad de gramos (ej. "500grea" → 500 g) sin abrir la puerta a falsos positivos — ver plan.md §2 para el patrón exacto.
- Confirmar que la notación de multipack (`6p`, `5p`) sigue sin producir un `base_quantity` incorrecto una vez agregado el alias `gr` (hoy se ignora como ruido porque el regex de cantidad solo busca el patrón de unidad; hay que confirmar que seguir ignorándolo no cambia con los patrones nuevos).

**No incluye:**
- Cambiar qué campo de VTEX se usa como `scraped_size_text` (seguiría siendo `item.nameComplete`) — cambiar a otro campo de VTEX (si existiera uno más limpio) requeriría confirmarlo contra la API real en vivo, fuera de alcance de este ticket.
- Nada de SCRUM-131 (matching por madre) ni SCRUM-139 (desempate/over-matching) — este ticket es solo `parse_size_text`.

## 4. Criterios de aceptación (Jira, adaptados)

- [ ] Las 8 filas reales de §2 parsean correctamente (`parsed_unit`/`parsed_quantity` no nulos, valores correctos).
- [ ] `gr` reconocido como alias de gramos; `uds` como alias de unidades.
- [ ] `gal`/`galon`/`galones` convertido a `ml` (factor 3785).
- [ ] "500grea"/"972grea" parsean a 500 g / 972 g (no a un valor distinto por el sufijo).
- [ ] La notación de multipack (`6p`, `5p`) confirmada que no produce un `base_quantity` incorrecto (caso de prueba, no necesariamente un fix si ya se comporta bien).
- [ ] Ningún caso que hoy parsea correctamente cambia de resultado (test de regresión).
- [ ] Migración sigue la regla de SCRUM-134.

## 5. Aviso al equipo

No toca ninguna tabla nueva ni cambia ningún contrato de función pública (`parse_size_text` mantiene su firma) — no hace falta aviso especial más allá del aviso estándar de migración antes de aplicarla.
