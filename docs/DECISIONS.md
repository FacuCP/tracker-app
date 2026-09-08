# Decisiones de diseño

Este documento registra **por qué** la app está hecha como está. Cada entrada
describe el contexto, la decisión tomada, las alternativas que se descartaron y
las consecuencias (incluido lo que habría que revisar si algo cambia).

El formato es de "ADR liviano" (Architecture Decision Record). Las decisiones
están ordenadas de lo más general (stack) a lo más puntual (detalles de UI).

---

## 1. Stack: Expo + React Native + TypeScript

**Contexto.** Se pidió una "aplicación de teléfono" en TypeScript.

**Decisión.** Expo (flujo *managed*) sobre React Native, con TypeScript en modo
`strict`.

**Alternativas descartadas.**

- **React Native CLI (bare).** Da más control nativo pero exige Android
  Studio / Xcode configurados y mucho más setup. No hace falta para esta app.
- **Ionic + Capacitor.** WebView en vez de UI nativa; peor sensación y no aporta
  nada acá.

**Consecuencias.**

- Se prueba con **Expo Go** escaneando un QR, sin compilar nada localmente.
- Las librerías nativas quedan limitadas a las compatibles con Expo Go, o hay
  que pasar a *development builds*. Para este proyecto alcanza de sobra.
- `tsconfig.json` extiende `expo/tsconfig.base` y solo agrega `strict: true` y
  `jsx: "react-native"`.

---

## 2. Arquitectura: Clean Architecture por capas

**Contexto.** Se pidió explícitamente "clean architecture".

**Decisión.** Tres capas con la **regla de dependencias apuntando hacia
adentro**:

```
presentation ──►  domain  ◄── data
             core/di ──► instancia las implementaciones concretas
```

- **`domain/`** — Reglas de negocio puras. No importa React, Expo, ni
  AsyncStorage. Contiene entidades, *puertos* (interfaces de repositorio) y
  casos de uso.
- **`data/`** — Implementa los puertos del dominio. Conoce AsyncStorage, DTOs,
  serialización.
- **`presentation/`** — UI. Conoce React Native y navegación. Depende del
  dominio solo a través de casos de uso.
- **`core/`** — Infraestructura transversal: composition root, navegación,
  utilidades de fecha.

**Consecuencias.**

- El dominio es testeable sin renderizar nada ni tocar el storage.
- Cambiar de AsyncStorage a SQLite o a una API es escribir otra implementación
  de `MoodRepository` y cambiar una línea en `core/di/container.ts`.
- Hay más archivos y más "ceremonia" (interfaces, mappers) que en una app
  chica hecha de cualquier forma. Es el costo aceptado a cambio de que la base
  aguante crecer a varios trackers.

---

## 3. Organización: sub-carpetas por *feature* dentro de cada capa

**Contexto.** El mood tracker es "distinto a los demás" y se vienen más
trackers.

**Decisión.** Dentro de `domain/`, `data/` y `presentation/` cada feature tiene
su carpeta (`domain/mood/`, `data/mood/`, `presentation/mood/`). Lo que hoy es
transversal y mínimo (el usuario / saludo) queda en la raíz de cada capa.

**Alternativas descartadas.**

- **Todo por tipo de archivo** (`entities/`, `usecases/`, ...). Escala mal:
  para tocar "mood" habría que saltar entre diez carpetas.
- **Feature-first total** (`features/mood/{domain,data,ui}`). Válido, pero se
  prefirió que la capa sea el eje primario para que la regla de dependencias
  quede visible en el árbol de carpetas.

**Consecuencias.** Agregar un tracker nuevo es crear `domain/<x>/`,
`data/<x>/`, `presentation/<x>/` y registrar sus casos de uso en el container.

---

## 4. Inyección de dependencias: *composition root* manual

**Contexto.** Los casos de uso necesitan repositorios; los repositorios,
datasources.

**Decisión.** Un único archivo, [`core/di/container.ts`](../src/core/di/container.ts),
arma todo el grafo de objetos a mano y exporta un objeto `container` con los
casos de uso ya construidos. La UI hace `container.saveMoodEntry.execute(...)`.

**Alternativas descartadas.**

- **Librería de DI** (InversifyJS, tsyringe). Suma dependencia y decoradores
  para un grafo que hoy tiene ~5 nodos.
- **Context de React + providers.** Mezcla el cableado con el árbol de
  componentes; se quiso que el dominio se pueda usar desde fuera de React.

**Consecuencias.**

- Simple y explícito: se lee el grafo entero en un archivo.
- El `container` es un singleton de módulo. Para tests que necesiten aislar el
  storage habrá que parametrizarlo o exponer una *factory*. Aceptable por ahora.

---

## 5. Presentación: patrón ViewModel con hooks

**Contexto.** Hay que separar "qué muestra la pantalla" de "cómo obtiene y
guarda los datos".

**Decisión.** Cada pantalla o componente con estado tiene un hook `useXxxViewModel`
/ `useXxx` que:

- llama a los casos de uso del `container`,
- expone estado ya digerido (`loading`, `colors`, `dateLabel`, ...) y acciones
  (`save`, `goToNextMonth`, ...).

Los componentes son casi sin lógica: reciben del hook y pintan.

**Consecuencias.**

- La lógica de pantalla se puede testear con `@testing-library/react-hooks`
  sin montar UI.
- Los componentes visuales (`DiagonalSplitSquare`, `MoodColorPicker`) quedan
  "tontos" y reutilizables.

---

## 6. Casos de uso como clases con `execute()`

**Decisión.** Cada caso de uso es una clase que recibe sus dependencias por
constructor y expone un único método `execute(...)`.

**Alternativas descartadas.** Funciones sueltas con las dependencias como
parámetros. Funcionan, pero la clase deja el "cableado" (constructor) separado
de la "invocación" (`execute`), que es lo que hace el container.

**Consecuencias.** Consistencia: toda intención de negocio se ve igual y se
registra igual en el container.

---

## 7. Los estados de ánimo son un conjunto cerrado de "colores"

**Contexto.** El mood tracker maneja hasta dos estados por día, cada uno con un
color y un significado fijos (naranja = bien/tranquilo, etc.).

**Decisión.** Modelar `MoodColor` como una *unión de strings* cerrada
(`'orange' | 'violet' | ...`) y una tabla `MOOD_COLORS` con nombre, significado
y hex. Vive en el **dominio** porque "son estos nueve y no otros" es una regla
de negocio, no un detalle de UI.

**Alternativas descartadas.**

- **Guardar el hex directamente** como estado de ánimo. Ata el dato a una
  decisión de estilo; cambiar un color de la paleta reescribiría el historial.
- **Estados de ánimo de texto libre.** Contradice el pedido (colores fijos) y
  rompe el calendario.

**Consecuencias.**

- En el storage se guarda `"orange"`, no `"#F5A623"`. Los hex se pueden
  retocar sin migrar datos.
- Agregar o quitar un color es tocar un solo array. `isMoodColor()` filtra
  valores desconocidos al leer (tolerante a futuras versiones).

---

## 8. `MoodEntry`: validación en la fábrica de la entidad

**Decisión.** `createMoodEntry()` es el único camino para crear un registro
válido. Ahí se aplican las reglas:

- 1 o 2 colores (`MAX_MOODS_PER_DAY = 2`), nunca 0;
- sin colores repetidos (se deduplica);
- la descripción se *trimea* y, si queda vacía, se guarda como `undefined`.

