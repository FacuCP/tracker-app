import { ReactNode, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

const THUMB_WIDTH = 4;
const MIN_THUMB_HEIGHT = 24;

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  nestedScrollEnabled?: boolean;
}

/**
 * `ScrollView` con una barra de scroll propia, siempre visible. El
 * `persistentScrollbar` nativo de Android (lo que usaban `ListCard` y
 * `DailyRoutineSummaryCard`) no se ve en los APK generados con `eas build`
 * (sí en desarrollo, vía Metro) — el scroll en sí funciona bien, es la
 * barrita nativa la que no se pinta, aparentemente por el tema/estilo
 * Android del build standalone. Esta barra no depende de nada nativo: se
 * calcula en JS a partir del alto del contenedor, el alto del contenido y
 * el scroll actual (estado de React común, sin `Animated`/driver nativo —
 * ver #111, crasheaba al tocar el scroll en el build de `eas build`), así
 * que se ve igual en desarrollo y en cualquier build.
 */
export function PersistentScrollView({ children, style, contentContainerStyle, nestedScrollEnabled }: Props) {
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  function onLayout(e: LayoutChangeEvent) {
    setContainerHeight(e.nativeEvent.layout.height);
  }

  function onContentSizeChange(_width: number, height: number) {
    setContentHeight(height);
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setScrollOffset(e.nativeEvent.contentOffset.y);
  }

  const canScroll = containerHeight > 0 && contentHeight > containerHeight;
  const thumbHeight = canScroll
    ? Math.max((containerHeight / contentHeight) * containerHeight, MIN_THUMB_HEIGHT)
    : 0;
  const maxTranslate = Math.max(containerHeight - thumbHeight, 0);
  const maxScroll = Math.max(contentHeight - containerHeight, 1);
  const progress = Math.min(Math.max(scrollOffset / maxScroll, 0), 1);
  const translateY = progress * maxTranslate;

  return (
    <View onLayout={onLayout}>
      <ScrollView
        style={style}
        contentContainerStyle={contentContainerStyle}
        onContentSizeChange={onContentSizeChange}
        onScroll={onScroll}
        scrollEventThrottle={16}
        nestedScrollEnabled={nestedScrollEnabled}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {canScroll ? (
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.thumb, { height: thumbHeight, transform: [{ translateY }] }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    top: 0,
    right: 2,
    bottom: 0,
    width: THUMB_WIDTH,
  },
  thumb: {
    width: THUMB_WIDTH,
    borderRadius: THUMB_WIDTH / 2,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});
