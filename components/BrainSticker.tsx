import React from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';

interface StickerIconProps {
  size?: number;
}

export function BrainSticker({ size = 48 }: StickerIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G stroke="#1E140D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Sombra / Fondo Kraft */}
        <Path
          d="M24 8 C30 8 36 11 38 16 C42 17 44 21 44 26 C44 32 40 38 32 40 C28 41 20 41 16 40 C8 38 4 32 4 26 C4 21 6 17 10 16 C12 11 18 8 24 8 Z"
          fill="#E88B9E"
          transform="translate(1, 2)"
        />
        
        {/* Cuerpo principal del cerebro (Nube/Kawaii) */}
        <Path
          d="M24 8 C30 8 36 11 38 16 C42 17 44 21 44 26 C44 32 40 38 32 40 C28 41 20 41 16 40 C8 38 4 32 4 26 C4 21 6 17 10 16 C12 11 18 8 24 8 Z"
          fill="#FFB6C1"
        />

        {/* Separación central de hemisferios */}
        <Path d="M24 8 C22 14 26 20 24 25" fill="none" />

        {/* Pliegues cerebrales - Izquierda */}
        <Path d="M12 15 C16 16 18 20 16 24" fill="none" />
        <Path d="M8 28 C12 30 14 36 12 38" fill="none" />

        {/* Pliegues cerebrales - Derecha */}
        <Path d="M36 15 C32 16 30 20 32 24" fill="none" />
        <Path d="M40 28 C36 30 34 36 36 38" fill="none" />

        {/* Detalles Kawaii: Mejillas Sonrojadas */}
        <Path d="M14 31 L16 31" stroke="#FF80A0" strokeWidth="3" />
        <Path d="M32 31 L34 31" stroke="#FF80A0" strokeWidth="3" />

        {/* Ojos */}
        <Circle cx="18" cy="28" r="2" fill="#1E140D" stroke="none" />
        <Circle cx="30" cy="28" r="2" fill="#1E140D" stroke="none" />

        {/* Sonrisa */}
        <Path d="M22 29 Q24 33 26 29" fill="none" />
        
        {/* Destello de brillo */}
        <Path d="M16 10 C18 9 20 9 20 9" stroke="#FFF" strokeWidth="2.5" />
      </G>
    </Svg>
  );
}
