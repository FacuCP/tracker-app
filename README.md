# app-celu

App personal hecha con **Expo + React Native + TypeScript**, organizada con
**Clean Architecture**. Tiene seis áreas, elegibles desde el menú del header:

- **Favoritos** — pantalla principal. Junta los trackers y listas marcados con la
  estrella; tiene un botón "＋ Crear" (tracker, lista o rutina). Deslizando
  hacia la izquierda se llega a **Rutina diaria** (tareas que se resetean
  solas todos los días).
- **Trackers** — el **mood tracker** (especial y fijo) + los **trackers** que
  crea el usuario (de opciones o de número).
- **Listas** — listas del usuario con entradas (nombre, fecha, comentario,
  rating); una lista puede ser una **to-do list** (entradas que se tildan).
- **Finanzas** — economía actual + ingresos/gastos (con repetición mensual y
  categorías) y su desglose por semana/mes/año.
- **Gimnasio** — rutinas con ejercicios (series, repeticiones, peso, puesto) y un
  cuadro guiado para ir haciendo la rutina de hoy, con reseteo semanal.
- **Eventos** — calendario con eventos (nombre, fecha, horario, color), con
  repetición opcional cada N días.

Todo se guarda local en el teléfono y se puede exportar/importar como un único
archivo de backup.

