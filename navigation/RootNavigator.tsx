import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Session } from '@supabase/supabase-js';
import type { RootStackParamList } from '@/types/navigation';
import AuthScreen from '@/screens/Auth';
import HomeScreen from '@/screens/Home';
import EstudiantesScreen from '@/screens/Estudiantes';
import RegistroNotasActividadScreen from '@/screens/RegistroNotasActividad';
import AniosScreen from '@/screens/Anios';
import AsignaturasScreen from '@/screens/Asignaturas';
import GruposScreen from '@/screens/Grupos';
import ParcialesConfigScreen from '@/screens/ParcialesConfig';

const Stack = createNativeStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  session: Session | null;
};

export default function RootNavigator({ session }: RootNavigatorProps) {
  return (
    <Stack.Navigator
      key={session ? 'authenticated' : 'unauthenticated'}
      initialRouteName={session ? 'Home' : 'Auth'}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 200,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
        animationMatchesGesture: true,
      }}
    >
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
        }}
      />
      <Stack.Screen
        name="Estudiantes"
        component={EstudiantesScreen}
        options={{
          title: 'Estudiantes',
        }}
      />
      <Stack.Screen
        name="RegistroNotasActividad"
        component={RegistroNotasActividadScreen}
        options={{
          title: 'Registro de Notas',
        }}
      />
      <Stack.Screen
        name="Anios"
        component={AniosScreen}
        options={{
          title: 'Años',
        }}
      />
      <Stack.Screen
        name="Asignaturas"
        component={AsignaturasScreen}
        options={{
          title: 'Asignaturas',
        }}
      />
      <Stack.Screen
        name="Grupos"
        component={GruposScreen}
        options={{
          title: 'Grupos',
        }}
      />
      <Stack.Screen
        name="ParcialesConfig"
        component={ParcialesConfigScreen}
        options={{
          title: 'Configuración',
        }}
      />
    </Stack.Navigator>
  );
}
