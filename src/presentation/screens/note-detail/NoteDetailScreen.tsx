import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { Book, Search, X } from 'lucide-react-native';
import { ComponentRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { KeyboardAvoider } from '../../components/KeyboardAvoider';
import { SelectionBar } from '../../components/SelectionBar';
import { useAndroidKeyboardHeight } from '../../components/useAndroidKeyboardHeight';
import { buildNoteTimeline } from '../../note/groupMessagesByDay';
import { NoteComposer } from '../../note/components/NoteComposer';
import { NoteDaySeparator } from '../../note/components/NoteDaySeparator';
import { AttachChooserModal } from '../../note/components/AttachChooserModal';
import { NoteMessageBubble } from '../../note/components/NoteMessageBubble';
import { ManageNotesModal } from '../../note/components/ManageNotesModal';
import { pickNoteDocuments, pickNotePhotos } from '../../note/pickNoteMedia';
import { useNoteDetail } from '../../note/viewmodels/useNoteDetail';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteDetail'>;

export function NoteDetailScreen({ route, navigation }: Props) {
  const { noteId, focusMessageId } = route.params;
  const vm = useNoteDetail(noteId);
  const note = vm.note;
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const androidKeyboardHeight = useAndroidKeyboardHeight();

  // Ir a un mensaje puntual (viene de la pestaña de favoritos de la galería):
  // cada mensaje reporta su posición al renderizarse (`onLayout`) y, cuando
  // se conoce la del buscado, se scrollea ahí. Mientras tanto no se corre el
  // scroll automático al final (`suppressEndScroll`).
  const messageY = useRef<Record<string, number>>({});
  const pendingFocusId = useRef<string | null>(null);
  const suppressEndScroll = useRef(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  function scrollToMessage(id: string) {
    const y = messageY.current[id];
    if (y == null) return;
    pendingFocusId.current = null;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    setHighlightedId(id);
    setTimeout(() => setHighlightedId((current) => (current === id ? null : current)), 1800);
    setTimeout(() => {
      suppressEndScroll.current = false;
    }, 700);
  }

  useEffect(() => {
    if (!focusMessageId || vm.loading) return;
    pendingFocusId.current = focusMessageId;
    suppressEndScroll.current = true;
    vm.closeSearch();
    // Se consume el parámetro: así volver a tocar el mismo favorito vuelve a funcionar.
    navigation.setParams({ focusMessageId: undefined });
    scrollToMessage(focusMessageId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMessageId, vm.loading]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: note?.name ?? 'Anotación',
      // Tocar el nombre lleva a la misma galería que el ícono de libro —
      // una segunda forma de llegar, no reemplaza al ícono.
      headerTitle: () =>
        note ? (
          <TouchableOpacity onPress={() => navigation.navigate('NoteMedia', { noteId })} activeOpacity={0.7}>
            <Text style={styles.headerTitleText} numberOfLines={1}>
              {note.name}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.headerTitleText}>Anotación</Text>
        ),
      headerRight: () =>
        note ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('NoteMedia', { noteId })} hitSlop={8}>
              <Book size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={vm.openSearch} hitSlop={8}>
              <Search size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerLink} onPress={confirmDeleteNote}>
              Borrar
            </Text>
          </View>
        ) : null,
    });
  }, [navigation, note, noteId, vm.openSearch]);

  function confirmDeleteNote() {
    if (!note) return;
    Alert.alert('Borrar anotación', `Se borrará "${note.name}" y todos sus mensajes.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await vm.deleteNote();
          navigation.goBack();
        },
      },
    ]);
  }

  function confirmDeleteSelected() {
    const n = vm.selectedIds.size;
    Alert.alert(
      n === 1 ? 'Borrar mensaje' : 'Borrar mensajes',
      n === 1 ? 'Se borrará el mensaje seleccionado.' : `Se borrarán los ${n} mensajes seleccionados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: vm.deleteSelected },
      ],
    );
  }

  function copySelected() {
    const text = vm.copySelectedText();
    vm.clearSelection();
    Clipboard.setStringAsync(text).catch(() => {});
  }

  async function saveNoteMembership(addIds: string[], removeIds: string[]) {
    const skipped = await vm.applyNoteMembership(addIds, removeIds);
    if (skipped > 0) {
      Alert.alert('Atención', `${skipped} mensaje(s) no se quitaron: quedarían sin ninguna anotación.`);
    }
  }

  async function chooseAttach(what: 'photo' | 'document') {
    vm.closeAttach();
    try {
      const items = what === 'photo' ? await pickNotePhotos() : await pickNoteDocuments();
      vm.sendMediaBatch(items);
    } catch (error) {
      Alert.alert('No se pudo adjuntar', error instanceof Error ? error.message : 'Ocurrió un error');
    }
  }

  const query = vm.searchQuery.trim().toLowerCase();
  const visibleMessages =
    vm.searchOpen && query ? vm.messages.filter((m) => m.text.toLowerCase().includes(query)) : vm.messages;
  const timeline = buildNoteTimeline(visibleMessages);

  if (!vm.loading && !note) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Text style={styles.missing}>Esta anotación ya no existe.</Text>
      </SafeAreaView>
    );
  }

  const body = (
    <>
      {vm.selectionMode ? (
        <SelectionBar
          count={vm.selectedIds.size}
          onCancel={vm.clearSelection}
          onEdit={vm.selectedIds.size === 1 ? vm.startEditingSelected : undefined}
          onCopy={copySelected}
          onAddToNote={vm.openAddToNote}
          onFavorite={vm.toggleFavoriteSelected}
          favoriteActive={vm.selectedMessages.length > 0 && vm.selectedMessages.every((m) => m.favorite)}
          onDelete={confirmDeleteSelected}
        />
      ) : vm.searchOpen ? (
        <View style={styles.searchBar}>
          <Search size={16} color={theme.colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar mensajes"
            placeholderTextColor={theme.colors.textMuted}
            value={vm.searchQuery}
            onChangeText={vm.setSearchQuery}
            autoFocus
          />
          <TouchableOpacity onPress={vm.closeSearch} hitSlop={8}>
            <X size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      {vm.loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => {
            if (!suppressEndScroll.current) scrollRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {timeline.length === 0 ? (
            <Text style={styles.emptyText}>
              {vm.searchOpen && query ? 'No hay mensajes que coincidan.' : 'Todavía no hay mensajes. Mandá el primero.'}
            </Text>
          ) : (
            timeline.map((entry) =>
              entry.kind === 'separator' ? (
                <NoteDaySeparator key={entry.key} date={entry.date} />
              ) : (
                <View
                  key={entry.key}
                  onLayout={(e) => {
                    const id = entry.message.id;
                    messageY.current[id] = e.nativeEvent.layout.y;
                    if (pendingFocusId.current === id) scrollToMessage(id);
                  }}
                >
                <NoteMessageBubble
                  message={entry.message}
                  repliedMessage={vm.getRepliedMessage(entry.message)}
                  selectionMode={vm.selectionMode}
                  selected={vm.selectedIds.has(entry.message.id)}
                  onLongPress={() => vm.startSelection(entry.message.id)}
                  onToggleSelected={() => vm.toggleSelected(entry.message.id)}
                  highlighted={highlightedId === entry.message.id}
                  onSwipeReply={(message) => vm.setReply(message)}
                />
                </View>
              ),
            )
          )}
        </ScrollView>
      )}

      <View style={styles.composerWrap}>
        <NoteComposer
          value={vm.draftText}
          onChangeText={vm.setDraftText}
          onSend={vm.sendMessage}
          replyTarget={vm.replyTarget}
          onCancelReply={vm.cancelReply}
          editing={vm.editingMessage != null}
          onCancelEditing={vm.cancelEditing}
          onAttach={vm.openAttach}
          onSendAudio={(media) => vm.sendMediaBatch([{ kind: 'audio', media }])}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {Platform.OS === 'android' ? (
        <View style={[styles.body, { paddingBottom: androidKeyboardHeight }]}>{body}</View>
      ) : (
        <KeyboardAvoider>{body}</KeyboardAvoider>
      )}

      <ManageNotesModal
        visible={vm.addToNoteOpen}
        messages={vm.selectedMessages}
        onClose={vm.closeAddToNote}
        onSave={saveNoteMembership}
      />
      <AttachChooserModal visible={vm.attachOpen} onClose={vm.closeAttach} onChoose={chooseAttach} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  body: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerLink: {
    color: '#b91c1c',
    fontWeight: '700',
    fontSize: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 4,
  },
  loader: {
    marginTop: 48,
    alignSelf: 'center',
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: theme.colors.textMuted,
  },
  composerWrap: {
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  missing: {
    textAlign: 'center',
    marginTop: 40,
    color: theme.colors.textMuted,
  },
});
