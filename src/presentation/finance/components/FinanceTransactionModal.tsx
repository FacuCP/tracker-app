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

import { IsoDate, formatDdMmYyyy, todayIso } from '../../../core/utils/date';
import { theme } from '../../../core/theme';
import { FinanceCategory, GENERAL_CATEGORY } from '../../../domain/finance/entities/FinanceCategory';
import {
  FinanceAmountChange,
  FinanceKind,
  MAX_FINANCE_NAME,
} from '../../../domain/finance/entities/FinanceTransaction';
import { Checkbox } from '../../components/Checkbox';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';
import { DateField } from '../../list/components/DateField';
import { formatAmountInput, formatMoney, parseAmount } from '../money';

export interface FinanceTransactionDraft {
  kind: FinanceKind;
  name: string;
  date: IsoDate;
  comment: string;
  /** Texto del campo Monto ya formateado ("$ 1.234,50"); se parsea al guardar. */
  amount: string;
  categoryId?: string;
  repeats: boolean;
  repeatForever: boolean;
  repeatMonths: number;
  /** Ajustes de monto ({ from, amount }), ordenados por fecha. */
  adjustments: FinanceAmountChange[];
  /** Solo en edición de un movimiento con repetición: marcado como finalizado. */
  finished: boolean;
}

interface Props {
  visible: boolean;
  kind: FinanceKind;
  categories: FinanceCategory[];
  /** Valores iniciales (para editar). Si es null, es un movimiento nuevo. */
  initial: FinanceTransactionDraft | null;
  onClose: () => void;
  onSave: (draft: FinanceTransactionDraft) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

const INCOME = '#16a34a';
const EXPENSE = '#dc2626';

export function FinanceTransactionModal({
  visible,
  kind,
  categories,
  initial,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [name, setName] = useState('');
  const [date, setDate] = useState<IsoDate>(todayIso());
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [repeats, setRepeats] = useState(false);
  const [repeatForever, setRepeatForever] = useState(true);
  const [repeatMonths, setRepeatMonths] = useState('6');
  const [adjustments, setAdjustments] = useState<FinanceAmountChange[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustValue, setAdjustValue] = useState('');
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      setName(initial?.name ?? '');
      setDate(initial?.date ?? todayIso());
      setAmount(initial?.amount ?? '');
      setComment(initial?.comment ?? '');
      setCategoryId(initial?.categoryId);
      setRepeats(initial?.repeats ?? false);
      setRepeatForever(initial?.repeatForever ?? true);
      setRepeatMonths(initial ? String(initial.repeatMonths) : '6');
      setAdjustments(initial?.adjustments ?? []);
      setAdjustOpen(false);
      setAdjustValue('');
      setFinished(initial?.finished ?? false);
      setSaving(false);
    }
    wasVisible.current = visible;
  }, [visible, initial]);

  const accent = kind === 'income' ? INCOME : EXPENSE;
  const amountError = parseAmount(amount).error;
  const monthsValue = Number(repeatMonths);
  const monthsError =
    repeats && !repeatForever && (!Number.isInteger(monthsValue) || monthsValue < 1)
      ? 'Poné un número entero de meses (1 o más)'
      : undefined;
  const canSave = name.trim().length > 0 && !amountError && !monthsError && !saving;

  const currentAmount =
    adjustments.length > 0
      ? adjustments[adjustments.length - 1].amount
      : parseAmount(amount).amount ?? 0;
  const adjustParsed = parseAmount(adjustValue);

  function applyAdjustment() {
    if (adjustParsed.amount == null) return;
    const today = todayIso();
    setAdjustments((prev) =>
      [...prev.filter((a) => a.from !== today), { from: today, amount: adjustParsed.amount! }].sort(
        (a, b) => a.from.localeCompare(b.from),
      ),
    );
    setAdjustValue('');
    setAdjustOpen(false);
  }

  function removeAdjustment(from: string) {
    setAdjustments((prev) => prev.filter((a) => a.from !== from));
  }

  async function submit() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        kind,
        name,
        date,
        comment,
        amount,
        categoryId,
        repeats,
        repeatForever,
        repeatMonths: Math.max(1, Math.round(monthsValue) || 1),
        adjustments,
        finished,
      });
    } finally {
      setSaving(false);
    }
  }

  const title = kind === 'income' ? 'ingreso' : 'gasto';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoider>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={[styles.title, { color: accent }]}>
              {initial ? `Editar ${title}` : `Nuevo ${title}`}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Nombre"
                placeholderTextColor={theme.colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={MAX_FINANCE_NAME}
              />

              <View>
                <TextInput
                  style={[styles.input, styles.amountInput, amountError && styles.inputError]}
                  placeholder="$ 0"
                  placeholderTextColor={theme.colors.textMuted}
                  value={amount}
                  onChangeText={(text) => setAmount(formatAmountInput(text))}
                  keyboardType="decimal-pad"
                />
                {amountError && amount.length > 0 ? (
                  <Text style={styles.errorText}>{amountError}</Text>
                ) : null}
              </View>

              <DateField value={date} onChange={setDate} />

              <View>
                <Text style={styles.label}>Categoría</Text>
                <View style={styles.chips}>
                  <CategoryChip
                    label={GENERAL_CATEGORY.name}
                    color={GENERAL_CATEGORY.color}
                    selected={categoryId == null}
                    onPress={() => setCategoryId(undefined)}
                  />
                  {categories.map((category) => (
                    <CategoryChip
                      key={category.id}
                      label={category.name}
                      color={category.color}
                      selected={categoryId === category.id}
                      onPress={() => setCategoryId(category.id)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.repeatBox}>
                <TouchableOpacity
                  style={styles.repeatRow}
                  onPress={() => setRepeats((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Checkbox checked={repeats} onToggle={() => setRepeats((v) => !v)} />
                  <Text style={styles.repeatLabel}>Se repite todos los meses</Text>
                </TouchableOpacity>

                {repeats ? (
                  <>
                    <View style={styles.repeatOptions}>
                      <RepeatOption
                        label="Indefinidamente"
                        active={repeatForever}
                        onPress={() => setRepeatForever(true)}
                      />
                      <RepeatOption
                        label="Por X meses"
                        active={!repeatForever}
                        onPress={() => setRepeatForever(false)}
                      />
                    </View>
                    {!repeatForever ? (
                      <View style={styles.monthsRow}>
                        <TextInput
                          style={[styles.input, styles.monthsInput, monthsError && styles.inputError]}
                          value={repeatMonths}
                          onChangeText={setRepeatMonths}
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                        <Text style={styles.monthsHint}>meses (contando este)</Text>
                      </View>
                    ) : null}
                    {monthsError ? <Text style={styles.errorText}>{monthsError}</Text> : null}

                    {initial ? (
                      <View style={styles.adjustBox}>
                        <Text style={styles.adjustCurrent}>
                          Monto actual: {formatMoney(currentAmount)}
                        </Text>

                        {adjustments.map((change) => (
                          <View key={change.from} style={styles.adjustRow}>
                            <Text style={styles.adjustRowText}>
                              Desde {formatDdMmYyyy(change.from)}: {formatMoney(change.amount)}
                            </Text>
                            <TouchableOpacity onPress={() => removeAdjustment(change.from)} hitSlop={8}>
                              <Text style={styles.adjustRemove}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}

                        {adjustOpen ? (
                          <View style={styles.monthsRow}>
                            <TextInput
                              style={[styles.input, styles.adjustInput]}
                              value={adjustValue}
                              onChangeText={(t) => setAdjustValue(formatAmountInput(t))}
                              keyboardType="decimal-pad"
                              placeholder="Nuevo monto"
                              placeholderTextColor={theme.colors.textMuted}
                              autoFocus
                            />
                            <TouchableOpacity
                              style={[styles.adjustApply, adjustParsed.amount == null && styles.disabled]}
                              onPress={applyAdjustment}
                              disabled={adjustParsed.amount == null}
                            >
                              <Text style={styles.adjustApplyText}>Aplicar</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.adjustButton}
                            onPress={() => setAdjustOpen(true)}
                          >
                            <Text style={styles.adjustButtonText}>Ajustar monto (desde hoy)</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : null}
                  </>
                ) : null}

                {initial && repeats ? (
                  <TouchableOpacity
                    style={[styles.repeatRow, styles.finishedRow]}
                    onPress={() => setFinished((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Checkbox checked={finished} onToggle={() => setFinished((v) => !v)} />
                    <Text style={styles.repeatLabel}>
                      Finalizado — no calcular las próximas
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <TextInput
                style={[styles.input, styles.comment]}
                placeholder="Comentario (opcional)"
                placeholderTextColor={theme.colors.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
              />
            </ScrollView>

            <View style={styles.actions}>
              {onDelete ? (
                <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={onDelete}>
                  <Text style={styles.deleteText}>Borrar</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: accent }, !canSave && styles.disabled]}
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

function CategoryChip({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: color }, selected && { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function RepeatOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.repeatOption, active && styles.repeatOptionActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.repeatOptionText, active && styles.repeatOptionTextActive]}>{label}</Text>
    </TouchableOpacity>
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
    maxHeight: '90%',
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
  },
  form: {
    gap: 12,
    paddingVertical: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text,
  },
  amountInput: {
    fontSize: 20,
    fontWeight: '800',
  },
  inputError: {
    borderColor: '#f87171',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    marginTop: 4,
  },
  comment: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
  },
  chipText: {
    fontWeight: '700',
    color: theme.colors.text,
    fontSize: 13,
  },
  chipTextSelected: {
    color: '#fff',
  },
  repeatBox: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  repeatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    flexShrink: 1,
  },
  finishedRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  adjustBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
    gap: 8,
  },
  adjustCurrent: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjustRowText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    flexShrink: 1,
  },
  adjustRemove: {
    color: '#b91c1c',
    fontWeight: '800',
    fontSize: 14,
    paddingHorizontal: 6,
  },
  adjustInput: {
    flex: 1,
    fontWeight: '800',
  },
  adjustApply: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  adjustApplyText: {
    color: '#fff',
    fontWeight: '700',
  },
  adjustButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  adjustButtonText: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  repeatOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  repeatOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  repeatOptionActive: {
    borderColor: theme.colors.accent,
    backgroundColor: '#eff6ff',
  },
  repeatOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  repeatOptionTextActive: {
    color: '#1e3a8a',
  },
  monthsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthsInput: {
    width: 70,
    textAlign: 'center',
    fontWeight: '800',
  },
  monthsHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
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
