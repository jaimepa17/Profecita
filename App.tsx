import './global.css';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View, ActivityIndicator } from 'react-native';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import Auth from './screens/Auth';
import Home from './screens/Home';
import EstudiantesScreen from './screens/Estudiantes';
import AniosScreen from './screens/Anios';
import AsignaturasScreen from './screens/Asignaturas';
import GruposScreen from './screens/Grupos';
import ParcialesConfigScreen from './screens/ParcialesConfig';
import RegistroNotasActividadScreen from './screens/RegistroNotasActividad';
import type { Carrera } from './lib/services/carrerasService';
import type { Anio } from './lib/services/aniosService';
import type { Asignatura } from './lib/services/asignaturasService';
import type { Grupo } from './lib/services/gruposService';
import {
  useFonts,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';

type AppRoute =
  | { name: 'home' }
  | { name: 'estudiantes' }
  | { name: 'registro-notas-actividad' }
  | { name: 'anios'; carrera: Carrera }
  | { name: 'asignaturas'; carrera: Carrera; anio: Anio }
  | { name: 'grupos'; carrera: Carrera; anio: Anio; asignatura: Asignatura }
  | {
      name: 'parciales-config';
      carrera: Carrera;
      anio: Anio;
      asignatura: Asignatura;
      grupo: Grupo;
    };

function getRouteStorageKey(userId: string): string {
  return `control-notas:route:${userId}`;
}

function hasId(value: unknown): value is { id: string } {
  return !!value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string';
}

function isValidRoute(value: unknown): value is AppRoute {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const route = value as {
    name?: unknown;
    carrera?: unknown;
    anio?: unknown;
    asignatura?: unknown;
    grupo?: unknown;
  };

  if (route.name === 'home') {
    return true;
  }

  if (route.name === 'estudiantes') {
    return true;
  }

  if (route.name === 'registro-notas-actividad') {
    return true;
  }

  if (route.name === 'anios') {
    return hasId(route.carrera);
  }

  if (route.name === 'asignaturas') {
    return hasId(route.carrera) && hasId(route.anio);
  }

  if (route.name === 'grupos') {
    return hasId(route.carrera) && hasId(route.anio) && hasId(route.asignatura);
  }

  if (route.name === 'parciales-config') {
    return (
      hasId(route.carrera) &&
      hasId(route.anio) &&
      hasId(route.asignatura) &&
      hasId(route.grupo)
    );
  }

  return false;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [route, setRoute] = useState<AppRoute>({ name: 'home' });
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const prevRouteRef = useRef<AppRoute>(route);
  const [routeHydrated, setRouteHydrated] = useState(false);
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    // Apply global default font for React Native Text components once
    if ((Text as any).defaultProps == null) {
      (Text as any).defaultProps = {};
    }
    (Text as any).defaultProps.style = {
      ...(Text as any).defaultProps.style || {},
      fontFamily: 'Fredoka_400Regular',
    };

    // Supabase session initialization and listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      // remove listener if available
      if (listener && typeof listener.subscription?.unsubscribe === 'function') {
        try { listener.subscription.unsubscribe(); } catch (_) {}
      }
    };
  }, [fontsLoaded]);

  useEffect(() => {
    let mounted = true;

    const hydrateRoute = async () => {
      const userId = session?.user?.id;
      if (!userId) {
        if (!mounted) {
          return;
        }
        setRoute({ name: 'home' });
        setRouteHydrated(true);
        return;
      }

      setRouteHydrated(false);

      try {
        const raw = await AsyncStorage.getItem(getRouteStorageKey(userId));
        if (!mounted) {
          return;
        }

        if (!raw) {
          setRoute({ name: 'home' });
          setRouteHydrated(true);
          return;
        }

        const parsed: unknown = JSON.parse(raw);
        if (isValidRoute(parsed)) {
          setRoute(parsed);
        } else {
          setRoute({ name: 'home' });
        }
      } catch (_error) {
        if (!mounted) {
          return;
        }
        setRoute({ name: 'home' });
      } finally {
        if (mounted) {
          setRouteHydrated(true);
        }
      }
    };

    void hydrateRoute();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !routeHydrated) {
      return;
    }

    void AsyncStorage.setItem(getRouteStorageKey(userId), JSON.stringify(route));
  }, [route, routeHydrated, session?.user?.id]);

  useEffect(() => {
    const prevName = prevRouteRef.current.name;
    const currentName = route.name;

    if (prevName !== currentName) {
      prevRouteRef.current = route;

      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [route.name, fadeAnim]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C5A07D' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!session && session !== undefined) {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <Auth />
      </Animated.View>
    );
  }

  if (session && !routeHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C5A07D' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (route.name === 'anios') {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <AniosScreen
          carrera={route.carrera}
          onBack={() => setRoute({ name: 'home' })}
          onOpenAsignaturas={(anio) =>
            setRoute({
              name: 'asignaturas',
              carrera: route.carrera,
              anio,
            })
          }
        />
      </Animated.View>
    );
  }

  if (route.name === 'asignaturas') {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <AsignaturasScreen
          carrera={route.carrera}
          anio={route.anio}
          onBack={() => setRoute({ name: 'anios', carrera: route.carrera })}
          onOpenGrupos={(asignatura) =>
            setRoute({
              name: 'grupos',
              carrera: route.carrera,
              anio: route.anio,
              asignatura,
            })
          }
        />
      </Animated.View>
    );
  }

  if (route.name === 'grupos') {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <GruposScreen
          carrera={route.carrera}
          anio={route.anio}
          asignatura={route.asignatura}
          onOpenParcialesConfig={(grupo) =>
            setRoute({
              name: 'parciales-config',
              carrera: route.carrera,
              anio: route.anio,
              asignatura: route.asignatura,
              grupo,
            })
          }
          onBack={() =>
            setRoute({
              name: 'asignaturas',
              carrera: route.carrera,
              anio: route.anio,
            })
          }
        />
      </Animated.View>
    );
  }

  // Pantalla de configuración de parciales y actividades del grupo seleccionado
  if (route.name === 'parciales-config') {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ParcialesConfigScreen
          carrera={route.carrera}
          anio={route.anio}
          asignatura={route.asignatura}
          grupo={route.grupo}
          onBack={() =>
            setRoute({
              name: 'grupos',
              carrera: route.carrera,
              anio: route.anio,
              asignatura: route.asignatura,
            })
          }
        />
      </Animated.View>
    );
  }

  if (route.name === 'estudiantes') {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <EstudiantesScreen onBack={() => setRoute({ name: 'home' })} />
      </Animated.View>
    );
  }

  if (route.name === 'registro-notas-actividad') {
    return (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <RegistroNotasActividadScreen onBack={() => setRoute({ name: 'home' })} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <Home
        userEmail={session?.user?.email}
        onOpenStudents={() => setRoute({ name: 'estudiantes' })}
        onOpenRegistroNotasActividad={() => setRoute({ name: 'registro-notas-actividad' })}
        onOpenCarrera={(carrera) => setRoute({ name: 'anios', carrera })}
      />
    </Animated.View>
  );
}