**Consecuencias.** Ni la UI ni la capa de datos pueden construir un registro
inválido. `SaveMoodEntry` simplemente llama a la fábrica antes de persistir.

---

## 9. Fechas como string ISO corto en hora local

**Contexto.** Un "día" del tracker tiene que ser el mismo sin importar la zona
horaria ni la hora.

**Decisión.** Toda fecha de calendario se representa como `"YYYY-MM-DD"`
(`IsoDate`) calculada en **hora local** del dispositivo. Helpers en
[`core/utils/date.ts`](../src/core/utils/date.ts): `todayIso`, `toIsoDate`,
`fromIsoDate`, más formateo en español.

**Alternativas descartadas.**

- **Objetos `Date`.** Cargan hora, zona y son mutables; fáciles de comparar mal.
- **Timestamps UTC.** Un registro hecho a las 23:00 en Argentina caería al día
  siguiente. No queremos eso.

**Consecuencias.**

- Comparar y ordenar fechas es comparar strings (el orden lexicográfico
  coincide con el cronológico).
- Se asume que el usuario no viaja entre zonas horarias esperando que el
  historial se "reinterprete". Correcto para un tracker personal.

---

## 10. Persistencia: AsyncStorage con un único blob JSON por fecha

**Contexto.** Hay que guardar los registros localmente en el teléfono.
Restricción del entorno: la conexión para instalar dependencias es muy lenta,
así que se busca minimizar librerías.

**Decisión.** `@react-native-async-storage/async-storage` (viene incluido en
Expo Go, cero configuración nativa). Todos los registros se guardan bajo **una
sola clave** `@app-celu/mood-entries/v1` como un objeto JSON
`{ [fecha]: MoodEntryDto }`.

**Alternativas descartadas.**

- **expo-sqlite.** Más potente para consultas por rango, pero más peso y
  ceremonia para un volumen de datos que, en años de uso, son unos pocos miles
  de filas chicas.
- **Una clave de AsyncStorage por día.** Evita reescribir todo el blob al
  guardar, pero complica leer un mes (multiget + armado) y ensucia el
  namespace.

**Consecuencias.**

- Guardar un día = leer el blob, mutar una clave, reescribir. A escala personal
  es imperceptible; si algún día el blob crece mucho, migrar a SQLite es
  cambiar la implementación de `MoodLocalDataSource`.
- `getEntriesInRange` filtra en memoria. Suficiente para semana, mes o año.
- La clave lleva `/v1`: si el formato cambia, se puede versionar y migrar sin
  pisar datos viejos.
- Si el JSON se corrompe, `readAll()` devuelve `{}` en vez de tirar excepción:
  la app arranca igual aunque se pierda el historial (mal menor frente a
  crashear al abrir).

---

## 11. DTO separado de la entidad + mappers

**Decisión.** `MoodEntryDto` es la forma serializable que se guarda; `MoodEntry`
es la entidad de dominio. `moodEntryToDto` / `moodEntryFromDto` traducen entre
las dos. Al leer, el mapper vuelve a pasar por `createMoodEntry`, revalidando.

**Consecuencias.** El formato en disco puede evolucionar sin tocar el dominio, y
los datos "sucios" de una versión vieja se sanean al entrar.

---

## 12. Calendario propio, sin librería *(elección del usuario)*

**Contexto.** La pantalla de progreso necesita un calendario donde cada día
pueda mostrar uno o dos colores, con vistas por semana, mes y año.

