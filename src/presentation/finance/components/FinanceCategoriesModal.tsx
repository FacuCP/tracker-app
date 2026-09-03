import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { theme } from '../../../core/theme';
import { FinanceCategory, MAX_CATEGORY_NAME } from '../../../domain/finance/entities/FinanceCategory';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';
import { OPTION_COLORS, OptionColorPicker } from '../../tracker/components/OptionColorPicker';

export interface FinanceCategoryDraft {
  id?: string;
  name: string;
  color: string;
}

interface Props {
  visible: boolean;
  categories: FinanceCategory[];
  onClose: () => void;
  onSave: (draft: FinanceCategoryDraft) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export function FinanceCategoriesModal({ visible, categories, onClose, onSave, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [color, setColor] = useState(OPTION_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      resetForm();
      setSaving(false);
    }
    wasVisible.current = visible;
  }, [visible]);

  function resetForm() {
    setEditingId(undefined);
    setName('');
    setColor(OPTION_COLORS[0]);
  }

  function startEdit(category: FinanceCategory) {
    setEditingId(category.id);
    setName(category.name);
    setColor(category.color);
  }

  function confirmDelete(category: FinanceCategory) {
    Alert.alert(
      'Borrar categoría',
      `Se borrará "${category.name}". Sus movimientos pasan a "General".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            if (editingId === category.id) resetForm();
            await onDelete(category.id);
          },
        },
      ],
    );
  }

  async function submit() {
    if (name.trim().length === 0) return;
    setSaving(true);
    try {
      await onSave({ id: editingId, name, color });
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoider>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>Categorías</Text>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
              {categories.length === 0 ? (
                <Text style={styles.empty}>
                  Sin categorías propias. Los movimientos van a “General”.
                </Text>
              ) : (
                categories.map((category) => (
                  <View key={category.id} style={styles.row}>
                    <View style={[styles.dot, { backgroundColor: category.color }]} />
                    <Text style={styles.rowName} numberOfLines={1}>
                      {category.name}
                    </Text>
                    <TouchableOpacity onPress={() => startEdit(category)} hitSlop={8}>
                      <Text style={styles.rowAction}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(category)} hitSlop={8}>
                      <Text style={styles.rowDelete}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <View style={styles.form}>
                <Text style={styles.formTitle}>
                  {editingId ? 'Editar categoría' : 'Nueva categoría'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nombre"
                  placeholderTextColor={theme.colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  maxLength={MAX_CATEGORY_NAME}
                />
                <OptionColorPicker value={color} onChange={setColor} />
                <View style={styles.formActions}>
                  {editingId ? (
                    <TouchableOpacity style={styles.ghost} onPress={resetForm}>
                      <Text style={styles.ghostText}>Cancelar</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={[styles.saveButton, (name.trim().length === 0 || saving) && styles.disabled]}
                    onPress={submit}
                    disabled={name.trim().length === 0 || saving}
                  >
                    <Text style={styles.saveText}>{editingId ? 'Guardar' : 'Agregar'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.close} onPress={onClose}>
              <Text style={styles.closeText}>Listo</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '88%',
    gap: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  list: {
    gap: 10,
    paddingVertical: 10,
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  rowName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rowAction: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  rowDelete: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 15,
    paddingHorizontal: 4,
  },
  form: {
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: 14,
    gap: 10,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    alignItems: 'center',
  },
  ghost: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ghostText: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
  close: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeText: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 15,
  },
});
