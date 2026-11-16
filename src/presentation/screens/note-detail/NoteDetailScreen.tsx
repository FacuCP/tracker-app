import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search, X } from 'lucide-react-native';
import { ComponentRef, useLayoutEffect, useRef } from 'react';
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
import { NoteMessageBubble } from '../../note/components/NoteMessageBubble';
import { useNoteDetail } from '../../note/viewmodels/useNoteDetail';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteDetail'>;

export function NoteDetailScreen({ route, navigation }: Props) {
  const { noteId } = route.params;
  const vm = useNoteDetail(noteId);
  const note = vm.note;
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const androidKeyboardHeight = useAndroidKeyboardHeight();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: note?.name ?? 'Anotación',
      headerRight: () =>
        note ? (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={vm.openSearch} hitSlop={8}>
              <Search size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerLink} onPress={confirmDeleteNote}>
              Borrar
            </Text>
          </View>
        ) : null,
    });
  }, [navigation, note, vm.openSearch]);

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

  const byId = new Map(vm.messages.map((m) => [m.id, m]));
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
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
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
                <NoteMessageBubble
                  key={entry.key}
                  message={entry.message}
                  repliedMessage={
                    entry.message.replyToId !== undefined ? byId.get(entry.message.replyToId) ?? null : undefined
                  }
                  selectionMode={vm.selectionMode}
                  selected={vm.selectedIds.has(entry.message.id)}
                  onLongPress={() => vm.startSelection(entry.message.id)}
                  onToggleSelected={() => vm.toggleSelected(entry.message.id)}
                  onSwipeReply={(message) => vm.setReply(message)}
                />
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
          sending={vm.sending}
          replyTarget={vm.replyTarget}
          onCancelReply={vm.cancelReply}
          editing={vm.editingMessage != null}
          onCancelEditing={vm.cancelEditing}
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
