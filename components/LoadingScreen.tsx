import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

type LoadingScreenProps = {
  message?: string;
  emoji?: string;
};

// Componente decorativo con animación de rotación suave
const AnimatedPencil = () => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((prev) => (prev + 6) % 360);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={{ transform: [{ rotate: `${rotation}deg` }] }}>
      <Text className="text-6xl">✏️</Text>
    </View>
  );
};

const PaperGrid = () => (
  <View className="absolute inset-0 overflow-hidden rounded-[34px] pointer-events-none">
    <View className="absolute inset-0 flex-row">
      {Array.from({ length: 22 }).map((_, i) => (
        <View key={`v-${i}`} className="h-full w-6 border-r border-[#DCCEC2]/60" />
      ))}
    </View>

    <View className="absolute inset-0">
      {Array.from({ length: 34 }).map((_, i) => (
        <View key={`h-${i}`} className="w-full h-6 border-b border-[#DCCEC2]/60" />
      ))}
    </View>
  </View>
);

export default function LoadingScreen({
  message = 'Cargando...',
  emoji = '🐱',
}: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-[#C5A07D] px-6">
      {/* Decoración esquina inferior izquierda */}
      <View className="absolute bottom-12 left-8 opacity-30">
        <Text className="text-7xl">🪴</Text>
      </View>

      {/* Decoración esquina superior derecha */}
      <View className="absolute top-20 right-12 opacity-25">
        <Text className="text-5xl rotate-45">📚</Text>
      </View>

      {/* Contenedor principal */}
      <View className="relative w-full max-w-sm">
        {/* Shadow offset */}
        <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[32px] bg-black" />

        {/* Contenedor principal con grid */}
        <View className="rounded-[32px] border-[4px] border-black bg-[#FDF9F1] overflow-hidden">
          <PaperGrid />

          <View className="items-center justify-center px-8 py-12 relative z-10">
            {/* Emoji principal */}
            <Text className="text-6xl mb-6">{emoji}</Text>

            {/* Loader animado personalizado */}
            <View className="mb-8">
              <AnimatedPencil />
            </View>

            {/* Mensaje */}
            <Text className="text-center text-base font-bold text-[#1E140D] mb-4">
              {message}
            </Text>

            {/* Dots de carga */}
            <View className="flex-row gap-2">
              <View className="h-2 w-2 rounded-full bg-black animate-pulse" />
              <View className="h-2 w-2 rounded-full bg-black animate-pulse" />
              <View className="h-2 w-2 rounded-full bg-black animate-pulse" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
