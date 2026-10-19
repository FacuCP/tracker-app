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
período visible. **Peso por día:** un día con **un** color suma 1; un día con
**dos** colores suma **0.5** a cada uno (pedido del usuario, para que el total
por día sea siempre 1). Las cards en cero se muestran atenuadas.

En la **vista Año**, cada card muestra además el **mes con más ocurrencias** de
ese color (`GetMoodRange.topMonthByColor`; el UI lo pasa solo cuando
`view === 'year'`).

**Motivo.** El contador y el "mes top" viven en el caso de uso (dominio-cercano
y testeable), no en el componente.

---

## 21. Orden de las reference cards: por cantidad *(elección del usuario, ida y vuelta)*

**Historia.** Al principio se ordenaban por frecuencia; el usuario pidió un
**orden fijo** (naranja solo arriba, después rojo/violeta, rosa/gris,
verde/azul, amarillo/marrón) porque saltaban de lugar. Más tarde pidió
**volver a ordenarlas por cantidad** (de mayor a menor).

**Decisión.** `MoodReferenceCards` ordena por `counts[color]` descendente,
desempatando por `MOOD_COLOR_DISPLAY_ORDER` (así en un período vacío quedan en el
orden histórico). La primera card (la de más ocurrencias) va a ancho completo y
el resto en dos columnas. `MOOD_COLOR_DISPLAY_ORDER` queda solo como criterio de
desempate.

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

## 42. Gimnasio: reseteo semanal sin job en segundo plano *(elección del usuario)*

**Contexto.** Se pidió una 4ª sección "Gimnasio" con rutinas (como una lista,
con nombre y ejercicios) y ejercicios con nombre, series, repeticiones, peso en
kg (editable con botones ±1/±2.5/±5 kg) y un puesto que define el orden. Rutinas
y ejercicios se van marcando como hechos a medida que se cargan series, y ese
progreso **se resetea los domingos a la noche**. También se pidió un cuadro
"Seleccionar rutina para hoy" (favoritable, favorito por defecto) que guía
ejercicio por ejercicio: carga series de a una y avanza sola al siguiente
ejercicio cuando se completan las del actual.

**Decisión.** El progreso de un ejercicio no se guarda como "hecho: sí/no" sino
como `GymExerciseProgress { routineId, exerciseId, cycleStart, completedSets }`,
donde `cycleStart` es la fecha ISO del lunes de la semana en que se cargó esa
serie (`currentCycleStart()`). Al **leer** progreso (`GetGymProgress`,
`GetGymSession`) se compara el `cycleStart` guardado contra el del lunes actual:
si no coinciden, se trata como `completedSets: 0` sin tocar el storage
(`resolveCompletedSets`). Al **escribir** (`SetGymSetCount`) siempre se graba
con el `cycleStart` de hoy. Entonces el reseteo no lo dispara nada: la primera
vez que se interactúa con una rutina después de que pasó la semana, esa
interacción ya escribe (o lee) contra el ciclo nuevo y el progreso viejo queda
implícitamente descartado. Sobre esta misma base:

- `currentExercise` en `GetGymSession` es **derivado**, no un puntero guardado:
  es el primer ejercicio de la rutina (ordenado por puesto) que no está
  "hecho" (`completedSets >= sets`). Cargar una serie y volver a pedir la
  sesión ya refleja el avance al siguiente ejercicio, sin lógica extra de
  "avanzar".
- El cuadro "Seleccionar rutina para hoy" no tiene una entidad propia para
  favoritear: se agregó `gymFavorite: boolean` a `UserProfile` (arranca en
  `true`), mismo patrón que `moodFavorite`/`financeFavorite`. El componente
  `GymTodayCard` es autocontenido (viewmodel propio, toggle de favorito propio),
  igual que `MoodTrackerCard`/`FinanceSummaryCard`; `useFavorites` solo lee el
  flag del perfil para decidir si lo incluye en la lista.
- El `position` (puesto) de un ejercicio es opcional al guardar
  (`SaveGymExercise`): si no se manda, se asigna `max(puestos existentes) + 1`
  (así un ejercicio nuevo siempre entra al final). Ver #43 para cómo se
  reordena.

**Alternativas descartadas.**

- **Guardar un booleano `done` por ejercicio y resetearlo con un job/notificación
  programada los domingos a la noche.** Requiere infraestructura de background
  task o notificaciones solo para "poner en `false`" un montón de flags; además
  no corre si la app estuvo cerrada toda la semana. El modelo de `cycleStart`
  logra el mismo resultado percibido (arranca en cero cada semana) sin ejecutar
  nada en segundo plano: el reseteo es un efecto de cómo se *lee* el dato, no
  un evento que hay que disparar.
- **Guardar `currentExerciseIndex` como estado explícito de la rutina.**
  Duplicaría lo que ya se puede derivar de `completedSets` por ejercicio, y se
  podría desincronizar si se edita un ejercicio (ej. le bajan las series) o se
  borra uno de en medio.

**Consecuencias.** El progreso de la semana pasada nunca se borra del storage
(queda una fila vieja con un `cycleStart` que ya no coincide); no molesta a
escala personal, pero el blob de `gymProgress` crece indefinidamente. Si el
usuario cambia la hora/fecha del teléfono, el cálculo del "lunes actual" se
corre con eso, como el resto de la app.

---

## 43. Gimnasio: ajustes de uso tras probar la primera versión *(elección del usuario)*

**Contexto.** Ya con Gimnasio andando, se pidió una tanda de ajustes de uso:
selector de rutina como desplegable (con las completadas tachadas), series y
repeticiones con default 4×12 o "al fallo" (sin número fijo), sacar el campo
"puesto" del editor y poder reordenar ejercicios como en Favoritos, textos más
cortos ("Agregar Ejercicio", "Completada por esta semana", sin emojis), una
opción para resetear el progreso de una rutina a mano, y el editor de peso sin
el checkbox "Con peso": directo 3 botones para bajar y 3 para subir (±1/±2.5/±5
kg), con la cantidad como etiqueta debajo de cada botón en vez de dentro.

**Decisión.**

