import { ReactNode, useState } from 'react';
import { Dimensions, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { theme } from '../../core/theme';
import { KeyboardAvoider } from './KeyboardAvoider';
import { useAndroidKeyboardHeight } from './useAndroidKeyboardHeight';

/** Mismos umbrales que el resto de los swipes de la app (carrusel, `NoteMessageBubble`), para que el gesto se sienta igual. */
const DRAG_CLAIM_THRESHOLD = 10;
const DRAG_COMMIT_THRESHOLD = 70;

const BASE_BOTTOM_PADDING = Platform.OS === 'ios' ? 24 : 14;
/**
 * Despega el contenido (campo + chat) un poco del borde de abajo del
 * panel, sin agrandar el panel en sí (el panel ya tiene de sobra por
 * `heightPercent`, ver más abajo) — un 5% del alto de pantalla, pedido
 * así por el usuario después de ver el contenido pegado justo al borde.
 * La app está fija en portrait (`app.json`), así que no hace falta
 * escuchar cambios de `Dimensions` acá.
 */
const EXTRA_BOTTOM_GAP = Dimensions.get('window').height * 0.05;

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * Alto mínimo del panel, como porcentaje de la pantalla (default 50).
   * Cada uso lo ajustó a su gusto por separado: la anotación necesita más
   * aire (tiene una vista previa del chat arriba del campo, ver `NoteCard`)
   * y el comentario de tracker/mood, al ser un campo solo, necesita menos.
   */
  heightPercent?: number;
}

/**
 * Panel flotante, anclado justo arriba del teclado, para un campo que vive
 * adentro de una card dentro de un `ScrollView` largo (la card de una
 * anotación, el comentario de un tracker, la descripción del mood
 * tracker). Se renderiza **una sola vez por pantalla** (no una por card),
 * como parte del árbol normal de la pantalla (sibling del `ScrollView`,
 * nunca adentro) — quien decide qué mostrar ahí es `useFloatingOverlay`.
 *
 * A propósito **no** usa `Modal`: un panel así, metido en un `Modal` en
 * Android, hace que el primer toque sobre cualquier botón del panel se lo
 * coma el sistema para cerrar el teclado, sin llegar nunca a React Native
 * (bug conocido, `facebook/react-native#28871` — ver #130/#131 en
 * `docs/DECISIONS.md`, donde se probó `keyboardShouldPersistTaps` sin
 * éxito porque el problema es más abajo que eso). Al ser un `View`
 * absoluto normal, parte de la misma ventana que el resto de la pantalla,
 * ese problema no existe — a cambio, hay que resolver el teclado a mano
 * en Android (`useAndroidKeyboardHeight`, la misma técnica ya confirmada
 * funcionando en el chat completo de una anotación, #120) en vez de
 * apoyarse en que esto viva en un `Modal` sin edge-to-edge.
 *
 * El contenido queda pegado **abajo** del todo (`flexGrow` + `justify-end`
 * en el `ScrollView`), no arriba: así el campo siempre queda inmediatamente
 * arriba del teclado, y el aire de sobra por el `heightPercent` (ver más
 * abajo) queda arriba del todo, atrás del tirador, en vez de abajo entre el
 * campo y el teclado. Arriba de todo hay un tirador (como en `ListEntryModal`/
 * `CreateNoteModal`) que además se puede deslizar hacia abajo para cerrar
 * el panel, sin usar `Animated` (mismo motivo que el resto de los gestos de
 * esta app: estado común, ver #110/#111).
 */
export function KeyboardFloatingPanel({ visible, onClose, children, heightPercent = 50 }: Props) {
  const androidKeyboardHeight = useAndroidKeyboardHeight();
  const [dragY, setDragY] = useState(0);

  const dragGesture = usePanGesture({
    activeOffsetY: [0, DRAG_CLAIM_THRESHOLD],
    onUpdate: (e) => {
      setDragY(Math.max(0, e.translationY));
    },
    onDeactivate: (e) => {
      if (!e.canceled && dragY >= DRAG_COMMIT_THRESHOLD) {
        onClose();
      }
      setDragY(0);
    },
  });

  if (!visible) return null;

  const panelStyle = [
    styles.panel,
    { minHeight: `${heightPercent}%` as const, transform: [{ translateY: dragY }] },
    Platform.OS === 'android' ? { marginBottom: androidKeyboardHeight } : null,
  ];

  const inner = (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <View style={panelStyle}>
        <GestureDetector gesture={dragGesture}>
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
        </GestureDetector>
        <ScrollView
          contentContainerStyle={[styles.panelContent, { paddingBottom: BASE_BOTTOM_PADDING + EXTRA_BOTTOM_GAP }]}
          keyboardShouldPersistTaps="always"
        >
          {children}
        </ScrollView>
      </View>
    </Pressable>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {Platform.OS === 'ios' ? <KeyboardAvoider>{inner}</KeyboardAvoider> : inner}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    // Más alto de lo que el campo necesita a propósito (`minHeight` se
    // suma inline, ver `heightPercent`): así, aunque el teclado real (con
    // alguna fila extra propia del teclado del teléfono —sugerencias,
    // GIFs, etc.— que no siempre se refleja completa en el alto que
    // reporta el sistema) termine un poco más arriba de lo calculado, el
    // campo de arriba queda con margen de sobra en vez de justo tapado.
    // El espacio de más queda en blanco **arriba** del tirador (el
    // contenido está pegado abajo, ver `panelContent`), nunca entre el
    // campo y el teclado.
  },
  handleArea: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  panelContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
  },
});
