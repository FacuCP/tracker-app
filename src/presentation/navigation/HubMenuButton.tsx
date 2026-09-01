import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { RootStackParamList } from '../../core/navigation/types';
import { theme } from '../../core/theme';

export type HubRoute = 'Trackers' | 'Lists' | 'Finances';

const ITEMS: { route: HubRoute; label: string }[] = [
  { route: 'Trackers', label: 'Trackers' },
  { route: 'Lists', label: 'Listas' },
  { route: 'Finances', label: 'Finanzas' },
];

/**
 * Título del header en las tres pantallas principales: muestra el nombre de la
 * pestaña actual y, al tocarlo, despliega un menú (anclado justo debajo del
 * título) para moverse entre Trackers, Listas y Finanzas.
 */
export function HubMenuButton({ current }: { current: HubRoute }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 56, left: 12 });
  const buttonRef = useRef<View>(null);

  const currentLabel = ITEMS.find((item) => item.route === current)?.label ?? 'Menú';

  function openMenu() {
    const node = buttonRef.current;
    if (node) {
      node.measureInWindow((x, y, _width, height) => {
        setAnchor({ top: y + height + 6, left: Math.max(8, x) });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  }

  function go(route: HubRoute) {
    setOpen(false);
    if (route !== current) {
      navigation.navigate(route);
    }
  }

  return (
    <>
      <View ref={buttonRef} collapsable={false}>
        <TouchableOpacity style={styles.button} onPress={openMenu} activeOpacity={0.7}>
          <Text style={styles.buttonText}>{currentLabel}</Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { top: anchor.top, left: anchor.left }]}>
            {ITEMS.map((item, index) => (
              <TouchableOpacity
                key={item.route}
                style={[styles.item, index > 0 && styles.itemBorder]}
                onPress={() => go(item.route)}
              >
                <Text style={[styles.itemText, item.route === current && styles.itemTextActive]}>
                  {item.label}
                </Text>
                {item.route === current ? <Text style={styles.check}>✓</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  chevron: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 200,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  itemTextActive: {
    color: theme.colors.accent,
    fontWeight: '800',
  },
  check: {
    color: theme.colors.accent,
    fontWeight: '800',
  },
});
