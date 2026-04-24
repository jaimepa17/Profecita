import React, { useEffect, useState } from 'react';
import { View, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';

interface InlineSkeletonProps {
  width?: DimensionValue;
  height?: number;
  delayMs?: number;
}

export function InlineSkeleton({ width = '60%', height = 16, delayMs = 150 }: InlineSkeletonProps) {
  const [show, setShow] = useState(false);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
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
        -1,
        true
      );
    }
  }, [show, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!show) {
    return <View style={{ width, height, marginTop: 4 }} className="opacity-0" />;
  }

  return (
    <Animated.View
      style={[{ width, height, marginTop: 4 }, animatedStyle]}
      className="rounded-md bg-[#DCCEC2]"
    />
  );
}
