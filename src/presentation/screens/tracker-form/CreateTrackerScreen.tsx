import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { container } from '../../../core/di/container';
import { RootStackParamList } from '../../../core/navigation/types';
import { TrackerForm } from '../../tracker/components/TrackerForm';
import { useTrackerForm } from '../../tracker/viewmodels/useTrackerForm';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTracker'>;

export function CreateTrackerScreen({ navigation }: Props) {
  const form = useTrackerForm();
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await container.createTracker.execute(form.toDraft());
      navigation.goBack();
    } catch (error) {
      setSaving(false);
      Alert.alert('No se pudo crear el tracker', messageOf(error));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f5f7' }} edges={['bottom']}>
      <TrackerForm form={form} submitLabel="Crear tracker" saving={saving} onSubmit={submit} />
    </SafeAreaView>
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido';
}
