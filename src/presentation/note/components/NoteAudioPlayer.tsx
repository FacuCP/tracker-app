import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Pause, Play } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../../../core/theme';

function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  uri: string;
  disabled: boolean;
}

/** Reproductor inline de un mensaje de audio: play/pause + tiempo transcurrido/total, sin forma de onda. */
export function NoteAudioPlayer({ uri, disabled }: Props) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  function toggle() {
    if (status.playing) {
      player.pause();
    } else {
      if (status.didJustFinish || status.currentTime >= status.duration) {
        player.seekTo(0);
      }
      player.play();
    }
  }

  return (
    <TouchableOpacity style={styles.row} disabled={disabled} onPress={toggle} activeOpacity={0.7}>
      {status.playing ? (
        <Pause size={22} color={theme.colors.accent} />
      ) : (
        <Play size={22} color={theme.colors.accent} />
      )}
      <Text style={styles.time}>
        {formatSeconds(status.currentTime)} / {formatSeconds(status.duration)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 140,
  },
  time: {
    fontSize: 13,
    color: theme.colors.text,
  },
});
