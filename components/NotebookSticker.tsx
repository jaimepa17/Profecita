import React from 'react';
import Svg, { Path, Rect, G, Circle } from 'react-native-svg';

interface StickerIconProps { size?: number; }

export function NotebookSticker({ size = 48 }: StickerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <Rect x="14" y="8" width="24" height="32" rx="2" fill="#DCCEC2" />
        <Rect x="12" y="10" width="24" height="32" rx="2" fill="#C5A07D" />
        <Path d="M10 14 C14 14 14 18 10 18" fill="none" />
        <Path d="M10 22 C14 22 14 26 10 26" fill="none" />
        <Path d="M10 30 C14 30 14 34 10 34" fill="none" />
        <Path d="M10 38 C14 38 14 42 10 42" fill="none" />
        <Rect x="18" y="16" width="12" height="6" rx="1" fill="#F4E0A3" />
        <Circle cx="20" cy="32" r="1.5" fill="#1E140D" stroke="none" />
        <Circle cx="28" cy="32" r="1.5" fill="#1E140D" stroke="none" />
        <Path d="M22 33 Q24 35 26 33" fill="none" strokeWidth="1.5" />
        <Circle cx="17" cy="33" r="1.5" fill="#F8A9B7" stroke="none" />
        <Circle cx="31" cy="33" r="1.5" fill="#F8A9B7" stroke="none" />
      </G>
    </Svg>
  );
}