**Decisión.** Todo hecho a mano, y **genérico** (ver #25): el layout vive en
[`presentation/calendar/`](../src/presentation/calendar/)
([`CalendarWeek`](../src/presentation/calendar/CalendarWeek.tsx),
[`CalendarMonth`](../src/presentation/calendar/CalendarMonth.tsx),
[`CalendarYear`](../src/presentation/calendar/CalendarYear.tsx),
[`CalendarViewSwitch`](../src/presentation/calendar/CalendarViewSwitch.tsx)) y
cada feature aporta cómo se pinta un día. El mood tracker lo hace con
[`DayCell`](../src/presentation/mood/components/DayCell.tsx).

La semana **empieza en lunes**. Las celdas son cuadradas y se calculan con
`onLayout` (ancho real / 7, redondeado hacia abajo para que la fila no se
desborde).

**Alternativas descartadas.**

- **`react-native-calendars`.** Popular y con muchas features, pero suma una
  dependencia pesada (otra descarga lenta), no trae vista anual y su API de
  marcado no encaja bien con "media celda de cada color".

**Consecuencias.** Control total del render; más código propio que mantener
(navegación de períodos, huecos iniciales, mini-calendarios del año).

---

## 12b. Modelo del calendario: `vista` + `anchor`

**Contexto.** Con tres vistas, hay que saber qué período se está mirando y cómo
moverse "atrás / adelante".

**Decisión.** El hook compartido
[`useCalendarPeriod`](../src/presentation/calendar/useCalendarPeriod.ts) guarda
solo dos cosas: `view` (`'week' | 'month' | 'year'`) y `anchor` (un `Date`
cualquiera dentro del período visible). De ahí se **deriva** todo:

- `range` → `{ startIso, endIso, title }`.
- Las flechas hacen `anchor ± 7 días / 1 mes / 1 año` según la vista.
- El caso de uso de rango (`GetMoodRange` / `GetTrackerRange`) es **uno solo**
  para las tres vistas: trae los registros del rango y calcula sus estadísticas.

**Alternativas descartadas.**

- **Un estado por vista** (`weekStart`, `monthAnchor`, `yearAnchor`). Más
  variables que sincronizar y casos de uso separados (`GetMoodMonth`, etc.).

**Consecuencias.** Cambiar de vista mantiene el `anchor`, así que "ver la semana
de este día" y después "ver el mes" es coherente. En la vista **Año**, tocar un
mes hace `setAnchor(1 de ese mes)` + `setView('month')`: la edición de días
siempre ocurre en semana o mes, nunca sobre las celdas diminutas del año.

---

## 13. Día con dos ánimos: celda dividida en diagonal, sin SVG *(elección del usuario)*

**Contexto.** Un día con dos colores tiene que verse "mitad y mitad" en
diagonal, tanto en el calendario como en la card.

**Decisión.** [`DiagonalSplitSquare`](../src/presentation/components/DiagonalSplitSquare.tsx)
(genérico; lo usan el mood y también las celdas de tracker y la vista Año):
un `View` con `backgroundColor` (una mitad) y encima un triángulo hecho con el
truco de **bordes de una caja de tamaño cero** (`borderTopWidth` +
`borderRightWidth` con un color y el resto transparente). Con un solo color,
rellena todo. `overflow: 'hidden'` + `borderRadius` para las esquinas.

**Alternativas descartadas.**

- **`react-native-svg`.** Resolvería esto con un `<Polygon>`, pero es otra
  dependencia nativa para un efecto que se logra con CSS de bordes.
- **Dos `View` rotadas 45°.** Frágil de posicionar y recortar.

**Consecuencias.** Cero dependencias para el efecto. La diagonal es fija
(abajo-izq / arriba-der); si se quisiera el otro sentido hay que cambiar qué
bordes se colorean.

---

## 14. Selector de colores: máximo 2, reemplazo FIFO

**Decisión.** En [`MoodColorPicker`](../src/presentation/mood/components/MoodColorPicker.tsx):
tocar un color lo selecciona; tocarlo de nuevo lo saca; si ya hay dos y se toca
un tercero, **se descarta el más viejo** y entra el nuevo. Un número (1 / 2)
sobre el swatch muestra el orden.

**Alternativas descartadas.**

- **Bloquear el tercer toque.** Obliga a deseleccionar primero; más fricción.

**Consecuencias.** Siempre se puede "seguir tocando" para probar combinaciones
sin quedar trabado.

---

## 15. Navegación: native-stack tipado

**Decisión.** `@react-navigation/native` + `@react-navigation/native-stack`, con
un `RootStackParamList` central en
[`core/navigation/types.ts`](../src/core/navigation/types.ts) que tipa cada ruta
y sus parámetros. Rutas actuales: `Home`, `MoodProgress`.

**Consecuencias.** `navigation.navigate('MoodProgress')` tiene autocompletado y
falla en compilación si la ruta no existe. El *native-stack* usa el
gesto/animación nativos de cada plataforma.

---

## 16. El saludo pasa por un caso de uso

**Contexto.** La pantalla principal (y la de Listas) muestran "Hola {nombre}!".

**Decisión.** No está hardcodeado en la vista: `TrackersScreen` pide
`container.getWelcomeMessage.execute()`, que arma el string a partir del
`UserProfile` traído por `UserRepository`. El nombre lo elige el usuario en el
onboarding y sale de AsyncStorage (ver #34).

**Motivo.** Mantiene la lógica del saludo en el dominio, testeable y sin
depender de la UI.

---

## 17. La pantalla "función sin implementar" fue reemplazada

**Contexto.** La primera versión tenía una segunda pantalla placeholder.

**Decisión.** Al llegar el mood tracker, esa pantalla se eliminó y su lugar en
la navegación lo toma `MoodProgress`. El saludo de bienvenida se conservó como
encabezado de la pantalla principal.

---

## 18. La card del home: cargar una vez, editar desde progreso *(elección del usuario)*

**Contexto.** Se pidió que "una vez guardado el día, solo se lo actualice al ver
el progreso".

**Decisión.** La card del home tiene dos estados:

- **Hoy sin registro** → muestra el `MoodEditor` (colores + nota + descripción +
  Guardar).
- **Hoy ya registrado** → muestra `MoodEntrySummary` (solo lectura: colores,
  nota y descripción) con la aclaración de que se edita desde "Ver progreso".

El `useMoodTrackerCard` recarga el registro de hoy con **`useFocusEffect`**, así
que si editás hoy desde el calendario y volvés al home, la card se actualiza
sola.

**Motivo.** Evita dos lugares equivalentes para editar lo mismo. El home es para
la captura rápida del día; el historial y las correcciones viven en progreso.

**Consecuencias.** No se puede "deshacer" el registro de hoy desde el home; hay
que ir a progreso y borrarlo o cambiarlo ahí.

---

## 19. El número del día siempre legible *(elección del usuario)*

**Contexto.** Con la celda pintada de color, el número del día se perdía
(texto oscuro sobre violeta/azul, texto blanco sobre amarillo).

**Decisión.** En [`DayCell`](../src/presentation/mood/components/DayCell.tsx) el
número va **arriba a la izquierda dentro de un chip**: si el día tiene color, el
chip es blanco semitransparente (`rgba(255,255,255,0.9)`) con texto casi negro;
si no, número plano centrado. Así el contraste no depende del color de fondo.

**Alternativas descartadas.**

- **Texto blanco con sombra.** Ayuda pero sigue costando sobre amarillo/naranja.
- **Número centrado y grande.** Tapa la diagonal de los días de dos colores.

---

## 20. Referencias como cards con contador *(elección del usuario)*

**Contexto.** Antes las referencias eran una lista simple "color → emoción". Se
pidió pasarlas a cards y agregar "cuántas veces va ocurriendo en lo que se
muestra".

**Decisión.**
[`MoodReferenceCards`](../src/presentation/mood/components/MoodReferenceCards.tsx):
una card por color (swatch + nombre + emoción + número grande). El número es
`colorCounts[color]` que viene calculado del caso de uso `GetMoodRange` para el
período visible (semana / mes / año), **contando los dos colores de cada día**.
Las cards que están en cero se muestran atenuadas.

**Motivo.** El contador vive en el caso de uso (dominio-cercano y testeable), no
en el componente.

---

## 21. Orden fijo de las reference cards *(elección del usuario)*

**Contexto.** Al principio las cards se ordenaban por frecuencia, y eso hacía que
saltaran de lugar al cambiar de período. El usuario pidió un orden fijo:

```
naranja (solo, fila entera)
rojo      violeta
rosa      gris
verde     azul
amarillo  marrón
```

**Decisión.** El orden vive en el dominio como
`MOOD_COLOR_DISPLAY_ORDER` (en `MoodColor.ts`). `MoodReferenceCards` pinta el
primero a ancho completo y el resto en una grilla de dos columnas siguiendo ese
array.

**Motivo.** Un orden estable se memoriza: el usuario aprende dónde está cada
color y lee el tablero de un vistazo. La frecuencia igual se ve en el número de
cada card.

---

## 22. Nota del día: 1 a 10 con un decimal *(elección del usuario)*

**Contexto.** Se pidió poder ponerle a cada día una nota del 1 al 10 con hasta
un decimal, mostrarla en el calendario y ver un promedio.

**Decisión.**

- **Dominio.** `MoodEntry` gana un campo opcional `note?: number`.
  `createMoodEntry` redondea a un decimal y valida con `isValidNote`
  (`NOTE_MIN`–`NOTE_MAX`, sin más de un decimal); si no cumple, tira error.
- **UI.** El campo se maneja como **string** en el estado
  (`MoodEditor` / viewmodels) para poder tipear "7." mientras se escribe.
  [`parseNoteInput`](../src/presentation/mood/parseNoteInput.ts) lo convierte a
  número o devuelve un mensaje de error; el botón Guardar se deshabilita si hay
  error. Acepta coma o punto como separador decimal. Vacío = sin nota.
- **Promedio.** Lo calcula el caso de uso `GetMoodRange` (`noteAverage`,
  `noteCount`) junto con los contadores de color, para el período visible.

**Alternativas descartadas.**

- **Slider 1–10.** No permite el decimal cómodo ni "sin nota".
- **Guardar la nota como string.** Complica el promedio y las validaciones.
- **Validar solo en la UI.** El dominio tiene que poder rechazar una nota
  inválida venga de donde venga (incluido un blob viejo o corrupto).

**Consecuencias.** La nota es opcional: un día puede tener colores y no nota, o
viceversa no (siempre necesita al menos un color). El promedio ignora los días
sin nota.

---

## 23. La nota se dibuja sobre los colores del día

**Decisión.** En [`DayCell`](../src/presentation/mood/components/DayCell.tsx) la
nota se muestra **centrada** sobre la celda, dentro de una píldora oscura
semitransparente (`rgba(17,24,39,0.55)`) con texto blanco, para que se lea sobre
cualquiera de los nueve colores. Solo se muestra si la celda mide ≥ 30 px, así
que aparece en las vistas Semana y Mes pero no en los mini-calendarios del Año.

**Consecuencias.** En celdas chicas (mes) conviven el chip del número (arriba a
la izquierda) y la píldora de la nota (centro); se aceptó porque no se
superponen.

---

## 24. Trackers del usuario: feature aparte del mood tracker *(elección del usuario)*

**Contexto.** El usuario quiere crear sus propios trackers, "similares al mood
tracker pero más simples": un nombre y dos tipos — **opciones** (por defecto
Sí/No, configurables) o **número**.

**Decisión.** Se modelan como una **feature nueva** (`domain/tracker`,
`data/tracker`, `presentation/tracker`) en vez de generalizar el mood tracker.
El mood tracker sigue siendo especial (dos colores por día, diagonal, nota,
paleta fija de nueve); los trackers del usuario son de **un valor por día** y
sin nota ni descripción.

**Alternativas descartadas.**

- **Hacer del mood tracker un caso particular del genérico.** Habría que meter
  "dos valores", "diagonal", "nota" y "paleta cerrada" como opciones del modelo
  genérico, ensuciándolo. El mood tracker es el producto; los trackers del
  usuario son la parte flexible.

**Consecuencias.** Hay algo de estructura duplicada entre `mood/` y `tracker/`
(viewmodels de progreso parecidos, celdas de día parecidas). Lo que sí se
compartió es el **calendario** (#25).

---

## 25. Calendario genérico con *render-prop* por día

**Contexto.** Las dos pantallas de progreso (mood y tracker) necesitan el mismo
calendario Semana/Mes/Año, pero pintan los días distinto.

**Decisión.** El layout se extrajo a
[`presentation/calendar/`](../src/presentation/calendar/): `CalendarWeek`,
`CalendarMonth` y `CalendarYear` sólo saben de grillas, semanas que empiezan en
lunes y tamaños de celda. Reciben un **`renderDay(day)`** (con `date`,
`dayOfMonth`, `isToday`, `size`) y devuelven lo que la feature quiera. Para el
año, un **`dayColors(date)`** que devuelve 1 o 2 hex (o `undefined`); con 2, el
puntito se dibuja dividido en diagonal (`DiagonalSplitSquare`, ahora en
`presentation/components/`). El estado del período es el hook compartido
`useCalendarPeriod` (#12b).

**Consecuencias.** El mood pinta con `DayCell` (diagonal + nota); el tracker con
`TrackerDayCell` (uno o dos colores en diagonal + número opcional). La vista Año
muestra los días de dos colores igual que semana/mes.

---

## 26. Modelo de tracker: opciones y/o número, hasta 2 opciones por día

**Decisión.** *(Rediseñado — antes había un `kind: 'options' | 'number'` y un
solo valor por día.)*

- `Tracker` = `{ options: TrackerOption[], hasCounter: boolean, ... }`. Puede
  tener **opciones** (1 a 6, con `id`/`label`/`color`), **contador** (número), o
  **las dos cosas**. `createTracker` exige al menos una. Con una sola opción
  funciona como un "hecho / no hecho".
- `TrackerEntry` = `{ optionIds: string[], value?: number }`. Se pueden elegir
  **hasta 2 opciones** por día (como el mood tracker; `MAX_OPTIONS_PER_DAY`,
  reemplazo FIFO en la UI) y/o un número. `createTrackerEntry(tracker, ...)`
  filtra las opciones inválidas, dedupe, cap a 2, y pide que haya al menos una
  opción o un número.
- Las opciones tienen **id estable**: renombrar/recolorear no rompe la historia.
- **Compatibilidad.** Los DTO viejos se siguen leyendo: `kind: 'number'` →
  `hasCounter: true`; `optionId: X` → `optionIds: [X]`.

**Alternativas descartadas.**

- **Guardar la opción elegida como su label o su color.** Editar la opción
  reescribiría la historia.
- **Un tracker es opciones *o* número, no las dos.** El usuario pidió que
  pudieran ser las dos a la vez.

---

## 27. Persistencia de trackers: config y registros en blobs separados

**Decisión.** Dos claves nuevas de AsyncStorage:

- `@app-celu/trackers/v1` → `{ [trackerId]: TrackerDto }` (la configuración).
- `@app-celu/tracker-entries/v1` → `{ [trackerId]: { [fecha]: TrackerEntryDto } }`
  (registros, anidados por tracker).

Borrar un tracker (`DeleteTracker`) borra su config **y** su sub-árbol de
registros, en ese orden.

**Motivo.** Separar config de datos: la lista del home lee solo el blob chico de
config; los registros de un tracker se leen recién al abrir su progreso.
Anidar por `trackerId` hace que "traer el mes del tracker X" y "borrar todo el
tracker X" sean triviales.

---

## 28. Card del tracker: opciones se bloquean, número es un contador *(elección del usuario)*

**Contexto.** Primera versión: la card era siempre editable. El usuario pidió
dos comportamientos distintos por tipo.

**Decisión.**

- **Opciones.** Se eligen una o dos opciones (estado local `selectedOptionIds`)
  y se toca **Guardar**. Al guardar, la parte de opciones pasa a modo lectura
  (`OptionsSummary`), igual que el mood tracker (#18): se edita desde "Ver
  progreso". El "bloqueo" se decide por `entry.optionIds.length > 0`, no por
  `entry != null`.
- **Número.** La card muestra un [`Counter`](../src/presentation/tracker/components/Counter.tsx)
  (− valor +). Cada toque **persiste al instante** para poder ir sumando/restando
  durante el día. Nunca baja de 0. "Borrar" elimina el registro del día. No se
  bloquea.
- **Híbrido.** Un tracker con las dos cosas muestra los dos bloques. Guardar las
  opciones preserva el `value` actual y mover el contador preserva los
  `optionIds` (el viewmodel mergea con `entry`).

**Consecuencias.** El "bloqueo tras guardar" aplica al mood y a la parte de
opciones de un tracker; el contador es siempre editable.

---

## 29. Distribución: EAS Build (APK para instalar a mano)

**Contexto.** El usuario quiere la app instalada en su teléfono (Android) y
desarrolla en Windows, sin Android Studio.

**Decisión.** Se usa **EAS Build** (servicio de build en la nube de Expo). Se
agregó:

- `app.json`: `android.package` / `ios.bundleIdentifier` fijos
  (`com.facucp102.appcelu`), `android.versionCode`, y
  `runtimeVersion: { policy: "appVersion" }`.
- [`eas.json`](../eas.json) con tres perfiles: `development` (dev client),
  `preview` (**APK** `internal`, el que se instala a mano) y `production`
  (`app-bundle` para Play Store, `autoIncrement`).

Flujo: `npx eas-cli build -p android --profile preview` → EAS devuelve un link
→ se baja el APK al teléfono y se instala.

**Por qué no otras opciones.**

- **`expo run:android` local.** Necesita Android Studio + JDK; más setup en
  Windows.
- **Expo Go.** No es una app instalable de verdad: necesita el server de
  desarrollo corriendo.

**Clave para no perder datos (ver #30):** EAS **administra el keystore** y lo
reusa entre builds. Mientras el `package` y el keystore no cambien, cada APK
nuevo se instala **encima** del anterior y AsyncStorage se conserva. Si se
regeneran las credenciales o cambia el `package`, Android obliga a desinstalar
(y ahí sí se pierden los datos).

---

## 30. Backup export / import como red de seguridad

**Contexto.** Los datos viven solo en AsyncStorage del dispositivo. Una
actualización normal los conserva, pero desinstalar, "borrar datos" o cambiar
de teléfono los pierde.

**Decisión.** Una pantalla **Ajustes y backup** (`screens/settings/`) con:

- **Exportar**: `ExportBackup` arma un `BackupBundle`
  (`{ format, version, exportedAt, data }`, donde `data` es el contenido de
  cada clave de storage) → se escribe un `.json` en cache y se abre el menú
  **compartir** (`expo-sharing`) para mandarlo a Drive / mail / WhatsApp.
- **Importar**: `expo-document-picker` elige el `.json`, `ImportBackup` lo
  valida con `parseBackupBundle` y hace una **restauración completa** (borra las
  claves conocidas y escribe las del backup).

Para que el backup sepa qué guardar, todas las claves de AsyncStorage se
centralizaron en [`core/storage/keys.ts`](../src/core/storage/keys.ts)
(`ALL_STORAGE_KEYS`); antes cada datasource tenía su string suelto.

**Alternativas descartadas.**

- **Copiar/pegar un JSON gigante.** Sin dependencias, pero mala UX entre
  dispositivos.
- **Backup automático a la nube.** Requiere backend y cuentas; fuera de alcance
  para una app personal y local-first.

**Consecuencias.** El import es destructivo (reemplaza todo); la pantalla lo
confirma con un `Alert`. Después de importar se vuelve a Trackers, que recarga
solo por sus `useFocusEffect`.

---

## 31. Menú del header como hub de navegación *(elección del usuario)*

**Contexto.** El usuario pidió que en vez de "Inicio" haya un **menú** en el
header que despliegue tres destinos: **Trackers** (lo que hoy es la pantalla
principal), **Listas** y **Finanzas**.

**Decisión.**

- La ruta `Home` se renombró a **`Trackers`** (misma pantalla: mood + trackers
  del usuario). Se agregaron `Lists` (ver #35) y `Finances` (todavía un
  [`ComingSoon`](../src/presentation/components/ComingSoon.tsx)).
- El `headerTitle` de esas tres pantallas es
  [`HubMenuButton`](../src/presentation/navigation/HubMenuButton.tsx): muestra el
  **nombre de la pestaña actual** con un ▾ y, al tocarlo, abre un `Modal` con las
  tres opciones (la actual marcada con ✓).
- Las tres pantallas hub ocultan la flecha de volver (`headerBackVisible:
  false`); se navega entre ellas por el menú. `navigation.navigate` sobre un
  stack hace pop si la pantalla ya está abajo, así que el back-stack no crece
  sin control.
- El cambio entre pestañas hub usa `animation: 'fade'` (un fundido corto) en
  vez del deslizamiento del stack, para que sea suave y poco notorio. Las
  pantallas push (progreso, formularios) mantienen la animación normal.

**Alternativas descartadas.**

- **Drawer (`@react-navigation/drawer`).** Es lo "canónico" para un menú lateral
  pero suma `react-native-reanimated` + `react-native-gesture-handler` y todo su
  setup nativo, para tres destinos. El usuario pidió "un menú que se despliega",
  no un cajón lateral.
- **Bottom tabs.** Igual de válido, pero cambia toda la navegación y no es lo
  que se pidió.

**Consecuencias.** Si más adelante hay muchos destinos o cada uno necesita su
propio stack, conviene migrar a tabs o drawer.

---

## 32. Fondos claros, nunca blancos *(elección del usuario)*

**Contexto.** Se pidió que la app tenga fondos de colores claros, pero que no
sean blancos.

**Decisión.** Una paleta en [`core/theme.ts`](../src/core/theme.ts):

- **Fondo de pantalla y header**: `#e9ebf2` (gris azulado muy claro).
- **Cards y hojas modales**: `#f8f9fc` (un tono por encima, tampoco blanco).
- **Celdas vacías del calendario**: `#f1f2f7`.

Se aplica en dos lugares: el `theme` de `NavigationContainer` +
`screenOptions` (`headerStyle`, `contentStyle`, `headerShadowVisible: false`)
para header y fondo por defecto, y el resto de componentes usan los hex directo
(el archivo `theme.ts` queda como referencia de la paleta).

**Consecuencias.** Los inputs de texto no tienen fondo propio (transparentes
sobre la card). No se armó un sistema de theming completo (dark mode, tokens
tipados en cada componente); si hace falta, `theme.ts` es el punto de partida.

---

## 33. Swipe para cambiar de vista en el progreso del tracker *(elección del usuario)*

**Contexto.** Se pidió poder cambiar entre Semana / Mes / Año swipeando el
calendario, además del control segmentado.

**Decisión.**
[`useHorizontalSwipe`](../src/presentation/calendar/useHorizontalSwipe.ts) arma
un `PanResponder` que solo reclama el gesto si es **claramente horizontal** (así
no rompe el scroll vertical ni los taps de los días). Envuelve el calendario en
`TrackerProgressScreen`. Swipe **izquierda → `zoomOutView`** (week→month→year),
**derecha → `zoomInView`** (year→month→week), en el mismo sentido que el control
de arriba `[Semana | Mes | Año]`. `useCalendarPeriod` expone `zoomInView` /
`zoomOutView` (con clamp en los extremos).

**Alternativas descartadas.**

- **`react-native-gesture-handler`.** Es lo canónico para gestos, pero suma un
  dep nativo y su `GestureHandlerRootView` para un swipe simple. `PanResponder`
  (en el core de RN) alcanza.
- **Swipe para cambiar el período (semana anterior/siguiente).** Eso ya lo hacen
  las flechas; el pedido era cambiar de *vista*.

**Consecuencias.** Por ahora solo está en el progreso de trackers (no en el
mood); el hook es reutilizable si se quiere agregar allá.

---

## 34. Perfil del usuario: onboarding para elegir el nombre *(elección del usuario)*

**Contexto.** Se pidió elegir el nombre la primera vez que se abre la app y
poder cambiarlo en Ajustes. Antes estaba hardcodeado. (Hubo brevemente una
preferencia de "pestaña de inicio"; se sacó al aparecer la pestaña Favoritos,
que es siempre la principal — ver #38.)

**Decisión.**

- **Dominio.** `domain/user/`: `UserProfile` = `{ name, moodFavorite,
  financeFavorite, fontScale }` (los flags arrancan en `true`, `fontScale` en
  `1`; ver #38, #39 y #40). `UserRepository`
  (`getProfile(): Promise<UserProfile | null>` — null = primer arranque,
  `saveProfile`). Casos de uso: `GetUserProfile`, `GetWelcomeMessage` y
  **`UpdateUserProfile`** (patch parcial, merge con lo guardado, valida con
  `createUserProfile`).
- **Datos.** `AsyncStorageUserLocalDataSource` sobre `@app-celu/user-profile/v1`
  (en `ALL_STORAGE_KEYS`, así el perfil entra en el backup).
- **Gate de arranque.** `AppNavigator` llama a `getUserProfile` una vez; mientras
  carga muestra un spinner; según el resultado el `initialRouteName` es
  `Onboarding` (sin perfil) o `Favorites`.
- **Onboarding.** `OnboardingScreen` (sin header) pide el nombre, lo guarda con
  `updateUserProfile({ name })` y hace `navigation.reset` a Favoritos.
- **Editar.** `UserNameCard` en Ajustes. `useFavorites` / `useTrackersViewModel`
  recargan el saludo con `useFocusEffect`, así que al volver se ve el nombre
  nuevo. (`fontScale` está en la entidad pero no se usa — ver #40.)

**Alternativas descartadas.**

- **Modal sobre la pantalla principal en vez de pantalla de onboarding aparte.**
- **Concepto de "preferencias" separado del perfil.**

**Consecuencias.** Si se importa un backup viejo sin la clave `user-profile`, el
perfil se borra y vuelve a aparecer el onboarding.

---

## 35. Listas *(elección del usuario)*

**Contexto.** La pestaña "Listas" pasó de placeholder a una feature: listas con
un nombre, cuyas entradas tienen nombre, fecha y comentario opcional.

**Decisión.** Misma estructura que los trackers (`domain/list`, `data/list`,
`presentation/list`):

- **Modelo.** `List` = solo `{ id, name, createdAt }`. `ListEntry` =
  `{ id, listId, name, date, comment?, rating? }` (el rating es un número ≥ 0).
  Validación en `createList` / `createListEntry`.
- **Orden.** `GetListEntries(listId, sort)` devuelve las entradas ya ordenadas
  con `compareListEntries(a, b, sort)` (regla de dominio). El usuario elige el
  criterio (`ListSort`) con `ListSortSelector`:
  - `date` (default): fecha desc, desempata alfabético.
  - `alpha`: alfabético (`localeCompare` 'es'), desempata fecha desc.
  - `rating`: rating desc (las sin rating al final), desempata alfabético.
  El criterio vive en el estado del `useListDetail` (no se persiste); cambiarlo
  re-dispara el `useFocusEffect` de recarga.
- **Persistencia.** Dos claves nuevas (`@app-celu/lists/v1`,
  `@app-celu/list-entries/v1`, anidada por `listId`). Al estar en
  `ALL_STORAGE_KEYS`, entran en el **mismo archivo de backup** que todo lo demás
  (lo que pidió el usuario).
- **UI.** `ListsScreen` (hub) con una `ListCard` por lista: nombre + conteo.
  Tocar la card entra a `ListDetailScreen`; el **＋** de la card (que captura su
  propio toque) abre `ListEntryModal` para carga rápida. En el detalle, las
  entradas van **pegadas a todo el
  ancho** (sin card por fila, separadas por `hairlineWidth`): **nº** a la
  izquierda; **nombre + fecha (DD/MM/AAAA)** arriba; **comentario recortado con
  “…”** abajo; **★ rating** a la derecha. Se tocan para abrir el mismo
  `ListEntryModal` en modo edición (con **Borrar**). **Borrar la lista** está al
  fondo del detalle, con confirmación.
- **Crear lista.** Un `CreateListModal` (solo un nombre), no una pantalla
  aparte: una lista no tiene nada más que configurar (a diferencia de un
  tracker de opciones).
- **Fecha.** `@react-native-community/datetimepicker` (incluido en Expo Go) para
  el date picker nativo, envuelto en `DateField`.

**Alternativas descartadas.**

- **Pantalla de "crear lista" completa.** Innecesaria para un solo campo.
- **Date picker propio (steppers / texto).** Una entrada puede tener cualquier
  fecha (pasada o futura); el picker nativo es mucho mejor y es una sola
  dependencia, ya soportada por Expo.

**Consecuencias.** El `ListEntryModal` se reusa para "agregar desde la card del
hub" y para "editar desde el detalle"; distingue los dos casos por el prop
`initial` (null = nueva).

---

## 36. Teclado que no tapa los campos

**Contexto.** Al escribir en los modales de trackers/listas (hojas ancladas
abajo) y en el formulario de tracker, el teclado tapaba el campo. Android no
reajusta el contenido de un `Modal` solo.

**Decisión.** Un wrapper
[`KeyboardAvoider`](../src/presentation/components/KeyboardAvoider.tsx)
(`KeyboardAvoidingView` a pantalla completa, `behavior` `padding` en iOS /
`height` en Android) envuelve el backdrop de los modales con inputs
(`ListEntryModal`, `CreateListModal`, `MoodDayModal`) y el `ScrollView` del
`TrackerForm`. `TrackerDayModal` no lo necesita (no tiene inputs de texto: chips
y `Counter`).

**Alternativas descartadas.**

- **`react-native-keyboard-controller`.** Mejor resultado, pero dep nativo con
  setup; el `KeyboardAvoidingView` del core alcanza para estos casos.

---

## 37. To-do lists: una lista es una to-do list o no *(elección del usuario)*

**Contexto.** Se quiso poder marcar tareas como completadas en algunas listas,
sin cambiar cómo funcionan las listas normales.

**Decisión.** Un flag `isTodo` en la entidad `List` (se elige con un checkbox al
crearla en `CreateListModal`; por defecto `false`), en vez de un tipo de lista
aparte:

- **Modelo.** `List` suma `isTodo: boolean`. `ListEntry` suma `done: boolean`
  (solo relevante si la lista es to-do). El campo `rating` no cambia de nombre en
  el dominio: es "un número"; la UI lo muestra como **"Prioridad"** (con ⚑) en
  las to-do lists y como **"Rating"** (con ★) en las normales.
- **Fecha opcional.** `ListEntry.date` pasó a ser opcional (para las to-do lists:
  es la **fecha de vencimiento** y se puede no poner). El modal de una lista
  normal sigue arrancando con hoy y no deja quitarla; el de una to-do arranca
  sin fecha y tiene "＋ Agregar fecha" / "Quitar fecha". La fila muestra
  `vence: DD/MM/AAAA` y `vencida` en rojo (`isEntryOverdue`: fecha pasada y no
  completada). `compareListEntries` manda las entradas sin fecha al final.
- **Orden en el hub.** `GetLists` ordena las to-do lists primero, y dentro de
  cada grupo por `createdAt` (como antes).
- **Orden por defecto en el detalle.** `useListDetail` no persiste el criterio;
  arranca en `null` y usa el default según el tipo de lista (**`rating`
  (prioridad)** en una to-do list, **`date`** en una normal). Cuando el usuario
  toca el `ListSortSelector` se guarda su elección y pisa el default.
- **Conteo en la card.** `useLists` pasa a devolver `{ total, done }` por lista;
  la `ListCard` de una to-do list muestra `done/total hechas` en vez de
  `N entradas`.
- **Marcar completada.** Un caso de uso chico `SetListEntryDone(listId, entryId,
  done)` (lee la entrada, la re-guarda con el nuevo `done`), para no tener que
  abrir el `ListEntryModal`. En el detalle, la fila muestra un `Checkbox`
  (componente nuevo, genérico) en lugar del número de posición, y tacha el
  nombre cuando está hecha.
- **Persistencia / backup.** Campos opcionales en los DTO (`isTodo?`, `done?`):
  los backups y datos viejos siguen cargando (lista sin flag = normal).

**Alternativas descartadas.**

- **Un campo `priority` separado del `rating`.** Es el mismo dato (un número por
  entrada); solo cambia la etiqueta según el tipo de lista. Duplicarlo obligaba a
  migrar DTO, backup y el comparador de orden sin ganar nada.
- **Reordenar las tareas hechas al fondo automáticamente.** No se pidió; el orden
  lo sigue eligiendo el usuario (`ListSort`).

---

## 38. Pestaña Favoritos como pantalla principal *(elección del usuario)*

**Contexto.** Se pidió una cuarta pestaña **Favoritos**, que sea siempre la
principal, y que junte los trackers y listas que el usuario marque con una
estrella. Junto con esto se eliminó la preferencia de "pestaña de inicio" (#34).

**Decisión.**

- **Flag `favorite` en las entidades.** `Tracker` y `List` suman
  `favorite: boolean` (default `false`, campo opcional en el DTO). Marcar/desmarcar
  es un caso de uso chico por entidad (`SetTrackerFavorite`, `SetListFavorite`):
  lee, re-guarda con el nuevo flag. No hay entidad "favorito" ni lista separada:
  Favoritos es una **vista filtrada** (`useFavorites` trae todo y filtra por
  `.favorite`).
- **El mood tracker y el resumen de finanzas arrancan como favoritos y se
  pueden desmarcar.** No tienen entidad de config propia, así que sus flags
  viven en `UserProfile` (`moodFavorite` / `financeFavorite`, default `true`).
  La `MoodTrackerCard` y la `FinanceSummaryCard` (recuadro compartido con la
  pantalla Finanzas: economía actual + botones de añadir) muestran la misma
  estrella y toglean con `updateUserProfile({ ... })`.
- **Botón de estrella** (`FavoriteStar`, componente nuevo): esquina superior
  derecha de la `TrackerCard`, a la izquierda del nombre en la `ListCard` (donde
  lo pidió el usuario).
- **Navegación.** `Favorites` es una pantalla hub más (`hubOptions`), primera en
  el menú del header y `initialRouteName` siempre (salvo onboarding). Las cuatro
  pestañas quedan: Favoritos / Trackers / Listas / Finanzas.
- **Crear desde Favoritos.** Un botón "＋ Crear" abre el `CreateChooserModal`
  (Tracker / Lista como dos botones centrados, Cancelar abajo a la derecha) y
  navega a **esa pestaña** con un param `{ create: true }`; la pantalla hub lo
  consume una vez (`navigation.setParams({ create: undefined })`) y abre su flujo
  de creación (pantalla `CreateTracker` o el `CreateListModal`).
- **Marcar al crear.** El `TrackerForm` y el `CreateListModal` tienen un checkbox
  "Agregar a Favoritos" (`TrackerDraft.favorite`, tercer parámetro de
  `CreateList.execute`).
- **Añadir desde Favoritos.** Los botones de la `FinanceSummaryCard` en Favoritos
  navegan a `Finances` con un param `{ add: 'income' | 'expense' }` que la
  pantalla consume una vez para abrir el modal.
- **Refresco.** `ListCard` recibe `onToggleFavorite` del padre (ya era "tonta").
  `TrackerCard` y `MoodTrackerCard` son autónomas, así que suman un callback
  opcional `onFavoriteToggled` para que `FavoritesScreen` recargue y saque la
  card al instante.
- **Orden manual.** `useFavorites` arma una única lista de `FavoriteCard`
  (finanzas, mood, trackers, listas — todo reordenable, incluidas las
  especiales). El botón "Ordenar" entra en un modo con filas compactas
  (`FavoriteReorderRow`) y flechas ▲▼; cada movimiento persiste el orden como
  una lista de claves (`"finance"`, `"mood"`, `"tracker:<id>"`, `"list:<id>"`)
  en `@app-celu/favorites-order/v1` (`domain/favorites`). Al cargar, se respeta
  el orden guardado y los ítems nuevos van al final; las claves de ítems que ya
  no existen se ignoran.

**Alternativas descartadas.**

- **Una colección/entidad "Favoritos" aparte.** Un flag booleano en cada entidad
  es más simple y no puede quedar desincronizado con el tracker/lista real (el
  orden manual sí es una lista propia, pero es solo un array de claves).
- **Ordenar por tipo / alfabético / recientes.** Se probó; el usuario prefirió
  controlar el orden a mano.
- **Drag & drop.** Necesita `react-native-gesture-handler` + `reanimated`; las
  flechas ▲▼ alcanzan para una lista corta.
- **`Alert` nativo para elegir tracker/lista.** Se veía pobre; el usuario pidió
  botones en un modal.
- **Que "Crear → Tracker" abra directo `CreateTracker`.** El usuario pidió que
  "te lleve a su pestaña"; pasar por el hub deja la pestaña en el back stack.

**Consecuencias.** `useFavorites` repite el patrón de `useLists` para el conteo
de entradas y el alta rápida (N+1 lecturas incluido). El mood tracker aparece en
Favoritos por defecto (hasta que se desmarque).

---

## 39. Finanzas: ocurrencias calculadas, no materializadas *(elección del usuario)*

**Contexto.** La pestaña Finanzas pasó de placeholder a una feature: economía
actual, ingresos/gastos con repetición mensual y categorías, y un desglose por
semana/mes/año.

**Decisión.** Mismo esqueleto que las otras features (`domain/finance`,
`data/finance`, `presentation/finance`):

- **Modelo.** `FinanceTransaction` = `{ id, kind: 'income' | 'expense', name,
  date, comment?, amount (> 0), categoryId?, repeat, adjustments, finishedOn? }`.
  El **signo lo da `kind`** (el monto se guarda siempre positivo). `repeat` es
  `null` (una vez) o `{ months: number | null }` (`null` = indefinida, `N` = N
  ocurrencias en total contando la primera). `adjustments` (solo con `repeat`)
  es una lista de `{ from, amount }` ordenada por fecha: a partir de `from`, cada
  ocurrencia pasa a valer ese monto (el usuario aprieta "Ajustar monto (desde
  hoy)" y lo puede hacer varias veces). `finishedOn` (fecha) aparece al marcar
  como "finalizado" un movimiento con repetición: las ocurrencias posteriores
  dejan de contar (las anteriores siguen). Es reversible.
- **Las repeticiones NO se guardan.** Una función pura
  `financeOccurrencesInRange(tx, start, end)` genera al vuelo cada ocurrencia
  `{ date, amount, index }` (suma meses preservando el día, clampando al último
  si el mes es más corto; el monto de cada una lo resuelve `financeAmountOn`
  buscando el último `adjustment` cuyo `from` ya pasó; recorta en `finishedOn`).
  La economía actual es `Σ signo·monto_de_la_ocurrencia` hasta hoy; el reporte
  de un período usa el mismo helper acotado al rango. Evita tener que
  crear/borrar filas al editar una recurrencia y que el almacenamiento crezca
  solo. Coste: recalcular en cada `reload` (barato a escala personal; hay un
  tope de 5000 ocurrencias por las dudas).
- **Categorías.** `FinanceCategory` = `{ id, name, color }`, CRUD completo. Se
  **siembran** Personales / Servicios / Compras la primera vez (clave de storage
  ausente → se escriben los defaults; si el usuario las borra todas, la clave
  queda `{}` y no se re-siembra). La categoría **General** es sintética
  (`GENERAL_CATEGORY`, id `'general'`, no se persiste): es el fallback de un
  movimiento sin `categoryId` o cuya categoría fue borrada. Borrar una categoría
  no toca sus movimientos (caen en General por la lógica de agrupado).
- **Reporte.** `GetFinanceReport(start, end)` arma `{ incomeTotal, expenseTotal,
  net, categories[], all[] }` — depende de los dos repos (necesita resolver
  `categoryId` → categoría). General siempre al final. El período es el que
  **contiene hoy** (semana/mes/año), sin navegación entre períodos por ahora.
- **UI.** `FinancesScreen` = `FinanceSummaryCard` (economía + botones, con
  estrella de favorito — ver #38) + `FinanceReportSection`, más los modales
  (`FinanceTransactionModal`, `FinanceCategoriesModal`). El tipo (ingreso/gasto)
  lo fija el botón que abrió el modal y no se cambia al editar. El desglose
  muestra el monto de cada ocurrencia y "cuota k/N".

**Alternativas descartadas.**

- **Materializar cada ocurrencia mensual como una fila.** Simplifica las queries
  pero complica todo lo demás (editar una serie, repetición "indefinida",
  crecimiento del storage). Con el helper de ocurrencias no hace falta.
- **`Intl.NumberFormat` para la plata.** Soporte parcial en Hermes; un
  `formatMoney` a mano (es-AR: `$ 1.234,50`) alcanza. El campo de monto también
  se formatea en vivo (`formatAmountInput`): coma = decimal, punto = miles. El
  número de la economía actual usa `adjustsFontSizeToFit` + `numberOfLines={1}`
  para achicarse solo y entrar en una línea.
- **Incremento por fórmula (% o monto fijo por mes).** Se probó, pero el usuario
  quería controlar el monto exacto de cada tramo. Una lista de `adjustments`
  con fecha es más flexible y no obliga a recalcular si cambia el patrón.
- **Borrar las cuotas restantes al finalizar.** Se pierde el historial; guardar
  `finishedOn` y recortar las ocurrencias es reversible y no toca los datos.
- **Navegación entre períodos (semana anterior, etc.).** No se pidió; se puede
  agregar después reusando el patrón del calendario.

**Consecuencias.** `GetCurrentBalance` y `GetFinanceReport` recorren todos los
movimientos en memoria en cada recarga. Borrar una categoría deja `categoryId`
colgando en sus movimientos (se muestran como General, no se limpia el campo).

---

## 40. Tamaño de letra global: intentado y pospuesto *(elección del usuario)*

**Contexto.** Se pidió poder agrandar la letra de toda la app (100 % a 150 %, de
a 10 %) desde Ajustes. Los `fontSize` están hardcodeados en `StyleSheet.create`
de decenas de componentes; no hay un `<AppText>` central.

**Estado: no shippeado.** Se probó `core/text/textScale.ts`, que reemplaza el
`default` del módulo `react-native/Libraries/Text/Text` por un wrapper que
multiplica el `fontSize` explícito por una escala global (en esta versión de RN
`Text` es un componente de función sin `.render`, así que no alcanza con
parchear un método). No terminó de andar y el usuario pidió sacarlo de Ajustes.

Quedan en el repo, **sin montar**: `textScale.ts`, `FontSizeCard` y el campo
`UserProfile.fontScale` (siempre `1`). Para retomar: reimportar `textScale` en
`App.tsx`, renderizar `FontSizeCard` en `SettingsScreen`, fijar la escala al
arrancar en `AppNavigator` y hacer que `SettingsScreen` se suscriba con
`useAppFontScale()`.

**Alternativas (para cuando se retome).**

- **Context + `<AppText>` propio en toda la app.** Refactor grande pero
  confiable; probablemente el camino correcto si el swap del módulo no alcanza.
- **Remontar el árbol (`key` en `NavigationContainer`) al cambiar la escala.**
  Tiraría al usuario a la ruta inicial; descartado.

---

## 41. Notificaciones locales: re-agendar en cada cambio de foreground *(elección del usuario)*

**Contexto.** Se pidieron dos recordatorios: (1) diario a las 23:00 si quedan
trackers sin cargar, (2) el día antes de que venza una tarea pendiente de una
to-do list. Ambos deben llegar con la app cerrada y ser desactivables.

**Decisión.** `expo-notifications`, solo **notificaciones locales programadas**
(sin backend). El problema de fondo: una notificación programada no puede
"chequear" nada al dispararse. Solución:

- **Se recalcula todo en cada transición de `AppState`** (`active` / `background`),
  desde `syncNotifications()` en `AppNavigator`: cancela las propias (por prefijo
  de `identifier`: `tracker-reminder:` / `due-reminder:`) y re-agenda según el
  perfil y los datos actuales. Así, si cargás todos los trackers y salís de la
  app, el recordatorio de hoy se cancela.
- **Notif. 1:** para *hoy* se agenda solo si faltan trackers (mood incluido) y
  todavía no son las 23:00. Los próximos 14 días se agendan igual como red de
  seguridad (por si no abrís la app), y se re-evalúan cuando llega ese día.
- **Notif. 2:** una por tarea pendiente con fecha, a las 09:00 del día anterior.
  El `identifier` es `due-reminder:<entryId>`, así completar/editar/borrar la
  tarea la limpia en el próximo sync.
- **Ajustes.** `NotificationsCard` con dos `Switch`. Los flags viven en
  `UserProfile` (`notifyTrackers` / `notifyDueTasks`, arrancan en `false`).
  Prender uno pide permiso; si se niega, el switch no queda prendido.
- **Carga perezosa.** En Expo Go (SDK 53+) el solo `import` de
  `expo-notifications` tira un error. Por eso `core/notifications/notifications.ts`
  **no lo importa arriba**: detecta Expo Go con `Constants.executionEnvironment`
  (`expo-constants`, que sí es seguro) y hace `require('expo-notifications')`
  perezoso solo en un build real (`getNotifications()` devuelve `null` si no).
  La `NotificationsCard` muestra un aviso en Expo Go en vez de los switches.

**Alternativas descartadas.**

- **Notificación diaria repetida (`DAILY` trigger).** No se puede saltear la
  ocurrencia de un día puntual, así que llegaría también los días que cargaste
  todo.
- **Background task (`expo-task-manager`) que evalúa al dispararse.** Setup
  nativo y poco confiable en Android; el re-sync en foreground alcanza.
- **Llamar `syncNotifications()` después de cada guardado** (mood, tracker,
  entrada): muchos call-sites y corre en cada `+`/`−` del contador. El listener
  de `AppState` cubre los casos reales.

**Consecuencias.** Si cargás todo y **te quedás en la app** en primer plano
pasadas las 23:00 sin nunca mandarla a segundo plano, puede llegar el
recordatorio igual. Las notificaciones **no funcionan en Expo Go**: hay que
probar en un build de EAS (development o preview), que además hace falta rehacer
por el módulo nativo nuevo (no es OTA).

---

- **`container` como singleton de módulo:** habrá que poder inyectar un
  repositorio *fake* cuando se agreguen tests.
- **`getEntriesInRange` lee todo el blob y filtra en memoria:** bien para
  escala personal; revisar si el historial se vuelve grande (sobre todo en la
  vista Año).
- **Diagonal de sentido único** en `DiagonalSplitSquare`.
- **La vista Año no deja editar un día directamente:** hay que entrar al mes.
- **La nota (mood) y el número (tracker) no se ven en la vista Año** (celdas
  muy chicas); solo el color.
- **Estructura repetida entre `mood/`, `tracker/` y `list/`** (viewmodels que
  cargan en foco, modales de edición con el mismo patrón): tolerable; si crece,
  extraer un hook `useCrudResource` o similar.
- **`useLists` hace N+1 lecturas** (una por lista) solo para el conteo de
  entradas: bien a escala personal.
- **Los trackers de número no validan rango ni unidad:** aceptan cualquier
  número finito.
- **El backup es manual:** hay que acordarse de exportarlo; no hay backup
  automático ni a la nube (ver #30).
