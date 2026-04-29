/**
 * useDragToClose
 *
 * Hook para añadir gesto de arrastrar-hacia-abajo para cerrar modales tipo bottom sheet.
 * Usa react-native-reanimated para animaciones fluidas en el UI thread.
 * Usa react-native-gesture-handler para capturar el gesto Pan.
 *
 * @param onClose - Callback que se ejecuta cuando el umbral de cierre se supera.
 * @param threshold - Distancia en px para activar el cierre (default: 120).
 * @returns { translateY, gesture, animatedStyle }
 *
 * Uso:
 *   const { gesture, animatedStyle } = useDragToClose({ onClose });
 *   return (
 *     <GestureDetector gesture={gesture}>
 *       <Animated.View style={[panelStyle, animatedStyle]}>
 *         ...
 *       </Animated.View>
 *     </GestureDetector>
 *   );
 */

import { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

type UseDragToCloseOptions = {
  onClose: () => void;
  threshold?: number;
};

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

export function useDragToClose({ onClose, threshold = 120 }: UseDragToCloseOptions) {
  const translateY = useSharedValue(0);
  const context = useSharedValue(0);
  const isClosing = useSharedValue(false);

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      // Solo permitir arrastre hacia abajo (translationY positiva)
      const newValue = context.value + Math.max(0, event.translationY);
      // Resistencia progresiva: se vuelve más difícil de arrastrar cuanto más abajo
      translateY.value = newValue * 0.6;
    })
    .onEnd(() => {
      if (translateY.value > threshold) {
        isClosing.value = true;
        runOnJS(onClose)();
      } else {
        // Volver a la posición original con spring
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    })
    .onFinalize(() => {
      if (!isClosing.value) {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return { gesture, animatedStyle };
}
