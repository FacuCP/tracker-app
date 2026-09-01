import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { WelcomeScreen } from '../../presentation/screens/welcome/WelcomeScreen';
import { NotImplementedScreen } from '../../presentation/screens/not-implemented/NotImplementedScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ title: 'Inicio' }}
        />
        <Stack.Screen
          name="NotImplemented"
          component={NotImplementedScreen}
          options={{ title: 'Próximamente' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
