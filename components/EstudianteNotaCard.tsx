import React, { useCallback, useEffect, useState } from 'react';
import { TextInput, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';
import {
  createNota,
  deleteNota,
  type Nota,
  updateNota,
} from '@/lib/services/notasService';
import type { Estudiante } from '@/lib/services/estudiantesService';
import { useKeyedSingleFlight } from '@/lib/hooks/useSingleFlight';
import ConfirmActionModal from '@/components/ConfirmActionModal';
import type { AlertModalType } from '@/components/AlertModal';

type EstudianteNotaCardProps = {
  estudiante: Estudiante;
  notaExistente: Nota | undefined;
  actividadId: string;
  maxPuntaje: number;
  initialInputValue?: string;
  onInputChange: (estudianteId: string, value: string) => void;
  onInputFocus?: (estudianteId: string) => void;
  onNotaSaved: (estudianteId: string, nota: Nota | null) => void;
  onFeedback: (type: AlertModalType, title: string, message: string) => void;
};

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeNumberInput(raw: string): string {
  return raw.replace(/[^0-9.,]/g, '');
}

export default function EstudianteNotaCard({
  estudiante,
  notaExistente,
  actividadId,
  maxPuntaje,
  initialInputValue,
  onInputChange,
  onInputFocus,
  onNotaSaved,
  onFeedback,
}: EstudianteNotaCardProps) {
  const [inputValue, setInputValue] = useState(initialInputValue ?? '');
  const [isEditing, setIsEditing] = useState(!notaExistente);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);

  useEffect(() => {
    setInputValue(initialInputValue ?? '');
  }, [initialInputValue]);

  useEffect(() => {
    if (!notaExistente) {
      setIsEditing(true);
    }
  }, [notaExistente]);

  const { run: runGuardar, isRunning: isSaving } = useKeyedSingleFlight<string>();
  const { run: runEliminar, isRunning: isDeleting } = useKeyedSingleFlight<string>();

  const handleInputChange = useCallback(
    (raw: string) => {
      const normalized = normalizeNumberInput(raw);
      setInputValue(normalized);
      onInputChange(estudiante.id, normalized);
    },
    [estudiante.id, onInputChange]
  );

  const guardarNota = useCallback(async () => {
    const raw = inputValue.trim();
    if (!raw) {
      onFeedback('warning', 'Puntaje requerido', `Ingresa la nota de ${estudiante.nombre_completo}.`);
      return;
    }

    const parsed = Number(raw.replace(',', '.'));
    if (Number.isNaN(parsed)) {
      onFeedback('warning', 'Puntaje inválido', `El puntaje de ${estudiante.nombre_completo} no es válido.`);
      return;
    }

    const puntaje = roundTo2(parsed);
    if (puntaje < 0 || puntaje > maxPuntaje) {
      onFeedback(
        'warning',
        'Puntaje fuera de rango',
        `El puntaje de ${estudiante.nombre_completo} debe estar entre 0 y ${maxPuntaje}.`
      );
      return;
    }

    await runGuardar(estudiante.id, async () => {
      if (!notaExistente) {
        const createResult = await createNota({
          actividad_id: actividadId,
          estudiante_id: estudiante.id,
          puntaje_obtenido: puntaje,
        });

        if (!createResult.ok) {
          onFeedback('error', 'No se pudo guardar la nota', createResult.error);
          return;
        }

        onNotaSaved(estudiante.id, createResult.data);
        onInputChange(estudiante.id, String(createResult.data.puntaje_obtenido));
        setIsEditing(false);
        onFeedback('success', 'Nota registrada', `${estudiante.nombre_completo} fue calificado correctamente.`);
      } else {
        const updateResult = await updateNota(notaExistente.id, {
          puntaje_obtenido: puntaje,
        });

        if (!updateResult.ok) {
          onFeedback('error', 'No se pudo actualizar la nota', updateResult.error);
          return;
        }

        onNotaSaved(estudiante.id, { ...notaExistente, puntaje_obtenido: puntaje });
        onInputChange(estudiante.id, String(puntaje));
        setIsEditing(false);
        onFeedback('success', 'Nota actualizada', `${estudiante.nombre_completo} se actualizó correctamente.`);
      }
    });
  }, [
    inputValue,
    estudiante,
    actividadId,
    notaExistente,
    maxPuntaje,
    onNotaSaved,
    onInputChange,
    runGuardar,
    onFeedback,
  ]);

  const ejecutarEliminacion = useCallback(async () => {
    if (!notaExistente) {
      return;
    }

    await runEliminar(estudiante.id, async () => {
      const result = await deleteNota(notaExistente.id);
      if (!result.ok) {
        onFeedback('error', 'No se pudo eliminar la nota', result.error);
        return;
      }

      setInputValue('');
      setIsEditing(true);
      setConfirmDeleteVisible(false);
      onInputChange(estudiante.id, '');
      onNotaSaved(estudiante.id, null);
      onFeedback('success', 'Nota eliminada', `${estudiante.nombre_completo} quedó sin nota registrada.`);
    });
  }, [
    notaExistente,
    runEliminar,
    estudiante.id,
    estudiante.nombre_completo,
    onInputChange,
    onNotaSaved,
    onFeedback,
  ]);

  const eliminarNota = useCallback(() => {
    if (!notaExistente) {
      return;
    }

    setConfirmDeleteVisible(true);
  }, [notaExistente]);

  const abrirEdicion = useCallback(() => {
    setIsEditing(true);
  }, []);

  const cancelarEdicion = useCallback(() => {
    if (notaExistente) {
      const value = String(notaExistente.puntaje_obtenido);
      setInputValue(value);
      onInputChange(estudiante.id, value);
    } else {
      setInputValue('');
      onInputChange(estudiante.id, '');
    }
    setIsEditing(false);
  }, [notaExistente, estudiante.id, onInputChange]);

  return (
    <View
      className={`rounded-2xl border-[3px] px-4 py-3 ${
        isInputFocused ? 'border-black bg-[#FFFDF7]' : 'border-black bg-[#FFF7E8]'
      }`}
    >
      <ConfirmActionModal
        visible={confirmDeleteVisible}
        title="Eliminar nota"
        message={`¿Seguro que deseas eliminar la nota de ${estudiante.nombre_completo}?`}
        confirmLabel="Eliminar"
        loading={isDeleting(estudiante.id)}
        onCancel={() => {
          if (isDeleting(estudiante.id)) {
            return;
          }
          setConfirmDeleteVisible(false);
        }}
        onConfirm={() => {
          void ejecutarEliminacion();
        }}
      />

      <CustomText className="text-sm font-black text-black">{estudiante.nombre_completo}</CustomText>

      {!isEditing && notaExistente ? (
        <>
          <View className="mt-2 rounded-xl border-[3px] border-black bg-white px-3 py-2">
            <CustomText className="text-base font-black text-black">
              {roundTo2(Number(notaExistente.puntaje_obtenido))}
            </CustomText>
            <CustomText className="mt-1 text-xs font-semibold text-[#6B5A4A]">
              Nota registrada de {maxPuntaje}
            </CustomText>
          </View>

          <View className="mt-3 flex-row gap-2">
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              onPress={abrirEdicion}
              className="rounded-xl border-[3px] border-black bg-[#D7ECFF] px-4 py-2"
            >
              <CustomText className="text-sm font-black text-black">Editar</CustomText>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              disabled={isDeleting(estudiante.id)}
              onPress={eliminarNota}
              className="rounded-xl border-[3px] border-black bg-[#FFC9C2] px-4 py-2"
            >
              <CustomText className="text-sm font-black text-black">
                {isDeleting(estudiante.id) ? 'Eliminando...' : 'Eliminar'}
              </CustomText>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <TextInput
            value={inputValue}
            onChangeText={handleInputChange}
            onFocus={() => {
              setIsInputFocused(true);
              onInputFocus?.(estudiante.id);
            }}
            onBlur={() => setIsInputFocused(false)}
            keyboardType="decimal-pad"
            placeholder={`0 a ${maxPuntaje}`}
            placeholderTextColor="#9F8B78"
            className="mt-2 rounded-xl border-[3px] border-black bg-white px-3 py-2 text-base font-bold text-black"
          />


          <View className="mt-3 flex-row gap-2">
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.9}
              disabled={isSaving(estudiante.id)}
              onPress={() => {
                void guardarNota();
              }}
              className="rounded-xl border-[3px] border-black bg-[#BDE9C7] px-4 py-2"
            >
              <CustomText className="text-sm font-black text-black">
                {isSaving(estudiante.id) ? 'Guardando...' : notaExistente ? 'Guardar cambios' : 'Registrar nota'}
              </CustomText>
            </TouchableOpacity>

            {notaExistente ? (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                onPress={cancelarEdicion}
                className="rounded-xl border-[3px] border-black bg-white px-4 py-2"
              >
                <CustomText className="text-sm font-black text-black">Cancelar</CustomText>
              </TouchableOpacity>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}
