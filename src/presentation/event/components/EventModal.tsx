import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { IsoDate, todayIso } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import {
  CalendarEvent,
  DEFAULT_INTERVAL_DAYS,
  DEFAULT_INTERVAL_MONTHS,
  EventRepeatEndType,
  EventRepeatUnit,
  MAX_EVENT_DESCRIPTION,
  MAX_EVENT_NAME,
  MAX_INTERVAL_DAYS,
  MAX_INTERVAL_MONTHS,
  MIN_INTERVAL_VALUE,
} from '../../../domain/event/entities/CalendarEvent';
import { Checkbox } from '../../components/Checkbox';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';
import { SelectField, SelectOption } from '../../components/SelectField';
import { DateField } from '../../list/components/DateField';
import { OPTION_COLORS, OptionColorPicker } from '../../tracker/components/OptionColorPicker';
import { TimeField } from './TimeField';

/** No se pidió marrón en la paleta de eventos. */
const EVENT_COLORS = OPTION_COLORS.filter((c) => c.toLowerCase() !== '#8b5e3c');

export interface EventDraft {
  name: string;
  description: string;
  date: IsoDate;
  timeFrom: string | null;
  timeTo: string | null;
  color: string;
  repeat: {
    intervalValue: number;
    intervalUnit: EventRepeatUnit;
    endType: EventRepeatEndType;
    endDate?: IsoDate;
    count?: number;
  } | null;
}

interface Props {
  visible: boolean;
  /** Fecha con la que arranca un evento nuevo (p. ej. el día tocado en el calendario). */
  initialDate: IsoDate;
  /** Si viene, se está editando ese evento; si no, es uno nuevo. */
  initial: CalendarEvent | null;
  onClose: () => void;
  onSave: (draft: EventDraft) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

const END_TYPES: readonly SelectOption<EventRepeatEndType>[] = [
  { key: 'never', label: 'Indefinidamente' },
  { key: 'onDate', label: 'Hasta una fecha' },
  { key: 'afterCount', label: 'Cantidad de veces' },
];

const UNIT_OPTIONS: readonly SelectOption<EventRepeatUnit>[] = [
  { key: 'days', label: 'Días' },
  { key: 'months', label: 'Meses' },
];

/** Modal para crear o editar un evento: nombre, fecha, horario, color y repetición opcional. */
export function EventModal({ visible, initialDate, initial, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<IsoDate>(initialDate);
  const [timeFrom, setTimeFrom] = useState<string | null>(null);
  const [timeTo, setTimeTo] = useState<string | null>(null);
  const [color, setColor] = useState<string>(EVENT_COLORS[0]);
  const [repeats, setRepeats] = useState(false);
  const [intervalUnit, setIntervalUnit] = useState<EventRepeatUnit>('days');
  /** Se guarda un texto por unidad, para no perder lo tipeado al ir y volver entre días y meses. */
  const [intervalDaysText, setIntervalDaysText] = useState(String(DEFAULT_INTERVAL_DAYS));
  const [intervalMonthsText, setIntervalMonthsText] = useState(String(DEFAULT_INTERVAL_MONTHS));
  const [endType, setEndType] = useState<EventRepeatEndType>('never');
  const [endDate, setEndDate] = useState<IsoDate>(initialDate);
  const [count, setCount] = useState('1');
  const [saving, setSaving] = useState(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setDate(initial?.date ?? initialDate);
      setTimeFrom(initial?.timeFrom ?? null);
      setTimeTo(initial?.timeTo ?? null);
      setColor(initial?.color ?? EVENT_COLORS[0]);
      setRepeats(initial?.repeat != null);
      setIntervalUnit(initial?.repeat?.intervalUnit ?? 'days');
      setIntervalDaysText(
        initial?.repeat?.intervalUnit === 'days' ? String(initial.repeat.intervalValue) : String(DEFAULT_INTERVAL_DAYS),
      );
      setIntervalMonthsText(
        initial?.repeat?.intervalUnit === 'months'
          ? String(initial.repeat.intervalValue)
          : String(DEFAULT_INTERVAL_MONTHS),
      );
      setEndType(initial?.repeat?.endType ?? 'never');
      setEndDate(initial?.repeat?.endDate ?? initial?.date ?? initialDate);
      setCount(initial?.repeat?.count != null ? String(initial.repeat.count) : '1');
      setSaving(false);
    }
    wasVisible.current = visible;
  }, [visible, initial, initialDate]);

  const intervalText = intervalUnit === 'months' ? intervalMonthsText : intervalDaysText;
  const setIntervalText = intervalUnit === 'months' ? setIntervalMonthsText : setIntervalDaysText;
  const intervalValue = Number(intervalText);
  const maxInterval = intervalUnit === 'months' ? MAX_INTERVAL_MONTHS : MAX_INTERVAL_DAYS;
  const countValue = Number(count);

