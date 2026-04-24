import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

interface ListLoaderSkeletonProps {
  /** Elimina el parpadeo ocultándose silenciosamente si los datos cargan antes de este número en milisegundos */
  delayMs?: number;
  /** El número de tarjetas a dibujar (defecto: 3) */
  itemsCount?: number;
}

export function ListLoaderSkeleton({ delayMs = 150, itemsCount = 3 }: ListLoaderSkeletonProps) {
  const [show, setShow] = useState(false);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    // Si carga en menos de `delayMs`, no mostrará el Skeleton, previniendo el parpadeo en memorias rápidas (Cache-First)
    const timeout = setTimeout(() => {
      setShow(true);
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [delayMs]);

  useEffect(() => {
    if (show) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.6, { duration: 600 })
        ),
        -1, // Infinito
        true // Reversa
      );
    }
  }, [show, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!show) {
    // Retorna una pequeña vista o nada para el delay silencioso
    return <View className="h-4 w-4 opacity-0" />;
  }

  return (
    <View className="px-1 mt-6">
      {Array.from({ length: itemsCount }).map((_, i) => (
        <View key={`skeleton-${i}`} className="mb-4">
          <View className="relative">
            <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[24px] bg-[#DCCEC2]" />
            <Animated.View
              style={animatedStyle}
              className="rounded-[24px] border-[3px] border-[#DCCEC2] bg-[#FDF9F1] p-5"
            >
              {/* Fake Chip */}
              <View className="h-6 w-24 rounded-full bg-[#EBDDBF] mb-3" />
              
              {/* Fake Title */}
              <View className="h-7 w-[70%] rounded-xl bg-[#EBDDBF]" />
              {/* Fake Subtitle */}
              <View className="h-4 w-[40%] rounded-lg bg-[#F5ECDF] mt-2" />
              
              {/* Fake Card Content */}
              <View className="mt-4 rounded-2xl border-[3px] border-[#EBDDBF] bg-[#FFFdf8] px-4 py-3">
                <View className="h-3 w-[30%] rounded-lg bg-[#EBDDBF] mb-3" />
                <View className="h-4 w-[85%] rounded-lg bg-[#F5ECDF] mb-2" />
                <View className="h-4 w-[65%] rounded-lg bg-[#F5ECDF]" />
              </View>

              {/* Fake Action Buttons */}
              <View className="mt-4 flex-row justify-end gap-2">
                <View className="h-10 w-24 rounded-xl border-[3px] border-[#DCCEC2] bg-[#E5D2BA]" />
                <View className="h-10 w-24 rounded-xl border-[3px] border-[#DCCEC2] bg-[#E5D2BA]" />
              </View>
            </Animated.View>
          </View>
        </View>
      ))}
    </View>
  );
}
