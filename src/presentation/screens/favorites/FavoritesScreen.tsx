import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { ROUTINE_TRACKER_ID } from '../../../domain/dailyRoutine/usecases/SyncRoutineTracker';
import { useHorizontalSwipe } from '../../calendar/useHorizontalSwipe';
import { ReorderRow } from '../../components/ReorderRow';
import { FinanceSummaryCard } from '../../finance/components/FinanceSummaryCard';
import { GymTodayCard } from '../../gym/components/GymTodayCard';
import { ListCard } from '../../list/components/ListCard';
import { ListEntryModal } from '../../list/components/ListEntryModal';
import { MoodTrackerCard } from '../../mood/components/MoodTrackerCard';
import { TrackerCard } from '../../tracker/components/TrackerCard';
import { CreateChooserModal } from './CreateChooserModal';
import { FavoriteCard, useFavorites } from './useFavorites';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const vm = useFavorites();
  const [chooserOpen, setChooserOpen] = useState(false);
  // Deslizar hacia la izquierda lleva a "Rutinas diarias" (todavía sin implementar).
  const swipe = useHorizontalSwipe({
    onSwipeLeft: () => navigation.navigate('DailyRoutines'),
    onSwipeRight: () => {},
  });

  function choose(what: 'tracker' | 'list' | 'routine') {
    setChooserOpen(false);
    if (what === 'tracker') navigation.navigate('Trackers', { create: true });
    else if (what === 'list') navigation.navigate('Lists', { create: true });
    else navigation.navigate('Gym', { create: true });
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
      case 'gym':
        return (
          <GymTodayCard
            key={card.key}
            onFavoriteToggled={vm.reload}
            onOpenGym={() => navigation.navigate('Gym')}
            onOpenRoutine={(routineId) => navigation.navigate('GymRoutineDetail', { routineId })}
          />
        );
      case 'tracker':
        return (
          <TrackerCard
            key={card.key}
            trackerId={card.tracker.id}
            onSeeProgress={() =>
              card.tracker.id === ROUTINE_TRACKER_ID
                ? navigation.navigate('DailyRoutines')
                : navigation.navigate('TrackerProgress', { trackerId: card.tracker.id })
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
            showPin
            onTogglePin={() => vm.toggleListPinnedExpanded(card.list)}
            onEntryToggled={vm.reload}
          />
        );
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.swipeArea} {...swipe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <Text style={styles.greeting}>{vm.greeting}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DailyRoutines')} hitSlop={8}>
              <Text style={styles.dailyRoutinesHintText}>Rutina Diaria ›</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Tus favoritos</Text>

          {!vm.loading && vm.cards.length > 1 ? (
            <TouchableOpacity style={styles.reorderButtonWrap} onPress={vm.toggleReorder} hitSlop={8}>
              <Text style={styles.reorderButton}>{vm.reorderMode ? 'Listo' : 'Ordenar'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

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
                  <ReorderRow
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
      </View>

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
  swipeArea: {
    flex: 1,
  },
  dailyRoutinesHintText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 12,
  },
  headerBlock: {
    gap: 2,
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
  reorderButtonWrap: {
    alignSelf: 'flex-end',
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
