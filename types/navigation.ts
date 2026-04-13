import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Carrera } from '@/lib/services/carrerasService';
import type { Anio } from '@/lib/services/aniosService';
import type { Asignatura } from '@/lib/services/asignaturasService';
import type { Grupo } from '@/lib/services/gruposService';

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  Estudiantes: undefined;
  RegistroNotasActividad: undefined;
  Reportes: undefined;
  Anios: { carrera: Carrera };
  Asignaturas: { carrera: Carrera; anio: Anio };
  Grupos: { carrera: Carrera; anio: Anio; asignatura: Asignatura };
  ParcialesConfig: {
    carrera: Carrera;
    anio: Anio;
    asignatura: Asignatura;
    grupo: Grupo;
  };
  PrivacyPolicy: undefined;
};

export type RootNavigationProp = NativeStackNavigationProp<RootStackParamList>;
