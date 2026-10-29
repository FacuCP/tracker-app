import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector, PanGesture, usePanGesture } from 'react-native-gesture-handler';

import { theme } from '../../../core/theme';

/** Separación entre cards de Favoritos (ver `FavoritesScreen`) — el contador `‹ N/M ›` se ubica dentro de ese mismo espacio, no agrega uno propio. */
export const FAVORITES_CARD_GAP = 22;

/** Mismos umbrales que `useHorizontalSwipe`, para que el gesto se sienta igual en toda la app. */
const CLAIM_THRESHOLD = 18;
const FAIL_OFFSET_Y = 10;
const COMMIT_THRESHOLD = 45;
const TRANSITION_MS = 320;

export interface CarouselSwipe {
  gesture: PanGesture;
  translateX: Animated.Value;
  /** Índice actual, ya acotado a la cantidad de ítems vigente. */
  index: number;
  /** Para las flechas ‹ › — misma transición animada que arrastrar con el dedo. */
  go: (direction: 1 | -1) => void;
  /** El carrusel llama esto desde su propio `onLayout` — hace falta acá para animar la transición ese ancho exacto. */
  setWidth: (width: number) => void;
}

/**
 * Estado y gesto de un carrusel de Favoritos. Se crea en `FavoritesScreen`
 * (no adentro de `FavoritesCarousel`) porque el `PanGesture` resultante tiene
 * que estar disponible ahí para que el swipe de pantalla completa
 * (`useHorizontalSwipe`) lo use en su `requireToFail` — así el carrusel se
 * queda con el gesto cuando arranca encima suyo, y el swipe de pantalla solo
 * actúa en cualquier otro lado.
 */
export function useCarouselSwipe(itemCount: number): CarouselSwipe {
  const [index, setIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animating = useRef(false);
  const widthRef = useRef(0);
  const countRef = useRef(itemCount);
  countRef.current = itemCount;

  const completeTransitionRef = useRef((_direction: 1 | -1) => {});
  const cancelDragRef = useRef(() => {});

  completeTransitionRef.current = function completeTransition(direction: 1 | -1) {
    if (animating.current || widthRef.current === 0) return;
    animating.current = true;
    Animated.timing(translateX, {
      toValue: -direction * widthRef.current,
      duration: TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      // El reseteo de `translateX` a 0 se hace en el `useLayoutEffect` de
      // abajo, atado al cambio de `index` — si se hiciera acá mismo,
      // `translateX` vuelve a 0 (toma efecto ya, es nativo) antes de que el
      // re-render con el nuevo índice llegue a pantalla (ese sí tarda un
      // tick de React), y en el medio se ve un flash del ítem anterior en
      // la posición de reposo.
      setIndex((i) => {
        const base = Math.min(i, Math.max(0, countRef.current - 1));
        return (base + direction + countRef.current) % countRef.current;
      });
    });
  };

  cancelDragRef.current = function cancelDrag() {
    animating.current = true;
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start(() => {
      animating.current = false;
    });
  };

  // Corre después de que React ya pintó el nuevo índice (nuevo
  // current/prev/next), en el mismo paso visual — así el reseteo de
  // `translateX` no se ve nunca separado del cambio de ítem.
  useLayoutEffect(() => {
    translateX.setValue(0);
    animating.current = false;
  }, [index]);

  const gesture = usePanGesture({
    activeOffsetX: [-CLAIM_THRESHOLD, CLAIM_THRESHOLD],
    failOffsetY: [-FAIL_OFFSET_Y, FAIL_OFFSET_Y],
    onUpdate: (e) => {
      if (!animating.current) translateX.setValue(e.translationX);
    },
    onDeactivate: (e) => {
      if (e.canceled) {
        cancelDragRef.current();
        return;
      }
      if (e.translationX <= -COMMIT_THRESHOLD) completeTransitionRef.current(1);
      else if (e.translationX >= COMMIT_THRESHOLD) completeTransitionRef.current(-1);
      else cancelDragRef.current();
    },
  });

  return {
    gesture,
    translateX,
    index: Math.min(index, Math.max(0, itemCount - 1)),
    go: (direction) => completeTransitionRef.current(direction),
    setWidth: (width) => {
      widthRef.current = width;
    },
  };
}

interface Props<T extends { id: string }> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  /** Gesto y estado de este carrusel — ver `useCarouselSwipe`. */
  swipe: CarouselSwipe;
}

