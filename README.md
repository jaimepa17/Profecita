# Control Notas

<p align="center">
  <img src="https://img.shields.io/badge/Expo-55.0.6-000020?style=flat-square&logo=expo" alt="Expo">
  <img src="https://img.shields.io/badge/React%20Native-0.83.2-61DAFB?style=flat-square&logo=react" alt="React Native">
  <img src="https://img.shields.io/badge/Supabase-Auth%20%26%20Database-3ECF8E?style=flat-square&logo=supabase" alt="Supabase">
  <img src="https://img.shields.io/badge/TypeScript-5.9.2-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-3.3.2-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS">
</p>

> Aplicación móvil para la gestión académica de programas de estudio, permite administrar carreras, años, asignaturas, grupos, actividades y el registro de notas de estudiantes.

## Características

- **Gestión de Carreras**: Crear andministrative programs (carreras)
- **Estructura Académica**: Años, Asignaturas y Grupos por carrera
- **Registro de Notas**: Por actividad y parcial configurable
- **Gestión de Estudiantes**: Registro y seguimiento individual
- **Autenticación**: Sistema de login con Supabase Auth
- **Actualización en Tiempo Real**: Sincronización instantánea via Supabase Realtime
- **Cache Local**: Persistencia offline con AsyncStorage
- **UI Responsiva**: Diseño adaptado a dispositivos móviles

## Stack Tecnológico

| Tecnología | Propósito |
|------------|-----------|
| [Expo SDK 55](https://expo.dev) | Framework de desarrollo |
| [React Native](https://reactnative.dev) | UI nativa |
| [Supabase](https://supabase.com) | Base de datos y autenticación |
| [NativeWind](https://nativewind.xyz) | Utilidades CSS (Tailwind) |
| [TypeScript](https://www.typescriptlang.org) | Tipado estático |
| [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) | Almacenamiento local |

## Requisitos Previos

- Node.js >= 18
- npm o yarn
- Cuenta de [Supabase](https://supabase.com)
- Expo CLI (`npx expo start`)

## Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/jaimepa17/control-notas.git
cd control-notas
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
EXPO_PUBLIC_SUPABASE_URL=tu_url_de_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
EXTERNAL_SUPABASE_URL=tu_url_de_supabase
EXTERNAL_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
```

4. **Configurar Supabase**

   - Crea un proyecto en [Supabase](https://supabase.com/dashboard)
   - Ejecuta el script SQL de migración para crear las tablas necesarias
   - Copia las credenciales de tu proyecto al archivo `.env.local`

5. **Iniciar la aplicación**

```bash
npx expo start
```

## Estructura del Proyecto

```
├── app/                    # Configuración de rutas (Expo Router)
├── components/            # Componentes reutilizables de UI
│   ├── AccountPanel.tsx
│   ├── ActividadFormModal.tsx
│   ├── AlertModal.tsx
│   ├── CarreraFormModal.tsx
│   ├── ConfirmActionModal.tsx
│   ├── EstudianteFormModal.tsx
│   ├── EstudianteNotaCard.tsx
│   ├── GrupoFormModal.tsx
│   ├── NameFormModal.tsx
│   ├── NotificationBar.tsx
│   └── SelectOptionModal.tsx
├── lib/                    # Utilidades y servicios
│   ├── authLogic.ts
│   ├── serviceMonitor.ts
│   ├── supabase.ts
│   ├── auth.ts
│   ├── hooks/              # Custom hooks
│   ├── realtime/           # Sincronización en tiempo real
│   └── services/           # Servicios de datos
├── screens/                # Pantallas principales
│   ├── Anios.tsx
│   ├── Asignaturas.tsx
│   ├── Auth.tsx
│   ├── Estudiantes.tsx
│   ├── Grupos.tsx
│   ├── Home.tsx
│   ├── ParcialesConfig.tsx
│   └── RegistroNotasActividad.tsx
├── App.tsx                 # Punto de entrada principal
└── index.ts                # Inicialización de Expo
```

## Scripts Disponibles

```bash
npm start        # Iniciar Expo en modo desarrollo
npm run android  # Iniciar para Android
npm run ios      # Iniciar para iOS
npm run web      # Iniciar versión web
```

## Modelo de Datos

### Carreras
```
Carrera {
  id: uuid (PK)
  nombre: string
  profesor_id: uuid (FK -> users)
  created_at: timestamp
}
```

### Años
```
Anio {
  id: uuid (PK)
  numero: number
  carrera_id: uuid (FK -> carreras)
  created_at: timestamp
}
```

### Asignaturas
```
Asignatura {
  id: uuid (PK)
  nombre: string
  anio_id: uuid (FK -> anios)
  created_at: timestamp
}
```

### Grupos
```
Grupo {
  id: uuid (PK)
  nombre: string
  asignatura_id: uuid (FK -> asignaturas)
  created_at: timestamp
}
```

### Actividades
```
Actividad {
  id: uuid (PK)
  nombre: string
  puntos: number
  grupo_id: uuid (FK -> grupos)
  created_at: timestamp
}
```

### Notas
```
Nota {
  id: uuid (PK)
  actividad_id: uuid (FK -> actividades)
  estudiante_id: uuid (FK -> estudiantes)
  puntos: number
  created_at: timestamp
}
```

## Autor

- **GitHub**: [@jaimepa17](https://github.com/jaimepa17)

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.
