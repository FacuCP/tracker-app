import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { container } from '../di/container';
import { HubMenuButton } from '../../presentation/navigation/HubMenuButton';
import { SettingsHeaderButton } from '../../presentation/navigation/SettingsHeaderButton';
import { FinancesScreen } from '../../presentation/screens/finances/FinancesScreen';
import { ListDetailScreen } from '../../presentation/screens/list-detail/ListDetailScreen';
import { ListsScreen } from '../../presentation/screens/lists/ListsScreen';
import { MoodProgressScreen } from '../../presentation/screens/mood-progress/MoodProgressScreen';
import { OnboardingScreen } from '../../presentation/screens/onboarding/OnboardingScreen';
import { SettingsScreen } from '../../presentation/screens/settings/SettingsScreen';
import { CreateTrackerScreen } from '../../presentation/screens/tracker-form/CreateTrackerScreen';
import { EditTrackerScreen } from '../../presentation/screens/tracker-form/EditTrackerScreen';
import { TrackerProgressScreen } from '../../presentation/screens/tracker-progress/TrackerProgressScreen';
import { TrackersScreen } from '../../presentation/screens/trackers/TrackersScreen';
import { DEFAULT_HUB_TAB, HubTab } from '../../domain/user/entities/UserProfile';
import { theme } from '../theme';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.background,
    card: theme.colors.header,
    border: theme.colors.border,
    text: theme.colors.text,
    primary: theme.colors.accent,
  },
};

/**
 * Header de las pantallas hub: el título es el nombre de la pestaña (abre el
 * menú al tocarlo), sin flecha de volver, y el cambio entre pestañas es un
 * fundido suave en vez del deslizamiento del stack.
 */
const hubOptions = (current: 'Trackers' | 'Lists' | 'Finances') => ({
  headerTitle: () => <HubMenuButton current={current} />,
  headerRight: () => <SettingsHeaderButton />,
  headerTitleAlign: 'left' as const,
  headerBackVisible: false,
  animation: 'fade' as const,
});

type Boot = 'loading' | 'onboarding' | 'ready';

export function AppNavigator() {
  const [boot, setBoot] = useState<Boot>('loading');
  const [startTab, setStartTab] = useState<HubTab>(DEFAULT_HUB_TAB);

  useEffect(() => {
    container.getUserProfile
      .execute()
      .then((profile) => {
        if (profile) {
          setStartTab(profile.defaultTab);
          setBoot('ready');
        } else {
          setBoot('onboarding');
        }
      })
      .catch(() => setBoot('onboarding'));
  }, []);

  if (boot === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={boot === 'onboarding' ? 'Onboarding' : startTab}
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.header },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Trackers" component={TrackersScreen} options={hubOptions('Trackers')} />
        <Stack.Screen name="Lists" component={ListsScreen} options={hubOptions('Lists')} />
        <Stack.Screen name="ListDetail" component={ListDetailScreen} options={{ title: 'Lista' }} />
        <Stack.Screen name="Finances" component={FinancesScreen} options={hubOptions('Finances')} />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Ajustes y backup' }}
        />
        <Stack.Screen
          name="MoodProgress"
          component={MoodProgressScreen}
          options={{ title: 'Progreso de ánimo' }}
        />
        <Stack.Screen
          name="CreateTracker"
          component={CreateTrackerScreen}
          options={{ title: 'Nuevo tracker' }}
        />
        <Stack.Screen
          name="EditTracker"
          component={EditTrackerScreen}
          options={{ title: 'Editar tracker' }}
        />
        <Stack.Screen
          name="TrackerProgress"
          component={TrackerProgressScreen}
          options={{ title: 'Progreso' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
