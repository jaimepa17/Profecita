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

const SPRING_CONFIG = {
  stiffness: 1000,
  damping: 500,
  mass: 3,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
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
    animation: 'spring' as const,
    config: SPRING_CONFIG,
  },
  close: {
    animation: 'spring' as const,
    config: SPRING_CONFIG,
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
    progress.value = withTiming(1, { duration: 300 }); // internal shared val uses timing for simplicity, spring is for react-navigation overall transit
  };

  const resetTransition = () => {
    progress.value = withTiming(0, { duration: 300 });
  };

  return { animatedStyle, startTransition, resetTransition };
};
