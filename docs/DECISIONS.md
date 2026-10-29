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

## 58. Bug: el teclado tapaba el comentario de un tracker *(fix)*

**Contexto.** Al escribir el comentario de un día en
[`TrackerDayModal`](src/presentation/tracker/components/TrackerDayModal.tsx),
el teclado tapaba el campo. El resto de los modales con campos de texto
largo (`GymExerciseModal`, `ListEntryModal`, `DailyRoutineTaskModal`) no
tienen este problema.

**Causa raíz.** Esos otros modales envuelven su contenido en
[`KeyboardAvoider`](src/presentation/components/KeyboardAvoider.tsx)
(`KeyboardAvoidingView`, necesario porque Android no reacomoda solo el
contenido de un `Modal`). `TrackerDayModal` se armó sin ese wrapper — el
campo de comentario es justamente lo que se agregó después (#50), sobre un
modal que nunca lo había necesitado antes.

**Decisión.** Se envolvió el `Pressable` de fondo en `KeyboardAvoider`,
igual que los demás modales con texto libre.

**Consecuencias.** Ninguna.

---

## 59. Actualización a Expo SDK 58 *(elección del usuario)*

**Contexto.** El Expo Go instalado en el teléfono se actualizó solo a SDK 58
y dejó de abrir el proyecto (en SDK 57): "Project is incompatible with this
version of Expo Go". Como ya no hay vuelta atrás sin desinstalar Expo Go,
había que actualizar el proyecto para que coincida.

**Decisión.**

- `npx expo install expo@^58.0.0 --fix` es el camino oficial, pero en esta
  máquina `npm install` interno de la CLI de Expo falla por una restricción
  del sandbox (`--allow-scripts is not allowed in project-scoped installs`,
  no es algo del proyecto). Workaround: correr `npm install <paquete>@<versión>`
  **directo**, con las versiones exactas que la propia CLI de Expo imprime
  (`npx expo install --fix` y `npx expo install --check` siguen sirviendo
  para *saber* qué versión corresponde a cada paquete, solo que la instalación
  en sí hay que hacerla a mano). Mismo workaround que ya hizo falta para
  instalar `react-native-svg`/`lucide-react-native` en #55.
- **Versiones nuevas**: `expo` 57→58, `react-native` 0.86→0.88, `react`
  19.2→19.3, y el resto de los paquetes nativos (`expo-notifications`,
  `expo-file-system`, `react-native-screens`, `react-native-safe-area-context`,
  `react-native-svg`, `@react-native-community/datetimepicker`, etc.) a sus
  versiones compatibles con SDK 58. `npx expo-doctor@latest` corrió los 20
  checks sin encontrar nada.
- **Un solo error de compilación por la "Strict TypeScript API"** que trae
  RN 0.88 por defecto: [`HubMenuButton`](src/presentation/navigation/HubMenuButton.tsx)
  tipaba su `ref` del botón como `useRef<View>(null)`, y los nuevos tipos
  generados desde Flow ya no exponen `measureInWindow` sobre ese tipo (viene
  de `NativeMethods`, que esta versión de los tipos retiró — ver el changelog
  de SDK 58). El fix es tipar el ref con `useRef<ComponentRef<typeof View>>(null)`
  (el `ComponentRef` de React, no `View` directo) — así TypeScript infiere el
  tipo real del nodo nativo (`ReactNativeElement`), que sí tiene
  `measureInWindow`.
- Se revisó el único otro punto de fricción posible con la guía de
  migración: [`textScale.ts`](src/core/text/textScale.ts) hace
  `require('react-native/Libraries/Text/Text')` (import profundo, justo lo
  que la Strict API empieza a marcar como error) — pero como es un
  `require()` con cast manual (`as { default?: unknown }`), no un `import`
  estático, no depende de los tipos de ese módulo y sigue compilando limpio.
- `expo-notifications` ahora muestra notificaciones en foreground por
  defecto; este proyecto ya lo hacía explícito (`shouldShowBanner: true,
  shouldShowList: true` en el `setNotificationHandler` de #41), así que el
  cambio de default no afecta nada acá.
- Se actualizó la referencia de [`AGENTS.md`](AGENTS.md) de
  `docs.expo.dev/versions/v57.0.0` a `v58.0.0`.

**Alternativas descartadas.**

- **Esperar a que baje la versión de Expo Go** (instalar una build vieja de
  Expo Go para SDK 57). Es un parche que solo pospone el problema — Expo Go
  se actualiza solo, así que hubiera vuelto a pasar.

**Consecuencias.** `npx expo export --platform android` sigue bundleando
limpio (el conteo de módulos que reporta subió de ~1130 a ~3195: el nuevo
Metro/RN 0.88 cuenta los módulos distinto, no es una señal de nada roto). No
hay carpetas `android`/`ios` en el repo ni `AppDelegate.swift` propio, así
que la migración del ciclo de vida de iOS que pide la guía de SDK 58 no
aplica — EAS Build las genera de cero en cada build.

---

## 60. Eventos: sexta pestaña, ocurrencias calculadas como en Finanzas *(elección del usuario)*

**Contexto.** Nueva pestaña "Eventos", elegible desde el mismo menú que
Trackers/Listas/Finanzas/Gimnasio. Al entrar, un calendario como el de
progreso de un tracker (semana/mes/año) pero con celdas más grandes, porque
cada evento de un día se pinta como una **franja de color** (no solo un
punto). "Agregar evento" arriba del calendario abre un modal: nombre, fecha,
horario, color, y una repetición opcional — cada N días, terminando nunca,
en una fecha, o después de cierta cantidad de veces. Tocar un día muestra sus
eventos (con opción de agregar uno para ese día).

**Decisión.**

- **Ocurrencias calculadas, no materializadas** — mismo principio que
  Finanzas (#39): un evento que se repite se guarda **una vez**
  (`CalendarEvent` con su `EventRepeat` opcional), y
  [`eventOccurrencesInRange`](src/domain/event/entities/occurrences.ts)
  calcula en qué fechas cae dentro de un rango visible, calco directo de
  `financeOccurrencesInRange`: itera desde la fecha base sumando
  `intervalDays` por paso (en vez del `addMonthsClamped` de Finanzas, que no
  hace falta acá — sumar días es aritmética directa), tope de
  `MAX_OCCURRENCES = 5000` para el caso "nunca termina", y corta antes si hay
  `endDate` o `count`. Un evento indefinido nunca genera una fila por
  ocurrencia; el reseteo del rango visible (cambiar de mes, por ejemplo) solo
  cambia qué ocurrencias se calculan, no qué se guarda.
- `EventRepeatEndType` son los tres casos pedidos explícitamente:
  `'never' | 'onDate' | 'afterCount'` — más granular que el de Finanzas
  (`months: number | null`, dos casos) porque el pedido fue literal: "puede
  ser indefinido, hasta cierto día, o cierta cantidad de veces".
- [`GetEventOccurrencesInRange`](src/domain/event/usecases/GetEventOccurrencesInRange.ts)
  arma, para todo el rango visible, un `Record<fecha, ocurrencias>` en una
  sola pasada — lo usan tanto las franjas del calendario como el modal de
  "eventos de este día" (ambos ya tenían los datos, no hace falta pedirlos de
  nuevo al tocar un día).
- **Celdas más grandes = más altas, no más anchas**: `EventDayCell` ignora el
  "cuadrado" que asumían las celdas de trackers/mood y usa
  `height = size * 1.9` (el ancho sigue siendo el que calcula
  `CalendarMonth`/`CalendarWeek`, screen-width ÷ 7) — lo que hace falta es
  alto para apilar una franja por evento, no ancho. `CalendarMonth`/`Week` ya
  son agnósticos a esto (reparten el ancho en 7 columnas y dejan que cada
  celda decida su propio alto), así que no hizo falta tocarlos.
- **Reuso en vez de componentes nuevos**: el selector de color es
  [`OptionColorPicker`](src/presentation/tracker/components/OptionColorPicker.tsx)
  (ya existía para las opciones de un tracker), la fecha es
  [`DateField`](src/presentation/list/components/DateField.tsx) (ya existía
  en Listas), y el checkbox "Se repite" es el `Checkbox` compartido. Nuevo
  solo [`TimeField`](src/presentation/event/components/TimeField.tsx) (no
  había picker de horario en la app) — mismo patrón que `DateField`, con
  `@react-native-community/datetimepicker` en `mode="time"`.
- **Tocar un evento desde "eventos de este día" edita directo** (no hay un
  modal de "ver" intermedio): es una vista de detalle del día, mismo criterio
  que las filas de gimnasio/listas/rutina diaria (tocar edita; el botón "i"
  es solo para previews recortadas, y acá no hay preview que recortar).

**Alternativas descartadas.**

- **Materializar una fila por ocurrencia al crear un evento repetido.**
  Mismo problema que ya se evitó en Finanzas: un evento "cada 1 día,
  indefinido" generaría filas sin límite real; calcular bajo demanda es
  gratis en comparación.
- **Agregar Eventos al `CreateChooserModal` de Favoritos** (como
  tracker/lista/rutina). No se pidió, y Eventos no tiene un concepto de
  "favorito" en esta versión.

**Consecuencias.** El modal de "eventos de este día" y las franjas del
calendario comparten los datos de `occurrencesByDate` (ya cargados para el
rango visible), pero si el día tocado tiene ocurrencias fuera del rango
visible actual (no debería pasar, ya que solo se puede tocar un día que se
esté viendo) no se mostrarían — no es un caso real dado cómo se abre el
modal, pero vale la nota.

---

## 61. Eventos: borrar una ocurrencia repetida, y semanas completas en la vista de mes *(elección del usuario)*

**Contexto.** Dos ajustes a Eventos (#60): (1) al borrar un evento que se
repite, antes se borraba la serie entera sin preguntar; ahora hay que poder
elegir entre borrar solo esa ocurrencia o esa y las que siguen (conservando
las anteriores). (2) la vista de mes solo mostraba los días del mes exacto,
con huecos en blanco antes del primer día y después del último; ahora esas
semanas se completan con los días del mes vecino, pintados en un gris más
clarito para diferenciarlos, y mostrando sus eventos igual que cualquier
otro día.

**Decisión.**

- **Borrar una ocurrencia sin materializar la serie**: `CalendarEvent` suma
  un campo `excludedDates?: readonly IsoDate[]` (fechas puntuales saltadas
  dentro de una serie que sigue repitiéndose), y
  [`eventOccurrencesInRange`](src/domain/event/entities/occurrences.ts)
  filtra esas fechas al calcular ocurrencias. El nuevo caso de uso
  [`DeleteEventOccurrence`](src/domain/event/usecases/DeleteEventOccurrence.ts)
  tiene dos modos: `'only'` agrega la fecha a `excludedDates` (la serie
  sigue); `'thisAndFollowing'` trunca la repetición poniendo
  `repeat.endType = 'onDate'` con `endDate = fecha - 1 día` — ningún modo
  materializa una fila por ocurrencia, mismo criterio que #60. Si la fecha
  borrada es la primera ocurrencia (`date <= event.date`), `'thisAndFollowing'`
  equivale a borrar el evento entero (no quedaría ninguna ocurrencia previa
  que conservar).
- **La ocurrencia puntual viaja junto al evento al editar**: `openEditEvent`
  ahora recibe `(event, occurrenceDate)` en vez de solo `event` — hace falta
  saber *qué día* se tocó (no solo *qué evento*) para poder borrar "solo
  este día" de una serie. `DayEventsModal` pasa esa fecha desde
  `DayEventOccurrence.date`, que ya traía el dato.
- **La elección se resuelve con `Alert.alert` de 3 botones** (Cancelar /
  Solo este día / Este y los que siguen) en vez de un modal propio — es una
  decisión puntual sin más estado que mantener, y la app no tenía hasta
  ahora un caso de "confirmar con más de dos opciones" que justificara un
  componente nuevo. Si el evento no se repite, se borra directo sin
  preguntar (no hay ocurrencias entre las que elegir).
- **Semanas completas vía un prop opcional en `CalendarMonth`**, no un
  cambio de comportamiento global: `showOverflowDays?: boolean` (default
  `false`) agrega días de relleno con fecha real (en vez de `null`) antes
  del primer día y después del último, marcados `isOutsideMonth: true` en el
  `CalendarDay` que recibe cada `renderDay`. Sin el prop, el comportamiento
  es idéntico al de antes (huecos en blanco) — Mood, Trackers y Gimnasio
  siguen usando `CalendarMonth` sin tocarlos.
- **Gris clarito = `theme.colors.background`**, no un color nuevo: ya es el
  fondo de pantalla (`#e9ebf2`), más oscuro que `card` (`#f8f9fc`, el fondo
  normal de una celda) pero sin agregar un tono más a la paleta.
  `EventDayCell` lo aplica cuando `isOutsideMonth` viene en `true`, sin
  cambiar el resto de la celda (número de día y franjas de eventos se
  pintan igual).
- **El rango que se trae de `useEvents` también crece en vista de mes**:
  antes se pedían ocurrencias solo del mes calendario
  (`startOfMonth`–`endOfMonth`); ahora, para que los días de relleno
  muestren sus eventos, se pide el rango de semanas completas
  (`startOfWeek(startOfMonth)`–`endOfWeek(endOfMonth)`). Las vistas de
  semana y año no cambian.

**Alternativas descartadas.**

- **Modal propio para elegir el modo de borrado.** `Alert.alert` ya cubre el
  caso con menos código; se preferirá un modal si en algún momento la
  elección necesita más contexto que tres botones de texto.
- **Cambiar el comportamiento de `CalendarMonth` para todos sus usos.** Mood,
  Trackers y Gimnasio no pidieron semanas completas; un prop opcional
  evita un cambio visual no pedido en esas pantallas.

**Consecuencias.** Un evento repetido puede terminar con `excludedDates`
largos si se borran muchas ocurrencias puntuales sueltas en vez de truncar
la serie — aceptable a la escala de uso personal de la app; si se vuelve un
problema, se podría compactar fusionando exclusiones consecutivas en un
recorte de rango.

---

## 62. Swipe para moverse de período en los cuatro calendarios *(elección del usuario)*

**Contexto.** Se pidió que el swipe horizontal mueva el período (anterior/
siguiente) en **todos** los calendarios — Mood, Progreso de tracker,
Seguimiento de Rutina (Gimnasio) y Eventos —, igual que ya hacían las
flechas `‹ ›`. El problema: en Progreso de tracker el swipe ya existía (#33)
pero con otro significado — cambiar de vista (semana→mes→año) —, lo que
hacía imposible tener el mismo gesto con dos significados distintos en la
misma pantalla. Se consultó al usuario: eligió **reemplazar** ese swipe de
vista por el de período, para que las cuatro pantallas se comporten igual
(el cambio de vista sigue disponible por el selector `[Semana | Mes | Año]`
de arriba).

**Decisión.**

- [`useHorizontalSwipe`](src/presentation/calendar/useHorizontalSwipe.ts)
  (ya existía, de #33) se reutiliza sin cambios — sigue siendo el mismo
  `PanResponder` que solo reclama el gesto si es claramente horizontal. Lo
  que cambia es **a qué se conecta**: en las cuatro pantallas
  (`MoodProgressScreen`, `TrackerProgressScreen`, `RoutineTrackerCalendar`,
  `EventsScreen`) ahora es `onSwipeLeft: goToNext, onSwipeRight: goToPrevious`
  — izquierda avanza, derecha retrocede, mismo sentido que las flechas.
- **Se borraron `zoomInView`/`zoomOutView`** de `useCalendarPeriod` (y el
  `VIEW_ORDER` que solo usaban ellas): quedaron sin ningún llamador al
  reemplazar el único swipe que los invocaba, así que no tenía sentido
  dejarlos vivos.
- `RoutineTrackerCalendar` vive embebido dentro de `DailyRoutinesScreen`,
  que ya envuelve toda la pantalla en su propio swipe (derecha → volver a
  Favoritos, ver #47). Con el nuevo swipe anidado adentro, un gesto que
  arranca **sobre el calendario** lo resuelve el `PanResponder` interno
  (mueve el período) y
  uno que arranca en el resto de la pantalla sigue yendo a Favoritos — el
  sistema de responders de RN no dispara los dos a la vez, así que no hace
  falta coordinarlos a mano. (Nota: en la práctica esto no se arbitraba
  bien — el swipe de pantalla se quedaba con el gesto incluso arrancando
  sobre el calendario/carrusel; #81 reemplazó `PanResponder` por
  `react-native-gesture-handler` con una relación `requireToFail` explícita
  para que el anidado de verdad priorice al interno.)

**Alternativas descartadas.**

- **Mantener el swipe de "cambiar de vista" en Progreso de tracker** y dejar
  las otras tres pantallas con swipe de período. Quedaban inconsistentes
  entre sí justo lo que se pidió evitar; el usuario confirmó reemplazarlo.

**Consecuencias.** El atajo de swipe para cambiar de vista en Progreso de
tracker (semana↔mes↔año) ya no existe; para eso queda el selector de
arriba, que siempre estuvo disponible.

---

## 63. Eventos: celdas más grandes, mes y semana sin scroll *(elección del usuario)*

**Contexto.** Se pidió que los cuadros de los días en Eventos sean más
grandes y que, de ser posible, la vista de semana y de mes entren enteras en
pantalla sin tener que scrollear. Antes, el tamaño de celda salía solo del
ancho (pantalla ÷ 7) y la altura era ese ancho por una relación fija
(`EVENT_CELL_HEIGHT_RATIO = 1.9`), sin importar cuánto alto quedara
disponible — con la vista de mes mostrando semanas completas (#61, hasta 6
filas), eso ya desbordaba la pantalla con bastante frecuencia.

**Decisión.**

- **`CalendarMonth` y `CalendarWeek` suman dos props opcionales**:
  `fitHeight` y `cellAspectRatio` (ambas por defecto conservan el
  comportamiento de siempre). Con `fitHeight`, el tamaño de celda final es
  el **mínimo entre el que sale del ancho y el que sale del alto
  disponible** (`Math.min(widthBasedSize, heightBasedSize)`) — así la celda
  es lo más grande posible sin que la grilla desborde. El alto disponible se
  mide con `onLayout` sobre el contenedor (no sobre el ancho solo, como
  antes), y requiere que ese contenedor viva en un alto ya fijado por el
  padre (`flex: 1` dentro de un alto determinado), no dentro de un
  `ScrollView` cuyo alto depende de su propio contenido — si no, la medición
  sería circular.
- **`EventsScreen` deja de envolver toda la pantalla en un `ScrollView`**:
  los controles de arriba (agregar evento, selector de vista, flechas de
  período) quedan fijos, y el calendario vive en un `View` con `flex: 1`
  debajo — ese es el contenedor de alto fijo que necesitan `fitHeight`. Para
  semana y mes, `EventDayCell`'s `EVENT_CELL_HEIGHT_RATIO` (ahora exportado)
  se pasa como `cellAspectRatio`, así la celda crece hasta el máximo que
  entra en el alto real de la pantalla.
- **El año queda afuera de `fitHeight`**: son 12 mini-calendarios con
  puntitos, no celdas de día; si no entran en una pantalla chica, se
  scrollea solo esa vista (`ScrollView` propio, acotado al área que le toca
  después de los controles de arriba) — no se pidió cambiar esa vista.
- **Mood, Trackers y Gimnasio no cambian**: `fitHeight`/`cellAspectRatio`
  son opcionales y nadie más los pasa, así que esas pantallas siguen
  calculando el tamaño de celda solo por ancho, igual que siempre.

**Alternativas descartadas.**

- **Un tamaño de celda fijo más grande.** No se ajusta a la variedad de
  anchos de pantalla ni garantiza que entre sin scroll — el pedido explícito
  era "de ser posible, que entre sin scrollear", no un tamaño fijo.
- **Forzar siempre 6 filas en la vista de mes** (en vez de las filas reales
  del mes, 4 a 6) para que el cálculo de alto sea más simple. Se descartó:
  desperdiciaría espacio en los meses de 4-5 filas, achicando la celda sin
  necesidad.

**Consecuencias.** En los meses de 6 filas, en pantallas chicas, la celda
puede terminar algo más chica que el máximo que daría el ancho solo (para
no desbordar); en la mayoría de los celulares y meses de 4-5 filas, la
celda llega al máximo de ancho de todas formas. Si en algún dispositivo muy
bajo de alto el mes de 6 filas igual no entra, el mínimo seguiría dejando
una celda utilizable (no hay un piso mínimo de tamaño todavía).

---

## 64. Eventos: celda uniforme entre meses, menos espacio y menos chrome arriba *(elección del usuario)*

**Contexto.** Con #63, el alto de celda salía de las filas **reales** de
cada mes (4 a 6), así que un mes de 4 filas quedaba con celdas más grandes
que uno de 6 — justo lo que #63 había elegido a propósito (aprovechar el
espacio en los meses con menos filas). El pedido ahora fue el inverso:
**todos los meses con el mismo tamaño de celda**, más espacio dedicado a la
celda achicando el "chrome" de arriba (botón de agregar, selector de vista,
nombre del período) y el espacio entre celdas.

**Decisión.**

- **`fixedRows` en `CalendarMonth`**: nueva prop opcional — si viene, el
  cálculo de `fitHeight` usa ese número de filas en vez de
  `cells.length / 7` (las filas reales del mes mostrado). `EventsScreen` la
  fija en **6** (el máximo posible), así el tamaño de celda sale siempre de
  la misma cuenta sin importar qué mes se esté mirando — por diseño, esto
  revierte la alternativa que #63 había descartado ("forzar siempre 6
  filas"); ahí el pedido era aprovechar espacio por mes, ahora es
  consistencia entre meses, y gana el pedido más reciente.
- **`gap` en `CalendarMonth` y `CalendarWeek`**: nueva prop opcional (antes
  una constante `GAP` fija por archivo, 6 y 8 respectivamente). Sin la prop
  se comportan igual que siempre; `EventsScreen` pasa un `CELL_GAP = 3` más
  chico para ambas vistas, así el espacio que antes era separación entre
  celdas pasa a ser alto de celda.
- **`CalendarViewSwitch` suma `compact`** (opcional, por defecto `false`):
  menos padding y texto más chico en el control `[Semana | Mes | Año]`.
  Solo `EventsScreen` lo pasa; el resto de las pantallas que lo usan quedan
  igual.
- **Botón "＋ Agregar evento" y la fila de navegación de período** (flechas
  `‹ ›` + título) se achican directo en los estilos de `EventsScreen` (no
  son componentes compartidos, así que no hizo falta una prop): menos
  `paddingVertical`, texto más chico. El `gap` entre los bloques de arriba
  también bajó (14 → 8).

**Alternativas descartadas.**

- **Dejar el tamaño de celda variable por mes** (lo que hacía #63). Se
  pidió explícitamente lo contrario: consistencia entre meses por sobre
  aprovechar el espacio de los meses más cortos.

**Consecuencias.** En los meses de 4-5 filas queda espacio vertical sin
usar debajo de la grilla en vez de que la celda crezca para ocuparlo — es
el trade-off directo de pedir el mismo tamaño en todos los meses. (Nota:
el `justifyContent: 'center'` que centraba ese espacio sobrante se sacó en
#65, a pedido del usuario. El `fixedRows` de esta entrada se sacó en #67:
el pedido pasó a ser el inverso otra vez — altura variable para que la
celda siempre estire a ocupar toda la pantalla.)

---

## 65. Eventos: fila de letras (LMMJVSD) siempre a la misma altura y a todo el ancho *(elección del usuario)*

**Contexto.** Con #63/#64, el contenedor de `fitHeight` centraba su
contenido (`alignItems: 'center'`, `justifyContent: 'center'`) tanto para
achicar la grilla sin que tocara los bordes como para repartir el espacio
sobrante arriba y abajo. Efecto no buscado: cuando la celda queda achicada
por el alto (no por el ancho), la fila de letras `L M M J V S D` y la
grilla quedaban **angostas y centradas** en vez de ocupar todo el ancho de
pantalla, y la posición vertical de esa fila variaba según cuánto espacio
sobrante hubiera (la grilla se centraba como bloque en el alto disponible)
— no quedaba siempre a la misma altura debajo del título del mes.

**Decisión.**

- **Se sacó `alignItems: 'center'` y `justifyContent: 'center'`** del
  estilo `fillHeight` de `CalendarMonth` y `CalendarWeek` — vuelven al
  comportamiento por defecto de un contenedor flex en columna: los hijos
  **estiran a todo el ancho** (`alignItems: 'stretch'`, el default) y se
  **anclan arriba** (`justifyContent: 'flex-start'`, el default). Así la
  fila de letras queda siempre pegada justo debajo de la fila de
  encabezado (fija, fuera de `CalendarMonth`/`Week`), sin importar cuánto
  más chica sea la grilla que el alto disponible.
- **`grid` (la grilla de celdas de `CalendarMonth`) suma
  `justifyContent: 'space-between'`**, igual que ya tenía `weekHeader`
  (la fila de letras) y `row` en `CalendarWeek`. Antes no tenía ninguno
  (`flex-start` por defecto), así que si la celda quedaba más chica que el
  máximo que daba el ancho, las celdas de cada fila se amontonaban a la
  izquierda en vez de ocupar todo el ancho. Con `space-between`, el espacio
  que sobra (si la celda está limitada por el alto, no por el ancho) se
  reparte **entre** las celdas en vez de quedar afuera de la fila — la fila
  de letras y la grilla de días siempre terminan ocupando el mismo ancho
  total y alineadas columna por columna (mismo truco que ya traía
  `weekHeader`, no era nuevo: solo le faltaba a `grid`).
- Este cambio es seguro para los demás usos de `CalendarMonth`/`CalendarWeek`
  (Mood, Trackers, Gimnasio): ahí la celda **siempre** sale exacta del
  ancho (`cellSize = floor((width - gap·6) / 7)`, sin `fitHeight`), así que
  no queda espacio sobrante que `space-between` tenga que repartir — el
  `justifyContent` nuevo no cambia nada visible en esas pantallas.

**Alternativas descartadas.**

- **Mantener el centrado y solo arreglar la posición vertical.** No
  alcanzaba: el pedido también fue que ocupen todo el ancho, que requería
  sacar el `alignItems: 'center'` (que achicaba la fila al contenido) además
  del `justifyContent: 'center'` (que la movía verticalmente).

**Consecuencias.** En los meses de 4-5 filas (celda no limitada por ancho),
las letras y las celdas de cada fila quedan con más separación entre sí
(el espacio sobrante se reparte ahí) en vez de como margen afuera de la
fila — es la combinación que cumple "misma altura siempre" + "todo el
ancho" a la vez. (Nota: en #66 el ancho de celda deja de achicarse por el
alto, así que este reparto por `space-between` queda para el resto
redondeado nada más — ver #66.)

---

## 66. Eventos: ancho y alto de celda desacoplados, celdas pegadas sin espacio *(elección del usuario)*

**Contexto.** Se pidió aumentar el ancho de las celdas de día en Eventos y
que queden **pegadas, sin espacio entre ellas**. El problema de fondo: desde
#63, `fitHeight` calculaba un único `cellSize` (ancho = alto ÷
`cellAspectRatio`) y usaba el **mínimo** entre lo que daba el ancho y lo que
daba el alto — así que en cuanto el alto mandaba (como pasa casi siempre
con `fixedRows=6`, #64), la celda se achicaba **también a lo ancho**, y
encima el `justifyContent: 'space-between'` de #65 rellenaba ese ancho
perdido con **espacio entre celdas** en vez de dejarlas más anchas. Eso es
exactamente lo opuesto a lo que se pidió ahora.

**Decisión.**

- **Ancho y alto de celda se calculan por separado.** `cellWidth` sale
  **siempre** de repartir el ancho disponible en 7 columnas
  (`floor((width - gap·6) / 7)`) — ya no se achica nunca por falta de alto.
  `cellHeight` sale de lo natural (`cellWidth × cellAspectRatio`) salvo que
  no entre en el alto disponible, en cuyo caso se recorta a lo que quepa
  (`Math.min`) — pero el ancho no se toca. Resultado: la celda puede quedar
  **menos alta** que su relación "natural" en los meses de 6 filas, pero
  **nunca más angosta** que el máximo que da la pantalla.
- **`CalendarDay` (el objeto que recibe cada `renderDay`) suma `height?:
  number`** junto al `size` que ya existía (que ahora es siempre el
  ancho). Si no viene, el consumidor asume celda cuadrada (`size` para
  ambos) — así Mood/Trackers/Gimnasio, que no leen este campo nuevo, siguen
  exactamente igual.
- **`EventDayCell` pasa a recibir `height` como prop explícita** (ya no la
  calcula internamente con `size × EVENT_CELL_HEIGHT_RATIO`) — ese cálculo
  ahora vive en `CalendarMonth`/`CalendarWeek`, que son quienes saben
  cuánto alto hay disponible.
- **`EventsScreen` pasa `gap={0}`** (antes 3): sin espacio entre celdas
  (ni entre filas, ni entre la fila de letras y la grilla), **y** con el
  ancho ya desacoplado del alto, ese espacio liberado pasa a ser ancho de
  celda en vez de quedar como hueco. El `justifyContent: 'space-between'`
  de #65 queda, pero ahora solo reparte el resto de redondeo (0 a 6px, el
  resultado de `floor` al repartir el ancho en 7) — ya no tiene que
  compensar una celda achicada por el alto.

**Alternativas descartadas.**

- **Mantener un solo `cellSize` y solo bajar el `gap`.** No alcanzaba: con
  `fixedRows=6` el alto sigue siendo casi siempre el límite, así que el
  ancho se seguiría achicando con la celda cuadrada de antes — el pedido
  era más ancho, no solo menos separación.

**Consecuencias.** La celda puede dejar de respetar `EVENT_CELL_HEIGHT_RATIO`
con exactitud en los meses de 6 filas (queda más baja que "ancho × 1.9" si
no entra) — es el trade-off directo de priorizar que el ancho nunca se
achique.

---

## 67. Eventos: el alto de celda vuelve a variar por mes, siempre estirado a ocupar toda la pantalla *(elección del usuario)*

**Contexto.** Con #64, `fixedRows={6}` hacía que el alto de celda saliera
siempre de la misma cuenta (6 filas), fuera cual fuera el mes real —
así todos los meses quedaban con la misma altura de celda, pero los de 4-5
filas dejaban espacio vertical sin usar debajo de la grilla (ver la nota en
#64). Además, `cellHeight` nunca pasaba de lo "natural" (`ancho ×
EVENT_CELL_HEIGHT_RATIO`): si había más alto disponible que eso, la celda
no crecía para aprovecharlo, solo se achicaba si hacía falta. El pedido
ahora es el inverso otra vez: que la celda **siempre** estire a ocupar todo
el alto disponible, y que varíe de mes a mes según sus filas reales (4 a
6) en vez de usar siempre el peor caso.

**Decisión.**

- **Se sacó `fixedRows`** de `CalendarMonth` (prop y uso): el cálculo de
  filas vuelve a ser `cells.length / 7`, las filas reales del mes que se
  está mostrando — tal como era en #63, antes de #64.
  `EventsScreen` ya no pasa `fixedRows={6}`.
  `EventsScreen` también deja de pasar `cellAspectRatio` en el llamado a
  `CalendarMonth` (sigue existiendo en la prop por si algún consumidor la
  necesita sin `fitHeight`, pero con `fitHeight` activo ya no se usa para
  nada: ver el punto siguiente).
- **`cellHeight` ya no tiene un tope en `Math.min` con el alto "natural"**:
  con `fitHeight`, pasa a ser directamente `heightPerRow` (el alto
  disponible ÷ filas reales) — la celda siempre estira para ocupar
  exactamente el alto que haya, ni más ni menos. Como las filas reales
  varían de mes a mes (4 a 6), el alto de celda varía con ellas: un mes de
  4 filas queda con celdas más altas que uno de 6, siempre llenando la
  pantalla completa en ambos casos.
- `CalendarWeek` no cambia: sigue con el tope `Math.min(natural,
  disponible)` sin estirar de más — una sola fila siempre tiene de sobra
  espacio vertical, y estirarla a ocupar toda la pantalla dejaría una fila
  de celdas gigante sin sentido. El pedido fue específicamente sobre "los
  meses".

**Alternativas descartadas.**

- **Mantener `fixedRows` pero permitir que estire por encima de lo
  "natural" también en el caso de 6 filas.** No tiene sentido: el pedido es
  justamente que el alto salga de las filas reales, no de un máximo fijo.

**Consecuencias.** Vuelve la inconsistencia de tamaño entre meses que #64
había eliminado a propósito — es el trade-off esperado: el pedido actual
prioriza "siempre ocupa toda la pantalla" por sobre "mismo tamaño en todos
los meses", que son mutuamente excluyentes salvo que todos los meses
tuvieran la misma cantidad de filas.

---

## 68. Eventos: "Se repite cada" arranca en 7 días, no 1 *(elección del usuario)*

**Contexto.** El campo "Repetir cada (días)" de `EventModal` arrancaba en
**1** (todos los días) al tildar "Se repite" en un evento nuevo. Se pidió
que arranque en **7** (semanal) — el caso más común para un evento que se
repite (cumpleaños, pago mensual aproximado a semanas, clase semanal, etc.).

**Decisión.** Los tres lugares donde `EventModal` usa `'1'` como valor
inicial de `intervalDays` (el `useState` inicial, el reset al abrir el
modal para un evento nuevo sin `repeat`, y el `placeholder` del campo)
pasan a `'7'`. Solo afecta el valor por defecto de un evento **nuevo**: un
evento existente sigue mostrando su propio `intervalDays` guardado, como
siempre.

**Alternativas descartadas.** Ninguna — cambio directo de un valor por
defecto, sin otras opciones en juego.

**Consecuencias.** Ninguna relevante: no cambia la validación (sigue
pidiendo un entero ≥ 1) ni el formato de guardado. (Nota: en #70 el campo
`intervalDays` pasa a ser `intervalValue` + `intervalUnit` — el default
sigue siendo 7 para días, y se agrega 1 como default para meses.)

---

## 69. Eventos: descripción, horario desde/hasta opcional, y modal de detalle con lápiz para editar *(elección del usuario)*

**Contexto.** Tres pedidos juntos sobre Eventos: (1) que un evento pueda
tener una **descripción**, visible en la lista de "eventos de este día";
(2) que el horario sea **desde / hasta**, ambos **opcionales** (antes era
un único `time` obligatorio); (3) que tocar un evento en esa lista abra un
**modal de solo lectura** con su información, y que el lápiz a la
**izquierda** de la fila sea lo que abre a editar — esto último revierte lo
elegido en #60 ("tocar edita directo, sin modal de ver intermedio").

**Decisión.**

- **`CalendarEvent` suma `description?: string`** (mismo patrón que
  `DailyRoutineTask`: `MAX_EVENT_DESCRIPTION = 300`, `trim()`, `undefined`
  si queda vacía) y **cambia `time: string` por `timeFrom?: string` /
  `timeTo?: string`**, los dos opcionales — cada uno se valida con el mismo
  formato `HH:MM` si viene, pero no hay validación de que `timeFrom` sea
  anterior a `timeTo` (no se pidió, y un evento "sin orden" simplemente no
  tiene mucho sentido mostrar distinto a uno con horario raro).
- **Migración de datos viejos**: `eventFromDto` lee el `time` legado (si
  existe en el JSON guardado) y lo usa como `timeFrom` cuando el evento no
  tiene uno propio — así los eventos ya guardados no "pierden" su horario
  al actualizar la app. El DTO ya no declara `time` en su tipo (type-level,
  los datos viejos en el blob lo siguen teniendo a nivel JS).
- **`TimeField` pasa a aceptar `value: string | null`**: sin valor muestra
  "Sin horario" y al lado aparece una cruz (ícono `X` de `lucide-react-native`)
  para volver a borrarlo; tocar el campo abre el picker nativo igual que
  antes (con `09:00` como hora de arranque si no había ninguna). Antes solo
  la usaba `EventModal`, así que se pudo cambiar su API sin tocar otros
  consumidores.
- **`EventModal` suma un `TextInput` multilínea para la descripción**
  (mismo patrón que `DailyRoutineTaskModal`: `minHeight: 70`,
  `multiline`, placeholder "Descripción (opcional)") y reemplaza el único
  `TimeField` por dos, "Desde" y "Hasta".
- **Nuevo `EventDetailModal`**, de solo lectura: reusa el `InfoModal`
  genérico (el mismo que ya usan tareas/listas/ejercicios para "i" +
  descripción, de #49) pasándole `title`/`description` del evento, y le
  agrega como `children` la fecha de la ocurrencia, el horario
  (`eventTimeLabel`, nuevo helper con los 4 casos: desde-hasta, solo desde,
  solo hasta, o nada) y un resumen de la repetición si tiene
  (`repeatSummary`, texto armado a mano — "Cada 3 días, hasta el
  01/12/2026", etc.).
- **`DayEventsModal` separa cada fila en dos zonas tocables**: un botón de
  lápiz (ícono `Pencil` de `lucide-react-native`) a la izquierda que llama
  a `onEditEvent` (mismo comportamiento que antes: cierra el modal de día y
  abre el formulario), y el resto de la fila (punto de color + horario +
  nombre + descripción en una segunda línea si tiene) que ahora llama a un
  `onViewEvent` nuevo — abre `EventDetailModal` **sin** cerrar el modal de
  día debajo (es un "vistazo" rápido, no una navegación; `EventsScreen` ya
  tenía el mismo patrón de modales apilados con `EventModal`).
- **`SaveEvent` ahora busca el evento existente antes de crear el
  reemplazo** (`repository.getById` si hay `id`) para pasarle
  `excludedDates` a `createCalendarEvent` — bug de paso: antes, guardar la
  edición de un evento repetido con días puntuales borrados ("solo este
  día", #61) los hacía desaparecer, porque `SaveEvent` nunca los leía de
  vuelta. No lo pidió el usuario en este mensaje, pero tocar `SaveEvent`
  para los campos nuevos sin arreglarlo hubiera dejado un bug más visible
  (la descripción/horario nuevos hacen que se edite un evento repetido más
  seguido).

**Alternativas descartadas.**

- **Validar que `timeFrom` sea anterior a `timeTo`.** No se pidió, y un
  evento nocturno real (22:00 a 02:00) rompería esa regla sin ser un error
  — mejor no validar que validar mal.
- **Checkbox "tiene horario" en vez de dos campos nulleables.** Un campo
  que ya puede mostrar "Sin horario" y tiene su propia cruz para borrarse
  no necesita un toggle extra: es redundante.
- **Modal de detalle propio, en vez de reusar `InfoModal`.** Hubiera
  duplicado exactamente el mismo patrón (sheet + descripción + "Cerrar")
  que ya existe y usan tareas/listas/ejercicios.

**Consecuencias.** Hay dos acciones distintas en la misma fila de
"eventos de este día" (tocar = ver, lápiz = editar) en vez de una sola —
es justo el cambio pedido, pero vale la nota de que ya no es "tocar
cualquier parte de la fila edita" como en #60.

---

## 70. Eventos: repetir por días o meses, y combo box para el tipo de fin *(elección del usuario)*

**Contexto.** Tres pedidos sobre la repetición de un evento: (1) que se
pueda elegir repetir **por días o por meses**, con su propia cantidad —
por defecto **7** en días, **1** en meses; (2) sin marrón en la paleta de
colores de Eventos; (3) que "Indefinidamente / Hasta una fecha / Cantidad
de veces" sea un **combo box** (no los tres chips de antes), con el campo
de cantidad o fecha a la **derecha** del combo en vez de abajo.

**Decisión.**

- **`EventRepeat.intervalDays` pasa a `intervalValue` + `intervalUnit`**
  (`'days' | 'months'`, nuevo `EventRepeatUnit`). El tope máximo depende de
  la unidad: `MAX_INTERVAL_DAYS = 3650` para días (como antes),
  `MAX_INTERVAL_MONTHS = 120` (10 años) para meses — repetir "cada 3650
  meses" no tiene sentido, así que no comparten el mismo tope.
- **`addMonthsClamped`** (sumar meses preservando el día, con clamp al
  último día del mes destino si no existe) **se movió de
  `domain/finance/entities/occurrences.ts` a `core/utils/date.ts`**: ya no
  es una lógica específica de Finanzas, la necesitan ambos dominios.
  `eventOccurrencesInRange` la usa igual que `financeOccurrencesInRange`
  (`addDays` si `intervalUnit` es `'days'`, `addMonthsClamped` si es
  `'months'`).
- **`EventModal` guarda el texto de cantidad por separado para cada
  unidad** (`intervalDaysText` / `intervalMonthsText`, cada uno con su
  propio default — 7 y 1) en vez de un solo campo: así cambiar entre
  "Días" y "Meses" no borra lo que el usuario ya tipeó en la otra unidad,
  y cada una arranca en su propio default la primera vez.
- **Nuevo `SelectField`** (`src/presentation/components/`): combo box
  genérico — toca para abrir una lista de opciones en un modal (mismo
  patrón visual que el resto de los modales chicos de la app), con un
  ícono `ChevronDown` (`lucide-react-native`) de pista. Se usa para el
  tipo de fin de la repetición (reemplaza los tres chips
  `endTypeChip`/`endTypeRow`, que se borraron) y para la unidad
  días/meses. Queda en el directorio compartido porque es un combo box
  genérico, no específico de Eventos — ningún otro formulario lo
  necesitaba todavía, pero el próximo que necesite elegir entre pocas
  opciones con texto ya no tiene que reinventar el patrón.
- **El campo de cantidad/fecha va a la derecha del combo**, en la misma
  fila (`styles.row`, `flexDirection: 'row'`): el combo ocupa su propio
  `field` (`flex: 1`) y, al lado, aparece `DateField` si el tipo es "Hasta
  una fecha" o un `TextInput` si es "Cantidad de veces" — ninguno de los
  dos si es "Indefinidamente", en cuyo caso el combo ocupa toda la fila
  solo.
- **Sin marrón en Eventos**: `EVENT_COLORS` en `EventModal.tsx` filtra
  `#8B5E3C` de la paleta compartida `OPTION_COLORS`. `OptionColorPicker`
  (compartido con Trackers y las categorías de Finanzas) suma una prop
  opcional `colors` — sin ella sigue mostrando la paleta completa, así que
  Trackers y Finanzas no cambian.
- **Migración de datos viejos**: `eventFromDto` lee el `intervalDays`
  legado del DTO de repetición (si existe) y lo usa como `intervalValue`
  con `intervalUnit: 'days'` cuando el evento no tiene los campos nuevos —
  mismo criterio que la migración de `time` → `timeFrom` en #69.

**Alternativas descartadas.**

- **Agregar `@react-native-picker/picker`** para el combo box. Es un
  módulo nativo nuevo que obliga a rehacer el build de desarrollo (como ya
  pasó con `expo-notifications`); un modal con una lista (`SelectField`)
  cubre el caso sin dependencia nueva — mismo criterio que #33
  (`PanResponder` en vez de `react-native-gesture-handler`).
- **Un solo campo de texto para la cantidad, reseteado al cambiar de
  unidad.** Se probó mentalmente y resultaba molesto: tipear "15" en días,
  cambiar a meses por error, y perder el "15" sin querer. Guardar un texto
  por unidad lo evita.
- **Quitar el marrón de `OPTION_COLORS` directamente.** Hubiera sacado el
  marrón también de Trackers y Finanzas, que no lo pidieron.

**Consecuencias.** `EventRepeatDto`/`SaveEventInput` cambiaron de forma
(no son compatibles con el `intervalDays` viejo a nivel de tipos), pero el
dato guardado se migra solo al leer (`eventFromDto`), así que no hace
falta ningún script de migración manual.

---

## 71. Ajustes: elegir la pestaña que se abre al iniciar la app *(elección del usuario)*

**Contexto.** Se pidió poder elegir, desde Ajustes, qué pestaña se muestra
al abrir la app — Favoritos por defecto, pero también Trackers, Listas,
Finanzas, Gimnasio o Eventos. Esto ya había existido brevemente como
"preferencia de pestaña de inicio" y se sacó en #38 cuando apareció
Favoritos como pantalla principal **fija**; ahora el pedido es explícito,
así que se reintroduce, pero con Favoritos como default en vez de sin
default (como era antes de #38).

**Decisión.**

- **`UserProfile` suma `homeTab: HomeTab`** (`'favorites' | 'trackers' |
  'lists' | 'finances' | 'gym' | 'events'`, nuevo tipo en el dominio;
  `DEFAULT_HOME_TAB = 'favorites'`). Vive en el dominio de usuario, no en
  navegación — `HomeTab` no sabe nada de nombres de ruta de
  `@react-navigation`, eso es un detalle de la capa de presentación.
- **`AppNavigator` mapea `HomeTab` → nombre de ruta** (`HOME_TAB_ROUTE`,
  un objeto chico solo ahí) y lo usa como `initialRouteName` del stack en
  vez de `'Favorites'` fijo — se lee una sola vez al arrancar, junto con
  el mismo `getUserProfile.execute()` que ya decidía `Onboarding` vs
  pantalla principal. Como `initialRouteName` de React Navigation es
  estático (se fija al montar el `Stack.Navigator`), cambiar la
  preferencia en Ajustes solo se nota en el **próximo** arranque de la
  app, no al toque — mismo comportamiento que ya tenía el gate de
  Onboarding.
- **Nuevo `HomeTabCard`** en Ajustes (mismo patrón que `NotificationsCard`/
  `UserNameCard`: lee con `getUserProfile.execute()` al montar, escribe con
  `updateUserProfile.execute({ homeTab })`), con un combo box
  (`SelectField`, de #70) para las seis opciones.
- **El menú del header (`HubMenuButton`) no cambia**: sigue mostrando las
  seis pestañas siempre, sin importar cuál sea la de inicio — esta
  preferencia solo decide dónde **aterriza** la app al abrirse, no qué
  pestañas existen ni cómo se navega entre ellas.
- **Onboarding no cambia**: al elegir el nombre por primera vez sigue
  yendo a Favoritos (`navigation.reset`) — la preferencia de pestaña de
  inicio recién se puede elegir después, desde Ajustes, así que no hay
  nada que respetar todavía en ese momento.
- **Migración**: un perfil guardado antes de este cambio no tiene
  `homeTab` en su DTO; `createUserProfile` ya resuelve ese caso con
  `params.homeTab ?? DEFAULT_HOME_TAB`, igual que cualquier otro campo
  opcional nuevo del perfil.

**Alternativas descartadas.**

- **Hacer que cambiar la preferencia navegue ahí mismo, sin esperar al
  próximo arranque.** No se pidió — es una preferencia de "qué pasa al
  abrir la app", no un acceso directo de navegación inmediata (para eso ya
  está el menú del header).

**Consecuencias.** Ninguna relevante: el flag es opcional y con default,
así que no rompe perfiles existentes ni el flujo de onboarding.

---

## 72. Favoritos: trackers y listas agrupados en una sola card con swipe *(elección del usuario)*

**Contexto.** En Favoritos, cada tracker favorito y cada lista favorita
tenía su propia card suelta en la lista reordenable (#38). Se pidió
agruparlos: todos los trackers favoritos en **un solo lugar**, todas las
listas favoritas en **otro solo lugar** (separados entre sí), mostrando
uno a la vez y pudiendo **deslizar** para cambiar cuál se ve.

**Decisión.**

- **`FavoriteCard` pasa de una variante por tracker/lista a una sola
  variante `'trackers'` (con `trackers: Tracker[]`) y una sola `'lists'`
  (con `lists: List[]` + `counts: Record<string, ListCounts>`)** —
  finanzas, mood y gimnasio siguen siendo cards individuales, sin cambios.
  `useFavorites.reload()` arma como mucho **un** `FavoriteCard` de cada
  grupo (si hay favoritos de ese tipo) en vez de uno por ítem.
- **"Seguimiento de Rutina" sigue primero por defecto** (#51): la lógica
  que antes sacaba ese tracker aparte y lo empujaba antes de
  finanzas/mood/gimnasio ahora decide dónde va la card **completa** de
  `'trackers'` — si el grupo incluye ese tracker, la card entera va
  primero; si no, va después de gimnasio (su lugar de siempre). Dentro del
  grupo, ese tracker es igual el primero de la lista.
- **Nuevo `FavoritesCarousel`** (genérico, `T extends { id: string }`):
  muestra un ítem a la vez con un encabezado chico (título + `‹ 2/3 ›`) y
  cambia de ítem con las flechas **o** deslizando — reusa
  [`useHorizontalSwipe`](src/presentation/calendar/useHorizontalSwipe.ts)
  (de #33), el mismo hook que ya usan los calendarios y el propio
  `FavoritesScreen` para volver de "Rutina diaria". El índice es estado
  local del carrusel (no se persiste): no se pidió recordar cuál se vio
  último, y clampear contra la longitud actual alcanza si un ítem deja de
  ser favorito mientras se lo está mirando. (Nota: en #74 se reemplazó
  `useHorizontalSwipe` por un `PanResponder` + `Animated` propio, para que
  el deslizo se vea en vivo — ver esa entrada.)
- **El swipe del carrusel queda anidado dentro del swipe de toda la
  pantalla** (que `FavoritesScreen` usaba para ir a "Rutina diaria") —
  mismo criterio que #62 (`RoutineTrackerCalendar` dentro de
  `DailyRoutinesScreen`): el sistema de responders de RN solo dispara uno
  por gesto, así que deslizar sobre la card de trackers/listas cambia de
  ítem, y deslizar en el resto de la pantalla sigue yendo a "Rutina
  diaria". (Nota: en #73 ese swipe de pantalla se sacó por completo —
  "Rutina diaria" pasó a ser una pestaña del menú — así que esta
  convivencia ya no hace falta, aunque el patrón de nesting en sí sigue
  vigente en otras pantallas. Nota 2: esa convivencia por `PanResponder`
  anidado nunca se arbitró bien en la práctica — ver #81.)
- **El modo "Ordenar" (`ReorderRow`) ahora reordena los grupos como
  bloque**, no los ítems de adentro — "Trackers" y "Listas" son una fila
  más entre finanzas/mood/gimnasio, con flechas ▲▼ igual que antes. No se
  agregó una forma de reordenar a mano **dentro** de un grupo (qué tracker
  o lista aparece primero en el carrusel); no se pidió, y el orden natural
  (con "Seguimiento de Rutina" primero) ya resuelve el caso que importaba.

**Alternativas descartadas.**

- **Agregar reordenamiento manual dentro de cada grupo.** No se pidió —
  agrupar y poder deslizar ya resuelve "verlos en un solo lugar"; el orden
  interno (rutina primero, después el resto como venga de `getTrackers`/
  `getLists`) no generó necesidad de ajustarlo a mano todavía.
- **Carrusel con loop infinito** (de la última página volver a la
  primera). Se descartó por simplicidad y porque los demás controles de
  período/vista de la app (calendarios) tampoco hacen loop — las flechas
  se deshabilitan en los extremos, consistente con eso. (Nota: se pidió
  explícitamente lo contrario en #74: el carrusel pasó a ser circular.)

**Consecuencias.** Un usuario que ya había reordenado trackers o listas
individuales a mano (claves `tracker:<id>` / `list:<id>` en
`favoritesOrder`) pierde ese orden fino al actualizar: esas claves ya no
coinciden con ningún `FavoriteCard` y el merge existente las ignora (mismo
comportamiento ya documentado en #38 para claves que dejan de existir); la
card de grupo nueva cae en su posición por defecto la primera vez.

---

## 73. "Rutina diaria" pasa a ser una pestaña más del menú, no un swipe escondido *(elección del usuario)*

**Contexto.** Dos pedidos juntos: (1) que el swipe sobre un tracker o una
lista en el carrusel de Favoritos (#72) mueva de forma confiable al
siguiente; (2) que "Rutina diaria" deje de ser un gesto escondido
(deslizar desde Favoritos, #47) y pase a ser **una opción más** en el
menú del header, como Favoritos/Trackers/Listas/Finanzas/Gimnasio/Eventos.
Las dos cosas están relacionadas: el swipe de "ir a Rutina diaria" vivía
en toda la pantalla de Favoritos, **anidado por fuera** del swipe nuevo
del carrusel (#72) — sacarlo de en medio simplifica la cadena de gestos
en vez de solo confiar en que el anidamiento se resuelva solo.

**Decisión.**

- **`HubRoute` suma `'DailyRoutines'`** y `HubMenuButton.ITEMS` agrega
  `{ route: 'DailyRoutines', label: 'Rutina diaria' }` — aparece en el
  menú desplegable de todas las pantallas hub, igual que las otras seis.
- **`DailyRoutines` pasa a usar `hubOptions('DailyRoutines')`** en
  `AppNavigator` en vez de `{ title: 'Rutina diaria' }`: mismo header con
  menú desplegable, sin flecha de volver, transición fundido — ya no es
  una pantalla "pusheada" aparte, es una pestaña hub más.
- **Se sacó el swipe de `FavoritesScreen`** (`onSwipeLeft` → navegar a
  `DailyRoutines`) y el link chico "Rutina Diaria ›" al lado del saludo:
  ya no hacen falta, la pestaña está en el menú como cualquier otra. Esto
  también destraba el pedido (1): el swipe del `FavoritesCarousel` (#72)
  ya no convive anidado con ningún otro swipe de pantalla, así que
  deslizar sobre la card de un tracker o una lista cambia de ítem sin
  competir con nada.
- **Se sacó el swipe de `DailyRoutinesScreen`** (`onSwipeRight` →
  `navigation.goBack()`), por la misma razón y para ser consistente: las
  otras seis pantallas hub no tienen gesto de swipe para "salir" — se
  navega por el menú. El swipe de período dentro de
  `RoutineTrackerCalendar` (de #62) tampoco queda ya anidado dentro de
  otro swipe de pantalla.

**Alternativas descartadas.**

- **Mantener el swipe de Favoritos→Rutina diaria además del ítem de
  menú.** El pedido fue explícito ("pase a ser una opción más"), y
  mantener las dos formas de llegar sumaba un gesto que ya no resolvía
  nada que el menú no resolviera, además de ser la causa directa del
  anidamiento que había que destrabar.

**Consecuencias.** `DailyRoutinesScreen` ya no tiene forma de "volver"
explícita (como las otras pantallas hub): se cambia de pestaña por el
menú. Si en algún momento se agregan más pantallas hub, conviene agregar
la ruta tanto a `HubRoute`/`ITEMS` como al tipo que acepta `hubOptions` en
`AppNavigator` — quedó repetido en los dos lugares porque son de módulos
distintos (navegación de presentación vs. configuración del stack) y no
se armó un tipo compartido para una lista de 7 rutas. *(Nota: en #79 el
swipe de `FavoritesScreen` volvió, pero acotado a "fuera de los
carruseles" — ver esa entrada; el resto de esta decisión sigue vigente.)*

---

## 74. `FavoritesCarousel`: el deslizo se ve en vivo, y el carrusel es circular *(elección del usuario)*

**Contexto.** Dos ajustes al carrusel de trackers/listas de Favoritos
(#72): (1) que deslizar se **vea** mientras pasa — hasta ahora el cambio
de ítem era instantáneo al soltar, sin ningún movimiento visible durante
el gesto; (2) que el carrusel sea **circular**: desde el último ítem,
seguir deslizando para adelante lleva al primero, y viceversa — lo
opuesto a lo que #72 había elegido a propósito ("se descartó por
simplicidad").

**Decisión.**

- **Se reemplazó `useHorizontalSwipe` por un `PanResponder` +
  `Animated.Value` propios**, solo dentro de `FavoritesCarousel` (el hook
  compartido no se tocó: calendarios y el resto de la app lo siguen
  usando igual). Hacía falta seguir el dedo en vivo
  (`onPanResponderMove` → `translateX.setValue(gesture.dx)`), algo que
  `useHorizontalSwipe` no ofrece a propósito (solo dispara un callback al
  soltar, de #33) — ningún otro uso en la app necesitaba esto todavía.
- **Ventana deslizante de 3 paneles** (anterior / actual / siguiente,
  cada uno del ancho del carrusel), dentro de un `Animated.View` que se
  desplaza con `translateX`: en reposo muestra el panel del medio
  (`transform: translateX(Animated.add(translateX, -width))`); al
  arrastrar, los tres se mueven juntos con el dedo, dejando ver el
  siguiente o el anterior entrando desde el costado. Al soltar: si el
  arrastre pasó los 45px (mismo umbral que `useHorizontalSwipe`), una
  animación (`Animated.timing`, 220ms) termina el recorrido hasta mostrar
  ese vecino completo y recién ahí cambia el índice (`setIndex`) y
  resetea `translateX` a 0 — invisible porque pasa en el mismo instante
  en que el panel del medio vuelve a ser, numéricamente, el mismo
  contenido que se acababa de terminar de mostrar. Si no llegó al umbral,
  `Animated.spring` lo devuelve a 0 (rebote).
- **Círculo de verdad**: `prevIndex`/`nextIndex` se calculan con módulo
  (`(current - 1 + count) % count` / `(current + 1) % count`), así que
  siempre hay un vecino para cada lado — el panel "siguiente" desde el
  último ítem ya es el primero, y viceversa. Las flechas `‹ ›` ya no se
  deshabilitan en los extremos (ya no hay extremos).
- **Cada panel lleva `key={item.id}`** (antes no hacía falta, había un
  solo panel): con tres paneles reusando las mismas posiciones al
  desplazarse, sin `key` por ítem React podía reutilizar la instancia de
  `ListCard`/`TrackerCard` de un panel para un ítem distinto al avanzar,
  arrastrando estado interno que no correspondía (p. ej. el `expanded` de
  `ListCard`, pensado para una lista, quedando pegado a otra). Con la key
  puesta, React en realidad hace algo mejor que remontar todo: como el
  panel "siguiente" ya estaba montado durante el arrastre, al confirmarse
  el cambio de índice React lo reconoce por key y lo reutiliza como el
  nuevo panel "actual" sin remontarlo — solo se monta contenido
  realmente nuevo y se desmonta el que quedó afuera de la ventana. (Bug
  de esta misma cuenta: con exactamente 2 ítems, "anterior" y "siguiente"
  son el mismo ítem — dos paneles con la misma key. Arreglado en #75.)
- **Un solo ítem (`count === 1`) no usa la ventana de 3 paneles**: se
  renderiza directo, sin `PanResponder` ni paneles de más — evita
  montar tres copias del mismo tracker/lista (cada una con su propio
  fetch) cuando no hay nada entre qué deslizar.

**Alternativas descartadas.**

- **Mantener `useHorizontalSwipe` y animar solo la transición final**
  (sin seguir el dedo durante el arrastre). No cumplía el pedido: "que se
  vea cuando se desliza" es justamente ver el movimiento *durante* el
  gesto, no solo una animación después de soltar.
- **`react-native-reanimated` / `react-native-gesture-handler`** para el
  arrastre. Mismo criterio que #33/#70: `PanResponder` + `Animated` (del
  core de RN) alcanzan para este caso, sin sumar una dependencia nativa
  nueva que obligue a rehacer el build de desarrollo.

**Consecuencias.** Montar tres `TrackerCard`/`ListCard` a la vez (cuando
hay más de un favorito) triplica sus fetches propios por cada uno —
aceptable a la escala de favoritos personales (pocos ítems), mismo
criterio de "bien a escala personal" que ya se aceptó en otros lados
(`useLists`, por ejemplo).

---

## 75. Fix: key duplicada con 2 favoritos, y listas siempre desplegadas en Favoritos *(fix + elección del usuario)*

**Contexto.** Dos cosas: (1) con exactamente **2** trackers o **2** listas
favoritas, React tiraba `Encountered two children with the same key` —
bug de #74: con solo 2 ítems, el panel "anterior" y el panel "siguiente"
del carrusel son matemáticamente el mismo ítem (`prevIndex === nextIndex`
cuando `count === 2`), y ambos usaban `key={item.id}`. (2) Se pidió que
las listas en Favoritos queden **siempre desplegadas** (sin triángulo
para colapsarlas), y que si tienen más de 15 entradas, la vista
desplegada scrollee en vez de crecer sin límite.

**Decisión.**

- **Fix de la key duplicada**: si `prevIndex === nextIndex` (solo pasa
  con `count === 2`), la key del panel "siguiente" se desambigua
  agregándole un sufijo (`` `${item.id}-next` ``) en vez de usar el id
  pelado. El panel "anterior" y el "actual" siguen con `key={item.id}`
  tal cual — siguen pudiendo reusarse sin remontar entre sí al cambiar de
  índice (que es el caso que sí importa visualmente); solo el panel
  "siguiente" (el que no se está mirando) pierde esa continuidad en este
  caso puntual de 2 ítems.
- **`ListCard` suma `alwaysExpanded?: boolean`** (opcional, default
  `false`; sin la prop, `ListsScreen` sigue exactamente igual que antes).
  Con `alwaysExpanded`, la vista desplegada se muestra siempre
  (`isExpanded = alwaysExpanded || expanded`) y **no se renderiza el
  triángulo** ▸/▾: no hay nada que colapsar, así que no tiene sentido un
  botón para hacerlo. El botón de pin (`showPin`/`onTogglePin`) se deja
  **sin tocar** — se consultó explícitamente y se eligió no borrarlo
  aunque, con las listas siempre desplegadas, ya no cambia nada visible
  en Favoritos; queda por si se reutiliza en otra pantalla más adelante.
  `FavoritesScreen` pasa `alwaysExpanded` además del `showPin` que ya
  tenía.
- **Más de 15 entradas → `ScrollView` con `maxHeight: 480` en vez de una
  lista que crece sin límite** (`MAX_VISIBLE_ENTRIES = 15`, constante del
  componente). Con 15 o menos, se sigue mapeando directo como antes (sin
  el costo de un `ScrollView` cuando no hace falta). `nestedScrollEnabled`
  porque esta lista vive anidada dentro del `ScrollView` de
  `FavoritesScreen` y, a su vez, dentro del `Animated.View` con
  `PanResponder` de `FavoritesCarousel` — el gesto de scroll vertical no
  compite con el del carrusel porque este último solo reclama arrastres
  claramente horizontales (mismo principio ya usado en toda la app, de
  #33).
- Se extrajo `renderEntryRow` (antes el `TouchableOpacity` de cada
  entrada estaba repetido inline) porque ahora hay dos lugares que lo
  necesitan: la lista directa y el contenido del `ScrollView`.

**Alternativas descartadas.**

- **Borrar `pinnedExpanded`/`PinButton`/`SetListPinnedExpanded`** al
  quedar sin efecto visible en Favoritos. Se consultó explícitamente;
  el usuario eligió dejarlo en el código tal cual, sin usarlo desde
  ningún lado nuevo.
- **Un solo panel en vez de 3 cuando `count === 2`** (ya que "anterior" y
  "siguiente" son el mismo ítem). Se descartó por simplicidad: la
  desambiguación de key alcanza, y mantener la estructura de 3 paneles
  pareja para todos los `count >= 2` evita un caso especial de layout.

**Consecuencias.** Ninguna relevante: el fix de la key es invisible para
el usuario, y las listas en Favoritos ahora siempre muestran sus
entradas (sin paso intermedio de "tocar para desplegar").

---

## 76. Favoritos: más espacio entre cards, todas del mismo alto, y se sacó el título de los carruseles *(elección del usuario)*

**Contexto.** Tres ajustes a Favoritos: (1) más espacio entre las cards
apiladas; (2) que todas las cards queden del **mismo alto**, rellenando
con el propio fondo (blanco/card) las que sean más cortas en vez de
dejarlas con distinto tamaño; (3) sacar el título "TRACKERS"/"LISTAS" que
`FavoritesCarousel` (#72) mostraba arriba de cada carrusel, dejando solo
el agrupamiento (las flechas `‹ N/M ›`, sin texto). (Nota: el punto (2) se
entendió mal la primera vez — igualaba el alto de **todas** las cards de
Favoritos entre sí; se corrigió en #77 para que sea por grupo, no
general.)

**Decisión.**

- **`gap` de `FavoritesScreen` pasa de 12 a 22** — más separación entre
  finanzas/mood/gimnasio/trackers/listas.
- **Se sacó el título de `FavoritesCarousel`**: la prop `title` se borró
  de la interfaz (y de los dos llamados en `FavoritesScreen`) — ya no
  hacía falta en ningún otro lado. El encabezado del carrusel ahora solo
  tiene las flechas `‹ N/M ›` (alineadas a la derecha, antes competían
  por espacio con el título vía `space-between`); si hay un solo ítem, no
  se renderiza encabezado en absoluto (nada que mostrar).
- **Alto igualado con medición + `minHeight`, no con un valor fijo
  inventado**: `TrackerCard` y `ListCard` suman una prop
  `style?: StyleProp<ViewStyle>` que se mergea en su `View` raíz
  (`[styles.card, style]`) — así quien las usa puede empujarles un
  `minHeight` desde afuera sin que el componente sepa nada de "igualar
  alto". *(Esta primera versión también se lo agregó a
  `FinanceSummaryCard`/`MoodTrackerCard`/`GymTodayCard` y medía el máximo
  entre **todas** las cards de Favoritos a la vez — eso se revirtió en
  #77: ver esa entrada para el diseño final, por grupo.)*

**Alternativas descartadas.**

- **Un alto fijo en píxeles, estimado a mano.** Cualquier número fijo se
  desactualiza en cuanto cambia el contenido de una card (un tracker con
  más opciones, una lista con más entradas visibles, etc.); medir de
  verdad con `onLayout` se ajusta solo.
- **Envolver cada card en un contenedor externo con su propio fondo**, en
  vez de pasarle `minHeight` a la card real. Hubiera generado una card
  dentro de otra (doble fondo, borde solo alrededor del contenido
  original) — visualmente partido en dos en vez de una sola caja pareja.

**Consecuencias.** Las cards tardan un render extra (natural → medir →
reaplicar `minHeight`) antes de quedar todas igualadas; en la práctica no
se nota porque pasa antes de que termine de cargar la pantalla.

---

## 77. Fix: el alto igualado era entre todos los favoritos, tenía que ser por grupo *(fix)*

**Contexto.** #76 igualaba el alto de **todas** las cards de Favoritos
entre sí (finanzas, mood, gimnasio, el tracker actual del carrusel, la
lista actual del carrusel) contra la más alta de **todo el conjunto**. Se
corrigió: el relleno tiene que ser contra la más alta **de su propio
grupo** — el carrusel de trackers se iguala contra el tracker favorito
más alto (no contra una lista ni contra el cuadro de gimnasio), y el
carrusel de listas contra la lista favorita más alta. Finanzas, mood y
gimnasio son grupos de un solo ítem cada uno, así que no hay nada contra
qué igualarlos — quedan en su alto natural.

**Decisión.**

- **La medición y el `minHeight` se movieron de `FavoritesScreen` a
  `FavoritesCarousel`**: cada instancia del carrusel (una para trackers,
  otra para listas) mide el alto de **sus propios** ítems nomás —
  `maxItemHeight`, con el mismo patrón de #76 (`onLayout` por ítem,
  `Math.max` que nunca decrece, reinicio si cambia el conjunto de ítems
  de *ese* carrusel — ahora comparando `items.map(i => i.id).join('|')`,
  no las claves de todas las cards de Favoritos).
- **`renderItem` pasa a recibir el `minHeight` como segundo argumento**
  (`(item: T, minHeight: number) => ReactNode`) en vez de que
  `FavoritesScreen` se lo inyecte desde afuera — el carrusel calcula su
  propio máximo y se lo entrega a quien arma cada `TrackerCard`/`ListCard`,
  que lo aplica con la prop `style` (de #76) tal cual.
- **Se sacó la prop `style` de `FinanceSummaryCard`, `MoodTrackerCard` y
  `GymTodayCard`**: con el alto por grupo, esas tres cards (grupos de 1)
  no tienen contra qué igualarse, así que la prop quedaba sin ningún
  llamador — se borró en vez de dejarla sin usar. `TrackerCard` y
  `ListCard` la conservan, porque sí la sigue usando el carrusel.
- **`FavoritesScreen` vuelve a renderizar finanzas/mood/gimnasio
  directo**, sin el `View` envolvente con `onLayout` que tenían en #76
  (ya no hace falta medirlas).

**Alternativas descartadas.**

- **Igualar por "tipo de card" pero calculado afuera, en `FavoritesScreen`**
  (dos máximos en vez de uno: uno para trackers, otro para listas). Es
  estrictamente más código que dejar que cada `FavoritesCarousel` mida lo
  suyo — el carrusel ya tiene los `items` de ese grupo nomás, no hace
  falta que el padre vuelva a separarlos por tipo.

**Consecuencias.** Ninguna relevante — es una corrección de alcance sobre
#76, no cambia nada del resto de la interacción (swipe circular, flechas,
etc.). *(Nota: en #78 se sacó el relleno por completo — ni global ni por
grupo — a pedido explícito del usuario; ver esa entrada para el diseño
final.)*

---

## 78. Carrusel sin relleno: cada ítem en su tamaño natural, y lo de abajo se acomoda solo *(elección del usuario)*

**Contexto.** Se pidió deshacer el relleno de #76/#77 por completo: cada
tracker/lista tiene que verse en su **tamaño natural**, sin estirarlo para
igualarlo a ningún otro. Como consecuencia, si al deslizar aparece un
ítem más alto o más bajo que el anterior, lo que sigue debajo en
Favoritos (el resto de las cards apiladas) tiene que subir o bajar para
acomodarse — sin eso, un ítem más chico que su vecino (montado al costado
para la animación de deslizar) dejaba ver el borde gris de abajo del
vecino más alto asomando debajo de la card actual (el síntoma de "bordes
grises abajo del carrusel de trackers"). También se pidió más separación
entre el encabezado `‹ N/M ›` y la card dentro de cada carrusel.

**Decisión.**

- **Se sacó el relleno por completo**: `TrackerCard` y `ListCard`
  vuelven a no tener prop `style` (la agregaron #76/#77, ya sin ningún
  llamador). `renderItem` vuelve a su firma original,
  `(item: T) => ReactNode`, sin el segundo argumento de alto.
- **La causa real de los "bordes grises"**: con los 3 paneles (anterior/
  actual/siguiente) montados a la vez en una fila (`flexDirection: 'row'`)
  para la animación de deslizar, el alto de esa fila sale del panel **más
  alto de los tres** aunque los otros dos estén tapados — así que si el
  vecino de al lado era más alto que el actual, su borde de abajo
  asomaba por debajo de la card que se estaba mirando. La solución no es
  "igualar todos los paneles" (eso es el relleno que se pidió sacar): es
  **recortar el carrusel al alto del panel actual nomás**.
- **`FavoritesCarousel` mide el alto de cada ítem por separado** (un
  `Record<string, number>` por `id`, no un máximo global ni por grupo) y
  le pone al contenedor (`viewport`, que ya tenía `overflow: 'hidden'`)
  un `height` explícito igual al alto del ítem **actual** — los paneles
  vecinos, que siguen montados de costado para poder deslizar, quedan
  recortados por ese `overflow: 'hidden'` en vez de estirar el
  contenedor. Como cada `id` guarda su propio alto (no un máximo que
  nunca decrece), no hace falta ningún reinicio al cambiar el conjunto de
  ítems — si el contenido de un ítem cambia, su `onLayout` vuelve a
  disparar y el valor se actualiza solo.
- **`LayoutAnimation.configureNext()` justo antes de cambiar de ítem**
  (en el mismo lugar donde ya cambiaba el índice, al terminar la
  animación de deslizar): así, cuando el alto del carrusel cambia porque
  el ítem actual es más alto o más bajo que el anterior, React Native
  anima esa transición de layout — lo que sigue debajo en Favoritos sube
  o baja con una animación en vez de saltar de golpe. En Android hace
  falta habilitarlo una vez con
  `UIManager.setLayoutAnimationEnabledExperimental(true)` (con chequeo de
  que exista, por si la Nueva Arquitectura ya no lo necesita o no lo
  expone).
- **Más separación dentro de cada carrusel**: el `gap` entre el
  encabezado `‹ N/M ›` y la card pasó de 8 a 16. *(Nota: en #79 esto se
  reemplazó por completo — el contador deja de tener una fila propia y
  pasa a flotar en el espacio entre cards, ver esa entrada.)*

**Alternativas descartadas.**

- **Interpolar el alto en vivo durante el arrastre** (que el carrusel ya
  vaya cambiando de alto mientras se desliza, no solo al soltar). Mucho
  más complejo (requeriría un `Animated.Value` de alto atado al progreso
  del gesto) para una mejora que solo se nota en el instante del
  arrastre; el salto de alto al **soltar** (ya animado con
  `LayoutAnimation`) cubre el pedido sin esa complejidad.

**Consecuencias.** Durante el arrastre, si el panel vecino es más alto
que el actual, su contenido de más abajo queda recortado mientras se
desliza (no se ve completo hasta que termina la transición y el alto se
actualiza) — es el costo directo de no rellenar: el contenedor se ajusta
recién cuando ese ítem pasa a ser el actual.

---

## 79. Favoritos: "Ordenar" a la altura del saludo, swipe fuera de los carruseles, contador flotando en el espacio entre cards, transición más suave y fix de la sombra cortada *(elección del usuario + fix)*

**Contexto.** Cinco ajustes a Favoritos: (1) que "Ordenar" quede a la
misma altura que el saludo "Hola {nombre}!", no debajo; (2) que deslizar
en cualquier parte de la pantalla que **no** sea un carrusel navegue a
"Rutina diaria" — #73 había sacado ese swipe de pantalla entera al
convertir "Rutina diaria" en pestaña de menú, pero se pidió de vuelta,
acotado; (3) que el espacio entre una card suelta y un carrusel sea
igual al espacio entre dos cards sueltas, poniendo el contador `‹ N/M ›`
**en ese mismo espacio** en vez de sumar uno propio; (4) que la
transición entre ítems del carrusel sea más suave; (5) en el carrusel de
trackers se veían líneas grises y un margen oscuro de más, cortados por
debajo — la sombra de `TrackerCard` quedando recortada por el
`overflow: 'hidden'` del carrusel (de #78).

**Decisión.**

- **"Ordenar" al lado del saludo**: `FavoritesScreen` vuelve a tener una
  fila (`headerRow`, como antes de que se sacara el link de "Rutina
  Diaria ›" en #73) con el saludo y "Ordenar" en los extremos
  (`justifyContent: 'space-between'`), arriba del subtítulo "Tus
  favoritos" — ya no es una fila propia debajo, alineada a la derecha.
- **Swipe de vuelta, acotado a "fuera de los carruseles"**: `FavoritesScreen`
  vuelve a envolver todo en `useHorizontalSwipe` (`onSwipeLeft` → navegar
  a `DailyRoutines`, igual que antes de #73). No hace falta coordinarlo a
  mano con el swipe de `FavoritesCarousel`: el sistema de responders de
  React Native le da el gesto al `PanResponder` más específico donde
  arranca el toque — si arranca sobre una card de un carrusel, gana el
  carrusel (cambia de ítem); si arranca en cualquier otro lado de la
  pantalla, gana este swipe de pantalla (mismo principio ya usado varias
  veces en la app, de #62). (Nota: en la práctica esto no se arbitraba
  así — ver #81.)
- **El contador deja de tener fila propia**: se sacó el `gap` interno de
  `FavoritesCarousel` (el de #78) y el contador pasa a ser un overlay
  **absolutamente posicionado**, anclado arriba a la derecha del
  carrusel, con `top: -FAVORITES_CARD_GAP` y `height: FAVORITES_CARD_GAP`
  (centrado adentro con `justifyContent: 'center'`) — así ocupa
  exactamente el espacio que ya separaba esta card de la anterior
  (`FAVORITES_CARD_GAP`, nueva constante exportada de
  `FavoritesCarousel.tsx`, **22**, el mismo valor que usa
  `FavoritesScreen` para el `gap` entre cards) en vez de agregar una
  fila con su propio espacio. Al no agregar altura propia, el espacio
  antes de un carrusel queda igual al que hay entre dos cards sueltas.
- **Transición más suave**: la animación de deslizar pasa de 220ms
  lineal-ish a 320ms con `Easing.out(Easing.cubic)` (desacelera al
  llegar, en vez de la curva por defecto de `Animated.timing`).
- **Fix de la sombra cortada**: `FavoritesCarousel` suma una prop
  `extraHeight?: number` (por defecto 0) que se le suma al `height` del
  `viewport` además del alto del ítem actual — le da margen a la sombra
  de la card para que el `overflow: 'hidden'` no la corte de golpe (lo
  que se veía como una línea/margen gris). `FavoritesScreen` le pasa
  `extraHeight={16}` solo al carrusel de **trackers** (`TrackerCard`
  tiene sombra — `shadowRadius: 12`, `elevation: 2`); el de listas no lo
  necesita (`ListCard` no tiene sombra, y agregarlo ahí hubiera dejado un
  hueco vacío sin motivo, rompiendo el pedido (3) de espacio exacto).

**Alternativas descartadas.**

- **Sacarle la sombra a `TrackerCard`** en vez de darle margen al
  recorte. `TrackerCard` se usa también en la pestaña Trackers (fuera de
  cualquier carrusel), donde la sombra sí se ve bien; sacarla ahí para
  arreglar un problema solo de Favoritos hubiera sido un cambio visual
  no pedido en otra pantalla.
- **Coordinar a mano el swipe de pantalla con el del carrusel** (por
  ejemplo, deshabilitar el de pantalla mientras el dedo está sobre un
  carrusel). No hace falta: el sistema de responders de RN ya resuelve
  esto solo según dónde arranca el gesto, como ya se documentó en #62.
  (Nota: esto resultó ser falso — ver #81.)

**Consecuencias.** `FAVORITES_CARD_GAP` queda duplicado conceptualmente
entre el `gap` de `FavoritesScreen.content` y el `top`/`height` del
overlay en `FavoritesCarousel` — se resolvió importando la misma
constante en los dos lugares en vez de dos números sueltos, pero si se
cambia el espaciado de Favoritos hay que tocar ese valor en
`FavoritesCarousel.tsx` (de donde se exporta), no en `FavoritesScreen.tsx`.

---

## 80. Fix de dependencias desalineadas, limpieza del no-op de `LayoutAnimation` y swipe-derecha de Rutina diaria a Favoritos *(fix + elección del usuario)*

**Contexto.** Tres problemas reportados juntos: (1) la consola mostraba
`WARN setLayoutAnimationEnabledExperimental is currently a no-op in the
New Architecture` — la llamada de setup que #79 (vía un fix anterior)
había dejado protegida con try/catch por las dudas, ahora confirmada
como ruido inofensivo y no una causa de crash; (2) `ERROR [Error:
Cannot find native module 'ExpoTopicSubscriptionModule']`, sin ningún
uso directo de ese módulo en el código (`core/notifications/notifications.ts`
solo importa `expo-notifications` de forma perezosa); (3) la
especificación completa de swipes de la app quedó incompleta: en
Rutina diaria, deslizar hacia la derecha en cualquier lugar que no sea
el calendario debía volver a Favoritos, simétrico al swipe
izquierda→Rutina diaria de Favoritos (#79) y al swipe de período del
calendario (#62) — ese tercer gesto nunca se había agregado.

**Decisión.**

- **Dependencias**: `npx expo install --check` encontró a `expo`,
  `expo-file-system`, `expo-notifications`, `expo-sharing`,
  `expo-updates` y `react-native` desalineados con lo que pide el SDK
  58 instalado — ese desajuste entre la versión de `expo-notifications`
  y el set de módulos nativos que trae Expo Go es la causa más probable
  de `ExpoTopicSubscriptionModule` no encontrado. `npx expo install
  <paquete>@<versión>` falló en este entorno con `npm error code
  EALLOWSCRIPTS` (`--allow-scripts is not allowed in project-scoped
  installs`); se instaló en cambio directo con `npm install
  expo@58.0.21 expo-file-system@58.0.13 expo-notifications@58.1.7
  expo-sharing@58.0.21 expo-updates@58.0.19 react-native@0.88.1`, y
  luego se corrigieron a mano los prefijos `^` que `npm install` deja
  por defecto de vuelta a `~` (convención de los sub-paquetes `expo-*`
  en este proyecto) para `expo-file-system`, `expo-notifications`,
  `expo-sharing` y `expo-updates`. `npx expo install --check` confirma
  "Dependencies are up to date" después.
- **Limpieza del no-op**: se sacó por completo el bloque de
  `UIManager.setLayoutAnimationEnabledExperimental(true)` (y los
  imports de `UIManager`/`Platform` que solo servían para eso) de
  `FavoritesCarousel.tsx` — en la Nueva Arquitectura no hace nada, así
  que protegerlo con try/catch solo evitaba un warning con otro
  warning. La llamada a `LayoutAnimation.configureNext(...)` en sí
  (la que sí hace algo, acomodando lo que sigue debajo cuando un ítem
  cambia de alto) queda intacta.
- **Swipe derecha en Rutina diaria**: `DailyRoutinesScreen` ahora
  también usa `useHorizontalSwipe` (`onSwipeRight` → navegar a
  `Favorites`; `onSwipeLeft` sin acción, no hay a dónde ir desde la
  última pantalla), envolviendo el `ScrollView` en un `View` con ese
  handler. El swipe de período de `RoutineTrackerCalendar` (#62) queda
  anidado adentro sin tocarlo: mismo principio de resolución de
  `PanResponder`s por especificidad ya usado en #62 y #79 — si el
  gesto arranca sobre el calendario, se lo lleva el calendario; si
  arranca en cualquier otro lado de la pantalla, se lo lleva este
  swipe nuevo. Con esto la especificación completa de swipes queda:
  carrusel de Favoritos cambia de ítem; fuera de los carruseles en
  Favoritos, swipe izquierda abre Rutina diaria; calendario de Rutina
  diaria cambia de período; fuera del calendario en Rutina diaria,
  swipe derecha vuelve a Favoritos.

**Alternativas descartadas.**

- **Dejar el try/catch** alrededor de `setLayoutAnimationEnabledExperimental`
  en vez de sacarlo. No tiene sentido mantener código que no hace nada
  en la Nueva Arquitectura (que es la única que usa este proyecto) solo
  para no "perder" una línea; sacarlo es más simple y elimina el warning
  de raíz.
- **Investigar un import directo de `expo-notifications` como causa**
  del error de módulo nativo. Se descartó tras grepear el código: el
  único uso es el wrapper perezoso en `core/notifications/notifications.ts`
  y la entrada en `app.json`; el desajuste de versiones explicaba mejor
  el síntoma (y `expo install --check` lo confirmó directamente).

**Consecuencias.** Ninguna nueva — `npx tsc --noEmit` y `npx expo
export --platform android --output-dir dist-check` (seguido de borrar
esa carpeta) corrieron limpios después de los tres cambios.

---

## 81. Fix: los swipes anidados no se arbitraban bien — se reemplazó `PanResponder` por `react-native-gesture-handler` *(fix)*

**Contexto.** Se reportó que ni el swipe de los ítems del carrusel de
Favoritos ni el swipe de período del calendario de Rutina diaria
funcionaban. La hipótesis de #62/#72/#79/#80 — que el sistema de
responders de React Native le da el gesto al `PanResponder` **más
específico** de dónde arranca el toque, sin necesidad de coordinar nada
a mano — resultó falsa en la práctica: el swipe de pantalla completa
(más externo) se quedaba con el gesto aunque arrancara sobre un
carrusel o un calendario, así que el interno nunca llegaba a activarse.
Esto es un problema conocido de `PanResponder` anidado en React Native,
agravado en la Nueva Arquitectura (Fabric, la única que corre esta app
desde SDK 58): la negociación de responders no es fiable para este
patrón, y la alternativa documentada por la comunidad es
`react-native-gesture-handler`, que sí tiene una forma explícita de
declarar prioridad entre gestos anidados.

**Decisión.**

- **Nueva dependencia**: `react-native-gesture-handler` (`~3.3.0`, la
  versión que `expo install --check` marca compatible con el SDK 58
  instalado) — ya viene incluida en Expo Go para este SDK, así que no
  hace falta un development build para probarla. Esto **revierte**,
  solo para este subsistema de gestos, la preferencia de #33/#70/#74 de
  no agregar dependencias nativas nuevas: se consultó al usuario
  explícitamente antes de instalarla (la alternativa sin dependencias
  nuevas era re-escribir la arbitración a mano, midiendo los límites de
  cada carrusel/calendario) y eligió agregarla.
- **Toda la app queda envuelta en `GestureHandlerRootView`** (`App.tsx`,
  lo más cerca posible de la raíz, como pide la librería).
- **`useHorizontalSwipe` deja de devolver `panHandlers`** (de un
  `PanResponder`) **y pasa a devolver un `PanGesture`** (de
  `usePanGesture`), para usar con `<GestureDetector gesture={...}>` en
  vez de `<View {...swipe}>`. Los umbrales quedan iguales en espíritu:
  `activeOffsetX: [-18, 18]` (antes `CLAIM_THRESHOLD`) y
  `failOffsetY: [-10, 10]` (antes el ratio 1.8), con el commit
  (`MIN_DISTANCE = 45`) decidido en `onDeactivate` contra
  `translationX`. Suma un parámetro opcional **`requireToFail`**: el
  gesto (o los gestos) que tienen que fallar antes de que éste se
  active — la pieza que faltaba para que el anidado funcione de verdad.
- **El gesto de cada carrusel/calendario se crea en la pantalla, no en
  el componente hijo**, porque `requireToFail` necesita el objeto
  `PanGesture` del hijo en el momento en que se crea el del padre, y los
  hooks del hijo todavía no corrieron en ese punto del render. Por eso:
  - `FavoritesCarousel.tsx` exporta `useCarouselSwipe(itemCount)`, que
    devuelve `{ gesture, translateX, index, go, setWidth }` — toda la
    lógica de arrastre que antes vivía adentro del componente
    (`completeTransition`, `cancelDrag`, el índice, el `Animated.Value`)
    se movió a este hook. `FavoritesScreen` lo llama una vez para
    trackers y otra para listas (siempre, sean o no la cantidad de
    ítems 0 — son hooks, no pueden ser condicionales) y le pasa el
    resultado a `FavoritesCarousel` por la prop `swipe`; el propio
    `FavoritesCarousel` queda como componente "tonto" que solo mide
    layout (anchos, altos por ítem) y renderiza con lo que le pasaron.
  - `RoutineTrackerCalendar` recibe el gesto de período por la prop
    `swipeGesture` en vez de crearlo — `DailyRoutinesScreen` lo crea con
    `useHorizontalSwipe` y se lo pasa, igual que ya le pasaba `period`
    (el período ya vivía en el view-model del padre; el gesto ahora
    sigue el mismo patrón).
  - Con eso, `FavoritesScreen.swipe` y `DailyRoutinesScreen.swipe` (los
    de pantalla completa) declaran `requireToFail` apuntando a esos
    gestos internos.
- **Los otros cuatro usos de `useHorizontalSwipe`** (`EventsScreen`,
  `MoodProgressScreen`, `TrackerProgressScreen` — swipe de período, sin
  anidado — y los dos de Favoritos/Rutina diaria de arriba) se
  actualizaron del patrón `<View {...swipe}>` a
  `<GestureDetector gesture={swipe}><View>...</View></GestureDetector>`;
  no necesitaban `requireToFail` porque no tienen otro gesto adentro.

**Alternativas descartadas.**

- **Arbitrar a mano con un solo `PanResponder` por pantalla**, midiendo
  los límites del carrusel/calendario (`onLayout`) y decidiendo en el
  gesto de inicio si el toque arrancó adentro o afuera. Sin dependencias
  nuevas, pero mucho más código y casos borde (medir después de scroll,
  después de reflow por `LayoutAnimation`, etc.) para resolver algo que
  `react-native-gesture-handler` ya resuelve de forma declarativa y
  probada. Se le presentó la opción al usuario junto con la de agregar
  la librería; eligió la librería.
- **Seguir con `PanResponder` pero sin anidar** (por ejemplo, un solo
  gesto de pantalla que delegue al carrusel/calendario mediante un ref
  imperativo). Mismo problema de fondo que la alternativa anterior:
  es la reimplementación a mano de lo que ya hace `requireToFail`.

**Consecuencias.** La lógica de arrastre del carrusel (antes encerrada
en `FavoritesCarousel.tsx`) ahora está repartida entre el hook
`useCarouselSwipe` (en el mismo archivo, exportado) y `FavoritesScreen`
(que lo invoca); hay que tenerlo en cuenta si se agrega un tercer tipo
de carrusel a Favoritos — necesita su propio `useCarouselSwipe(...)` en
la pantalla, igual que trackers y listas. `npx tsc --noEmit` y `npx expo
export --platform android --output-dir dist-check` corrieron limpios.

---

## 82. Fix: flash del ítem anterior al cambiar de ítem en el carrusel de Favoritos *(fix)*

**Contexto.** Al terminar la transición de un ítem del carrusel al
siguiente/anterior, se veía por un instante el ítem **anterior** antes
de asentarse en el nuevo. La pregunta de si "todos los ítems de
Favoritos quedan separados por el mismo espacio, y el que sigue debajo
de un carrusel sube/baja para acomodarse" (ya resuelto por #78/#79 con
`LayoutAnimation` + el `gap` del contenedor) seguía cumpliéndose en los
hechos — no había una regresión ahí —, pero el flash hacía que la
transición se viera rota de punta a punta.

**Decisión.** `completeTransition` (adentro de `useCarouselSwipe`,
`FavoritesCarousel.tsx`) reseteaba `translateX` a 0 **antes** de llamar
a `setIndex`. El problema: `translateX.setValue(0)` es un cambio nativo
que toma efecto en el frame siguiente, pero `setIndex` dispara un
re-render de React que tarda un tick más en llegar a pantalla — en ese
hueco, el carrusel mostraba el ítem **viejo** en la posición de reposo
(porque `translateX` ya estaba en 0 pero el índice todavía no había
cambiado). Se movió el reseteo de `translateX` a un `useLayoutEffect`
atado a `index`: así se aplica en el mismo paso visual que el re-render
con el índice nuevo, nunca por separado. La animación de arrastre en sí
(`Animated.timing` hasta el ancho completo) y el orden de
`LayoutAnimation.configureNext()` antes de `setIndex` quedan iguales.

**Alternativas descartadas.**

- **Resetear `translateX` directamente en el callback de `setIndex`**
  (como un segundo `setState` o con `InteractionManager`). Innecesario:
  `useLayoutEffect` ya es la herramienta de React pensada exactamente
  para esto (sincronizar un efecto imperativo con un cambio de estado
  antes de que se pinte), sin inventar un mecanismo propio.

**Consecuencias.** Ninguna — es un cambio de orden/timing puro, sin
tocar la geometría del carrusel. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 83. Fix: gap enorme entre dos carruseles seguidos en Favoritos, y seguir reduciendo el flash *(fix)*

**Contexto.** Se reportó un espacio mucho más grande de lo normal entre
el carrusel de trackers y el de listas (cuando los dos están presentes,
uno seguido del otro) — rompía el pedido de #78/#79 de que todas las
cards de Favoritos queden separadas por el mismo espacio. También se
reportó que el flash del ítem anterior (#82) seguía pasando, aunque más
chico.

**Decisión.**

- **Causa del gap**: `track` (la fila con los 3 paneles prev/current/next
  del carrusel) no fijaba `alignItems`, así que usaba el default de
  Yoga para una fila: `stretch` — estira los hijos a la altura del más
  alto de los tres. Si alguno de los paneles **no visibles** (prev o
  next) era bastante más alto que el panel actual, ese alto de más se
  colaba en el cálculo del recorte (`viewport`) en ciertos momentos
  (por ejemplo, el primer render de un alto nuevo, antes de que el
  `height` explícito del recorte tomara efecto), dejando un hueco
  transparente debajo de la card visible, **dentro de la caja del
  carrusel** — no se veía como "contenido cortado", se veía como
  espacio de más antes del siguiente carrusel. Se fijó `alignItems:
  'flex-start'` en `track`: cada panel mide su propio alto nomás, nunca
  se estira al de un vecino que ni se ve.
- **Se reemplazó `LayoutAnimation` por un `Animated.Value` propio** para
  el alto del recorte (`viewportHeightAnim`, en `FavoritesCarousel`):
  en vez de depender de la detección automática de `LayoutAnimation`
  (que además de la causa de arriba, es conocida por no ser confiable
  en Android con la Nueva Arquitectura — puede dejar un alto
  intermedio trabado si una animación se interrumpe por la siguiente
  antes de asentarse), ahora el alto del recorte se anima explícitamente
  con `Animated.timing` (`useNativeDriver: false`, porque `height` no
  lo soporta) cada vez que cambia el alto del ítem actual — mismo
  patrón ya usado para el `translateX` horizontal, pero para el alto.
  La primera vez que se mide un carrusel, el alto se fija de una (sin
  animar desde 0).
- **Flash, reducido más pero sin garantía de estar 100% eliminado**: al
  sacar el snap instantáneo de alto (antes ocurría en el mismo render
  que el cambio de ítem, vía `LayoutAnimation`) y reemplazarlo por una
  transición suave, se achica una fuente más de salto visual junto al
  cambio de ítem. Pero el flash en sí (#82) depende de que un
  `Animated.Value` con `useNativeDriver: true` (que cambia en el hilo
  nativo) y un cambio de estado de React (que cambia en el hilo de JS,
  vía Fabric) aterricen en el mismo frame — `useLayoutEffect` ayuda
  pero no lo garantiza al 100% bajo la Nueva Arquitectura con render
  concurrente (React 19). Si sigue viéndose, el próximo paso sería
  dejar de armar el carrusel a mano (3 paneles + reset de índice) y
  pasarlo a un `ScrollView` horizontal con `pagingEnabled` (de
  `react-native-gesture-handler`, que expone su propio `ScrollView`
  componible con `requireToFail` vía `useNativeGesture`) — un
  carrusel nativo no tiene este problema porque la posición visual
  **es** la fuente de verdad, no hay "reset" que sincronizar.

**Alternativas descartadas.**

- **Reescribir el carrusel ya mismo con `ScrollView` + `pagingEnabled`**
  para eliminar el flash de raíz. Es un cambio bastante más grande
  (hay que resolver el wrap circular y la medición de alto por ítem de
  nuevo); se prefirió primero agotar los fixes acotados (que además
  resuelven el bug del gap, confirmado) y confirmar con el usuario si
  el flash remanente sigue siendo molesto antes de encarar la reescritura.

**Consecuencias.** Queda pendiente confirmar si el flash remanente
desaparece con este cambio o si hace falta la reescritura a
`ScrollView` nativo mencionada arriba. `npx tsc --noEmit` y `npx expo
export --platform android --output-dir dist-check` corrieron limpios.

---

## 84. "Seguimiento de Rutina" pasa a ser de uso interno; Favoritos muestra la lista de tareas + % completado en su lugar *(elección del usuario)*

**Contexto.** Se pidió que el tracker "Seguimiento de Rutina" deje de
verse en cualquier lado que no sea la propia pantalla "Rutina diaria"
(donde pinta el calendario de seguimiento) — hasta ahora también
aparecía en la pestaña **Trackers** y en el carrusel de trackers de
Favoritos, como un tracker más, lo cual no tenía mucho sentido: es de
**solo lectura** (lo completa `SyncRoutineTracker` solo, no se carga a
mano) y mostrarlo junto a trackers reales invitaba a tocarlo como si
fuera uno. En su lugar, se pidió que Favoritos muestre la lista de
tareas de "Rutina diaria" con un indicador de cuánto se completó.

**Decisión.**

- **El tracker se excluye explícitamente por id**, sin importar su flag
  `favorite`, en los dos únicos lugares que antes lo mostraban:
  `useTrackersViewModel` (pestaña Trackers) y `useFavorites` (carrusel
  de trackers). De paso, `SyncRoutineTracker` ya no lo crea con
  `favorite: true` (quedó sin efecto en ningún lado, así que se puso en
  `false` para que el campo no mienta). También se excluye de
  `syncTrackerReminder` (`core/notifications/notifications.ts`): antes
  contaba como "tracker sin cargar" para el recordatorio de las 23:00
  aunque el usuario nunca lo carga a mano, lo que iba a generar avisos
  falsos.
- **Nueva card `DailyRoutineSummaryCard`** en Favoritos (reemplaza al
  tracker en esa posición): la lista de tareas de hoy, con checkbox —
  se tildan sin salir de Favoritos, mismo `setDailyTaskDone` que usa la
  pantalla "Rutina diaria" (y re-sincroniza el tracker interno después,
  igual que hace `useDailyRoutines.reload` — así el calendario de
  "Rutina diaria" no queda desactualizado si se tilda desde acá) — y un
  indicador de cuánto se completó (`X/Y` + barra de progreso simple,
  sin librería nueva). Si no hay tareas todavía, un mensaje + el mismo
  link de abajo ("Ver rutina diaria →") para ir a crear una.
- **Nuevo flag `dailyRoutineFavorite` en `UserProfile`** (default
  `true`, igual patrón que `financeFavorite`/`moodFavorite`/`gymFavorite`):
  la card tiene su propia estrella (`FavoriteStar`) para sacarla de
  Favoritos si no se la quiere ver. Se sumó a `UserProfilePatch`,
  `createUserProfile` y, importante, a `UserProfileDto`
  (`userProfileToDto`/`userProfileFromDto`) — sin tocar el DTO el flag
  no se iba a persistir entre reinicios de la app, quedaba siempre en
  el default.
- **Posición por defecto**: la card de Rutina diaria va **primera**
  (antes que finanzas/mood/gimnasio), el mismo lugar que antes ocupaba
  el tracker cuando estaba entre los favoritos — mismo criterio ("lo
  primero que se quiere ver al entrar"), ahora sin depender de que el
  tracker esté marcado favorito.
- **Trackers y Favoritos simplificados**: con el tracker afuera, se
  sacó toda la lógica de reordenarlo primero dentro del carrusel
  (`orderedTrackers`/`hasRoutineTracker` en `useFavorites`) y el
  redirect especial a "Rutina diaria" en el `onSeeProgress` de
  `TrackerCard` (`TrackersScreen` y `FavoritesScreen`) — ya no hace
  falta, el tracker nunca se renderiza en esos lugares.

**Alternativas descartadas.**

- **Dejar el tracker visible pero de solo lectura** (sin check-in) en
  Trackers/Favoritos, en vez de sacarlo del todo. No era lo que se
  pidió, y seguía siendo confuso tener un tracker que no se puede
  cargar mezclado con los que sí.
- **Un componente nuevo para la barra de progreso** (librería de
  gráficos). Dos `View` (pista + relleno con `width` en %) alcanzan
  para esto; no se agregó una dependencia nueva para un indicador tan
  simple.

**Consecuencias.** Un usuario que ya tenía el tracker real guardado con
`favorite: true` (de antes de este cambio) lo sigue teniendo así en el
storage — no se migró ese dato — pero no importa: el filtro por id lo
excluye igual, sin mirar el flag. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 85. Fix: líneas/bordes grises en `TrackerCard` dentro del carrusel de Favoritos *(fix)*

**Contexto.** Se reportó un borde/línea gris visible alrededor de
`TrackerCard` **solo** dentro del carrusel de trackers de Favoritos —
no pasaba con `ListCard` en el carrusel de listas, ni con `TrackerCard`
en la pestaña Trackers (fuera de cualquier carrusel). Esto venía de
antes (#78/#79 ya habían tocado un síntoma parecido) y seguía
apareciendo pese al `extraHeight`/`TRACKER_SHADOW_ALLOWANCE` agregado
en #79.

**Decisión.** La causa de fondo: `TrackerCard` tiene sombra
(`shadowColor`/`shadowOpacity`/`shadowRadius`/`shadowOffset` +
`elevation` para Android) y el carrusel **necesita** recortar
horizontalmente (`overflow: 'hidden'`, para esconder los paneles
vecinos mientras no se están mostrando) — esa combinación corta la
sombra de forma pareja en dos lados (donde hay más carrusel) y abrupta
en los otros, dejando un borde/línea con pinta de "sombra mal cortada"
en vez del degradé suave que se ve cuando la card está suelta (sin
nada recortándola). El `extraHeight` de #79 solo le daba margen
**vertical** al recorte — nunca pudo arreglar el recorte horizontal,
que es estructural al carrusel (siempre hace falta para tapar los
paneles vecinos). Se sacó la sombra de `TrackerCard` directamente
(`shadowColor`/`shadowOpacity`/`shadowRadius`/`shadowOffset`/`elevation`),
dejando solo el borde fino que ya tenía (`borderWidth: 1, borderColor:
'#eef0f2'`) — mismo tratamiento que ya usan `GymTodayCard` y
`FinanceSummaryCard` (borde, sin sombra). Con la sombra afuera, el
`extraHeight`/`TRACKER_SHADOW_ALLOWANCE` que la protegía del recorte
vertical ya no hacía falta — se sacó entero (la prop `extraHeight` de
`FavoritesCarousel`, el único lugar que la usaba).

**Alternativas descartadas.**

- **Agrandar el margen vertical** (`extraHeight`) para que alcance.
  No resuelve nada: el problema principal es el recorte **horizontal**
  (constante, no un margen que se pueda agrandar sin mostrar de
  vuelta los paneles vecinos).
- **Sacar la sombra solo de la variante usada en el carrusel** (una
  prop nueva en `TrackerCard`, p. ej. `elevated?: boolean`). Se
  descartó: `TrackerCard` ya se ve igual en la pestaña Trackers que en
  Favoritos salvo por esto, y mantener esa diferencia solo para
  conservar una sombra que de cualquier forma es sutil (`shadowOpacity:
  0.06`) no valía la complejidad de una variante nueva.

**Consecuencias.** `TrackerCard` se ve un poco más "plano" (sin sombra)
también en la pestaña Trackers, no solo en Favoritos — cambio menor,
en línea con el resto de las cards de Favoritos (ninguna otra tiene
sombra). `npx tsc --noEmit` y `npx expo export --platform android
--output-dir dist-check` corrieron limpios.

---

## 86. Estrella para volver a agregar "Rutina diaria" a Favoritos, al lado de su propio "Ordenar" *(elección del usuario)*

**Contexto.** De #84 en adelante, la única forma de sacar "Rutina
diaria" de Favoritos es la estrella de su propia card
(`DailyRoutineSummaryCard`) — pero una vez sacada, esa card ya no se
renderiza, así que esa estrella desaparece con ella. A diferencia de
trackers/listas (que tienen su propia pantalla — Trackers, una lista —
donde favoritear de nuevo) o de finanzas/mood/gimnasio (cuya estrella
vive en una pantalla aparte: Finanzas, Trackers, Gimnasio), "Rutina
diaria" no tenía ningún otro lugar con una estrella — quedaba sin forma
de volver a agregarla sin editar el storage a mano. Primer intento:
ponerla en el header de Favoritos, al lado de **ese** "Ordenar" — el
usuario pidió corregirlo a la pantalla "Rutina diaria", al lado de
**su propio** "Ordenar" (el de reordenar tareas), que es el patrón que
siguen las demás (estrella en la pantalla propia del ítem, no en
Favoritos).

**Decisión.** `useDailyRoutines` suma `favorite` (lee
`profile.dailyRoutineFavorite` en cada `reload`, junto con la sesión —
antes `reload` solo pedía la sesión) y `toggleFavorite` (actualiza el
perfil y recarga). `DailyRoutinesScreen` pone una `FavoriteStar` en
`summaryRow`, a la izquierda de su botón **"Ordenar"** — esa fila pasa
a renderizarse siempre (antes solo aparecía con `vm.total > 0`, ya que
sin tareas no había nada que mostrar ahí; ahora la estrella tiene que
verse igual aunque no haya tareas todavía, así que el texto "X/Y
tareas hechas hoy" queda vacío en ese caso en vez de ocultar toda la
fila).

**Alternativas descartadas.**

- **Estrella en el header de Favoritos** (intento anterior,
  revertido). Funcionaba, pero quedaba una estrella suelta sin
  relación visual directa con "Rutina diaria" — el usuario prefirió
  que siga el mismo patrón que el resto (estrella en la pantalla
  propia del ítem).

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 87. Tocar un ítem en to-do lists y Rutina diaria tilda/destilda; editar pasa a un lápiz aparte *(elección del usuario)*

**Contexto.** En to-do lists y en Rutina diaria, tocar la fila abría el
modal de edición (nombre/fecha/comentario/rating, o título/descripción)
y solo el checkbox, un blanco chico, tildaba/destildaba. Se pidió que
tocar la fila tilde/destilde directamente — es la acción que más se
usa en una to-do list — dándole toda la fila como blanco en vez de
depender del checkbox. Antes de tocar el código se le preguntó al
usuario cómo seguir editando una entrada una vez que tocar la fila ya
no abre el modal; eligió un ícono de lápiz en la fila.

**Decisión.**

- **Nuevo [`EditButton`](src/presentation/components/EditButton.tsx)**
  (ícono `Pencil` de `lucide-react-native`, mismo que ya usaba
  `DayEventsModal` para editar un evento) — reutilizable, mismo patrón
  que `InfoButton`/`PinButton`.
- **`ListEntryRow`** ([list](src/presentation/list/components/ListEntryRow.tsx)):
  para `isTodo`, la fila deja de ser un solo `TouchableOpacity` — pasa a
  ser un `View` con dos blancos **hermanos** (no anidados, mismo patrón
  que ya usa `DayEventsModal` para su lápiz, evita necesitar
  `stopPropagation`): el área principal (checkbox + nombre + rating),
  que tilda/destilda al tocar cualquier parte, y el `EditButton` aparte,
  que abre el modal de edición (antes disparado por `onPress` de toda la
  fila). El checkbox sigue ahí y sigue tildando igual — queda redundante
  con tocar el resto de la fila, pero no estorba. **Las listas normales
  (no to-do) quedan sin cambios**: tocar la fila sigue abriendo la
  edición, como siempre — no tienen concepto de "hecho" que tildar, así
  que no aplica el pedido.
- **`DailyRoutineTaskRow`** ([dailyRoutine](src/presentation/dailyRoutine/components/DailyRoutineTaskRow.tsx)):
  mismo cambio — siempre es una lista de tareas (no hay variante "no
  to-do" acá), así que el patrón de arriba se aplica sin condicional.
- **La card de Rutina diaria en Favoritos** (`DailyRoutineSummaryCard`)
  queda sin tocar: ahí la fila de cada tarea nunca abrió edición (es un
  resumen de solo lectura salvo el checkbox), así que no había nada que
  cambiar. (Nota: la vista desplegada de una lista en Favoritos —
  `ListCard` — sí tenía el mismo problema que `ListEntryRow`, solo que
  abriendo el modal de **info** en vez del de edición; se corrigió en
  #88. Nota 2: el pedido llegaba igual acá, aunque no hubiera modal con
  el que chocar — tocar la fila simplemente no hacía nada, igual de
  incómodo que depender del checkbox chico; se corrigió en #89.)

**Alternativas descartadas.** Las otras dos opciones ofrecidas al
usuario (mantener presionado para editar; sacar la edición de estas
pantallas del todo) — ver la pregunta hecha antes de implementar.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 88. Mismo tocar-para-tildar en la vista desplegada de una lista en Favoritos *(elección del usuario)*

**Contexto.** #87 cambió `ListEntryRow` (el detalle de una lista) para
que tocar una fila tilde/destilde en vez de abrir un modal. Se pidió
lo mismo para la **vista desplegada** de una to-do list dentro de
Favoritos (`ListCard`, el acordeón que se abre con el triángulo o que
queda siempre abierto con `alwaysExpanded`) — ahí tocar una fila
abría `ListEntryInfoModal` (de solo lectura: fecha/comentario/rating),
no el modal de edición, pero el problema de fondo era el mismo: el
checkbox era el único blanco que tildaba.

**Decisión.** `ListCard.renderEntryRow`, para `list.isTodo`, sigue el
mismo patrón que #87 dejó en `ListEntryRow`: dos blancos hermanos (no
anidados) — el área principal (checkbox + nombre) tilda/destilda al
tocar cualquier parte, y un `InfoButton` ("i") aparte abre
`ListEntryInfoModal`, mostrado solo si la entrada tiene algo que
mostrar (`hasInfo`: comentario, fecha o rating), igual que ya hace
`ListEntryRow`. Se usó `InfoButton` en vez de `EditButton` (el lápiz
de #87) porque acá la fila nunca abrió edición — abría una vista de
**solo lectura**; `EditButton` hubiera prometido algo que esta card no
hace (no se puede editar una entrada desde Favoritos, hay que entrar a
la lista). Las listas normales (no to-do) quedan sin cambios: tocar la
fila sigue abriendo `ListEntryInfoModal` directo, sin botón aparte —
no tienen "hecho" que tildar, así que no hay conflicto de blancos que
resolver.

**Alternativas descartadas.**

- **Usar `EditButton` acá también**, por consistencia visual con
  #87. Se descartó: hubiera sido un lápiz que no abre edición, lo que
  es confuso — `InfoButton` describe mejor lo que de verdad hace
  (`ListEntryInfoModal` es de solo lectura).

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 89. Mismo tocar-para-tildar en la preview de Rutina diaria en Favoritos *(elección del usuario)*

**Contexto.** Última pieza suelta de #87/#88: la propia card de "Rutina
diaria" en Favoritos (`DailyRoutineSummaryCard`) también mostraba cada
tarea en una fila donde tocarla no hacía nada — solo el checkbox
tildaba. A diferencia de `ListCard`, acá no hay modal (ni de edición ni
de info) con el que pisarse: cada fila es solo checkbox + título, sin
fecha/comentario/rating que mostrar.

**Decisión.** `renderTaskRow` pasa de `View` a `TouchableOpacity`, con
`onPress` llamando a `onToggleTask` — tocar cualquier parte de la fila
tilda/destilda, igual que el checkbox (que se deja, redundante pero
inofensivo, mismo criterio que #87/#88).

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 90. Selección múltiple con mantener presionado, para borrar varios ítems de una — listas (to-do y normales) y Rutina diaria *(elección del usuario)*

**Contexto.** Se pidió poder mantener presionado un ítem (en el detalle
de una lista, to-do o normal, y en "Rutina diaria") para seleccionarlo,
seguir seleccionando más tocando otros, y borrarlos todos juntos con un
ícono de tacho. No existía ningún patrón de `onLongPress` en la app
todavía.

**Decisión.**

- **Nuevo [`SelectionBar`](src/presentation/components/SelectionBar.tsx)**:
  reemplaza el encabezado normal de la lista de ítems mientras hay una
  selección activa — "N seleccionadas" en el medio, una "✕" a la
  izquierda para cancelar sin borrar, y un tacho (`Trash` de
  `lucide-react-native`) a la derecha para borrar (quien la usa
  confirma antes con `Alert.alert`, mismo patrón que ya usaba
  `confirmDeleteList`).
- **`useListDetail`** suma `selectedIds` (`Set<string>`), derivando
  `selectionMode` de si tiene algo adentro, y `startSelection` /
  `toggleSelected` / `clearSelection` / `deleteSelected` (este último
  dispara `deleteListEntry` para cada id en paralelo — no hay un
  caso de uso de borrado en lote, no hacía falta crear uno para esto).
  **`useDailyRoutines`** suma exactamente lo mismo, apuntando a
  `deleteDailyRoutineTask`. (Nota: "en paralelo" resultó ser un bug —
  se corrigió a secuencial en #91.)
- **`ListEntryRow`** y **`DailyRoutineTaskRow`** suman un tercer modo de
  render (antes del de to-do/normal): si `selectionMode` está activo,
  toda la fila es un solo blanco con un `Checkbox` mostrando
  seleccionado/no en vez del checkbox de "hecho" o el número/bullet —
  tocar selecciona, **mantener presionado cualquier fila** (en
  cualquiera de los tres modos: normal, to-do, ya seleccionando) llama
  a `onLongPress`, que en la pantalla arranca o agranda la selección.
  La selección es **el mismo concepto para to-do y listas normales** —
  no depende de `isTodo`, así que no hace falta un checkbox "de hecho"
  para poder seleccionar algo.
- **`ListDetailScreen`** y **`DailyRoutinesScreen`**: mientras
  `selectionMode` está activo, `SelectionBar` reemplaza el selector de
  orden / fila de resumen+estrella+Ordenar, y se esconden las acciones
  que no tienen sentido en el medio de una selección ("Borrar esta
  lista", "＋ Agregar tarea", el modo reordenar) para no superponer
  acciones destructivas o confusas.

**Alternativas descartadas.**

- **Un caso de uso de borrado en lote** (`DeleteListEntries`,
  `DeleteDailyRoutineTasks`) en vez de `Promise.all` sobre el existente
  de a uno. Para esta escala (listas personales, no cientos de ítems)
  no vale la complejidad extra; si hiciera falta optimizar borrado
  masivo más adelante, ahí sí se justificaría.

**Consecuencias.** Si se agrega selección múltiple a algún otro lugar
de la app (p. ej. las cards de Favoritos), conviene reusar
`SelectionBar` y el mismo patrón de `selectedIds`/`onLongPress` en vez
de inventar uno nuevo. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 91. Fix: borrar varios ítems seleccionados borraba solo uno *(fix)*

**Contexto.** Se reportó que, al seleccionar dos (o más) ítems y tocar
el tacho, solo se borraba uno. Causa: `deleteSelected` (#90) llamaba a
`deleteListEntry`/`deleteDailyRoutineTask` para cada id con
`Promise.all` — en **paralelo**. Las dos fuentes de datos locales
(`AsyncStorageListEntryLocalDataSource.remove`,
`DailyRoutineTaskLocalDataSource`'s equivalente) hacen
lectura-modificación-escritura sobre el **mismo blob** de AsyncStorage
(`readAll()` → modificar en memoria → `setItem` con todo de vuelta) —
no son operaciones atómicas. Con dos borrados en paralelo, ambos leen
el blob **antes** de que cualquiera de los dos escriba; el que termina
de escribir último persiste una versión armada a partir de ese blob
viejo, que todavía tiene la entrada que el otro borrado ya había
sacado — en los hechos, "revive" esa entrada y la deja puesta, como si
nunca se hubiera borrado.

**Decisión.** `deleteSelected` (en ambos viewmodels) pasa de
`Promise.all(ids.map(...))` a un `for...of` con `await` adentro — un
borrado a la vez, cada uno completando su ciclo lectura-modificación-
escritura (incluida la escritura) antes de que arranque el siguiente.
Sin tocar la capa de datos.

**Alternativas descartadas.**

- **Hacer atómico el borrado en la fuente de datos** (p. ej. un método
  nuevo `removeMany(listId, entryIds[])` que lea una vez, saque varias
  entradas del objeto en memoria, y escriba una vez). Es la solución
  más "correcta" en general (una sola lectura/escritura en vez de N),
  pero para esta escala (borrar unos pocos ítems seleccionados a mano)
  el costo de N escrituras secuenciales es imperceptible; se prefirió
  el fix más chico y acotado al bug reportado.

**Consecuencias.** Borrar muchos ítems seleccionados de una tarda un
poco más (N escrituras a AsyncStorage en vez de 1), imperceptible a
esta escala. Si en algún momento se permite seleccionar cientos de
ítems, ahí sí conviene la alternativa descartada. `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios.

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
