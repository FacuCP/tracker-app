# app-celu

App personal hecha con **Expo + React Native + TypeScript**, organizada con
**Clean Architecture**. Tiene cuatro áreas, elegibles desde el menú del header:

- **Favoritos** — pantalla principal. Junta los trackers y listas marcados con la
  estrella; tiene un botón "＋ Crear" (tracker o lista).
- **Trackers** — el **mood tracker** (especial y fijo) + los **trackers** que
  crea el usuario (de opciones o de número).
- **Listas** — listas del usuario con entradas (nombre, fecha, comentario,
  rating); una lista puede ser una **to-do list** (entradas que se tildan).
- **Finanzas** — *función futura*.

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
a la derecha, en cualquiera de las tres pestañas):

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
│   │   ├── entities/            # UserProfile (nombre + pestaña de inicio)
│   │   ├── repositories/        # UserRepository (puerto)
│   │   └── usecases/            # GetUserProfile, UpdateUserProfile, GetWelcomeMessage
│   ├── mood/
│   │   ├── entities/            # MoodColor, MoodEntry (colores, descripción, nota 1-10)
│   │   ├── repositories/        # MoodRepository (puerto)
│   │   └── usecases/            # GetMoodEntry, SaveMoodEntry, DeleteMoodEntry, GetMoodRange
│   ├── tracker/
│   │   ├── entities/            # Tracker (kind 'options' | 'number', opciones), TrackerEntry
│   │   ├── repositories/        # TrackerRepository, TrackerEntryRepository (puertos)
│   │   └── usecases/            # Create/Update/Delete/GetTracker(s), Save/Delete/GetTrackerEntry,
│   │                            # GetTrackerRange (registros + estadísticas del rango)
│   ├── list/
│   │   ├── entities/            # List (nombre, isTodo), ListEntry (nombre, fecha, comentario,
│   │   │                        # rating, done) + compareListEntries (3 criterios de orden)
│   │   ├── repositories/        # ListRepository, ListEntryRepository (puertos)
│   │   └── usecases/            # Create/Delete/GetList(s), GetListEntries (ordenadas),
│   │                            # Save/DeleteListEntry, SetListEntryDone
│   └── backup/                  # BackupBundle + BackupRepository + ExportBackup/ImportBackup
│
├── data/                        # Implementa los puertos del dominio
│   ├── user/                    # dto + AsyncStorage datasource + repo impl
│   ├── mood/                    # dto + AsyncStorage datasource + repo impl
│   ├── tracker/                 # dto + AsyncStorage datasources + repo impls
│   ├── list/                    # dto + AsyncStorage datasources + repo impls
│   └── backup/                  # BackupRepositoryImpl (multiGet/multiSet sobre AsyncStorage)
│
├── core/
│   ├── di/container.ts          # Composition root: arma todas las dependencias
│   ├── navigation/              # Stack tipado (Onboarding, Favorites, Trackers, Lists,
│   │                            # ListDetail, Finances, Settings, MoodProgress, CreateTracker,
│   │                            # EditTracker, TrackerProgress) + gate de primer arranque
│   ├── storage/keys.ts          # Todas las claves de AsyncStorage (las usa el backup)
│   ├── theme.ts                 # Paleta: fondos claros (no blancos) + acento
│   └── utils/                   # date.ts (fechas ISO locales + formateo es), id.ts
│
└── presentation/                # UI (patrón ViewModel con hooks)
    ├── calendar/                # Calendario GENÉRICO reutilizable:
    │                            # CalendarWeek/Month/Year (render-prop por día),
    │                            # CalendarViewSwitch, useCalendarPeriod
    ├── navigation/              # HubMenuButton (menú del header), SettingsHeaderButton
    ├── components/              # ComingSoon (placeholder), KeyboardAvoider, Checkbox, FavoriteStar
    ├── backup/                  # useBackup (exportar/importar el .json)
    ├── user/components/         # UserNameCard (Ajustes)
    ├── screens/
    │   ├── onboarding/          # OnboardingScreen (elegir el nombre, la 1ª vez)
    │   ├── favorites/           # FavoritesScreen + useFavorites + CreateChooserModal (principal)
    │   ├── trackers/            # TrackersScreen + useTrackersViewModel
    │   ├── lists/               # ListsScreen (todas las listas)
    │   ├── list-detail/         # ListDetailScreen (una lista con sus entradas)
    │   ├── finances/            # FinancesScreen (función futura)
    │   ├── settings/            # SettingsScreen (nombre + backup)
    │   ├── mood-progress/       # MoodProgressScreen
    │   ├── tracker-form/        # CreateTrackerScreen, EditTrackerScreen
    │   └── tracker-progress/    # TrackerProgressScreen
    ├── list/
    │   ├── components/          # ListCard (con estrella), CreateListButton, CreateListModal,
    │   │                        # ListEntryRow, ListEntryModal, ListSortSelector, DateField
    │   ├── viewmodels/          # useLists, useListDetail
    │   └── parseRating.ts       # Parseo/validación del campo Rating / Prioridad
    ├── mood/
    │   ├── components/          # DiagonalSplitSquare, MoodColorPicker, MoodEditor,
    │   │                        # MoodEntrySummary, MoodTrackerCard, DayCell,
    │   │                        # MoodReferenceCards, MoodDayModal
    │   ├── viewmodels/          # useMoodTrackerCard, useMoodProgress
    │   └── parseNoteInput.ts
    └── tracker/
        ├── components/          # TrackerCard, TrackerForm, OptionColorPicker, Counter,
        │                        # TrackerDayCell, TrackerDayModal, TrackerStats,
        │                        # CreateTrackerButton
        └── viewmodels/          # useTrackerCard, useTrackerForm, useTrackerProgress
