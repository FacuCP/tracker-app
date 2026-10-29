import { Pencil } from 'lucide-react-native';
import { TouchableOpacity, ViewStyle } from 'react-native';

import { theme } from '../../core/theme';

interface Props {
  onPress: () => void;
  /** Lado del ícono en px (por defecto 18). */
  size?: number;
  style?: ViewStyle;
}

/** Botón de lápiz para editar algo cuya fila ya usa el toque principal para otra cosa (p. ej. marcar hecho). */
export function EditButton({ onPress, size = 18, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={10} activeOpacity={0.6} style={style}>
      <Pencil size={size} color={theme.colors.accent} strokeWidth={2.25} />
    </TouchableOpacity>
  );
}
