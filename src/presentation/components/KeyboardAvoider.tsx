import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleProp, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Empuja el contenido hacia arriba cuando aparece el teclado, para que no tape
 * el campo que se está escribiendo. Se usa dentro de los `Modal` (donde Android
 * no reajusta solo) y en los formularios largos.
 *
 * `padding` en iOS y `height` en Android es la combinación recomendada por RN
 * y funciona tanto para hojas ancladas abajo como centradas.
 */
export function KeyboardAvoider({ children, style }: Props) {
  return (
    <KeyboardAvoidingView
      style={[styles.fill, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
