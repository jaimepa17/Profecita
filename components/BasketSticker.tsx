import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface StickerIconProps {
  size?: number;
}

export function BasketSticker({ size = 48 }: StickerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Asa de la cesta */}
        <Path d="M14 22 C14 6 34 6 34 22" fill="none" />
        
        {/* Cuerpo de la cesta */}
        <Path d="M12 22 L16 38 C17 41 31 41 32 38 L36 22 Z" fill="#DCCEC2" />
        
        {/* Trama de la cesta */}
        <Path d="M18 22 L20 38" />
        <Path d="M30 22 L28 38" />
        <Path d="M13 30 L35 30" />
        
        {/* Mantelito rosa de picnic asomándose */}
        <Path d="M10 22 C14 26 18 26 24 22 C30 26 34 26 38 22 C36 28 30 26 24 28 C18 26 12 28 10 22 Z" fill="#F8A9B7" />
      </G>
    </Svg>
  );
}