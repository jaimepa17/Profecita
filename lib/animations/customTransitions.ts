import { Animated, Platform } from 'react-native';
import type { StackCardInterpolationProps } from '@react-navigation/stack';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

const TIMING_CONFIG = {
  duration: Platform.OS === 'ios' ? 350 : 280,
  easing: Easing.bezierFn(0.2, 0, 0, 1),
};

export const forHorizontalSlide = ({
  current,
  next,
  layouts: { screen },
}: StackCardInterpolationProps) => {
  const translateX = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [screen.width, 0],
    extrapolateRight: Extrapolate.CLAMP,
  });

  const translateXNext = next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -screen.width * 0.25],
        extrapolateRight: Extrapolate.CLAMP,
      })
    : 0;

  const opacity = current.progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.8, 1],
    extrapolateRight: Extrapolate.CLAMP,
  });

  const scale = current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
    extrapolateRight: Extrapolate.CLAMP,
  });

  return {
    cardStyle: {
      transform: [
        { translateX: Animated.add(translateX, translateXNext) },
        { scale },
      ],
      opacity,
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
        extrapolateRight: Extrapolate.CLAMP,
      }),
    },
  };
};

export const getTransitionSpec = () => ({
  open: {
    animation: 'timing' as const,
    config: TIMING_CONFIG,
  },
  close: {
    animation: 'timing' as const,
    config: TIMING_CONFIG,
  },
});

export const useSharedTransition = () => {
  const progress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0]),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [1, 0.95]),
      },
    ],
  }));

  const startTransition = () => {
    progress.value = withTiming(1, TIMING_CONFIG);
  };

  const resetTransition = () => {
    progress.value = withTiming(0, TIMING_CONFIG);
  };

  return { animatedStyle, startTransition, resetTransition };
};
