import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../../../core/navigation/types';
import { useBackup } from '../../backup/useBackup';
import { DefaultTabCard } from '../../user/components/DefaultTabCard';
import { UserNameCard } from '../../user/components/UserNameCard';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { status, exportData, importData } = useBackup();
  const working = status.kind === 'working';

  function confirmImport() {
    Alert.alert(
      'Importar backup',
      'Esto reemplaza TODOS los datos actuales (nombre, mood tracker, trackers y listas) por los del archivo. ¿Seguir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: () => importData(() => navigation.navigate('Trackers')),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <UserNameCard />

        <DefaultTabCard />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Backup de tus datos</Text>
          <Text style={styles.paragraph}>
            Todo lo que cargás se guarda solo en este teléfono. Al{' '}
            <Text style={styles.bold}>actualizar</Text> la app tus datos se
            mantienen; se pierden si desinstalás la app o borrás sus datos.
            Exportá un backup de vez en cuando para estar tranquilo.
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.primary, working && styles.buttonDisabled]}
            onPress={exportData}
            disabled={working}
          >
            {status.kind === 'working' && status.action === 'export' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Exportar datos (guardar backup)</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondary, working && styles.buttonDisabled]}
            onPress={confirmImport}
            disabled={working}
          >
            {status.kind === 'working' && status.action === 'import' ? (
              <ActivityIndicator color="#1e3a8a" />
            ) : (
              <Text style={styles.secondaryText}>Importar datos (restaurar backup)</Text>
            )}
          </TouchableOpacity>

          {status.kind === 'ok' ? <Text style={styles.ok}>{status.text}</Text> : null}
          {status.kind === 'error' ? <Text style={styles.error}>{status.text}</Text> : null}
        </View>

        <Text style={styles.hint}>
          El backup es un archivo <Text style={styles.mono}>.json</Text>. Podés
          mandártelo por mail o WhatsApp, o guardarlo en Google Drive.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#e9ebf2',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#f8f9fc',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#eef0f2',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4b5563',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primary: {
    backgroundColor: '#2563eb',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondary: {
    backgroundColor: '#eef2ff',
  },
  secondaryText: {
    color: '#1e3a8a',
    fontWeight: '700',
  },
  ok: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 13,
  },
  error: {
    color: '#b91c1c',
    fontWeight: '600',
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    paddingHorizontal: 4,
  },
  mono: {
    fontWeight: '700',
  },
  bold: {
    fontWeight: '800',
    color: '#111827',
  },
});
