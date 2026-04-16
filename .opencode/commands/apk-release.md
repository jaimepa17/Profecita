---
description: Compilar APK en modo Release con los últimos cambios
agent: build
---

Compilar una APK en modo Release para este proyecto Expo/React Native.

Sigue estos pasos en orden:

1. **Verificar versión:**
   - Revisa los tags git para encontrar la última versión (formato vX.Y.Z)
   - Revisa el commit más reciente y el changelog para determinar qué tipo de cambio es (fix/feat/refactor)
   - Usa el comando `question` para preguntar al usuario:
     - "¿Cuál es la versión para esta release? (ej: 1.0.2)"
     - "La última versión encontrada fue [X.Y.Z]. ¿Deseas usar esa + 1 patch?"

2. **Compilar el APK:**
   - Ejecuta `cd android && ./gradlew assembleRelease`
   - El APK se genera en: `android/app/build/outputs/apk/release/app-release.apk`

3. **Preguntar destino del APK:**
   - Usa `question` para preguntar: "¿Dónde quieres guardar el APK?"
     - "1. Dejarlo en la ubicación por defecto (android/app/build/outputs/apk/release/)"
     - "2. Copiarlo a la carpeta raíz del proyecto"
   - Si elige opción 2:
     - Usa `question` para preguntar: "¿Cómo quieres nombrar el archivo?"
       - "1. Profecita-v[VERSION]-release.apk (recomendado)"
       - "2. app-release.apk (nombre por defecto)"
     - Copia el APK con el nombre elegido

4. **Instalar por ADB (opcional):**
   - Usa `question` para preguntar: "¿Deseas instalar la APK en un dispositivo Android por ADB?"
     - "1. Sí, buscar dispositivos en red"
     - "2. Sí, usar IP específica"
     - "3. No, gracias"
   - Si elige buscar: ejecuta `adb devices` y muestra los dispositivos disponibles
   - Si elige IP específica: pregunta la IP:puerto
   - Conecta con `adb connect [IP]:[PUERTO]` e instala con `adb install -r [RUTA_APK]`
   - Lanza la app con `adb shell am start -n com.jaimepaok17.controlnotas/.MainActivity`

5. **Generar RELEASE.md:**
   - Crea un archivo `RELEASE-v[VERSION].md` en la raíz con:
     - Título: "Profecita v[VERSION]"
     - Lista de cambios desde la última versión
     - Enlace de descarga
     - Instrucciones de instalación
     - Requisitos (Android 7.0+ API 24)

6. **Confirmar éxito:**
   - Muestra la ubicación final del APK
   - Muestra el tamaño del archivo
