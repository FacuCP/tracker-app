import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { FileText, Star } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { container } from '../../../core/di/container';
import { noteMediaExists, noteMediaUri, openNoteDocument } from '../../../data/note/noteMediaStorage';
import {
  NoteMessage,
  NoteMessageMedia,
  noteMessageMediaItems,
  noteMessagePreviewText,
} from '../../../domain/note/entities/NoteMessage';
import { formatTime } from '../../../core/utils/date';
import { useHorizontalSwipe } from '../../calendar/useHorizontalSwipe';
import { ImageViewerModal } from '../../note/components/ImageViewerModal';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteMedia'>;

type Section = 'photos' | 'documents' | 'favorites';

const SECTIONS: Section[] = ['photos', 'documents', 'favorites'];
const SECTION_LABELS: Record<Section, string> = { photos: 'Fotos', documents: 'Documentos', favorites: 'Favoritos' };

const GRID_COLUMNS = 4;
const GRID_GAP = 6;
const CONTENT_PADDING = 14;

function formatFileSize(bytes?: number): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Control segmentado para elegir la sección — mismo patrón que `CalendarViewSwitch` en los trackers. */
function SectionSwitch({ value, onChange }: { value: Section; onChange: (section: Section) => void }) {
  return (
    <View style={styles.switchContainer}>
      {SECTIONS.map((key) => {
        const active = key === value;
        return (
          <TouchableOpacity
            key={key}
            style={[styles.switchSegment, active && styles.switchSegmentActive]}
            onPress={() => onChange(key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.switchLabel, active && styles.switchLabelActive]}>{SECTION_LABELS[key]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Galería de medios de una anotación: fotos o documentos, nunca las dos
 * secciones a la vez — se elige con un control segmentado (mismo patrón que
 * la vista Semana/Mes/Año de los trackers, `CalendarViewSwitch`) o
 * deslizando a los costados (mismo gesto que ya usan los trackers para
 * moverse de período, `useHorizontalSwipe`). Pide los mismos mensajes que
 * el chat (`getNoteMessages`, ya filtra por `noteIds`) y los separa
 * client-side por `kind`; no hace falta un usecase propio. Las fotos se
 * muestran todas juntas en una sola cuadrícula de 4 por fila (una por foto,
 * sin importar si varias se mandaron agrupadas en un mismo mensaje);
 * deslizar sobre una foto abierta pasa a la siguiente/anterior de esa misma
 * cuadrícula (`ImageViewerModal`, compartido con la burbuja del chat).
 */
export function NoteMediaScreen({ route, navigation }: Props) {
  const { noteId } = route.params;
  const { width } = useWindowDimensions();
  const [messages, setMessages] = useState<NoteMessage[] | null>(null);
  const [section, setSection] = useState<Section>('photos');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      container.getNoteMessages.execute(noteId).then((result) => {
        if (active) setMessages(result);
      });
      return () => {
        active = false;
      };
    }, [noteId]),
  );

  // Deslizar a la izquierda pasa a la sección siguiente, a la derecha a la anterior.
  const swipe = useHorizontalSwipe({
    onSwipeLeft: () => setSection((s) => SECTIONS[Math.min(SECTIONS.indexOf(s) + 1, SECTIONS.length - 1)]),
    onSwipeRight: () => setSection((s) => SECTIONS[Math.max(SECTIONS.indexOf(s) - 1, 0)]),
  });

  if (messages == null) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ActivityIndicator style={styles.loader} size="large" />
      </SafeAreaView>
    );
  }

  const photos: NoteMessageMedia[] = messages.filter((m) => m.kind === 'image').flatMap(noteMessageMediaItems);
  const documents = messages.filter((m) => m.kind === 'document' && m.media);
  const favorites = messages.filter((m) => m.favorite);
  const existingPhotoUris = photos.filter((media) => noteMediaExists(media.fileName)).map((media) => noteMediaUri(media.fileName));
  const tileSize = (width - CONTENT_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <SectionSwitch value={section} onChange={setSection} />
      </View>
      <GestureDetector gesture={swipe}>
        <ScrollView contentContainerStyle={styles.content}>
          {section === 'photos' ? (
            photos.length === 0 ? (
              <Text style={styles.emptyText}>Sin fotos todavía.</Text>
            ) : (
              <View style={[styles.grid, { gap: GRID_GAP }]}>
                {photos.map((media) => {
                  if (!noteMediaExists(media.fileName)) return null;
                  const uri = noteMediaUri(media.fileName);
                  const index = existingPhotoUris.indexOf(uri);
                  return (
                    <TouchableOpacity key={media.fileName} onPress={() => setViewerIndex(index)} activeOpacity={0.85}>
                      <Image
                        source={{ uri }}
                        style={[styles.thumb, { width: tileSize, height: tileSize }]}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          ) : section === 'favorites' ? (
            favorites.length === 0 ? (
              <Text style={styles.emptyText}>Sin mensajes favoritos todavía.</Text>
            ) : (
              favorites.map((message) => {
                const sent = new Date(message.sentAt);
                return (
                  <TouchableOpacity
                    key={message.id}
                    style={styles.documentRow}
                    onPress={() => navigation.popTo('NoteDetail', { noteId, focusMessageId: message.id })}
                    activeOpacity={0.7}
                  >
                    <Star size={20} color="#f59e0b" fill="#f59e0b" />
                    <View style={styles.documentTexts}>
                      <Text style={styles.documentName} numberOfLines={3}>
                        {noteMessagePreviewText(message)}
                      </Text>
                      <Text style={styles.documentSize}>
                        {sent.toLocaleDateString('es-AR')} · {formatTime(sent)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          ) : documents.length === 0 ? (
            <Text style={styles.emptyText}>Sin documentos todavía.</Text>
          ) : (
            documents.map((message) => {
              const media = message.media!;
              const exists = noteMediaExists(media.fileName);
              const size = formatFileSize(media.fileSize);
              return (
                <TouchableOpacity
                  key={message.id}
                  style={styles.documentRow}
                  disabled={!exists}
                  onPress={() => openNoteDocument(media.fileName, media.mimeType).catch(() => {})}
                  activeOpacity={0.7}
                >
                  <FileText size={22} color={exists ? theme.colors.accent : theme.colors.textMuted} />
                  <View style={styles.documentTexts}>
                    <Text style={styles.documentName} numberOfLines={1}>
                      {media.originalName ?? media.fileName}
                    </Text>
                    <Text style={styles.documentSize}>{exists ? size ?? '' : 'Archivo no encontrado'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </GestureDetector>

      <ImageViewerModal
        photos={viewerIndex != null ? existingPhotoUris : null}
        startIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loader: {
    marginTop: 48,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: '#dfe2ec',
    borderRadius: 10,
    padding: 3,
  },
  switchSegment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  switchSegmentActive: {
    backgroundColor: '#f8f9fc',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  switchLabelActive: {
    color: '#111827',
  },
  content: {
    padding: 14,
    gap: 10,
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  thumb: {
    borderRadius: 8,
    backgroundColor: theme.colors.card,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  documentTexts: {
    flex: 1,
    gap: 1,
  },
  documentName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  documentSize: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
});
