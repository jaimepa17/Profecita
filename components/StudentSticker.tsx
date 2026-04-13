import React from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';

interface StickerIconProps { size?: number; }

export function StudentSticker({ size = 48 }: StickerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M14 42 C14 32 18 30 24 30 C30 30 34 32 34 42 Z" fill="#88C0A0" />
        <Circle cx="24" cy="24" r="8" fill="#DCCEC2" />
        <Path d="M14 14 L24 8 L34 14 L24 20 Z" fill="#1E140D" />
        <Path d="M18 17 V22 C18 24 30 24 30 22 V17" fill="#1E140D" />
        <Path d="M24 14 L36 18 V26" fill="#F4E0A3" />
        <Circle cx="21" cy="23" r="1.5" fill="#1E140D" stroke="none" />
        <Circle cx="27" cy="23" r="1.5" fill="#1E140D" stroke="none" />
        <Path d="M23 26 Q24 28 25 26" fill="none" strokeWidth="1.5" />
        <Circle cx="18" cy="25" r="1.5" fill="#F8A9B7" stroke="none" />
        <Circle cx="30" cy="25" r="1.5" fill="#F8A9B7" stroke="none" />
      </G>
    </Svg>
  );
}
