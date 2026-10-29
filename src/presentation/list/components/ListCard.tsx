import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { container } from '../../../core/di/container';
import { theme } from '../../../core/theme';
import { List } from '../../../domain/list/entities/List';
import { ListEntry } from '../../../domain/list/entities/ListEntry';
import { Checkbox } from '../../components/Checkbox';
import { FavoriteStar } from '../../components/FavoriteStar';
import { InfoButton } from '../../components/InfoButton';
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
  /** Solo en Favoritos: siempre desplegada, sin triángulo para colapsarla. */
  alwaysExpanded?: boolean;
}

/** A partir de esta cantidad de entradas, la vista desplegada scrollea en vez de crecer sin límite. */
const MAX_VISIBLE_ENTRIES = 15;

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
 * una entrada rápida; el triángulo despliega/colapsa una vista de los
 * ítems — en to-do lists, tocar una fila tilda/destilda (igual que en el
 * detalle de la lista, ver `ListEntryRow`), con el botón "i" aparte para ver
 * fecha/comentario/rating si tiene; en listas normales, tocar la fila
 * muestra esa misma info (no hay "hecho" que tildar). Para editar o borrar
 * una entrada hay que entrar a la lista como siempre. Con más de 15
 * entradas, esa vista scrollea en vez de crecer sin límite. En Favoritos, el
 * pin hace que quede desplegada por defecto la próxima vez; con
 * `alwaysExpanded` (también solo en Favoritos) queda siempre desplegada y no
 * hay triángulo para colapsarla.
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
  alwaysExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(list.pinnedExpanded);
  const [entries, setEntries] = useState<ListEntry[] | null>(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<ListEntry | null>(null);
  const isExpanded = alwaysExpanded || expanded;

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
    if (!isExpanded) return;
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
  }, [isExpanded, list.id, counts.total, counts.done]);

  async function toggleEntryDone(entry: ListEntry) {
    const next = !entry.done;
    setEntries((prev) => prev?.map((e) => (e.id === entry.id ? { ...e, done: next } : e)) ?? prev);
    await container.setListEntryDone.execute(list.id, entry.id, next);
    onEntryToggled?.();
  }

  function renderEntryRow(entry: ListEntry) {
    const hasInfo = !!entry.comment || entry.date != null || entry.rating != null;

    if (list.isTodo) {
      // Tocar la fila tilda/destilda (lo mismo que el checkbox) — es la
      // acción que más se usa acá; ver la info (fecha/comentario/rating) se
      // mueve al botón "i" aparte, mismo patrón que `ListEntryRow`.
      return (
        <View key={entry.id} style={styles.entryRow}>
          <TouchableOpacity
            style={styles.entryMain}
            onPress={() => toggleEntryDone(entry)}
            activeOpacity={0.6}
          >
            <Checkbox checked={entry.done} onToggle={() => toggleEntryDone(entry)} />
            <Text style={[styles.entryName, entry.done && styles.entryNameDone]} numberOfLines={1}>
              {entry.name}
            </Text>
          </TouchableOpacity>
          {hasInfo ? <InfoButton onPress={() => setViewingEntry(entry)} /> : null}
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={entry.id}
        style={styles.entryRow}
        onPress={() => setViewingEntry(entry)}
        activeOpacity={0.6}
      >
        <View style={styles.bullet} />
        <Text style={styles.entryName} numberOfLines={1}>
          {entry.name}
        </Text>
      </TouchableOpacity>
    );
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

        {alwaysExpanded ? null : (
          <TouchableOpacity style={styles.expandButton} onPress={() => setExpanded((v) => !v)} hitSlop={8}>
            <Text style={styles.expandTriangle}>{expanded ? '▾' : '▸'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.addButton} onPress={onAddEntry} activeOpacity={0.7}>
          <Text style={styles.addSign}>＋</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {isExpanded ? (
        <View style={styles.expanded}>
          {loadingEntries ? (
            <ActivityIndicator style={styles.entriesLoader} />
          ) : !entries || entries.length === 0 ? (
            <Text style={styles.emptyEntries}>{list.isTodo ? 'Sin tareas' : 'Sin entradas'}</Text>
          ) : entries.length > MAX_VISIBLE_ENTRIES ? (
            <ScrollView
              style={styles.entriesScroll}
              contentContainerStyle={styles.entriesScrollContent}
              nestedScrollEnabled
            >
              {entries.map(renderEntryRow)}
            </ScrollView>
          ) : (
            entries.map(renderEntryRow)
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
  entriesScroll: {
    maxHeight: 480,
  },
  entriesScrollContent: {
    gap: 10,
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
  entryMain: {
    flex: 1,
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
