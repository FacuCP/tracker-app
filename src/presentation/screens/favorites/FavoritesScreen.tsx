import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { useHorizontalSwipe } from '../../calendar/useHorizontalSwipe';
import { ReorderRow } from '../../components/ReorderRow';
import { DailyRoutineSummaryCard } from '../../dailyRoutine/components/DailyRoutineSummaryCard';
import { FinanceSummaryCard } from '../../finance/components/FinanceSummaryCard';
import { GymTodayCard } from '../../gym/components/GymTodayCard';
import { ListCard } from '../../list/components/ListCard';
import { ListEntryModal } from '../../list/components/ListEntryModal';
import { MoodTrackerCard } from '../../mood/components/MoodTrackerCard';
import { TrackerCard } from '../../tracker/components/TrackerCard';
import { CreateChooserModal } from './CreateChooserModal';
import { FAVORITES_CARD_GAP, FavoritesCarousel, useCarouselSwipe } from './FavoritesCarousel';
import { FavoriteCard, useFavorites } from './useFavorites';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const vm = useFavorites();
  const [chooserOpen, setChooserOpen] = useState(false);

  const trackersCard = vm.cards.find((c): c is Extract<FavoriteCard, { kind: 'trackers' }> => c.kind === 'trackers');
  const listsCard = vm.cards.find((c): c is Extract<FavoriteCard, { kind: 'lists' }> => c.kind === 'lists');
  // Se crean siempre (nunca condicionales — son hooks), aunque ese carrusel
  // no esté presente todavía: así el gesto existe desde el primer render
  // para el `requireToFail` de abajo.
  const trackersSwipe = useCarouselSwipe(trackersCard?.trackers.length ?? 0);
  const listsSwipe = useCarouselSwipe(listsCard?.lists.length ?? 0);

  // Deslizar hacia la izquierda en cualquier lado que no sea un carrusel
  // lleva a "Rutina diaria" — este swipe espera a que fallen los de los
  // carruseles (`requireToFail`) para que ellos se queden con el gesto
  // cuando arranca encima suyo (ver `useCarouselSwipe`).
  const swipe = useHorizontalSwipe({
    onSwipeLeft: () => navigation.navigate('DailyRoutines'),
    onSwipeRight: () => {},
    requireToFail: [trackersSwipe.gesture, listsSwipe.gesture],
  });

  function choose(what: 'tracker' | 'list' | 'routine') {
    setChooserOpen(false);
    if (what === 'tracker') navigation.navigate('Trackers', { create: true });
    else if (what === 'list') navigation.navigate('Lists', { create: true });
    else navigation.navigate('Gym', { create: true });
  }

  function renderCard(card: FavoriteCard) {
    switch (card.kind) {
      case 'dailyRoutine':
        return (
          <DailyRoutineSummaryCard
            key={card.key}
            tasks={card.tasks}
            doneCount={card.doneCount}
            total={card.total}
            favorite
            onToggleFavorite={vm.toggleDailyRoutineFavorite}
            onToggleTask={vm.toggleDailyRoutineTask}
            onOpen={() => navigation.navigate('DailyRoutines')}
          />
        );
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
      case 'trackers':
        return (
          <FavoritesCarousel
            key={card.key}
            items={card.trackers}
            swipe={trackersSwipe}
            renderItem={(tracker) => (
              <TrackerCard
                trackerId={tracker.id}
                onSeeProgress={() => navigation.navigate('TrackerProgress', { trackerId: tracker.id })}
                onFavoriteToggled={vm.reload}
              />
            )}
          />
        );
      case 'lists':
        return (
          <FavoritesCarousel
            key={card.key}
            items={card.lists}
            swipe={listsSwipe}
            renderItem={(list) => (
              <ListCard
                list={list}
                counts={card.counts[list.id] ?? { total: 0, done: 0 }}
                onAddEntry={() => vm.openAddEntry(list)}
                onOpen={() => navigation.navigate('ListDetail', { listId: list.id })}
                onToggleFavorite={() => vm.toggleListFavorite(list)}
                onEntryToggled={vm.reload}
                defaultExpanded
                compact
                reloadTick={vm.reloadTick}
              />
            )}
          />
        );
      default:
        return null;
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <GestureDetector gesture={swipe}>
      <View style={styles.swipeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <Text style={styles.greeting}>{vm.greeting}</Text>
            {!vm.loading && vm.cards.length > 1 ? (
              <TouchableOpacity onPress={vm.toggleReorder} hitSlop={8}>
                <Text style={styles.reorderButton}>{vm.reorderMode ? 'Listo' : 'Ordenar'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.subtitle}>Tus favoritos</Text>
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
      </GestureDetector>

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
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: FAVORITES_CARD_GAP,
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
