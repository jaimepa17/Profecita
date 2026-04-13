import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface StickerIconProps {
  size?: number;
}

export function PlantSticker({ size = 48 }: StickerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Tallo */}
        <Path d="M24 26 L24 16" fill="none" />
        
        {/* Hojita derecha trasera */}
        <Path d="M25 21 C33 21 35 11 27 11 C23 15 23 19 25 21 Z" fill="#88C0A0" />
        
        {/* Hojita superior */}
        <Path d="M24 16 C20 6 30 6 28 14 C26 16 24 16 24 16 Z" fill="#A8D5BA" />
        
        {/* Hojita izquierda frontal */}
        <Path d="M23 23 C15 21 15 11 21 13 C25 15 25 19 23 23 Z" fill="#A8D5BA" />
        
        {/* Cuerpo de la maceta */}
        <Path d="M17 30 L19 42 C19.5 44 28.5 44 29 42 L31 30 Z" fill="#C5A07D" />
        
        {/* Borde de la maceta */}
        <Rect x="15" y="26" width="18" height="4" rx="2" fill="#DCCEC2" />
        
        {/* Carita Kawaii en la maceta */}
        <Circle cx="21" cy="35" r="1.5" fill="#1E140D" stroke="none" />
        <Circle cx="27" cy="35" r="1.5" fill="#1E140D" stroke="none" />
        <Path d="M23 36.5 Q24 38.5 25 36.5" fill="none" strokeWidth="1.5" />
        
        {/* Sonrojado */}
        <Circle cx="18" cy="36.5" r="1.5" fill="#F8A9B7" stroke="none" />
        <Circle cx="30" cy="36.5" r="1.5" fill="#F8A9B7" stroke="none" />
      </G>
    </Svg>
  );
}