- **Reordenar ejercicios = mismo patrón que Favoritos.** Se sacó el
  `FavoriteReorderRow` de `screens/favorites/` y se generalizó como
  [`ReorderRow`](src/presentation/components/ReorderRow.tsx) en el `components/`
  compartido (fila con flechas ▲▼), reutilizado tanto en Favoritos como en el
  detalle de rutina. `GymRoutineDetailScreen` suma un modo "Ordenar"/"Listo"
  igual al de Favoritos; al soltar, `useGymRoutineDetail.moveExercise` reordena
  el array en memoria y llama a `ReorderGymExercises`, un caso de uso nuevo que
  relee los ejercicios de la rutina y reescribe el `position` de cada uno según
  el orden recibido. Para que reescribir varias posiciones a la vez no pise
  datos entre sí (cada `save()` hacía su propio read-modify-write del blob
  compartido), se agregó `GymExerciseRepository.saveMany` /
  `GymExerciseLocalDataSource.writeMany`, que lee el blob una sola vez, aplica
  todos los cambios y persiste una sola vez.
- **"Al fallo" como `reps: number | null`.** En vez de una repetición mágica
  (0, -1) se usa `null` para decir "sin repeticiones fijas"; `isExerciseDone`
  sigue dependiendo solo de `completedSets` contra `sets`, así que no cambia
  nada del lado del progreso. El modal precarga sets en 4 y reps en 12 para un
  ejercicio nuevo, con un checkbox "Al fallo" que oculta/anula el campo de
  reps.
- **Peso sin el checkbox "Con peso".** `weightKg` pasa de opcional a
  obligatorio (`number`, default `0`) en la entidad, el DTO y el caso de uso:
  ya no hace falta un booleano aparte para decidir si el ejercicio "tiene" peso
  — 0 kg y "sin peso" son la misma cosa, y en la fila/tarjeta se sigue
  ocultando cuando es 0 (`weightKg > 0`).
