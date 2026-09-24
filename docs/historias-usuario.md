# Historias de Usuario — Tacha (v2.2)

Ver también: [README](../README.md) · [documentacion-v1.md](documento-proyecto.md) (v2.2) · [DESIGN.md](DESIGN.md)

> Desglose de cada requerimiento de [documentacion-v1.md](documento-proyecto.md) en épicas, historias de usuario (HU) y criterios de aceptación (CA), para dejar claros los módulos/pestañas/funciones antes de construir. El formato final de HU/CA puede cambiar — esto es el desglose de trabajo, no reemplaza documentacion-v1.md como fuente de los requerimientos de producto. Los requerimientos nuevos que salieron de este desglose (landing pública, autenticación extendida, invitación a household por link) ya están incorporados en [documentacion-v1.md sección 4.12](documento-proyecto.md#412-acceso-público-y-autenticación-extendida-landing-about-auth) y en [DESIGN.md](DESIGN.md).
>
> **v2.0 (2026-08-19):** se completó el desglose de todos los módulos que quedaron pendientes el 2026-08-18 (Sublistas, Listas privadas, Catálogo, Mis productos personalizados, Historial, Recetas, Planificador, Inventario, Grupos, reconciliación al tachar, perfil/sesión y household), y se agregó una sección final de síntesis de flujo (navegación + botón de entrada por cada epic) para revisar con el equipo completo. Cada HU nueva referencia su pantalla/componente correspondiente en [DESIGN.md](DESIGN.md) cuando existe.
>
> **v2.1 (2026-08-19, misma fecha, segunda pasada):** al revisar este borrador, Marcos confirmó varios cambios de rumbo respecto a lo que se había escrito primero — ver el resumen completo en el header de [documentacion-v1.md](documento-proyecto.md) (v2.2). En resumen: household único (no varios), recetas ligadas a su producto desde que se crean, modo compra simplificado (fila completa tocable, no checkbox), registro por persona también en listas privadas, inventario doméstico ampliado con vencimientos, y una epic de Configuración que faltaba.
>
> **v2.2 (2026-08-21):** pasada de limpieza pedida por Marcos antes de importar a JIRA. Cambios:
> - **Numeración completada:** los 7 ítems de la epic "Lista general" y 2 más ("Eliminar una receta", "Eliminar un grupo") no tenían número de HU ni de CA — ahora son HU-36a a HU-36g, HU-64b y HU-75b (formato de sufijo, igual que HU-34b/c o HU-70b-d, para no correr la numeración de todo el documento).
> - **HU-54 fusionada con HU-56** — eran la misma idea (crear un producto que no está en el catálogo), solo cambiaba el punto de entrada. Ver nota en la epic Catálogo.
> - **Tachar/destachar rediseñado (HU-36e):** decisión de Marcos de no usar checkbox — la fila completa es el único control, el tachado se indica visualmente sobre el texto (tachado/atenuado), y la lista general se divide en dos secciones: "Pendientes" arriba y "Tachados hoy" abajo (solo lo tachado el día de hoy; lo de días anteriores vive en Historial de compras). Esto generó un conflicto con HU-36c (Ver detalle de producto, que antes se abría tocando la fila) — **resuelto (2026-08-21): un ícono o botón específico al final de la fila abre el detalle**, en vez de tocar la fila completa.

## Roles

- **Mirones** (nombre interno) / **Visitante** (nombre de cara al usuario) — no autenticado.
- **Usuario** — autenticado.
- **Administrador** — **confirmado por el equipo el 2026-08-19: no es un rol aparte de la plataforma, ni tiene un panel especial.** Es simplemente el usuario que administra su household (grupo familiar) — puede invitar y quitar familiares, y ya. Sus HU/CA viven dentro del rol Usuario, epic "Grupo familiar (household)".

## Rol: Visitante

### Epic: Página de inicio

**HU-01: Barra de navegación**
Como visitante, quiero visualizar una barra de navegación en la página principal, para poder acceder fácilmente a las diferentes secciones disponibles de la plataforma.
- CA-01: La barra de navegación debe mostrar las opciones correspondientes a las secciones públicas disponibles.
- CA-02: Cada opción de navegación debe dirigir al visitante a la sección correspondiente.
- CA-03: La navegación debe funcionar correctamente sin que el visitante haya iniciado sesión.

**HU-02: Sección principal (Hero Section)**
Como visitante, quiero visualizar una sección principal con información relevante y una llamada a la acción (CTA), para conocer el propósito de la plataforma y acceder rápidamente a las funcionalidades principales.
- CA-01: La sección debe presentar información breve sobre el propósito de la plataforma.
- CA-02: La sección debe incluir al menos una llamada a la acción (CTA).
- CA-03: El CTA debe dirigir al visitante a la funcionalidad o sección correspondiente.
- CA-04: El contenido de la sección debe ser legible y visualizarse correctamente.

**HU-03: Información introductoria**
Como visitante, quiero visualizar una sección introductoria sobre la plataforma, para conocer brevemente sus características y propósito.
- CA-01: La página principal debe incluir una sección con información introductoria sobre la plataforma.
- CA-02: La información debe ser visible para cualquier visitante sin necesidad de iniciar sesión.
- CA-03: El contenido debe presentar una estructura visual que facilite su lectura.

**HU-04: Consultar información ampliada**
Como visitante, quiero acceder a información ampliada sobre la plataforma mediante la opción "Leer más", para conocer con mayor detalle sus características y beneficios.
- CA-01: La sección introductoria debe incluir una opción denominada "Leer más" o equivalente.
- CA-02: Al seleccionar la opción, el visitante debe ser dirigido a la información ampliada correspondiente.
- CA-03: La información ampliada debe estar disponible sin requerir autenticación.
- CA-04: La información presentada debe corresponder al contenido anunciado en la sección introductoria.
- CA-05: El visitante debe poder regresar a la página principal mediante los mecanismos de navegación disponibles.

**HU-05: Testimonios**
Como visitante, quiero visualizar testimonios de otros usuarios, para conocer sus experiencias y generar confianza en la plataforma.
- CA-01: La página principal debe incluir una sección de testimonios.
- CA-02: Cada testimonio debe mostrar la información definida para identificar al usuario que lo proporciona.
- CA-03: Los testimonios deben presentarse de manera clara y diferenciada.
- CA-04: La sección debe ser accesible sin necesidad de iniciar sesión.
- CA-05: Si los testimonios se presentan mediante un carrusel, el visitante debe poder desplazarse entre ellos mediante los controles disponibles.

**HU-06: Formulario de contacto (reCAPTCHA)**
Como visitante, quiero disponer de un formulario de contacto protegido mediante reCAPTCHA, para poder comunicarme con la organización de manera segura y evitar el envío automatizado de solicitudes.
- CA-01: La página debe proporcionar un formulario de contacto accesible para el visitante.
- CA-02: El formulario debe incluir los campos definidos como obligatorios para realizar una solicitud de contacto.
- CA-03: El sistema debe validar que los campos obligatorios hayan sido completados antes de permitir el envío.
- CA-04: El formulario debe incluir una validación mediante reCAPTCHA.
- CA-05: El sistema no debe permitir el envío del formulario cuando la validación reCAPTCHA no haya sido completada correctamente.
- CA-06: El sistema debe validar el formato de los datos ingresados cuando corresponda.
- CA-07: Una vez enviado correctamente el formulario, el visitante debe recibir una confirmación de que la solicitud fue procesada.
- CA-08: Si ocurre un error durante el envío, el sistema debe informar al visitante de manera clara.

**HU-07: Demo de uso**
Como visitante, quiero visualizar una demostración del funcionamiento de la plataforma, para comprender de manera sencilla cómo utilizarla.
- CA-01: La página principal debe incluir una sección destinada a mostrar una demostración del funcionamiento de la plataforma.
- CA-02: La demostración debe ser accesible sin necesidad de iniciar sesión.
- CA-03: El visitante debe poder reproducir la demostración mediante los controles disponibles.
- CA-04: El contenido de la demostración debe explicar o mostrar las funcionalidades principales de la plataforma.
- CA-05: La demostración debe visualizarse correctamente en los dispositivos contemplados por la plataforma.

### Epic: Pie de página (Footer)

**HU-08: Información del pie de página**
Como visitante, quiero visualizar un pie de página con información relevante de la plataforma, para acceder fácilmente a sus principales medios de contacto y recursos legales.
- CA-01: Las páginas públicas de la plataforma deben mostrar un pie de página.
- CA-02: El pie de página debe contener la información institucional definida para la plataforma.
- CA-03: El pie de página debe incluir los medios de contacto disponibles.
- CA-04: Los elementos del pie de página deben ser visibles y accesibles para el visitante.

**HU-09: Redes sociales**
Como visitante, quiero acceder a los enlaces de las redes sociales de la organización, para conocer sus diferentes canales de comunicación.
- CA-01: El pie de página debe mostrar los enlaces correspondientes a las redes sociales oficiales de la organización.
- CA-02: Cada enlace debe dirigir a la red social correspondiente.
- CA-03: Los enlaces deben ser identificables mediante texto, iconos o ambos.
- CA-04: Los enlaces deben funcionar correctamente.
- CA-05: El acceso a las redes sociales no debe requerir autenticación en la plataforma.

**HU-10: Términos y condiciones**
Como visitante, quiero consultar los términos y condiciones de la plataforma, para conocer las normas y condiciones asociadas a su utilización.
- CA-01: El pie de página debe incluir un enlace a los términos y condiciones.
- CA-02: El visitante debe poder acceder a los términos y condiciones sin iniciar sesión.
- CA-03: El enlace debe dirigir al documento o sección correspondiente.
- CA-04: El contenido debe presentar de manera clara las condiciones de uso de la plataforma.
- CA-05: El visitante debe poder regresar a la página desde la que accedió a los términos y condiciones.

**HU-11: Logotipo**
Como visitante, quiero visualizar el logotipo de la organización en el pie de página, para identificar visualmente la plataforma.
- CA-01: El pie de página debe mostrar el logotipo oficial de la organización.
- CA-02: El logotipo debe visualizarse correctamente y mantener sus proporciones.
- CA-03: El logotipo debe ser reconocible y mantenerse visible en los dispositivos contemplados.
- CA-04: Si el logotipo funciona como enlace, este debe dirigir a la página principal de la plataforma.

### Epic: Acerca de (About)

**HU-12: Misión y visión**
Como visitante, quiero consultar la misión y visión de la organización, para conocer su propósito, objetivos y orientación.
- CA-01: La sección "About" debe presentar la misión de la organización.
- CA-02: La sección "About" debe presentar la visión de la organización.
- CA-03: La misión y visión deben estar claramente diferenciadas.
- CA-04: La información debe estar disponible para cualquier visitante sin necesidad de iniciar sesión.
- CA-05: El contenido debe ser legible y presentarse de manera organizada.

**HU-13: Información de la organización**
Como visitante, quiero consultar información general sobre la organización, para conocer su origen, propósito y principales características.
- CA-01: La sección "About" debe presentar información general sobre la organización.
- CA-02: La información debe incluir los aspectos institucionales definidos para la plataforma.
- CA-03: El contenido debe estar organizado de manera que facilite su comprensión.
- CA-04: La información debe ser accesible sin necesidad de iniciar sesión.
- CA-05: El contenido debe visualizarse correctamente en los dispositivos contemplados por la plataforma.

**HU-14: Contacto desde About (reCAPTCHA)**
Como visitante, quiero disponer de un formulario de contacto protegido mediante reCAPTCHA en la sección "About", para comunicarme con la organización de forma segura.
- CA-01: La sección "About" debe incluir un formulario de contacto.
- CA-02: El formulario debe incluir los campos definidos como necesarios para realizar una solicitud.
- CA-03: El sistema debe validar los campos obligatorios antes de permitir el envío.
- CA-04: El formulario debe contar con protección mediante reCAPTCHA.
- CA-05: El sistema no debe permitir el envío si el reCAPTCHA no ha sido validado correctamente.
- CA-06: El sistema debe validar el formato de los datos ingresados cuando corresponda.
- CA-07: Después de un envío exitoso, el visitante debe recibir un mensaje de confirmación.
- CA-08: En caso de producirse un error, el sistema debe mostrar un mensaje informativo al visitante.

### Epic: Registro manual

**HU-14b: Registro con datos básicos**
Como visitante, quiero registrarme ingresando mis datos personales y una contraseña, para crear una cuenta en el sistema.
- El formulario solicita nombre, correo electrónico, contraseña y repetir contraseña.
- El sistema valida que todos los campos obligatorios estén completos antes de habilitar el botón de registro.
- El sistema muestra mensajes de error claros si algún campo es inválido o falta.
- No se permite el registro si el correo ya existe en el sistema.

**HU-15: Validar coincidencia de contraseña**
Como visitante, quiero que el sistema valide que la contraseña y su repetición coincidan, para evitar errores de digitación al crear mi cuenta.
- Si "Contraseña" y "Repetir Contraseña" no coinciden, se muestra un mensaje de error en tiempo real.
- El botón de registro permanece deshabilitado si las contraseñas no coinciden.

**HU-16: Feedback de seguridad de contraseña**
Como visitante, quiero ver una indicación visual de qué tan segura es la contraseña que estoy creando, para elegir una contraseña robusta.
- El sistema evalúa la contraseña mientras la escribe según criterios como longitud, mayúsculas, minúsculas, números y caracteres especiales.
- Se muestra un indicador visual tipo barra de progreso.
- Se informan los requisitos mínimos no cumplidos (ej. "debe incluir al menos un número").

**HU-17: Verificación de correo electrónico**
Como visitante, quiero recibir un correo electrónico después de registrarme, para confirmar que mi cuenta y dirección de correo son válidas.
- Al completar el registro, se envía automáticamente un correo con un enlace o código de verificación.
- La cuenta queda en estado "pendiente de verificación" hasta que el usuario lo confirme.
- El código de verificación tiene un tiempo de expiración definido.
- El usuario puede solicitar el reenvío del correo de verificación si no lo recibió.
- Se muestra un mensaje de confirmación cuando la verificación es exitosa.

**HU-18: Aceptación de términos y condiciones**
Como visitante, quiero aceptar los términos y condiciones antes de completar mi registro, para cumplir con las políticas legales del sistema.
- Se muestra un checkbox de aceptación de términos y condiciones, no marcado por defecto.
- El registro no puede completarse si el checkbox no está marcado.
- El usuario puede acceder al texto completo de los términos y condiciones antes de aceptar.

### Epic: Registro con Google/Facebook

**HU-19: Registro mediante proveedor externo**
Como visitante, quiero registrarme usando mi cuenta de Google o Facebook, para crear mi cuenta de forma rápida sin llenar un formulario extenso.
- Se muestran botones de "Registrarse con Google" y "Registrarse con Facebook".
- Al seleccionar una opción, el sistema redirige al flujo de autenticación OAuth del proveedor correspondiente.
- El sistema obtiene y valida la identificación del usuario (correo, nombre) desde el proveedor.
- Si el correo ya está registrado, se informa al usuario y se sugiere iniciar sesión en su lugar.

**HU-20: Completar datos faltantes tras registro social**
Como visitante, quiero completar los datos que Google/Facebook no proporcionan, para finalizar mi perfil correctamente.
- Tras la autenticación exitosa con el proveedor, se muestra un formulario con los campos faltantes requeridos por el sistema.
- El sistema valida que los campos obligatorios estén completos antes de crear la cuenta.
- La cuenta no se considera completa/activa hasta que estos datos sean ingresados.

**HU-21: Aceptación de términos y condiciones en registro social**
Como visitante, quiero aceptar los términos y condiciones al registrarme con Google/Facebook, para cumplir con las políticas legales del sistema, igual que en el registro manual.
- Se muestra el checkbox de términos y condiciones como parte del flujo posterior a la autenticación social.
- El registro no se completa si no se aceptan términos y condiciones.
- El usuario puede consultar el texto completo de los términos y condiciones.

### Epic: Login

**HU-22: Inicio de sesión con validación reCAPTCHA**
Como visitante, quiero que el sistema valide que no soy un robot al iniciar sesión, para proteger mi cuenta contra ataques automatizados.
- El formulario del login incluye un componente reCAPTCHA.
- El sistema no procesa el intento de login si el reCAPTCHA no se completa o falla.
- Se muestra un mensaje de error si la validación de reCAPTCHA no es exitosa.

**HU-23: Mostrar/ocultar contraseña**
Como visitante, quiero poder mostrar u ocultar la contraseña que escribo, para verificar que la ingresé correctamente.
- El campo de contraseña incluye un ícono tipo "ojo" para alternar la visibilidad.
- Al hacer clic, el texto cambia entre oculto (puntos) y visible (texto plano).
- El estado por defecto del campo es oculto.

**HU-24: Mensajes de error en login**
Como visitante, quiero recibir mensajes claros cuando mis credenciales son incorrectas, para entender por qué no pude iniciar sesión.
- Se muestra un mensaje de error genérico (sin especificar qué es lo que está mal) para credenciales inválidas.
- Se muestran mensajes específicos para otros casos: cuenta no verificada, cuenta bloqueada, cuenta inactiva.
- Los mensajes de error son visibles y no bloquean el formulario para reintentar.

**HU-25: Feedback de seguridad de contraseña en login**
Como visitante, quiero que el sistema me indique si mi contraseña cumple los estándares de seguridad al momento de iniciar sesión (en caso de cambios forzados), para mantener mi cuenta protegida.
- Si el sistema detecta una contraseña débil o vencida según política, se notifica al usuario.
- Se ofrece la opción de actualizar la contraseña desde el mismo flujo, cuando aplique.

**HU-26: Token de seguridad de sesión**
Como visitante, quiero que mi sesión esté protegida mediante un token de seguridad, para garantizar que mis datos e identidad estén protegidos durante el uso del sistema.
- Al iniciar sesión exitosamente, el sistema genera un token de sesión (ej. JWT).
- El token tiene un tiempo de expiración definido.
- Las peticiones al sistema requieren un token válido; de lo contrario, se redirige al login.

**HU-27: Cierre de sesión por inactividad**
Como visitante, quiero que mi sesión se cierre automáticamente tras un periodo de inactividad, para proteger mi cuenta si olvido cerrar sesión.
- El sistema contabiliza el tiempo transcurrido desde la última acción del usuario (clics, navegación, etc.).
- Al superar el tiempo límite definido (configurable), la sesión se cierra automáticamente.
- Se muestra una notificación indicando que la sesión expiró por inactividad.
- El usuario es redirigido a la pantalla de login.

### Epic: Recuperación de contraseña

**HU-28: Recuperación de contraseña**
Como visitante, quiero solicitar la recuperación de mi contraseña ingresando mi correo, para poder recuperar el acceso a mi cuenta si la olvidé.
- Existe un enlace "¿Olvidaste tu contraseña?" en la pantalla de login.
- El usuario ingresa su correo electrónico registrado.
- El sistema envía un correo con un enlace/código para restablecer la contraseña, si el correo existe.
- Se muestra un mensaje genérico de confirmación (sin revelar si el correo existe, por seguridad).

**HU-29: Vista de actualización de contraseña**
Como visitante, quiero acceder a una vista donde pueda definir una nueva contraseña tras solicitar la recuperación, para restablecer el acceso a mi cuenta.
- Al hacer clic en el enlace recibido por correo, se muestra un formulario con "Nueva contraseña" y "Repetir nueva contraseña".
- El sistema valida que ambos campos coincidan.
- Se muestra el feedback de seguridad de la contraseña (igual que en el registro).
- El enlace de recuperación tiene un tiempo de expiración; si venció, se informa al usuario y se ofrece reenviar la solicitud.
- Al actualizar la contraseña exitosamente, se muestra confirmación y se redirige al login.

## Rol: Usuario

### Epic: Perfil y sesión (sidebar)

**HU-30: Editar datos de perfil**
Como usuario, quiero editar mis datos de perfil (nombre, foto), para mantener mi información actualizada dentro de la plataforma.
- CA-01: Desde el sidebar (desktop) o "Más → Perfil" (mobile), el usuario accede a una vista de "Perfil".
- CA-02: La vista de perfil muestra nombre y foto actuales, con opción de editarlos.
- CA-03: El sistema valida los campos obligatorios (nombre) antes de guardar.
- CA-04: Al guardar exitosamente, se muestra una confirmación visual y los cambios se reflejan de inmediato en el sidebar/header.
- CA-05: Subir una foto es opcional; si no se sube ninguna, se muestra un avatar por defecto (iniciales).

**HU-31: Cambiar contraseña**
Como usuario, quiero cambiar mi contraseña desde mi perfil, para mantener mi cuenta segura sin depender del flujo de recuperación.
- CA-01: La vista de perfil incluye acceso a "Cambiar contraseña".
- CA-02: El formulario solicita contraseña actual, nueva contraseña y repetir nueva contraseña.
- CA-03: Se muestra la misma barra de fortaleza de contraseña usada en registro (HU-16) mientras se escribe la nueva.
- CA-04: El sistema valida que "Nueva contraseña" y "Repetir nueva contraseña" coincidan antes de habilitar el botón de guardar.
- CA-05: Si la contraseña actual es incorrecta, se muestra un mensaje de error específico sin exponer la contraseña real.
- CA-06: Al cambiar la contraseña exitosamente, se muestra confirmación; no es necesario cerrar sesión.

**HU-32: Cerrar sesión (logout)**
Como usuario, quiero cerrar sesión desde cualquier parte de la app, para proteger mi cuenta en dispositivos compartidos.
- CA-01: La opción "Cerrar sesión" está disponible en el sidebar (desktop) y en "Más → Perfil" (mobile), siempre visible sin necesidad de buscarla.
- CA-02: Al cerrar sesión, se cierra la sesión activa (ver HU-26) y se redirige al usuario a la landing pública o al login.
- CA-03: Si hay una acción sin guardar en curso (ej. edición de item abierta), se pide confirmación antes de cerrar sesión; de lo contrario, la acción es inmediata.

### Epic: Grupo familiar (household)

**HU-33: Crear link de invitación al household**
Como usuario administrador de un household, quiero generar un link de invitación, para que otros se unan sin tener que invitarlos uno por uno por correo.
- CA-01: Desde "Perfil/Household", el admin del household tiene un botón "Invitar a mi household" / "Generar link de invitación".
- CA-02: El link generado tiene una fecha de vencimiento.
- CA-03: El link se muestra listo para copiar (botón "Copiar link"), con confirmación visual al copiarlo.
- CA-04: El admin puede regenerar el link en cualquier momento; el link anterior deja de funcionar.
- CA-05: Si el link venció, se muestra como "expirado" y se ofrece generar uno nuevo.

**HU-34: Unirse a un household por link**
Como usuario, quiero unirme a un household usando un link o código de invitación, para formar parte del grupo familiar sin pasos adicionales.
- CA-01: Al abrir un link de invitación válido (o pegarlo en "Unirme con una invitación", ver [DESIGN.md 7.15](DESIGN.md#715-crear-o-unirse-a-un-household)), el sistema revisa que el link sea válido y no haya vencido.
- CA-02: Si el link es válido, el usuario queda agregado como miembro del household correspondiente.
- CA-03: Si el link venció o no es válido, se le informa claramente y no se le agrega a ningún household.
- CA-04: Al unirse, se muestra una confirmación y el usuario entra a la app con su household ya activo.
- CA-05: **(2026-08-19)** un usuario solo puede pertenecer a un household a la vez. Si ya pertenece a uno, no puede unirse a otro directamente — primero tiene que salir del que tiene (HU-34c).

**HU-34c: Salir de mi household**
Como usuario, quiero poder salir de mi household cuando ya no quiera seguir en él, para poder usar Tacha solo o unirme a otro grupo.
- CA-01: Desde "Perfil/Household" hay una opción "Salir del household", con confirmación explícita antes de ejecutarla (acción destructiva en cuanto a acceso compartido).
- CA-02: Si el usuario que sale es el admin y hay otros miembros, el sistema le pide elegir a quién transferir el rol de admin antes de dejarlo salir — nunca queda el household sin nadie a cargo.
- CA-03: Si el admin es el único miembro del household, al salir el household se elimina por completo (junto con su link de invitación).
- CA-04: Después de salir, el usuario vuelve al estado "sin household" — sigue teniendo su lista general y sus listas privadas, según lo que haya decidido en su momento sobre compartirlas o no (HU-34b).

**HU-34b: Decidir qué hacer con mi lista personal al unirme a un household**
Como usuario que ya usaba Tacha por mi cuenta (lista general y/o sublistas propias) y me uno o creo un household, quiero decidir si mantengo esas listas solo para mí o las comparto con mi household, para no perder lo que ya tenía armado ni compartir algo que prefiero mantener privado.
- CA-01: Justo después de unirse o crear el household, se le pregunta "¿Qué querés hacer con tu lista actual?" con dos opciones igual de visibles: "Mantenerla solo para mí" o "Compartirla con mi household".
- CA-02: Esta pregunta aparece una sola vez y aplica a todas las listas personales que el usuario ya tenía en ese momento, no una por una.
- CA-03: Si elige mantenerla solo para él, la lista sigue siendo privada, sin cambios.
- CA-04: Si elige compartirla, el resto del household la ve y puede colaborar en ella de inmediato, igual que si la hubieran creado juntos desde el principio.
- CA-05: Cualquier lista nueva que el usuario cree después de esta decisión sigue las reglas normales de un household (se comparte automáticamente), sin volver a preguntarle.

**HU-35: Consultar familiares del household**
Como usuario, quiero ver la lista de miembros de mi household, para saber quién forma parte de mi grupo familiar.
- CA-01: La vista de household muestra la lista de miembros, con nombre, foto y si es admin o no.
- CA-02: Si el household tiene muchos miembros, la lista se puede buscar por nombre y se carga por partes en vez de traer a todos de una sola vez.
- CA-03: El usuario ve claramente quién es el admin del household.

**HU-36: Eliminar un familiar del household**
Como usuario administrador, quiero eliminar a un miembro de mi household, para gestionar quién tiene acceso a las listas y datos compartidos.
- CA-01: Solo el admin del household ve la acción "Eliminar" junto a cada miembro (excepto sobre sí mismo).
- CA-02: Al eliminar, se pide confirmación explícita antes de ejecutar la acción (acción destructiva).
- CA-03: Al confirmar, el miembro pierde acceso inmediato a las listas y datos del household (sus listas/productos personales, si los tenía, no se eliminan).
- CA-04: Se muestra un mensaje de confirmación tras eliminar exitosamente.

### Lista general

**HU-36a: Buscar y añadir producto**
Como usuario, quiero buscar productos en una barra de búsqueda y añadirlos a mi lista de compras, para armar mi lista rápidamente sin tener que navegar a otra pantalla.
- CA-01: Se muestra una barra de búsqueda en la parte superior de la vista principal (to-do list).
- CA-02: Al escribir, el sistema muestra en tiempo real los productos del catálogo que coinciden con el texto ingresado.
- CA-03: Al seleccionar un producto de los resultados, este se añade a la lista con una cantidad por defecto de 1.
- CA-04: El producto añadido aparece de inmediato como una fila en la lista (sección "Pendientes", ver HU-36e), sin recargar la pantalla.

**HU-36b: Ajustar cantidad**
Como usuario, quiero incrementar o decrementar la cantidad de un producto en mi lista, para ajustar cuánto necesito comprar sin tener que eliminarlo y volver a añadirlo.
- CA-01: Cada producto en la lista muestra controles de "+" y "-" junto a la cantidad actual.
- CA-02: Al tocar "+", la cantidad aumenta en 1.
- CA-03: Al tocar "-", la cantidad disminuye en 1, sin poder bajar de 1.
- CA-04: El cambio se refleja de inmediato en la fila, sin necesidad de confirmación adicional. Tocar estos controles nunca dispara el tachado de la fila (ver HU-36e).

**HU-36c: Ver detalle de producto**
Como usuario, quiero ver los detalles de un producto añadido a mi lista, para ver marcas, presentación y precios de diferentes supermercados.
- CA-01: **(2026-08-21, confirmado)** el detalle se abre con un ícono o botón específico al final de la fila (misma zona "excluida" que ya tienen los controles de cantidad) — no tocando la fila, porque eso tacha el producto (HU-36e).
- CA-02: La vista de detalle muestra marca, presentación/variante y precio de referencia (si existe).

**HU-36d: Eliminar producto**
Como usuario, quiero eliminar un producto de mi lista, para quitar algo que agregué por error o que ya no necesito.
- CA-01: Cada producto en la lista tiene una acción de eliminar (ícono por definir).
- CA-02: Al eliminar, el producto se remueve de la lista de inmediato.
- CA-03: Se muestra un toast breve de confirmación ("Producto eliminado") con opción de deshacer.

**HU-36e: Tachar/destachar producto** *(rediseñado 2026-08-21, decisión del usuario)*
Como usuario, quiero tachar un producto de mi lista tocando toda su fila (sin checkbox), para llevar control de lo que ya conseguí sin borrarlo de la lista y sin que un ícono de estado le reste limpieza visual a cada fila.
- CA-01: **No hay checkbox ni ningún ícono de estado.** Cada fila muestra únicamente la información principal del producto (nombre, cantidad y lo que el equipo defina como esencial) y actúa como un solo botón.
- CA-02: Tocar cualquier parte de la fila — fuera de los controles de cantidad (HU-36b) y del ícono de detalle (HU-36c) — marca el producto como tachado. Tocarla de nuevo lo destacha.
- CA-03: El único indicador de que un producto está tachado es visual, directamente sobre el contenido de la fila (texto tachado/atenuado) — no un ícono ni un checkbox separado.
- CA-04: **La lista general se divide en dos secciones:** "Pendientes" arriba y "Tachados hoy" abajo. Un producto pasa de una sección a otra apenas se tacha o destacha, sin recargar la pantalla ni reordenar el resto de filas de forma brusca.
- CA-05: La sección "Tachados hoy" solo muestra lo tachado **el día de hoy**. Lo tachado en días anteriores no aparece acá — queda accesible desde [Historial de compras](#epic-historial-de-compras), para que un tachado por error de otro día no ensucie esta vista.
- CA-06: Esta misma división en dos secciones aplica a cualquier lista con el mismo patrón de tachado: sublistas, listas privadas (HU-50) y modo compra (HU-36f).

**HU-36f: Modo compra**
Como usuario, quiero activar un "modo compra" al iniciar una sesión de compra desde una lista, para tachar productos rápido mientras estoy en el supermercado.
- CA-01: Desde la lista general o una sublista, existe un botón "Iniciar compra".
- CA-02: **(2026-08-19)** al iniciar, primero se elige el supermercado donde se está comprando; después de eso, la pantalla es la misma lista de siempre (agrupada por categoría, dividida en Pendientes/Tachados hoy — ver HU-36e), sin controles nuevos que aprender — nada de una pantalla especial de "modo compra".
- CA-03: Tachar sigue funcionando igual que en el resto de la app: tocar la fila completa, sin checkbox (ver HU-36e).
- CA-04: Al tachar un producto, el sistema guarda automáticamente quién lo compró (el usuario actual), cuándo, y en qué supermercado (el elegido al iniciar); la cantidad realmente comprada se puede ajustar en el momento sin salir de la lista.
- CA-05: Si el usuario ya tenía una compra sin cerrar en ese mismo supermercado ese mismo día, retoma esa misma sesión en vez de crear una nueva.
- CA-06: El usuario puede salir en cualquier momento sin perder el progreso de tachado.
- CA-07: Al tachar el último producto pendiente, se sugiere cerrar la compra e ingresar el total gastado (ver epic Historial de compras).
- CA-08: Estos datos (quién, dónde, cuándo, cuánto) se guardan igual dentro de una lista privada, no solo en una lista de household — así, en una lista privada con varias personas, cada quien puede ver después quién compró qué y cuánto gastó cada uno.

**HU-36g: Combinar lista general y sublista (fusión visual al comprar)**
Como usuario, quiero fusionar visualmente mi sublista de fecha con la lista general al iniciar una compra, para no tener que revisar dos listas por separado en el supermercado.
- CA-01: Al iniciar modo compra desde una sublista, se ofrece la opción de fusionar con la lista general.
- CA-02: La vista fusionada agrupa los productos en tres bloques: solo en la lista general, repetidos en ambas (como filas independientes por lista), y solo en la sublista.
- CA-03: La fusión es únicamente visual — no se combinan los registros de datos; cada fila conserva su lista de origen, cantidad y estado.
- CA-04: Si el mismo producto (misma variante de catálogo) está en ambas listas, las cantidades se suman directamente sin pantalla de reconciliación (ver [documentacion-v1.md sección 4.3](documento-proyecto.md#43-sublistas-por-fecha-con-calendario)).
- CA-05: El usuario puede tachar cualquier fila desde la vista fusionada (misma regla de HU-36e); el tachado se refleja en la lista de origen correspondiente.

### Epic: Dashboard financiero (Finanzas)

**HU-37: Ver gasto total por periodo**
Como usuario, quiero ver mi gasto total por día, semana o mes, para entender cuánto estoy gastando en un periodo determinado.
- CA-01: El sub-tab "Dashboard" dentro del ítem de sidebar "Finanzas" muestra un selector de periodo (Día/Semana/Mes).
- CA-02: Al cambiar el periodo, el gasto total y los desgloses se recalculan sin recargar la pantalla.
- CA-03: El gasto total se muestra de forma destacada, junto al presupuesto estimado del mismo periodo (ver [documentacion-v1.md 4.2.1](documento-proyecto.md#421-interacciones-concretas-de-la-fila-de-producto-detallado-2026-08-18-desde-el-desglose-de-historias-de-usuario)) para comparar de un vistazo lo planeado contra lo gastado.

**HU-38: Ver gastos por household o listas privadas**
Como usuario, quiero ver mis gastos separados por household y por listas privadas, para diferenciar el gasto familiar del gasto personal/de otros grupos.
- CA-01: El dashboard permite filtrar/segmentar por household activo o por lista privada.
- CA-02: Los totales y desgloses se recalculan según el filtro seleccionado.
- CA-03: Los datos de un household y los de una lista privada nunca se mezclan sin que el usuario lo pida explícitamente.

**HU-39: Ver gastos por categoría de producto**
Como usuario, quiero ver mis gastos desglosados por categoría de producto, para identificar en qué estoy gastando más.
- CA-01: El dashboard incluye un gráfico de barras de gasto por categoría para el periodo seleccionado.
- CA-02: Cada categoría es identificable por nombre; al tocar/hacer hover se muestra el monto exacto.
- CA-03: Cerca del total se muestra el aviso de que los precios son estimados, porque el desglose por categoría puede diferir levemente del total real que el usuario edita a mano (ver epic Historial de compras).

**HU-40: Ver gastos por supermercado**
Como usuario, quiero ver mis gastos desglosados por supermercado, para saber dónde estoy gastando más.
- CA-01: El dashboard muestra una lista de supermercados con el monto gastado en cada uno durante el periodo seleccionado.
- CA-02: La lista está ordenada de mayor a menor gasto por defecto.

**HU-41: Ver gastos por persona**
Como usuario, quiero ver quién ha comprado o gastado más dentro de mi household o de una lista privada, para tener visibilidad de la contribución de cada quien.
- CA-01: El dashboard muestra un desglose de gasto por persona, tanto para el household como para cualquier lista privada con más de un colaborador.
- CA-02: Esta vista solo aparece cuando hay más de una persona involucrada — un usuario sin household y sin colaboradores en sus listas privadas no la ve, porque no hay nadie más con quién comparar.
- CA-03: **(2026-08-19)** en una lista privada, esto sirve para que el grupo vea quién compró qué y cuánto gastó cada uno — por ejemplo, para que un grupo de amigos decida entre ellos si hay que compensar algo. Tacha solo muestra el dato, no calcula ni cobra nada.

**HU-42: Ver productos más comprados y más costosos**
Como usuario, quiero ver qué productos específicos compro más seguido y cuáles son los más costosos, para entender mis patrones de consumo.
- CA-01: El dashboard incluye una lista de "productos más comprados" (por frecuencia) para el periodo seleccionado.
- CA-02: El dashboard incluye una lista de "productos más costosos" (por monto acumulado) para el periodo seleccionado.
- CA-03: Cada producto en ambas listas es tocable y lleva al detalle del producto en el catálogo.

**HU-43: Aviso de precios estimados**
Como usuario, quiero ver siempre un aviso de que los precios son estimados, para no confundirlos con precios garantizados por los supermercados.
- CA-01: El aviso está siempre visible cerca de cualquier total o precio sugerido, tanto en el dashboard como en el historial.
- CA-02: El aviso es discreto — se nota, pero no interrumpe ni tapa el contenido.
- CA-03: El texto aclara explícitamente que Tacha no está afiliado a ningún supermercado.

### Epic: Sublistas por fecha (calendario)

**HU-44: Ver calendario de sublistas**
Como usuario, quiero ver un calendario con mis sublistas por fecha, para planear compras asociadas a eventos o fechas específicas.
- CA-01: El ítem de sidebar "Fechas" muestra una vista de calendario con las sublistas existentes marcadas en su fecha correspondiente.
- CA-02: Cada sublista en el calendario muestra su estado con una diferencia visual clara (pendiente / completada / cancelada).
- CA-03: El usuario sin household también accede a esta vista, con sublistas personales.

**HU-45: Crear sublista en una fecha**
Como usuario, quiero crear una sublista asociada a una fecha específica, para organizar compras de un evento o viaje por separado de la lista general.
- CA-01: Al tocar un día del calendario (o un botón "+ Nueva sublista"), se abre un flujo corto para nombrar la sublista y confirmar la fecha.
- CA-02: La sublista creada aparece de inmediato en el calendario con estado "pendiente".
- CA-03: Agregar productos a la sublista reutiliza el mismo patrón de búsqueda/agregado que la lista general.

**HU-46: Ver y gestionar el estado de una sublista**
Como usuario, quiero que mi sublista cambie de estado según su progreso, para saber de un vistazo cuáles ya resolví y cuáles siguen pendientes.
- CA-01: Una sublista pasa automáticamente a "completada" cuando todos sus items quedan tachados.
- CA-02: El usuario puede cancelar explícitamente una sublista que ya no se va a comprar, sin borrar su registro.
- CA-03: Una sublista cancelada no cuenta como pendiente en ningún resumen o recordatorio.

**HU-47: Ver total de gasto de una sublista**
Como usuario, quiero ver el total de gasto de una sublista de forma independiente, para saber cuánto costó ese evento o compra puntual sin mezclarlo con el gasto general.
- CA-01: Cada sublista muestra su propio total, independiente del total de la lista general.
- CA-02: El total de la sublista sigue el mismo modelo de "total editable" que las sesiones del historial de compras.

### Epic: Listas privadas

**HU-48: Crear lista privada**
Como usuario, quiero crear una lista privada independiente de mi household, para organizar compras compartidas con personas que no son parte de mi familia (ej. compañeros de viaje).
- CA-01: Desde "Más → Listas privadas" (mobile) o el ítem de sidebar correspondiente (desktop), existe un botón "+ Nueva lista privada".
- CA-02: El flujo de creación pide un nombre para la lista; no requiere pertenecer a ningún household.
- CA-03: La lista creada aparece de inmediato en el calendario "Mis listas privadas".

**HU-49: Invitar colaboradores a una lista privada**
Como usuario, quiero invitar a otras personas a mi lista privada por correo o link, para que colaboren sin necesitar ser parte de mi household.
- CA-01: Desde la lista privada, el creador tiene una acción "Invitar" que ofrece invitar por correo o generar un link (mismo mecanismo que HU-33).
- CA-02: Los invitados no necesitan pertenecer a ningún household del creador ni ser familiares entre sí.
- CA-03: El acceso a la lista es independiente de cualquier household — quien no fue invitado no puede verla ni editarla.
- CA-04: El creador puede ver quién aceptó la invitación y quién sigue pendiente.

**HU-50: Gestionar una lista privada (tachado, estado)**
Como usuario, quiero que mi lista privada tenga el mismo comportamiento de tachado, unificación de cantidades y estado que una sublista familiar, para no tener que aprender un flujo distinto.
- CA-01: La lista privada se ve y se usa igual que el resto de listas: mismo tachado tocando toda la fila (sin checkbox, dividida en Pendientes/Tachados hoy — ver HU-36e) y mismos controles de cantidad por fila.
- CA-02: La lista privada soporta los mismos estados (pendiente/completada/cancelada) que una sublista.
- CA-03: La unificación automática de cantidades aplica igual cuando dos colaboradores agregan la misma variante de producto.

### Epic: Catálogo de productos y categorías

**HU-51: Buscar productos en el catálogo global**
Como usuario, quiero buscar productos en el catálogo estilo Uber Eats, para encontrar rápidamente lo que necesito con foto, nombre y presentación.
- CA-01: El sub-tab "Buscar" dentro de "Catálogo" muestra una barra de búsqueda arriba y los resultados en tarjetas, en una cuadrícula.
- CA-02: Cada tarjeta muestra el producto y su tamaño (ej. "Leche — 1L"), sin marca, con el precio aproximado como rango.
- CA-03: Los resultados se filtran en tiempo real a medida que el usuario escribe.
- CA-04: Si no hay resultados, se muestra un estado vacío con sugerencia de crear el producto en "Mis productos".

**HU-52: Filtrar catálogo por categoría**
Como usuario, quiero filtrar el catálogo por categoría, para navegar los productos de forma más organizada que solo por texto.
- CA-01: Una fila de chips de categoría (Lácteos, Panadería, Limpieza, etc.) aparece encima del grid de resultados.
- CA-02: La categoría activa se resalta en teal; se puede quitar el filtro para volver a ver todas las categorías.
- CA-03: El filtro de categoría se puede combinar con la búsqueda por texto.

**HU-53: Ver detalle de un producto (marcas y precio por supermercado)**
Como usuario, quiero ver el detalle de un producto del catálogo, para conocer qué marcas hay disponibles y su precio aproximado por supermercado.
- CA-01: Al tocar un producto en el catálogo, se abre su vista de detalle con foto grande, nombre y tamaño.
- CA-02: Se muestra un listado de marcas disponibles (logo + nombre), solo informativo.
- CA-03: Se muestra el precio aproximado por supermercado como rango entre las marcas disponibles ahí, ordenado del más barato al más caro.
- CA-04: Un botón principal "Agregar a mi lista" con selector de cantidad permite agregar el producto sin salir del detalle.

> **(2026-08-21)** Lo que era HU-54 ("Crear un producto que no existe en el catálogo") se fusionó con HU-56, abajo — eran la misma idea, solo cambiaba el punto de entrada (desde el estado vacío de la búsqueda del catálogo, en vez de desde "Mis productos"). Ver CA-04 de HU-56.

### Epic: Mis productos personalizados

**HU-55: Ver mis productos personalizados**
Como usuario, quiero ver una lista de los productos que yo mismo agregué, para reutilizarlos sin tener que crearlos de nuevo cada vez.
- CA-01: El sub-tab "Mis productos" dentro de "Catálogo" muestra los productos que el usuario (o su household) agregó, con una etiqueta "Agregado por mí" bien visible en cada tarjeta.
- CA-02: Si no hay productos personalizados todavía, se muestra un estado vacío con la opción "Agregá productos que no encontrás en el catálogo".

**HU-56: Crear un producto personalizado**
Como usuario, quiero agregar un producto propio con nombre, marca, categoría y tamaño, para registrar algo que compro pero que no está en el catálogo.
- CA-01: Un botón "+ Agregar producto" (visible en "Mis productos") abre un formulario corto: nombre, marca, categoría (elegir de una lista), tamaño/presentación, foto opcional.
- CA-02: El sistema valida que los campos obligatorios (nombre, categoría) estén completos antes de guardar.
- CA-03: El producto creado queda marcado como "agregado por mí", distinguible visualmente del resto del catálogo, con la misma regla de visibilidad que las listas: es personal por defecto, y se puede compartir con el household si el usuario pertenece a uno.
- CA-04: **(2026-08-21, fusionado desde HU-54)** el estado de "sin resultados" de la búsqueda en el Catálogo también ofrece un enlace directo a este mismo formulario, como punto de entrada alternativo.

**HU-57: Asociar tienda y precio de referencia**
Como usuario, quiero asociar opcionalmente una tienda específica y un precio de referencia a mi producto personalizado, para recordar dónde y a cuánto lo conseguí.
- CA-01: El formulario de alta incluye campos opcionales de tienda y precio de referencia.
- CA-02: Si se ingresa un precio, se muestra con un ícono "i" que aclara que es un precio ingresado por el usuario, no verificado ni actualizado automáticamente.
- CA-03: Este precio manual nunca se mezcla con los precios obtenidos por scraping al calcular las sugerencias de dónde comprar — son señales de confianza distinta.

**HU-58: Editar o eliminar un producto personalizado**
Como usuario, quiero editar o eliminar un producto que agregué, para corregir datos desactualizados o quitarlo si ya no lo uso.
- CA-01: Cada producto personalizado en "Mis productos" tiene acciones de editar y eliminar.
- CA-02: Eliminar un producto pide confirmación si el producto está siendo usado en alguna lista, grupo o receta activa.

### Epic: Historial de compras

**HU-59: Ver historial de sesiones de compra**
Como usuario, quiero ver mis sesiones de compra pasadas, para revisar qué compré, dónde y cuánto gasté.
- CA-01: El sub-tab "Historial" dentro de "Finanzas" muestra una lista de sesiones de compra (fecha, supermercado, monto).
- CA-02: Un selector de periodo (Día/Semana/Mes) filtra las sesiones mostradas, con el total del periodo destacado en grande.

**HU-60: Editar el total de una sesión o periodo**
Como usuario, quiero editar el total gastado de una sesión o de un periodo completo, para reflejar lo que realmente gasté sin tener que ingresar precio por item.
- CA-01: Cada sesión de compra tiene un ícono de lápiz junto a su total para editarlo inline.
- CA-02: El total del periodo seleccionado también es editable directamente, sin entrar sesión por sesión.
- CA-03: Al guardar, el cambio se refleja de inmediato en el dashboard financiero (HU-37).

**HU-61: Ver sesiones sin total ingresado**
Como usuario, quiero identificar visualmente las sesiones a las que no les ingresé un total, para no olvidar completarlas.
- CA-01: Una sesión sin total muestra un badge terracota "Sin total", sin sentirse como un error.
- CA-02: Si una sesión queda sin total por un tiempo, el sistema recuerda al usuario (notificación o indicador visual persistente).
- CA-03: El total puede completarse en cualquier momento desde el historial.

**HU-62: Filtrar historial por supermercado y categoría**
Como usuario, quiero filtrar mi historial por supermercado y por categoría de producto, además de por periodo, para analizar mis compras con más detalle.
- CA-01: El historial incluye filtros de supermercado y categoría, combinables con el filtro de periodo.
- CA-02: Los filtros aplicados se muestran de forma visible (chips activos) y se pueden limpiar individualmente.

### Epic: Recetas

**HU-63: Ver catálogo de recetas del household**
Como usuario, quiero ver las recetas disponibles para mi household, para elegir cuáles quiero agregar a mi lista o al planificador semanal.
- CA-01: El sub-tab "Recetas" dentro del ítem de sidebar "Recetas" muestra las recetas del household con nombre, foto e ingredientes principales.
- CA-02: Cada receta muestra sus porciones base.

**HU-64: Crear o editar una receta**
Como usuario, quiero crear o editar una receta con sus ingredientes ligados al catálogo, para reutilizarla en mi lista o en el planificador.
- CA-01: Un botón "+ Nueva receta" abre un formulario: nombre, porciones base, e ingredientes (búsqueda estilo catálogo).
- CA-02: **(2026-08-19)** por cada ingrediente, el usuario primero elige el producto (ej. "Leche", sin importar tamaño ni marca) y después le asigna una cantidad con su unidad (ej. "500 ml", "3 unidades", "2 tazas") — el ingrediente queda linkeado al producto desde este mismo paso, no se resuelve después.
- CA-03: Cada ingrediente se elige de entre los productos del catálogo, no se escribe como texto libre.
- CA-04: La receta se puede editar o eliminar posteriormente por quien la creó (o cualquier miembro del household, si la receta es compartida).

**HU-64b: Eliminar una receta**
Como usuario, quiero eliminar una receta que ya no uso, para mantener mi lista de recetas ordenada.
- CA-01: Cada receta tiene una acción de eliminar, con confirmación antes de ejecutarla.
- CA-02: Si la receta está asignada a algún espacio del plan semanal, se le avisa al usuario antes de eliminarla.

**HU-65: Agregar receta a la lista**
Como usuario, quiero agregar los ingredientes de una receta a mi lista con un botón, para no tener que buscar cada ingrediente manualmente.
- CA-01: Cada receta tiene un botón "Agregar receta a lista".
- CA-02: Al agregar, las cantidades se suman contra lo que ya está en la lista, en vez de duplicar el ingrediente como un item aparte.
- CA-03: **(2026-08-19)** si el ingrediente es un conteo simple (ej. "3 cebollas"), la suma es directa y no pasa nada más — el ingrediente aparece o se actualiza en la lista sin ningún aviso.
- CA-04: Si el ingrediente se mide por volumen o peso (ej. "500 ml de leche") y la cantidad ya en la lista no alcanza, aparece un aviso pasivo bajo el producto correspondiente (ver epic "Reconciliación al tachar") — solo este tipo de ingrediente necesita ese paso, porque es el único caso donde existe ambigüedad real sobre qué presentación comprar.
- CA-05: No se abre ninguna ventana de decisión en este paso — la decisión de qué comprar ocurre al tachar, no al agregar la receta.

**HU-66: Ver qué falta de una receta**
Como usuario, quiero ver qué ingredientes de una receta ya tengo comprados o en casa y cuáles faltan, para saber si puedo cocinarla ya.
- CA-01: La vista de receta muestra, por ingrediente, si ya está cubierto por la lista/inventario o si falta.
- CA-02: Esta vista se actualiza en tiempo real a medida que se tachan items relacionados.

### Epic: Planificador semanal de comidas

**HU-67: Ver calendario semanal de comidas**
Como usuario, quiero ver un calendario con la semana actual y la próxima, para planificar qué se va a cocinar cada día.
- CA-01: El sub-tab "Planificador semanal" dentro de "Recetas" muestra una grilla de días x comidas (desayuno/almuerzo/cena), hasta 3 espacios por día.
- CA-02: El usuario puede navegar entre la semana actual y la próxima.

**HU-68: Asignar receta, cocinero y porciones a un espacio del plan**
Como usuario, quiero asignar una receta, quién cocina y cuántas porciones a cada espacio del plan semanal, para organizar la semana con mi household.
- CA-01: Al tocar un espacio vacío, se abre un flujo corto para elegir receta (del catálogo de recetas), asignar cocinero (miembro del household) y ajustar el multiplicador de porciones si aplica.
- CA-02: Un espacio ya asignado muestra el nombre de la receta y el cocinero asignado directamente en la grilla.
- CA-03: El usuario puede reasignar o quitar la asignación de un espacio en cualquier momento.

**HU-69: Agregar la semana completa a la lista**
Como usuario, quiero agregar todas las recetas planificadas de la semana a mi lista con un solo botón, para no repetir el proceso receta por receta.
- CA-01: Un botón "Agregar semana a la lista" recorre todas las recetas planificadas y las agrega de una sola vez, aplicando la misma unificación de cantidades que agregar una receta individual.
- CA-02: Si un mismo ingrediente aparece en varios días (ej. cebolla el lunes y el miércoles), se suma en un solo item, sin duplicarse.
- CA-03: El usuario puede elegir a qué lista se agrega (general o una sublista de fecha específica).

### Epic: Inventario doméstico

> **Ampliado 2026-08-19:** el enfoque original (solo sugerencias pasivas, sin fechas) se queda corto para lo que el equipo quiere — ahora incluye una pantalla real de inventario con vencimientos. Se mantiene el mismo cuidado de no obligar a nadie a llenar nada a mano: todo lo nuevo es opcional y de un toque, nunca un formulario que hay que mantener al día.

**HU-70: Ver sugerencias de inventario**
Como usuario, quiero ver sugerencias de un toque sobre productos que probablemente ya se me acabaron, para reponerlos sin tener que llevar un registro manual.
- CA-01: En la vista General, si hay sugerencias pendientes, aparecen debajo del encabezado, antes de la lista de productos, en una fila que se puede recorrer deslizando.
- CA-02: Las sugerencias se calculan solas a partir de lo que el usuario ya compró antes y cuánto suele durarle ese tipo de producto, o de la fecha de vencimiento que haya indicado (HU-70b) si existe — nunca es obligatorio ingresar nada a mano para que esto funcione.
- CA-03: Ninguna otra funcionalidad (listas, recetas, finanzas) depende de que el usuario interactúe con estas sugerencias.

**HU-70b: Indicar cuánto le va a durar un producto al comprarlo**
Como usuario, quiero poder indicar — sin obligación — cuánto tiempo le va a durar un producto justo cuando lo tacho como comprado, para que las sugerencias y mi inventario sean más precisos.
- CA-01: Al tachar un producto (ver "Modo compra"), aparece de forma opcional un set de chips de un toque: "Vence en pocos días", "2-4 semanas", "1-3 meses", "No vence / no aplica" — nunca un selector de fecha exacta obligatorio.
- CA-02: Si el usuario no toca ningún chip, la app sigue funcionando igual que antes: estima la duración por categoría, sin pedir nada.
- CA-03: Elegir un chip no interrumpe el flujo de tachado — es parte del mismo gesto, no un paso aparte que hay que confirmar.

**HU-71: Confirmar o descartar una sugerencia**
Como usuario, quiero confirmar o descartar una sugerencia de inventario con un solo toque, para reponer productos sin llenar ningún formulario.
- CA-01: Cada sugerencia tiene dos acciones: un check para confirmar (agrega el producto a la lista general) y una X para descartar (la pospone).
- CA-02: Confirmar agrega el producto a la lista con cantidad 1 por defecto, igual que buscar y añadir un producto a mano.
- CA-03: Descartar no borra nada del historial ni afecta sugerencias futuras de forma permanente.
- CA-04: El usuario puede ignorar completamente esta sección sin que bloquee ninguna otra parte de la pantalla.

**HU-71b: Ver mi inventario completo**
Como usuario, quiero ver una pantalla con todo lo que la app cree que tengo en casa, para saber qué se me vence pronto sin tener que adivinar.
- CA-01: Accesible desde "Más → Mi inventario" (mobile) o un enlace desde el widget de sugerencias (desktop), muestra los productos agrupados por urgencia: "Vence pronto", "Este mes", "Sin fecha estimada".
- CA-02: Cada producto muestra su nombre, y si tiene fecha (dada por el usuario o estimada), cuánto le queda.
- CA-03: Esta pantalla es un complemento para quien quiera más control — el widget de sugerencias de un toque en General sigue siendo la forma principal de usar el inventario en el día a día, esta pantalla no la reemplaza.
- CA-04: Si no hay nada en el inventario todavía, se muestra un estado vacío simple, sin pedirle al usuario que lo llene a mano.

**HU-71c: Marcar un producto como agotado o ajustar su vencimiento**
Como usuario, quiero poder decir que un producto ya se acabó antes de lo esperado, o ajustar cuándo creo que se vence, para que mi inventario sea más preciso sin tener que empezar de cero.
- CA-01: Desde "Mi inventario", cada producto tiene una acción "Ya se acabó" que lo saca del inventario de inmediato.
- CA-02: Cada producto también permite ajustar su fecha estimada con los mismos chips rápidos de HU-70b, sin selector de fecha exacta obligatorio.
- CA-03: Estos ajustes no afectan el historial de compras ni las finanzas — solo la estimación de inventario.

**HU-71d: Agregar algo a mi inventario manualmente**
Como usuario, quiero poder agregar a mi inventario algo que ya tenía en casa (y no vino de una compra hecha en Tacha), para que las sugerencias también lo tengan en cuenta.
- CA-01: Desde "Mi inventario", un botón "+ Agregar a mi inventario" permite elegir un producto del catálogo y, opcionalmente, indicar cuánto le queda con los chips de HU-70b.
- CA-02: El producto agregado así aparece igual que cualquier otro en "Mi inventario", sin distinción visual especial — el origen (compra vs. manual) no le importa al usuario, solo a los datos internos.

### Epic: Configuración

> **Nueva (2026-08-19):** el "encargado" por lista ya estaba en los requerimientos (ver [documentacion-v1.md 4.2.1](documento-proyecto.md#421-interacciones-concretas-de-la-fila-de-producto-detallado-2026-08-18-desde-el-desglose-de-historias-de-usuario)) pero no tenía dónde activarse — se detectó el hueco al revisar el desglose completo.

**HU-78: Activar el "encargado" para una lista**
Como usuario, quiero poder activar la función de "encargado" para una lista específica, para asignar quién debe comprar cada producto solo cuando de verdad lo necesito.
- CA-01: Desde el perfil hay una pantalla de "Configuración" con ajustes que se eligen por lista (general, sublista o privada), no de forma global a toda la cuenta.
- CA-02: El ajuste "Encargado" tiene un interruptor simple (activado/desactivado) por cada lista, apagado por defecto.
- CA-03: Al activarlo para una lista, aparece el campo de "encargado" en cada fila de esa lista (ver [documentacion-v1.md 4.2.1](documento-proyecto.md#421-interacciones-concretas-de-la-fila-de-producto-detallado-2026-08-18-desde-el-desglose-de-historias-de-usuario)); al desactivarlo, deja de mostrarse sin borrar lo que ya estaba asignado.

### Epic: Grupos de productos

**HU-72: Ver "Mis grupos"**
Como usuario, quiero ver mis grupos de productos guardados, para reutilizar combos que compro seguido sin buscar producto por producto.
- CA-01: Accesible desde el botón "Gestionar mis grupos" en la vista General, la pantalla "Mis grupos" muestra una tarjeta por grupo con su nombre y cuántos productos tiene.
- CA-02: Si no hay grupos todavía, se muestra un estado vacío con la opción "Agrupá los productos que siempre comprás juntos".

**HU-73: Crear un grupo de productos**
Como usuario, quiero crear un grupo nombrado con varios productos y su cantidad por defecto, para agregarlos todos juntos la próxima vez.
- CA-01: Un botón "+ Crear grupo" abre un flujo corto: nombre del grupo, luego búsqueda de productos (mismo buscador que el catálogo) para agregarlos con su cantidad/tamaño por defecto.
- CA-02: Cada producto agregado al grupo aparece como una fila compacta con opción de quitarlo antes de guardar.
- CA-03: El grupo es personal por defecto, con la opción de compartirlo con el household — misma regla de visibilidad que las listas.

**HU-74: Agregar un grupo a la lista**
Como usuario, quiero agregar todos los productos de un grupo a mi lista con un solo botón, para no buscar cada producto manualmente.
- CA-01: Cada grupo tiene un botón directo "Agregar a lista".
- CA-02: Al agregar, si un producto del grupo ya está en la lista con exactamente el mismo tamaño/presentación, la cantidad se suma directamente, sin ninguna pantalla intermedia de decisión (a diferencia de recetas/plan semanal).
- CA-03: Si el producto ya está en la lista pero en otro tamaño (ej. el grupo trae "leche en galón" y la lista ya tenía "leche en caja"), se agrega como una fila aparte — no se combinan tamaños distintos.

**HU-75: Editar un grupo existente**
Como usuario, quiero editar un grupo para agregar, quitar o ajustar la cantidad de sus productos, para mantenerlo alineado a mis compras reales.
- CA-01: Cada grupo tiene una acción de editar que reabre el mismo flujo de creación con los productos ya cargados.
- CA-02: Los cambios se guardan de inmediato al confirmar, sin afectar listas donde el grupo ya fue agregado previamente.

**HU-75b: Eliminar un grupo**
Como usuario, quiero eliminar un grupo que ya no uso, para mantener mi lista de grupos ordenada.
- CA-01: Cada grupo tiene una acción de eliminar, con confirmación antes de ejecutarla.
- CA-02: Eliminar un grupo no afecta las listas donde ya se agregó anteriormente.

### Epic: Reconciliación al tachar ("¿Qué hiciste?")

**HU-76: Ver aviso pasivo de faltante de receta/plan**
Como usuario, quiero ver un aviso pasivo cuando la cantidad que tengo apuntada de un producto no alcanza para una receta o el plan semanal, para saber que necesito más sin que la app me interrumpa.
- CA-01: Bajo el producto correspondiente en la lista, se muestra un texto pequeño y secundario (ej. "+ 500ml necesarios para Receta X").
- CA-02: El aviso es puramente informativo — no tiene botones ni dispara ninguna acción por sí solo.
- CA-03: Este aviso solo aparece cuando el faltante viene de una receta o del plan semanal **y** el ingrediente se mide por volumen o peso — nunca de sublistas o grupos (esos suman directo), y tampoco de ingredientes de conteo simple dentro de una receta (esos también suman directo, ver HU-65).

**HU-77: Resolver el faltante al tachar el item**
Como usuario, quiero resolver el faltante de receta/plan en el momento de tachar el producto, para decidir qué hice recién cuando ya lo sé.
- CA-01: Al tachar (tocar la fila de) un producto con ese aviso pendiente, se abre un panel corto con el título "¿Qué hiciste?".
- CA-02: Se muestran tres opciones de un toque: "Agregué otra igual", "Cambié a otra presentación" (muestra las opciones del catálogo con precio aproximado) y "Ya tenía suficiente" (descarta el aviso sin agregar nada).
- CA-03: La app nunca decide ni sugiere sola cuál presentación es "la mejor" — el usuario elige siempre.
- CA-04: Todo el flujo ocurre en el mismo panel, sin navegar a otra pantalla.

## Flujo de usuario — síntesis para revisión de equipo

Agregado 2026-08-19 al completar el desglose de HU/CA de todos los módulos pendientes ([documentacion-v1.md sección 10](documento-proyecto.md#10-pendientes-de-definición)). Junta en una sola vista dónde vive cada funcionalidad y qué botón la dispara, para revisar con el equipo antes de generar/ajustar pantallas en Stitch (ver [DESIGN.md](DESIGN.md)).

### Journey completo (visitante → uso diario)

1. Visitante entra a la Landing pública (HU-01 a HU-11) → CTA "Empezar gratis" → Registro (manual HU-14b a HU-18, o social HU-19 a HU-21) → Verificación de correo si es manual (HU-17) → Onboarding ([DESIGN.md 7.7](DESIGN.md#77-onboarding--con-o-sin-household)): "Usar Tacha solo/a" o "Crear o unirme a un household" (HU-33/HU-34) → si ya tenía lista propia, decide si la mantiene o la comparte (HU-34b) → entra a la app.
2. Una vez adentro, el punto de entrada por defecto es **General** (primer ítem de sidebar / primer tab): lista general + resumen financiero + inventario opcional + acceso a grupos.
3. Desde "General", el usuario dispara casi todo lo demás con botones directos: "Agregar desde grupo" (HU-74), sugerencias de inventario (HU-70/71), buscador de catálogo inline (buscar/añadir producto).
4. El resto de secciones (Fechas, Listas privadas, Catálogo, Recetas, Finanzas) son destinos deliberados a los que el usuario navega cuando quiere planear — no accesos incidentales del flujo diario de tachado.

### Tabla: epic → dónde vive → botón/entrada principal

| Epic | Dónde vive (nav) | Botón/entrada principal | Pantalla (DESIGN.md) |
|---|---|---|---|
| Lista general (buscar/añadir, tachar, editar) | Sidebar "General" / tab "General" | Barra de búsqueda superior + toda la fila tocable para tachar | 7.8, 7.4, 7.5 |
| Modo compra / fusión con sublista | Dentro de "General" o una sublista | Botón "Iniciar compra" → elegir supermercado → misma lista de siempre | 7.8 |
| Sublistas por fecha | Sidebar "Fechas" / tab "Fechas" | "+ Nueva sublista" sobre el calendario | 7.12 (ajustar) |
| Listas privadas | Sidebar "Listas privadas" / "Más → Listas privadas" | "+ Nueva lista privada" | 7.12 (ajustar) |
| Catálogo — Buscar | Sidebar "Catálogo" sub-tab "Buscar" | Barra de búsqueda + chips de categoría | 7.1, 7.1b |
| Mis productos personalizados | Sidebar "Catálogo" sub-tab "Mis productos" | "+ Agregar producto" | 7.2 |
| Mis grupos | Botón "Gestionar mis grupos" desde "General" | "+ Crear grupo" | 7.6 |
| Recetas | Sidebar "Recetas" sub-tab "Recetas" | "+ Nueva receta" / "Agregar receta a lista" | sin prompt propio todavía — ver pendiente abajo |
| Planificador semanal | Sidebar "Recetas" sub-tab "Planificador semanal" | Tocar espacio vacío / "Agregar semana a la lista" | 7.13 (ajustar) |
| "¿Qué hiciste?" (reconciliación) | Se dispara al tachar (solo ingredientes por volumen/peso), no es un destino de nav | Tocar la fila de un item con aviso pendiente | 7.3 |
| Inventario doméstico (sugerencias) | Widget dentro de "General" | Chips check/X + chips de vencimiento al tachar | 7.10 (ajustar) |
| Mi inventario (pantalla completa) | "Más → Mi inventario" (mobile) / enlace desde el widget (desktop) | "+ Agregar a mi inventario" / "Ya se acabó" por producto | sin prompt propio todavía — ver pendiente abajo |
| Configuración | Perfil → "Configuración" | Interruptor "Encargado" por lista | sin prompt propio todavía — ver pendiente abajo |
| Dashboard financiero | Sidebar "Finanzas" sub-tab "Dashboard" | Filtros de periodo/household o lista privada/súper | 7.11 (ajustar) |
| Historial de compras | Sidebar "Finanzas" sub-tab "Historial" | Lápiz de edición sobre el total | 7.9 |
| Perfil y sesión | Sidebar (pie) / "Más → Perfil" | Ícono/nombre de usuario | sin prompt propio todavía — ver pendiente abajo |
| Grupo familiar (household) | "Perfil/Household" | "Generar link de invitación" / "Salir del household" | 7.15 |
| Decidir qué hacer con mi lista al unirme a household (HU-34b) | Paso dentro del flujo de unirse/crear household, no un destino de nav propio | Pantalla "¿Qué querés hacer con tu lista actual?" | 7.15 (agregar el paso) |

### Decisiones ya cerradas por el equipo (2026-08-19)

- **Rol "Administrador":** no habrá un rol de administración global de la plataforma — es únicamente quien administra su household (invitar/quitar familiares). Ver Roles al inicio de este documento y [documentacion-v1.md 4.1](documento-proyecto.md#41-gestión-de-usuarios-familias-y-perfiles).
- **Listas personales al unirse a un household:** se le pregunta al usuario, una sola vez, si quiere mantener su lista como personal o compartirla con el household (HU-34b). Ver [documentacion-v1.md 4.1](documento-proyecto.md#41-gestión-de-usuarios-familias-y-perfiles).
- **Grupos de productos y Mis productos personalizados:** confirmados por el equipo completo, ya no son decisiones unilaterales pendientes de repasar.
- **Un solo household por usuario:** no varios — no hace falta selector de household en la interfaz. Si el usuario quiere cambiar, primero sale del que tiene (HU-34c).
- **Modo compra simplificado:** selector de supermercado + la misma lista de siempre (dividida en Pendientes/Tachados hoy), tachado tocando toda la fila — sin checkbox, el único indicador es visual sobre el texto de la fila (ver HU-36e). Aplica también a listas privadas, con el mismo registro de quién/dónde/cuándo/cuánto por persona.
- **Inventario doméstico ampliado:** ya no es solo sugerencias pasivas — incluye vencimientos opcionales (captados con chips rápidos, nunca un selector de fecha obligatorio) y una pantalla propia "Mi inventario".
- **Configuración:** epic nueva para el interruptor de "encargado" por lista, que ya estaba en los requerimientos pero no tenía dónde vivir.

### Pendientes para la próxima ronda de Stitch

1. **Perfil, Recetas (listado), Mi inventario y Configuración** no tienen pantalla generada todavía — agregar prompts a [DESIGN.md sección 7](DESIGN.md#7-prompts-listos-para-stitch-ai) antes de la próxima ronda de generación (Mi inventario y Configuración sí tienen prompt ya, ver 7.10 ajustado y 7.20 nuevo).
2. Incorporar en el prompt de 7.15 el paso nuevo de HU-34b y la opción "Salir del household" (HU-34c) cuando se regenere esa pantalla en Stitch.
3. Ajustar el mockup y la próxima generación de Stitch de la Lista general y "modo compra" para: (a) quitar el checkbox — toda la fila es el único punto de tachado; (b) mostrar el tachado como texto tachado/atenuado sobre la fila, no como un ícono de check; (c) dividir la vista en dos secciones, "Pendientes" arriba y "Tachados hoy" abajo (ver HU-36e).
4. Incluir en el mockup el ícono/botón de detalle al final de la fila (HU-36c), confirmado como la forma de resolver el conflicto con el tachado de toda la fila (HU-36e).
