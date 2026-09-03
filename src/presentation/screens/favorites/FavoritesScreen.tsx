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
import { FavoriteReorderRow } from './FavoriteReorderRow';
import { FavoriteCard, useFavorites } from './useFavorites';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const vm = useFavorites();
  const [chooserOpen, setChooserOpen] = useState(false);

  function choose(what: 'tracker' | 'list') {
    setChooserOpen(false);
    navigation.navigate(what === 'tracker' ? 'Trackers' : 'Lists', { create: true });
  }

  function renderCard(card: FavoriteCard) {
    switch (card.kind) {
      case 'finance':
        return (
          <FinanceSummaryCard
            key={card.key}
            balance={vm.balance}
            favorite
            onToggleFavorite={vm.toggleFinanceFavorite}
            onAddIncome={() => navigation.navigate('Finances', { add: 'income' })}
            onAddExpense={() => navigation.navigate('Finances', { add: 'expense' })}
          />
        );
      case 'mood':
        return (
          <MoodTrackerCard
            key={card.key}
            onSeeProgress={() => navigation.navigate('MoodProgress')}
            onFavoriteToggled={vm.reload}
          />
        );
      case 'tracker':
        return (
          <TrackerCard
            key={card.key}
            trackerId={card.tracker.id}
            onSeeProgress={() =>
              navigation.navigate('TrackerProgress', { trackerId: card.tracker.id })
            }
            onFavoriteToggled={vm.reload}
          />
        );
      case 'list':
        return (
          <ListCard
            key={card.key}
            list={card.list}
            counts={card.counts}
            onAddEntry={() => vm.openAddEntry(card.list)}
            onOpen={() => navigation.navigate('ListDetail', { listId: card.list.id })}
            onToggleFavorite={() => vm.toggleListFavorite(card.list)}
          />
        );
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>{vm.greeting}</Text>
          {!vm.loading && vm.cards.length > 1 ? (
            <TouchableOpacity onPress={vm.toggleReorder} hitSlop={8}>
              <Text style={styles.reorderButton}>{vm.reorderMode ? 'Listo' : 'Ordenar'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.subtitle}>Tus favoritos</Text>

        {vm.loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : vm.isEmpty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Todavía no marcaste nada como favorito. Tocá la estrella en un tracker o en una lista
              para que aparezca acá.
            </Text>
          </View>
        ) : (
          <>
            {vm.reorderMode
              ? vm.cards.map((card, index) => (
                  <FavoriteReorderRow
                    key={card.key}
                    title={card.title}
                    typeLabel={card.typeLabel}
                    isFirst={index === 0}
                    isLast={index === vm.cards.length - 1}
                    onUp={() => vm.move(card.key, 'up')}
                    onDown={() => vm.move(card.key, 'down')}
                  />
                ))
              : vm.cards.map(renderCard)}

            {!vm.reorderMode ? (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setChooserOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.createText}>＋ Crear</Text>
              </TouchableOpacity>
            ) : null}
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
  reorderButton: {
    color: theme.colors.accent,
    fontWeight: '800',
    fontSize: 14,
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
