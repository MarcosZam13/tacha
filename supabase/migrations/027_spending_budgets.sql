-- ============================================================================
-- SCRUM-69 (HU-37): ver gasto total por periodo — presupuestos
--
-- Cada usuario con cuenta registrada guarda un presupuesto diario, uno semanal
-- y uno mensual, independientes, para compararlos en Finanzas con lo que gastó
-- en el periodo en curso (features/finance/specs/SPEC.md §5, D1 y D6).
--
-- Partes:
-- 1. Tabla spending_budgets: una fila por dueño y tipo de periodo.
-- 2. RLS y permisos por columna, como meal_plans (019): solo el dueño, y solo
--    si la sesión no es anónima.
-- 3. set_spending_budget: crea o reemplaza el presupuesto de quien llama.
--
-- No cambia purchase_sessions ni ninguna otra tabla. El gasto se lee con la
-- RLS de 016, que no se toca (SPEC regla 7).
--
-- Contrato (SPEC §12). set_spending_budget devuelve la fila guardada.
-- Sin cuenta registrada (sin sesión o anónima): 42501. Periodo o monto
-- inválido: 22023.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabla
-- ----------------------------------------------------------------------------

create table public.spending_budgets (
  -- Como meal_plans (019): el dueño sale del default, nunca del cliente.
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Los mismos valores que SPENDING_PERIOD en features/finance/constants/.
  period text not null check (period in ('day', 'week', 'month')),
  -- Colones enteros, de 0 a 9.999.999.999: el mismo tope que total_amount
  -- numeric(12, 2) de purchase_sessions (016). Sin precisión en el tipo a
  -- propósito: con numeric(12, 2) un insert directo de 12.004 se redondearía
  -- a 12 en silencio antes del check; así se rechaza, igual que en la RPC.
  -- NaN necesita su propia condición: en Postgres NaN es igual a sí mismo y
  -- mayor que cualquier número, así que ni ">= 0" ni "= trunc" lo rechazan
  -- (mismo motivo que el check de total_amount en 018). Infinity y -Infinity
  -- quedan fuera por el rango.
  amount numeric not null
    check (amount <> 'NaN' and amount >= 0 and amount <= 9999999999 and amount = trunc(amount)),
  -- Un presupuesto por dueño y tipo de periodo. También es el índice que usa
  -- la FK de owner_id (es su primera columna).
  primary key (owner_id, period)
);

-- ----------------------------------------------------------------------------
-- 2. RLS y permisos: nace activado (deny por defecto). Los permisos por columna
-- dicen QUÉ se puede escribir; las políticas, en QUÉ filas.
-- ----------------------------------------------------------------------------

alter table public.spending_budgets enable row level security;

revoke all on public.spending_budgets from public, anon, authenticated;
grant select, delete on public.spending_budgets to authenticated;
-- owner_id sale de su default: el cliente solo elige el periodo y el monto.
grant insert (period, amount) on public.spending_budgets to authenticated;
-- Cambiar un presupuesto es cambiar su monto: el periodo de una fila no cambia.
grant update (amount) on public.spending_budgets to authenticated;

-- Las cuatro políticas exigen lo mismo: que la fila sea de quien llama y que
-- la sesión no sea anónima. Una sesión anónima de Supabase también tiene el
-- rol authenticated; se distingue por el claim is_anonymous del JWT, con la
-- misma expresión que las RPC de household (011 a 024). Los (select ...) hacen
-- que se evalúe una vez por consulta y no por fila.

create policy "registered owner reads own budgets"
  on public.spending_budgets for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  );

create policy "registered owner creates own budgets"
  on public.spending_budgets for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  );

create policy "registered owner updates own budgets"
  on public.spending_budgets for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  )
  with check (
    owner_id = (select auth.uid())
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  );

-- La pantalla no borra presupuestos; el dueño puede quitar los suyos (y así
-- se limpian después de las pruebas manuales).
create policy "registered owner removes own budgets"
  on public.spending_budgets for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  );

-- ----------------------------------------------------------------------------
-- 3. set_spending_budget: crear y editar son la misma operación. Si el
-- presupuesto de ese periodo no existía se crea; si existía se reemplaza
-- (SPEC regla 14). security invoker, como assign_meal_slot (019): la RLS y los
-- permisos por columna de arriba aplican igual dentro de la función, así que
-- no puede escribir el presupuesto de otro. Las validaciones de acá dan un
-- error claro antes de los checks de la tabla.
-- ----------------------------------------------------------------------------

create or replace function public.set_spending_budget(budget_period text, budget_amount numeric)
returns public.spending_budgets
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_budget public.spending_budgets;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Se requiere una cuenta registrada para guardar un presupuesto'
      using errcode = '42501';
  end if;

  if budget_period is null or budget_period not in ('day', 'week', 'month') then
    raise exception 'Periodo de presupuesto inválido'
      using errcode = '22023';
  end if;

  -- El NaN primero: cualquier comparación con NaN da un resultado engañoso.
  if budget_amount is null
    or budget_amount = 'NaN'
    or budget_amount < 0
    or budget_amount <> trunc(budget_amount)
    or budget_amount > 9999999999 then
    raise exception 'Monto de presupuesto inválido'
      using errcode = '22023';
  end if;

  insert into public.spending_budgets (period, amount)
  values (budget_period, budget_amount)
  on conflict (owner_id, period) do update
    set amount = excluded.amount
  returning * into saved_budget;

  return saved_budget;
end;
$$;

-- Supabase da execute a anon y authenticated por defecto en las funciones de
-- public: se quita a public y anon y se deja solo a authenticated.
revoke execute on function public.set_spending_budget(text, numeric) from public, anon;
grant execute on function public.set_spending_budget(text, numeric) to authenticated;
