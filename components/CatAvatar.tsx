import React from 'react';
import Svg, { Path, Circle, G, Ellipse } from 'react-native-svg';

interface CatAvatarProps {
  size?: number;
}

export function CatAvatar({ size = 48 }: CatAvatarProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Orejas */}
        <Path d="M14 20 L10 10 L20 14 Z" fill="#FFD9A0" />
        <Path d="M34 20 L38 10 L28 14 Z" fill="#FFD9A0" />
        
        {/* Interior orejas */}
        <Path d="M13 18 L12 13 L17 15" fill="#F8A9B7" />
        <Path d="M35 18 L36 13 L31 15" fill="#F8A9B7" />

        {/* Cara (cabeza ovalada) */}
        <Ellipse cx="24" cy="26" rx="14" ry="12" fill="#FFD9A0" />

        {/* Ojos */}
        <Circle cx="19" cy="25" r="1.5" fill="#1E140D" stroke="none" />
        <Circle cx="29" cy="25" r="1.5" fill="#1E140D" stroke="none" />

        {/* Rubor */}
        <Ellipse cx="15" cy="27" rx="2" ry="1.5" fill="#F8A9B7" stroke="none" />
        <Ellipse cx="33" cy="27" rx="2" ry="1.5" fill="#F8A9B7" stroke="none" />

        {/* Boquita W */}
        <Path d="M22 27 Q23 29 24 27 Q25 29 26 27" fill="none" strokeWidth="1.5" />

        {/* Bigotes */}
        <Path d="M9 24 L14 25" fill="none" strokeWidth="1.5" />
        <Path d="M9 28 L14 27" fill="none" strokeWidth="1.5" />
        <Path d="M39 24 L34 25" fill="none" strokeWidth="1.5" />
        <Path d="M39 28 L34 27" fill="none" strokeWidth="1.5" />
      </G>
    </Svg>
  );
}