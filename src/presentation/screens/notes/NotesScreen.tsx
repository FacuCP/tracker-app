import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { KeyboardFloatingPanel } from '../../components/KeyboardFloatingPanel';
import { useFloatingOverlay } from '../../components/useFloatingOverlay';
import { CreateNoteButton } from '../../note/components/CreateNoteButton';
import { CreateNoteModal } from '../../note/components/CreateNoteModal';
import { NoteCard } from '../../note/components/NoteCard';
import { useNotes } from '../../note/viewmodels/useNotes';

type Props = NativeStackScreenProps<RootStackParamList, 'Notes'>;

export function NotesScreen({ navigation, route }: Props) {
  const vm = useNotes();
  const overlay = useFloatingOverlay();

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
        <Text style={styles.greeting}>{vm.greeting}</Text>
        <Text style={styles.subtitle}>Tus anotaciones</Text>

        {vm.loading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <>
            {vm.notes.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Todavía no tenés anotaciones.</Text>
              </View>
            ) : (
              vm.notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onToggleFavorite={() => vm.toggleFavorite(note)}
                  onOpen={() => navigation.navigate('NoteDetail', { noteId: note.id })}
                  reloadTick={vm.reloadTick}
                  overlay={overlay}
                />
              ))
            )}

            <CreateNoteButton onPress={vm.openCreate} />
          </>
        )}
      </ScrollView>

      <CreateNoteModal visible={vm.createOpen} onClose={vm.closeCreate} onCreate={vm.createNote} />

      <KeyboardFloatingPanel visible={overlay.visible} onClose={overlay.close} heightPercent={overlay.heightPercent}>
        {overlay.content}
      </KeyboardFloatingPanel>
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
