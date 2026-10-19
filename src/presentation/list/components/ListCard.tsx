import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { container } from '../../../core/di/container';
import { theme } from '../../../core/theme';
import { List } from '../../../domain/list/entities/List';
import { ListEntry } from '../../../domain/list/entities/ListEntry';
import { Checkbox } from '../../components/Checkbox';
import { FavoriteStar } from '../../components/FavoriteStar';
import { PinButton } from '../../components/PinButton';
import { ListCounts } from '../viewmodels/useLists';
import { ListEntryInfoModal } from './ListEntryInfoModal';

interface Props {
  list: List;
  counts: ListCounts;
  onAddEntry: () => void;
  onOpen: () => void;
  onToggleFavorite: () => void;
  /** Solo en Favoritos: muestra el botón de pin (desplegada por defecto). */
  showPin?: boolean;
  onTogglePin?: () => void;
  /** Se llama después de tildar/destildar un ítem desde la vista desplegada. */
  onEntryToggled?: () => void;
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
 * Card de una lista. Tocar el encabezado entra a la lista; el botón ＋ agrega
 * una entrada rápida; el triángulo despliega/colapsa una vista de **solo
 * lectura** de los ítems (tildar en to-do lists; para editar o ver más hay
 * que entrar a la lista como siempre). En Favoritos, el pin hace que quede
 * desplegada por defecto la próxima vez.
 */
export function ListCard({
  list,
  counts,
  onAddEntry,
  onOpen,
  onToggleFavorite,
  showPin = false,
  onTogglePin,
  onEntryToggled,
}: Props) {
  const [expanded, setExpanded] = useState(list.pinnedExpanded);
  const [entries, setEntries] = useState<ListEntry[] | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<ListEntry | null>(null);

  // Si se pinea desde otra parte (o al recargar), queda desplegada; nunca se
  // fuerza el colapso solo porque se despineó.
  useEffect(() => {
    if (list.pinnedExpanded) setExpanded(true);
  }, [list.pinnedExpanded]);

  // `counts` cambia cada vez que la pantalla que contiene la card recarga
  // (agregar/borrar una entrada, tildar una tarea desde la lista completa,
  // etc.), así que entra en las dependencias para no tener que cerrar y
  // volver a abrir la vista desplegada para que se actualice.
  useEffect(() => {
    if (!expanded) return;
    let active = true;
    setLoadingEntries(true);
    container.getListEntries.execute(list.id).then((result) => {
      if (active) {
        setEntries(result);
        setLoadingEntries(false);
      }
    });
    return () => {
      active = false;
    };
  }, [expanded, list.id, counts.total, counts.done]);

  async function toggleEntryDone(entry: ListEntry) {
    const next = !entry.done;
    setEntries((prev) => prev?.map((e) => (e.id === entry.id ? { ...e, done: next } : e)) ?? prev);
    await container.setListEntryDone.execute(list.id, entry.id, next);
    onEntryToggled?.();
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={onOpen} activeOpacity={0.7}>
        <FavoriteStar favorite={list.favorite} onToggle={onToggleFavorite} />

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {list.name}
          </Text>
          <Text style={styles.count}>{subtitle(list, counts)}</Text>
        </View>

        {showPin ? (
          <PinButton
            pinned={list.pinnedExpanded}
            onToggle={() => {
              if (!list.pinnedExpanded) setExpanded(true);
              onTogglePin?.();
            }}
          />
        ) : null}

        <TouchableOpacity style={styles.expandButton} onPress={() => setExpanded((v) => !v)} hitSlop={8}>
          <Text style={styles.expandTriangle}>{expanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addButton} onPress={onAddEntry} activeOpacity={0.7}>
          <Text style={styles.addSign}>＋</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.expanded}>
          {loadingEntries ? (
            <ActivityIndicator style={styles.entriesLoader} />
          ) : !entries || entries.length === 0 ? (
            <Text style={styles.emptyEntries}>{list.isTodo ? 'Sin tareas' : 'Sin entradas'}</Text>
          ) : (
            entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryRow}
                onPress={() => setViewingEntry(entry)}
                activeOpacity={0.6}
              >
                {list.isTodo ? (
                  <Checkbox checked={entry.done} onToggle={() => toggleEntryDone(entry)} />
                ) : (
                  <View style={styles.bullet} />
                )}
                <Text
                  style={[styles.entryName, list.isTodo && entry.done && styles.entryNameDone]}
                  numberOfLines={1}
                >
                  {entry.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : null}

      <ListEntryInfoModal entry={viewingEntry} isTodo={list.isTodo} onClose={() => setViewingEntry(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
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
  expandButton: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandTriangle: {
    fontSize: 20,
    fontWeight: '800',
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
  expanded: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  entriesLoader: {
    marginVertical: 8,
  },
  emptyEntries: {
    fontSize: 13,
    color: theme.colors.textMuted,
    paddingVertical: 4,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.textMuted,
  },
  entryName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  entryNameDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
});
