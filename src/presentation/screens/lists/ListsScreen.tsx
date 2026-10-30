import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { ReorderRow } from '../../components/ReorderRow';
import { CreateListButton } from '../../list/components/CreateListButton';
import { CreateListModal } from '../../list/components/CreateListModal';
import { ListCard } from '../../list/components/ListCard';
import { ListEntryModal } from '../../list/components/ListEntryModal';
import { useLists } from '../../list/viewmodels/useLists';

type Props = NativeStackScreenProps<RootStackParamList, 'Lists'>;

export function ListsScreen({ navigation, route }: Props) {
  const vm = useLists();

  const { openCreate } = vm;
  useEffect(() => {
    if (route.params?.create) {
      navigation.setParams({ create: undefined });
      openCreate();
    }
  }, [route.params?.create, navigation, openCreate]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>{vm.greeting}</Text>
          {!vm.loading && vm.lists.length > 1 ? (
            <TouchableOpacity onPress={vm.toggleReorder} hitSlop={8}>
              <Text style={styles.reorderButton}>{vm.reorderMode ? 'Listo' : 'Ordenar'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.subtitle}>Estas son tus listas</Text>

        {vm.loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <>
            {vm.lists.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Todavía no tenés listas.</Text>
              </View>
            ) : vm.reorderMode ? (
              vm.lists.map((list, index) => (
                <ReorderRow
                  key={list.id}
                  title={list.name}
                  typeLabel={list.isTodo ? 'to-do list' : 'lista'}
                  isFirst={index === 0}
                  isLast={index === vm.lists.length - 1}
                  onUp={() => vm.move(list.id, 'up')}
                  onDown={() => vm.move(list.id, 'down')}
                />
              ))
            ) : (
              vm.lists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  counts={vm.counts[list.id] ?? { total: 0, done: 0 }}
                  onAddEntry={() => vm.openAddEntry(list)}
                  onOpen={() => navigation.navigate('ListDetail', { listId: list.id })}
                  onToggleFavorite={() => vm.toggleFavorite(list)}
                  onEntryToggled={vm.reload}
                  reloadTick={vm.reloadTick}
                  showPin
                  onTogglePin={() => vm.togglePinnedExpanded(list)}
                />
              ))
            )}

            {!vm.reorderMode ? <CreateListButton onPress={vm.openCreate} /> : null}
          </>
        )}
      </ScrollView>

      <CreateListModal visible={vm.createOpen} onClose={vm.closeCreate} onCreate={vm.createList} />

      <ListEntryModal
        visible={vm.entryTarget != null}
        listName={vm.entryTarget?.name ?? ''}
        isTodo={vm.entryTarget?.isTodo ?? false}
        initial={null}
        onClose={vm.closeEntryModal}
        onSave={vm.saveEntry}
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  greeting: {
    flexShrink: 1,
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  reorderButton: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 14,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: -6,
    marginBottom: 6,
  },
  loader: {
    marginTop: 48,
  },
  empty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
  },
});
