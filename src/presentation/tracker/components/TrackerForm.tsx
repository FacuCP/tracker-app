import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MAX_TRACKER_NAME } from '../../../domain/tracker/entities/Tracker';
import { Checkbox } from '../../components/Checkbox';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';
import { useTrackerForm } from '../viewmodels/useTrackerForm';
import { OptionColorPicker } from './OptionColorPicker';

interface Props {
  form: ReturnType<typeof useTrackerForm>;
  submitLabel: string;
  saving: boolean;
  onSubmit: () => void;
  onDelete?: () => void;
}

/** Formulario compartido por crear y editar un tracker. */
export function TrackerForm({ form, submitLabel, saving, onSubmit, onDelete }: Props) {
  return (
    <KeyboardAvoider>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Fui al gimnasio"
          placeholderTextColor="#9ca3af"
          value={form.name}
          onChangeText={form.setName}
          maxLength={MAX_TRACKER_NAME}
        />
        {form.nameError ? <Text style={styles.error}>{form.nameError}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.kindSwitch}>
          <KindOption
            active={form.kind === 'options'}
            title="Opciones"
            subtitle="Elegís una opción por día (sí/no, etc.)"
            onPress={() => form.setKind('options')}
          />
          <KindOption
            active={form.kind === 'number'}
            title="Número"
            subtitle="Anotás un número por día"
            onPress={() => form.setKind('number')}
          />
        </View>
      </View>

      {form.kind === 'options' ? (
        <View style={styles.field}>
          <Text style={styles.label}>Opciones</Text>
          {form.options.map((option, index) => (
            <View key={option.key} style={styles.optionRow}>
              <View style={styles.optionTop}>
                <TextInput
                  style={[styles.input, styles.optionInput]}
                  placeholder={`Opción ${index + 1}`}
                  placeholderTextColor="#9ca3af"
                  value={option.label}
                  onChangeText={(text) => form.updateOption(option.key, { label: text })}
                />
                {form.canRemoveOption ? (
                  <TouchableOpacity
                    onPress={() => form.removeOption(option.key)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <OptionColorPicker
                value={option.color}
                onChange={(color) => form.updateOption(option.key, { color })}
              />
            </View>
          ))}

          {form.canAddOption ? (
            <TouchableOpacity onPress={form.addOption} style={styles.addButton}>
              <Text style={styles.addText}>＋ Agregar opción</Text>
            </TouchableOpacity>
          ) : null}

          {form.optionsError ? <Text style={styles.error}>{form.optionsError}</Text> : null}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.favoriteRow}
        onPress={() => form.setFavorite(!form.favorite)}
        activeOpacity={0.7}
      >
        <Checkbox checked={form.favorite} onToggle={() => form.setFavorite(!form.favorite)} />
        <Text style={styles.favoriteLabel}>Agregar a Favoritos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submit, (!form.canSave || saving) && styles.submitDisabled]}
        onPress={onSubmit}
        disabled={!form.canSave || saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{submitLabel}</Text>}
      </TouchableOpacity>

      {onDelete ? (
        <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
          <Text style={styles.deleteText}>Borrar tracker</Text>
        </TouchableOpacity>
      ) : null}
      </ScrollView>
    </KeyboardAvoider>
  );
}

function KindOption({
  active,
  title,
  subtitle,
  onPress,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.kindOption, active && styles.kindOptionActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.kindTitle, active && styles.kindTitleActive]}>{title}</Text>
      <Text style={styles.kindSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    color: '#111827',
    backgroundColor: '#f8f9fc',
  },
  error: {
    color: '#b91c1c',
    fontSize: 12,
  },
  kindSwitch: {
    flexDirection: 'row',
    gap: 10,
  },
  kindOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    gap: 3,
    backgroundColor: '#f8f9fc',
  },
  kindOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  kindTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
  },
  kindTitleActive: {
    color: '#1e3a8a',
  },
  kindSubtitle: {
    fontSize: 11,
    color: '#6b7280',
  },
  optionRow: {
    gap: 8,
    borderWidth: 1,
    borderColor: '#eef0f2',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#f8f9fc',
  },
  optionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionInput: {
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  removeText: {
    color: '#9ca3af',
    fontWeight: '800',
    fontSize: 14,
  },
  addButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
  },
  addText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  favoriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  favoriteLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  submit: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  deleteButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
});
