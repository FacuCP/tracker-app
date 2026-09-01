import { StyleSheet, View } from 'react-native';

interface Props {
  /** Uno o dos colores hex. Con uno, pinta el cuadrado entero. */
  colors: string[];
  size: number;
  borderRadius?: number;
  /** Color del borde exterior (opcional) */
  borderColor?: string;
}

/**
 * Cuadrado que representa el ánimo de un día:
 * - 1 color  -> relleno completo
 * - 2 colores -> dividido por la diagonal que va de abajo-izquierda a
 *   arriba-derecha. El triángulo de arriba-izquierda es `colors[0]` y el de
 *   abajo-derecha es `colors[1]`.
 *
 * Se dibuja sin SVG: un fondo de color (mitad abajo-derecha) más un
 * triángulo hecho con bordes (mitad arriba-izquierda).
 */
export function DiagonalSplitSquare({ colors, size, borderRadius = 6, borderColor }: Props) {
  const [first, second] = colors;
  const singleColor = colors.length === 1;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: singleColor ? first : (second ?? '#E5E7EB'),
          borderWidth: borderColor ? 1 : 0,
          borderColor,
        },
      ]}
    >
      {!singleColor && first ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            borderTopWidth: size,
            borderRightWidth: size,
            borderTopColor: first,
            borderRightColor: 'transparent',
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