- **Resetear rutina** (`ResetGymRoutineProgress`) simplemente borra todo el
  progreso guardado de esa rutina (`GymProgressRepository.deleteAllForRoutine`,
  ya existía para el borrado de rutina). Como "no hay progreso" ya se lee como
  0 series (ver #42), no hace falta un caso especial: es la misma función que
  usa el borrado en cascada, solo que sin borrar la rutina ni los ejercicios.
- **Selector como desplegable.** No se sumó ninguna librería de "select": es un
  botón que abre/cierra una lista en el lugar (estado local del componente,
  no del viewmodel, igual que otros toggles de UI en la app). `useGymTodayCard`
  pide `getGymSession` de cada rutina al recargar (mismo patrón N+1 que ya usa
  `useGymScreen` para los resúmenes del hub) para armar dos cosas: el mapa
  `doneByRoutine` (tachar las completadas) y la lista `pickerRoutines`, que es
  la que realmente se muestra en el desplegable — sale de ahí **filtrando las
  rutinas sin ejercicios** (nada que elegir en una rutina vacía) y
  **ordenando las completadas al final** (`sort` estable por `done`, que
  conserva el orden por antigüedad de `GetGymRoutines` dentro de cada grupo).
  `routines` (sin filtrar) se mantiene aparte para decidir si mostrar "todavía
  no creaste ninguna rutina" vs. "tus rutinas no tienen ejercicios todavía".

**Alternativas descartadas.**

- **Mantener el checkbox "Con peso" y solo agregar más botones de paso.** El
  pedido era explícitamente sacarlo: con los pasos de a 1 kg alcanza para
  marcar "sin peso" bajando a 0, y sacar el toggle simplifica el modal.
- **Guardar el orden de ejercicios aparte, como el `savedOrder` de Favoritos**
  (una lista de ids en un storage propio). Los ejercicios ya tenían un
  `position` persistido por entidad; reescribirlo es más simple que mantener
  dos fuentes de verdad para el mismo orden.

**Consecuencias.** `ReorderGymExercises` sigue siendo O(n) escrituras
conceptuales pero ahora en una sola pasada de lectura/escritura del blob
(`saveMany`), no n pasadas — a la escala de una rutina personal (pocos
ejercicios) esto no importaba para la corrección, pero evita una condición de
carrera real si se llegaran a lanzar varios `save()` en paralelo.

---

## 44. Gimnasio: descripción de ejercicio con link tocable *(elección del usuario)*

**Contexto.** Se pidió poder agregarle una descripción a un ejercicio, editable
desde el mismo editor. Si tiene descripción, en la lista de la rutina y en la
"Rutina de hoy" tiene que aparecer un símbolo **"i"** que, al tocarlo, muestre
esa info; y si la descripción es un link, tiene que poder tocarse para abrirlo.

**Decisión.**

- `description?: string` se agregó a `GymExercise` como campo opcional más
  (mismo patrón que `weightKg` antes de ser obligatorio): se recorta
  (`trim()`) al guardar y, si queda vacío, se guarda como `undefined` en vez de
  como string vacío — así "tiene descripción" se puede chequear con un simple
  `if (exercise.description)` en toda la UI, sin distinguir "vacío" de "no
  tiene".
- El símbolo "i" y el modal de info son el mismo componente reutilizado en dos
  lugares: [`GymExerciseInfoModal`](src/presentation/gym/components/GymExerciseInfoModal.tsx),
  un modal de **solo lectura** con el resumen del ejercicio (series ×
  repeticiones, peso) y la descripción. `GymExerciseRow` (detalle de rutina) y
  `GymTodayCard` (rutina de hoy) cada uno maneja su propio estado local
  `infoOpen` — no hace falta subirlo a un viewmodel, es puramente de UI, igual
  que el desplegable de rutinas (#43).
- **Links tocables**: se armó [`LinkedText`](src/presentation/components/LinkedText.tsx),
  un componente chico y genérico en el `components/` compartido (no atado a
  Gimnasio, por si se necesita en otra descripción de texto libre más
  adelante). Parte el string con `text.split(regex)` usando un regex con **un
  solo grupo de captura** (`/(https?:\/\/|www\.)[^\s]+/`), lo que hace que
  `split` devuelva texto plano y links intercalados en paridad fija (par =
  texto, impar = link) — así se sabe qué segmento es un link **por posición**,
  sin volver a testear el string contra el regex. Eso importa: un regex
  `/g` es *stateful* (guarda `lastIndex` entre llamadas), así que
  `regex.test(segment)` en un `.map()` da resultados salteados si se lo
  usa ingenuamente; se evitó esa trampa desde el principio en vez de
  introducirla y tener que repararla después. Cada link se abre con
  `Linking.openURL` (núcleo de React Native, no `expo-linking` — no hacía
  falta un módulo nuevo de Expo), anteponiendo `https://` si el usuario pegó
  algo que arranca con `www.`.
- El campo de descripción en [`GymExerciseModal`](src/presentation/gym/components/GymExerciseModal.tsx)
  es un `TextInput` multilínea al fondo del formulario, opcional, con un
  límite (`MAX_DESCRIPTION = 500`) igual de estilo que `MAX_EXERCISE_NAME`.

**Alternativas descartadas.**

- **Un componente de texto enriquecido (markdown, etc.) para la descripción.**
  Sobrecarga para notas de gimnasio; alcanza con texto plano + detectar
  links.
- **Guardar el link en un campo aparte (`link?: string`) en vez de dentro de
  la descripción libre.** El pedido fue "si pego un link como descripción,
  que se pueda tocar" — es texto libre que *puede* contener un link, no un
  campo de link dedicado; detectarlo con regex evita forzar al usuario a
  decidir de antemano si su nota "es" un link o no.

**Consecuencias.** El detector de links es un regex simple: no valida que la
URL sea alcanzable ni maneja casos raros (link pegado sin espacio antes/después
de otro texto, dominios sin `http`/`www`). Alcanza para el caso de uso real
(pegar un link de YouTube o similar) sin sumar una librería de parsing de URLs.

---

## 45. Rutina de hoy: saltar ejercicio, ajustar peso y ejercicios "por tiempo" *(elección del usuario)*

**Contexto.** En "Rutina de hoy" se pidieron tres cosas: (1) poder ajustar el
peso del ejercicio actual sin salir del cuadro, (2) un botón "Saltar
ejercicio" que muestre el siguiente de la lista sin marcar el actual como
hecho, dando la vuelta al llegar al final (mostrando el primero que no esté
completado), y (3) que un ejercicio pueda marcarse "por tiempo", donde
"repeticiones" pasa a llamarse y mostrarse como "tiempo" en segundos —
excluyente con "al fallo" (tildar uno destilda el otro).

**Decisión.**

- **"Por tiempo" es un booleano más junto a `reps`, no un tipo de dato nuevo.**
  `GymExercise.isTimed: boolean` reinterpreta el mismo campo numérico `reps`
  como segundos en vez de repeticiones; no hizo falta un campo `seconds`
  aparte. La UI (`GymExerciseModal`, `GymExerciseRow`, `GymExerciseInfoModal`,
  `GymTodayCard`, el `typeLabel` del modo "Ordenar") decide el texto
  ("12 rep" vs. "12 s" / "Al fallo") mirando `reps == null` primero y
  `isTimed` después. La mutua exclusión con "al fallo" es una regla de UI: al
  tildar un checkbox se destilda el otro (`setToFailure(false)` /
  `setIsTimed(false)` cruzados); del lado del dominio, `createGymExercise`
  igual valida que `isTimed && reps == null` sea inválido, como red de
  seguridad si algún caller no respeta esa regla.
- **"Saltar ejercicio" necesita un estado que la sesión (`GetGymSession`) no
  tiene: cuál es el ejercicio "enfocado" ahora mismo**, distinto del
  `currentExercise` derivado (siempre "el primero sin terminar"). Se agregó
  `focusedExerciseId` como estado **local del hook** `useGymTodayCard` (no en
  el dominio: es una preferencia de navegación de la sesión de uso, no datos
  persistentes) y un valor derivado `displayExercise` que es el ejercicio
  enfocado *si sigue sin terminar*, si no, cae solo al `currentExercise` de
  siempre — así no hace falta limpiar el estado a mano cuando el ejercicio
  saltado se termina (por completar sus series) ni cuando se cambia de
  rutina (el id enfocado de la rutina vieja simplemente no matchea ningún
  ejercicio de la nueva). `skip()` recorre `session.exercises` (ya ordenados
  por puesto) desde el ejercicio actual +1, módulo el total, hasta encontrar
  uno sin terminar — eso da la vuelta al final sola.
- Antes de este cambio, `changeSet` operaba siempre sobre
  `session.currentExercise`; ahora opera sobre `displayExercise`, así sumar o
  restar series afecta al que está enfocado (saltado o no).
- **"Ajustar peso" reutiliza el mismo control que ya existía en el editor de
  ejercicio**, extraído a [`WeightStepRow`](src/presentation/gym/components/WeightStepRow.tsx)
  (antes vivía inline en `GymExerciseModal`): la fila `− − − peso + + +` es
  ahora un componente con un solo prop de callback (`onAdjust(delta)`), usado
  tanto en el editor (que junta los cambios en estado local hasta guardar)
  como en `GymTodayCard` (que persiste cada click al toque, vía
  `useGymTodayCard.adjustWeight`, que llama a `saveGymExercise` con el resto
  de los campos del ejercicio sin tocar — mismo patrón que ya usa
  `GetGymSession` de reconstruir el ejercicio completo antes de guardar).

**Alternativas descartadas.**

- **Guardar el "ejercicio saltado" en el dominio** (por ejemplo, un
  `skippedExerciseId` en la sesión o la rutina). No es progreso real, es una
  preferencia de la sesión de uso actual del cuadro; guardarlo en storage
  sería persistir algo que solo tiene sentido mientras el cuadro está en
  pantalla, y complicaría `GetGymSession` sin necesidad.
- **Un campo `unit: 'reps' | 'seconds'` en vez de `isTimed: boolean`.**
  Funcionalmente equivalente pero más genérico de lo que hace falta (solo hay
  dos casos, y el tercero — "al fallo" — ya lo cubre `reps: null`); un
  booleano es más simple de leer en cada `if`.

**Consecuencias.** `displayExercise` se recalcula en cada render a partir de
`session` y `focusedExerciseId` (no es estado propio), así que un ejercicio
"saltado" que se completa por fuera del cuadro (por ejemplo editándolo desde
el detalle de la rutina) también se resuelve solo la próxima vez que
`useGymTodayCard` recarga.

---

## 46. Bug: el orden de Favoritos de "Rutina de hoy" no se guardaba *(fix)*

**Contexto.** Se reportó que reordenar la card de "Rutina de hoy" en
Favoritos parecía funcionar (la UI reflejaba el nuevo orden en el momento),
pero al reabrir la app volvía a aparecer en su posición por defecto.

**Causa raíz.** `FavoriteRefKind` (en
[`FavoriteRef.ts`](src/domain/favorites/entities/FavoriteRef.ts)) listaba
`'finance' | 'mood' | 'tracker' | 'list'` — **sin `'gym'`** (quedó afuera
cuando se agregó el cuadro de Gimnasio a Favoritos, ver #42). `parseFavoriteRef`
usa esa lista para validar cada clave, y `sanitizeFavoritesOrder` descarta
toda clave que no pasa `parseFavoriteRef`. Como `SaveFavoritesOrder.execute`
sanea el array **antes de guardarlo**, la clave `'gym'` se borraba en cada
guardado — el array persistido nunca la tuvo. Al recargar, como `'gym'` no
aparece en el orden guardado, `useFavorites.reload()` la agrega al final del
merge en su posición **por defecto** (fija, justo después de `mood`),
pisando cualquier lugar donde el usuario la hubiera puesto.

**Decisión.** Se agregó `'gym'` a `FavoriteRefKind` y a la lista de kinds
"singleton" que `parseFavoriteRef`/`favoriteRefKey` reconocen sin necesitar
un `:id` (mismo trato que `'finance'` y `'mood'`, ya que "Rutina de hoy" no
tiene una instancia por id como sí tienen trackers o listas).

**Consecuencias.** Ninguna migración de datos necesaria: el orden guardado
previamente ya no tenía `'gym'` (se descartaba en cada guardado), así que a
partir de este fix simplemente empieza a guardarse correctamente la primera
vez que el usuario reordene o la app guarde el orden actual.

---

## 47. "Rutinas diarias": placeholder a un deslizo de Favoritos *(elección del usuario)*

**Contexto.** Se pidió que deslizar hacia la izquierda en Favoritos lleve a
una pantalla nueva con título "Rutinas diarias" que por ahora solo diga "Por
implementar" — explícitamente sin funcionalidad todavía.

**Decisión.**

- Se resucitó [`ComingSoon`](src/presentation/components/ComingSoon.tsx), el
  componente placeholder que ya existía desde #31 (se usó para "Finanzas"
  antes de implementarla) y que había quedado sin ningún screen que lo usara.
  `DailyRoutinesScreen` es solo `<ComingSoon title="Rutinas diarias"
  description="Por implementar" />`.
- El gesto reutiliza [`useHorizontalSwipe`](src/presentation/calendar/useHorizontalSwipe.ts),
  el mismo hook con el que ya se cambiaba de vista (semana/mes/año) en el
  progreso de un tracker (#33): solo reclama el gesto cuando el movimiento es
  claramente horizontal (`HORIZONTAL_RATIO`), así convive con el `ScrollView`
  de Favoritos sin romper el scroll vertical ni los taps de las cards o del
  botón "Ordenar". Vive en `presentation/calendar/` pero ya se importaba
  cross-feature desde `tracker-progress/`, así que importarlo una vez más
  desde `favorites/` sigue el mismo patrón en vez de mover el archivo.
  `onSwipeRight` queda como no-op: Favoritos es la pantalla inicial, no hay
  nada a la derecha todavía.
- `DailyRoutines` es una pantalla normal del stack (con flecha de volver),
  no una pantalla "hub": se llega por el gesto, no por el menú del header, así
  que no tiene sentido sumarla a `HubMenuButton`.

**Alternativas descartadas.**

- **Un componente placeholder nuevo en vez de reusar `ComingSoon`.** Hubiera
  sido código duplicado para el mismo propósito exacto que ya existía,
  simplemente sin uso en este momento.

**Consecuencias.** Ninguna todavía: es un placeholder a propósito. Cuando se
implemente "Rutinas diarias" de verdad, `DailyRoutinesScreen` deja de usar
`ComingSoon` y pasa a tener su propio viewmodel/componentes, como ya pasó con
Finanzas.

---

## 48. Rutinas diarias: tareas con reseteo diario y seguimiento automático *(elección del usuario)*

**Contexto.** Se implementó "Rutinas diarias" (hasta ahora un placeholder,
ver #47) de verdad: tareas con título y descripción (como una entrada de
lista) y un check que se resetea solo todos los días. Al final del día, el %
de tareas completadas tiene que "llenar" automáticamente un tracker con
colores (verde 100%, amarillo 50-99%, naranja 25-50%, rojo 0-25%), mostrado
abajo de todas las tareas con el título "Seguimiento de Rutina".

**Decisión.**

- **Reseteo diario = el mismo patrón que el reseteo semanal del gimnasio**
  (#42), con `cycleStart` diario en vez de semanal: `DailyTaskProgress { taskId,
  day, done }` guarda el día en que se tildó, y `resolveTaskDone` lo trata
  como no hecho si `day` no es el de hoy. De nuevo, nada dispara el reseteo:
  el primer toque del día nuevo ya escribe (o lee) contra el día correcto.
- **"Seguimiento de Rutina" es un tracker de verdad**, no una imitación
  visual: usa el mismo `Tracker`/`TrackerEntry` que ya existía para los
  trackers del usuario, con 4 opciones de color fijas. Reusar el modelo
  entero (en vez de inventar un tipo de dato de calendario propio para esto)
  significa que el calendario de abajo es literalmente
  [`CalendarMonth`](src/presentation/calendar/CalendarMonth.tsx) +
  [`TrackerDayCell`](src/presentation/tracker/components/TrackerDayCell.tsx),
  los mismos componentes que ya pintan cualquier otro tracker — cero UI
  nueva para "dibujar un calendario de colores". Como contrapartida, este
  tracker también aparece en el listado genérico de Trackers (no se lo
  oculta a propósito): es una decisión de simplicidad, no un descuido.
- **Id fijo, no generado** (`ROUTINE_TRACKER_ID = 'daily-routine-tracker'`),
  para poder "encontrarlo" siempre entre reinicios sin guardar una referencia
  aparte (como sí hace Gimnasio con la rutina seleccionada). Se crea la
  primera vez que hace falta (`SyncRoutineTracker`), con
  `TrackerRepository.save()` directo — no por `CreateTracker`, que siempre
  genera un id nuevo.
- **Sin "cierre de día": se resincroniza en cada recarga de la pantalla**,
  usando el progreso de HOY (no de "ayer"). En vez de esperar a medianoche
  (imposible sin un job en segundo plano, descartado otra vez por el mismo
  motivo que en #42), cada vez que se tilda/destilda una tarea se recalcula
  el % de hoy y se pisa el registro de hoy del tracker con el bucket que
  corresponde. El efecto práctico es el mismo que "al final del día": el
  último cambio del día es el que queda guardado como el color de ese día.
  Por eso tampoco hace falta detectar "cambió el día" en ningún lado.
- **Única dependencia cruzada entre features de dominio de toda la app**:
  [`SyncRoutineTracker`](src/domain/dailyRoutine/usecases/SyncRoutineTracker.ts)
  (en `domain/dailyRoutine/`) importa `TrackerRepository`,
  `TrackerEntryRepository`, `createTracker` y `createTrackerEntry` de
  `domain/tracker/`. Hasta ahora cada `domain/<feature>/` solo dependía de sí
  mismo y de `core/utils`; acá "Rutina diaria" necesita *ser* un tracker, no
  solo parecerse a uno, así que la alternativa (un puerto/evento genérico
  para no acoplar dominios) era over-engineering para una app personal de un
  solo usuario. Se documenta como la excepción, no como el patrón a seguir.

**Alternativas descartadas.**

- **Un tipo de dato de "seguimiento" propio de Rutinas diarias** (en vez de
  reusar `Tracker`). Hubiera duplicado toda la UI de calendario con colores
  que ya existe y funciona.
- **Ocultar "Seguimiento de Rutina" del listado de Trackers** con un flag
  tipo `hidden: boolean` en `Tracker`. Agregaba un campo al modelo genérico
  de trackers solo para un caso particular; total aparece con un nombre
  elocuente y no tiene nada "roto" si el usuario lo abre.
- **Calcular el % al abrir la app al día siguiente** (mirando el progreso de
  "ayer"), en vez de resincronizar en vivo. Requeriría detectar el cambio de
  día (comparar contra un "último día sincronizado" guardado) para no
  recalcular de más; resincronizar siempre con el día de hoy es más simple y
  da el mismo resultado final.

**Consecuencias.** Si el usuario abre la rutina, tilda alguna tarea, y después
nunca más vuelve a abrir la app ese día, el color que queda es el de "la
última vez que se tocó algo" — si esa no fue la última interacción real del
día con la app (p. ej. completó la última tarea mentalmente pero no volvió a
abrir la pantalla), el tracker puede no reflejar el estado "final" perfecto.
Es la misma clase de limitación que ya aceptan las notificaciones (#41) y el
reseteo del gimnasio (#42): sin job en segundo plano, todo se resuelve en el
próximo toque, no en el instante exacto del evento.

---

## 49. "i" + modal de descripción, generalizado a tareas y listas *(elección del usuario)*

**Contexto.** El patrón "tocar la fila edita, y si hay descripción aparece un
botón 'i' que la muestra en un modal con links tocables" ya existía solo para
ejercicios de gimnasio (#44). Se pidió el mismo comportamiento para las
tareas de Rutina diaria y para las entradas de listas (`ListEntryRow`), que
hasta ahora mostraban el comentario siempre, truncado a una línea, dentro de
la fila.

**Decisión.** Se extrajeron las dos piezas genéricas que antes vivían
solo del lado de Gimnasio a `presentation/components/`:
[`InfoButton`](src/presentation/components/InfoButton.tsx) (el círculo "i",
con `size` para los dos tamaños que ya se usaban) e
[`InfoModal`](src/presentation/components/InfoModal.tsx) (modal de solo
lectura con título + `children` opcional + descripción vía `LinkedText`, para
los links tocables). `GymExerciseInfoModal` pasó a ser un wrapper fino sobre
`InfoModal` (le agrega como `children` el renglón de series × peso que es
específico de un ejercicio), y `GymExerciseRow`/`GymTodayCard` ahora usan
`InfoButton` en vez de repetir el círculo a mano. `DailyRoutineTaskRow` y
`ListEntryRow` adoptan el mismo patrón desde cero: sacan el comentario/
descripción de la fila (ya no se ve truncado ahí) y lo muestran solo en el
modal, detrás del botón "i".

**Alternativas descartadas.**

- **Copiar el botón y el modal a cada fila nueva** (como ya estaba pasando
  entre Gimnasio y lo nuevo). Tres copias era la señal de extraer.

**Consecuencias.** `ListEntryRow` ya no muestra ninguna vista previa del
comentario en la lista (antes se veía truncado a una línea); ahora hay que
tocar "i" para verlo. Es la misma compensación que ya se aceptó para
Gimnasio: una fila más limpia a cambio de un toque extra para ver el detalle.

---

## 50. Trackers: comentario por día + fix de número en blanco al elegir una opción *(elección del usuario + fix)*

**Contexto.** Se pidió poder agregarle un comentario de texto libre a un
día de un tracker (como ya tienen mood, listas, ejercicios de gimnasio y
tareas de rutina diaria), y se reportó un bug: en un tracker que registra
**opciones y número a la vez**, si se elegía una opción desde la card del
home (Trackers) sin haber tocado antes el contador, el día quedaba **sin
número** en vez de arrancar en 0.

**Decisión.**

- `comment?: string` se agregó a `TrackerEntry` (recortado al guardar, igual
  que las demás descripciones de la app) y se edita desde
  [`TrackerDayModal`](src/presentation/tracker/components/TrackerDayModal.tsx)
  (la pantalla de progreso, al tocar un día) — no desde la card rápida del
  home, mismo criterio que ya separa "la card es para cargar rápido, el
  detalle es para editar todo" en mood y en los demás trackers.
- **Causa del bug**: `useTrackerCard.saveOptions` guardaba
  `value: entry?.value` — si todavía no había entrada ese día (`entry` es
  `null`), eso es `undefined`, y `SaveTrackerEntry`/`createTrackerEntry`
  tratan "value `undefined`" como "no hay número", así que el día quedaba sin
  registrar el contador aunque el tracker lo tuviera. El fix:
  `value: tracker?.hasCounter ? (entry?.value ?? 0) : entry?.value` — si el
  tracker tiene contador, un día nuevo arranca en 0 en vez de `undefined`.
- De paso se corrigió un bug de **pérdida de datos** relacionado: como
  `SaveTrackerEntry` reemplaza la entrada entera (no hace merge), ni
  `saveOptions` ni `setCount` mandaban `comment`, así que elegir una opción o
  tocar el contador **borraba** cualquier comentario ya guardado ese día. Las
  dos funciones ahora mandan siempre `comment: entry?.comment` para
  preservarlo.

**Alternativas descartadas.**

- **Que `SaveTrackerEntry` haga merge parcial en vez de reemplazar.** Cambiaría
  el contrato del caso de uso para todos los que ya lo llaman (Mood, Rutina
  diaria no aplica pero Gimnasio tampoco usa este caso de uso); mandar los
  campos completos desde cada call site, como ya se hacía, es más simple y
  explícito sobre qué se está pisando.

**Consecuencias.** Ninguna migración necesaria (`comment` es opcional,
entradas viejas simplemente no lo tienen). Cualquier otro call site nuevo de
`saveTrackerEntry` tiene que acordarse de mandar `comment: entry?.comment`
si no quiere perderlo — es el mismo cuidado que ya hace falta con
`optionIds`/`value` al reemplazar una entrada completa.

---

## 51. "Seguimiento de Rutina": primero en Favoritos, progreso completo *(elección del usuario)*

**Contexto.** Como "Seguimiento de Rutina" es un tracker real (#48), también
aparece en la pestaña Trackers y se puede favoritear como cualquier otro. Se
pidió que: (1) salga favorito y **primero** en Favoritos por defecto, (2)
"Ver progreso" sobre él abra la pantalla entera de Rutina diaria en vez del
progreso genérico de un tracker, (3) el bloque de seguimiento dentro de esa
pantalla se vea como el progreso de cualquier otro tracker —semana/mes/año,
navegación, contadores— en vez de solo un mes fijo, manteniéndose abajo de
todo, y (4) si no hay tareas todavía, un mensaje simple en vez del anterior.

**Decisión.**

- `SyncRoutineTracker` ahora crea el tracker con `favorite: true`. En
  `useFavorites.reload()`, antes de armar el `defaultOrder` de siempre
  (finanzas, mood, gimnasio, trackers, listas), se saca aparte el tracker con
  `id === ROUTINE_TRACKER_ID` de `favTrackers` y se lo empuja **primero**;
  el resto de los trackers favoritos sigue igual que antes (sin repetirlo).
  "Por defecto" es literal: si el usuario ya reordenó Favoritos a mano,
  `savedOrder` sigue ganando como siempre — esto solo define dónde cae la
  primera vez.
- **"Ver progreso" con ruteo condicional**: en los tres lugares donde se
  renderiza su `TrackerCard` (`FavoritesScreen`, `TrackersScreen` — el mismo
  componente también vive implícitamente en Favoritos a través de
  `useFavorites`), el callback de `onSeeProgress` chequea
  `tracker.id === ROUTINE_TRACKER_ID` y navega a `DailyRoutines` en vez de a
  `TrackerProgress`. No se agregó un flag al dominio ni un caso especial en
  `TrackerCard` — el componente no sabe nada de Rutina diaria, decide quién
  lo usa.
- **El progreso ahora vive en `useDailyRoutines` con `useCalendarPeriod`**, el
  mismo hook que ya comparten mood y los trackers del usuario: la vista
  (semana/mes/año) y el rango dejaron de estar fijos en "el mes actual".
  `reload()` depende de `period.range` (`startIso`/`endIso`), así que cambiar
  de vista o navegar de período reusa el mismo mecanismo con el que
  `useFocusEffect` ya recarga al volver a la pantalla (el callback cambia de
  identidad, React Navigation lo vuelve a correr). `RoutineTrackerCalendar`
  pasó a ser el mismo tipo de composición que ya usaba
  `TrackerProgressScreen`: `CalendarViewSwitch` + navegación de período +
  `CalendarWeek`/`Month`/`Year` + [`TrackerStats`](src/presentation/tracker/components/TrackerStats.tsx)
  reutilizado tal cual para los "contadores" por color (con un
  `numberStats` vacío constante, porque este tracker no tiene contador — el
  componente ya sabe no dibujar ese bloque si `hasCounter` es falso). Sigue
  siendo de solo lectura (no se agregó un modal de día): nadie pidió poder
  tocar un día para forzar un color a mano, y sumarlo motivaría la pregunta
  de qué pasa cuando `SyncRoutineTracker` lo vuelve a pisar.
- El widget solo se muestra si `tracker` existe (es decir, si ya hubo al
  menos una tarea creada): con cero tareas `SyncRoutineTracker` nunca llega a
  crear el tracker, así que no tiene sentido mostrar semana/mes/año vacíos.

**Alternativas descartadas.**

- **Ocultar el tracker de Rutina diaria de la pestaña Trackers** para evitar
  tener que rutear "Ver progreso" dos veces. Ya se había descartado en #48 por
  la misma razón (simplicidad > ocultamiento) y seguir mostrándolo ahí es lo
  que permitió "favoritearlo primero" sin inventar un mecanismo nuevo.
- **Agregar swipe para cambiar de vista** dentro del widget embebido (como
  tiene `TrackerProgressScreen`). La pantalla entera ya usa swipe horizontal
  para volver a Favoritos; anidar otro gesto de swipe en un sub-bloque sin
  poder probarlo en un dispositivo real era un riesgo innecesario para algo
  que el botonera de `CalendarViewSwitch` + flechas ya cubre.

**Consecuencias.** Ninguna.

---

## 52. Dos ajustes al patrón de descripciones: punto en el tracker, comentario visible en listas *(elección del usuario)*

**Contexto.** Dos correcciones al patrón "i" / descripción de #49-#50:

1. Los días de un tracker con comentario no tenían ninguna señal visual en el
   calendario — había que tocar el día a ciegas para enterarse de que tenía
   uno.
2. Al generalizar el botón "i" a `ListEntryRow` (#49), se sacó el comentario
   recortado que antes se veía siempre en la fila, dejando solo el botón "i".
   Para listas, se pidió **mantener las dos cosas**: el comentario recortado
   en la fila (como antes) y además el botón "i" para verlo completo.

**Decisión.**

- `TrackerDayCell` suma un prop `hasNote?: boolean`: si es `true`, dibuja un
  punto chico arriba a la derecha (el número del día ya ocupa arriba a la
  izquierda). Lo calculan `TrackerProgressScreen` y `RoutineTrackerCalendar`
  mirando `entry?.comment` — no hace falta tocar el domain, el comentario ya
  viaja en el `TrackerEntry` que ya se estaba leyendo.
- `ListEntryRow` vuelve a mostrar `entry.comment` recortado a una línea
  (como antes de #49), y mantiene el botón "i" al lado del nombre para ver el
  comentario completo (con links tocables). En el momento de este cambio el
  pedido fue específicamente sobre "la lista" (Listas); un pedido inmediato
  siguiente pidió lo mismo para `DailyRoutineTaskRow`, así que las tareas de
  Rutina diaria terminaron con el mismo patrón: título + descripción
  recortada en la fila + botón "i" para el modal completo.

**Consecuencias.** Ninguna.

---

## 53. Reordenar tareas de Rutina diaria, igual que los ejercicios de gimnasio *(elección del usuario)*

**Contexto.** Se pidió poder reordenar las tareas de Rutina diaria con el
mismo mecanismo que ya tiene el detalle de una rutina de gimnasio: un botón
"Ordenar"/"Listo" que cambia la lista a filas con flechas ▲▼.

**Decisión.** Calco directo de `ReorderGymExercises` (#43): nueva
[`ReorderDailyRoutineTasks`](src/domain/dailyRoutine/usecases/ReorderDailyRoutineTasks.ts)
que relee las tareas, reescribe `position` según el orden de ids recibido y
guarda todo con un `DailyRoutineTaskRepository.saveMany` (lectura/escritura
única del blob, mismo motivo que en Gimnasio: evitar que varias escrituras en
paralelo se pisen entre sí). `useDailyRoutines.moveTask` reordena el array en
memoria igual que `useGymRoutineDetail.moveExercise`, y
[`DailyRoutinesScreen`](src/presentation/screens/daily-routines/DailyRoutinesScreen.tsx)
reutiliza el mismo [`ReorderRow`](src/presentation/components/ReorderRow.tsx)
compartido que ya usan Favoritos y el detalle de rutina de gimnasio — tercer
lugar que lo reusa, confirmando que valió la pena sacarlo a `components/`
en su momento (#43).

**Alternativas descartadas.** Ninguna — es el mismo patrón ya establecido,
sin variantes a evaluar.

**Consecuencias.** Ninguna.

---

## 54. Listas desplegables (solo lectura) + pin en Favoritos *(elección del usuario)*

**Contexto.** Se pidió poder desplegar una lista desde su card (en Favoritos
y en Listas) con un botón de triángulo al lado, para ver sus ítems sin entrar
a la lista — tildar en el caso de to-do lists, pero **nada más**: para
editar o ver el resto de los campos sigue haciendo falta entrar a la lista
como ya funciona. En Favoritos, además, un botón de pin que hace que la
lista quede desplegada por defecto.

**Decisión.**

- `List` suma `pinnedExpanded: boolean` (default `false`), mismo patrón que
  `favorite` — y por lo tanto vive en el mismo blob de `lists` sin storage
  key nuevo, el backup lo cubre gratis. Nuevo caso de uso simétrico a
  `SetListFavorite`: [`SetListPinnedExpanded`](src/domain/list/usecases/SetListPinnedExpanded.ts).
- **`ListCard` pasó a ser autocontenido para el despliegue**: guarda su
  propio estado `expanded` (inicializado en `list.pinnedExpanded`) y, al
  desplegarse, pide `getListEntries` directo (perezoso: solo cuando
  `expanded` es `true`, no para cada card de entrada) — mismo criterio que ya
  usan las cards favoriteables de Mood/Gimnasio (autocontenidas, con su
  propio `reload`). Un `useEffect` fuerza `expanded = true` cuando
  `list.pinnedExpanded` se vuelve `true` (por ejemplo, al pinear desde otra
  instancia del card o al recargar la pantalla), pero **nunca fuerza el
  colapso** al despinear — así despinear no te cierra la vista de golpe.
- **Vista desplegada deliberadamente mínima**: solo nombre + checkbox (en
  to-do lists) o un puntito (en listas normales) — sin fecha, comentario,
  rating ni botón "i". Tildar un ítem llama a `SetListEntryDone` (ya
  existía) y después a un callback `onEntryToggled` para que la pantalla que
  lo contiene recargue sus conteos (el "X/Y hechas" del subtítulo, que
  `ListCard` no sabe recalcular por sí solo).
- El botón de pin (nuevo [`PinButton`](src/presentation/components/PinButton.tsx),
  mismo patrón que `FavoriteStar`) solo se muestra con `showPin` — prop que
  `FavoritesScreen` pasa en `true` y `ListsScreen` no pasa. El `pinnedExpanded`
  en sí es una sola propiedad de la lista (no hay un flag separado "solo para
  Favoritos"): si se pinea desde Favoritos, la lista también arranca
  desplegada al verla en la pestaña Listas. Pinear además expande al toque
  (sin esperar el round-trip de `reload`), para feedback inmediato.

**Alternativas descartadas.**

- **Guardar qué listas están "pineadas" en un storage separado**, como el
  orden manual de Favoritos (`favoritesOrder`). Habría sido una fuente de
  verdad más para lo mismo que ya puede vivir como un campo en `List`.
- **Que el despliegue muestre fecha/comentario/rating directo en la fila**
  (como `ListEntryRow`). El pedido fue explícito: "no se puede hacer nada
  más que ver los ítems (y marcar como hecha)" — la fila en sí se mantiene
  mínima; ver el resto de la info pasó a resolverse tocando el ítem (ver
  #55), no mostrándola siempre en la fila. Editar sigue requiriendo entrar a
  la lista.

**Consecuencias.** Cada card desplegada que no está pineada vuelve a pedir
sus entradas cada vez que el componente se desmonta y remonta (al salir y
volver a la pantalla) — no hay caché entre sesiones de la pantalla; aceptable
a esta escala, mismo criterio que el resto de los conteos N+1 de la app.

---

## 55. Ajustes a las listas desplegables: ícono real, ver ítem completo, tilde centrado *(elección del usuario)*

**Contexto.** Cuatro correcciones a #54: (1) el triángulo de desplegar se
veía chico, (2) el pin no debía ser un emoji sino un ícono real de Lucide,
(3) tocar un ítem en la vista desplegada tiene que abrir un modal mostrando
**toda** la información de la entrada (no solo nombre), y ese mismo modal
"de ver todo" debería aplicar en todos los módulos que ya tenían un patrón
parecido, y (4) el tilde del `Checkbox` no se veía centrado en el cuadrado
(se nota en las filas de listas y de Rutina diaria).

**Decisión.**

- **Primer ícono real de la app**: hasta ahora todo era texto/emoji/Unicode
  (★, ▸, 📌, i en cursiva...). Se agregaron `lucide-react-native` y su
  dependencia `react-native-svg` (versión fijada a la que trae el propio
  Expo SDK 57 para este proyecto, vía su `bundledNativeModules.json`, en vez
  de la última de npm) — es un módulo nativo, pero empaquetado en el cliente
  de Expo Go igual que otros módulos comunes, así que no debería hacer falta
  un build de EAS para probarlo (a diferencia de `expo-notifications`, que sí
  lo necesita). [`PinButton`](src/presentation/components/PinButton.tsx) pasó
  de `<Text>📌</Text>` a `<Pin />` de Lucide, coloreado con `theme.colors.accent`
  cuando está pineado.
- El triángulo de [`ListCard`](src/presentation/list/components/ListCard.tsx)
  pasa de `fontSize: 15` a `20` (la mitad del tamaño del botón "＋", que mide
  40px).
- **Nuevo modal "ver todo"**: [`ListEntryInfoModal`](src/presentation/list/components/ListEntryInfoModal.tsx)
  envuelve el `InfoModal` genérico (#49) y le agrega, como `children`, la
  fecha (o "Vence:" + "vencida" en to-do lists), la prioridad/rating y el
  estado (completada/pendiente) — además de la descripción que `InfoModal`
  ya mostraba. Se usa en dos lugares: el botón "i" de `ListEntryRow` (que
  ahora se muestra si hay *cualquier* dato extra — comentario, fecha o
  rating — no solo comentario) y, nuevo, **tocar un ítem en la vista
  desplegada de `ListCard`** (antes esas filas no hacían nada al tocarlas).
  Gimnasio y Rutina diaria ya mostraban toda su información relevante desde
  que se creó el patrón (#44, #49), así que no necesitaron cambios — "en
  todos los módulos" ya estaba cubierto ahí.
- **Centrado del tilde (primer intento, insuficiente — ver #57)**: `Checkbox`
  le sumó a su `<Text>✓</Text>` `textAlign: 'center'`,
  `textAlignVertical: 'center'` e `includeFontPadding: false`. Es el fix
  estándar de RN para el padding que Android le agrega al texto por defecto,
  pero no alcanzó: el glifo `✓` en sí no está centrado dentro de su propio
  cuadro de la fuente, así que quedaba corrido igual.

**Alternativas descartadas.**

- **Seguir con emoji/texto para el pin.** Pedido explícito del usuario de
  usar un ícono real; de paso sienta el precedente para si en el futuro se
  quiere reemplazar otros emoji (★, ▸) por íconos consistentes.

**Consecuencias.** La app pasa a depender de un módulo nativo más
(`react-native-svg`) además de `expo-notifications`; si en algún momento deja
de andar en Expo Go, el mismo tipo de aviso que ya existe para notificaciones
(probar en un build de EAS) aplicaría acá también.

---

## 56. Bug: la vista desplegada de una lista quedaba desactualizada *(fix)*

**Contexto.** Se reportó que, con una lista desplegada, agregar una entrada
(desde el **＋** de la card) no la mostraba ahí hasta cerrar y volver a abrir
el despliegue.

**Causa raíz.** El `useEffect` de [`ListCard`](src/presentation/list/components/ListCard.tsx)
que pide `getListEntries` solo tenía `[expanded, list.id]` como dependencias:
una vez desplegada, nada volvía a dispararlo mientras seguía desplegada,
aunque la lista cambiara por fuera (agregar una entrada, borrarla, tildar una
tarea desde la lista completa).

**Decisión.** Se agregaron `counts.total` y `counts.done` a las dependencias
del efecto. `counts` ya lo recalcula la pantalla contenedora (`useFavorites`/
`useLists`) en cada `reload()`, así que cualquier cambio real en la lista
hace que esos números cambien y el efecto se vuelva a disparar — sin agregar
un mecanismo de invalidación nuevo, reusando un valor que ya viajaba como
prop.

**Consecuencias.** Tildar un ítem *desde la propia vista desplegada* ya
actualizaba `entries` al toque (de forma optimista) y además dispara
`onEntryToggled` → `reload()` del padre → `counts` cambia → el efecto se
vuelve a disparar igual, pidiendo las entradas de nuevo aunque ya estaban
correctas. Es una lectura redundante (no una lectura incorrecta): aceptable
a esta escala, mismo criterio de simplicidad que el resto de los efectos
"recargar todo" de la app.

---

## 57. Tilde del Checkbox: el fix real era un ícono, no un ajuste de texto *(fix)*

**Contexto.** El intento de #55 (`includeFontPadding: false` + alineación)
no dejó el tilde centrado — el usuario lo confirmó después de probarlo.

**Causa raíz.** El problema no era el padding que Android le agrega al
`<Text>` (eso sí se corrigió), sino que el glifo `✓` de la fuente del
sistema no es simétrico dentro de su propio cuadro de avance — ningún ajuste
de alineación de texto puede centrar algo que la fuente ya dibujó corrido.

**Decisión.** Se reemplazó el `<Text>✓</Text>` por el ícono `Check` de
Lucide (ya disponible desde #55, cuando se agregó para `PinButton`): un path
vectorial centrado en su `viewBox` por diseño, inmune a cómo cada fuente
dibuje el glifo. `Checkbox` queda sin ningún `<Text>` propio.

**Alternativas descartadas.**

- **Seguir ajustando el texto** (un `transform: [{translateY}]` a ojo).
  Un valor a mano que "más o menos" centra el glifo de una fuente específica
  se puede romper con cualquier cambio de fuente del sistema o de plataforma
  (Android/iOS). Un ícono vectorial no tiene ese problema.

**Consecuencias.** Ninguna — mismo tamaño, mismo color, mismo lugar en todos
los `Checkbox` de la app (listas, Rutina diaria, gimnasio).

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
