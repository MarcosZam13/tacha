# Plan técnico: cerrar sesión

Deriva de [SPEC.md](SPEC.md). Pasos en orden en [tasks.md](tasks.md).

## SCRUM-55: cerrar sesión

### Archivos

```
components/sign-out-button/
  SignOutButton.tsx                    botón y diálogo de confirmación (solo presentación)
  hooks/
    useSignOutViewModel.ts             estado idle/confirming/signingOut, pedir, confirmar, cancelar, cerrar y redirigir
  models/
    SignOutViewModel.interface.ts
  constants/
    sign-out.constants.ts              textos y estados
  tests/
    SignOutButton.page.ts · SignOutButton.test.tsx · useSignOutViewModel.test.ts
  specs/  SPEC.md · plan.md · tasks.md

Registro de cambios sin guardar (compartido)
  services/unsaved-changes.service.ts  setUnsavedChanges(fuente, hay), hasUnsavedChanges(), subscribeToUnsavedChanges()
  hooks/useUnsavedChanges.ts           useReportUnsavedChanges(fuente, hay) y useHasUnsavedChanges()
  constants/unsaved-changes.constants.ts   UNSAVED_CHANGES_SOURCE { PROFILE }
  services/tests/unsaved-changes.service.test.ts

Quién lo usa
  components/app-shell/components/AppSidebar.tsx    + <SignOutButton /> al pie, bajo el enlace al perfil
  features/profile/Profile.tsx                      + <SignOutButton /> al final
  features/profile/hooks/useProfileViewModel.ts     + useReportUnsavedChanges(PROFILE, hasChanges)
  (tests de app-shell y de profile: el mock de next/navigation suma useRouter)
```

### Datos

Sin tablas, RLS, RPC ni Edge Functions: no hay migración.

### Flujo

Toco "Cerrar sesión" → `SignOutButton` llama a `handleRequest` del ViewModel. Si `useHasUnsavedChanges()` es falso, `performSignOut` pasa a `signingOut`, espera `signOutUser()` (no lanza; tope de 5 s) y hace `router.replace("/login")`. Si es verdadero, pasa a `confirming` y se muestra el `Modal`: "Cerrar sesión" llama a `performSignOut`; "Seguir editando", `Escape` o el clic fuera vuelven a `idle`.

En el otro extremo, `useProfileViewModel` llama a `useReportUnsavedChanges(PROFILE, hasChanges)`: un efecto marca la fuente en el servicio cuando `hasChanges` es verdadero y la retira cuando es falso o al desmontar. El servicio avisa a los suscriptores y `useSyncExternalStore` hace que el botón lea siempre el valor actual.

### Decisiones

| Decisión | Alternativa | Por qué esta |
|---|---|---|
| Componente compartido en `components/sign-out-button/` | Feature `features/sign-out/` | El sidebar (`components/`) no puede importar de `features/`, y `features/profile` no puede importar de otra feature. `components/password-input/` ya es un compartido con hooks y modelos |
| Servicio con suscripción + `useSyncExternalStore` para los cambios sin guardar | Context, Zustand o prop drilling | El equipo no eligió patrón de estado de cliente (nextjs-enterprise-patterns §3). El sidebar y el formulario de Perfil no comparten árbol de props, y esto sigue el patrón que ya existe (`subscribeToSessionChanges`) sin agregar una librería. Costo: un estado global de módulo; por eso es mínimo y se limpia al desmontar |
| Una fuente por pantalla (`Set` de ids) | Un solo booleano global | Con un booleano, la pantalla A al desmontarse borraría el aviso de la B. Con ids, cada una retira solo el suyo |
| Efecto con limpieza para informar | Informar en cada render | Es sincronizar con algo externo (el registro): eso es un efecto, y la limpieza garantiza que al salir de la pantalla no quede un aviso viejo |
| Solo Perfil informa hoy | Registrar todas las pantallas | El criterio lo pide donde hay una edición pendiente y solo Perfil tiene borrador. Las demás guardan al instante; las que lo necesiten usan el mismo hook |
| `signOutUser` (alcance local) | `signOut` global | El criterio habla de proteger "dispositivos compartidos": cerrar este navegador basta, y cerrar los demás sorprendería a quien usa la app en el celular |
| `router.replace` al login | `push` | Con `push`, "atrás" volvería a una pantalla privada sin sesión (igual que la inactividad) |
| Confirmación con el `Modal` compartido | `window.confirm` | `confirm` no se estiliza, no es accesible por rol y no se puede probar bien |
| Estado como unión `idle \| confirming \| signingOut` | Booleanos `isConfirming` e `isSigningOut` | Dos booleanos admiten "confirmando y cerrando a la vez" |
| Sin marca de "cierre manual" | Reutilizar el aviso de inactividad | Ese aviso explica un cierre que la persona no pidió; en un cierre manual no hay nada que explicar |

### Conceptos nuevos

- **Alcance del cierre de sesión** (`local` frente a `global`) y qué cierra cada uno.
- **`useSyncExternalStore`** y por qué es la forma correcta de leer un estado que vive fuera de React.
- **Estado de módulo** con suscripción, y su limpieza para no dejar avisos viejos.
- **`replace` frente a `push`** al salir de una zona privada.

### Puesta en marcha

1. No hay migración ni configuración.
2. Probar en desktop y en mobile: cerrar sin cambios; editar el nombre en Perfil y cerrar (debe pedir confirmación); cancelar; guardar y volver a cerrar (ya inmediato); "atrás" tras cerrar.
