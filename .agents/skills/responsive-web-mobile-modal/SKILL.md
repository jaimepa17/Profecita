---
name: responsive-web-mobile-modal
description: "Define a responsive modal strategy for React Native/Expo where web shows richer desktop modal content and mobile keeps a compact touch-first layout."
argument-hint: Which screen/modal flow should be adapted for web vs mobile?
---

# Responsive Web + Mobile Modal

## Objetivo
Estandarizar modales en pantallas React Native/Expo para evitar regressions de UX:
- En web: modal centrado, ancho amplio, mas informacion visible, buen scroll.
- En mobile: modal compacto, tactil, con layout vertical y targets grandes.

## Usar Cuando
- Un modal se ve bien en mobile pero queda pequeno o incomodo en web.
- El flujo necesita mostrar mas informacion en desktop sin saturar telefonos.
- Hay reportes de "no abre" o "se cierra instantaneamente" en web.

## Regla Principal
Mantener la misma logica de negocio y callbacks, variando solo presentacion y densidad por plataforma.

## Patrón Recomendado
1. Detectar plataforma:
   - `const isWeb = Platform.OS === 'web'`
2. Extraer contenido comun a una constante (`content`) para no duplicar formularios.
3. Render dual:
   - Web: overlay absoluto (`position: 'absolute'`) con `zIndex` alto, modal centrado, ancho responsive.
   - Mobile: `Modal` nativo con `animationType="slide"` y panel inferior (`bottom sheet-like`).
4. Backdrop seguro:
   - Cerrar solo al tocar fondo.
   - Ignorar taps accidentales inmediatos tras abrir (cooldown corto de 120-200ms).
5. Scroll:
   - Web: usar `maxHeight` + `ScrollView` interno para mucho contenido.
   - Mobile: mantener panel con `max-h` y scroll vertical.

## Checklist de Implementacion
- [ ] Existe `isWeb` y branch claro web/mobile.
- [ ] En web el modal tiene `zIndex` alto y no queda oculto por layout padre.
- [ ] El contenido en web usa ancho responsive (ej: `min(width-40, 1080)`).
- [ ] El contenido en mobile conserva ergonomia tactil.
- [ ] Click dentro del modal NO cierra el backdrop.
- [ ] Click en backdrop SI cierra modal.
- [ ] No se duplica logica de guardado/eliminado entre plataformas.

## Anti-Patrones
- Usar exactamente el mismo contenedor visual para web y mobile cuando hay distinta densidad.
- Depender solo de `Modal` en web cuando el layout padre puede tapar contenido.
- Cerrar modal por propagacion de click al abrir (sin cooldown anti-cierre instantaneo).
- Duplicar handlers `onCreate/onDelete/onClose` por plataforma.

## Snippet Base
```tsx
const isWeb = Platform.OS === 'web';

if (isWeb) {
  if (!visible) return null;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2000 }}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose}>
        <View className="flex-1 items-center justify-center px-4 py-6">
          <Pressable onPress={() => {}} className="w-full rounded-[28px] border-[4px] border-black bg-[#FDF9F1] p-5">
            {content}
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

return (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable className="flex-1 bg-black/35" onPress={onClose}>
      <View className="flex-1 justify-end">
        <Pressable onPress={() => {}} className="max-h-[88%] rounded-t-[34px] border-[4px] border-black bg-[#FDF9F1] px-5 pt-5 pb-6">
          {content}
        </Pressable>
      </View>
    </Pressable>
  </Modal>
);
```

## Definition of Done
- El modal abre consistentemente en web y mobile.
- En web muestra mas informacion sin cortar contenido.
- En mobile mantiene flujo rapido y limpio.
- No hay cierres accidentales al primer click.
- La UX percibida mejora sin cambiar la logica de negocio.
