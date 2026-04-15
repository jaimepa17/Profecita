import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, TouchableOpacity, View } from 'react-native';
import { CustomText } from './CustomText';
import SelectOptionModal from './SelectOptionModal';

export type EstudianteGroupOption = {
  id: string;
  label: string;
  description?: string;
};

export type EstudianteFormPayload = {
  nombreCompleto: string;
  identificacion: string;
  grupoIds: string[];
};

type EstudianteFormModalProps = {
  visible: boolean;
  submitting: boolean;
  loadingGroups: boolean;
  groupOptions: EstudianteGroupOption[];
  mode?: 'create' | 'edit';
  title?: string;
  helperText?: string;
  submitLabel?: string;
  requireGroup?: boolean;
  initialNombreCompleto?: string;
  initialIdentificacion?: string;
  initialGrupoIds?: string[];
  onClose: () => void;
  onSubmit: (payload: EstudianteFormPayload) => Promise<void>;
};

export default function EstudianteFormModal({
  visible,
  submitting,
  loadingGroups,
  groupOptions,
  mode = 'create',
  title,
  helperText,
  submitLabel,
  requireGroup = true,
  initialNombreCompleto,
  initialIdentificacion,
  initialGrupoIds,
  onClose,
  onSubmit,
}: EstudianteFormModalProps) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [selectedGrupoIds, setSelectedGrupoIds] = useState<string[]>([]);
  const [groupSelectorVisible, setGroupSelectorVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setNombreCompleto(initialNombreCompleto ?? '');
      setIdentificacion(initialIdentificacion ?? '');
      setSelectedGrupoIds(initialGrupoIds ?? []);
      setError(null);
      return;
    }

    setNombreCompleto('');
    setIdentificacion('');
    setSelectedGrupoIds([]);
    setGroupSelectorVisible(false);
    setError(null);
  }, [visible, initialNombreCompleto, initialIdentificacion, initialGrupoIds]);

  const selectedGroups = useMemo(
    () => groupOptions.filter((option) => selectedGrupoIds.includes(option.id)),
    [groupOptions, selectedGrupoIds]
  );

  const handleSubmit = async () => {
    const cleanName = nombreCompleto.trim();

    if (!cleanName) {
      setError('Escribe el nombre completo del estudiante.');
      return;
    }

    if (requireGroup && selectedGrupoIds.length === 0) {
      setError('Selecciona al menos un grupo para asignar al estudiante.');
      return;
    }

    setError(null);
    await onSubmit({
      nombreCompleto: cleanName,
      identificacion: identificacion.trim(),
      grupoIds: selectedGrupoIds,
    });
  };

  const resolvedTitle = title ?? (mode === 'edit' ? 'Editar estudiante' : 'Crear y asignar estudiante');
  const resolvedHelperText =
    helperText ??
    (mode === 'edit'
      ? 'Actualiza los datos del estudiante.'
      : 'Registra al estudiante y asígnalo a un grupo en un solo paso.');
  const resolvedSubmitLabel = submitLabel ?? (mode === 'edit' ? 'Guardar cambios' : 'Crear y asignar');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SelectOptionModal
        visible={groupSelectorVisible}
        title="Seleccionar grupos"
        emptyMessage={loadingGroups ? 'Cargando grupos...' : 'No hay grupos disponibles.'}
        options={groupOptions}
        selectedIds={selectedGrupoIds}
        multiSelect
        onClose={() => setGroupSelectorVisible(false)}
        onSelect={(option) => {
          setSelectedGrupoIds((prev) =>
            prev.includes(option.id)
              ? prev.filter((id) => id !== option.id)
              : [...prev, option.id]
          );
          setError(null);
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        className="flex-1"
      >
        <Pressable className="flex-1 bg-black/35" onPress={onClose}>
          <View className="flex-1 justify-end">
            <Pressable className="rounded-t-[36px] border-[4px] border-black bg-[#FDF9F1] px-5 pt-5 pb-8">
              <View className="mb-4 items-center">
                <View className="h-2 w-20 rounded-full bg-[#B9987A]" />
              </View>

              <View className="relative mb-4">
                <View className="absolute inset-0 translate-x-2 translate-y-2 rounded-[28px] bg-black" />
                <View className="rounded-[28px] border-[3px] border-black bg-[#FFF7E8] p-5">
                  <CustomText className="text-2xl font-black text-black">{resolvedTitle}</CustomText>
                  <CustomText className="mt-2 text-sm font-medium text-[#6B5A4A]">{resolvedHelperText}</CustomText>

                  <View className="mt-4 rounded-2xl border-[3px] border-black bg-white px-4 py-3">
                  <CustomText className="mb-1 text-xs font-black uppercase tracking-wide text-[#7A6857]">
                    Nombre completo
                  </CustomText>
                  <TextInput
                    value={nombreCompleto}
                    onChangeText={setNombreCompleto}
                    editable={!submitting}
                    placeholder="Ej: Jose Perez Perez"
                    placeholderTextColor="#9F8B78"
                    className="text-base font-bold text-black"
                    autoCapitalize="words"
                    maxLength={150}
                    returnKeyType="next"
                  />
                </View>

                <View className="mt-3 rounded-2xl border-[3px] border-black bg-white px-4 py-3">
                  <CustomText className="mb-1 text-xs font-black uppercase tracking-wide text-[#7A6857]">
                    Identificacion (opcional)
                  </CustomText>
                  <TextInput
                    value={identificacion}
                    onChangeText={setIdentificacion}
                    editable={!submitting}
                    placeholder="Ej: 2026-001"
                    placeholderTextColor="#9F8B78"
                    className="text-base font-bold text-black"
                    maxLength={50}
                    returnKeyType="done"
                  />
                </View>

                {requireGroup ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.9}
                    disabled={submitting || loadingGroups}
                    onPress={() => setGroupSelectorVisible(true)}
                    className="mt-3 rounded-xl border-[3px] border-black bg-[#FFF7E8] px-4 py-3"
                  >
                    <CustomText className="text-xs font-black uppercase tracking-wide text-[#7A6857]">
                      Grupos de asignacion
                    </CustomText>
                    <CustomText className="mt-1 text-base font-bold text-black">
                      {selectedGroups.length > 0
                        ? `${selectedGroups.length} grupo(s) seleccionado(s)`
                        : loadingGroups
                          ? 'Cargando grupos...'
                          : 'Seleccionar grupos'}
                    </CustomText>
                    {selectedGroups.slice(0, 3).map((group) => (
                      <CustomText key={group.id} className="mt-1 text-xs font-semibold text-[#6B5A4A]">
                        {`• ${group.label}${group.description ? ` — ${group.description}` : ''}`}
                      </CustomText>
                    ))}
                    {selectedGroups.length > 3 ? (
                      <CustomText className="mt-1 text-xs font-semibold text-[#6B5A4A]">
                        {`+${selectedGroups.length - 3} grupo(s) más`}
                      </CustomText>
                    ) : null}
                  </TouchableOpacity>
                ) : null}

                {error ? <CustomText className="mt-3 text-sm font-bold text-[#A6342C]">{error}</CustomText> : null}
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                disabled={submitting}
                onPress={onClose}
                className="flex-1 rounded-2xl border-[3px] border-black bg-white px-4 py-4"
              >
                <CustomText className="text-center text-sm font-black text-black">Cancelar</CustomText>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.9}
                disabled={submitting || (requireGroup && loadingGroups)}
                onPress={handleSubmit}
                className="flex-1 rounded-2xl border-[3px] border-black bg-[#FFD98E] px-4 py-4"
              >
                <CustomText className="text-center text-sm font-black text-black">
                  {submitting ? 'Guardando...' : resolvedSubmitLabel}
                </CustomText>
              </TouchableOpacity>
            </View>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}