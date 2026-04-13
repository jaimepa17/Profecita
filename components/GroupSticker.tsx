import React from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';

interface StickerIconProps { size?: number; }

export function GroupSticker({ size = 48 }: StickerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M8 40 C8 32 12 30 16 30 C18 30 19 31 20 32" fill="#A8D5BA" />
        <Circle cx="16" cy="22" r="6" fill="#F4E0A3" />
        <Circle cx="14" cy="21" r="1" fill="#1E140D" stroke="none" />
        <Circle cx="18" cy="21" r="1" fill="#1E140D" stroke="none" />
        <Path d="M40 40 C40 32 36 30 32 30 C30 30 29 31 28 32" fill="#F8A9B7" />
        <Circle cx="32" cy="22" r="6" fill="#DCCEC2" />
        <Circle cx="30" cy="21" r="1" fill="#1E140D" stroke="none" />
        <Circle cx="34" cy="21" r="1" fill="#1E140D" stroke="none" />
        <Path d="M16 42 C16 34 20 32 24 32 C28 32 32 34 32 42 Z" fill="#88C0A0" />
        <Circle cx="24" cy="24" r="7" fill="#F4E0A3" />
        <Circle cx="21" cy="23" r="1.5" fill="#1E140D" stroke="none" />
        <Circle cx="27" cy="23" r="1.5" fill="#1E140D" stroke="none" />
        <Path d="M23 26 Q24 28 25 26" fill="none" strokeWidth="1.5" />
        <Circle cx="19" cy="25" r="1.5" fill="#F8A9B7" stroke="none" />
        <Circle cx="29" cy="25" r="1.5" fill="#F8A9B7" stroke="none" />
      </G>
    </Svg>
  );
}