  const intervalError =
    repeats &&
    (intervalText.trim() === '' ||
      !Number.isInteger(intervalValue) ||
      intervalValue < MIN_INTERVAL_VALUE ||
      intervalValue > maxInterval)
      ? `Poné un entero entre ${MIN_INTERVAL_VALUE} y ${maxInterval}`
      : undefined;
  const countError =
    repeats &&
    endType === 'afterCount' &&
    (count.trim() === '' || !Number.isInteger(countValue) || countValue < 1)
      ? 'Poné un entero mayor o igual a 1'
      : undefined;
  const endDateError = repeats && endType === 'onDate' && endDate < date ? 'Tiene que ser posterior al evento' : undefined;

  const canSave = name.trim().length > 0 && !intervalError && !countError && !endDateError && !saving;

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name,
        description,
        date,
        timeFrom,
        timeTo,
        color,
        repeat: repeats
          ? {
              intervalValue,
              intervalUnit,
              endType,
              endDate: endType === 'onDate' ? endDate : undefined,
              count: endType === 'afterCount' ? countValue : undefined,
            }
          : null,
      });
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
            <Text style={styles.title}>{initial ? 'Editar evento' : 'Nuevo evento'}</Text>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={MAX_EVENT_NAME}
              />

              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Descripción (opcional)"
                placeholderTextColor={theme.colors.textMuted}
                value={description}
                onChangeText={setDescription}
                maxLength={MAX_EVENT_DESCRIPTION}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.field}>
                <DateField value={date} onChange={setDate} />
              </View>

              <View style={styles.row}>
                <View style={styles.field}>
                  <TimeField value={timeFrom} onChange={setTimeFrom} label="Desde" />
                </View>
                <View style={styles.field}>
                  <TimeField value={timeTo} onChange={setTimeTo} label="Hasta" />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Color</Text>
                <OptionColorPicker value={color} onChange={setColor} colors={EVENT_COLORS} />
              </View>

              <TouchableOpacity
                style={styles.repeatToggle}
                onPress={() => setRepeats((v) => !v)}
                activeOpacity={0.7}
              >
                <Checkbox checked={repeats} onToggle={() => setRepeats((v) => !v)} />
                <Text style={styles.repeatLabel}>Se repite</Text>
              </TouchableOpacity>

              {repeats ? (
                <View style={styles.repeatBox}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Repetir cada</Text>
                    <View style={styles.row}>
                      <View style={styles.intervalValueField}>
                        <TextInput
                          style={[styles.input, intervalError && styles.inputError]}
                          placeholder={intervalUnit === 'months' ? String(DEFAULT_INTERVAL_MONTHS) : String(DEFAULT_INTERVAL_DAYS)}
                          placeholderTextColor={theme.colors.textMuted}
                          value={intervalText}
                          onChangeText={setIntervalText}
                          keyboardType="number-pad"
                          maxLength={4}
                        />
                      </View>
                      <View style={styles.field}>
                        <SelectField value={intervalUnit} options={UNIT_OPTIONS} onChange={setIntervalUnit} />
                      </View>
                    </View>
                    {intervalError ? <Text style={styles.error}>{intervalError}</Text> : null}
                  </View>

                  <View style={styles.field}>
                    <View style={styles.row}>
                      <View style={styles.field}>
                        <SelectField label="Repetición" value={endType} options={END_TYPES} onChange={setEndType} />
                      </View>

                      {endType === 'onDate' ? (
                        <View style={styles.field}>
                          <DateField value={endDate} onChange={setEndDate} label="Hasta" />
                        </View>
                      ) : null}

                      {endType === 'afterCount' ? (
                        <View style={styles.field}>
                          <Text style={styles.label}>Cantidad de veces</Text>
                          <TextInput
                            style={[styles.input, countError && styles.inputError]}
                            placeholder="1"
                            placeholderTextColor={theme.colors.textMuted}
                            value={count}
                            onChangeText={setCount}
                            keyboardType="number-pad"
                            maxLength={4}
                          />
                        </View>
                      ) : null}
                    </View>
                    {endDateError ? <Text style={styles.error}>{endDateError}</Text> : null}
                    {countError ? <Text style={styles.error}>{countError}</Text> : null}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.actions}>
              {onDelete ? (
                <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={onDelete}>
                  <Text style={styles.deleteText}>Borrar</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.button, styles.saveButton, !canSave && styles.disabled]}
                onPress={submit}
                disabled={!canSave}
              >
                <Text style={styles.saveText}>{initial ? 'Guardar' : 'Agregar'}</Text>
              </TouchableOpacity>
            </View>
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
    paddingBottom: 32,
    maxHeight: '88%',
    gap: 6,
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
  form: {
    gap: 12,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  descriptionInput: {
    minHeight: 70,
  },
  inputError: {
    borderColor: '#f87171',
  },
  error: {
    color: '#b91c1c',
    fontSize: 12,
  },
  repeatToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  repeatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  repeatBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  intervalValueField: {
    width: 70,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 96,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
  },
  disabled: {
    opacity: 0.4,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
});
