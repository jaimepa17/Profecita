import { useEffect, useRef } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import type { RootStackParamList } from '@/types/navigation';
import AuthScreen from '@/screens/Auth';
import HomeScreen from '@/screens/Home';
import EstudiantesScreen from '@/screens/Estudiantes';
import RegistroNotasActividadScreen from '@/screens/RegistroNotasActividad';
import ReportesScreen from '@/screens/Reportes';
import AniosScreen from '@/screens/Anios';
import AsignaturasScreen from '@/screens/Asignaturas';
import GruposScreen from '@/screens/Grupos';
import ParcialesConfigScreen from '@/screens/ParcialesConfig';
import AsistenciaScreen from '@/screens/Asistencia';
import AsistenciaSelectorScreen from '@/screens/AsistenciaSelector';
import PrivacyPolicyScreen from '@/screens/PrivacyPolicy';
import { forHorizontalSlide, getTransitionSpec } from '@/lib/animations/customTransitions';

const Stack = createStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  session: Session | null;
};

export default function RootNavigatorStack({ session }: RootNavigatorProps) {
  const navigation = useNavigation();
  const prevSessionRef = useRef(session);

  useEffect(() => {
    const prevSession = prevSessionRef.current;
    prevSessionRef.current = session;

    if (prevSession && !session) {
      console.log('[NAVIGATOR] Sesión cerrada, navegando a Auth...');
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        })
      );
    }
  }, [session, navigation]);

  return (
    <Stack.Navigator
      initialRouteName={session ? 'Home' : 'Auth'}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyleInterpolator: forHorizontalSlide,
        transitionSpec: getTransitionSpec(),
        cardStyle: {
          flex: 1,
        },
      }}
    >
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{
          cardStyleInterpolator: ({ current }) => ({
            cardStyle: {
              opacity: current.progress,
            },
          }),
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
        name="Reportes"
        component={ReportesScreen}
        options={{
          title: 'Reportes',
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
      <Stack.Screen
        name="AsistenciaSelector"
        component={AsistenciaSelectorScreen}
        options={{
          title: 'Asistencia',
        }}
      />
      <Stack.Screen
        name="Asistencia"
        component={AsistenciaScreen}
        options={{
          title: 'Registro de Asistencia',
        }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{
          title: 'Política de Privacidad',
        }}
      />
    </Stack.Navigator>
  );
}
