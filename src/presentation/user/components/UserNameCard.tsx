import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { container } from '../../../core/di/container';
import { theme } from '../../../core/theme';
import { MAX_USER_NAME } from '../../../domain/user/entities/UserProfile';

/** Card de Ajustes para ver y cambiar el nombre del usuario. */
export function UserNameCard() {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    container.getUserProfile.execute().then((profile) => {
      setName(profile?.name ?? '');
      setSaved(profile?.name ?? '');
      setLoaded(true);
    });
  }, []);

  const dirty = name.trim().length > 0 && name.trim() !== saved;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const profile = await container.updateUserProfile.execute({ name });
      setName(profile.name);
      setSaved(profile.name);
      setMessage({ ok: true, text: 'Nombre guardado' });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tu nombre</Text>
      {loaded ? (
        <>
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              maxLength={MAX_USER_NAME}
              placeholder="Tu nombre"
              placeholderTextColor={theme.colors.textMuted}
            />
            <TouchableOpacity
              style={[styles.button, (!dirty || saving) && styles.buttonDisabled]}
              onPress={save}
              disabled={!dirty || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
          {message ? (
            <Text style={message.ok ? styles.ok : styles.error}>{message.text}</Text>
          ) : null}
        </>
      ) : (
        <ActivityIndicator />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: theme.colors.text,
    fontSize: 15,
  },
  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
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
});
