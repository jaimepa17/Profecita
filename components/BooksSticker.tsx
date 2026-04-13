import React from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';

interface StickerIconProps { size?: number; }

export function BooksSticker({ size = 48 }: StickerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M10 38 L38 38 C40 38 40 32 38 32 L10 32 Z" fill="#A8D5BA" />
        <Path d="M38 38 L42 35 V29 L38 32" fill="#DCCEC2" />
        <Path d="M8 32 L36 32 C38 32 38 26 36 26 L8 26 Z" fill="#F8A9B7" />
        <Path d="M36 32 L40 29 V23 L36 26" fill="#DCCEC2" />
        <Path d="M12 26 L34 26 C36 26 36 20 34 20 L12 20 Z" fill="#88C0A0" />
        <Path d="M34 26 L38 23 V17 L34 20" fill="#DCCEC2" />
        <Path d="M20 20 L20 10 L24 14 L28 10 L28 20" fill="#F4E0A3" />
        <Circle cx="18" cy="29" r="1.5" fill="#1E140D" stroke="none" />
        <Circle cx="26" cy="29" r="1.5" fill="#1E140D" stroke="none" />
        <Path d="M20 30.5 Q22 32 24 30.5" fill="none" strokeWidth="1.5" />
      </G>
    </Svg>
  );
}
