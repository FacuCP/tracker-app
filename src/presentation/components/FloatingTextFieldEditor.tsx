import { Check } from 'lucide-react-native';
import { ComponentRef, useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { theme } from '../../core/theme';
import { useFocusOnOpen } from './useFocusOnOpen';
import { FloatingOverlay } from './useFloatingOverlay';

interface Props {
  /** Panel flotante compartido por toda la pantalla, ver `useFloatingOverlay`. */
  overlay: FloatingOverlay;
  /** Identifica a esta card dentro del panel compartido (p. ej. `tracker-${id}`). */
  overlayKey: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  keyboardType?: 'default' | 'decimal-pad';
  heightPercent?: number;
}

/**
 * Placeholder "de mentira" (misma pinta que un campo, muestra lo ya
 * escrito) para el comentario de `TrackerCard` o la descripción de
 * `MoodEditor` cuando se usan en una card de un `ScrollView` largo (el home
 * o Favoritos) — tocarlo empuja el campo de verdad + un botón de tilde al
 * panel flotante compartido de la pantalla (`overlay`), arriba del
 * teclado. El texto ya se guarda en tiempo real (`onChangeText` apunta
 * directo al estado existente del viewmodel) — el tilde solo cierra el
 * panel, no hace falta "confirmar" nada aparte.
 *
 * Cuando `MoodEditor` se usa en un lugar que **ya** es su propio `Modal`
 * sin esta clase de problema (el editor del calendario, `MoodDayModal`),
 * no pasa `overlay` — ahí sigue siendo un campo de texto común, sin este
 * componente de por medio.
 */
export function FloatingTextFieldEditor({
  overlay,
  overlayKey,
  value,
  onChangeText,
  placeholder,
  maxLength,
  keyboardType = 'default',
  heightPercent = 20,
}: Props) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const isOpen = overlay.isOpen(overlayKey);

  function panelContent() {
    return (
      <View style={styles.row}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          maxLength={maxLength}
          keyboardType={keyboardType}
          multiline={keyboardType === 'default'}
        />
        <TouchableOpacity style={styles.confirmButton} onPressIn={overlay.close}>
          <Check size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  // Mantiene el campo flotante actualizado mientras es el que está
  // abierto — si otra card lo abrió mientras tanto, `isOpen` da `false`
  // acá y no hace nada.
  useEffect(() => {
    if (isOpen) overlay.update(overlayKey, panelContent());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, value]);

  useFocusOnOpen(isOpen, inputRef);

  function open() {
    overlay.open(overlayKey, panelContent(), heightPercent);
  }

  return (
    <TouchableOpacity style={styles.placeholder} onPress={open} activeOpacity={0.7}>
      <Text style={[styles.placeholderText, !value && styles.placeholderMuted]} numberOfLines={1}>
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  placeholderText: {
    color: theme.colors.text,
  },
  placeholderMuted: {
    color: theme.colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxHeight: 100,
    fontSize: 14,
    color: theme.colors.text,
  },
  confirmButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
