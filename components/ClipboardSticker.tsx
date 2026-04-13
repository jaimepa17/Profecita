import React from 'react';
import Svg, { Path, Rect, G, Circle } from 'react-native-svg';

interface StickerIconProps { size?: number; }

export function ClipboardSticker({ size = 48 }: StickerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <Rect x="12" y="10" width="24" height="34" rx="2" fill="#C5A07D" />
        <Rect x="14" y="14" width="20" height="26" fill="#FFFFFF" />
        <Path d="M20 6 H28 C30 6 30 10 28 10 H20 C18 10 18 6 20 6 Z" fill="#DCCEC2" />
        <Path d="M22 10 V14 H26 V10" fill="none" />
        <Path d="M18 20 H30" fill="none" strokeWidth="2" />
        <Path d="M18 26 H26" fill="none" strokeWidth="2" />
        <Circle cx="21" cy="33" r="1.5" fill="#1E140D" stroke="none" />
        <Circle cx="27" cy="33" r="1.5" fill="#1E140D" stroke="none" />
        <Path d="M23 35 Q24 36.5 25 35" fill="none" strokeWidth="1.5" />
      </G>
    </Svg>
  );
}
