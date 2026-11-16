import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Comportamiento en Android (en iOS siempre es `'padding'`).
   *
   * `'height'` (default): reduce el alto propio del contenedor restando el
   * alto del teclado — funciona bien dentro de un `Modal` (ventana nativa
   * aparte, sin edge-to-edge). En una pantalla común de esta app (con
   * edge-to-edge, el default desde Android 15/Expo recientes) esa resta
   * depende de una medición de su propio alto que puede quedar
   * desactualizada bajo edge-to-edge, y el campo de abajo termina tapado en
   * vez de subir.
   *
   * `'padding'`: en vez de recalcular su propio alto, solo le suma
   * `paddingBottom` — no depende de remedirse, así que no tiene ese
   * problema. Usalo en pantallas completas (no modales).
   */
  androidBehavior?: 'height' | 'padding';
}

/**
 * Empuja el contenido hacia arriba cuando aparece el teclado, para que no tape
 * el campo que se está escribiendo. Se usa dentro de los `Modal` (donde Android
 * no reajusta solo) y en los formularios largos.
 *
 * `padding` en iOS y `height` en Android es la combinación recomendada por RN
 * y funciona tanto para hojas ancladas abajo como centradas.
 */
export function KeyboardAvoider({ children, style, androidBehavior = 'height' }: Props) {
  const behavior = Platform.OS === 'ios' ? 'padding' : androidBehavior;
  return (
    <KeyboardAvoidingView style={[styles.fill, style]} behavior={behavior}>
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
