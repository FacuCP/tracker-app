import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { RootStackParamList } from '../../core/navigation/types';
import { theme } from '../../core/theme';

/** Botón "Ajustes" del header, compartido por las tres pantallas hub. */
export function SettingsHeaderButton() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={8}>
      <Text style={styles.text}>Ajustes</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  text: {
    color: theme.colors.accent,
    fontWeight: '700',
    fontSize: 15,
  },
});