> Las decisiones de diseño (por qué está hecho así, qué se descartó y qué
> queda pendiente) están en [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Cómo correrla

```bash
npm install
npm start
```

Después escaneá el QR con la app **Expo Go** en tu celular, o apretá `a` para
abrir el emulador de Android / `w` para web.

## Instalar en el teléfono (Android)

Para tener la app instalada de verdad (sin el server de desarrollo) se usa
**EAS Build**:

```bash
npm install -g eas-cli      # una vez
eas login                   # cuenta gratuita de Expo
eas build -p android --profile preview
```

EAS compila en la nube (~10-20 min) y devuelve un link. Abrí ese link **desde
el teléfono**, bajá el `.apk` e instalalo (Android te va a pedir permitir
"instalar apps desconocidas").

Los perfiles de build están en [`eas.json`](eas.json): `preview` genera un APK
para instalar a mano; `production` genera un `.aab` para subir a Google Play.
El identificador de la app (`com.facucp102.appcelu`) y el `versionCode` están en
[`app.json`](app.json) — subí `versionCode` en cada build nuevo.

## No perder los datos al actualizar

Todo lo que cargás se guarda **solo en el teléfono** (AsyncStorage).

- **Al actualizar la app, los datos se conservan solos.** Instalás el APK nuevo
  encima del viejo y listo — siempre que no cambie el identificador
  (`com.facucp102.appcelu`) ni la firma. EAS reusa el mismo keystore entre
  builds, así que esto pasa por defecto.
- **Se pierden** si desinstalás la app, si usás "Borrar datos" en Ajustes de
  Android, o si instalás un APK firmado con otra clave (Android obliga a
  desinstalar primero).

Como red de seguridad, la app tiene **Ajustes y backup** (botón "Ajustes" arriba
a la derecha, en cualquiera de las pestañas):

- **Exportar datos**: genera un archivo `.json` con todo y abre el menú de
  compartir (mandátelo a Google Drive / mail / WhatsApp).
- **Importar datos**: elegís un `.json` exportado antes y **reemplaza** todos
  los datos actuales. Sirve para restaurar tras reinstalar o para pasar de
  teléfono.

## Estructura (Clean Architecture)

```
src/
├── domain/                      # Reglas de negocio puras. No importa React ni Expo.
│   ├── user/
│   │   ├── entities/            # UserProfile (nombre + moodFavorite + financeFavorite; fontScale sin usar)
│   │   ├── repositories/        # UserRepository (puerto)
│   │   └── usecases/            # GetUserProfile, UpdateUserProfile, GetWelcomeMessage
│   ├── mood/
│   │   ├── entities/            # MoodColor, MoodEntry (colores, descripción, nota 1-10)
│   │   ├── repositories/        # MoodRepository (puerto)
│   │   └── usecases/            # GetMoodEntry, SaveMoodEntry, DeleteMoodEntry, GetMoodRange
│   ├── tracker/
│   │   ├── entities/            # Tracker (opciones y/o hasCounter), TrackerEntry (optionIds[], value?)
│   │   ├── repositories/        # TrackerRepository, TrackerEntryRepository (puertos)
│   │   └── usecases/            # Create/Update/Delete/GetTracker(s), Save/Delete/GetTrackerEntry,
│   │                            # GetTrackerRange (registros + estadísticas del rango)
│   ├── list/
│   │   ├── entities/            # List (nombre, isTodo), ListEntry (nombre, fecha opcional / de
│   │   │                        # vencimiento, comentario, rating, done) + compareListEntries,
│   │   │                        # isEntryOverdue
│   │   ├── repositories/        # ListRepository, ListEntryRepository (puertos)
│   │   └── usecases/            # Create/Delete/GetList(s), GetListEntries (ordenadas),
│   │                            # Save/DeleteListEntry, SetListEntryDone
│   ├── finance/
│   │   ├── entities/            # FinanceCategory (+ General), FinanceTransaction (kind, monto,
│   │   │                        # repeat mensual), occurrences.ts (fechas de impacto), FinanceReport
│   │   ├── repositories/        # FinanceCategoryRepository, FinanceTransactionRepository (puertos)
│   │   └── usecases/            # Get/Save/Delete Categoría y Movimiento, GetCurrentBalance,
│   │                            # GetFinanceReport (desglose del período)
│   ├── favorites/               # FavoriteRef (claves) + Get/SaveFavoritesOrder (orden manual)
│   ├── gym/
│   │   ├── entities/            # GymRoutine, GymExercise (series, reps, peso, puesto),
│   │   │                        # GymProgress (cycleStart + completedSets), GymSession (agregado)
│   │   ├── repositories/        # GymRoutine/GymExercise/GymProgress/GymSelection (puertos)
│   │   └── usecases/            # CRUD de rutina/ejercicio, GetGymProgress, SetGymSetCount,
│   │                            # GetGymSession (rutina + ejercicios + progreso + siguiente),
│   │                            # Get/SaveGymSelection (rutina elegida para hoy)
│   ├── dailyRoutine/
│   │   ├── entities/            # DailyRoutineTask (título/descripción/posición),
│   │   │                        # DailyTaskProgress (day + done) + resolveTaskDone
│   │   ├── repositories/        # DailyRoutineTaskRepository, DailyTaskProgressRepository
│   │   └── usecases/            # CRUD de tarea, Get/SetDailyRoutineProgress,
│   │                            # GetDailyRoutineSession (tareas + progreso + conteo),
│   │                            # SyncRoutineTracker (↓ única dependencia cruzada con `tracker/`)
│   ├── event/
│   │   ├── entities/            # CalendarEvent (nombre, fecha, horario, color, EventRepeat),
│   │   │                        # occurrences.ts (eventOccurrencesInRange, como Finanzas)
│   │   ├── repositories/        # EventRepository (puerto)
│   │   └── usecases/            # CRUD de evento, GetEventOccurrencesInRange (por rango)
│   └── backup/                  # BackupBundle + BackupRepository + ExportBackup/ImportBackup
│
├── data/                        # Implementa los puertos del dominio
│   ├── user/                    # dto + AsyncStorage datasource + repo impl
│   ├── mood/                    # dto + AsyncStorage datasource + repo impl
│   ├── tracker/                 # dto + AsyncStorage datasources + repo impls
│   ├── list/                    # dto + AsyncStorage datasources + repo impls
│   ├── finance/                 # dto + AsyncStorage datasources (siembra categorías) + repo impls
│   ├── favorites/               # FavoritesOrderRepositoryImpl (array JSON de claves)
│   ├── gym/                     # dto + AsyncStorage datasources + repo impls
│   ├── dailyRoutine/            # dto + AsyncStorage datasources + repo impls
│   ├── event/                   # dto + AsyncStorage datasource + repo impl
│   └── backup/                  # BackupRepositoryImpl (multiGet/multiSet sobre AsyncStorage)
│
├── core/
│   ├── di/container.ts          # Composition root: arma todas las dependencias
│   ├── navigation/              # Stack tipado (Onboarding, Favorites, Trackers, Lists,
│   │                            # ListDetail, Finances, Gym, GymRoutineDetail, DailyRoutines,
│   │                            # Events, Settings, MoodProgress, CreateTracker, EditTracker,
│   │                            # TrackerProgress) + gate de primer arranque
│   ├── storage/keys.ts          # Todas las claves de AsyncStorage (las usa el backup)
│   ├── notifications/           # notifications.ts (agenda/cancela las locales según perfil + datos)
│   ├── text/textScale.ts        # Escala global de la tipografía (a medio hacer, sin montar)
│   ├── theme.ts                 # Paleta: fondos claros (no blancos) + acento
│   └── utils/                   # date.ts (fechas ISO locales + formateo es), id.ts
│
└── presentation/                # UI (patrón ViewModel con hooks)
    ├── calendar/                # Calendario GENÉRICO reutilizable:
    │                            # CalendarWeek/Month/Year (render-prop por día),
    │                            # CalendarViewSwitch, useCalendarPeriod
    ├── navigation/              # HubMenuButton (menú del header), SettingsHeaderButton
    ├── components/              # ComingSoon, KeyboardAvoider, Checkbox, FavoriteStar,
    │                            # DiagonalSplitSquare (celda de 1-2 colores en diagonal),
    │                            # ReorderRow (modo "Ordenar"), LinkedText (links tocables),
    │                            # InfoButton + InfoModal (botón "i" + modal de descripción),
    │                            # PinButton (ícono Lucide), SelectField (combo box genérico)
    ├── backup/                  # useBackup (exportar/importar el .json)
    ├── user/components/         # UserNameCard, HomeTabCard, NotificationsCard (Ajustes);
    │                            # FontSizeCard sin montar
    ├── screens/
    │   ├── onboarding/          # OnboardingScreen (elegir el nombre, la 1ª vez)
    │   ├── favorites/           # FavoritesScreen (principal) + useFavorites +
    │   │                        # CreateChooserModal; swipe-izquierda → DailyRoutines
    │   ├── trackers/            # TrackersScreen + useTrackersViewModel
    │   ├── lists/               # ListsScreen (todas las listas)
    │   ├── list-detail/         # ListDetailScreen (una lista con sus entradas)
    │   ├── finances/            # FinancesScreen + useFinances
    │   ├── gym/                 # GymScreen + useGymScreen (todas las rutinas)
    │   ├── gym-routine-detail/  # GymRoutineDetailScreen (una rutina con sus ejercicios)
    │   ├── daily-routines/      # DailyRoutinesScreen (tareas diarias + "Seguimiento de Rutina")
    │   ├── events/               # EventsScreen (calendario de eventos)
    │   ├── settings/            # SettingsScreen (nombre + backup)
    │   ├── mood-progress/       # MoodProgressScreen
    │   ├── tracker-form/        # CreateTrackerScreen, EditTrackerScreen
    │   └── tracker-progress/    # TrackerProgressScreen
    ├── list/
    │   ├── components/          # ListCard (con estrella, pin y desplegable), CreateListButton,
    │   │                        # CreateListModal, ListEntryRow, ListEntryModal,
    │   │                        # ListEntryInfoModal, ListSortSelector, DateField
    │   ├── viewmodels/          # useLists, useListDetail
    │   └── parseRating.ts       # Parseo/validación del campo Rating / Prioridad
    ├── mood/
    │   ├── components/          # MoodColorPicker, MoodEditor,
    │   │                        # MoodEntrySummary, MoodTrackerCard, DayCell,
    │   │                        # MoodReferenceCards, MoodDayModal
    │   ├── viewmodels/          # useMoodTrackerCard, useMoodProgress
    │   └── parseNoteInput.ts
    ├── tracker/
    │   ├── components/          # TrackerCard, TrackerForm, OptionColorPicker, Counter,
    │   │                        # TrackerDayCell, TrackerDayModal, TrackerStats,
    │   │                        # CreateTrackerButton
    │   └── viewmodels/          # useTrackerCard, useTrackerForm, useTrackerProgress
    ├── finance/
    │   ├── components/          # FinanceSummaryCard (recuadro favoriteable),
    │   │                        # FinanceTransactionModal, FinanceCategoriesModal,
    │   │                        # FinanceReportSection
    │   ├── money.ts             # formatMoney / parseAmount / formatAmountInput
    │   └── period.ts            # FinancePeriod + rango del período
    ├── gym/
    │   ├── components/          # GymTodayCard (recuadro favoriteable, guiado),
    │   │                        # CreateGymRoutineModal, GymRoutineCard,
    │   │                        # GymExerciseModal (con botones de peso), GymExerciseRow
    │   └── viewmodels/          # useGymTodayCard, useGymScreen, useGymRoutineDetail
    ├── dailyRoutine/
    │   ├── components/          # DailyRoutineTaskRow, DailyRoutineTaskModal,
    │   │                        # RoutineTrackerCalendar ("Seguimiento de Rutina")
    │   └── viewmodels/          # useDailyRoutines
    └── event/
        ├── components/          # EventDayCell, EventModal, DayEventsModal, TimeField
        └── viewmodels/          # useEvents
```

### Regla de dependencias

```
presentation ─► domain ◄─ data
        core/di ─► conecta las implementaciones concretas
```

`domain` no conoce a nadie. `data` y `presentation` dependen de `domain` a
través de interfaces. `core/di` es el único lugar que instancia clases concretas.

Única excepción: `domain/dailyRoutine` depende de `domain/tracker` (ver
`SyncRoutineTracker`, sección Rutina diaria) porque "Rutina diaria" necesita
*ser* un tracker más, no solo parecerse a uno.

## Primer arranque

La primera vez que se abre la app, `AppNavigator` mira si hay un **perfil**
guardado (`UserProfile` = `{ name, moodFavorite, financeFavorite, gymFavorite, fontScale,
notifyTrackers, notifyDueTasks, homeTab }`). Si no, arranca en
**`OnboardingScreen`**: pide el **nombre**, avisa que se cambia en Ajustes, lo
guarda y resetea la navegación a Favoritos.

Si ya hay perfil, la app arranca en la **pestaña de inicio** elegida en
Ajustes (`HomeTabCard`) — **Favoritos** por defecto, o cualquiera de
Trackers / Listas / Finanzas / Gimnasio / Eventos. `AppNavigator` mapea
`HomeTab` (del dominio) al nombre de ruta de navegación y lo usa como
`initialRouteName`; como ese valor se fija una sola vez al montar el stack,
cambiar la preferencia solo se nota en el próximo arranque, no al toque. En
**Ajustes** también se cambia el **nombre** (`UserNameCard`); el saludo se
actualiza al volver.

> El **tamaño de letra** global quedó a medio hacer: `FontSizeCard`,
> `core/text/textScale.ts` y el campo `fontScale` del perfil están en el repo
> pero **no montados** (el reemplazo del `Text` de RN no funcionó bien). Se deja
> para retomar.

## Navegación

El título del header de las seis pantallas principales muestra el **nombre de
la pestaña actual** con una flechita ▾
([`HubMenuButton`](src/presentation/navigation/HubMenuButton.tsx)); al tocarlo se
despliega un menú para moverse entre:

- **Favoritos** — la pantalla principal: los trackers y listas marcados con la
  estrella, y el botón "＋ Crear".
- **Trackers** — mood tracker + todos los trackers del usuario.
- **Listas** — las listas del usuario (ver más abajo).
- **Finanzas** — economía actual + ingresos/gastos (ver más abajo).
- **Gimnasio** — rutinas del usuario (ver más abajo).
- **Eventos** — calendario de eventos (ver más abajo).

Es un stack normal (`@react-navigation/native-stack`); las pantallas hub no
muestran flecha de "volver", se cambia entre ellas por el menú, y la transición
es un **fundido suave** (`animation: 'fade'`) en vez del deslizamiento. Las seis
tienen el botón **"Ajustes"** arriba a la derecha
(`SettingsHeaderButton`, en `hubOptions`). El resto de pantallas (progreso,
formularios, ajustes) sí son push con su flecha.

Desde **Favoritos**, deslizar hacia la izquierda navega a **"Rutina diaria"**
(`DailyRoutines`, ver más abajo) y deslizar hacia la derecha desde ahí vuelve.
El gesto usa [`useHorizontalSwipe`](src/presentation/calendar/useHorizontalSwipe.ts)
(el mismo hook que mueve de período en los calendarios, ver más abajo), que
solo reclama el gesto cuando el movimiento es claramente horizontal, así no
rompe el scroll vertical ni los taps de las cards. Favoritos también tiene un
link chico "Rutina Diaria ›" al lado del saludo, como pista de que el gesto
existe.

### Colores

Los fondos son **claros pero no blancos** (`core/theme.ts`): pantalla y header
en un gris azulado suave (`#e9ebf2`), cards un tono por encima (`#f8f9fc`).

## Mood tracker

### Los 9 colores (`domain/mood/entities/MoodColor.ts`)

| Color | Significado |
|-------|-------------|
| Naranja | Bien, tranquilo |
| Violeta | Nervioso, estresado |
| Rojo | Enojado, frustrado |
| Rosa | Alegre, emocionado |
| Gris | Triste, apático |
| Verde | Energizado, motivado |
| Azul | Cansado, desmotivado |
| Amarillo | Seguro, confiado |
| Marrón | Inseguro, raro |

### Reglas de negocio

- Un día tiene **1 o 2** estados de ánimo (nunca 0, nunca repetidos).
- La descripción es opcional.
- La **nota** es opcional: del **1 al 10**, con **hasta un decimal**.
- Un día con 2 colores se dibuja **dividido en diagonal** (abajo-izq / arriba-der).

### Pantallas

- **Trackers**: saludo "Hola {nombre}!", la card del mood tracker, después una
  card por cada tracker del usuario y, al final, el botón **＋ Crear tracker
  nuevo**.
  - Mood card: si hoy no tiene registro → editor (colores + nota + descripción).
    Una vez guardado → modo lectura; se edita desde "Ver progreso". Tiene una
    **estrella** arriba a la derecha (favorito; arranca marcada).
- **Progreso de ánimo**: calendario propio (empieza en lunes) con **Semana /
  Mes / Año**, navegación entre períodos (flechas `‹ ›` o **swipe** horizontal)
  y edición/borrado de cualquier día. En
  **Año**, tocar un mes lo abre. Cada día con nota la muestra sobre los colores;
  arriba se ve el **promedio** de las notas del período. Debajo, las
  **Referencias**: una card por color (emoción + contador), **ordenadas por
  cantidad**. Un día con **un** color suma 1; con **dos** colores suma 0.5 a cada
  uno. En la vista **Año** cada card muestra además el **mes con más
  ocurrencias** de ese color.

## Favoritos

La **pantalla principal**. Junta las cards que el usuario marca con la
**estrella**: el **resumen de finanzas** (`FinanceSummaryCard`) y el **mood
tracker** (incluidos por defecto — flags `financeFavorite` / `moodFavorite` en
`UserProfile`), más los **trackers** y **listas** favoritos (flag `favorite` en
cada entidad, `SetTrackerFavorite` / `SetListFavorite`). `useFavorites` arma la
lista de cards y no hay una colección de "favoritos" aparte.

- **Orden manual.** Botón **"Ordenar"**: entra en modo reordenar, donde cada
  ítem se muestra como una fila compacta (`FavoriteReorderRow`) con flechas
  **▲ / ▼** para subirlo o bajarlo. El orden se guarda como una lista de claves
  (`"finance"`, `"mood"`, `"tracker:<id>"`, `"list:<id>"`) en
  `@app-celu/favorites-order/v1`; al cargar, los ítems no guardados van al final.
- Fuera de ese modo, cada favorito se muestra con su card normal (`TrackerCard`
  / `ListCard` / `FinanceSummaryCard` / `MoodTrackerCard`), con la misma
  estrella para sacarlo.
- Botón **"＋ Crear"**: abre el `CreateChooserModal` (**Tracker** / **Lista** como
  botones centrados, **Cancelar** abajo) y navega a esa
  pestaña (con un param `{ create: true }` que la pantalla consume una vez para
  abrir su flujo de creación).

## Trackers del usuario

Cada tracker tiene un **nombre** y registra por día **opciones y/o un número**
(al menos una de las dos):

- **Opciones**: se eligen **una o dos** por día (como el mood tracker; al tocar
  una tercera se reemplaza la más vieja). Arrancan con **Sí** (verde) / **No**
  (rojo), configurables (nombre y color, de 1 a 6). Con una sola opción funciona
  como un "hecho / no hecho".
- **Número**: un **contador** por día que se va sumando/restando (nunca baja de 0).
- **Comentario**: texto libre opcional por día (`TrackerEntry.comment`), se
  edita desde el día en "Ver progreso" (no desde la card rápida del home).

### Pantallas

- **Nuevo tracker / Editar tracker** ([`tracker-form/`](src/presentation/screens/tracker-form/)):
  nombre, dos checkboxes (**Opciones** / **Número**) y —si tiene opciones— la
  lista editable. Editar además permite **borrar** el tracker (y sus registros).
- **Progreso del tracker** ([`tracker-progress/`](src/presentation/screens/tracker-progress/)):
  el mismo calendario Semana/Mes/Año, navegación entre períodos con flechas
  `‹ ›` o **swipe** horizontal. Los días con dos opciones se pintan
  **divididos en diagonal** (también en la vista
  Año); el número va sobre la celda; si el día tiene comentario, aparece un
  **punto chico arriba a la derecha** (`TrackerDayCell`, prop `hasNote`).
  Abajo, el **resumen**: una card por opción con su conteo y/o **registros /
  promedio / mín / máx / total** del número. "Editar" en la barra superior
  abre el formulario. Tocar un día abre
  [`TrackerDayModal`](src/presentation/tracker/components/TrackerDayModal.tsx),
  con un campo de comentario además de las opciones/el número.

### Card del tracker

- **Opciones**: se eligen 1 o 2 y se toca **Guardar**. Quedan en modo lectura;
  para cambiarlas hay que ir a "Ver progreso" (igual que el mood tracker).
- **Número**: **contador** con − / +. Cada toque persiste al instante; "Borrar"
  lo saca.
- Un tracker con las dos cosas muestra los dos bloques.
- **Estrella** arriba a la derecha: favorito. También hay un checkbox "Agregar a
  Favoritos" en el formulario.

## Listas

Cada **lista** tiene un nombre y un flag **`isTodo`**. Sus **entradas** tienen
**nombre**, **fecha** (opcional), **comentario** (opcional), **rating**
(opcional, un número) y **`done`** (completada, solo se usa en to-do lists).

Una **to-do list** funciona igual que una lista normal, con estas diferencias:
sus entradas se pueden **tildar como completadas**, el "rating" se muestra como
**"Prioridad"** (⚑ en vez de ★), y la fecha es la **fecha de vencimiento
(opcional)** — se puede crear una tarea sin fecha. En la fila, al lado del
nombre dice **`vence: DD/MM/AAAA`**; si ya pasó y la tarea no está completada,
aparece **`vencida`** en rojo (`isEntryOverdue`). Se elige to-do con un
**checkbox** al crear la lista (por defecto, no).

Cada lista tiene también un flag **`favorite`**: una **estrella** a la izquierda
del nombre en la card, más un checkbox "Agregar a Favoritos" en el modal de
crear. Las favoritas aparecen en la pestaña **Favoritos**.

### Card desplegable

Tanto en **Listas** como en **Favoritos**, cada card de lista tiene un botón
con un **triángulo** (▸/▾) que despliega/colapsa una vista **de solo
lectura** de sus ítems — nombre nomás, con **checkbox** en to-do lists.
Tocar un ítem ahí abre un modal mostrando **toda su info** (fecha, prioridad/
rating, estado, comentario —
[`ListEntryInfoModal`](src/presentation/list/components/ListEntryInfoModal.tsx));
tildar el checkbox no abre nada. Para editar, o borrar, hay que entrar a la
lista como siempre. En **Favoritos** además hay un botón de **pin**
([`PinButton`](src/presentation/components/PinButton.tsx), ícono de
[Lucide](https://lucide.dev)): al pinear, la lista queda desplegada por
defecto la próxima vez (`List.pinnedExpanded`, mismo patrón que `favorite`)
— tanto en Favoritos como en Listas, ya que es una propiedad de la lista, no
de la pantalla.

### Pantallas

- **Listas** (hub): saludo "Hola {nombre}!" + "Estas son tus listas", y
  una card por lista con su nombre y su conteo. Las **to-do lists se listan
  primero** y muestran **`hechas/total`** en vez de "N entradas". Tocar la card
  entra a la lista; el **＋** de la card agrega una entrada rápido (abre el
  modal). Abajo, **＋ Crear lista nueva** (el modal tiene el checkbox "Hacerla
  una to-do list").
- **Detalle de la lista** ([`list-detail/`](src/presentation/screens/list-detail/)):
  título = nombre de la lista. Arriba, un selector **Ordenar por: Fecha / A-Z /
  Rating** (dice **Prioridad** en una to-do list). El orden por defecto es
  **Fecha**, salvo en las to-do lists que arrancan por **Prioridad**. Las entradas van **pegadas
  una tras otra, a todo el ancho**, separadas por una línea fina. Cada fila:
  a la izquierda el **nº** (o un **checkbox** en una to-do list, que tacha el
  nombre al tildarlo); arriba **nombre + fecha (DD/MM/AAAA)**; abajo el
  **comentario recortado con “…”** si tiene (y, al lado del nombre, un botón
  **”i”** que aparece si hay fecha, rating o comentario — abre
  [`ListEntryInfoModal`](src/presentation/list/components/ListEntryInfoModal.tsx),
  de solo lectura, con toda la info de la entrada y links tocables en el
  comentario); **★/⚑ rating** a la derecha. Tocar la fila abre el modal para
  editar los campos (o borrar la entrada). Arriba a la derecha, **＋ Entrada**.
  Al fondo, **Borrar esta lista** (borra la lista y sus entradas, con
  confirmación).

Orden de las entradas (`compareListEntries` en el dominio):

| Criterio | Orden | Desempate |
|----------|-------|-----------|
| Fecha | más reciente primero | alfabético |
| A-Z | alfabético por nombre | fecha desc |
| Rating | mayor primero (sin rating al final) | alfabético |

La fecha se elige con el date picker nativo
(`@react-native-community/datetimepicker`).

## Finanzas

Arriba de todo, el **recuadro de resumen** (`FinanceSummaryCard`): la **economía
actual** bien grande (roja si es negativa; el número **se achica solo para
entrar en una línea**) — suma de **ingresos** menos **gastos**, contando cada
repetición mensual que ya ocurrió hasta hoy — y dos botones chicos uno al lado
del otro, **Añadir ingreso** (verde) y **Añadir gasto** (rojo). Tiene una
**estrella**: marcado como favorito (por defecto sí) el recuadro aparece también
en Favoritos, y desde ahí los botones llevan a Finanzas con el modal ya abierto.

Un **movimiento** tiene nombre, fecha, **monto** (obligatorio, > 0), comentario
opcional, una **categoría** y una **repetición** opcional. El campo de monto se
formatea mientras se tipea (`$`, puntos de miles, coma decimal). Si se repite,
impacta la economía el mismo día de cada mes (el último día si el mes es más
corto), ya sea **indefinidamente** o **por N meses** (contando el primero). El
dominio no guarda cada ocurrencia: las calcula al vuelo (`occurrences.ts`).

Al **editar** un movimiento con repetición hay un botón **"Ajustar monto (desde
hoy)"**: se ingresa un monto nuevo y, de esa fecha en adelante, las ocurrencias
valen eso. Se puede usar varias veces (queda una lista de `adjustments` con su
fecha); el monto vigente de cada ocurrencia lo resuelve `financeAmountOn`, y el
desglose muestra "cuota 3/12".

También al editar aparece un checkbox **"Finalizado"**: lo marca con la fecha de
hoy (`finishedOn`) y las cuotas/repeticiones posteriores dejan de calcularse
(las anteriores siguen contando).

**Categorías** (`FinanceCategory`): tienen color, se crean/editan/borran desde el
botón **Categorías**. La primera vez se siembran **Personales / Servicios /
Compras**. Un movimiento sin categoría (o con una categoría borrada) cae en
**General** (sintética, no se guarda).

Abajo, el **desglose** del período elegido (**Semana / Mes / Año**, el que
contiene hoy): totales de ingresos y gastos, y dos vistas:

- **Por categoría**: una fila por categoría con sus totales `+ingresos` /
  `-gastos`; al tocarla se despliegan sus movimientos con la fecha de cada
  ocurrencia. General siempre al final.
- **Ver todo**: la lista completa del período sin separar por categoría.

Tocar cualquier movimiento abre el modal para editarlo o borrarlo.

## Gimnasio

Una **rutina** (`GymRoutine`) es solo un nombre; sus **ejercicios**
(`GymExercise`) tienen nombre, **series**, **repeticiones** (o **"por
tiempo"** en segundos, o **"al fallo"** sin número fijo — las tres, mutuamente
excluyentes), un **peso en kg** (0 = sin peso), un **puesto** interno que
define el orden en la lista y una **descripción opcional** (notas, técnica,
un link a un video, etc.).

- **Nuevo/editar ejercicio** ([`GymExerciseModal`](src/presentation/gym/components/GymExerciseModal.tsx)):
  nombre, series (por defecto **4**) y repeticiones (por defecto **12**, o
  tildar **"Al fallo"** para dejarlas sin número). El peso se ajusta con una
  sola fila `− − − peso + + +` (3 pasos de a −5/−2,5/−1 kg, el valor actual en
  el medio, 3 pasos de a +1/+2,5/+5 kg), con la cantidad de cada botón como
  etiqueta chiquita debajo de él; nunca baja de 0 y solo se muestra en la fila
  del ejercicio cuando es mayor a 0. El puesto ya no se edita a mano acá: un
  ejercicio nuevo siempre se agrega al final. Dos checkboxes mutuamente
  excluyentes (tildar uno destilda el otro): **"Al fallo"** (sin repeticiones
  fijas) y **"Por tiempo"** (el campo pasa a llamarse "Tiempo (segundos)" y se
  muestra siempre en segundos donde sea que aparezca el ejercicio). Al fondo,
  un campo de texto multilínea para la **descripción** (opcional).
- **Info del ejercicio** ([`GymExerciseInfoModal`](src/presentation/gym/components/GymExerciseInfoModal.tsx)):
  si un ejercicio tiene descripción, aparece un círculo **"i"** al lado de su
  nombre (en el detalle de la rutina y en la Rutina de hoy); tocarlo abre un
  modal de solo lectura con el resumen (series × repeticiones y peso) y la
  descripción completa.

### Info con botón "i" (patrón compartido)

El círculo **"i"** y su modal de solo lectura son genéricos
([`InfoButton`](src/presentation/components/InfoButton.tsx) +
[`InfoModal`](src/presentation/components/InfoModal.tsx)), reutilizados por
los ejercicios de gimnasio, las **tareas de Rutina diaria** y las
**entradas de listas** (con comentario): en vez de mostrar la descripción
recortada en la fila, aparece el botón "i" al lado del nombre solo si hay
algo que mostrar. Si la descripción tiene un link (`http(s)://` o `www.`), se
muestra subrayado y se puede tocar para abrirlo
([`LinkedText`](src/presentation/components/LinkedText.tsx), reutilizable
también, parte el texto con un regex y abre el link con `Linking.openURL`).
- **Detalle de la rutina** ([`gym-routine-detail/`](src/presentation/screens/gym-routine-detail/)):
  cada ejercicio muestra cuántas series lleva (`2/4`) con **+/-** para
  sumar/restar sin entrar a editarlo; tocar la fila abre el editor completo.
  "Agregar Ejercicio" arriba a la derecha. Un botón **"Ordenar"/"Listo"**
  cambia la lista a filas con flechas ▲▼ (mismo componente `ReorderRow` que usa
  el reordenamiento de Favoritos) para reordenar los ejercicios a mano; el
  nuevo orden se persiste reescribiendo el `position` de cada uno
  (`ReorderGymExercises`). Al fondo, **"Resetear rutina"** vuelve a 0 las
  series de todos los ejercicios sin esperar al reseteo semanal
  (`ResetGymRoutineProgress`, borra el progreso guardado de esa rutina), y
  debajo, "Borrar esta rutina".
- **Rutina de hoy** ([`GymTodayCard`](src/presentation/gym/components/GymTodayCard.tsx)):
  cuadro para elegir una rutina y hacerla guiado. El selector es un
  **desplegable** (se abre/cierra tocando "Elegir rutina") que **no lista las
  rutinas sin ejercicios** (no hay nada para elegir ahí) y muestra las ya
  completadas esta semana **al final**, tachadas (`line-through`). Una vez
  elegida, muestra el **primer ejercicio sin terminar**, un botón
  grande **"＋"** para sumar una serie (arranca en 0) y un **"−"** para
  deshacer. Al llegar a las series objetivo pasa solo al siguiente ejercicio;
  al terminar todos, la rutina queda **hecha** (*"¡Completaste ... esta
  semana!"*). Al lado del nombre hay dos links: **"Ajustar peso"** (abre
  inline la misma fila `− − − peso + + +` del editor —
  [`WeightStepRow`](src/presentation/gym/components/WeightStepRow.tsx),
  compartida entre los dos lugares — y guarda cada click al toque) y
  **"Saltar ejercicio"** (muestra el siguiente sin terminar en orden de
  puesto, dando la vuelta al final hasta el primero que no esté completado;
  no marca nada como hecho). Tiene su propia **estrella** (favorito por
  defecto) y aparece igual en Favoritos y en Gimnasio.

**Reseteo semanal, sin job en segundo plano.** El progreso de un ejercicio
(`GymExerciseProgress`) se guarda con la fecha del **lunes de esa semana**
(`cycleStart`). Al leerlo, si ese lunes no es el de la semana actual, se trata
como si fueran 0 series hechas (`resolveCompletedSets`) — así "se resetea los
domingos a la noche" (funcionalmente, en el arranque del lunes) sin tener que
programar nada; el primer toque de la semana nueva ya escribe con el
`cycleStart` correcto.

## Rutina diaria

Se llega deslizando hacia la izquierda desde Favoritos (ver más arriba). Son
**tareas** (`DailyRoutineTask`: título + descripción opcional, como una
entrada de lista) con un check que se tilda y se resetea solo todos los
días — mismo patrón de `cycleStart`/`resolveCompletedSets` que el gimnasio,
pero con el **día** en vez de la semana (`DailyTaskProgress { taskId, day,
done }`, `resolveTaskDone`).

- Si no se cargó ninguna tarea todavía, dice **"¡No hiciste una lista de
  tareas diarias aún!"**.
- **"Agregar Tarea"** arriba a la derecha abre el modal de título + descripción
  ([`DailyRoutineTaskModal`](src/presentation/dailyRoutine/components/DailyRoutineTaskModal.tsx));
  tocar una fila la edita, el checkbox la tilda sin abrir nada. Un botón
  **"Ordenar"/"Listo"** (si hay más de una tarea) cambia la lista a filas con
  flechas ▲▼ para reordenarlas a mano — mismo [`ReorderRow`](src/presentation/components/ReorderRow.tsx)
  que ya usan Favoritos y el detalle de una rutina de gimnasio.
- **"Seguimiento de Rutina"**, abajo de todas las tareas
  ([`RoutineTrackerCalendar`](src/presentation/dailyRoutine/components/RoutineTrackerCalendar.tsx),
  solo aparece una vez que existe al menos una tarea): se muestra **igual que
  el progreso de cualquier otro tracker** — semana/mes/año con navegación
  (`useCalendarPeriod`, compartido con mood y los trackers del usuario) y,
  abajo, un contador por color del período
  ([`TrackerStats`](src/presentation/tracker/components/TrackerStats.tsx),
  reutilizado). Es **de solo lectura**: cada vez que se tilda o destilda algo
  se recalcula el % de tareas hechas hoy y se guarda un color para el día de
  hoy — **verde** 100%, **amarillo** 50-99%, **naranja** 25-49%, **rojo**
  0-24% — en un tracker real (sí, de los mismos que puede crear el usuario)
  con id fijo (`daily-routine-tracker`, `SyncRoutineTracker`), reusando las
  mismas celdas que ya pinta cualquier otro tracker. Sin "cierre de día":
  como no hay forma de disparar algo a medianoche sin un job en segundo
  plano, el último cambio del día es el que queda guardado como el color de
  ese día.
- Como "Seguimiento de Rutina" es un tracker real, también aparece en la
  pestaña **Trackers** y se puede favoritear — sale **favorito y primero por
  defecto** en Favoritos, y "Ver progreso" sobre él (desde ahí o desde
  Trackers) abre esta misma pantalla de Rutina diaria en vez del progreso
  genérico de un tracker.

## Eventos

Un **evento** (`CalendarEvent`) tiene nombre, **descripción opcional**, fecha,
**horario desde / hasta** (`HH:MM`, cada uno opcional por separado), color y
una **repetición opcional** (`EventRepeat`): cada cuántos **días o meses**
(a elección), y cómo termina — **nunca**, **hasta una fecha**, o **después
de cierta cantidad de veces**. Igual que los movimientos de Finanzas (ver
más arriba), un evento repetido se guarda **una sola vez**; las fechas en
las que cae se calculan al vuelo para el rango que se está mirando
([`eventOccurrencesInRange`](src/domain/event/entities/occurrences.ts),
sumando días o meses según la unidad — `addMonthsClamped` es la misma
función que usa Finanzas, movida a `core/utils/date.ts` por ser de las
dos), no se materializa una fila por ocurrencia.

- **Calendario** ([`events/`](src/presentation/screens/events/)): semana /
  mes / año con navegación, igual que el progreso de un tracker. Las celdas
  son **más altas que anchas** (para que entren franjas de color apiladas,
  una por evento de ese día — `EventDayCell`); si hay más de 3 eventos un
  mismo día, se muestra `+N`. Arriba de todo, **"＋ Agregar evento"**.
- **Semana y mes entran en pantalla sin scroll**: a diferencia de los otros
  calendarios (que viven en un `ScrollView`), estas dos vistas calculan el
  tamaño de celda con `CalendarMonth`/`CalendarWeek` en modo `fitHeight` —
  la celda crece hasta el máximo que entra tanto a lo ancho (pantalla ÷ 7)
  como a lo alto disponible, sin desbordar. La vista Año (12 mini-calendarios)
  queda afuera de esto y sigue con su propio scroll si no entra.
- **El alto de celda estira para ocupar siempre toda la pantalla, y varía
  de mes a mes**: en la vista de mes, `cellHeight` es directamente el alto
  disponible ÷ la cantidad de filas real de ese mes (4 a 6) — no un
  mínimo ni un máximo fijo, así que un mes de 4 filas queda con celdas más
  altas que uno de 6, pero ambos llenan la pantalla completa. (`CalendarWeek`
  no estira así: una sola fila ya tiene de sobra alto disponible.) El
  espacio entre celdas también se achicó (`gap`, prop opcional de
  `CalendarMonth`/`CalendarWeek`) y el "chrome" de arriba (botón de
  agregar, selector `[Semana | Mes | Año]` en modo `compact`, flechas y
  título del período) se hizo más chico — todo eso le deja más alto
  disponible a la celda.
- **La fila `L M M J V S D` siempre a la misma altura y a todo el ancho**:
  el contenedor de `fitHeight` no centra su contenido (ni vertical ni
  horizontalmente) — la fila de letras queda siempre pegada debajo del
  título del mes, y tanto ella como la grilla de días usan
  `justifyContent: 'space-between'` para repartir cualquier resto de
  redondeo **entre** columnas en vez de dejarlo afuera como margen.
- **Celdas pegadas, sin espacio entre ellas**: el ancho de celda se calcula
  **separado** del alto — siempre sale de repartir el ancho de pantalla en
  7 columnas (nunca se achica por falta de alto, al revés de como era
  antes), y el alto es el que se ajusta para entrar en la pantalla. Con
  `gap={0}` en `CalendarMonth`/`CalendarWeek`, no queda espacio entre
  celdas ni entre filas.
- **Vista de mes con semanas completas**: cuando el 1° o el último día del
  mes no cae en lunes/domingo, se completan los huecos con los días del mes
  vecino (`CalendarMonth` con `showOverflowDays`) en vez de dejarlos en
  blanco. Esos días "de relleno" se pintan en un gris más clarito
  (`theme.colors.background`) para diferenciarlos del mes actual, pero
  muestran sus eventos igual que cualquier otro día — el rango que se
  carga para la vista de mes también se extiende a esas semanas completas.
- **Nuevo/editar evento** ([`EventModal`](src/presentation/event/components/EventModal.tsx)):
  nombre, descripción (opcional, multilínea), fecha
  ([`DateField`](src/presentation/list/components/DateField.tsx), reutilizado
  de Listas), horario **desde** y **hasta**
  ([`TimeField`](src/presentation/event/components/TimeField.tsx), dos
  instancias — cada una opcional, con una cruz para borrar el horario una
  vez puesto), color (paleta de
  [`OptionColorPicker`](src/presentation/tracker/components/OptionColorPicker.tsx),
  reutilizado de los trackers, **sin el marrón** — prop `colors` opcional,
  Trackers y Finanzas siguen con la paleta completa) y un checkbox **"Se
  repite"** que despliega la cantidad y la unidad (**días** o **meses**,
  cada una con su propio default — 7 y 1 — y su propio tope máximo) y el
  tipo de fin: un **combo box**
  ([`SelectField`](src/presentation/components/SelectField.tsx), genérico y
  compartible) con el campo de cantidad o fecha a la **derecha**, en la
  misma fila (Nunca → nada / Hasta una fecha → `DateField` / Cantidad de
  veces → número).
- **Tocar un día** abre sus eventos en un modal
  ([`DayEventsModal`](src/presentation/event/components/DayEventsModal.tsx),
  con **"＋ Agregar evento"** pre-cargando esa fecha). Cada fila tiene dos
  zonas: un **lápiz** a la izquierda que abre directo a editar, y el resto
  de la fila (punto de color, horario, nombre y, si tiene, una línea con la
  descripción) que abre un **modal de detalle de solo lectura**
  ([`EventDetailModal`](src/presentation/event/components/EventDetailModal.tsx),
  reutiliza el `InfoModal` genérico de descripciones) sin cerrar la lista
  de abajo.
- **Borrar un evento que se repite** pregunta qué borrar: **solo ese día**
  (se agrega a `excludedDates` y la serie sigue) o **ese día y los que
  siguen** (trunca la repetición el día anterior; si era la primera
  ocurrencia, se borra el evento entero). Si el evento no se repite, se
  borra directo sin preguntar. Caso de uso:
  [`DeleteEventOccurrence`](src/domain/event/usecases/DeleteEventOccurrence.ts).

## Notificaciones

Notificaciones **locales programadas** (`expo-notifications`): se le dice al SO
cuándo mostrarlas y se disparan aunque la app esté cerrada. Hay dos, cada una
con su switch en **Ajustes** (`NotificationsCard`, arrancan apagadas; prenderlas
pide permiso):

1. **Recordar cargar trackers** — todos los días a las **23:00**, solo si quedan
   trackers (o el mood de hoy) sin cargar. Texto: *"Recordá cargar tus trackers
   antes de que empiece el día!"*.
2. **Avisar tareas por vencer** — el **día antes** (09:00) de que venza una tarea
   de una to-do list que no esté completada. Texto: *"Recuerda que {tarea} se
   vence mañana!"*.

Como una notificación programada no puede evaluar nada al dispararse, la lógica
condicional (¿faltan trackers? ¿la tarea sigue pendiente?) se **recalcula** cada
vez que la app pasa a primer o segundo plano (`syncNotifications` en
`AppNavigator` con un listener de `AppState`): cancela y re-agenda. Los días
futuros se agendan como red de seguridad y se re-evalúan al llegar. Detalle:
`core/notifications/notifications.ts`.

> **No funcionan en Expo Go** (SDK 53+): `expo-notifications` se carga de forma
> perezosa y solo en un build real. Hay que probar en un build de EAS
> (development/preview), que además hay que rehacer por el módulo nativo nuevo.

## Persistencia

Todo **local** con AsyncStorage, cada cosa en su blob JSON:

| Clave (`core/storage/keys.ts`) | Contenido |
|-------|-----------|
| `@app-celu/user-profile/v1` | `{ name, moodFavorite, financeFavorite, gymFavorite, fontScale, notifyTrackers, notifyDueTasks }` |
| `@app-celu/mood-entries/v1` | `{ [fecha]: MoodEntryDto }` |
| `@app-celu/trackers/v1` | `{ [trackerId]: TrackerDto }` (config + `favorite` de los trackers) |
| `@app-celu/tracker-entries/v1` | `{ [trackerId]: { [fecha]: TrackerEntryDto } }` |
| `@app-celu/lists/v1` | `{ [listId]: ListDto }` (nombre + `isTodo` + `favorite` + `pinnedExpanded` de cada lista) |
| `@app-celu/list-entries/v1` | `{ [listId]: { [entryId]: ListEntryDto } }` |
| `@app-celu/finance-categories/v1` | `{ [id]: FinanceCategoryDto }` (siembra defaults la 1ª vez) |
| `@app-celu/finance-transactions/v1` | `{ [id]: FinanceTransactionDto }` (movimientos) |
| `@app-celu/favorites-order/v1` | `string[]` (orden manual de la pantalla Favoritos) |
| `@app-celu/gym-routines/v1` | `{ [routineId]: GymRoutineDto }` |
| `@app-celu/gym-exercises/v1` | `{ [routineId]: { [exerciseId]: GymExerciseDto } }` |
| `@app-celu/gym-progress/v1` | `{ [routineId]: { [exerciseId]: GymProgressDto } }` (series de la semana actual) |
| `@app-celu/gym-selection/v1` | `{ routineId }` (rutina elegida para hoy) |
| `@app-celu/daily-routine-tasks/v1` | `{ [taskId]: DailyRoutineTaskDto }` |
| `@app-celu/daily-task-progress/v1` | `{ [taskId]: DailyTaskProgressDto }` (hecha hoy, por tarea) |
| `@app-celu/events/v1` | `{ [eventId]: EventDto }` (nombre, fecha, horario, color, repetición) |

Las claves están todas en `core/storage/keys.ts` para que el **backup** sepa qué
exportar/importar (todo en un solo archivo). Para cambiar a SQLite o a una API basta con escribir otra
implementación de los datasources / repositorios y cambiarla en
`core/di/container.ts`.
