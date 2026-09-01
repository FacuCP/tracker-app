import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../../presentation/screens/home/HomeScreen';
import { SettingsScreen } from '../../presentation/screens/settings/SettingsScreen';
import { MoodProgressScreen } from '../../presentation/screens/mood-progress/MoodProgressScreen';
import { CreateTrackerScreen } from '../../presentation/screens/tracker-form/CreateTrackerScreen';
import { EditTrackerScreen } from '../../presentation/screens/tracker-form/EditTrackerScreen';
import { TrackerProgressScreen } from '../../presentation/screens/tracker-progress/TrackerProgressScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Inicio' }} />
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
