import { useEffect, useRef, useState } from 'react';
import { Image, Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';

interface Props {
  /** `null` = cerrado. La lista completa por la que se puede deslizar (todas las fotos del mensaje, o de toda la galería). */
  photos: string[] | null;
  /** En qué foto de `photos` abrir. */
  startIndex: number;
  onClose: () => void;
}

const MIN_SWIPE = 60;

/**
 * Visor de fotos a pantalla completa, sin zoom, compartido por la burbuja
 * del chat y la galería de medios: deslizar a los costados pasa a la
 * foto anterior/siguiente dentro de `photos` (se clava en las puntas, no
 * da la vuelta); tocar (sin deslizar) cierra.
 *
 * Un solo gesto (`usePanGesture`) decide las dos cosas — a propósito, en
 * vez de un `Pressable`/`TouchableOpacity` para "tocar cierra" por fuera
 * de un `GestureDetector` para "deslizar cambia": mezclar los dos
 * sistemas de toques (el de React Native y el de Gesture Handler) sobre
 * la misma vista no se arbitra bien entre ellos. El propio gesto, al
 * soltar, decide si lo que pasó fue un deslizar (según cuánto se movió,
 * en qué dirección) o, si se movió poco o nada, un toque (cierra).
 *
 * El `<Modal>` de React Native renderiza su contenido en una ventana
 * nativa aparte — el `GestureHandlerRootView` único que ya envuelve toda
 * la app (`App.tsx`) no llega ahí, así que el gesto de este archivo nunca
 * se activaba (#141 solo había tocado el síntoma — sacar el `Pressable` —
 * sin esto seguía sin andar). Por eso hace falta un `GestureHandlerRootView`
 * propio, anidado, adentro del `Modal` — es el arreglo que la propia
 * documentación de Gesture Handler pide para cualquier gesto dentro de un
 * `Modal`.
 */
export function ImageViewerModal({ photos, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  // Si el gesto llegó a activarse (se movió lo suficiente para que
  // `usePanGesture` lo reconozca) — si nunca se activó, fue un toque
  // quieto y lo resuelve `onFinalize` en vez de `onDeactivate`.
  const activatedRef = useRef(false);

  useEffect(() => {
    if (photos) setIndex(startIndex);
  }, [photos, startIndex]);

  const count = photos?.length ?? 0;

  const gesture = usePanGesture({
    minDistance: 2,
    onActivate: () => {
      activatedRef.current = true;
    },
    onDeactivate: (e) => {
      if (e.canceled) return;
      if (e.translationX <= -MIN_SWIPE) {
        setIndex((i) => Math.min(i + 1, count - 1));
      } else if (e.translationX >= MIN_SWIPE) {
        setIndex((i) => Math.max(i - 1, 0));
      } else {
        // Se movió, pero no lo suficiente para contar como deslizar —
        // mismo resultado que un toque quieto: cerrar.
        onClose();
      }
    },
    onFinalize: () => {
      if (!activatedRef.current) onClose();
      activatedRef.current = false;
    },
  });

  const uri = photos?.[index] ?? null;
  const { width, height } = useWindowDimensions();

  return (
    <Modal visible={photos != null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <GestureDetector gesture={gesture}>
          <View style={styles.backdrop}>
            {uri ? <Image source={{ uri }} style={{ width, height }} resizeMode="contain" /> : null}
            {count > 1 ? (
              <View style={styles.counter}>
                <Text style={styles.counterText}>
                  {index + 1}/{count}
                </Text>
              </View>
            ) : null}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
