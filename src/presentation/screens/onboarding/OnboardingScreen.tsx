import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { DEFAULT_HUB_TAB, HubTab, MAX_USER_NAME } from '../../../domain/user/entities/UserProfile';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const TAB_OPTIONS: { tab: HubTab; label: string }[] = [
  { tab: 'Trackers', label: 'Trackers' },
  { tab: 'Lists', label: 'Listas' },
  { tab: 'Finances', label: 'Finanzas' },
];

export function OnboardingScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [tab, setTab] = useState<HubTab>(DEFAULT_HUB_TAB);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && !saving;

  async function start() {
    setSaving(true);
    setError(null);
    try {
      await container.updateUserProfile.execute({ name, defaultTab: tab });
      navigation.reset({ index: 0, routes: [{ name: tab }] });
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
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
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
          />

          <Text style={styles.question}>¿Qué querés ver al abrir la app?</Text>
          <View style={styles.tabs}>
            {TAB_OPTIONS.map((option) => {
              const active = option.tab === tab;
              return (
                <TouchableOpacity
                  key={option.tab}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setTab(option.tab)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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

          <Text style={styles.hint}>
            Podés cambiar el nombre y la pestaña de inicio en Ajustes.
          </Text>
        </ScrollView>
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
    flexGrow: 1,
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
  question: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
  },
  tabActive: {
    borderColor: theme.colors.accent,
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#1e3a8a',
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
