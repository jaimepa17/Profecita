import React from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';

interface StickerIconProps { size?: number; }

export function MemoSticker({ size = 48 }: StickerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 10 L36 10 L36 34 L28 42 L12 42 Z" fill="#F4E0A3" />
        <Path d="M36 34 L28 34 L28 42" fill="#DCCEC2" />
        <Circle cx="24" cy="8" r="3" fill="#F8A9B7" />
        <Path d="M24 11 V14" fill="none" />
        <Path d="M16 18 H32" fill="none" strokeWidth="2" />
        <Path d="M16 24 H28" fill="none" strokeWidth="2" />
        <Circle cx="20" cy="31" r="1.5" fill="#1E140D" stroke="none" />
        <Circle cx="28" cy="31" r="1.5" fill="#1E140D" stroke="none" />
        <Path d="M22 33 Q24 35 26 33" fill="none" strokeWidth="1.5" />
      </G>
    </Svg>
  );
}
