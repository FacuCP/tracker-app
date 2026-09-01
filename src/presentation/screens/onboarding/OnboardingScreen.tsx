import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { container } from '../../../core/di/container';
import { RootStackParamList } from '../../../core/navigation/types';
import { theme } from '../../../core/theme';
import { MAX_USER_NAME } from '../../../domain/user/entities/UserProfile';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && !saving;

  async function start() {
    setSaving(true);
    setError(null);
    try {
      await container.updateUserProfile.execute({ name });
      navigation.reset({ index: 0, routes: [{ name: 'Trackers' }] });
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>¡Hola!</Text>
          <Text style={styles.subtitle}>¿Cómo te llamás? Así te saluda la app.</Text>

          <TextInput
            style={styles.input}
            placeholder="Tu nombre"
            placeholderTextColor={theme.colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={MAX_USER_NAME}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => canSave && start()}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, !canSave && styles.buttonDisabled]}
            onPress={start}
            disabled={!canSave}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Empezar</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>Vas a poder cambiarlo en Ajustes.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  emoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textMuted,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.card,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  button: {
    marginTop: 8,
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
