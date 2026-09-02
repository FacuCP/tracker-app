import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';
import { List } from '../../../domain/list/entities/List';
import { FavoriteStar } from '../../components/FavoriteStar';
import { ListCounts } from '../viewmodels/useLists';

interface Props {
  list: List;
  counts: ListCounts;
  onAddEntry: () => void;
  onOpen: () => void;
  onToggleFavorite: () => void;
}

function subtitle(list: List, counts: ListCounts): string {
  if (list.isTodo) {
    return counts.total === 0
      ? 'To-do list · sin tareas'
      : `To-do list · ${counts.done}/${counts.total} hechas`;
  }
  return counts.total === 0
    ? 'Sin entradas'
    : `${counts.total} ${counts.total === 1 ? 'entrada' : 'entradas'}`;
}

/**
 * Card de una lista. Tocar cualquier parte entra a la lista; el botón ＋ (que
 * captura su propio toque) agrega una entrada rápida.
 */
export function ListCard({ list, counts, onAddEntry, onOpen, onToggleFavorite }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.7}>
      <FavoriteStar favorite={list.favorite} onToggle={onToggleFavorite} />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {list.name}
        </Text>
        <Text style={styles.count}>{subtitle(list, counts)}</Text>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={onAddEntry} activeOpacity={0.7}>
        <Text style={styles.addSign}>＋</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  count: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSign: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.accent,
  },
});
