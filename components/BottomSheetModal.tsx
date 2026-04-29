/**
 * BottomSheetModal
 *
 * Modal reutilizable tipo bottom sheet con:
 * - Barra de arrastre (handlebar) con indicador visual
 * - Gesto de arrastrar hacia abajo para cerrar (useDragToClose)
 * - Variante web: modal centrado (más informativo)
 * - Variante mobile: bottom sheet con drag gesture
 *
 * Sigue la skill responsive-web-mobile-modal para la diferenciación de plataforma.
 * Sigue la skill artistic-style-consistency para el estilo notebook/kraft.
 */

import { useRef, useCallback } from 'react';
import {
  Modal,
  Pressable,
  View,
  Platform,
  ScrollView,
  Text,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDragToClose } from '@/lib/hooks/useDragToClose';

type BottomSheetModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  /** Altura máxima del panel en mobile (porcentaje del viewport, ej: 88). Default: 88 */
  maxHeightPercent?: number;
  /** Ancho máximo en web (px). Default: 560 */
  webMaxWidth?: number;
  /** Muestra la barra de arrastre. Default: true */
  showHandleBar?: boolean;
  /** Título opcional que se muestra debajo de la barra */
  title?: string;
};

export default function BottomSheetModal({
  visible,
  onRequestClose,
  children,
  maxHeightPercent = 88,
  webMaxWidth = 560,
  showHandleBar = true,
  title,
}: BottomSheetModalProps) {
  const isWeb = Platform.OS === 'web';
  const { gesture, animatedStyle } = useDragToClose({ onClose: onRequestClose });

  // Cooldown para evitar cierre inmediato al abrir (anti-close on open)
  const cooldownRef = useRef(false);

  const handleBackdropPress = useCallback(() => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 200);
    onRequestClose();
  }, [onRequestClose]);

  const handleOpen = useCallback(() => {
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 250);
  }, []);

  const content = (
    <>
      {showHandleBar && (
        <View className="mb-4 items-center">
          <View className="h-2 w-20 rounded-full bg-[#B9987A]" />
        </View>
      )}

      {title && (
        <View className="mb-4 px-1">
          <View className="self-start rounded-full border-[3px] border-black bg-[#F3E7D5] px-4 py-1.5">
            <Text className="text-sm font-black text-black">
              {title}
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        className="flex-shrink-0"
      >
        {children}
      </ScrollView>
    </>
  );

  // ─── Web: Modal centrado ───
  if (isWeb) {
    if (!visible) return null;
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2000,
        }}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={handleBackdropPress}
          style={{ justifyContent: 'center', alignItems: 'center' }}
        >
          <Pressable
            onPress={() => {}}
            className="w-full rounded-[28px] border-[4px] border-black bg-[#FDF9F1] p-5"
            style={{ maxWidth: webMaxWidth, maxHeight: '90%' }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </Pressable>
        </Pressable>
      </View>
    );
  }

  // ─── Mobile: Bottom Sheet con drag gesture ───
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onRequestClose}
      onShow={handleOpen}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable className="flex-1 bg-black/35" onPress={handleBackdropPress}>
          <View className="flex-1 justify-end">
            <GestureDetector gesture={gesture}>
              <Animated.View
                style={[
                  {
                    maxHeight: `${maxHeightPercent}%`,
                  },
                  animatedStyle,
                ]}
                className="rounded-t-[36px] border-[4px] border-black bg-[#FDF9F1] px-5 pt-5 pb-8"
              >
                {content}
              </Animated.View>
            </GestureDetector>
          </View>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}
