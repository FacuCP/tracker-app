import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { FavoriteStar } from '../../components/FavoriteStar';
import { formatMoney } from '../money';

const INCOME = '#16a34a';
const EXPENSE = '#dc2626';

interface Props {
  balance: number;
  favorite: boolean;
  onToggleFavorite: () => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
}

/**
 * Recuadro con la economía actual y los botones de añadir ingreso / gasto.
 * Se puede marcar como favorito con la estrella para que aparezca también en
 * la pantalla principal.
 */
export function FinanceSummaryCard({
  balance,
  favorite,
  onToggleFavorite,
  onAddIncome,
  onAddExpense,
}: Props) {
  return (
    <View style={styles.card}>
      <FavoriteStar favorite={favorite} onToggle={onToggleFavorite} style={styles.star} />

      <Text style={styles.label}>Tu economía actual</Text>
      <Text
        style={[styles.balance, { color: balance < 0 ? EXPENSE : theme.colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.3}
      >
        {formatMoney(balance)}
      </Text>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: INCOME }]}
          onPress={onAddIncome}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Añadir ingreso</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: EXPENSE }]}
          onPress={onAddExpense}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Añadir gasto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    padding: 16,
    paddingTop: 12,
    alignItems: 'center',
    gap: 2,
  },
  star: {
    position: 'absolute',
    top: 10,
    right: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  balance: {
    fontSize: 44,
    fontWeight: '900',
    marginBottom: 10,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});
