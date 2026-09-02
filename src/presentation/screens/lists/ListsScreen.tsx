import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { CreateListButton } from '../../list/components/CreateListButton';
import { CreateListModal } from '../../list/components/CreateListModal';
import { ListCard } from '../../list/components/ListCard';
import { ListEntryModal } from '../../list/components/ListEntryModal';
import { useLists } from '../../list/viewmodels/useLists';

type Props = NativeStackScreenProps<RootStackParamList, 'Lists'>;

export function ListsScreen({ navigation }: Props) {
  const vm = useLists();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>{vm.greeting}</Text>
        <Text style={styles.subtitle}>Estas son tus listas</Text>

        {vm.loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <>
            {vm.lists.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Todavía no tenés listas.</Text>
              </View>
            ) : (
              vm.lists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  counts={vm.counts[list.id] ?? { total: 0, done: 0 }}
                  onAddEntry={() => vm.openAddEntry(list)}
                  onOpen={() => navigation.navigate('ListDetail', { listId: list.id })}
                />
              ))
            )}

            <CreateListButton onPress={vm.openCreate} />
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
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
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
