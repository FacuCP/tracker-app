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

## 92. Mood tracker más compacto; listas en Favoritos limitadas a 10 ítems antes de scrollear *(elección del usuario)*

**Contexto.** Dos pedidos de compactar Favoritos: (1) el mood tracker
ocupaba bastante, sobre todo sin registrar todavía (grilla de 9
colores + nota + descripción + botones); (2) las listas desplegadas en
Favoritos (`ListCard` con `alwaysExpanded`) scrolleaban recién pasadas
las 15 entradas, el mismo umbral que en la pestaña Listas — se pidió
bajarlo a 10 ahí.

**Decisión.**

- **`MoodTrackerCard`**: `padding` 18→14, `gap` 16→10, `kicker`
  11→10px, `date` 18→16px, `loader` 24→14 de margen. Afecta también a
  la pestaña Trackers (mismo componente, sin variante) — mismo criterio
  que sacarle la sombra a `TrackerCard` (#85): el cambio es una mejora
  neutral/positiva en los dos lugares, no hacía falta una prop
  `compact` para separar el caso de Favoritos.
- **`MoodEditor`** (compartido con el modal de edición del calendario,
  `MoodDayModal`): `gap`s generales 16→10/12→10, el textarea de
  descripción 60→44px de alto mínimo, botones un poco más chicos
  (`paddingVertical` 12→10). **No se tocó el tamaño de los círculos de
  color** (`MoodColorPicker`, 44px) ni el de los botones de guardar/
  borrar — son blancos táctiles, achicarlos más arriesgaba que
  cuesten más de tocar; solo se achicó el espacio **entre** elementos
  (`gap` de la grilla 12→8).
- **`MoodEntrySummary`** (vista de solo lectura, ya registrado hoy):
  mismo criterio, `gap` 14→10, preview 56→44px.
- **`ListCard`**: nueva constante `MAX_VISIBLE_ENTRIES_FAVORITES = 10`,
  usada en vez de `MAX_VISIBLE_ENTRIES` (15) **solo cuando
  `alwaysExpanded`** (o sea, solo en Favoritos — en la pestaña Listas
  el triángulo sigue scrolleando recién a las 15). El `ScrollView`
  resultante también usa un `maxHeight` más bajo (340 en vez de 480)
  para que el recorte sea consistente con "como máximo se ven ~10".
  (Nota: bajado a 8 en #93.)

**Alternativas descartadas.**

- **Prop `compact` en `MoodTrackerCard`** para que Favoritos y
  Trackers se vean distinto. Se descartó: el achique no le resta nada
  a la pestaña Trackers (sigue siendo perfectamente usable, y de hecho
  dejan entrar más trackers en pantalla sin scrollear), así que no
  valía la complejidad de una variante.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 93. Recorte de Favoritos a 8 ítems; Rutina diaria colapsable; fix de entradas desactualizadas al volver a Favoritos; reacomodo del mood editor *(elección del usuario + fix)*

**Contexto.** Cuatro pedidos juntos: (1) bajar de 10 a 8 el límite
antes de scrollear en Favoritos (#92), y que el mismo límite aplique a
la lista de tareas de "Rutina diaria" (`DailyRoutineSummaryCard`, que
hasta ahora scrolleaba recién a las 15); (2) que "Rutina diaria"
se pueda colapsar para mostrar solo el progreso, igual que una lista,
pero expandida por defecto; (3) un bug: editar una entrada de una
lista (nombre/fecha/comentario/rating) y volver a Favoritos no se
veía reflejado ahí; (4) en el mood tracker, mover la nota al costado
del último color y alinear "Ver progreso" con "Guardar".

**Decisión.**

- **Límite a 8**: `ListCard.MAX_VISIBLE_ENTRIES_FAVORITES` 10→8 (con
  el `maxHeight` del scroll bajado a juego, 340→280).
  `DailyRoutineSummaryCard.MAX_VISIBLE_TASKS` 15→8, mismo criterio que
  `ListCard` en Favoritos (ahí nunca había tenido un límite distinto al
  de Listas — ahora lo tiene, igual que las listas).
- **"Rutina diaria" colapsable**: mismo triángulo ▸/▾ que `ListCard`
  (nuevo botón al lado de la estrella), `useState(true)` — expandida
  por defecto. Colapsada oculta la lista de tareas y deja la barra de
  progreso (`X/Y` + barra), que es lo que pide el pedido ("que
  muestre solo el progreso"). El triángulo solo aparece si `total > 0`
  (nada que colapsar/expandir si no hay tareas todavía).
- **Fix de entradas desactualizadas**: la causa era que `ListCard`
  solo volvía a pedir las entradas de una lista cuando cambiaban
  `counts.total`/`counts.done` (las dependencias del `useEffect`) — una
  edición que no toca cuántas entradas hay ni cuántas están hechas
  (renombrar, cambiar fecha/comentario/rating) no cambia esos números,
  así que la vista desplegada se quedaba mostrando los datos viejos
  hasta cerrarla y volver a abrirla. Se sumó `reloadTick` a
  `useFavorites` **y** a `useLists` (mismo bug ahí, aunque no se había
  reportado — es el mismo componente `ListCard` en los dos lugares): un
  número que suma 1 en cada `reload()` exitoso, sin importar qué
  cambió. Se pasa como prop nueva (`reloadTick`) a cada `ListCard`
  (`FavoritesScreen` y `ListsScreen`) y entra en las dependencias del
  `useEffect` que pide las entradas — así cualquier recarga de la
  pantalla (incluida la que ya dispara `useFocusEffect` al volver de
  editar) fuerza un refetch, sin perder el camino existente
  (`counts.total`/`counts.done`, que sigue cubriendo el caso de
  agregar/borrar una entrada desde el modal rápido de Favoritos sin
  navegar a ningún lado).
- **Mood editor reacomodado**: `MoodColorPicker` suma una prop
  `trailing` — un `ReactNode` que se agrega como un ítem más **dentro**
  de la misma grilla (`flexWrap`) de colores, así queda en la fila del
  último color si hay lugar, o pasa a la siguiente fila del wrap si no
  (mismo comportamiento de cualquier ítem de la grilla). `MoodEditor`
  le pasa ahí el campo "Nota" (antes una fila propia debajo de la
  grilla) con el mismo ancho que un ítem de color (70px) para que se
  vea como una pieza más del conjunto. Para "Ver progreso" a la altura
  de "Guardar": `MoodEditor` suma `leftAction` (otro `ReactNode`,
  opcional) que se renderiza a la izquierda de la fila de botones
  (`justifyContent: 'space-between'` en vez de `flex-end` cuando está
  presente) — `MoodTrackerCard` le pasa el link "Ver progreso →" ahí en
  el estado sin registrar (con `MoodEditor` visible); en el estado ya
  registrado (`MoodEntrySummary`, sin botón "Guardar" con el que
  alinearse) sigue como antes, suelto debajo. `MoodDayModal` (el otro
  lugar que usa `MoodEditor`) no pasa `leftAction`, así que no cambia
  nada ahí.

**Alternativas descartadas.**

- **Arreglar el bug de entradas desactualizadas agregando `isExpanded`
  a algo más agresivo** (p. ej. recargar entradas en cada render). Se
  prefirió una señal explícita (`reloadTick`) ligada al ciclo de vida
  real de "la pantalla recargó", más barata y más fácil de razonar que
  recargar por las dudas en cada render.

**Consecuencias.** `reloadTick` es un patrón que conviene repetir si
aparece el mismo problema en otro lado (cualquier card hija que guarde
su propio estado derivado de datos que el padre puede cambiar "por
afuera"). `npx tsc --noEmit` y `npx expo export --platform android
--output-dir dist-check` corrieron limpios.

---

## 94. Scrollbar siempre visible en las vistas recortadas; grilla de colores del mood tracker en dos filas fijas (5 + 4) *(elección del usuario)*

**Contexto.** Dos ajustes: (1) cuando una lista o "Rutina diaria" tenía
más ítems de los que entran antes de scrollear (#93), no había ninguna
pista de que seguía habiendo más — se veía igual que si la lista
terminara ahí; (2) en el mood tracker, se pidió que la grilla de los 9
colores se acomode siempre en **5 arriba y 4 abajo** (junto con la nota,
que ahora vive en esa segunda fila — #93), en vez de depender de cuántos
entran por el ancho de pantalla (`flexWrap`).

**Decisión.**

- **Scrollbar persistente**: los tres `ScrollView` que recortan contenido
  (`ListCard` en sus dos variantes, `DailyRoutineSummaryCard`) suman
  `persistentScrollbar` (no se auto-oculta en Android, a diferencia del
  comportamiento por defecto) y `showsVerticalScrollIndicator` explícito.
  Es una prop nativa de `ScrollView`, sin dependencias nuevas; en iOS no
  tiene efecto (ahí los indicadores siempre se auto-ocultan, no hay forma
  nativa de dejarlos fijos), pero cubre la plataforma donde se probó esto.
  (Nota: en los APK generados con `eas build` esta barra nativa no se veía
  —sí en desarrollo—, aunque el scroll funcionaba bien; reemplazada en
  #109 por una barra propia en JS que no depende de nada nativo.)
- **Grilla del mood tracker en dos filas fijas**: `MoodColorPicker` ya no
  usa un solo contenedor `flexWrap` — arma dos filas explícitas
  (`MOOD_COLORS.slice(0, 5)` y `.slice(5)`), cada una con sus columnas en
  `flex: 1` (no un ancho fijo en px) para que las 5 columnas se repartan
  el ancho disponible siempre en partes iguales, sea cual sea la pantalla,
  sin superponerse ni necesitar un valor de ancho calculado a mano. El
  `trailing` (la "Nota", de #93) se agrega como sexto ítem de la segunda
  fila, con el mismo `flex: 1` que los colores — ocupa el "5° lugar" de
  esa fila, alineado en columna con los de arriba.

**Alternativas descartadas.**

- **Un gradiente/sombra en el borde inferior** para insinuar que sigue
  (en vez de, o adicional a, el scrollbar persistente). Hubiera hecho
  falta `expo-linear-gradient` (no es una dependencia del proyecto) o
  simularlo a mano con varias `View` apiladas; `persistentScrollbar` ya
  resuelve el pedido sin agregar nada nuevo.
- **Ancho fijo en px para las columnas de la grilla** (en vez de
  `flex: 1`), calculado a mano para que entren justo 5. Es frágil: varía
  según el ancho de pantalla del dispositivo y hubiera quedado bien solo
  en el tamaño probado.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 95. Fix de "Guardar"/selección en trackers; listas colapsables en Favoritos (se saca el pin, ahora vive en Listas); orden manual en Listas y Trackers *(elección del usuario + fix)*

**Contexto.** Cuatro pedidos:

1. En `TrackerCard`, "Guardar" (de las opciones) quede a la derecha, a
   la misma altura que "Ver progreso" — mismo patrón que ya se usó en
   el mood tracker (#93). Además, un bug: cambiar el contador (−/+) de
   un tracker que **también** tiene opciones borraba la selección de
   opciones todavía sin guardar.
2. Que las listas en Favoritos se puedan colapsar igual que "Rutina
   diaria" (#93), pero arrancando desplegadas — y que se saque el pin
   de Favoritos, porque con eso ya no tiene uso (antes el pin era la
   única forma de que una lista arrancara desplegada en Favoritos;
   ahora que todas arrancan así por defecto, pinear ahí no cambia nada
   visible — el usuario lo notó).
3. Que el pin pase a la pestaña **Listas**, donde sí tiene sentido
   ("para que queden desplegadas siempre, como funcionaba antes en
   Favoritos").
4. Que listas (en Listas) y trackers (en Trackers) se puedan reordenar
   a mano, mismo patrón que Favoritos (botón "Ordenar"/"Listo" +
   `ReorderRow` con flechas ▲▼).

**Decisión.**

- **Fix del contador que borraba la selección**: `useTrackerCard.reload`
  pasa a aceptar `{ keepSelection?: boolean }`; `setCount` (el −/+ del
  contador) lo llama con `keepSelection: true` — antes `reload` vaciaba
  `selectedOptionIds` siempre, sin importar si lo que cambió fue el
  contador y no las opciones. El `reload` del enfoque de pantalla y el
  de después de `saveOptions` siguen vaciando la selección como antes
  (ahí sí corresponde).
- **"Guardar" al lado de "Ver progreso"**: mismo patrón que `MoodEditor`
  (#93) — una sola fila al fondo de la card, con `justifyContent:
  'space-between'` solo cuando hay botón "Guardar" que mostrar
  (`hasOptions && !optionsLocked`); si no, la fila queda con "Ver
  progreso" solo, alineado a la izquierda como antes.
- **Listas colapsables en Favoritos, sin pin ahí**: `ListCard` cambia
  sus props — se saca `alwaysExpanded`, se suma `defaultExpanded`
  (con qué estado arranca, en vez de `list.pinnedExpanded`) y `compact`
  (el límite de 8 ítems antes de scrollear de #93, antes atado a
  `alwaysExpanded`). Favoritos pasa `defaultExpanded compact` y ya no
  pasa `showPin`/`onTogglePin` — el triángulo (ya existía, antes solo
  se ocultaba con `alwaysExpanded`) queda visible y funciona como en
  cualquier lado.
- **Pin en Listas**: `useLists` suma `togglePinnedExpanded` (idéntico al
  que tenía `useFavorites`, que se sacó de ahí por quedar sin uso);
  `ListsScreen` le pasa `showPin`/`onTogglePin` a `ListCard` — ya no
  manda `defaultExpanded`, así que arranca según `list.pinnedExpanded`
  como corresponde ahí.
- **Orden manual en Listas y Trackers**: mismo mecanismo que
  `FavoritesOrder`, pero uno por pantalla — `ListsOrderRepository`/
  `GetListsOrder`/`SaveListsOrder` y
  `TrackersOrderRepository`/`GetTrackersOrder`/`SaveTrackersOrder`
  (nuevas claves `@app-celu/lists-order/v1` y
  `@app-celu/trackers-order/v1` en `STORAGE_KEYS` — el backup las toma
  solas, recorre `ALL_STORAGE_KEYS`). A diferencia de `FavoritesOrder`
  (que guarda claves de distinto tipo: `"finance"`, `"tracker:<id>"`,
  etc.), acá cada guardado es una lista homogénea de ids nomás, así que
  no hace falta el `FavoriteRef`/parseo de #72 — se sumaron dos
  funciones chicas reusables en
  [`core/utils/order.ts`](src/core/utils/order.ts):
  `sanitizeIdOrder` (sanea el array guardado) y `applyIdOrder` (aplica
  ese orden a una lista de ítems con `id`, con los no guardados al
  final — la misma lógica que `useFavorites` ya hacía a mano, ahora
  compartida). `useLists`/`useTrackersViewModel` suman `reorderMode` /
  `toggleReorder` / `move`, igual que `useFavorites`. `ListsScreen`/
  `TrackersScreen` suman el botón "Ordenar"/"Listo" y, en modo
  reordenar, cambian a una lista de `ReorderRow`. En Trackers, el mood
  tracker **no entra** al reordenamiento (queda fijo arriba, se oculta
  mientras se reordena) — mismo criterio que en Favoritos, donde no se
  puede reordenar **dentro** de un carrusel, solo las cards entre sí.

**Alternativas descartadas.**

- **Un solo repositorio de "orden" genérico y reusable** para
  Favoritos, Listas y Trackers. Se descartó: `FavoritesOrderRepository`
  ya tiene una forma distinta (claves con prefijo de tipo, por los
  ítems mezclados que ordena) que no aplica a Listas/Trackers (ids
  homogéneos nomás); forzar una abstracción común hubiera complicado
  el caso simple para no repetir ~10 líneas por repositorio. Lo que sí
  se compartió (`sanitizeIdOrder`/`applyIdOrder`) es la lógica, no el
  repositorio.

**Consecuencias.** `ListCard` ya no tiene ningún caso de uso para
`alwaysExpanded` — queda completamente reemplazado por
`defaultExpanded`/`compact`. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 96. Comentario y "Editar" sin salir de la card del tracker; vista de solo lectura al abrir un día ya cargado en "Ver progreso" *(elección del usuario)*

**Contexto.** Tres pedidos sobre trackers con opciones:

1. En `TrackerCard`, un botón **"Agregar comentario"** a la izquierda
   de "Guardar", para cargar el comentario de hoy sin ir hasta "Ver
   progreso".
2. Al guardar, donde estaba "Guardar" que aparezca un botón
   **"Editar"** que muestre de nuevo las opciones (precargadas) para
   poder cambiarlas ahí mismo, en vez de mandar siempre a "Ver
   progreso" (el resumen de solo lectura decía exactamente eso:
   "Editás desde 'Ver progreso'").
3. En `TrackerDayModal` (el modal de un día en "Ver progreso"), que
   abrir un día **ya cargado** muestre primero una vista de solo
   lectura, con un botón "Editar" que recién ahí muestre la forma
   editable (con "Actualizar" para guardar los cambios); un día
   **vacío** sigue yendo directo a la forma editable, como hoy.

**Decisión.**

- **Nuevo [`TrackerOptionsSummary`](src/presentation/tracker/components/TrackerOptionsSummary.tsx)**:
  se extrajo el `OptionsSummary` que antes vivía adentro de
  `TrackerCard.tsx` (puntos de color + nombres, con una línea de
  `hint` opcional) a un componente propio, para reusarlo tal cual en
  `TrackerDayModal`.
- **Nuevo `TrackerCommentModal`**: modal chico (igual estructura que
  `MoodDayModal`/`TrackerDayModal` — `KeyboardAvoider` + hoja que sube
  desde abajo) con un solo campo de texto, precargado con el
  comentario de hoy si ya había uno. (Nota: reemplazado por un campo
  en línea, sin modal, en #98.)
- **`useTrackerCard`** suma:
  - `saveComment(comment)`: guarda el comentario de hoy manteniendo
    las opciones/el número que ya hubiera (`entry?.optionIds`/
    `entry?.value`, igual patrón que `setCount`), y usa
    `reload({ keepSelection: true })` (mismo fix de #95 — no tiene que
    perder una selección de opciones sin guardar todavía).
  - `editingOptions` (estado) + `openEditOptions()`: fuerza el modo
    edición de las opciones aunque ya haya una entrada guardada hoy,
    precargando `selectedOptionIds` con lo que ya estaba elegido
    (`entry.optionIds`). `optionsLocked` pasa a depender también de
    `!editingOptions`. `reload()` (sin `keepSelection`) resetea
    `editingOptions` a `false` además de la selección — vuelve al modo
    lectura después de guardar.
  - El botón de guardar opciones dice **"Actualizar"** en vez de
    "Guardar" cuando ya había una entrada (`vm.entry`), mismo criterio
    que ya usaba `TrackerDayModal`.
- **`TrackerCard`**: la fila de abajo pasa a tener, a la derecha,
  **"Agregar comentario"/"Editar comentario"** (según si ya hay
  comentario) siempre que el tracker tenga opciones, y al lado el
  botón que corresponda — "Editar" (abre `openEditOptions`) si está
  bloqueado, o "Guardar"/"Actualizar" si no. El resumen de solo
  lectura ya no dice "Editás desde 'Ver progreso'" (ahora se edita
  ahí mismo). Guardar un comentario puede fallar la validación del
  dominio (un tracker sin contador no puede tener una entrada sin
  ninguna opción ni número — `createTrackerEntry` tira error si
  `optionIds` está vacío y no hay `value`); se cubre con un
  `Alert.alert` mostrando el mensaje de error en vez de dejar que
  falle en silencio. (Nota: en #98 el botón "Agregar/Editar
  comentario" y el "Editar" de texto se reemplazaron — comentario en
  línea, "Editar" como lápiz junto al resumen.)
- **`TrackerDayModal`**: suma `viewMode` (arranca en `true` si
  `entry != null`, se resetea en cada cambio de día). En modo vista
  muestra `TrackerOptionsSummary` (si hay opciones elegidas), el
  número tal cual quedó, y el comentario (o "Sin comentario."); el
  botón de abajo es "Editar" en vez de "Guardar"/"Actualizar". Tocarlo
  pasa a `viewMode: false`, mostrando la misma forma editable de
  siempre (ya precargada por el `useEffect` existente). Un día vacío
  nunca entra en modo vista (`viewMode` arranca en `false` ahí), va
  directo a la forma editable, sin cambios.

**Alternativas descartadas.**

- **Un solo componente de "resumen de día"** compartido entre
  `TrackerCard` (resumen de opciones nomás) y `TrackerDayModal` (
  opciones + número + comentario). Se descartó: lo único realmente
  igual entre los dos es el bloque de opciones (`TrackerOptionsSummary`,
  que sí se compartió); el número y el comentario se muestran distinto
  en cada lugar (en la card el número es siempre editable, nunca un
  resumen; en el modal si se muestra de solo lectura) y forzarlos a un
  componente común no ahorraba código, solo lo indirectaba.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 97. Confirmación al borrar un día en "Ver progreso"; "Agregar comentario" arriba de "Guardar", pegado *(elección del usuario)*

**Contexto.** Dos ajustes chicos sobre #96: (1) "Borrar" en
`TrackerDayModal` (el modal de un día en "Ver progreso" de un tracker)
borraba al toque, sin preguntar — único "Borrar" de un registro en toda
la app sin confirmación; (2) "Agregar comentario"/"Editar comentario"
en `TrackerCard` quedaba al lado de "Guardar"/"Editar", se pidió
arriba, bien pegado (poca separación).

**Decisión.**

- **Confirmación al borrar un día**: `TrackerProgressScreen` suma
  `confirmDeleteDay` (mismo patrón que `confirmDeleteList`/
  `confirmDeleteSelected` en listas — `Alert.alert` con Cancelar/Borrar
  destructivo) y se lo pasa a `TrackerDayModal` como `onDelete` en vez
  de `vm.deleteDay` directo. El modal en sí no cambia — sigue sin saber
  nada de confirmaciones, es la pantalla la que decide, igual que en
  todos los demás "Borrar" de la app.
- **"Agregar comentario" arriba, pegado**: `TrackerCard.bottomRowRight`
  pasa de fila (`flexDirection: 'row'`, `gap: 16`) a columna (default,
  sin `flexDirection`) con `gap: 4` y `alignItems: 'flex-end'` — el
  texto del comentario y el botón de Guardar/Editar quedan uno arriba
  del otro, pegados y alineados a la derecha, en vez de lado a lado.
  (Nota: `bottomRowRight` y el botón de comentario se borraron en #98
  — el comentario pasó a un campo en línea y "Editar" a un lápiz junto
  al resumen de opciones.)

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 98. Comentario del tracker como campo de texto en línea (como la descripción del mood tracker); se oculta al guardar; "Editar" pasa a ser un lápiz a la altura del resumen *(elección del usuario)*

**Contexto.** Sobre #96/#97: el comentario de `TrackerCard` se cargaba
con un modal aparte (`TrackerCommentModal`) abierto desde un botón
"Agregar/Editar comentario". Se pidió que en cambio sea un campo de
texto **en línea**, igual al de "Descripción (opcional)" del mood
tracker (un `TextInput` siempre visible dentro de la propia edición,
sin modal); que al guardar el día, ese campo deje de mostrarse hasta
que se vuelva a editar (como ya pasa con los chips de opciones); y que
el botón "Editar" deje de ser texto y pase a ser un lápiz, a la altura
del resumen de la selección de hoy (no al lado de "Ver progreso").

**Decisión.**

- **Comentario en línea, no modal.** Se borró
  [`TrackerCommentModal.tsx`](src/presentation/tracker/components/TrackerCommentModal.tsx)
  (quedó sin usar). `TrackerCard` ahora muestra un `TextInput`
  multilínea (mismo estilo que el campo de descripción de
  `MoodEditor`: borde gris, `padding:10`, `minHeight:44`) justo debajo
  de los chips de opciones, **solo cuando se están editando** las
  opciones (`!vm.optionsLocked`) — el mismo estado que ya ocultaba/
  mostraba los chips, así que el comentario queda atado a la misma
  regla de "se ve mientras se edita, se oculta al guardar" sin estado
  nuevo en el componente.
- **`useTrackerCard` suma `commentDraft`/`onCommentDraftChange`**, en
  vez de la función aislada `saveComment` (que se borró). Se precarga
  con `entry?.comment ?? ''` tanto en `reload()` (cuando no es
  `keepSelection`) como en `openEditOptions()` — mismo momento en que
  ya se precargaba `selectedOptionIds`. `saveOptions()` manda
  `comment: commentDraft` en vez de `entry?.comment` (pasaba el
  comentario viejo sin cambios) — ahora un solo "Guardar"/"Actualizar"
  persiste opciones + comentario juntos, ya no hace falta un guardado
  aparte para el comentario.
- **"Editar" pasa a ser un lápiz junto al resumen.**
  [`TrackerOptionsSummary`](src/presentation/tracker/components/TrackerOptionsSummary.tsx)
  suma un prop opcional `onEdit`: si se pasa, agrega el
  [`EditButton`](src/presentation/components/EditButton.tsx) (el lápiz
  reusado de #87) al final de la misma fila del resumen —como
  `summaryTexts` ya tenía `flex: 1`, el lápiz queda pegado a la derecha
  sin tocar el layout. `TrackerCard` le pasa `onEdit={vm.openEditOptions}`;
  `TrackerDayModal` no pasa `onEdit` (sigue con su propio botón
  "Editar" de texto en la fila de acciones de abajo, sin cambios — el
  pedido era puntual sobre la card del home).
- **Fila de abajo de `TrackerCard` simplificada**: con el comentario y
  el "Editar" afuera, vuelve a tener solo "Ver progreso" y, mientras se
  está editando, "Guardar"/"Actualizar" al lado (`space-between` solo
  en ese caso). Bloqueado (ya guardado), la fila queda con "Ver
  progreso" nomás.

**Alternativas descartadas.**

- **Mantener el comentario visible siempre** (también en modo
  bloqueado, como un texto de solo lectura). Se descartó: el pedido
  explícito fue que "se deje de mostrar hasta que se vaya a editar",
  igual que las opciones — mantenerlo visible rompía esa simetría sin
  necesidad.
- **Agregar el lápiz como parte fija de `TrackerOptionsSummary`**
  (siempre, sin prop). Se descartó porque `TrackerDayModal` reusa el
  mismo componente en su vista de solo lectura con su propio botón
  "Editar" ya resuelto (#96); forzar el lápiz ahí duplicaría la acción.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 99. Comentario en gris bajo el resumen de opciones; "Registrado hoy" en verde al lado de "Ver progreso"; fix de destello en los carruseles de Favoritos *(elección del usuario + fix)*

**Contexto.** Tres pedidos:

1. En el resumen de solo lectura de `TrackerCard` (opciones ya
   guardadas), si el día tiene comentario, mostrarlo en gris debajo
   del nombre de la opción elegida.
2. El texto "Ya registraste hoy." (hint chico debajo del resumen) pasa
   a mostrarse a la **derecha de "Ver progreso"**, en **verde**, como
   **"Registrado hoy"** con un **tilde**.
3. Los carruseles de Favoritos (`FavoritesCarousel`) seguían mostrando
   un **destello del ítem anterior** al cambiar de tarjeta, pese al fix
   de #83/el comentario ya existente en `completeTransition` sobre
   resetear `translateX` en un `useLayoutEffect` atado a `index`.

**Decisión.**

- **Comentario gris en el resumen**: `TrackerOptionsSummary` suma un
  prop `comment?: string` — si viene, se muestra en gris
  (`#6b7280`, mismo tono que otros textos secundarios de la app) debajo
  del nombre de la opción. `TrackerCard` le pasa
  `comment={vm.entry?.comment}`. `TrackerDayModal` no lo usa (ya
  muestra el comentario completo en su propia fila "Comentario", sin
  cambios).
- **"Registrado hoy" en la fila de abajo**: se sacó el `hint` que
  mostraba `TrackerOptionsSummary` en `TrackerCard` (ya no se le pasa
  `hint`) y en su lugar, cuando `vm.optionsLocked`, la fila de abajo
  muestra a la derecha de "Ver progreso" un ícono `Check` (14px,
  `strokeWidth={3}`) y el texto **"Registrado hoy"**, ambos en verde
  (`#16a34a`, el mismo verde que ya usaba "Guardado ✓" en el header).
  La fila vuelve a necesitar `space-between` siempre que haya opciones
  (`hasOptions`, sin importar si está bloqueada o no), ya que ahora las
  dos ramas (bloqueada/editando) muestran algo a la derecha.
- **Fix del destello en los carruseles**: la causa real no era el
  reseteo de `translateX` en sí (ese ya corría en un `useLayoutEffect`
  sincronizado con el cambio de `index`), sino que la animación de
  `translateX` usaba `useNativeDriver: true` — una vez una
  `Animated.Value` se anima con el driver nativo queda "adjunta" a un
  nodo nativo, y sus actualizaciones (incluido el `setValue(0)` del
  reseteo) viajan por un canal del hilo nativo separado del commit de
  React/Fabric que reordena los hijos prev/current/next; esos dos
  canales no siempre llegan a pantalla en el mismo frame, y en el
  medio se veía un frame con el `translateX` ya en 0 pero los hijos
  todavía sin reordenar (o viceversa) — el destello. Se cambiaron los
  tres usos de `translateX` en `useCarouselSwipe`
  (`Animated.timing` de `completeTransition`, `Animated.spring` de
  `cancelDrag`) a `useNativeDriver: false`, para que el transform se
  actualice por el mismo canal JS que ya sincroniza el reorden de
  hijos.

**Alternativas descartadas.**

- **Retrasar el reseteo de `translateX` con un frame extra**
  (`requestAnimationFrame` doble o `InteractionManager`) en vez de
  sacar el driver nativo. Se descartó: es un parche no determinístico
  (depende de cuántos frames tarde en sincronizar cada canal, puede
  variar por dispositivo) en vez de arreglar la causa (dos canales de
  actualización en paralelo).
- **Mostrar "Registrado hoy" dentro de `TrackerOptionsSummary`** (como
  hint, en vez de en la fila de abajo). Se descartó porque el pedido
  fue puntualmente "a la derecha de Ver progreso".

**Consecuencias.** El arrastre del carrusel pasa a animarse por JS en
vez de por el driver nativo — más que suficiente para dos tarjetas de
ancho de pantalla, sin notarse más lento. `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios.

---

## 100. Se sacó "Borrar" del contador de `TrackerCard`; tacho al lado de "Actualizar", con confirmación *(elección del usuario)*

**Contexto.** El contador de `TrackerCard` tenía un botón de texto
"Borrar" al lado, sin preguntar antes — el único "Borrar" de la app sin
confirmación salvo el de #97 que ya se corrigió. Se pidió sacarlo de
ahí y, en cambio, poner un tacho de basura al lado de "Actualizar" (en
la edición de opciones) para borrar el registro del día si se quiere,
preguntando antes.

**Decisión.**

- Se sacó el `View`/botón "Borrar" que estaba al lado del `Counter` en
  `TrackerCard` — el contador queda solo, sin acción de borrado propia
  (un tracker sin opciones ya no tiene forma de borrar el día desde la
  card; sigue pudiéndose desde "Ver progreso", que desde #97 ya pide
  confirmación).
- Al lado del botón "Actualizar" (solo cuando ya hay una entrada
  guardada, `vm.entry`, y se está editando las opciones) aparece un
  ícono `Trash` (20px, `#dc2626`, mismo color/tamaño que el tacho de
  `SelectionBar`) que llama a una nueva `confirmDeleteEntry()` en
  `TrackerCard` — mismo patrón `Alert.alert` (Cancelar/Borrar
  destructivo) que `confirmDeleteDay` en `TrackerProgressScreen` (#97),
  antes de ejecutar `vm.clearEntry`. No aparece para una entrada nueva
  sin guardar todavía (nada que borrar) ni mientras el resumen está en
  modo lectura (bloqueado) — solo mientras se está editando.

**Alternativas descartadas.**

- **Dejar el tacho visible también en el resumen bloqueado** (junto al
  lápiz de #98). Se descartó: el pedido fue puntualmente "al lado de
  actualizar", es decir, en el modo edición.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 101. Mood tracker alineado al patrón de los trackers normales: "Registrado hoy", lápiz para editar, nota/comentario combinados *(elección del usuario)*

**Contexto.** El mood tracker se quedó atrás de los últimos cambios a
`TrackerCard` (#96–#100): una vez guardado el día, mostraba un texto
("Ya registraste hoy. Podés editarlo desde 'Ver progreso'.") sin forma
de editar ahí mismo, y nota/comentario se veían en dos líneas con
estilos distintos (nota en negro negrita, comentario en gris
itálica). Se pidió unificar con el patrón ya establecido en los
trackers normales: un badge **"Registrado hoy"** en verde con un
tilde al lado de "Ver progreso", un **lápiz** para editar sin salir de
la card, y debajo de la selección una sola línea **"nota/10 -
comentario"**.

**Decisión.**

- **`useMoodTrackerCard` suma `editing`/`openEdit()`**, mismo patrón
  que `editingOptions`/`openEditOptions` de `useTrackerCard`:
  `openEdit()` precarga `colors`/`description`/`note` desde
  `savedEntry` y fuerza el editor a mostrarse aunque ya haya un
  registro guardado hoy. `save()` deja `editing` en `false` al
  terminar (vuelve al resumen). La pantalla no resetea `editing` al
  recuperar el foco (mismo criterio que ya tenían los borradores sin
  guardar: no se pisan sin que el usuario guarde o cancele).
- **`MoodEntrySummary`** suma un prop opcional `onEdit` (agrega el
  mismo [`EditButton`](src/presentation/components/EditButton.tsx) al
  final de la fila, apoyado en que `texts` ya tenía `flex: 1`, igual
  que hizo `TrackerOptionsSummary` en #98) y combina nota y comentario
  en una sola línea gris (`#6b7280`): `"7/10 - Me sentí bien"` (si
  falta alguno de los dos, se muestra solo el que haya); antes eran
  dos `Text` separados con estilos distintos.
- **`MoodTrackerCard`**: `locked = savedEntry != null && !editing`. En
  modo lectura muestra `MoodEntrySummary` con `onEdit={vm.openEdit}` y,
  en una fila propia debajo, "Ver progreso" a la izquierda y el badge
  verde **"Registrado hoy" + ✓** (ícono `Check`) a la derecha — mismo
  armado que `TrackerCard` (#99). Mientras se edita (sin registro
  guardado, o reabierto con el lápiz), sigue mostrando `MoodEditor`
  con "Ver progreso" como `leftAction` junto a "Guardar"/"Actualizar"
  (el label cambia a "Actualizar" si ya había `savedEntry`) — ese
  mecanismo ya existía y sigue siendo el único lugar que lo usa, no
  hizo falta tocar `MoodEditor`.

**Alternativas descartadas.**

- **Sacar el prop `leftAction` de `MoodEditor`** ya que solo lo usa
  `MoodTrackerCard`. Se descartó: sigue activamente en uso (la fila de
  "Ver progreso" + "Guardar"/"Actualizar" durante la edición no
  cambió), no es código muerto.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 102. Nombre de la emoción debajo del color, en el selector del mood tracker *(elección del usuario)*

**Contexto.** En `MoodColorPicker` (la grilla de 9 colores para elegir el
ánimo del día), cada círculo mostraba solo el **nombre del color**
("Naranja", "Violeta", ...) debajo. Se pidió agregar el **nombre de la
emoción** (el campo `meaning` de `MOOD_COLORS`, p. ej. "Bien,
tranquilo") y que quede en **dos renglones** (nombre del color arriba,
emoción abajo), en vez de un solo renglón.

**Decisión.** `renderSwatch` en `MoodColorPicker.tsx` agrega un segundo
`Text` con `info.meaning` debajo del nombre, ambos con
`numberOfLines={1}` (si no entra, se corta con "…" en vez de forzar un
tercer renglón) — nombre en el mismo estilo de antes, emoción un poco
más chica y más clara (`fontSize: 9`, `#9ca3af`). Son las columnas de
~63px de siempre (dos filas fijas de #94), sin tocar el resto del
layout de la grilla. (Nota: en #104 se sacó el nombre del color en
todo el mood tracker, incluida esta grilla — queda un solo renglón con
la emoción, que ahora sí puede partirse en dos líneas si no entra.)

**Alternativas descartadas.**

- **Dejar que el texto haga `flexWrap` libre** en vez de dos `Text`
  separados con `numberOfLines={1}` cada uno. Se descartó: con una sola
  palabra (nombre del color) no hay espacio natural para partir en dos
  líneas, y la emoción sola podía terminar ocupando una cantidad de
  líneas distinta por color, rompiendo la alineación entre columnas de
  la misma fila.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 103. La repetición mensual de Finanzas pasa a ser configurable como la de eventos (días/meses, hasta fecha/cantidad/indefinida) *(elección del usuario)*

**Contexto.** Un movimiento de Finanzas que se repite solo podía
hacerlo **cada mes**, y terminar de dos formas: indefinidamente o tras
**N meses** (contando el primero) — `FinanceRepeat { months: number |
null }`. Se pidió que sea igual de flexible que la repetición de
eventos del calendario (`EventRepeat`, ver `EventModal`): repetir cada
**X días o X meses**, y terminar **indefinidamente**, **hasta una
fecha**, o **tras una cantidad de veces**. Los ajustes de monto
(`adjustments`, "Ajustar monto (desde hoy)") y "Finalizado" debían
seguir funcionando exactamente igual — el pedido era solo sobre la
repetición en sí.

**Decisión.**

- **`FinanceTransaction.ts`** suma `FinanceRepeatEndType` ('never' |
  'onDate' | 'afterCount'), `FinanceRepeatUnit` ('days' | 'months') y
  reescribe `FinanceRepeat` como `{ intervalValue, intervalUnit,
  endType, endDate?, count? }` — mismo esquema que `EventRepeat`
  (constantes `MIN_INTERVAL_VALUE`, `MAX_INTERVAL_DAYS` (3650),
  `MAX_INTERVAL_MONTHS` (120), `MIN_REPEAT_COUNT`/`MAX_REPEAT_COUNT`
  (1–5000), `DEFAULT_INTERVAL_DAYS`/`DEFAULT_INTERVAL_MONTHS`, todas
  con los mismos valores que las de `CalendarEvent.ts`, pero
  declaradas aparte — son dominios independientes). La validación en
  `createFinanceTransaction` es el mismo código que
  `createCalendarEvent` adaptado a "movimiento" en los mensajes de
  error. `adjustments`/`finishedOn` no cambiaron: siguen gateados por
  `repeat` truthy, sin tocar su lógica.
- **`financeOccurrencesInRange`** (`occurrences.ts`) pasa a avanzar con
  `addDays` o `addMonthsClamped` según `intervalUnit` (igual que
  `eventOccurrencesInRange`), corta en `MAX_OCCURRENCES` (5000) o en
  `repeat.count` si `endType === 'afterCount'`, y el rango efectivo
  ahora toma el mínimo entre `endIso` (el período consultado),
  `repeat.endDate` (si `endType === 'onDate'`) **y** `finishedOn` (el
  "Finalizado" manual, que sigue siendo independiente de cómo termina
  la repetición).
- **Migración de datos ya guardados**: `FinanceTransactionDto.ts` suma
  `repeatFromDto()`, que distingue el formato viejo (`{ months }`, sin
  `intervalValue`/`intervalUnit`/`endType`) del nuevo por la presencia
  de esos campos, y lo traduce: `months: null` → `{ intervalValue: 1,
  intervalUnit: 'months', endType: 'never' }`; `months: N` → mismo
  intervalo mensual con `endType: 'afterCount', count: N`. Así los
  movimientos recurrentes ya guardados (p. ej. un alquiler cargado
  antes de este cambio) siguen funcionando igual sin que el usuario
  tenga que volver a configurarlos.
- **`FinanceTransactionModal.tsx`**: el checkbox pasa de "Se repite
  todos los meses" a **"Se repite"**, y el bloque de "Indefinidamente"/
  "Por X meses" se reemplaza por los mismos dos controles que
  `EventModal` — "Repetir cada" (número + `SelectField` Días/Meses) y
  "Repetición" (`SelectField` Indefinidamente/Hasta una fecha/Cantidad
  de veces, con el `DateField`/`TextInput` que corresponda al lado). El
  bloque de ajuste de monto (`adjustBox`, "Monto actual"/"Ajustar
  monto") y "Finalizado — no calcular las próximas" quedan exactamente
  donde estaban, sin cambios de comportamiento ni de estilo.
- **`FinanceReportSection.tsx`**: `installmentLabel` ya no puede asumir
  "mes N" (ahora puede repetirse por días) — con `endType ===
  'afterCount'` sigue mostrando "cuota N/total"; en los otros casos
  (indefinida o hasta una fecha, donde no hay un "total" fijo) muestra
  "#N" en vez de "mes N".

**Alternativas descartadas.**

- **Reusar `EventRepeat`/`eventOccurrencesInRange` directamente** desde
  Finanzas en vez de duplicar el esquema. Se descartó: evento y
  movimiento financiero son dominios separados en este proyecto (cada
  uno con sus propias entidades/casos de uso); importar uno desde el
  otro acoplaría dos *bounded contexts* que hoy no se conocen entre sí,
  por una duplicación chica (un `interface` y una función de ~15
  líneas).
- **No migrar los datos viejos** y forzar al usuario a reconfigurar sus
  movimientos recurrentes ya guardados. Se descartó: es una app
  personal con datos reales ya cargados (alquiler, sueldo, etc.);
  perder esa configuración de repetición sin aviso es peor que las
  ~15 líneas de `repeatFromDto`.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 104. Mood tracker al nivel de los trackers normales: solo emociones (sin nombre de color), borrar al editar desde la card, "Ver progreso" con vista/edición como `TrackerDayModal`, y tacho en vez de "Borrar" en ambos *(elección del usuario)*

**Contexto.** Cuatro ajustes para terminar de emparejar el mood tracker
con el patrón ya usado en los trackers normales (#96–#100):

1. En todo el mood tracker se mostraba "Nombre del color · Emoción"
   (p. ej. "Naranja · Bien, tranquilo"); se pidió sacar el nombre del
   color y dejar solo la emoción.
2. Al reabrir el editor con el lápiz en la card del home (#101), no
   había forma de borrar el registro de hoy — en los trackers normales
   ese mismo lápiz-y-reeditar sí tiene un tacho al lado de "Actualizar"
   (#100).
3. En "Ver progreso" del mood tracker, tocar un día siempre iba directo
   a la forma editable, sin la vista de solo lectura +
   "Editar"/"Borrar" que ya tiene `TrackerDayModal` (#96/#97) para los
   trackers normales.
4. El botón "Borrar" (texto rojo) de `TrackerDayModal` y del editor de
   mood (`MoodEditor`, usado en la card y en el modal de día) debía
   pasar a ser un **tacho de basura**, en ambos.

**Decisión.**

- **Solo emociones**: `MoodEditor` (preview de arriba) y
  `MoodEntrySummary` ya no muestran `getMoodColorInfo(c).name`, solo
  `.meaning`. En `MoodColorPicker`, el segundo renglón agregado en
  #102 (nombre del color) se sacó entero — queda un solo `Text` con la
  emoción, ahora en `numberOfLines={2}` (antes de #102 esto era un
  renglón con el nombre nomás; ahora, al ser la única etiqueta, usa las
  dos líneas para la frase de la emoción si no entra en una).
- **Tacho al editar desde la card**: `useMoodTrackerCard` suma
  `deleteEntry()` (`container.deleteMoodEntry`, limpia `savedEntry` y
  el borrador, sale de `editing`). `MoodTrackerCard` pasa
  `onDelete={vm.savedEntry ? confirmDeleteEntry : undefined}` a
  `MoodEditor` — mismo `Alert.alert` de confirmación que
  `TrackerCard` (#100), y solo aparece reeditando una entrada que ya
  existía (no en un día nuevo sin guardar todavía, igual criterio que
  en trackers).
- **Vista/edición en "Ver progreso"**: `MoodDayModal` suma `viewMode`
  (arranca en `true` si `entry != null`, se resetea en cada cambio de
  día) — mismo patrón que `TrackerDayModal`. En modo vista muestra
  `MoodEntrySummary` (sin el lápiz propio del resumen; aquí el botón
  de editar sigue siendo de texto, no el lápiz de la card, mismo
  criterio que #98 para no duplicar la acción) y una fila de acciones
  propia (tacho "Borrar" + "Editar") fuera del `ScrollView`. Al tocar
  "Editar" pasa a mostrar el `MoodEditor` de siempre, con su propio
  tacho+"Actualizar" ya resueltos adentro. Un día vacío nunca entra en
  modo vista, va directo a la forma editable, sin cambios.
  `MoodProgressScreen` suma `confirmDeleteDay` (mismo `Alert.alert` que
  ya tenía el equivalente de trackers desde #97 — acá nunca se había
  agregado) en vez de pasar `vm.deleteDay` directo.
- **Tacho en vez de texto**: `MoodEditor.deleteButton` y
  `TrackerDayModal.deleteButton` dejan de ser un botón rojo con texto
  "Borrar" y pasan a un ícono `Trash` (20px, `#dc2626`) sin fondo,
  mismo tamaño/color que el tacho de `SelectionBar` y el de
  `TrackerCard` (#100).

**Alternativas descartadas.**

- **Poner el lápiz de edición también en `MoodEntrySummary` dentro de
  `MoodDayModal`** (en vez de mantener el botón "Editar" de texto ahí).
  Se descartó por la misma razón que en #98: el lápiz es para la card
  del home; el modal de "Ver progreso" usa su propio botón de texto,
  consistente con `TrackerDayModal`.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 105. Cada palabra de la emoción del mood tracker en su propio renglón *(elección del usuario)*

**Contexto.** Cada `meaning` de `MOOD_COLORS` son dos palabras
separadas por coma (p. ej. "Bien, tranquilo"). Mostrándolas como un
solo texto, el salto de línea quedaba a merced del ancho disponible —
a veces las dos palabras entraban en un renglón, a veces no, sin
garantía. Se pidió que queden siempre **una por renglón**.

**Decisión.** Nueva función
[`splitMoodMeaning`](src/domain/mood/entities/MoodColor.ts) (`meaning.split(',
')`) y los tres lugares que muestran la emoción de un día —
`MoodColorPicker` (la grilla de 9 colores), `MoodEditor` (preview de
arriba) y `MoodEntrySummary` (resumen de solo lectura) — pasan a
renderizar cada palabra en su propio `Text`, en vez de un solo texto
con `numberOfLines`. Con dos colores elegidos, salen 4 renglones (2
por color, en el orden de `entry.colors`/`colors`). `MoodReferenceCards`
(las cards de "Referencias" en "Ver progreso", una por cada uno de los
9 colores con su nombre) no se tocó: no es la selección de un día ni
"dos emociones", es la lista completa de colores. (Nota: en #106 se
volvió atrás este split en `MoodEditor` y `MoodEntrySummary` — ahí la
columna es ancha y las dos palabras entran cómodas en un renglón;
`MoodColorPicker`, que sí tiene la columna angosta, se queda con el
split de este `#105`.)

**Alternativas descartadas.**

- **Forzar el salto con `numberOfLines={2}`** (lo que ya hacía
  `MoodColorPicker` desde #102/#104). Se descartó: no garantiza que el
  corte caiga justo en la coma — con columnas más anchas el texto
  podía entrar entero en un renglón, y con una palabra más larga podía
  cortarse a mitad de palabra en vez de en el espacio después de la
  coma.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 106. Al mostrar la selección del día, las dos palabras de la emoción vuelven a un solo renglón *(elección del usuario)*

**Contexto.** El split de #105 (una palabra por renglón) aplicado a
`MoodEditor` (preview de arriba) y `MoodEntrySummary` (resumen de solo
lectura) se pidió revertir ahí: al **mostrar la selección** del día,
las dos palabras de cada emoción tienen que volver a estar en el mismo
renglón.

**Decisión.** `MoodEditor` y `MoodEntrySummary` vuelven a un solo
`Text` con `getMoodColorInfo(c).meaning` completo por color
seleccionado (como antes de #105) — ahí la columna de texto es ancha
(`flex: 1` en un bloque junto al cuadrado de colores), así que las dos
palabras entran sin problema en un renglón. `MoodColorPicker` no
cambia: sigue usando `splitMoodMeaning` de #105, porque ahí sí es una
columna angosta (una de 9, ~63px) donde las dos palabras no siempre
entran juntas.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 107. En el selector del mood tracker, una palabra que no entra rebalsa el renglón en vez de cortarse o pasar a una línea más *(elección del usuario)*

**Contexto.** En `MoodColorPicker`, cada palabra de la emoción
(`splitMoodMeaning`, #105) se mostraba con `numberOfLines={1}` — una
palabra larga que no entraba en la columna angosta (~63px) se cortaba
con "…" en vez de mostrarse completa. Se pidió que se vea completa, sin
agregar un tercer renglón al círculo (prefiere que la palabra se salga
del ancho de su columna antes que eso).

**Decisión.** Se sacó `numberOfLines={1}` del `Text` de cada palabra y
se le agregó `flexShrink: 0` — así Yoga no lo achica para que entre en
el ancho disponible (que es lo que antes forzaba el corte con "…", y
lo que haría falta para que pase a una línea más si solo se sacaba
`numberOfLines`): la palabra se mide a su ancho natural de una sola
línea y, si no entra en la columna de ~63px, sigue de largo por
encima del espacio de los círculos vecinos en vez de ajustarse. Pasa
solo con las palabras más largas ("emocionado", "desmotivado",
"Energizado"); la mayoría entra sin problema. (Nota: en la práctica
`flexShrink: 0` no evitó el salto de línea — el texto seguía pasando a
un renglón más en vez de desbordar. Reemplazado en #108 por un ancho
fijo más generoso en el contenedor del texto.)

**Alternativas descartadas.**

- **Sacar `numberOfLines` sin más.** Es lo que se probó primero: sin
  ese límite pero sin `flexShrink: 0`, el nodo de texto se seguía
  midiendo contra el ancho disponible de la columna y el texto pasaba
  a una línea más (un tercer renglón en el círculo) en vez de
  desbordar — exactamente lo que se pidió evitar.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 108. El contenedor del texto de cada emoción se agranda para que las palabras largas entren en su propio renglón *(elección del usuario + fix)*

**Contexto.** El `flexShrink: 0` de #107 no evitó en la práctica que
una palabra larga pasara a un renglón más — el nodo de texto seguía
midiéndose contra el ancho de la columna del swatch (~63px) y
envolviendo ahí. Se pidió en cambio agrandar el espacio donde va el
texto de cada emoción, para que la palabra más larga entre en una sola
línea sin necesidad de desbordar ni de envolver.

**Decisión.** `labelLines` (el contenedor de las 1-2 líneas de palabra
debajo de cada círculo) pasa a tener un ancho fijo de **76px** —más
ancho que la columna de 1/5 que le toca al swatch de 44px (que ronda
los 60-65px)— calculado para que entre de una la palabra más larga del
dominio ("desmotivado"/"emocionado"/"Energizado", ~11 caracteres a
`fontSize: 11`). Como `item` tiene `alignItems: 'center'` y nada
recorta (`overflow: 'hidden'`), ese ancho extra se reparte centrado,
"invadiendo" un poco el `gap` de 8px hacia los swatches vecinos en vez
de la columna completa de al lado. Se sacó el `flexShrink: 0` de #107
(ya no hace falta: con el contenedor ancho, cada palabra entra sola en
su renglón sin que Yoga tenga que decidir si la achica o no).

**Alternativas descartadas.**

- **Agrandar todas las columnas del grid** (los 5 `item` de la
  primera fila, no solo el contenedor del texto) para que el swatch y
  el texto compartan el mismo ancho más generoso. Se descartó: el
  swatch (44px) nunca tuvo problema de espacio, achicar menos columnas
  por fila o agrandarlas todas movía el layout entero (separación
  entre círculos) por un problema que es puntual del texto.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 109. La barra de scroll persistente pasa a ser propia (JS), no nativa — no se veía en los APK de `eas build` *(elección del usuario + fix)*

**Contexto.** La `persistentScrollbar` nativa de #94 (en `ListCard` y
`DailyRoutineSummaryCard`) no aparecía en la app instalada desde un APK
de `eas build` (preview o production) — sí se veía corriendo en
desarrollo (Metro). El scroll en sí funcionaba perfecto en ambos casos;
solo la barrita visual nativa de Android no se pintaba en el build
standalone. No se encontró la causa exacta (probablemente algo del
tema/estilo nativo de Android que difiere entre el shell de desarrollo
y el build final), pero sin acceso al dispositivo para seguir
investigando ahí, se optó por sacarle la dependencia a lo nativo
directamente.

**Decisión.** Nuevo
[`PersistentScrollView`](src/presentation/components/PersistentScrollView.tsx):
envuelve un `ScrollView` normal (con `showsVerticalScrollIndicator=
{false}`, el indicador nativo apagado del todo) y dibuja su propia
barra — un `View` track absoluto a la derecha y un `Animated.View`
thumb cuya altura y posición se calculan en JS a partir de
`onLayout` (alto del contenedor), `onContentSizeChange` (alto del
contenido) y `onScroll` (posición actual, con `useNativeDriver: true`
vía `Animated.event` para que el thumb siga el scroll a 60fps sin ida
y vuelta al puente de JS). Se muestra solo si el contenido es más alto
que el contenedor (si no, no hay nada para scrollear). No depende de
ninguna prop/estilo nativo de la plataforma, así que se ve igual en
desarrollo y en cualquier build. `ListCard` (sus dos variantes) y
`DailyRoutineSummaryCard` pasan a usarlo en vez del `ScrollView` con
`persistentScrollbar` directo.

**Alternativas descartadas.**

- **Seguir investigando la causa nativa exacta** (tema de Android,
  diferencia entre el shell de Expo Go/dev client y el build de
  `eas build`, etc.) antes de tocar código. Se descartó por ahora: no
  hay acceso al dispositivo para diagnosticarlo más a fondo, y una
  barra en JS resuelve el pedido ("que la barra se vea") sin depender
  de entender esa diferencia.

**Consecuencias.** El thumb se mueve con `Animated.event` nativo
(`useNativeDriver: true`), pero el cálculo de su alto/rango sigue en
JS (recalculado en cada cambio de `containerHeight`/`contentHeight`) —
para las listas cortas de este caso (como mucho unas pocas decenas de
filas) no tiene impacto de performance perceptible. `npx tsc --noEmit`
y `npx expo export --platform android --output-dir dist-check`
corrieron limpios. (Nota: esta versión tenía un bug que escondía TODOS
los ítems — ver #110, corregido ahí.)

---

## 110. Fix: `PersistentScrollView` no mostraba ningún ítem — el `flex: 1` del `ScrollView` colapsaba a alto 0 *(fix)*

**Contexto.** Tras #109, las listas y "Rutina diaria" en Favoritos
dejaron de mostrar **cualquier** ítem apenas superaban el tope (8/15) —
peor que el problema original (al menos antes se veían los ítems, solo
faltaba la barra).

**Decisión.** La causa: en `PersistentScrollView`, el `maxHeight` que
pasa el que lo usa (`ListCard`/`DailyRoutineSummaryCard`) quedaba en el
`View` exterior (el que envuelve `ScrollView` + barra), y el
`ScrollView` de adentro tenía `flex: 1` en vez de ese estilo. Un hijo
con `flex: 1` dentro de una `View` sin alto definido no tiene nada
para "llenar" — Yoga lo colapsa a alto 0, y ahí no se ve ningún hijo
aunque estén todos renderizados. Se corrigió pasando el `style` (el
`maxHeight`) directo al `ScrollView` (que sí sabe resolver su propio
alto como el mínimo entre el contenido y ese `maxHeight`, sin
depender de flex) y dejando el `View` exterior sin estilo propio —
se achica solo al alto ya resuelto del `ScrollView`, que es lo único
que tiene adentro. Es, de hecho, el mismo acomodo que ya usaban
`ListCard`/`DailyRoutineSummaryCard` *antes* de #109 (el `ScrollView`
con `maxHeight` como hijo directo de una `View` sin alto propio), solo
que ahora envuelto una capa más para la barra.

**Consecuencias.** Es un bug de layout en JS puro, no algo específico
del build de `eas build` — se iba a reproducir igual en desarrollo.
`npx tsc --noEmit` y `npx expo export --platform android
--output-dir dist-check` corrieron limpios.

---

## 111. Fix: `PersistentScrollView` cerraba la app al tocar el scroll — se sacó `Animated`/driver nativo, el thumb pasa a estado de React común *(fix)*

**Contexto.** Después de #110 (ya mostraba los ítems y la barra), tocar
el scroll en el APK instalado **cerraba la app** sin un error visible
en pantalla — un crash nativo, no una excepción de JS con pantalla
roja, consistente con algo del lado nativo del `Animated` de React
Native (no `react-native-reanimated`) al engancharse al `onScroll` con
`useNativeDriver: true` en la Nueva Arquitectura (Fabric), un área
históricamente inestable en builds de release.

**Decisión.** Se sacó `Animated` por completo de
`PersistentScrollView`: en vez de un `Animated.Value` actualizado vía
`Animated.event(..., { useNativeDriver: true })` y un `Animated.View`
con la posición interpolada, el `onScroll` ahora es una función común
que guarda el offset en un `useState`, y la posición del thumb
(`translateY`) se calcula a mano cada render (`progress =
scrollOffset / maxScroll`, acotado a [0, 1], multiplicado por el
recorrido máximo) y se aplica con un `View` común. No hay ningún
`Animated`/driver nativo de por medio — el thumb se actualiza por el
ciclo normal de render de React en cada evento de scroll
(`scrollEventThrottle={16}`), sin la ruta que crasheaba.

**Alternativas descartadas.**

- **Diagnosticar la causa exacta del crash nativo** (leer logs de
  `adb logcat`, aislar si es específico de Fabric + `Animated` o de
  alguna interacción con `nestedScrollEnabled`) antes de tocar código.
  Se descartó por lo mismo que en #109: sin acceso al dispositivo para
  seguir esa pista, sacar la dependencia problemática (el driver
  nativo de `Animated`) resuelve el síntoma directamente, y una barra
  que se actualiza por estado común alcanza de sobra para listas
  cortas como las de este caso.

**Consecuencias.** El thumb ya no se mueve por el driver nativo de
`Animated` sino por un re-render de React en cada evento de scroll
(throttleado a 16ms) — para las listas cortas de este caso (como
mucho unas pocas decenas de filas) no se nota menos fluido.
`npx tsc --noEmit` y `npx expo export --platform android
--output-dir dist-check` corrieron limpios.

---

## 112. Fix: tildar una entrada de to-do en Favoritos/Listas hacía "saltar" la pantalla — se sacó el `reload()` completo de `onEntryToggled` *(fix)*

**Contexto.** Al tocar una fila de una to-do list (tildar/destildar),
la pantalla se desplazaba — reportado en el APK, no visto todavía en
desarrollo. `ListCard.onEntryToggled` llamaba a `vm.reload()` de la
pantalla completa (`useFavorites`/`useLists`): releía balance,
trackers, mood, orden guardado y, para **cada** lista favorita, sus
entradas — y subía `reloadTick`. Como el `useEffect` de `ListCard` que
repide sus entradas depende de `counts.total`/`counts.done` **y**
`reloadTick`, ese único toque disparaba un re-fetch (con su spinner de
carga, que achica y vuelve a crecer la vista) en **todas** las listas
desplegadas de la pantalla a la vez — no solo en la que se tocó —
además de releer todo lo demás sin necesidad. Esa cascada de
achicarse/agrandarse en varias cards a la vez es la causa más probable
del salto visual.

**Decisión.** Dos cambios, uno en cada capa:

- **`onEntryToggled` deja de llamar a `reload()`.** Pasa a avisar
  `(done: boolean)` con el nuevo estado, y
  `useFavorites`/`useLists` suman `bumpListDone(listId, done)`: ajusta
  en memoria el `done` de esa lista puntual (±1) en `counts`/`cards`,
  sin pedir nada a `AsyncStorage` ni tocar `reloadTick` — nada más
  cambia, así que ninguna otra `ListCard` desplegada se entera ni
  vuelve a pedir sus entradas.
- **La propia `ListCard` tampoco debe re-pedir las suyas.** Aunque ya
  no se dispara en cascada, `counts.done` de ESA lista sí cambia (es
  justo lo que `bumpListDone` actualiza), y el `useEffect` que repide
  entradas sigue viéndolo como dependencia — se agrega
  `skipNextCountsRefetch` (un `useRef`): `toggleEntryDone` lo prende
  antes de avisar a `onEntryToggled`, y el efecto lo apaga la primera
  vez que lo ve sin pedir nada, en vez de re-fetchear lo que
  `ListCard` ya tiene (correcto) en su propio estado local.

**Alternativas descartadas.**

- **Sacar `counts.total`/`counts.done` de las dependencias del
  `useEffect`.** Se descartó: esas dependencias existen a propósito
  (ver comentario de #93) para enterarse de ediciones hechas desde
  *afuera* de esta card (p. ej. desde `ListDetailScreen`) que cambian
  cuántas hay o cuántas están hechas; sacarlas de ahí reintroduciría
  exactamente ese bug.

**Consecuencias.** `npx tsc --noEmit` y `npx expo export --platform
android --output-dir dist-check` corrieron limpios. No se pudo
reproducir ni confirmar visualmente el salto (reportado solo en el
APK instalado) — si después de este cambio sigue pasando, hace falta
mirarlo con más detalle en el dispositivo.

---

## 113. Favoritos respeta el orden manual de Trackers/Listas; nuevo botón para ciclar el orden de las entradas de una lista en Favoritos *(elección del usuario)*

**Contexto.** Dos pedidos:

1. En Favoritos, los trackers y las listas salían en el orden de
   creación (el que devuelve el repositorio), sin importar el orden
   manual que el usuario ya armó en su propia pestaña (Trackers/Listas,
   con las flechas ▲▼ de #95) — si el tracker B se movió primero en su
   pestaña, en Favoritos seguía saliendo después del A.
2. Un botón nuevo en la card de una lista **en Favoritos**, a la
   izquierda del triángulo ▾/▸, que cicle cómo se ordenan sus entradas
   (fecha / alfabético / prioridad), cambiando de ícono según cuál esté
   activo (calendario / A-Z / bandera).

**Decisión.**

- **Orden de Favoritos = orden de la pestaña.** `useFavorites.reload()`
  suma `container.getTrackersOrder.execute()` y
  `container.getListsOrder.execute()` a la carga en paralelo, y les
  aplica `applyIdOrder` (de `core/utils/order.ts`, la misma función que
  ya usan `useTrackersViewModel`/`useLists`) a `allTrackers`/`allLists`
  **antes** de filtrar por favorito — como `.filter()` preserva el
  orden relativo, los favoritos quedan en el mismo orden que tienen en
  su pestaña, sin tocar el orden *entre categorías* (rutina/finanzas/
  mood/gimnasio/trackers/listas), que sigue siendo el de
  `favoritesOrder` (el reordenamiento de Favoritos en sí, con sus
  propias flechas).
- **Nuevo [`ListSortButton`](src/presentation/list/components/ListSortButton.tsx)**:
  botón de un solo ícono (sin texto, para entrar en el header
  compacto) que cicla `date → alpha → rating → date…` y muestra el
  ícono correspondiente (`Calendar`/`ArrowDownAZ`/`Flag` de
  `lucide-react-native`). `ListCard` suma estado `sort` (local,
  `ListSort`, por defecto prioridad en to-do / fecha en normales —
  mismo criterio que `useListDetail`) y lo pasa como segundo argumento
  a `container.getListEntries.execute(list.id, sort)` (el *usecase* ya
  soportaba un `sort` opcional, usado hasta ahora solo por el detalle
  completo de la lista). El botón se muestra únicamente cuando
  `compact` (Favoritos) — el detalle completo de una lista sigue con su
  propio selector segmentado (`ListSortSelector`, con texto, en vez de
  íconos) sin cambios.

**Alternativas descartadas.**

- **Guardar el criterio elegido** (por lista, persistido) en vez de
  que arranque siempre en el valor por defecto. Se descartó: el pedido
  no lo menciona, y es consistente con cómo ya se comporta el
  selector completo del detalle de la lista (`sortOverride` arranca en
  `null`/por defecto cada vez que se entra, en `useListDetail`).

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 114. Backup: opción de "Descargar" directo a una carpeta, sin pasar por compartir *(elección del usuario)*

**Contexto.** "Exportar datos" solo ofrecía `Sharing.shareAsync` —
abre el selector de apps de Android (mail, WhatsApp, Drive, etc.).
Se pidió una opción para **descargar el backup directo** a una carpeta
del teléfono, sin tener que elegir una app para mandarlo a ningún
lado.

**Decisión.** Nueva función `downloadData` en `useBackup.ts`, y un
botón **"Descargar backup (elegir carpeta)"** en `SettingsScreen`, al
lado del de "Exportar". Usa la API nueva de `expo-file-system` (la
que viene del import `'expo-file-system'` normal, no `/legacy` — la
app ya usaba la vieja ahí para `cacheDirectory`/`writeAsStringAsync`,
que sigue igual para "Exportar"): `Directory.pickDirectoryAsync()`
abre el picker nativo de carpetas (Storage Access Framework en
Android — el usuario puede navegar a "Descargas" o cualquier otra), y
`directory.createFile(nombre, 'application/json')` +
`file.write(json)` escribe el backup ahí directo. Si el usuario
cierra el picker sin elegir carpeta, la librería tira una excepción
("the file picker was cancelled..."); se detecta por texto
(`isPickerCancelled`, busca "cancel" en el mensaje) y se trata como
`idle`, no como error. (Nota: en #115 se agregó recordar la carpeta
elegida y abrir el picker ya posicionado en Descargas, para que en la
práctica no haga falta elegir nada después de la primera vez.)

**Alternativas descartadas.**

- **Guardar directo en una carpeta fija** (p. ej. el directorio
  público de Descargas) sin picker. Se descartó: en Android moderno
  escribir en almacenamiento público fuera del sandbox de la app
  necesita permisos de almacenamiento o el picker de SAF — no hay una
  ruta "directorio de descargas" writeable sin pedirle algo al
  usuario de todos modos, así que el picker (que además lo deja elegir
  cualquier carpeta, no solo Descargas) no agrega fricción extra real.

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 115. "Descargar backup" va directo a Descargas, sin elegir carpeta cada vez *(elección del usuario)*

**Contexto.** #114 abría el picker de carpetas **cada vez** que se
tocaba "Descargar". Se pidió que vaya directo a **Descargas**, sin
elegir carpeta.

**Decisión.** Android no deja escribir en una carpeta pública sin
algún permiso de por medio — no existe una ruta 100% silenciosa sin
que el usuario intervenga ni una sola vez (ver "Alternativas
descartadas" de #114) —, así que la solución es acercarse lo más
posible a eso con dos cambios:

- **El picker abre directo en Descargas.**
  `Directory.pickDirectoryAsync(initialUri)` acepta una URI inicial;
  se le pasa la URI "bien conocida" de la carpeta pública de Descargas
  en Android
  (`content://com.android.externalstorage.documents/document/primary%3ADownload`),
  así que el picker nativo ya abre ahí — alcanza con tocar "Usar esta
  carpeta", sin tener que navegar. (Nota: en #116 pasó a ser Documentos
  en vez de Descargas, con una subcarpeta propia.)
- **Se recuerda la elección.** Nuevo
  [`BackupFolderRepository`](src/domain/backup/repositories/BackupFolderRepository.ts)
  (con su impl en AsyncStorage y los usecases
  `GetBackupFolderUri`/`SaveBackupFolderUri`, mismo patrón que
  `ListsOrderRepository` de #95): guarda la URI que devolvió el picker.
  La próxima vez que se toca "Descargar", `getDownloadFolder()`
  reconstruye un `Directory` con esa URI guardada y, si `.exists` da
  `true` (sigue existiendo y el permiso de SAF —persistente, Android lo
  retiene entre reinicios— sigue vigente), escribe ahí directo **sin
  mostrar el picker**. Si la carpeta ya no existe o el permiso se
  revocó, cae de nuevo al picker (ya posicionado en Descargas). Esta
  URI es a propósito **independiente del backup en sí**: vive en su
  propia clave de AsyncStorage (`BACKUP_FOLDER_URI_KEY`), fuera de
  `STORAGE_KEYS`/`ALL_STORAGE_KEYS` — es un detalle de este
  dispositivo/instalación (una URI de SAF no tiene sentido en otro
  teléfono o tras reinstalar), así que no viaja dentro de un backup
  exportado ni se pisa al importar uno.

**Alternativas descartadas.**

- **Guardar la URI como parte de `userProfile` u otra clave ya
  incluida en el backup.** Se descartó exactamente por lo anterior:
  mezclarla con datos que sí viajan en el backup la expondría a
  pisarse con una URI inválida de otro dispositivo al importar.

**Consecuencias.** La primera vez que se usa "Descargar" en una
instalación (o si el permiso se revoca más adelante desde Ajustes de
Android) todavía hace falta confirmar el picker una vez — no hay forma
de evitarlo del todo en Android sin permisos de almacenamiento más
amplios, que no se pidieron. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 116. "Descargar backup" va a Documentos/TrackerAppBackups en vez de Descargas *(elección del usuario)*

**Contexto.** Se pidió cambiar el destino de #115 de Descargas a
**Documentos**, y que ahí se cree (o reuse) una subcarpeta propia
llamada **"TrackerAppBackups"** en vez de dejar los backups sueltos
entre el resto de los archivos de Documentos.

**Decisión.**

- **`ANDROID_DOCUMENTS_URI`** reemplaza a la URI de Descargas que
  usaba `pickDirectoryAsync` como `initialUri` — mismo mecanismo de
  #115, el picker ahora abre directo en Documentos.
- **Nueva `ensureBackupSubfolder(parent)`**: lista el contenido de la
  carpeta elegida (`parent.list()`, sincrónico) buscando una `Directory`
  ya llamada `TrackerAppBackups`; si no está, la crea
  (`parent.createDirectory('TrackerAppBackups')`). Hace falta este
  paso en vez de crearla a ciegas cada vez porque `createDirectory`
  sobre Storage Access Framework no es idempotente — si ya existe una
  con ese nombre, el proveedor de documentos crea otra con el nombre
  repetido (p. ej. "TrackerAppBackups (1)") en vez de reusarla o
  fallar, así que sin este chequeo cada descarga iría generando una
  subcarpeta nueva.
- `getDownloadFolder()` guarda (`saveBackupFolderUri`) la URI de la
  **subcarpeta** en sí (no la de Documentos) — así, la próxima vez,
  reusarla directo (vía `.exists`) no necesita repetir el paso de
  buscar/crear la subcarpeta, solo en la primera vez o si hay que
  volver a pedir permiso.

**Alternativas descartadas.**

- **Guardar la URI de Documentos y recalcular la subcarpeta en cada
  descarga.** Se descartó: guardar directo la URI de la subcarpeta
  evita repetir el `list()`/`createDirectory` de más en el caso común
  (que ya existe y el permiso sigue vigente).

**Consecuencias.** Ninguna. `npx tsc --noEmit` y `npx expo export
--platform android --output-dir dist-check` corrieron limpios.

---

## 117. Nueva pestaña "Anotaciones": grupos de notas tipo chat (mensajes, responder deslizando, editar/borrar con selección múltiple) *(elección del usuario)*

**Contexto.** Pestaña nueva, "Anotaciones": grupos con nombre (como las
listas) donde adentro se escribe en un chat tipo WhatsApp — mensajes con
hora, separador de día, links tocables, responder a un mensaje
deslizándolo hacia la derecha, y editar/borrar con la misma selección
múltiple (mantener presionado) que ya usan listas y rutina diaria. Los
grupos aparecen en la pestaña Anotaciones y, si son favoritos, en
Favoritos también — ahí (y en el propio menú de Anotaciones) la card
muestra el nombre, una vista **de tamaño fijo** del chat (no crece,
siempre con scroll) y un campo para mandar un mensaje sin entrar al
grupo.

**Decisión.** Capa por capa, calcada de Listas (el feature más
parecido) en todo lo que no es nuevo:

- **Dominio** (`src/domain/note/`): `Note` (`id, name, createdAt,
  favorite`, igual que `List` sin `isTodo`/`pinnedExpanded`) y
  `NoteMessage` (`id, noteId, text, sentAt` —fecha y hora completa,
  no solo el día—, `replyToId?`, `editedAt?`). Usecases 1:1 con los de
  listas: `GetNotes`/`GetNote`/`CreateNote`/`SetNoteFavorite`/
  `DeleteNote` (borra los mensajes del grupo antes que el grupo,
  mismo orden que `DeleteList`) y `GetNoteMessages`/`SaveNoteMessage`
  (crear o editar según venga `id`, igual que `SaveListEntry`) /
  `DeleteNoteMessage` (**un solo id por llamada** — el borrado de
  varios a la vez es un loop secuencial en el viewmodel, no un usecase
  en lote; ver más abajo).
- **Datos** (`src/data/note/`): mismo esquema que listas — un blob
  indexado por id para los grupos
  (`NoteLocalDataSource`/`NoteRepositoryImpl`) y uno anidado
  `{ [noteId]: { [messageId]: dto } }` para los mensajes
  (`NoteMessageLocalDataSource`/`NoteMessageRepositoryImpl`, calcado
  de `ListEntryLocalDataSource`). Dos claves nuevas en
  `STORAGE_KEYS` (`notes`, `noteMessages`) — quedan incluidas en
  `ALL_STORAGE_KEYS`, así que el backup las cubre sin tocar nada del
  feature de backup.
- **Responder deslizando**: `NoteMessageBubble` tiene su propio
  `usePanGesture` (mismos umbrales que el resto de los swipes de la
  app — carrusel de Favoritos, calendarios) que solo reacciona hacia
  la derecha y se desactiva por completo mientras hay una selección
  múltiple activa. El arrastre se maneja con `useState` común, **no**
  con `Animated` — esta sesión ya tuvo dos bugs de producción por
  mezclar `Animated` con el driver nativo bajo la Nueva Arquitectura
  (#110/#111, en `PersistentScrollView`), así que para el arrastre de
  una sola fila (donde el costo de un re-render de JS es insignificante)
  se evitó esa clase de riesgo directamente. La burbuja siempre vuelve
  a su lugar al soltar, haya pasado el umbral o no; si lo pasó, se
  arma un "Respondiendo a…" arriba del campo de escribir
  (`NoteComposer`), que se manda junto con el próximo mensaje y se
  limpia después.
- **Selección múltiple → editar/borrar**: mismo patrón que
  `useListDetail` (mantener presionado arranca la selección,
  tocar otro mensaje con selección activa lo suma/saca,
  `deleteSelected` es un loop secuencial —no `Promise.all`— por la
  misma razón de #91: el data source hace lectura-modificación-
  escritura sobre el mismo blob, y en paralelo un borrado puede
  "revivir" lo que el otro acababa de borrar). Lo nuevo:
  [`SelectionBar`](src/presentation/components/SelectionBar.tsx) suma
  un `onEdit?` opcional (un lápiz antes del tacho) que **quien la usa**
  decide pasar solo cuando hay exactamente un mensaje seleccionado;
  tocarlo precarga ese mensaje en el campo de escribir (con una cinta
  "Editando mensaje") en vez de abrir nada aparte.
- **Si el mensaje citado se borra**: no hay cascada ni bloqueo —
  `replyToId` no se valida contra nada en el dominio; `NoteMessageBubble`
  busca el mensaje citado en lo que ya tiene cargado y, si no lo
  encuentra, muestra "Mensaje eliminado" en vez de romper nada.
- **Card de un grupo** ([`NoteCard`](src/presentation/note/components/NoteCard.tsx)):
  a diferencia de `ListCard` (que crece hasta un tope y ahí recién
  empieza a scrollear), ésta es **siempre** de alto fijo —con
  [`PersistentScrollView`](src/presentation/components/PersistentScrollView.tsx)
  de entrada, incluso sin mensajes—, tal como se pidió ("tamaño fijo...
  no se agranda más"). Pide sus propios mensajes directo
  (`container.getNoteMessages`), igual que `ListCard` pide sus propias
  entradas — ninguna pantalla que la usa necesita precargarlos.
  Sin swipe-para-responder ni selección múltiple ahí: esas dos viven
  solo en el chat completo, para no meter un segundo gesto horizontal
  por fila adentro de `FavoritesCarousel` (que ya tiene el suyo).
  (Nota: el pedido de responder se habilitó en la card después de
  todo — ver #118; selección múltiple sigue sin estar ahí.)
- **Favoritos**: `useFavorites` suma `getNotes()` al `Promise.all`,
  filtra por favorito y arma una card `'notes'` igual que
  `trackersCard`/`listsCard`, mostrada con el mismo `FavoritesCarousel`
  si hay más de una. El botón "＋ Crear" de Favoritos
  (`CreateChooserModal`) suma "Anotación" como cuarta opción.
  **Sin orden manual propio** (como sí tienen listas/trackers desde
  #95/#113) — no se pidió; quedan en el orden de creación. Queda
  anotado como mejora pendiente si se pide después.
- **Menú y navegación**: "Anotaciones" se agrega a
  [`HubMenuButton`](src/presentation/navigation/HubMenuButton.tsx) (no
  hay tabs de verdad en esta app — son pantallas de un mismo stack,
  alcanzables desde ese menú desplegable) y dos rutas nuevas en
  `AppNavigator`/`RootStackParamList`: `Notes` (el hub) y `NoteDetail`
  (el chat). No se tocó `HomeTab`/`HOME_TABS` (qué pestaña abre la app
  al iniciar) — mismo criterio que "Rutina diaria", que tampoco es
  elegible ahí.

**Alternativas descartadas.**

- **Un usecase de borrado en lote** (`DeleteNoteMessages(noteId, ids)`)
  con el loop secuencial adentro. Se descartó para quedar consistente
  con cómo ya lo resuelve `useListDetail.deleteSelected` en este mismo
  código base: el loop vive en el viewmodel, llamando al usecase de
  un solo id tantas veces como haga falta — no hay un segundo patrón
  de borrado en lote divergente.
- **Un ícono "lápiz" para editar** en vez de precargar el mensaje en el
  campo de escribir con una cinta. Se descartó: no hay un modal de
  edición separado en todo este feature (a propósito, para que sea
  "escribir y enviar" nomás); reusar el mismo campo de abajo, con una
  cinta que avisa qué se está haciendo, es más simple y consistente
  con cómo ya funciona "Respondiendo a…".

**Consecuencias.** No se pudo probar en un dispositivo real la
interacción de gestos (deslizar para responder mientras convive con
mantener presionado para seleccionar, y con el scroll vertical del
chat) — están armados con los mismos umbrales que ya usan el carrusel
de Favoritos y los calendarios de esta app, pero si algo no se siente
bien en el teléfono, hay que ajustarlo ahí. `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios.

## 118. Anotaciones: ajustes tras el primer uso (teclado, scroll de la card, responder desde la card, buscar, burbujas a la derecha) *(elección del usuario)*

**Contexto.** Primera ronda de ajustes sobre #117 después de probarlo:
el teclado tapaba el campo de escribir en el chat completo; la
vista recortada de la card (menú de Anotaciones) no arrancaba mostrando
el último mensaje ni dejaba scrollear; no se podía responder desde esa
misma card; faltaba una forma de buscar mensajes dentro de una
anotación; y los mensajes debían salir alineados a la derecha, no a la
izquierda (como en la mayoría de los chats, el propio usuario a la
derecha).

**Decisión.**

- **Teclado tapando el campo** ([`KeyboardAvoider`](src/presentation/components/KeyboardAvoider.tsx)):
  el chat completo es el primer uso de este componente sobre una
  **pantalla** entera en vez de un `Modal`. En Android, una pantalla
  normal ya se reajusta sola (`windowSoftInputMode="resize"`, default
  de Expo) — sumarle encima el `behavior="height"` de
  `KeyboardAvoidingView` duplicaba el ajuste y el campo quedaba tapado
  en vez de subir. Se agregó un prop opcional
  `disableHeightBehaviorOnAndroid` (default `false`, no toca ninguno
  de los ~10 usos existentes dentro de modales, que sí lo necesitan) y
  [`NoteDetailScreen`](src/presentation/screens/note-detail/NoteDetailScreen.tsx)
  lo pasa en `true`.
  (Nota: este diagnóstico resultó equivocado — desactivar el ajuste
  dejó el campo igual de tapado. La causa real y el prop que lo
  reemplazó están en #119.)
- **La card no arrancaba abajo ni scrolleaba**
  ([`PersistentScrollView`](src/presentation/components/PersistentScrollView.tsx)):
  dos bugs distintos. (1) Faltaba pasar `nestedScrollEnabled` en
  [`NoteCard`](src/presentation/note/components/NoteCard.tsx) — a
  diferencia de `ListCard`, que ya lo pasa, acá se había quedado afuera
  y Android dejaba que el scroll vertical lo capturara el `ScrollView`
  de afuera (la pantalla de Anotaciones o el carrusel de Favoritos) en
  vez del de la card. (2) No había forma de arrancar "desde abajo":
  se agregó un prop nuevo `stickToBottom` a `PersistentScrollView`
  (sin tocar a nadie más, que no lo pasa) que, en
  `onContentSizeChange`, hace `scrollToEnd` — sin animación la primera
  vez (para no verse un salto al abrir la card) y animado después (si
  llega un mensaje nuevo mientras está abierta).
- **Responder desde la card**: reversión deliberada de un criterio de
  #117 ("sin swipe-para-responder... para no meter un segundo gesto
  horizontal adentro de `FavoritesCarousel`"). El usuario lo pidió
  explícitamente para "el item de anotación de menú", así que
  `NoteCard` ahora tiene su propio estado `replyTarget` y pasa
  `onSwipeReply` a cada `NoteMessageBubble` y `replyTarget`/
  `onCancelReply` a su `NoteComposer`, igual que el chat completo. El
  riesgo de conflicto con el gesto horizontal del carrusel de
  Favoritos no se resolvió con un prop aparte: el swipe-para-responder
  ya es solo-hacia-la-derecha con `failOffsetY`, y el carrusel reacciona
  a su propio gesto en el contenedor de afuera, no en cada fila — se
  deja así y, si en la práctica compiten mal, se ajusta después (ver
  gap al final del archivo).
- **Buscar mensajes**: ícono de lupa (`lucide-react-native`'s `Search`)
  al lado de "Borrar" en el header de
  [`NoteDetailScreen`](src/presentation/screens/note-detail/NoteDetailScreen.tsx).
  Abre un estado `searchOpen`/`searchQuery` nuevo en
  [`useNoteDetail`](src/presentation/note/viewmodels/useNoteDetail.ts),
  mutuamente excluyente con la selección múltiple (abrir uno cierra el
  otro, mismo criterio que responder/editar). Mientras está abierta,
  una barra de búsqueda ocupa el lugar de la `SelectionBar` arriba del
  chat, y la lista visible se filtra por texto (sin distinguir
  mayúsculas) antes de agruparla por día — una simplificación
  deliberada: los separadores de día quedan calculados sobre los
  resultados filtrados, no sobre el chat completo.
- **Burbujas a la derecha**: `NoteMessageBubble.bubble` pasa de
  `alignSelf: 'flex-start'` a `'flex-end'` — afecta por igual al chat
  completo y a la vista recortada de la card, porque es el mismo
  componente y el mismo estilo en los dos lugares.

**Alternativas descartadas.**

- **Cambiar el default de `KeyboardAvoider` a `behavior: undefined` en
  Android** en vez de un prop opuesto. Se descartó: cambiaría el
  comportamiento de los ~10 usos existentes dentro de `Modal` (donde
  Android *no* reajusta solo y sí hace falta `behavior="height"`), que
  nunca se reportaron con problemas.
- **Pasar una `ref` imperativa a `PersistentScrollView`** en vez de un
  prop declarativo (`stickToBottom`). Se descartó: ningún otro uso del
  componente necesita una ref, y el prop declarativo alcanza para el
  único caso que lo necesita.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real si el
swipe-para-responder dentro de la card convive bien con el gesto
horizontal del carrusel de Favoritos (ver gap al final del archivo).

## 119. Anotaciones: segunda ronda — franja completa para responder, teclado (de nuevo) y cards colapsables *(elección del usuario)*

**Contexto.** El usuario probó #118 e indicó que (1) el teclado seguía
tapando el campo de escribir del chat completo a pesar del cambio de
#118, (2) el gesto de deslizar para responder solo se podía empezar
tocando justo el globo del mensaje, no en cualquier parte de la fila
("franja"), y (3) pidió que las anotaciones (card, en el menú y en
Favoritos) se puedan colapsar mostrando solo el nombre y el campo de
escribir.

**Decisión.**

- **Teclado, diagnóstico corregido**: el de #118 (doble ajuste entre
  el `resize` nativo de Android y el `behavior="height"` de
  `KeyboardAvoidingView`) estaba mal — desactivar el ajuste no
  arregló nada, así que el `resize` nativo en realidad no estaba
  compensando como se esperaba. La causa real: desde Android 15 (y el
  edge-to-edge que trae por default Expo/React Native en SDKs
  recientes), `windowSoftInputMode="resize"` deja de redimensionar la
  ventana como antes — el teclado ya no corre la actividad, así que
  **sí** hace falta que `KeyboardAvoidingView` haga el ajuste él
  mismo. El problema entonces es `behavior="height"` específicamente:
  ese modo necesita remedir su propio alto (`onLayout`) y restarle el
  alto del teclado, medición que bajo edge-to-edge puede llegar tarde
  o desactualizada. `behavior="padding"` no tiene ese problema: solo
  suma `paddingBottom`, sin depender de remedirse. Se reemplazó el
  prop `disableHeightBehaviorOnAndroid` (binario, apagar/prender) por
  `androidBehavior?: 'height' | 'padding'` (default `'height'`, el
  mismo comportamiento de siempre para los ~10 modales) en
  [`KeyboardAvoider`](src/presentation/components/KeyboardAvoider.tsx),
  y `NoteDetailScreen` pasa `androidBehavior="padding"`. Diagnosticado
  vía `WebFetch` a los docs versionados de Expo (`android.softwareKeyboardLayoutMode`)
  y una búsqueda sobre el bug conocido de edge-to-edge con
  `KeyboardAvoidingView` en Android — no se pudo confirmar en un
  dispositivo real, así que si `padding` tampoco alcanza, el próximo
  paso sería `react-native-keyboard-controller` (nueva dependencia,
  no instalada todavía).
  (Nota: tampoco alcanzó — capturas reales mostraron el campo
  tapado/desaparecido igual con `padding`. Se abandonó
  `KeyboardAvoidingView` del todo para esta pantalla; ver #120.)
- **Franja completa para responder**
  ([`NoteMessageBubble`](src/presentation/note/components/NoteMessageBubble.tsx)):
  el `GestureDetector` envolvía solo la burbuja (`bubble`, que tiene
  `maxWidth: '85%'` y queda alineada a la derecha) — el swipe no se
  podía empezar tocando el espacio vacío a la izquierda de la burbuja,
  dentro de la misma fila. Se agregó un contenedor nuevo
  (`swipeStrip`, ancho completo de la fila) que envuelve la burbuja y
  el ícono de respuesta, y el `GestureDetector` ahora mide ese
  contenedor en vez de la burbuja — el área táctil del gesto pasa a
  ser toda la franja de la fila, no solo donde se ve el globo.
- **Cards colapsables**
  ([`NoteCard`](src/presentation/note/components/NoteCard.tsx)): mismo
  patrón que el triángulo de `ListCard` — un botón al lado de la
  estrella de favorito que alterna un estado local `expanded` (arranca
  en `true`, sin persistir entre sesiones: no se pidió que recuerde el
  estado, a diferencia del pin de listas). Colapsada, se esconde solo
  la vista del chat (`PersistentScrollView`); el nombre y el
  `NoteComposer` siguen siempre visibles, como se pidió.

**Alternativas descartadas.**

- **`react-native-keyboard-controller`** para el teclado. Es la
  solución más robusta y la que recomienda la comunidad para este bug
  específico de edge-to-edge, pero agrega una dependencia nativa nueva
  (requiere `react-native-reanimated`, no instalado en este proyecto)
  y un rebuild — se prueba primero la opción sin dependencias nuevas
  (`behavior="padding"`) antes de ese costo mayor.
- **Persistir el estado colapsado/expandido de una anotación** (como
  `list.pinnedExpanded`). Se descartó: no se pidió, y agregaría un
  campo nuevo a `Note` solo para esto — si después se quiere que
  recuerde el estado, se puede agregar igual que se hizo con listas.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. El arreglo del teclado es la segunda vuelta sobre
el mismo bug sin poder probarlo en un dispositivo real — si
`androidBehavior="padding"` tampoco alcanza, el próximo paso realista
es `react-native-keyboard-controller`.

## 120. Anotaciones: tercer intento del teclado tapado — abandonar `KeyboardAvoidingView` en Android para esta pantalla *(elección del usuario)*

**Contexto.** El usuario mandó capturas reales: con `androidBehavior="padding"`
(#119) el campo de escribir seguía sin verse con el teclado abierto —
en una captura el teclado de Gboard se veía reducido a solo la tira de
sugerencias (sin las teclas), y en la otra, con el teclado ya
desplegado del todo, el campo para escribir directamente no estaba en
pantalla (ni tapado parcialmente: ausente). Dos intentos con
`KeyboardAvoidingView` (`height` en #118, `padding` en #119) fallaron
de formas distintas, así que el problema no es el modo elegido sino
depender de `KeyboardAvoidingView` en sí en esta pantalla bajo
edge-to-edge.

**Decisión.** Se abandonó `KeyboardAvoidingView` para
[`NoteDetailScreen`](src/presentation/screens/note-detail/NoteDetailScreen.tsx)
en Android (en iOS, donde nunca se reportó el problema, sigue usando
`KeyboardAvoider` igual que antes) y se reemplazó por una medición
manual: un hook local, `useAndroidKeyboardHeight`, escucha
`Keyboard.addListener('keyboardDidShow' | 'keyboardDidHide', ...)` —
los mismos eventos nativos que usa por dentro `KeyboardAvoidingView` —
y guarda `e.endCoordinates.height` en estado. Ese número se aplica
directo como `paddingBottom` del contenedor que envuelve el chat y el
composer (en vez de envolver todo en un `KeyboardAvoidingView`), así
que no hay ningún remedido de alto propio de por medio (la sospecha
en #119 sobre por qué `height` fallaba) ni nada atado al modo
`resize`/`pan` de la ventana (la sospecha de #118) — es aritmética
simple: cuando el teclado mide X de alto, el contenedor se achica X.

**Alternativas descartadas.**

- **Seguir ajustando `KeyboardAvoidingView`** (un tercer `behavior` o
  `keyboardVerticalOffset`). Se descartó: ya se probaron sus dos únicos
  modos (`height` y `padding`) y los dos fallaron de formas distintas
  bajo esta combinación de edge-to-edge + pantalla completa (no
  modal) — seguir iterando sobre el mismo componente sin poder probar
  en un dispositivo real es apostar a ciegas.
- **`react-native-keyboard-controller`.** Sigue siendo la opción más
  robusta y la que recomienda la comunidad para este bug, pero agrega
  una dependencia nativa nueva (y `react-native-reanimated` como
  dependencia transitiva) y un rebuild completo. Se prueba primero la
  medición manual —no agrega dependencias, y al ser un cambio 100% JS
  se puede probar incluso vía `expo-updates` (ya instalado en este
  proyecto) sin un build nuevo de EAS— antes de ese costo mayor.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Tercera vuelta sobre el mismo bug sin poder
probarlo en un dispositivo real — si la medición manual tampoco
alcanza, el próximo paso es `react-native-keyboard-controller`.
(Nota: el usuario confirmó que #120 arregló el chat completo — el
problema que quedaba era otro, en la card compacta de la pestaña
Anotaciones y en Favoritos, no cubierto por este cambio; ver #121.)

## 121. Anotaciones: el campo de la card compacta (menú y Favoritos) también quedaba tapado por el teclado *(elección del usuario)*

**Contexto.** El usuario confirmó que #120 arregló el teclado en el
chat completo, pero "en la pestaña anotaciones y en menú favoritos no
anda" — ahí el campo de escribir es el de
[`NoteCard`](src/presentation/note/components/NoteCard.tsx), que **no**
está anclado al fondo de toda la pantalla como en el chat: vive
mezclado con el resto de las cards dentro del `ScrollView` de
[`NotesScreen`](src/presentation/screens/notes/NotesScreen.tsx) o de
[`FavoritesScreen`](src/presentation/screens/favorites/FavoritesScreen.tsx).
La solución de #120 (medir el teclado y sumar `paddingBottom` al
contenedor entero) no aplica acá: no hay "un" campo fijo al que
agregarle padding — podría ser el campo de cualquiera de varias cards,
en cualquier posición del scroll.

**Decisión.** Para este caso (un campo en cualquier posición dentro de
un `ScrollView` largo, no anclado al fondo) la solución correcta es
desplazar el scroll hasta ese campo puntual, no agregar padding global.
En vez de reimplementar esa medición a mano, se usó el mecanismo que
ya trae `ScrollView` para esto mismo:
`scrollResponderScrollNativeHandleToKeyboard(nodeHandle, additionalOffset, preventNegativeScrollOffset)`
—un método público de la instancia, confirmado leyendo el código fuente
de `react-native` en este proyecto (no es una suposición): mide la
posición del campo enfocado contra el propio `ScrollView` y lo
desplaza para que quede arriba del teclado, usando el `screenY` real
del teclado (`Keyboard.addListener('keyboardDidShow', ...)`, que
"ScrollView" ya escucha internamente) — no depende de que la ventana se
redimensione, así que no debería verse afectado por edge-to-edge (el
problema de fondo en #118/#119/#120).

Cambios: `NoteComposer` suma un prop `onFocus` opcional que pasa
directo al `TextInput`; `NoteCard` suma `onComposerFocus`, que reenvía
a `NoteComposer`; `NotesScreen` y `FavoritesScreen` tienen cada uno su
propio `ref` al `ScrollView` principal y le pasan a cada `NoteCard` un
`onComposerFocus` que llama a
`scrollRef.current.scrollResponderScrollNativeHandleToKeyboard(event.target, 16, true)`
con el handle que ya trae el propio evento de foco (`event.target`,
tipado `number | HostInstance`, sin necesitar `findNodeHandle`).

**Alternativas descartadas.**

- **Medir a mano con `UIManager.measureLayout` + `scrollTo`** (igual
  idea que #120, pero localizando el campo). Se descartó: es
  literalmente lo que hace `scrollResponderScrollNativeHandleToKeyboard`
  por dentro — reimplementarlo a mano solo agrega superficie para un
  cuarto bug de teclado sin ganar nada.
- **Agregar un `KeyboardAvoidingView` envolviendo cada `NoteCard`**. Se
  descartó: cada card se desplazaría independientemente de las demás,
  sin noción de "dónde está en el scroll de afuera" — el resultado
  sería un salto raro, no un scroll suave hasta el campo.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sin poder probarlo en un dispositivo real — es la
cuarta vuelta sobre el teclado en Anotaciones, aunque esta vez con una
API pública y documentada de `ScrollView` en vez de una suposición
sobre `windowSoftInputMode`/edge-to-edge.
(Nota: tampoco funcionó — capturas reales mostraron la pantalla sin
moverse nada al aparecer el teclado, tapando todo lo de abajo. La
causa y el reemplazo están en #122.)

## 122. Anotaciones: quinto intento del teclado — `scrollResponderScrollNativeHandleToKeyboard` no se podía usar desde `onFocus` *(elección del usuario)*

**Contexto.** El usuario mandó capturas: con el cambio de #121, la
pantalla de Favoritos (mismo problema en Anotaciones) no se movía
*nada* al enfocar el campo de una `NoteCard` — el teclado tapaba todo
lo de abajo exactamente igual que antes del cambio.

**Decisión.** El bug de #121 era de **momento**, no de mecanismo:
`scrollResponderScrollNativeHandleToKeyboard` calcula el
desplazamiento usando el alto del teclado que su propio `ScrollView`
ya tiene guardado (`_keyboardMetrics`) en el instante en que se lo
llama — y se lo estaba llamando desde `onFocus`, que dispara **antes**
de que el teclado termine de abrirse (en ese momento ese alto todavía
es `0`/desconocido). Confirmado leyendo el código fuente de
`ScrollView.js` en este proyecto: si no hay métricas, reintenta una
sola vez con `setTimeout(0)`, un margen demasiado corto para que el
teclado ya haya terminado de animarse.

La solución: separar "cuándo se enfocó el campo" de "cuándo se
desplaza". Se armó un hook nuevo,
[`useScrollComposerIntoView`](src/presentation/note/useScrollComposerIntoView.ts),
usado por ambas pantallas:

- `onComposerFocus` (en `onFocus` del campo) solo guarda el *tag*
  nativo del campo enfocado en un `ref` — no desplaza nada todavía.
- Un listener propio de `Keyboard.addListener('keyboardDidShow', ...)`
  —que sí trae el alto/posición real y definitiva del teclado,
  porque ese evento recién se dispara cuando el teclado terminó de
  abrirse— mide en ese momento dónde quedó el campo guardado
  (`UIManager.measureInWindow`, confirmado en el código fuente de
  `UIManager.js` que funciona igual con o sin la Nueva Arquitectura:
  rama explícita para tags de Fabric) y, si el teclado lo tapa
  (`top + height > endCoordinates.screenY`), desplaza el `ScrollView`
  lo que hace falta (`scrollTo`, usando el scroll actual —trackeado a
  mano con un `onScroll`, igual que ya hace `PersistentScrollView`—
  más el solape más un margen de 16).

**Alternativas descartadas.**

- **Agrandar el `setTimeout` interno** (no es posible: es código de
  `react-native`, no de este proyecto) o **reintentar
  `scrollResponderScrollNativeHandleToKeyboard` varias veces con
  reintentos propios**. Se descartó: seguiría siendo una adivinanza de
  timing en vez de reaccionar al evento real que ya existe para esto
  (`keyboardDidShow`).
- **`react-native-keyboard-controller`.** Sigue siendo la opción más
  robusta a largo plazo, pero la medición manual —ahora corregida para
  reaccionar al evento correcto— no agrega dependencias y es 100% JS
  (se puede probar vía `expo-updates` sin build nuevo). Se mantiene
  como script la próxima alternativa si esto tampoco alcanza.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Quinta vuelta sobre el mismo bug sin poder probarlo
en un dispositivo real — pero esta vez el diagnóstico es concreto y
verificable en el código fuente de React Native (un problema de orden
de eventos, no una suposición sobre edge-to-edge), a diferencia de los
intentos anteriores.
(Nota: el usuario identificó la causa de raíz antes de poder probar
este arreglo — ver #123, que reemplaza todo este enfoque de "desplazar
el scroll hasta el campo" por uno distinto.)

## 123. Reemplazo de raíz: panel flotante arriba del teclado para campos adentro de una card con scroll (anotaciones, comentario de tracker, descripción de mood) *(elección del usuario)*

**Contexto.** Después de cinco vueltas fallidas tratando de que el
teclado no tape un campo que vive **adentro de una card, dentro de un
`ScrollView` largo** (#109→#122, todas sobre la card de una
anotación), el usuario identificó la causa de raíz con precisión:
> "en una anotación, el lugar donde se muestra el texto es un
> componente aparte y se levanta, en cambio, en el menú anotaciones/
> favoritos es el ítem el que tiene este teclado."
Es decir: en el chat completo, el campo está anclado al fondo de toda
la **pantalla** (un componente aparte, fuera del scroll) y ahí sí se
lo puede desplazar con el teclado (#120, confirmado funcionando). En
la card compacta, el campo vive **adentro del ítem que scrollea**
—junto con el resto de las cards del menú de Anotaciones o de
Favoritos— y ningún mecanismo de "calculá la posición y desplazá el
scroll" resultó confiable ahí (#121 llamaba mal la API, #122 la
llamaba bien pero seguía siendo frágil). El usuario pidió, en vez de
seguir en esa línea, una solución estructuralmente distinta: al tocar
para escribir, mostrar un cuadro de texto con botón de enviar
**temporal, arriba del teclado** — y aplicar lo mismo al comentario de
los trackers y a la descripción del mood tracker, que tienen
exactamente el mismo problema (campos adentro de una card con scroll).

**Decisión.** En vez de mover el *scroll* hasta el campo, se mueve el
*campo* fuera del scroll: el valor sigue viviendo donde vivía (el
estado del viewmodel de cada card), pero el campo de texto de verdad
ya no se renderiza adentro de la card — se renderiza en un panel
flotante nuevo, [`KeyboardFloatingPanel`](src/presentation/components/KeyboardFloatingPanel.tsx),
montado en un `Modal` (`transparent`, `animationType="fade"`,
ventana nativa aparte) con el mismo `KeyboardAvoider` **por defecto**
(`behavior="height"` en Android) que ya usan sin problemas los otros
~10 modales de esta app — porque, a diferencia de una pantalla común,
un `Modal` no tiene edge-to-edge, así que ese modo sí funciona ahí
(la razón de fondo detrás de #118/#119/#120/#121/#122: todos esos
intentos fallaron porque intentaban resolver, de distintas formas, un
problema de pantalla-con-edge-to-edge o de scroll-con-contenido-largo;
acá se evita directamente el problema metiendo el campo en un
`Modal`, el único lugar donde ya se sabía, desde el principio de la
sesión, que el teclado se maneja bien).

Dentro de cada card, en el lugar donde antes estaba el campo real
ahora hay una vista "de mentira" con la misma pinta (muestra el texto
ya escrito o el placeholder) que, al tocarla, abre el panel:

- **`NoteCard`**: el campo real (`NoteComposer`, sin cambios en sí
  mismo más que un nuevo prop `autoFocus`) vive adentro del panel.
  Deslizar un mensaje para responder también abre el panel
  (`startReply` llama a `setComposerOpen(true)` además de
  `setReplyTarget`). `NoteComposer` se remonta con un `key` distinto
  cada vez que el panel abre/cierra, para que `autoFocus` dispare
  siempre (un `Modal` de React Native no desmonta sus hijos al
  ocultarse, así que un `autoFocus` normal solo dispararía la primera
  vez).
- **`TrackerCard`** (comentario) y **`MoodEditor`** (descripción):
  campo más simple (sin responder/citar), así que se armó un
  componente intermedio reutilizable,
  [`FloatingTextFieldEditor`](src/presentation/components/FloatingTextFieldEditor.tsx)
  (un `KeyboardFloatingPanel` con un único `TextInput` + un botón de
  tilde) — el texto ya se guarda en tiempo real en el estado existente
  del viewmodel (`onChangeText` apunta directo ahí), así que el botón
  de tilde solo cierra el panel, no hace falta "confirmar" nada
  aparte. El campo "Nota" numérico del mood tracker (corto, teclado
  decimal) no se tocó — el usuario pidió esto para las
  "descripciones", no para ese campo.

Se revirtió por completo el enfoque de #118-#122 en las pantallas que
contienen las cards: `NotesScreen` y `FavoritesScreen` vuelven a su
forma simple, sin `ref` al `ScrollView` ni `onScroll`/`onComposerFocus`
— ya no hace falta que la pantalla sepa nada sobre el teclado. Se borró
`useScrollComposerIntoView.ts` (código muerto). El fix de #120 (chat
completo, confirmado funcionando por el usuario) **no se tocó**.

**Alternativas descartadas.**

- **Seguir afinando `useScrollComposerIntoView`** (#122, ya
  diagnosticado correctamente pero sin probar). Se descartó: aunque el
  diagnóstico era correcto, seguía siendo "calcular a mano dónde está
  el campo y cuánto desplazar" — una clase de solución que ya llevaba
  cuatro intentos fallidos en este proyecto. El usuario prefirió una
  solución que evita la pregunta "cuánto hay que desplazar" por
  completo.
- **Un solo componente genérico para los tres casos** (anotación,
  comentario, descripción). Se descartó: el de anotaciones necesita
  historial de respuesta/edición (reusa `NoteComposer` tal cual);
  comentario/descripción son un campo simple sin eso — forzarlos al
  mismo componente hubiera significado pasarle props que no aplican
  a un caso o al otro. Se compartió sí la parte genérica real (el
  panel: modal + backdrop + `KeyboardAvoider`), en
  `KeyboardFloatingPanel`.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real, pero por
primera vez en esta serie de intentos la solución no depende de un
cálculo de posición/timing: reusa, sin modificarlo, el mecanismo que
ya funciona para los modales de esta app.
(Nota: el panel aparecía bien, pero el teclado no — había que tocar el
campo una segunda vez, y encima tapaba la mitad del panel cuando por
fin aparecía. Causa y arreglo en #124.)

## 124. El panel flotante necesitaba un segundo toque para que apareciera el teclado *(elección del usuario)*

**Contexto.** El usuario probó #123: el panel flotante aparecía al
tocar el placeholder, pero el teclado no — había que tocar el campo
de texto de adentro una segunda vez para que recién ahí apareciera, y
en ese momento tapaba la mitad del cuadro. Pidió que tocar una sola
vez muestre el campo y el teclado juntos.

**Decisión.** La causa: `NoteComposer`/`FloatingTextFieldEditor`
usaban `autoFocus` en el `TextInput`, y encima lo remontaban con un
`key` distinto cada vez que el panel se abría (para forzar que
`autoFocus` dispare de nuevo, porque un `Modal` de React Native no
desmonta sus hijos al ocultarse). Ese remonte ocurre en el MISMO
render en que el `Modal` pasa a `visible=true` — en ese instante la
ventana nativa del modal todavía no está necesariamente adjunta, así
que el pedido de foco de `autoFocus` se pierde en silencio. Recién al
tocar el campo a mano (ya con la ventana nativa lista) el foco
funciona — pero para entonces el panel ya se había dibujado sin
contar con el teclado, y el reacomodo de `KeyboardAvoider` llegaba
tarde y a medias (de ahí lo de "tapa la mitad").

Se reemplazó `autoFocus` + remonte por `ref` + `Modal.onShow`: el
`TextInput` expone su instancia vía `ref` (`NoteComposer` ahora es
`forwardRef`), y recién cuando el `Modal` **ya terminó de
mostrarse** (`onShow`, nuevo prop en
[`KeyboardFloatingPanel`](src/presentation/components/KeyboardFloatingPanel.tsx)) se
llama `ref.current.focus()`. En ese momento la ventana nativa
garantizado que existe, así que el foco nunca se pierde — el teclado
sale en el mismo gesto que el panel, sin necesitar un segundo toque,
y como ahora hay una sola transición (en vez de panel-sin-teclado →
foco manual → teclado tarde), `KeyboardAvoider` reacciona a tiempo y
ya no tapa nada.

**Alternativas descartadas.**

- **Un `setTimeout` después de abrir el panel, antes de enfocar.** Se
  descartó: es exactamente el tipo de adivinanza de timing que ya
  falló varias veces en esta sesión (#118-#122) — `Modal.onShow` es
  la señal real y documentada de que la ventana está lista, no hace
  falta adivinar cuánto esperar.
  (Nota: `onShow` solo no alcanzó — ver #125, que sí termina usando
  un `setTimeout` chico, pero para un problema distinto y bien acotado:
  no "cuánto tarda el layout", sino "cuánto tarda la ventana en tener
  el foco del sistema".)

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real.

## 125. El panel flotante seguía necesitando un segundo toque: a `Modal.onShow` le faltaba un margen chico para el foco de ventana en Android *(elección del usuario)*

**Contexto.** El usuario probó #124 con capturas: seguía pasando lo
mismo — primer toque abre el panel sin teclado, hay que tocar el
campo una segunda vez para que recién ahí aparezca (ahora sí, arriba
del teclado, sin taparse). Pidió que un solo toque alcance.

**Decisión.** `Modal.onShow` efectivamente garantiza que la ventana
nativa del modal ya está montada — pero en Android eso no es lo
mismo que esa ventana ya tenga el **foco de ventana** a nivel de
sistema operativo. El teclado solo aparece cuando el campo de texto
tiene foco de React Native **y** su ventana contenedora tiene foco de
sistema; si se llama `.focus()` apenas se dispara `onShow`, la
ventana puede no haber terminado de recibir ese foco todavía, y el
pedido de foco al campo no dispara el teclado (aunque el campo quede
"foco de React" desde el primer toque — por eso el segundo toque,
manual, sí funciona: para entonces la ventana ya tiene foco hace
rato). Se agregó un margen chico y documentado
(`ANDROID_FOCUS_DELAY = 50`ms) en
[`KeyboardFloatingPanel`](src/presentation/components/KeyboardFloatingPanel.tsx):
en Android, el `onShow` que le pasa quien usa el panel se llama
después de ese margen (en iOS, sin cambios, se llama directo). Queda
centralizado ahí — ni `NoteCard` ni `FloatingTextFieldEditor`
necesitaron cambios, siguen pasando `onShow={() => ref.current?.focus()}`
como antes.

**Alternativas descartadas.**

- **Reintentar el `focus()` en un loop hasta que el teclado aparezca**
  (detectado vía `Keyboard.addListener('keyboardDidShow', ...)`). Se
  descartó por ahora: agrega una máquina de estados nueva para un
  margen que, documentado, es chico y predecible — si en la práctica
  50ms no alcanzan, subir el número es un cambio de una línea, mucho
  más simple que un mecanismo de reintento.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real — si
50ms no alcanzan en la práctica, subir ese número es el próximo paso
antes de considerar algo más complejo.
(Nota: el teclado del usuario tiene una fila propia extra —sugerencias,
GIFs, etc.— que aparentemente no se refleja completa en el alto que
reporta el sistema, así que el campo seguía tapado igual. El arreglo
en #126 no depende de medir ese alto con precisión.)

## 126. El teclado del teléfono tiene filas propias que no se reflejan en el alto reportado: agrandar el panel en vez de medir mejor *(elección del usuario)*

**Contexto.** El usuario mandó una captura: el panel (de una entrada
de lista, no de este feature, como referencia) con el campo bien
visible y bastante aire debajo antes de que empiece el teclado. Explicó
la causa de que a él le siguiera tapando el campo en los paneles
nuevos: "el teclado de mi teléfono tiene funciones adicionales que
tapan" — su teclado agrega una fila propia (sugerencias/GIFs/etc.)
que, aparentemente, no está completa en el alto que
`endCoordinates.height` reporta, así que cualquier cálculo basado en
ese número (el de #120, #123, #124, #125) va a quedarse corto en su
teléfono en particular. Pidió, en vez de seguir afinando esa cuenta,
copiar lo que ya hace bien
[`ListEntryModal`](src/presentation/list/components/ListEntryModal.tsx)
(la hoja de "Nueva entrada"): que el cuadro suba hasta
aproximadamente la mitad de la pantalla, completando con espacio en
blanco por debajo.

**Decisión.** Se dejó de intentar que el panel mida "justo lo que
hace falta" y se lo hizo directamente más alto de lo necesario:
[`KeyboardFloatingPanel`](src/presentation/components/KeyboardFloatingPanel.tsx)
suma `minHeight: '50%'` a su `panel`. El campo (hijo único de ese
panel) sigue alineado arriba por default de Flexbox
(`justify-content: flex-start`), así que el 50% que le sobra queda
como aire **debajo** del campo — exactamente lo pedido. Esto no
arregla la medición del teclado (sigue siendo la misma de #120/#125):
lo que cambia es que, aunque esa medición quede corta por la fila
extra del teclado del usuario, el campo ya tenía de entrada tanto
margen de sobra que el margen que falta no llega a comérselo. Mismo
criterio que ya usa, sin buscarlo, `ListEntryModal`: su hoja tiene
`maxHeight: '85%'` y bastante contenido/`padding`, así que nunca se
ajusta al pixel al contenido real — eso es, en los hechos, lo que la
hace tolerante a este tipo de imprecisión.

**Alternativas descartadas.**

- **Sumar un margen fijo extra al cálculo existente** (p. ej.
  `endCoordinates.height + 80`). Se descartó: seguiría siendo una
  cifra inventada para un teclado específico, no necesariamente la
  misma en otro teléfono — agrandar el panel de por sí no depende de
  cuánto le falta a la medición, tolera cualquier excedente dentro de
  ese 50% de margen.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real.
(Nota: se ajustó a `40%` en #127 — el usuario pidió bajarlo un poco una
vez confirmado que la idea general funcionaba.)

## 127. Ajustes sobre el panel flotante: altura, doble toque para enviar/confirmar, vista previa del chat y Enter para mandar *(elección del usuario)*

**Contexto.** Con el panel flotante (#123-#126) ya funcionando, el
usuario pidió cuatro ajustes:
1. Bajar un poco la altura del panel (10%).
2. Un bug: tocar "enviar" (o el tilde de confirmar, en tracker/mood)
   cerraba el teclado pero no mandaba/confirmaba nada — recién un
   segundo toque lo hacía, y cerrar el panel entero necesitaba
   todavía un toque más afuera. Para tracker/mood pidió que un solo
   toque alcance para cerrar todo de una.
3. Para anotaciones, ver un poco del chat (mensajes nuevos incluidos)
   arriba del campo, dentro del panel.
4. Para anotaciones, que apretar `Enter` en el teclado mande el
   mensaje sin cerrar el teclado (en vez de lo que hacía antes).

**Decisión.**

- **Altura**: `minHeight` de
  [`KeyboardFloatingPanel`](src/presentation/components/KeyboardFloatingPanel.tsx)
  baja de `'50%'` a `'40%'`.
- **Doble toque para enviar/confirmar**: tanto el botón de enviar de
  [`NoteComposer`](src/presentation/note/components/NoteComposer.tsx)
  como el de confirmar de
  [`FloatingTextFieldEditor`](src/presentation/components/FloatingTextFieldEditor.tsx)
  pasan de `onPress` a `onPressIn`. Causa probable: con el teclado
  abierto, tocar un botón vecino al campo enfocado puede hacer que
  Android empiece a cerrar el teclado a mitad del toque — el
  reacomodo de layout que sigue corre el botón de lugar antes de que
  llegue el "soltar", y Android lo cuenta como gesto cancelado en vez
  de como un toque. `onPressIn` dispara en el instante de tocar, antes
  de que ese reacomodo tenga chance de interferir. Para
  `FloatingTextFieldEditor` esto también resuelve el pedido de
  tracker/mood: su botón ya llamaba `onClose` directo (cierra todo,
  panel y teclado), así que arreglar el toque alcanza — no hizo falta
  tocar la lógica de cierre en sí.
- **Vista previa del chat en el panel** (solo anotaciones): se
  extrajo el render de mensajes de
  [`NoteCard`](src/presentation/note/components/NoteCard.tsx) a una
  función `renderMessages()` compartida entre la vista principal
  (expandida/colapsable) y una nueva vista chica (`PersistentScrollView`,
  alto fijo `130`, pegada al último mensaje) adentro del panel
  flotante, arriba del `NoteComposer`.
- **`Enter` manda sin cerrar el teclado**: en Android, un `TextInput`
  con `multiline` **no** dispara `onSubmitEditing` al apretar `Enter`
  (inserta el salto de línea directo, sin importar
  `returnKeyType`/`blurOnSubmit` — limitación conocida de React
  Native en Android, no específica de este proyecto). Se detecta a
  mano en `onChangeText`: si el texto nuevo creció en exactamente un
  carácter y ese carácter es un salto de línea al final, fue un
  `Enter` (no un pegado de varias líneas) — se manda el mensaje en vez
  de agregarlo. `returnKeyType="send"` queda igual, solo para que el
  ícono del `Enter` en el teclado se vea como de enviar.

**Alternativas descartadas.**

- **`onSubmitEditing` + `blurOnSubmit={false}`** para lo de `Enter`.
  Se descartó después de confirmar (documentación de React Native)
  que no dispara en Android para campos `multiline` — cualquier
  solución basada en ese evento iba a fallar igual en el teléfono del
  usuario.
- **Mantener `onPress` y agregar un `setTimeout` antes de leer el
  estado del botón**, para el bug de doble toque. Se descartó:
  `onPressIn` resuelve la causa de raíz (no depender del "soltar")
  sin inventar una demora.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real.
(Nota: bajar el panel a `40%` se revirtió en #128 — el usuario lo
pidió de vuelta a `50%` después de probarlo. El `Enter` seguía
cerrando el teclado pese al arreglo de acá; la causa real y el
arreglo están en #128.)

## 128. Enter seguía cerrando el teclado: era `returnKeyType`, no `onSubmitEditing` *(elección del usuario)*

**Contexto.** El usuario probó #127 y pidió tres cosas: (1) revertir
la altura del panel a `50%` (la bajada del 10% no convenció una vez
probada), (2) que apretar `Enter` en anotaciones siga sin cerrar el
teclado —seguía cerrándolo pese al arreglo de #127— "como WhatsApp",
y (3) confirmó explícitamente el contraste que debía tener cada
botón principal: en tracker/mood, el tilde cierra **todo** (cuadro y
teclado); en anotaciones, enviar (por botón o por `Enter`) no debe
cerrar **nada** — solo manda el mensaje, en el primer toque.

**Decisión.**

- **Altura**: `minHeight` de
  [`KeyboardFloatingPanel`](src/presentation/components/KeyboardFloatingPanel.tsx)
  vuelve a `'50%'`.
- **`Enter` seguía cerrando el teclado**: el arreglo de #127 (detectar
  el salto de línea a mano en `onChangeText`) evita el problema de
  `onSubmitEditing` no disparando, pero no tocaba la causa real de
  que el teclado se cerrara: `returnKeyType="send"` le pide a Android
  una tecla de acción IME (`IME_ACTION_SEND`) que, del lado nativo,
  **cierra el teclado por default al apretarla** — ese cierre lo hace
  el sistema operativo directamente, no pasa por `onSubmitEditing` ni
  por ningún código de este proyecto, así que nada de lo agregado en
  #127 podía evitarlo. Se sacó `returnKeyType` del
  [`TextInput`](src/presentation/note/components/NoteComposer.tsx)
  de `NoteComposer` (vuelve al tipo por default, una tecla de salto
  de línea común, sin semántica de "acción" que dispare ese cierre).
  Como respaldo —por si el toque al botón de enviar también llega a
  soltar el foco— se agregó `handleSend()`: manda el mensaje y
  enseguida vuelve a pedirle el foco al campo a mano
  (`inputRef.current.focus()`), así el teclado queda abierto siempre,
  tanto si se manda por botón como por `Enter`. `NoteComposer` ahora
  guarda su propio `inputRef` interno y lo expone hacia afuera con
  `useImperativeHandle` (sigue funcionando igual para `NoteCard`, que
  lo usa para enfocar el campo cuando se abre el panel — ver #124).
- **Tracker/mood**: sin cambios — el botón de tilde ya llamaba
  `onClose` directo (cierra panel y teclado juntos), que es
  exactamente lo que el usuario pidió reconfirmar.

**Alternativas descartadas.**

- **Un `returnKeyType` distinto que tampoco cierre** (p. ej. `"none"`
  explícito). Se descartó: sacar la prop del todo es más simple y
  llega al mismo resultado (el tipo por default para un campo
  `multiline` ya es una tecla de salto de línea sin acción).

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real.
(Nota: el usuario pidió revertir el `Enter` manda mensajes por
completo — ver #129, que también separa la altura del panel por
caso de uso en vez de compartir un solo número.)

## 129. Alturas de panel por separado y reversión completa de "Enter manda" en anotaciones *(elección del usuario)*

**Contexto.** El usuario pidió cuatro cosas, ya con el panel
funcionando bien en lo básico:
1. Subir el panel de anotaciones un 5% más (de `50%` a `55%`).
2. Bajar el panel de tracker/mood un 10% (de `50%` a `40%`).
3. Que `Enter` en anotaciones **no** mande el mensaje — solo que
   agregue un salto de línea, dejando que mandar sea cosa solo del
   botón.
4. Reconfirmó el contraste ya logrado en #127/#128: el botón de
   enviar de anotaciones manda al primer toque sin cerrar nada; el de
   confirmar en tracker/mood cierra todo (cuadro y teclado) y aplica
   el texto escrito.

**Decisión.**

- **Alturas separadas**: hasta ahora
  [`KeyboardFloatingPanel`](src/presentation/components/KeyboardFloatingPanel.tsx)
  tenía un `minHeight: '50%'` fijo, compartido por los tres usos. Se
  agregó un prop `heightPercent` (default `50`, sin cambiar nada para
  quien no lo pase) — `NoteCard` pasa `55`, `FloatingTextFieldEditor`
  (tracker y mood, mismo componente para los dos) pasa `40`.
- **`Enter` ya no manda**: se sacó por completo la detección a mano
  del salto de línea en `onChangeText` que agregó #127/#128 —
  [`NoteComposer`](src/presentation/note/components/NoteComposer.tsx)
  vuelve a un `onChangeText` directo, sin lógica extra. `Enter` queda
  como en cualquier campo `multiline` común: agrega un salto de línea
  y nada más. Mandar sigue siendo solo del botón (`onPressIn`
  + reenfoque después de mandar, de #127/#128, sin cambios).
- **Tracker/mood (punto 4)**: no necesitó cambios —
  [`FloatingTextFieldEditor`](src/presentation/components/FloatingTextFieldEditor.tsx)
  ya hacía exactamente eso: `onChangeText` escribe en tiempo real
  sobre el estado del viewmodel (así que lo escrito ya está aplicado
  cuando se toca el tilde) y el tilde usa `onPressIn={onClose}`, que
  cierra panel y teclado juntos en el primer toque.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real.
(Nota: el doble toque seguía pasando en las pantallas con varias
cards — causa real y arreglo en #130: no era un problema de
`onPress` vs. `onPressIn`, sino de `Modal` tragándose el primer
toque a nivel nativo.)

## 130. El doble toque en las pantallas de varias cards era un bug conocido de Android+Modal, no de `onPressIn` *(elección del usuario)*

**Contexto.** El usuario reportó que enviar/confirmar seguía
cerrando el teclado sin mandar/guardar nada hasta un segundo toque
—pero **solo** en las pantallas con varias cards juntas (pestaña
Anotaciones, pestaña Trackers, Favoritos), no en el chat completo de
una anotación en particular. El primer intento de arreglarlo
(`onPressIn` en vez de `onPress`, #127) no alcanzaba acá.

**Decisión.** La diferencia real entre "funciona" y "no funciona" no
era la cantidad de cards sino **si el botón vive adentro de un
`Modal`**: el chat completo no usa `Modal` (su campo está anclado al
fondo de la pantalla, #120); el panel flotante de las cards sí. Una
búsqueda confirmó que esto es un bug conocido y documentado de React
Native en Android (`facebook/react-native#28871` y varios reportes
relacionados): dentro de un `Modal`, el primer toque sobre cualquier
vista que no sea el campo enfocado **lo consume el sistema operativo
para cerrar el teclado**, antes de que llegue a cualquier manejador
de React Native — ni `onPress` ni `onPressIn` pueden evitarlo, porque
el evento nunca llega a ese nivel en absoluto. Recién el segundo
toque, con el teclado ya cerrado, le llega normal al botón.

La solución documentada es `keyboardShouldPersistTaps` — un prop que
solo existe en `ScrollView` (y variantes) — seteado en `"always"`.
Se reemplazó el `Pressable` que envolvía el contenido de
[`KeyboardFloatingPanel`](src/presentation/components/KeyboardFloatingPanel.tsx)
por un `ScrollView` con `keyboardShouldPersistTaps="always"`, aunque
su contenido no siempre necesite scrollear — es el único lugar donde
existe ese comportamiento. Como la vista previa del chat dentro del
panel de anotaciones (`PersistentScrollView`, en
[`NoteCard`](src/presentation/note/components/NoteCard.tsx)) queda
ahora anidada adentro de este nuevo `ScrollView`, se le sumó
`nestedScrollEnabled` (mismo criterio que en cualquier otro lugar de
la app con scrolls anidados).

**Alternativas descartadas.**

- **Seguir ajustando el manejo de toques del botón** (otro cambio en
  `onPress`/`onPressIn`, o un `setTimeout`). Se descartó en cuanto se
  confirmó (con una fuente externa, no una suposición propia) que el
  toque ni siquiera llega a React Native la primera vez — no hay
  manejador de botón posible que lo arregle, porque el problema está
  un nivel más abajo.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real — pero
por primera vez en toda esta serie de intentos el diagnóstico tiene
una fuente externa (un issue conocido de React Native) en vez de ser
una hipótesis propia sin confirmar.
(Nota: `keyboardShouldPersistTaps` tampoco alcanzó — el usuario pidió
directamente sacar el `Modal` de la ecuación. Ver #131, que reemplaza
toda esta línea de arreglos por un panel que ya no vive en un
`Modal`.)

## 131. Reemplazo de raíz: el panel deja de ser un `Modal`, pasa a ser un único panel por pantalla *(elección del usuario)*

**Contexto.** `keyboardShouldPersistTaps="always"` (#130) tampoco
arregló el doble toque. El usuario, en vez de pedir un sexto intento
sobre el mismo síntoma, pidió cambiar la pieza de fondo: que tocar un
campo abra "un modal y el teclado" —en anotaciones con un fragmento
del chat + el campo, en trackers solo el campo—, que enviar en
anotaciones mande sin cerrar nada, y que confirmar en trackers
cierre todo y aplique el texto escrito. Repreguntando, confirmó que
el síntoma (se cierra el teclado sin hacer nada hasta un segundo
toque) pasa **siempre** en estas pantallas (no solo con 2+ cards) y
**no** pasa en el chat completo de una anotación en particular — la
diferencia real no era la cantidad de cards sino que el chat completo
nunca usó `Modal` para su campo (#120).

**Decisión.** Se sacó `Modal` de la ecuación por completo para este
panel. En Android, dentro de un `Modal`, el primer toque sobre
cualquier cosa que no sea el campo enfocado lo consume el sistema
para cerrar el teclado antes de que llegue a React Native — es un
comportamiento de la ventana nativa del diálogo, no algo que
`keyboardShouldPersistTaps`, `onPress` ni `onPressIn` puedan evitar
(confirmado en #130 con `facebook/react-native#28871`, y confirmado
en la práctica en #130 cuando el prop tampoco alcanzó). Sin `Modal`
de por medio, ese comportamiento no existe.

- **[`KeyboardFloatingPanel`](src/presentation/components/KeyboardFloatingPanel.tsx)**
  deja de envolver un `Modal`: ahora es un `View` absoluto normal
  (`position: 'absolute'`, cubre toda la pantalla), renderizado **una
  sola vez por pantalla** (no una por card) como hermano del
  `ScrollView` de esa pantalla, nunca adentro — adentro de un
  `ScrollView` un `View` absoluto queda recortado por sus límites, así
  que tiene que vivir afuera para cubrir la pantalla entera. Al dejar
  de vivir en un `Modal` (que no tiene edge-to-edge, la ventaja que
  se aprovechaba desde #123), hace falta resolver el teclado a mano en
  Android — reusa, sin modificarla, la misma técnica ya confirmada
  funcionando en el chat completo de una anotación
  (`useAndroidKeyboardHeight`, extraída de `NoteDetailScreen` a
  [`useAndroidKeyboardHeight.ts`](src/presentation/components/useAndroidKeyboardHeight.ts)
  para reusarla acá). También se sacó el margen `ANDROID_FOCUS_DELAY`
  de #125: ese margen era para esperar a que una *ventana nativa
  nueva* (la del `Modal`) recibiera el foco del sistema — sin ventana
  nueva, ese problema tampoco existe.
- **Un panel por pantalla, no uno por card**: como un `View` absoluto
  queda recortado por el `ScrollView` que lo contiene si se renderiza
  adentro de una card, el estado de "qué se está mostrando en el
  panel" se subió a la pantalla
  ([`useFloatingOverlay`](src/presentation/components/useFloatingOverlay.ts)):
  guarda qué card está activa (`activeKey`) y qué contenido mostrar.
  Cada card (`NoteCard`, `TrackerCard`/`FloatingTextFieldEditor`,
  `MoodEditor`/`FloatingTextFieldEditor`) sigue dueña de su propio
  estado (texto escrito, mensajes, a quién responde) exactamente como
  antes — lo único que cambia es que, en vez de pasárselo a su propio
  `Modal`, lo empuja al panel de la pantalla (`overlay.open`/
  `overlay.update`) mientras es la card activa. `NotesScreen`,
  `TrackersScreen` y `FavoritesScreen` ahora crean un `useFloatingOverlay()`
  y lo pasan a cada card que lo necesita, y renderizan un único
  `KeyboardFloatingPanel` al final, fuera del `ScrollView`.
- **`FloatingTextFieldEditor`** pasa de ser "el contenido de un panel
  ajeno" a ser el componente completo (placeholder + lógica de
  empujar/actualizar el panel compartido) — lo que antes vivía
  repartido entre `TrackerCard`/`MoodEditor` (el placeholder) y este
  componente (el campo) ahora vive todo acá.
- **`MoodEditor`** ahora recibe `overlay`/`overlayKey` como props
  **opcionales**: `MoodTrackerCard` (vive en un `ScrollView` largo) los
  pasa y usa `FloatingTextFieldEditor`; `MoodDayModal` (ya es su
  propio modal bien comportado, con `keyboardShouldPersistTaps="handled"`
  de antes — nunca tuvo este problema) no los pasa y sigue con un
  campo de texto común, como antes de #123. Meterle el panel flotante
  también ahí habría sido un `Modal` adentro de otro `Modal`, sin
  necesidad real.

**Alternativas descartadas.**

- **Seguir iterando sobre el `Modal`** (otro prop, otra librería de
  modal). Se descartó: el comportamiento de "comerse el primer toque"
  es del sistema operativo sobre la ventana del diálogo, no de React
  Native — no hay prop de `Modal` que lo evite.
- **Una librería de portales** (`@gorhom/portal` o similar) para que
  cada card siga "dueña" de su propio panel sin necesitar que la
  pantalla lo centralice. Se descartó: agrega una dependencia nueva
  para resolver algo que ya se puede resolver subiendo un poco de
  estado (`useFloatingOverlay`), sin dependencias nuevas.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real — pero
esta vez el diseño directamente evita la causa de raíz confirmada en
#130, en vez de trabajar alrededor de ella.
(Nota: el usuario confirmó que #131 arregló el toque — ver #132 para
los ajustes finos que quedaban: el campo lejos del teclado, el teclado
sin abrir a la primera en tracker/mood, y un tirador para cerrar.)

## 132. Ajustes finos sobre el panel flotante: contenido pegado abajo, tirador para cerrar, y foco más robusto *(elección del usuario)*

**Contexto.** El usuario confirmó que #131 arregló lo de tocar los
botones. Con capturas, pidió tres cosas más:
1. El campo de escribir quedaba muy arriba, con un hueco en blanco
   grande entre el campo y el teclado (capturas de anotaciones y de
   la descripción del mood tracker, las dos en Favoritos) — lo quiere
   **inmediatamente** arriba del teclado.
2. Arriba del chat, algo para deslizar hacia abajo y cerrar el panel.
3. En trackers (y por extensión mood, mismo componente), el teclado
   seguía sin abrirse al primer toque.
4. Bajar un 20% el alto del panel en general.

**Decisión.**

- **Contenido pegado abajo**: la causa del hueco era que el
  contenido (chat+campo, o solo el campo) quedaba arriba del todo
  dentro del panel (alto por `heightPercent`, de sobra a propósito
  desde #126), dejando el resto como hueco **abajo**. Se le agregó
  `flexGrow: 1, justifyContent: 'flex-end'` al `contentContainerStyle`
  del `ScrollView` de
  [`KeyboardFloatingPanel`](src/presentation/components/KeyboardFloatingPanel.tsx)
  — ahora el contenido queda pegado abajo, y el margen de sobra (el
  colchón contra teclados con filas propias, #126) queda **arriba**
  del contenido en vez de abajo, donde no se nota.
- **Tirador para cerrar**: arriba del contenido (afuera del
  `ScrollView`, para no competir con su propio scroll) hay una barra
  chica (mismo aspecto que el tirador de `ListEntryModal`/
  `CreateNoteModal`) con un gesto de arrastre hacia abajo
  (`usePanGesture`, mismos umbrales que el resto de los swipes de la
  app, sin `Animated` — mismo motivo de siempre, #110/#111): pasado
  un umbral, cierra el panel; si no, vuelve a su lugar.
- **Foco más robusto**: se armó un hook chico,
  [`useFocusOnOpen`](src/presentation/components/useFocusOnOpen.ts),
  usado por `NoteCard` y `FloatingTextFieldEditor` (antes cada uno
  tenía su propia copia de la misma lógica). En vez de un solo
  `requestAnimationFrame`, encadena dos: el panel recién se montó en
  este mismo render, así que un frame puede no alcanzar para que el
  layout esté asentado antes de pedir el foco — un segundo frame da
  ese margen sin inventar un número de milisegundos a ciegas. No se
  pudo confirmar la causa exacta de por qué fallaba más seguido en
  tracker/mood que en anotaciones, pero la lógica era idéntica en los
  dos lugares, así que el refuerzo se aplicó por igual.
- **Alturas**: `PANEL_HEIGHT_PERCENT` en `NoteCard` baja de `55` a
  `35`; el default de `FloatingTextFieldEditor` baja de `40` a `20`.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin confirmarse en un dispositivo real si el
foco más robusto alcanza para que el teclado abra siempre a la
primera en tracker/mood — si no, el próximo paso sería investigar con
más detalle por qué ese caso puntual pierde el foco (o, si se vuelve
recurrente, `react-native-keyboard-controller`).
(Nota: el usuario confirmó que #132 ya anda bien — #133 es solo un
ajuste fino de posición, sin tocar el alto del panel.)

## 133. Separar el contenido del borde de abajo del panel, sin agrandarlo *(elección del usuario)*

**Contexto.** El usuario confirmó que #132 ya funciona bien. Pidió un
ajuste chico: que el cuadro de texto y el chat salgan un 5% más
arriba, pero sin que el panel en sí se agrande.

**Decisión.** El contenido queda pegado abajo del todo del panel
(`justifyContent: 'flex-end'`, desde #132) — para separarlo del borde
de abajo sin tocar el alto del panel, se le sumó un `paddingBottom`
extra al final del contenido, dentro del mismo `ScrollView`: un 5%
del alto de pantalla (`Dimensions.get('window').height * 0.05`,
constante — la app está fija en portrait, no hace falta escuchar
cambios de `Dimensions`). Al ser `padding` *dentro* del área que ya
mide `heightPercent`, el panel no crece: lo que crece es el margen
entre el contenido y el borde de abajo, a costa del margen que había
arriba del contenido (que se achica en la misma medida).

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios.

## 134. Mandar un mensaje de anotación, instantáneo: actualización optimista en vez de guardar-y-releer *(elección del usuario)*

**Contexto.** El usuario notó un delay al mandar mensajes de
anotaciones y pidió que sea instantáneo al tocar enviar.

**Decisión.** El delay no era de UI (animaciones, renders) sino de
E/S: cada envío hacía **dos** vueltas completas a `AsyncStorage` en
serie antes de que el mensaje apareciera.
[`NoteMessageLocalDataSource.write`](src/data/note/datasources/NoteMessageLocalDataSource.ts)
ya lee el blob entero antes de escribirlo (lectura-modificación-escritura
sobre `{ [noteId]: { [messageId]: dto } }`, con TODAS las anotaciones
adentro, no solo la que se está editando); encima, tanto
[`NoteCard`](src/presentation/note/components/NoteCard.tsx) como
[`useNoteDetail`](src/presentation/note/viewmodels/useNoteDetail.ts)
volvían a pedir **todos** los mensajes (`getNoteMessages`/`reload()`)
después de guardar, en vez de usar el mensaje que el propio
`saveNoteMessage.execute(...)` ya devuelve — una tercera (y hasta
cuarta, en el chat completo, que además releía la anotación) vuelta
al mismo blob, innecesaria.

Se cambió a actualización optimista, el mismo criterio que ya usa
`ListCard.toggleEntryDone` en este proyecto: el mensaje se arma en el
momento (`createNoteMessage` + `generateId`, las mismas funciones que
usa el usecase por dentro) y se suma a `messages` **antes** de
guardarlo — sin ningún `await` de por medio, el mensaje aparece en la
misma pasada de React que el toque del botón. El guardado real
(`saveNoteMessage.execute`, con el mismo `id` ya usado, así que es el
mismo registro) sigue atrás, en segundo plano, sin que la UI espere
nada; si llegara a fallar (en la práctica no pasa — es solo
almacenamiento local), el próximo `reloadTick`/`reload()` natural de
esa pantalla lo corrige solo. Edición de un mensaje existente
(`useNoteDetail`, chat completo) sigue el mismo criterio, reemplazando
el mensaje en `messages` por id en vez de agregarlo.

Como consecuencia, el estado `sending` (que existía para des/habilitar
el botón mientras el `await` estaba en curso) quedó sin uso — se sacó
de `NoteCard`, `useNoteDetail` y `NoteComposer` (su prop `sending` ya
no lo pasa nadie).

**Alternativas descartadas.**

- **Dejar el guardado como estaba y solo sacar la relectura
  (`getNoteMessages`/`reload()`) posterior**, sin optimismo (esperar
  el `await saveNoteMessage.execute(...)` y recién ahí actualizar
  `messages` con el valor que devuelve). Se descartó: igual queda un
  `await` de por medio (una vuelta a `AsyncStorage`) entre el toque y
  que el mensaje aparezca — la version optimista no tiene ninguna.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios.

---

## 135. Un mensaje de anotación puede pertenecer a varias anotaciones a la vez, y copiarse *(elección del usuario)*

**Contexto.** El usuario pidió que un mensaje pueda pertenecer a más
de una anotación (mandado en A, se le puede agregar B después, y
sacarlo de A sin que deje de estar en B — sin tocar nada más del
mensaje) y, además, que seleccionar uno o más mensajes permita
copiarlos. Es la base de datos para todo lo que viene después (fotos/
audio/documentos, descripción de anotación) — ver el plan completo en
la conversación de esta sesión.

**Decisión.** [`NoteMessage.noteId: string`](src/domain/note/entities/NoteMessage.ts)
pasó a ser **`noteIds: readonly string[]`**, nunca vacío
(`createNoteMessage` lo valida — llegar a 0 significa "borrar el
mensaje", una acción propia y separada, nunca un efecto implícito de
sacarlo de todas sus anotaciones).

El blob de `AsyncStorage` cambió de forma: de
`{ [noteId]: { [messageId]: dto } }` (un solo dueño por diseño) a
**plano**, `{ [messageId]: dto }` con `dto.noteIds: string[]` adentro
— misma `STORAGE_KEY`, el backup no se entera (itera
`ALL_STORAGE_KEYS` sin saber su forma interna).

El usuario ya tenía mensajes reales en el disco con la forma vieja.
Para no perderlos, [`NoteMessageLocalDataSource.readAll`](src/data/note/datasources/NoteMessageLocalDataSource.ts)
migra **en memoria, solo al leer, sin escribir nada como efecto
secundario** — mismo criterio ya usado para el rename
`time`→`timeFrom` de `EventDto` y el cambio de forma de
`FinanceTransactionDto` (`intervalDays`→`intervalValue`/
`intervalUnit`). La primera escritura real después de leer (mandar,
editar o cambiar a qué anotaciones pertenece cualquier mensaje) deja
la forma nueva persistida sola — no hace falta un paso explícito de
"migrar todo ahora". La detección no mira solo la primera entrada
(`remove()` nunca borraba un bucket que quedaba vacío, así que podía
haber `{ algunNoteId: {} }` dando vueltas): escanea **todos** los
valores de primer nivel buscando alguno con `typeof value.text ===
'string'` directamente — si lo encuentra, ya es la forma nueva; si no,
cada bucket de primer nivel se aplana con `noteIds: [eseNoteId]`.

Cambios de superficie en `NoteMessageRepository`: `getForNote(noteId)`
ahora filtra `noteIds.includes(noteId)` sobre el blob entero (acepta
leer todo en vez de un solo bucket — mismo trade-off ya aceptado para
el N+1 de `useLists`); nuevo `getById(messageId)` (hace falta para el
arreglo de citas de abajo); `deleteMessage` perdió el parámetro
`noteId` (ya no hace falta, y ahora es sin ambigüedad "borrar este
mensaje en todos lados"); `deleteAllForNote` se renombró
`detachFromNote` y hace **un** `readAll()` + loop en memoria + **un**
`persist()` (no una escritura por mensaje — mismo motivo que
`deleteSelected` ya evita `Promise.all`: escrituras en paralelo se
pisan sobre este blob). Si sacar la anotación deja a un mensaje sin
ninguna, se borra entero (limpieza de archivo incluida cuando llegue
la Parte B); si no, se reescribe sin ese id.

Nuevo usecase `SetNoteMessageNotes(messageId, noteIds)`: reemplazo
completo y "tonto" de `noteIds`, sin tocar texto/`sentAt`/`replyToId`/
`editedAt` — la implementación literal de "no se debe modificar nada
del mensaje, solo a dónde pertenece". La UI de edición masiva de
membership se simplificó a **dos acciones explícitas** en vez de una
grilla de checkboxes estilo etiquetas de Gmail (una grilla tri-state
es más potente de lo que esta app necesita): "Agregar a otra
anotación" (ícono `FolderPlus`, elegir una nota de una lista — nuevo
[`PickNoteModal`](src/presentation/note/components/PickNoteModal.tsx),
mismo patrón de `Modal` que `CreateChooserModal` pero con lista
dinámica) y "Quitar de esta anotación" (ícono `FolderMinus`, solo en
el chat completo — no tiene sentido en la card compacta). Si "quitar"
dejaría algún mensaje sin ninguna anotación, ese mensaje se saltea (no
se llama al usecase — no es un error, es una rama esperada de la UI) y
se cuenta; si se salteó alguno se avisa con un `Alert.alert`, mismo
estilo que `confirmDeleteSelected`. Las dos acciones loopean
secuencialmente en `useNoteDetail`, mismo motivo que `deleteSelected`.

**Bug real que este cambio introducía, y su arreglo.** Antes, citar un
mensaje (`replyToId`) se resolvía buscando en `vm.messages`, que ya
está filtrado a la anotación actual. Ahora que un mensaje puede
sacarse de la anotación A y seguir en la B, uno en A que cita al que
se sacó mostraría "Mensaje eliminado" sin estarlo. Se arregló con un
nuevo usecase `GetNoteMessage(messageId)` usado como *fallback*: si la
cita no está en `messages`, se busca con él (una vez por mensaje
faltante, al recargar) y se guarda en un mapa
`externalReplyTargets: Record<string, NoteMessage | null>`; recién si
tampoco aparece ahí se muestra "Mensaje eliminado". Implementado igual
en `useNoteDetail` (chat completo) y `NoteCard` (card compacta).

**Copiar mensaje.** `SelectionBar` ganó tres props opcionales nuevas
(`onCopy?`, `onAddToNote?`, `onRemoveFromNote?`), mismo criterio ya
usado por `onEdit?` (quien la usa decide cuándo pasarlas — a diferencia
de `onEdit`, que solo tiene sentido con exactamente 1 seleccionado,
estas valen con 1 o más). `useNoteDetail.copySelectedText()` junta los
mensajes seleccionados en orden de `sentAt`, con texto tal cual y un
placeholder (`[Foto]`/`[Documento]`/`[Audio]`) para los que todavía no
son de texto, unidos con salto de línea; `NoteDetailScreen` lo manda a
`expo-clipboard` (`Clipboard.setStringAsync`, dependencia nueva, sin
plugin ni permiso que configurar).

**Alternativas descartadas.**

- **Guardar cada mensaje duplicado, una copia por anotación a la que
  pertenece.** Se descartó: editar el texto obligaría a propagar el
  cambio a todas las copias (o aceptar que diverjan, que no es lo que
  se pidió), y requeriría un id compartido aparte para saber que son
  "el mismo" mensaje a efectos de edición.
- **Migrar la forma vieja escribiéndola de nuevo apenas se detecta**,
  en vez de solo en memoria. Se descartó por ser la primera vez en
  este proyecto que se se haría una escritura como efecto secundario de
  una lectura — rompe el patrón ya establecido sin necesidad real.
- **Grilla de checkboxes (una fila por anotación) para edición masiva
  de membership.** Se descartó: para una app personal, con como mucho
  unas pocas anotaciones, dos botones cubren exactamente lo que se
  pidió sin construir un editor genérico de etiquetas.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Falta todavía: fotos/audio/documentos (Parte B del
plan), descripción corta al crear una anotación (Parte D) — ninguna de
las dos depende de lo de acá, pero sí dependen de este cambio de forma
de `NoteMessage`, que ya está hecho. El renderizado de cada tipo de
mensaje (`NoteMessageBubble`) todavía no distingue `selectionMode` por
tipo porque solo existe el tipo `'text'` — hace falta revisarlo cuando
se agreguen los demás.

---

## 136. Descripción corta opcional al crear una anotación *(elección del usuario)*

**Contexto.** El usuario pidió poder agregarle a una anotación una
descripción corta al crearla.

**Decisión.** `Note` ganó `description?: string`, tope nuevo
`MAX_NOTE_DESCRIPTION = 100` (al lado de `MAX_NOTE_NAME`, mismo
criterio que `MAX_EVENT_DESCRIPTION`/`MAX_TASK_DESCRIPTION` en
eventos/rutina diaria), validada/recortada en `createNote` igual que
`name`. Solo al crear: `CreateNoteModal` suma un segundo `TextInput`
opcional; no hay edición después de creada ni se muestra en el header
del chat completo — nada en el pedido implica que haga falta ahí. Se
muestra como subtítulo chico y gris debajo del nombre, solo en
`NoteCard` (hub y Favoritos).

**Alternativas descartadas.** Ninguna — es un campo opcional más,
mismo patrón ya usado en otras entidades.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios.

---

## 137. Mandar fotos y documentos en anotaciones, verlos en una galería aparte *(elección del usuario)*

**Contexto.** Siguiente parte del pedido original de #135: mandar
fotos/documentos/audio en el chat (clip a la izquierda del campo, tope
de 5 por vez) y una pantalla de galería aparte (ícono de libro, dos
secciones como en WhatsApp). Esta entrada cubre la parte sin gesto
nuevo — foto/documento de punta a punta y la galería — dejando afuera
a propósito **grabar** audio (gesto de mantener presionado/deslizar
para cancelar, sin construir todavía) y mandar audio en sí, para no
mezclar lo probado con lo más arriesgado en el mismo paso.

**Decisión.** `NoteMessage.kind`/`media` (ver
[`NoteMessage.ts`](src/domain/note/entities/NoteMessage.ts)) ya
existían desde el cambio de forma de #135 — esta parte los usa por
primera vez de verdad.

Dependencias nuevas, instaladas directo con `npm install` (el wrapper
`npx expo install` tira `EALLOWSCRIPTS` en este entorno —
`allow-scripts` del `.npmrc` de usuario no cubre instalaciones
project-scoped; se instaló a mano en la versión exacta que
`expo/bundledNativeModules.json` marca para el SDK 58): `expo-clipboard`
(`~8.0.7`, para #135 también), `expo-image-picker` y `expo-audio`
(`~58.0.10` las dos). `app.json` suma sus plugins
(`microphonePermission`/`photosPermission`) — todavía sin build EAS
nueva, así que nada de esto se probó en un dispositivo real.

[`noteMediaStorage.ts`](src/data/note/noteMediaStorage.ts) (capa de
datos, mismo criterio que `useBackup.ts` ya usa para tocar
`expo-file-system` directo): carpeta privada de la app
(`Paths.document/NoteMedia`, no la pública que usa el backup — esto no
necesita ser visible), `copyIntoNoteMedia` copia ahí cualquier archivo
elegido con un nombre propio (nunca se guarda la uri del picker, que
puede dejar de ser válida), `noteMediaUri` la resuelve de nuevo para
mostrar/reproducir, `noteMediaExists` dice si el archivo sigue
estando (`false` después de restaurar un backup, que nunca incluyó el
archivo — solo la referencia `fileName`/`mimeType` dentro del
mensaje). [`pickNoteMedia.ts`](src/presentation/note/pickNoteMedia.ts)
envuelve los dos pickers: fotos usa el tope propio de
`selectionLimit: 5` de `expo-image-picker`; documentos no tiene tope
propio (`expo-document-picker`), así que se recorta a mano a 5 con un
`Alert` si se eligieron más.

El clip nuevo de `NoteComposer` (ícono `Paperclip`, no se muestra
mientras se edita un mensaje) abre
[`AttachChooserModal`](src/presentation/note/components/AttachChooserModal.tsx)
(Foto/Documento, mismo patrón que `CreateChooserModal`). Mandar varios
de una es optimista igual que mandar texto (#134): todos los mensajes
aparecen en la lista de una, antes de guardar nada — pero el guardado
real de cada uno **no** puede ir en paralelo
(`NoteMessageLocalDataSource.write` relee-modifica-escribe el blob
entero, no solo el mensaje nuevo), así que una función de fondo los
guarda uno por uno, en orden, aparte de la UI (que no espera nada de
eso). Implementado dos veces, con la misma lógica, en
`useNoteDetail.sendMediaBatch` (chat completo) y
`NoteCard.sendMediaBatch` (card compacta) — mismo motivo de siempre
para no compartir estado entre ambos (cada uno ya tenía su propio
`send()`/`sendMessage()` por separado desde el principio).

`NoteMessageBubble` ahora rama según `message.kind`: `'image'` muestra
una miniatura (`Image`, sin recorte) que abre un visor a pantalla
completa sin zoom; `'document'` una fila con ícono, nombre y tamaño
formateado, tocarla llama a `Sharing.shareAsync` (mismo mecanismo que
ya usa la exportación del backup — no se construyó ningún visor de
documentos propio); `'audio'` un reproductor chico nuevo,
[`NoteAudioPlayer`](src/presentation/note/components/NoteAudioPlayer.tsx)
(`useAudioPlayer`/`useAudioPlayerStatus` de `expo-audio`, play/pause +
tiempo transcurrido/total, sin forma de onda) — queda sin usar hasta
que exista una forma de grabar, pero ya puede reproducir cualquier
audio que llegue (por ejemplo, restaurado o copiado a mano). Si el
archivo de un mensaje de medios no está (backup restaurado, o se borró
por fuera de la app), se muestra "Archivo no encontrado" en vez de
romper — mismo criterio en la burbuja y en la galería. Cada tipo de
contenido nuevo recibe `disabled={selectionMode}` para que su propio
toque (ver foto, abrir documento, reproducir) no compita con
seleccionar el mensaje.

Se centralizó en una función de dominio,
`noteMessagePreviewText(message)` (en `NoteMessage.ts`), el texto
corto para mostrar un mensaje donde no entra el contenido real
(`'[Foto]'`/`'[Documento]'`/`'[Audio]'`, o el texto tal cual si es de
texto) — antes estaba duplicado en la cita de respuesta, en la cinta
"Respondiendo a…" del composer y en copiar mensaje (#135); ahora las
tres lo usan.

Nueva pantalla [`NoteMediaScreen`](src/presentation/screens/note-media/NoteMediaScreen.tsx)
(ruta `NoteMedia`, parámetro `{ noteId }`), sin usecase propio — pide
los mismos `getNoteMessages.execute(noteId)` que ya usa el chat y los
separa en dos secciones client-side: fotos en cuadrícula (`flexWrap`,
no un `FlatList` — a esta escala no hace falta virtualizar) y
documentos en lista. Se llega desde un ícono nuevo (`Book`) a la
izquierda de la lupa, en el header del chat completo.

**Alternativas descartadas.**

- **Guardar la uri que devuelve el picker/grabador tal cual**, en vez
  de copiar el archivo a una carpeta propia. Se descartó: esas uris
  (sobre todo las de `content://` de Android) pueden dejar de ser
  válidas en cualquier momento — ya es el motivo documentado en el
  propio `noteMediaStorage.ts`.
- **Visor de documentos propio** (por tipo de archivo) en vez de
  `Sharing.shareAsync`. Se descartó: el sistema ya sabe abrir cada
  tipo con la app correspondiente — es exactamente lo que ya hace la
  exportación del backup.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios — verifican tipos y bundling, no grabación, picking
ni clipboard de verdad (nativo, necesita una build EAS nueva). Falta
todavía: grabar audio (gesto de mantener presionado, trabar/cancelar
estilo WhatsApp, explícitamente sin traba en la primera versión, ver
el plan de la sesión) — es la única pieza que queda del pedido
original de #135.

---

## 138. Grabar audio manteniendo presionado el micrófono, sin traba (última pieza del pedido original de #135) *(elección del usuario)*

**Contexto.** Última parte del pedido de #135: el botón de enviar se
convierte en micrófono cuando el campo está vacío; mantenerlo
presionado grava un audio estilo WhatsApp (se puede deslizar para
cancelar); soltar normal lo manda. El usuario eligió explícitamente,
ante una pregunta directa sobre el alcance, **no** construir la traba
(mantener grabando después de soltar) en esta primera versión — un
fast-follow aparte, una vez que el gesto base esté confirmado andando
en un dispositivo real.

**Decisión.** [`AudioRecordButton`](src/presentation/note/components/AudioRecordButton.tsx)
usa un solo `usePanGesture` con `activateAfterLongPress: 150`ms, en vez
de componer un gesto de mantener presionado (`useLongPressGesture`)
con uno de arrastre por separado, como proponía el plan original de la
sesión: `activateAfterLongPress` es una opción nativa del propio
`usePanGesture` — activa el gesto recién después de ese tiempo sin
soltar, y a partir de ahí el arrastre (`onUpdate`/`translationX`) se
sigue igual que cualquier otro `usePanGesture` de esta app (swipe para
responder, tirador del panel flotante). Un solo tipo de gesto, ya
probado en este código base, en vez de dos combinados por primera vez
— menos riesgo para una pieza que de por sí ya era "la más nueva y
arriesgada" del plan.

El componente se mantiene **montado siempre** mientras el campo está
vacío (lo decide `NoteComposer`, mismo lugar donde antes iba el botón
de enviar) — nunca se desmonta/remonta entre "mic quieto" y "grabando
en curso": si React lo reemplazara por otro elemento a mitad de un
toque, el gesto en curso (que vive del lado nativo) se cortaría solo.
Adentro, cambia de verse como un ícono chico a ocupar toda la fila
(con un punto rojo, el tiempo transcurrido y "‹ Deslizá para
cancelar") según su propio estado `isRecording` — `NoteComposer` solo
usa ese booleano (recibido por `onRecordingChange`) para ocultar el
campo de texto y el clip mientras tanto, nunca para decidir si
desmontar el botón.

Grabación con `expo-audio`: `useAudioRecorder(RecordingPresets.HIGH_QUALITY)`
+ `useAudioRecorderState(recorder, 100)` para el tiempo en vivo.
`onActivate` (ya pasado el `activateAfterLongPress`) pide permiso
(`requestRecordingPermissionsAsync`) y arranca a grabar — con un
`activeRef` que evita arrancar si el dedo ya se soltó mientras el
diálogo de permiso (un `await`) todavía estaba en pantalla.
`onDeactivate` decide cancelar o mandar según `e.canceled` (el propio
gesto se canceló, por ejemplo por el sistema) **o** si se deslizó más
de `CANCEL_THRESHOLD = 90` puntos a la izquierda; si no se cancela,
copia el archivo grabado a la carpeta de medios
(`copyIntoNoteMedia`, mismo helper que fotos/documentos de #137) y
llama a `onSendAudio`, que en cada pantalla termina armando y mandando
un mensaje `kind: 'audio'` con el mismo `sendMediaBatch` ya construido
en #137 (un elemento, en vez de un array de varios).

**Alternativas descartadas.**

- **Componer `useLongPressGesture` + `usePanGesture`** (lo que
  proponía el plan original). Se descartó al escribir el código: un
  solo `usePanGesture` con `activateAfterLongPress` logra lo mismo sin
  combinar dos gestos por primera vez en este código base — menos
  superficie nueva para una pieza ya marcada como la más riesgosa.
- **Traba (lock) para seguir grabando después de soltar.** Cortada a
  propósito de esta versión — elección explícita del usuario.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios — verifican tipos y bundling, nada más. **Esto no se
probó en ningún dispositivo real** (no hay build EAS nueva todavía) —
es, con diferencia, la pieza menos probada de toda la sesión: combina
un permiso nativo async en medio de un gesto, un `activateAfterLongPress`
nunca usado antes en este código base, y la pantalla cambiando de
forma a mitad de un toque. Dado el historial de esta app con gestos
que necesitaron varias rondas después del primer uso real (#118-#133,
toda la saga del teclado/panel flotante de Anotaciones), hay que
asumir que esto también va a necesitar ajustes — quedó agregado al
listado de deuda técnica conocida, al final de este documento, para no
perderlo de vista.

---

## 139. Fotos agrupadas en un solo mensaje (tope 4), y galería que muestra una sola sección a la vez *(elección del usuario)*

**Contexto.** Dos ajustes sobre lo de #137/#138: el tope de fotos
mandadas juntas bajó de 5 a 4, y ahora tienen que verse como **un solo
mensaje** con cuadrícula (dos arriba, dos abajo) en vez de un mensaje
por foto; y en la pantalla de galería, en vez de mostrar fotos y
documentos a la vez, el usuario pidió elegir una sección u otra, con
el mismo control segmentado que ya usan los trackers para elegir
Semana/Mes/Año.

**Decisión.** `NoteMessage` suma `mediaItems?: readonly NoteMessageMedia[]`
(en [`NoteMessage.ts`](src/domain/note/entities/NoteMessage.ts)), para
`kind: 'image'` con más de una foto — `media` (singular) sigue
existiendo para documentos/audio, y también sigue siendo válido para
fotos de **antes** de este cambio (una foto, mandada antes de que
existiera `mediaItems`). Nueva función de dominio
`noteMessageMediaItems(message)` lee cualquiera de los dos casos de
forma uniforme (`mediaItems` si está, si no `[media]`, si no `[]`) —
la usan tanto la burbuja como la galería, para no tener que repetir
ese `if` en cada lugar. Nuevo tope `MAX_NOTE_IMAGE_ITEMS = 4` (al lado
de `MAX_NOTE_MESSAGE_LENGTH`), validado en `createNoteMessage`: un
mensaje de imagen necesita 1 a 4 archivos, ni más ni menos.

[`pickNoteMedia.ts`](src/presentation/note/pickNoteMedia.ts):
`pickNotePhotos` ahora devuelve un **único** `PickedNoteMedia` con las
fotos elegidas en `mediaItems` (antes, un elemento por foto) —
`selectionLimit` del picker bajó de 5 a `MAX_NOTE_IMAGE_ITEMS`.
Documentos no cambia: siguen siendo mensajes separados, tope 5 (el
usuario solo pidió agrupar fotos). `sendMediaBatch`
(`useNoteDetail`/`NoteCard`) ya recibía una lista de "cosas para
mandar" sin asumir cuántos archivos tiene cada una, así que no hizo
falta ningún cambio de lógica ahí — solo pasar `mediaItems` además de
`media` en cada punto donde ya se pasaba este último.

`NoteMessageBubble` rama antes de llegar al `if (!media)` de siempre:
con `kind === 'image'`, lee `noteMessageMediaItems(message)` y, si hay
más de una, las dibuja en una cuadrícula de 2 columnas (`flexWrap`,
mismo ancho total que una foto sola — así la burbuja no cambia de
tamaño según la cantidad); una sola foto se sigue viendo grande, como
antes. Si algún archivo puntual de la cuadrícula no está (por ejemplo,
después de restaurar un backup), esa casilla puntual muestra "No
encontrada" en vez de tirar abajo el mensaje entero.

[`NoteMediaScreen`](src/presentation/screens/note-media/NoteMediaScreen.tsx):
nuevo control segmentado (`SectionSwitch`, calcado del estilo de
[`CalendarViewSwitch`](src/presentation/calendar/CalendarViewSwitch.tsx)
que ya usan los trackers) para elegir Fotos o Documentos — nunca las
dos secciones a la vez. La cuadrícula de fotos ahora junta **todas**
las fotos de todos los mensajes con `.flatMap(noteMessageMediaItems)`
— se ven todas juntas en una sola grilla plana, sin importar si se
mandaron de una en una o agrupadas de a varias (mismo criterio que
usa la pantalla de medios de WhatsApp).

**Alternativas descartadas.**

- **Reutilizar `CalendarViewSwitch` directamente**, en vez de copiar
  su estilo en un componente nuevo. Se descartó: está tipado a
  `CalendarView` (`'week' | 'month' | 'year'`), específico del
  calendario — generalizarlo para que sirviera también acá era más
  cambio que simplemente copiar los ~20 líneas de estilo que hacen
  falta.
- **Cuadrícula de WhatsApp real** (una foto grande + el resto más
  chicas, recortadas, cuando hay 3). Se descartó: el pedido fue
  literal ("dos arriba y dos abajo") — una cuadrícula pareja de 2
  columnas ya cumple eso para 1 a 4 fotos, sin construir el layout más
  elaborado de WhatsApp.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real (mismo
motivo que #137/#138 — hace falta una build EAS nueva).

---

## 140. Deslizar entre fotos y entre secciones de la galería; tocar el nombre de la anotación también abre la galería; 4 fotos por fila *(elección del usuario)*

**Contexto.** Cuatro ajustes sobre #137/#139: (1) tocar el nombre de
la anotación, arriba del chat completo, tiene que llevar también a la
galería de medios (ya se podía desde el ícono de libro — esto suma
una segunda forma, no lo reemplaza); (2) al abrir una foto a pantalla
completa, deslizar tiene que pasar a la siguiente/anterior; (3) en la
pestaña de medios, deslizar tiene que cambiar entre Fotos y Documentos
(ya se podía tocando el control segmentado — esto suma el gesto); (4)
la cuadrícula de fotos de la galería tiene que entrar exactamente 4
por fila.

**Decisión.** Nuevo componente compartido
[`ImageViewerModal`](src/presentation/note/components/ImageViewerModal.tsx)
(antes vivía duplicado, sin deslizar, adentro de `NoteMessageBubble` y
de `NoteMediaScreen`): recibe `photos: string[] | null` (la lista
completa por la que se puede deslizar) y `startIndex`, y usa
`useHorizontalSwipe` — el mismo gesto que ya usan los trackers para
moverse de período — para pasar de foto dentro de esa lista, clavado
en las puntas (no da la vuelta). Un contador ("2/4") se muestra arriba
cuando hay más de una. Lo usan los dos lugares que antes tenían su
propio visor sin deslizar:
- `NoteMessageBubble`: la lista es las fotos de **ese mensaje**
  (`noteMessageMediaItems`, filtradas a las que de verdad existen) —
  deslizar adentro de la cuadrícula 2x2 de una foto agrupada (#139)
  recorre esas mismas.
- `NoteMediaScreen`: la lista es **todas** las fotos de la galería
  (`existingPhotoUris`, ya aplanada con `flatMap` desde #139) —
  deslizar sobre una foto abierta desde la cuadrícula recorre la
  galería entera, sin importar en qué mensaje se mandó cada una.

En los dos casos, el índice que se le pasa al visor se calcula sobre
la lista de archivos que **sí existen** (no sobre la lista cruda de
`mediaItems`/mensajes) — si faltara alguno (backup restaurado), no
rompe la numeración de las que sí se pueden ver.

`NoteMediaScreen` suma un segundo `useHorizontalSwipe` (distinto del
de arriba, que es sobre fotos individuales) envolviendo el
`ScrollView` de toda la pantalla: deslizar a la izquierda pasa de
Fotos a Documentos, a la derecha al revés — clavado en las puntas
(deslizar en Documentos hacia la derecha, o en Fotos hacia la
izquierda, no hace nada), igual que el control segmentado al que
complementa. El `failOffsetY` propio de `useHorizontalSwipe` es lo
que deja que el scroll vertical de la lista de documentos / cuadrícula
de fotos siga funcionando sin pisarse con este gesto horizontal nuevo
— mismo mecanismo con el que convive el swipe de período de los
trackers con el calendario que tienen adentro.

La cuadrícula de la galería pasó de un ancho fijo (100px) a calculado
con `useWindowDimensions`: `(ancho de pantalla − padding × 2 − hueco ×
3) / 4`, así entran exactamente 4 por fila sin importar el ancho real
del teléfono (antes, cuántas entraban por fila dependía de la pantalla
y no estaba garantizado).

`NoteDetailScreen` reemplaza su `title` (string, no tocable) por un
`headerTitle` a medida: un `TouchableOpacity` con el nombre de la
anotación adentro, que navega a `NoteMedia` — mismo destino que ya
tenía el ícono de libro, ahora con una segunda entrada.

**Alternativas descartadas.**

- **Dejar cada visor con su propia copia del código**, sumándole el
  deslizar a cada uno por separado. Se descartó: la lógica de
  deslizar-dentro-de-una-lista-de-fotos es idéntica en los dos
  lugares — tenerla una sola vez evita que diverjan con el tiempo.
- **Dar la vuelta al llegar a la última foto** (volver a la primera).
  Se descartó sin que el usuario lo pidiera — clavarse en las puntas
  es el comportamiento más común en visores de fotos y evita
  confusión sobre "cuántas hay".

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Sigue sin probarse en un dispositivo real (mismo
motivo que #137/#138/#139).

---

## 141. Primera prueba real: deslizar en el visor de fotos solo cerraba, y no se podían mandar documentos *(elección del usuario)*

**Contexto.** Primer uso real, en un dispositivo, de lo de #137-#140
(ya con una build EAS nueva). Dos problemas:
1. Deslizar en el visor de fotos (chat o galería) no cambiaba de foto
   — solo la cerraba, en los dos lugares.
2. No se podían mandar documentos (las fotos sí funcionaban).

**Decisión — visor de fotos (causa confirmada).**
[`ImageViewerModal`](src/presentation/note/components/ImageViewerModal.tsx)
(#140) mezclaba, sobre la misma vista, un `Pressable` (el sistema de
toques de React Native) para "tocar cierra" con un `GestureDetector`
(el sistema de Gesture Handler) envolviéndolo para "deslizar cambia de
foto". Los dos sistemas no se arbitran entre sí de forma confiable: el
`Pressable` ganaba siempre su `onPress` al soltar el dedo, cerrando el
visor antes de que se llegara a ver el cambio de foto — aunque el
gesto de deslizar sí calculaba bien el índice nuevo por dentro, nunca
se mostraba porque el modal ya se había cerrado.

Se sacó el `Pressable` de la ecuación: ahora un solo `usePanGesture`
resuelve las dos cosas. Al activar (moverse más de `minDistance: 2`)
guarda que se activó (`activatedRef`); al soltar
(`onDeactivate`, solo se llama si llegó a activarse), si se deslizó
más de `MIN_SWIPE = 60`px para un lado u otro cambia de foto, si se
movió menos que eso pero algo, cierra (mismo resultado que un toque);
si nunca llegó a activarse (toque quieto, sin mover nada), lo agarra
`onFinalize` (que se llama siempre, se haya activado o no) y cierra
ahí. Nunca hay dos sistemas de toques compitiendo por la misma vista —
mismo principio que ya usa el resto de los gestos de esta app (un
`GestureDetector` por vista, nunca un `Touchable`/`Pressable` debajo
de él en el mismo lugar).

**Decisión — documentos (causa no confirmada con certeza, reforzado
por las dudas más probables).** Sin logs del dispositivo no se pudo
confirmar la causa exacta, así que se reforzaron las dos sospechas más
creíbles en vez de una sola:
1. [`copyIntoNoteMedia`](src/data/note/noteMediaStorage.ts) armaba el
   nombre del archivo copiado pegando el nombre **original** del
   documento tal cual (`asset.name`) — a diferencia de una foto (que
   llega con un nombre "de cámara" predecible), un documento elegido
   por el usuario puede traer espacios, acentos, paréntesis o
   cualquier otro carácter, y terminar generando un nombre de archivo
   que la carpeta de medios no pudiera crear. Nueva función
   `sanitizeFileNamePart`: cualquier carácter que no sea
   letra/número/punto/guión se reemplaza por `_`, recortado a 80
   caracteres — se aplica solo al nombre del archivo guardado
   (`fileName`), nunca al `originalName` que se muestra (ese sigue
   siendo el nombre real, sin tocar).
2. [`pickNoteMedia.ts`](src/presentation/note/pickNoteMedia.ts) suma
   `copyToCacheDirectory: true` explícito a `getDocumentAsync` (ya era
   el default, pero a propósito, por las dudas de que algo lo
   cambiara) y, más importante, **tanto `NoteDetailScreen` como
   `NoteCard`** ahora envuelven todo `chooseAttach` (elegir + copiar +
   mandar) en un `try`/`catch` con `Alert.alert` mostrando el mensaje
   real del error (mismo criterio que ya usa `useBackup.ts`) — antes,
   si `pickNoteDocuments`/`copyIntoNoteMedia` tiraban una excepción, no
   había ningún `catch` en la cadena de llamadas hasta el toque del
   botón: la promesa quedaba rechazada sin que nadie la atendiera, y en
   release eso no muestra nada — exactamente "no pasa nada" visto
   desde afuera. Si vuelve a fallar, ahora debería aparecer un cartel
   con el motivo real, en vez de silencio.

**Alternativas descartadas.**

- **Seguir usando `Pressable` para cerrar, pero deshabilitarlo mientras
  el gesto de deslizar está activo** (en vez de sacarlo del todo). Se
  descartó: seguiría habiendo dos sistemas de toques sobre la misma
  vista, con el mismo riesgo de arbitrarse mal en algún caso borde —
  sacar el `Pressable` por completo es la solución de raíz, no un
  parche sobre el síntoma.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. El arreglo del visor de fotos tiene una causa clara
y debería quedar resuelto; el de documentos es una mejora defensiva
sobre las sospechas más probables, no una causa confirmada — falta
confirmar en el dispositivo real si esto lo resuelve, o si el próximo
intento al menos muestra un error que ayude a encontrar la causa de
verdad.

---

## 142. Las causas reales de #141: `Modal` necesita su propio `GestureHandlerRootView`, y los documentos necesitan `copyAsync` (no `File.copy()`) *(elección del usuario)*

**Contexto.** El arreglo de #141 no alcanzó: deslizar en el visor de
fotos seguía sin cambiar de foto, y mandar un documento seguía
fallando — ahora con el error real, mostrado gracias al `Alert.alert`
que #141 agregó: `Call to function 'FileSystemFile.copy' has been
rejected. → Caused by: Missing 'READ' permission for accessing the
file.`. Con ese mensaje, y volviendo a pensar el problema del visor, se
pudo confirmar la causa de los dos.

**Decisión — visor de fotos.** El arreglo de #141 (sacar el
`Pressable`, dejar todo en un solo `usePanGesture`) atacaba el
síntoma equivocado: el gesto nunca se activaba, con o sin `Pressable`
de por medio. La causa real es más básica —
[`ImageViewerModal`](src/presentation/note/components/ImageViewerModal.tsx)
pone su `GestureDetector` adentro de un `<Modal>` de React Native, que
renderiza su contenido en una **ventana nativa aparte** (un `Dialog`
en Android). El único `GestureHandlerRootView` de la app vive en
`App.tsx`, envolviendo la pantalla principal — no llega a esa ventana
aparte, así que Gesture Handler nunca recibía los toques ahí dentro.
Arreglo: un `GestureHandlerRootView` propio, anidado, como hijo directo
del `Modal` — es literalmente lo que pide la documentación de Gesture
Handler para cualquier gesto adentro de un `Modal`.

**Decisión — documentos.** El mensaje de error lo dice todo:
`FileSystemFile.copy` (la API nueva de `expo-file-system`, la que
usaba `copyIntoNoteMedia`) no puede leer la uri `content://` que
devuelve el selector de documentos del sistema (SAF) — le falta el
permiso de lectura que esa API no sabe pedir/usar para esas uris.
[`noteMediaStorage.ts`](src/data/note/noteMediaStorage.ts) cambió la
copia a `copyAsync` de **`expo-file-system/legacy`** (`{ from:
sourceUri, to: destination.uri }`) — la propia documentación de esa
función dice explícitamente que sirve para "copiar contenido
compartido por otras apps al sistema de archivos local", y es el mismo
mecanismo que `useBackup.ts` ya usa (con el mismo picker) para
importar un backup, donde nunca dio este problema. Se cambió para
**los tres tipos** (foto/documento/audio), no solo documentos: aunque
las fotos no mostraron el error, usar un solo mecanismo de copia,
probado, para todo, es menos riesgo que mantener dos (uno por tipo de
uri) que puedan divergir en silencio más adelante.

**Alternativas descartadas.**

- **Seguir con la API nueva (`File`/`Directory`) y buscar cómo pedirle
  permiso de lectura a una uri SAF a mano** (p. ej.
  `takePersistableUriPermissionAsync` del lado nativo). Se descartó:
  `copyAsync` ya resuelve exactamente este caso, documentado, y sin
  agregar código nuevo — `File`/`Directory` se siguen usando para todo
  lo demás (crear la carpeta, armar la uri de destino, borrar, chequear
  si existe), que no tuvo ningún problema.
- **Un segundo `GestureHandlerRootView` a nivel de toda la pantalla de
  Anotaciones**, en vez de uno local al `Modal`. Se descartó: más
  amplio de lo que hace falta — el problema es específicamente que el
  contenido vive en una ventana nativa aparte (el `Modal`), no que
  falte un root view en general; uno local, justo donde se necesita,
  es más simple y no puede afectar a nada más de la pantalla.

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Las dos causas están confirmadas con evidencia
real (el error exacto, para documentos; el razonamiento sobre
`Modal`+Gesture Handler, documentado por la propia librería, para el
visor) — a diferencia de #141, acá no queda ninguna duda abierta sobre
cuál es el problema, solo falta la confirmación final en el
dispositivo.

---

## 143. `copyAsync` tampoco servía: ni fotos ni documentos se podían copiar — se resolvió leyendo y escribiendo en base64, sin "copiar" nada *(elección del usuario)*

**Contexto.** El arreglo de #142 (pasar de `File.copy()` a `copyAsync`
de `expo-file-system/legacy`) no alcanzó tampoco: después de probarlo,
las fotos dejaron de mostrarse (antes funcionaban, con `File.copy()`)
y los documentos siguieron fallando — ahora con un error distinto:
`Call to function 'ExponentFileSystem.copyAsync' has been rejected. →
Caused by: java.io.IOException: Location
'file:///data/user/0/host.exp.exponent/cache/DocumentPicker/....pdf'
isn't readable.` Dos datos importantes de este mensaje: (1) la ruta ya
era `file://`, local, de la caché de la propia app (no `content://`)
— `copyToCacheDirectory: true` sí había copiado el documento antes de
que `copyIntoNoteMedia` hiciera nada — y aun así `copyAsync` no pudo
leerla; (2) el paquete `host.exp.exponent` confirma que la prueba es
dentro de **Expo Go**, no una build EAS propia — lo cual, al ser todos
módulos oficiales de Expo (`expo-audio`/`expo-image-picker`/
`expo-clipboard`/`expo-document-picker`), es válido y no hace falta
una build nueva para probarlos; la suposición repetida en #135-#142 de
que hacía falta una build EAS para probar esto era innecesariamente
conservadora.

**Decisión.** Ni `File.copy()` (#135) ni `copyAsync` (#142) resultaron
confiables para copiar un archivo cuyo origen viene de otro módulo
(picker/grabador) — cada uno falló con una uri distinta, lo que
sugiere que el problema de fondo es la operación de **copiar entre dos
uris** en sí (depende de que ambas APIs de archivo —origen y
destino— sean compatibles entre sí), no un detalle puntual de cuál
uri en particular. Se reemplazó "copiar" por **leer todo el archivo
como texto `base64` y escribirlo en el destino**
(`FileSystemLegacy.readAsStringAsync(sourceUri, { encoding: 'base64'
})` + `writeAsStringAsync(destination.uri, base64, { encoding:
'base64' })`) — mismo mecanismo, con el mismo picker, que ya usa
`useBackup.ts` para importar un backup (ahí lee como texto UTF-8 en
vez de base64, por ser JSON, pero es la misma función). Leer no
depende de la uri de destino para nada, y escribir no depende de la
uri de origen para nada — se eliminó la única operación (copiar) que
había fallado dos veces seguidas, de dos formas distintas, con dos
APIs distintas.

**Alternativas descartadas.**

- **Probar una tercera función de copiar** (por ejemplo, alguna
  variante específica para SAF). Se descartó: dos intentos fallidos
  con dos mecanismos de copiar distintos es señal suficiente de que el
  problema es la operación en sí en este entorno (Expo Go), no la
  función puntual elegida — leer+escribir evita la categoría entera de
  problema.
- **Mantener `copyAsync` solo para documentos y `File.copy()` para
  fotos/audio** (como estaba antes de unificar en #142). Se descartó
  de nuevo: con las fotos ahora también rotas con `copyAsync`, no hay
  ningún mecanismo de copiar que haya demostrado ser confiable para
  los tres tipos — leer+escribir si lo es (es, además, el único de
  los tres que ya tenía un uso real y probado en esta app, en
  `useBackup.ts`).

**Consecuencias.** `npx tsc --noEmit` y
`npx expo export --platform android --output-dir dist-check`
corrieron limpios. Costo aceptado: el archivo entero pasa por memoria
codificado en base64 (~33% más grande que el archivo real) en vez de
copiarse en streaming — aceptable a la escala personal de esta app
(fotos/documentos sueltos, no archivos de GBs). Falta la confirmación
en el dispositivo real — esta vez debería andar para los tres tipos,
dado que es el mismo mecanismo que ya funciona hoy para importar un
backup.

---

## 144. La causa real de "isn't readable": Expo Go solo deja leer su carpeta aislada; el picker de documentos ahora devuelve `content://` y la copia prueba varias estrategias *(elección del usuario)*

**Contexto.** Después de #143 seguía el error `isn't readable` para
`.../cache/DocumentPicker/....pdf`, las fotos no se veían al entrar a
la galería y pasar de Anotación a Fotos fallaba igual.

**Decisión.** En Expo Go el permiso de lectura de `expo-file-system` se
calcula por carpeta *aislada de la experiencia*, pero
`expo-document-picker` (y el de imágenes) copian a la caché general de
la app (`context.cacheDir`), fuera de esa carpeta — de ahí "isn't
readable" aunque la ruta sea `file://` propia, y por eso ni `copyAsync`
ni leer base64 sirven sobre esa copia. Cambios:
1. `pickNoteDocuments` usa `copyToCacheDirectory: false`: devuelve la uri
   `content://` original, que sí se puede leer.
2. `copyIntoNoteMedia` prueba en orden `copyAsync` (legacy),
   leer+escribir base64 y `File.copy`, y solo falla si las tres fallan
   (devuelve el último error); además verifica que el destino exista.
   Las fotos (que también se veían vacías porque el archivo nunca
   llegaba a existir) pasan por la misma ruta.

**Consecuencias.** `npx tsc --noEmit` limpio; falta confirmar en el
dispositivo. Las fotos/documentos que ya fallaron antes no existen en
disco y hay que volver a mandarlos.

---

## 145. Abrir documentos con su app (`ACTION_VIEW`) y visor de fotos con tamaño explícito *(elección del usuario)*

**Contexto.** Tocar un documento solo ofrecía "compartir", y el visor de
una foto recién mandada mostraba solo el fondo oscuro y el contador, sin
la imagen.

**Decisión.** Nueva dependencia `expo-intent-launcher` (`~58.0.3`).
`openNoteDocument` (en `noteMediaStorage.ts`) lanza un intent
`android.intent.action.VIEW` con una uri `content://`
(`getContentUriAsync`) y el `mimeType` del mensaje; si no hay app capaz
de abrirlo, o en iOS, cae a `Sharing.shareAsync`. Burbuja y galería lo
usan. En `ImageViewerModal` la imagen pasó de `100%`/`100%` a
`useWindowDimensions()` explícito (el porcentaje no resolvía dentro del
`Modal`) y se sacó el fondo oscuro duplicado (`root` transparente,
`backdrop` oscuro).

**Consecuencias.** `tsc` limpio; sin probar en dispositivo. Como se
agregó un módulo nativo, Expo Go lo trae (`expo-intent-launcher` es
oficial); una build EAS propia necesita regenerarse.

---

## 146. Mover un pack de fotos fallaba; selección más rápida con vibración; un solo botón de anotaciones; mensajes favoritos con su pestaña *(elección del usuario)*

**Contexto.** Cuatro pedidos juntos sobre el chat de anotaciones.

**Decisión.**
1. **Bug del pack de 4 fotos.** `SetNoteMessageNotes` reconstruía el
   mensaje con `createNoteMessage` sin pasarle `mediaItems`, y para
   `kind: 'image'` eso se leía como "sin archivo" (`Falta el archivo del
   mensaje`). Ahora pasa `mediaItems` (y `favorite`).
2. **Selección rápida + vibración.** La burbuja usa
   `delayLongPress={220}` (default de RN: 500 ms). La vibración
   (`expo-haptics`, `~58.0.7`, `ImpactFeedbackStyle.Medium`) se dispara en
   `useNoteDetail.startSelection`, no en la burbuja, para que la card de la
   pestaña (donde mantener presionado no hace nada) no vibre.
3. **Un solo botón de anotaciones.** `PickNoteModal` y el botón "quitar"
   se reemplazaron por `ManageNotesModal`: lista todas las anotaciones con
   checkbox lleno/vacío (lleno = TODOS los mensajes seleccionados ya
   pertenecen; con varios, una anotación a la que pertenecen solo algunos
   aparece vacía). Los cambios se aplican recién con "Guardar"
   (`applyNoteMembership`). Un mensaje que quedaría sin ninguna anotación
   no se toca y se avisa (misma regla de siempre: no existe `noteIds: []`).
4. **Favoritos.** `NoteMessage.favorite?` (nuevo, en el mensaje — vale para
   todas las anotaciones donde esté), usecase `SetNoteMessageFavorite`,
   estrella en `SelectionBar` junto al lápiz (a diferencia del lápiz,
   funciona con varios: si todos ya son favoritos los desmarca, si no marca
   a todos), y estrellita en la hora de la burbuja. Editar texto conserva
   el favorito. En la galería, nueva pestaña "Favoritos" (después de
   Documentos; el deslizar lateral ahora recorre las tres). Tocar un favorito
   hace `popTo('NoteDetail', { noteId, focusMessageId })`: el chat lee el
   parámetro, cierra la búsqueda, scrollea al mensaje (posición por
   `onLayout` de cada fila) y lo resalta ~1,8 s; mientras tanto se
   suspende el scroll automático al final.

**Consecuencias.** `tsc` limpio; sin probar en dispositivo. Mensajes ya
guardados siguen válidos (`favorite` es opcional).

---

## 147. El build de EAS fallaba en R8 por `expo-clipboard@~8.0.7`: corregido a `~58.0.4`

**Contexto.** `eas build -p android --profile preview` fallaba en
`:app:minifyReleaseWithR8` con `Missing class
expo.modules.kotlin.types.LazyKType (referenced from:
expo.modules.clipboard.ClipboardModule)`.

**Causa.** #137 instaló `expo-clipboard` en `~8.0.7`, una versión de un SDK
viejo (la numeración de los paquetes `expo-*` se alineó con el SDK a partir
de entonces); en `expo/bundledNativeModules.json` del SDK 58 es `~58.0.4`.
La 8.x usa clases de `expo-modules-core` que ya no existen. En Expo Go no
se notaba (trae su propia copia); solo explota al compilar nativo.

**Decisión.** `npm install expo-clipboard@~58.0.4`. Regla: instalar siempre
la versión que marca `bundledNativeModules.json`, nunca una "parecida".
Las demás diferencias que muestra `npx expo install --check` son de parche
y no son la causa.

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
- **Las anotaciones (#117) no tienen orden manual propio** (como sí
  listas/trackers desde #95/#113): en Anotaciones y en Favoritos quedan en
  orden de creación.
- **El gesto de deslizar para responder un mensaje (#117/#118/#119) no se
  probó en un dispositivo real:** ahora el área táctil es toda la fila (ver
  #119), así que conviene revisar de nuevo si convive bien con mantener
  presionado (seleccionar), con el scroll vertical del chat, o (desde #118,
  que lo habilitó también en la card) con el gesto horizontal del carrusel
  de Favoritos.
- **El arreglo del teclado para campos adentro de una card con scroll
  (`KeyboardFloatingPanel`, #123-#127 — anotaciones en la pestaña/
  Favoritos, comentario de tracker, descripción de mood) sigue sin probarse
  en un dispositivo real:** #123 reemplazó cuatro intentos fallidos de
  desplazar el scroll hasta el campo (#118/#121/#122) por un panel flotante
  en un `Modal`; #124 cambió `autoFocus` por `ref` + `Modal.onShow`; #125 le
  sumó a `onShow` un margen chico (`ANDROID_FOCUS_DELAY = 50`ms); #126
  agrandó el panel para tolerar que el teclado de algunos teléfonos (con
  filas propias de sugerencias/GIFs) sea más alto que lo que reporta el
  sistema; #127 cambió los botones de enviar/confirmar a `onPressIn`; #128
  sacó `returnKeyType="send"` de `NoteComposer`; #129 separó la altura por
  caso de uso y sacó "Enter manda" en anotaciones; #130 identificó la causa
  real del doble toque (`Modal` en Android se come el primer toque fuera
  del campo enfocado — bug conocido, `facebook/react-native#28871`) pero
  `keyboardShouldPersistTaps="always"` no alcanzó para arreglarlo; #131
  sacó `Modal` de la ecuación por completo — el panel ahora es un único
  `View` absoluto por pantalla (`useFloatingOverlay`, fuera del
  `ScrollView`), con el teclado resuelto a mano en Android
  (`useAndroidKeyboardHeight`, la misma técnica de #120) — **confirmado por
  el usuario que el toque ya funciona**; #132 pegó el contenido abajo del
  panel, sumó un tirador para cerrar deslizando, bajó las alturas un 20% y
  reforzó el foco al abrir (`useFocusOnOpen`, doble `requestAnimationFrame`)
  sin confirmar todavía si eso alcanza para que el teclado de tracker/mood
  abra siempre a la primera. Si sigue sin abrir, el próximo paso es
  investigar más a fondo ese caso puntual o, si se repite en más lugares,
  `react-native-keyboard-controller` (dependencia nueva, requiere
  `react-native-reanimated`). El chat completo (#120, campo anclado al
  fondo de la pantalla, no adentro de una card) sigue aparte y el usuario
  ya confirmó que funciona.
- **Grabar audio manteniendo presionado el micrófono (`AudioRecordButton`,
  #138) no se probó en ningún dispositivo real todavía:** combina, por
  primera vez en este código base, un permiso nativo async
  (`requestRecordingPermissionsAsync`) a mitad de un gesto activo y
  `activateAfterLongPress` de `usePanGesture` (nunca usado antes acá). Sin
  traba (lock) en esta versión, a propósito (elección del usuario). Dado
  el historial de esta app con gestos (#118-#133), hay que asumir que
  necesitará ajustes después del primer uso real — y recién ahí conviene
  evaluar si agregar la traba.