```

### Regla de dependencias

```
presentation ─► domain ◄─ data
        core/di ─► conecta las implementaciones concretas
```

`domain` no conoce a nadie. `data` y `presentation` dependen de `domain` a
través de interfaces. `core/di` es el único lugar que instancia clases concretas.

## Primer arranque

La primera vez que se abre la app, `AppNavigator` mira si hay un **perfil**
guardado (`UserProfile` = `{ name, moodFavorite }`). Si no, arranca en
**`OnboardingScreen`**: pide el **nombre**, avisa que se cambia en Ajustes, lo
guarda y resetea la navegación a Favoritos.

Si ya hay perfil, la app arranca siempre en **Favoritos**. El nombre se cambia en
**Ajustes** (`UserNameCard`); el saludo se actualiza al volver.

## Navegación

El título del header de las cuatro pantallas principales muestra el **nombre de
la pestaña actual** con una flechita ▾
([`HubMenuButton`](src/presentation/navigation/HubMenuButton.tsx)); al tocarlo se
despliega un menú para moverse entre:

- **Favoritos** — la pantalla principal: los trackers y listas marcados con la
  estrella, y el botón "＋ Crear".
- **Trackers** — mood tracker + todos los trackers del usuario.
- **Listas** — las listas del usuario (ver más abajo).
- **Finanzas** — *función futura* (placeholder).

Es un stack normal (`@react-navigation/native-stack`); las pantallas hub no
muestran flecha de "volver", se cambia entre ellas por el menú, y la transición
es un **fundido suave** (`animation: 'fade'`) en vez del deslizamiento. Las cuatro
tienen el botón **"Ajustes"** arriba a la derecha
(`SettingsHeaderButton`, en `hubOptions`). El resto de pantallas (progreso,
formularios, ajustes) sí son push con su flecha.

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
  Mes / Año**, navegación entre períodos y edición/borrado de cualquier día. En
  **Año**, tocar un mes lo abre. Cada día con nota la muestra sobre los colores;
  arriba se ve el **promedio** de las notas del período. Debajo, las
  **Referencias**: una card por color (emoción + contador del período). Orden
  fijo: naranja solo, después rojo/violeta, rosa/gris, verde/azul, amarillo/marrón.

## Favoritos

La **pantalla principal**. Junta los trackers y las listas que el usuario marcó
con la **estrella** (flag `favorite` en cada entidad; se togglea con
`SetTrackerFavorite` / `SetListFavorite`). `useFavorites` trae todo y filtra por
`.favorite` — no hay una colección de "favoritos" aparte. El **mood tracker**
está incluido por defecto (su flag vive en `UserProfile.moodFavorite`, arranca
en `true`) y se puede sacar con su propia estrella.

- Cada favorito se muestra con su card normal (`TrackerCard` / `ListCard`), con
  la misma estrella para sacarlo.
- Botón **"＋ Crear"**: abre el `CreateChooserModal` (**Tracker** / **Lista** como
  botones centrados, **Cancelar** abajo) y navega a esa
  pestaña (con un param `{ create: true }` que la pantalla consume una vez para
  abrir su flujo de creación).

## Trackers del usuario

Versión más simple del mood tracker. Cada tracker tiene un **nombre** y un
**tipo**, y se registra **un solo valor por día**.

- **Tracker de opciones**: se elige una opción por día. Arranca con **Sí**
  (verde) y **No** (rojo), pero las opciones se configuran (nombre y color, de 1
  a 6). Con una sola opción funciona como un "hecho / no hecho".
- **Tracker de número**: un **contador** por día que se va sumando/restando
  (nunca baja de 0).

### Pantallas

- **Nuevo tracker / Editar tracker** ([`tracker-form/`](src/presentation/screens/tracker-form/)):
  nombre, tipo y —si es de opciones— la lista de opciones editable. Editar
  además permite **borrar** el tracker (y todos sus registros).
- **Progreso del tracker** ([`tracker-progress/`](src/presentation/screens/tracker-progress/)):
  el mismo calendario Semana/Mes/Año. Además del control de arriba, se puede
  **swipear el calendario** a los lados para cambiar de vista (izquierda =
  alejar hacia Año, derecha = acercar hacia Semana).
  - Opciones → el día se pinta del color de la opción; abajo, una card por
    opción con su conteo del período.
  - Número → el contador se muestra sobre el día; abajo, **registros / promedio /
    mínimo / máximo / total**.
  - "Editar" en la barra superior abre el formulario de edición.

### Card del tracker

- **Opciones**: se elige una opción y se toca **Guardar**. Una vez guardado el
  día queda en modo lectura; para cambiarlo hay que ir a "Ver progreso" (igual
  que el mood tracker).
- **Número**: es un **contador** con botones − / +. Cada toque persiste al
  instante, así se puede seguir ajustando durante el día; "Borrar" lo saca.
- **Estrella** en la esquina superior derecha: marca/desmarca el tracker como
  favorito. También hay un checkbox "Agregar a Favoritos" en el formulario de
  crear/editar.

## Listas

Cada **lista** tiene un nombre y un flag **`isTodo`**. Sus **entradas** tienen
**nombre**, **fecha**, **comentario** (opcional), **rating** (opcional, un
número) y **`done`** (completada, solo se usa en to-do lists).

Una **to-do list** funciona igual que una lista normal, con dos diferencias:
sus entradas se pueden **tildar como completadas**, y el "rating" se muestra
como **"Prioridad"** (⚑ en vez de ★). Se elige con un **checkbox** al crear la
lista (por defecto, no).

Cada lista tiene también un flag **`favorite`**: una **estrella** a la izquierda
del nombre en la card, más un checkbox "Agregar a Favoritos" en el modal de
crear. Las favoritas aparecen en la pestaña **Favoritos**.

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
  **comentario recortado con “…”** si tiene; **★/⚑ rating** a la derecha. Se
  tocan para abrir el modal y ver el comentario completo / editar los campos (o
  borrar la entrada). Arriba a la derecha, **＋ Entrada**. Al fondo, **Borrar
  esta lista** (borra la lista y sus entradas, con confirmación).

Orden de las entradas (`compareListEntries` en el dominio):

| Criterio | Orden | Desempate |
|----------|-------|-----------|
| Fecha | más reciente primero | alfabético |
| A-Z | alfabético por nombre | fecha desc |
| Rating | mayor primero (sin rating al final) | alfabético |

La fecha se elige con el date picker nativo
(`@react-native-community/datetimepicker`).

## Persistencia

Todo **local** con AsyncStorage, cada cosa en su blob JSON:

| Clave (`core/storage/keys.ts`) | Contenido |
|-------|-----------|
| `@app-celu/user-profile/v1` | `{ name, moodFavorite }` (nombre + si el mood tracker es favorito) |
| `@app-celu/mood-entries/v1` | `{ [fecha]: MoodEntryDto }` |
| `@app-celu/trackers/v1` | `{ [trackerId]: TrackerDto }` (config + `favorite` de los trackers) |
| `@app-celu/tracker-entries/v1` | `{ [trackerId]: { [fecha]: TrackerEntryDto } }` |
| `@app-celu/lists/v1` | `{ [listId]: ListDto }` (nombre + `isTodo` + `favorite` de cada lista) |
| `@app-celu/list-entries/v1` | `{ [listId]: { [entryId]: ListEntryDto } }` |

Las claves están todas en `core/storage/keys.ts` para que el **backup** sepa qué
exportar/importar (todo en un solo archivo). Para cambiar a SQLite o a una API basta con escribir otra
implementación de los datasources / repositorios y cambiarla en
`core/di/container.ts`.
