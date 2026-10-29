import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { SelectionBar } from '../../components/SelectionBar';
import { ListEntryModal } from '../../list/components/ListEntryModal';
import { ListEntryRow } from '../../list/components/ListEntryRow';
import { ListSortSelector } from '../../list/components/ListSortSelector';
import { formatRating } from '../../list/parseRating';
import { useListDetail } from '../../list/viewmodels/useListDetail';

type Props = NativeStackScreenProps<RootStackParamList, 'ListDetail'>;

export function ListDetailScreen({ route, navigation }: Props) {
  const { listId } = route.params;
  const vm = useListDetail(listId);
  const list = vm.list;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: list?.name ?? 'Lista',
      headerRight: () =>
        list ? (
          <Text style={styles.headerLink} onPress={vm.openAdd}>
            ＋ Entrada
          </Text>
        ) : null,
    });
  }, [navigation, list, vm.openAdd]);

  function confirmDeleteList() {
    if (!list) return;
    Alert.alert('Borrar lista', `Se borrará "${list.name}" y todas sus entradas.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await vm.deleteList();
          navigation.goBack();
        },
      },
    ]);
  }

  function confirmDeleteSelected() {
    const n = vm.selectedIds.size;
    Alert.alert(
      n === 1 ? 'Borrar entrada' : 'Borrar entradas',
      n === 1 ? 'Se borrará la entrada seleccionada.' : `Se borrarán las ${n} entradas seleccionadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: vm.deleteSelected },
      ],
    );
  }

  if (!vm.loading && !list) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Text style={styles.missing}>Esta lista ya no existe.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {vm.loading || !list ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <>
            {vm.selectionMode ? (
              <SelectionBar count={vm.selectedIds.size} onCancel={vm.clearSelection} onDelete={confirmDeleteSelected} />
            ) : (
              <View style={styles.sortBar}>
                <Text style={styles.sortLabel}>Ordenar por</Text>
                <ListSortSelector value={vm.sort} onChange={vm.setSort} isTodo={list.isTodo} />
              </View>
            )}

            {vm.entries.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  Lista vacía. Agregá una entrada con “＋ Entrada”.
                </Text>
              </View>
            ) : (
              <View style={styles.entries}>
                {vm.entries.map((entry, index) => (
                  <ListEntryRow
                    key={entry.id}
                    entry={entry}
                    position={index + 1}
                    first={index === 0}
                    isTodo={list.isTodo}
                    onPress={() => vm.openEntry(entry)}
                    onToggleDone={() => vm.toggleDone(entry)}
                    onLongPress={() => vm.startSelection(entry.id)}
                    selectionMode={vm.selectionMode}
                    selected={vm.selectedIds.has(entry.id)}
                    onToggleSelected={() => vm.toggleSelected(entry.id)}
                  />
                ))}
              </View>
            )}

            {!vm.selectionMode ? (
              <TouchableOpacity style={styles.deleteList} onPress={confirmDeleteList}>
                <Text style={styles.deleteListText}>Borrar esta lista</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>

      <ListEntryModal
        visible={vm.addOpen || vm.selected != null}
        listName={list?.name ?? ''}
        isTodo={list?.isTodo ?? false}
        initial={
          vm.selected
            ? {
                name: vm.selected.name,
                date: vm.selected.date ?? null,
                comment: vm.selected.comment ?? '',
                rating: vm.selected.rating != null ? formatRating(vm.selected.rating) : '',
              }
            : null
        }
        onClose={() => {
          vm.closeAdd();
          vm.closeEntry();
        }}
        onSave={vm.saveEntry}
        onDelete={vm.selected ? vm.deleteEntry : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 16,
  },
  sortBar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  headerLink: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
  loader: {
    marginTop: 48,
    alignSelf: 'center',
  },
  empty: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  entries: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  deleteList: {
    marginTop: 28,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteListText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  missing: {
    textAlign: 'center',
    marginTop: 40,
    color: theme.colors.textMuted,
  },
});
