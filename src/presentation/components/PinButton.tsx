import { Pin } from 'lucide-react-native';
import { TouchableOpacity, ViewStyle } from 'react-native';

import { theme } from '../../core/theme';

interface Props {
  pinned: boolean;
  onToggle: () => void;
  size?: number;
  style?: ViewStyle;
}

/** Botón de "pin" para que algo quede desplegado por defecto. */
export function PinButton({ pinned, onToggle, size = 18, style }: Props) {
  return (
    <TouchableOpacity onPress={onToggle} hitSlop={10} activeOpacity={0.6} style={style}>
      <Pin
        size={size}
        color={pinned ? theme.colors.accent : theme.colors.textMuted}
        fill={pinned ? theme.colors.accent : 'none'}
        strokeWidth={2}
      />
    </TouchableOpacity>
  );
}
