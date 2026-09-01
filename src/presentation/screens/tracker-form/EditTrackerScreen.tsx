import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { container } from '../../../core/di/container';
import { RootStackParamList } from '../../../core/navigation/types';
import { Tracker } from '../../../domain/tracker/entities/Tracker';
import { TrackerForm } from '../../tracker/components/TrackerForm';
import { useTrackerForm } from '../../tracker/viewmodels/useTrackerForm';

type Props = NativeStackScreenProps<RootStackParamList, 'EditTracker'>;

export function EditTrackerScreen({ route, navigation }: Props) {
  const { trackerId } = route.params;
  const [tracker, setTracker] = useState<Tracker | null | undefined>(undefined);

  useEffect(() => {
    container.getTracker.execute(trackerId).then(setTracker);
  }, [trackerId]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {tracker === undefined ? (
        <ActivityIndicator style={styles.center} size="large" />
      ) : tracker === null ? (
        <Text style={styles.center}>Este tracker ya no existe.</Text>
      ) : (
        <EditForm
          tracker={tracker}
          onDone={() => navigation.goBack()}
          onDeleted={() => navigation.navigate('Home')}
        />
      )}
    </SafeAreaView>
  );
}

function EditForm({
  tracker,
  onDone,
  onDeleted,
}: {
  tracker: Tracker;
  onDone: () => void;
  onDeleted: () => void;
}) {
  const form = useTrackerForm(tracker);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await container.updateTracker.execute(tracker.id, form.toDraft());
      onDone();
    } catch (error) {
      setSaving(false);
      Alert.alert('No se pudo guardar', error instanceof Error ? error.message : 'Error');
    }
  }

  function confirmDelete() {
    Alert.alert('Borrar tracker', `Se borrará "${tracker.name}" y todos sus registros.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await container.deleteTracker.execute(tracker.id);
          onDeleted();
        },
      },
    ]);
  }

  return (
    <TrackerForm
      form={form}
      submitLabel="Guardar cambios"
      saving={saving}
      onSubmit={submit}
      onDelete={confirmDelete}
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  center: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    marginTop: 40,
    color: '#6b7280',
  },
});
