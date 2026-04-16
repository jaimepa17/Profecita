---
description: Compilar APK en modo Debug/Develop con los últimos cambios
agent: build
---

Compilar una APK en modo Debug para este proyecto Expo/React Native.

Sigue estos pasos en orden:

1. **Verificar cambios:**
   - Ejecuta `git status` y `git log --oneline -5` para ver los últimos cambios
   - Revisa si hay cambios sin commitear

2. **Compilar el APK Debug:**
   - Ejecuta `cd android && ./gradlew assembleDebug`
   - El APK se genera en: `android/app/build/outputs/apk/debug/app-debug.apk`

3. **Preguntar destino del APK:**
   - Usa `question` para preguntar: "¿Dónde quieres guardar el APK?"
     - "1. Dejarlo en la ubicación por defecto (android/app/build/outputs/apk/debug/)"
     - "2. Copiarlo a la carpeta raíz del proyecto"
   - Si elige opción 2:
     - Usa `question` para preguntar: "¿Cómo quieres nombrar el archivo?"
       - "1. Profecita-v[VERSION]-debug.apk"
       - "2. app-debug.apk (nombre por defecto)"

4. **Instalar por ADB (opcional):**
   - Usa `question` para preguntar: "¿Deseas instalar la APK en un dispositivo Android por ADB?"
     - "1. Sí, buscar dispositivos en red"
     - "2. Sí, usar IP específica"
     - "3. No, gracias"
   - Si elige buscar: ejecuta `adb devices` y muestra los dispositivos disponibles
   - Si elige IP específica: pregunta la IP:puerto
   - Conecta con `adb connect [IP]:[PUERTO]` e instala con `adb install -r [RUTA_APK]`
   - Lanza la app con `adb shell am start -n com.jaimepaok17.controlnotas/.MainActivity`

5. **Notas Debug:**
   - El APK debug incluye soporte para JS live reload
   - Puede conectarse a Metro bundler para desarrollo

6. **Confirmar éxito:**
   - Muestra la ubicación final del APK
   - Muestra el tamaño del archivo
