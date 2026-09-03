import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { FinanceSummaryCard } from '../../finance/components/FinanceSummaryCard';
import { ListCard } from '../../list/components/ListCard';
import { ListEntryModal } from '../../list/components/ListEntryModal';
import { MoodTrackerCard } from '../../mood/components/MoodTrackerCard';
import { TrackerCard } from '../../tracker/components/TrackerCard';
import { CreateChooserModal } from './CreateChooserModal';
import { FavoritesSortSelector } from './FavoritesSortSelector';
import { useFavorites } from './useFavorites';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const vm = useFavorites();
  const [chooserOpen, setChooserOpen] = useState(false);

  function choose(what: 'tracker' | 'list') {
    setChooserOpen(false);
    navigation.navigate(what === 'tracker' ? 'Trackers' : 'Lists', { create: true });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>{vm.greeting}</Text>
        <Text style={styles.subtitle}>Tus trackers y listas favoritos</Text>

        {vm.loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <>
            {vm.isEmpty ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  Todavía no marcaste nada como favorito. Tocá la estrella en un tracker o en una
                  lista para que aparezca acá.
                </Text>
              </View>
            ) : (
              <>
                {vm.financeFavorite ? (
                  <FinanceSummaryCard
                    balance={vm.balance}
                    favorite
                    onToggleFavorite={vm.toggleFinanceFavorite}
                    onAddIncome={() => navigation.navigate('Finances', { add: 'income' })}
                    onAddExpense={() => navigation.navigate('Finances', { add: 'expense' })}
                  />
                ) : null}
                {vm.moodFavorite ? (
                  <MoodTrackerCard
                    onSeeProgress={() => navigation.navigate('MoodProgress')}
                    onFavoriteToggled={vm.reload}
                  />
                ) : null}

                {vm.items.length > 1 ? (
                  <FavoritesSortSelector value={vm.sort} onChange={vm.setSort} />
                ) : null}

                {vm.items.map((item) =>
                  item.type === 'tracker' ? (
                    <TrackerCard
                      key={item.id}
                      trackerId={item.id}
                      onSeeProgress={() =>
                        navigation.navigate('TrackerProgress', { trackerId: item.id })
                      }
                      onFavoriteToggled={vm.reload}
                    />
                  ) : (
                    <ListCard
                      key={item.id}
                      list={item.list}
                      counts={vm.counts[item.id] ?? { total: 0, done: 0 }}
                      onAddEntry={() => vm.openAddEntry(item.list)}
                      onOpen={() => navigation.navigate('ListDetail', { listId: item.id })}
                      onToggleFavorite={() => vm.toggleListFavorite(item.list)}
                    />
                  ),
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setChooserOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.createText}>＋ Crear</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <CreateChooserModal
        visible={chooserOpen}
        onClose={() => setChooserOpen(false)}
        onChoose={choose}
      />

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
    textAlign: 'center',
    lineHeight: 20,
  },
  createButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.textMuted,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
});
