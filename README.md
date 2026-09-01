# app-celu

Tracker de hábitos hecho con **Expo + React Native + TypeScript**, organizado
con **Clean Architecture**. El **mood tracker** es el tracker especial y fijo;
además el usuario puede **crear sus propios trackers** (de opciones o de número).

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
a la derecha en el Home):

- **Exportar datos**: genera un archivo `.json` con todo y abre el menú de
  compartir (mandátelo a Google Drive / mail / WhatsApp).
- **Importar datos**: elegís un `.json` exportado antes y **reemplaza** todos
  los datos actuales. Sirve para restaurar tras reinstalar o para pasar de
  teléfono.

## Estructura (Clean Architecture)

```
src/
├── domain/                      # Reglas de negocio puras. No importa React ni Expo.
│   ├── entities/User.ts
│   ├── usecases/GetWelcomeMessage.ts
│   ├── mood/
│   │   ├── entities/            # MoodColor, MoodEntry (colores, descripción, nota 1-10)
│   │   ├── repositories/        # MoodRepository (puerto)
│   │   └── usecases/            # GetMoodEntry, SaveMoodEntry, DeleteMoodEntry, GetMoodRange
│   ├── tracker/
│   │   ├── entities/            # Tracker (kind 'options' | 'number', opciones), TrackerEntry
│   │   ├── repositories/        # TrackerRepository, TrackerEntryRepository (puertos)
│   │   └── usecases/            # Create/Update/Delete/GetTracker(s), Save/Delete/GetTrackerEntry,
│   │                            # GetTrackerRange (registros + estadísticas del rango)
│   └── backup/                  # BackupBundle + BackupRepository + ExportBackup/ImportBackup
│
├── data/                        # Implementa los puertos del dominio
│   ├── repositories/            # UserRepositoryImpl
│   ├── mood/                    # dto + AsyncStorage datasource + repo impl
│   ├── tracker/                 # dto + AsyncStorage datasources + repo impls
│   └── backup/                  # BackupRepositoryImpl (multiGet/multiSet sobre AsyncStorage)
│
├── core/
│   ├── di/container.ts          # Composition root: arma todas las dependencias
│   ├── navigation/              # Stack tipado (Home, Settings, MoodProgress, CreateTracker,
│   │                            # EditTracker, TrackerProgress)
│   ├── storage/keys.ts          # Todas las claves de AsyncStorage (las usa el backup)
│   └── utils/                   # date.ts (fechas ISO locales + formateo es), id.ts
│
└── presentation/                # UI (patrón ViewModel con hooks)
    ├── calendar/                # Calendario GENÉRICO reutilizable:
    │                            # CalendarWeek/Month/Year (render-prop por día),
    │                            # CalendarViewSwitch, useCalendarPeriod
    ├── backup/                  # useBackup (exportar/importar el .json)
    ├── screens/
    │   ├── home/                # HomeScreen + useHomeViewModel
    │   ├── settings/            # SettingsScreen (Ajustes y backup)
    │   ├── mood-progress/       # MoodProgressScreen
    │   ├── tracker-form/        # CreateTrackerScreen, EditTrackerScreen
    │   └── tracker-progress/    # TrackerProgressScreen
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

- **Home**: saludo "Bienvenido Facu", la card del mood tracker, después una card
  por cada tracker del usuario y, al final, el botón **＋ Crear tracker nuevo**.
  - Mood card: si hoy no tiene registro → editor (colores + nota + descripción).
    Una vez guardado → modo lectura; se edita desde "Ver progreso".
- **Progreso de ánimo**: calendario propio (empieza en lunes) con **Semana /
  Mes / Año**, navegación entre períodos y edición/borrado de cualquier día. En
  **Año**, tocar un mes lo abre. Cada día con nota la muestra sobre los colores;
  arriba se ve el **promedio** de las notas del período. Debajo, las
  **Referencias**: una card por color (emoción + contador del período). Orden
  fijo: naranja solo, después rojo/violeta, rosa/gris, verde/azul, amarillo/marrón.

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
  el mismo calendario Semana/Mes/Año.
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

## Persistencia

Todo **local** con AsyncStorage, cada cosa en su blob JSON:

| Clave (`core/storage/keys.ts`) | Contenido |
|-------|-----------|
| `@app-celu/mood-entries/v1` | `{ [fecha]: MoodEntryDto }` |
| `@app-celu/trackers/v1` | `{ [trackerId]: TrackerDto }` (config de los trackers) |
| `@app-celu/tracker-entries/v1` | `{ [trackerId]: { [fecha]: TrackerEntryDto } }` |

Las claves están todas en `core/storage/keys.ts` para que el **backup** sepa qué
exportar/importar. Para cambiar a SQLite o a una API basta con escribir otra
implementación de los datasources / repositorios y cambiarla en
`core/di/container.ts`.
