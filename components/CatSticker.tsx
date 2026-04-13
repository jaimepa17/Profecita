import React from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

interface CatStickerProps {
  size?: number;
}

export function CatSticker({ size = 48 }: CatStickerProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Cola curvada estilo gatito durmiendo o sentado */}
        <Path d="M30 36 C42 36 44 26 38 22 C36 20 32 22 32 22" fill="#EBD7BF" />
        
        {/* Cuerpo sentado */}
        <Path d="M14 38 C14 26 18 20 24 20 C30 20 34 26 34 38 Z" fill="#FFD9A0" />
        
        {/* Patitas delanteras */}
        <Path d="M20 38 L20 32 L22 32" fill="none" strokeWidth="2" />
        <Path d="M28 38 L28 32 L26 32" fill="none" strokeWidth="2" />

        {/* Orejas */}
        <Path d="M16 13 L14 5 L20 9 Z" fill="#FFD9A0" />
        <Path d="M32 13 L34 5 L28 9 Z" fill="#FFD9A0" />
        
        {/* Interior orejas */}
        <Path d="M16 11 L15 7 L19 9" fill="#F8A9B7" />
        <Path d="M32 11 L33 7 L29 9" fill="#F8A9B7" />

        {/* Cabeza */}
        <Circle cx="24" cy="18" r="10" fill="#FFD9A0" />

        {/* Ojos cerrados durmiendo */}
        <Path d="M19 18 Q21 20 23 18" fill="none" strokeWidth="1.5" />
        <Path d="M25 18 Q27 20 29 18" fill="none" strokeWidth="1.5" />

        {/* Nariz */}
        <Path d="M23 21 h2" fill="none" strokeWidth="1.5" />
        
        {/* Zzz... */}
        <Path d="M38 12 h4 l-4 4 h4" fill="none" strokeWidth="1.5" strokeLinecap="square" />
      </G>
    </Svg>
  );
}