/**
 * Agrupa varias cards del mismo tipo (trackers, listas) en un solo lugar de
 * Favoritos: se ve una por vez, cada una en su tamaño natural (sin
 * estirarlas ni rellenarlas), y se cambia deslizando (siguiendo el dedo,
 * con el siguiente/anterior ya visible al lado) o con las flechas ‹ › de
 * arriba. Es circular: después de la última vuelve a la primera y viceversa.
 * Si el ítem que queda a la vista cambia de alto, lo que sigue debajo en
 * Favoritos sube o baja para acomodarse — el alto del recorte se anima con
 * un `Animated.Value` propio (no `LayoutAnimation`: en la Nueva Arquitectura
 * resultó poco confiable, a veces dejaba un alto intermedio/incorrecto
 * trabado, ver #83). El `overflow: 'hidden'` del recorte, horizontal
 * siempre (oculta los paneles vecinos) y vertical mientras el alto anima,
 * es justo por lo que ninguna card acá puede tener sombra (`shadow*`/
 * `elevation`) — queda cortada de forma despareja; de ahí que `TrackerCard`
 * no tenga (ver #85). El contador
 * `‹ N/M ›` no suma una fila propia: flota en el espacio que ya separa esta
 * card de la anterior (`FAVORITES_CARD_GAP`), así el espacio antes de un
 * carrusel es igual al que hay entre dos cards sueltas.
 */
export function FavoritesCarousel<T extends { id: string }>({ items, renderItem, swipe }: Props<T>) {
  const [width, setWidth] = useState(0);
  // Alto natural de cada ítem, por id — así el carrusel ocupa solo el alto
  // del ítem que se está mostrando (no el máximo entre vecinos, que están
  // montados de costado para la animación pero no se ven).
  const [itemHeights, setItemHeights] = useState<Record<string, number>>({});
  // Alto animado del recorte (`viewport`) — propio en vez de `LayoutAnimation`
  // (ver comentario arriba del componente). Arranca en 0; `hasMeasured` dice
  // si ya se fijó un valor real (si no, el recorte no tiene `height` fija
  // todavía y se deja medir solo, igual que antes).
  const viewportHeightAnim = useRef(new Animated.Value(0)).current;
  const [hasMeasured, setHasMeasured] = useState(false);
  const lastTargetHeight = useRef<number | undefined>(undefined);

  function onLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    swipe.setWidth(w);
    setWidth(w);
  }

  function onItemLayout(id: string, e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height;
    setItemHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  }

  const count = items.length;
  const current = swipe.index;

  if (count === 0) return null;

  const prevIndex = (current - 1 + count) % count;
  const nextIndex = (current + 1) % count;
  // Con exactamente 2 ítems, "anterior" y "siguiente" son el mismo (el otro
  // ítem) — se desambigua la key del panel "siguiente" para que React no
  // vea dos hijos con la misma key.
  const nextKey = prevIndex === nextIndex ? `${items[nextIndex].id}-next` : items[nextIndex].id;
  const targetHeight = itemHeights[items[current].id];

  useEffect(() => {
    if (targetHeight == null) return;
    if (lastTargetHeight.current == null) {
      // Primera vez que se conoce el alto de este carrusel: se fija de
      // una, sin animar desde 0.
      viewportHeightAnim.setValue(targetHeight);
      setHasMeasured(true);
    } else if (lastTargetHeight.current !== targetHeight) {
      Animated.timing(viewportHeightAnim, {
        toValue: targetHeight,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
    lastTargetHeight.current = targetHeight;
  }, [targetHeight]);

  return (
    <View style={styles.wrap}>
      {count > 1 ? (
        <View style={styles.counterOverlay}>
          <TouchableOpacity onPress={() => swipe.go(-1)} hitSlop={8}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.counter}>
            {current + 1}/{count}
          </Text>
          <TouchableOpacity onPress={() => swipe.go(1)} hitSlop={8}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {count === 1 ? (
        renderItem(items[0])
      ) : (
        <Animated.View
          style={[styles.viewport, hasMeasured && { height: viewportHeightAnim }]}
          onLayout={onLayout}
        >
          {width > 0 ? (
            <GestureDetector gesture={swipe.gesture}>
              <Animated.View
                style={[
                  styles.track,
                  { width: width * 3, transform: [{ translateX: Animated.add(swipe.translateX, -width) }] },
                ]}
              >
                <View
                  key={items[prevIndex].id}
                  style={{ width }}
                  onLayout={(e) => onItemLayout(items[prevIndex].id, e)}
                >
                  {renderItem(items[prevIndex])}
                </View>
                <View
                  key={items[current].id}
                  style={{ width }}
                  onLayout={(e) => onItemLayout(items[current].id, e)}
                >
                  {renderItem(items[current])}
                </View>
                <View key={nextKey} style={{ width }} onLayout={(e) => onItemLayout(items[nextIndex].id, e)}>
                  {renderItem(items[nextIndex])}
                </View>
              </Animated.View>
            </GestureDetector>
          ) : null}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // `position: relative` es el default de un View — hace falta para que
    // `counterOverlay` (absoluto) se ubique relativo a este contenedor.
  },
  counterOverlay: {
    position: 'absolute',
    top: -FAVORITES_CARD_GAP,
    right: 0,
    height: FAVORITES_CARD_GAP,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 1,
  },
  navArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  counter: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  viewport: {
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
    // Por defecto una fila estira sus hijos a la altura del más alto de
    // los tres paneles (prev/current/next) — eso inflaba el recorte con
    // el alto de un vecino que ni se ve. Cada panel mide lo suyo nomás.
    alignItems: 'flex-start',
  },
});
