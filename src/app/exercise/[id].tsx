import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Switch, View, type KeyboardTypeOptions } from 'react-native';

import { GymMap, type MapPoint } from '@/components/gym-map';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { FormScreen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { createExercise, deleteExercise, getExercise, getSettings, updateExercise } from '@/db/repo';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { confirm, notify } from '@/lib/dialog';
import { formatNumber, parseNumber } from '@/lib/format';
import { deleteImage, imageUri, persistImage, pickImage } from '@/lib/images';
import type { Exercise, Settings } from '@/types';

const MAX_SETS = 12;

export default function ExerciseScreen() {
  const { id, workoutId } = useLocalSearchParams<{ id: string; workoutId: string }>();
  const { data } = useFocusQuery(
    async (db) => ({
      settings: await getSettings(db),
      exercise: id === 'new' ? null : await getExercise(db, Number(id)),
    }),
    id
  );

  if (!data) return <FormScreen>{null}</FormScreen>;
  return (
    <ExerciseForm workoutId={Number(workoutId)} exercise={data.exercise} settings={data.settings} />
  );
}

/** A photo already in the app's storage, or one just picked and not yet saved. */
type Photo = { kind: 'stored'; name: string } | { kind: 'picked'; uri: string } | null;

/** Fits `values` to `sets` entries, repeating the last one to fill the gap. */
function fitToSets(values: string[], sets: number) {
  return Array.from({ length: sets }, (_, i) => values[i] ?? values[values.length - 1] ?? '');
}

const allEqual = (values: number[]) => values.every((v) => v === values[0]);

type FormProps = { workoutId: number; exercise: Exercise | null; settings: Settings };

function ExerciseForm({ workoutId, exercise, settings }: FormProps) {
  const db = useSQLiteContext();
  const router = useRouter();

  const [name, setName] = useState(exercise?.name ?? '');
  const [photo, setPhoto] = useState<Photo>(
    exercise?.photo ? { kind: 'stored', name: exercise.photo } : null
  );
  const [point, setPoint] = useState<MapPoint | null>(
    exercise && exercise.mapX !== null && exercise.mapY !== null
      ? { x: exercise.mapX, y: exercise.mapY }
      : null
  );
  const [setsText, setSetsText] = useState(String(exercise?.sets ?? 3));
  const [reps, setReps] = useState(exercise?.reps.map(formatNumber) ?? ['12']);
  const [repsVary, setRepsVary] = useState(exercise ? !allEqual(exercise.reps) : false);
  const [loads, setLoads] = useState(
    exercise?.loads.map((l) => (l > 0 ? formatNumber(l) : '')) ?? ['']
  );
  const [loadsVary, setLoadsVary] = useState(exercise ? !allEqual(exercise.loads) : false);
  const [notes, setNotes] = useState(exercise?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const sets = Math.min(MAX_SETS, Math.max(1, parseInt(setsText, 10) || 1));

  const choosePhoto = async () => {
    const picked = await pickImage();
    if (picked) setPhoto({ kind: 'picked', uri: picked.uri });
  };

  const save = async () => {
    const repsPerSet = fitToSets(repsVary ? reps : reps.slice(0, 1), sets).map(parseNumber);
    const loadsPerSet = fitToSets(loadsVary ? loads : loads.slice(0, 1), sets).map((text) =>
      text.trim() === '' ? 0 : parseNumber(text)
    );

    if (!name.trim()) return notify('Informe o nome do exercício.');
    if (repsPerSet.some((r) => !Number.isInteger(r) || r < 1)) {
      return notify('Repetições inválidas', 'Informe um número inteiro maior que zero.');
    }
    if (loadsPerSet.some((l) => Number.isNaN(l) || l < 0)) {
      return notify('Carga inválida', 'Informe a carga em kg ou deixe em branco.');
    }

    setSaving(true);
    try {
      const input = {
        workoutId,
        name: name.trim(),
        photo: photo?.kind === 'picked' ? await persistImage(photo.uri) : (photo?.name ?? null),
        mapX: point?.x ?? null,
        mapY: point?.y ?? null,
        sets,
        reps: repsPerSet,
        loads: loadsPerSet,
        notes: notes.trim(),
      };
      if (exercise) {
        await updateExercise(db, exercise.id, input);
        if (exercise.photo && exercise.photo !== input.photo) deleteImage(exercise.photo);
      } else {
        await createExercise(db, input);
      }
      router.back();
    } catch (error) {
      console.warn('Failed to save exercise', error);
      notify('Não foi possível salvar o exercício.');
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!exercise) return;
    const confirmed = await confirm({
      title: 'Excluir exercício?',
      confirmLabel: 'Excluir',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteExercise(db, exercise.id);
    if (exercise.photo) deleteImage(exercise.photo);
    router.back();
  };

  return (
    <FormScreen footer={<Button title="Salvar" icon="check" disabled={saving} onPress={save} />}>
      <Field label="Nome">
        <Input value={name} onChangeText={setName} placeholder="Ex.: Supino reto" />
      </Field>

      <Field label="Foto do aparelho">
        {photo && (
          <Image
            source={{ uri: photo.kind === 'picked' ? photo.uri : imageUri(photo.name) }}
            style={styles.photo}
            contentFit="cover"
          />
        )}
        <View style={styles.row}>
          <Button
            title={photo ? 'Trocar foto' : 'Adicionar foto'}
            icon="camera"
            variant="secondary"
            style={styles.grow}
            onPress={choosePhoto}
          />
          {photo && <Button title="Remover" variant="danger" onPress={() => setPhoto(null)} />}
        </View>
      </Field>

      <Field label="Séries">
        <Input
          value={setsText}
          onChangeText={setSetsText}
          keyboardType="number-pad"
          maxLength={2}
        />
      </Field>

      <PerSetField
        label="Repetições"
        sets={sets}
        values={reps}
        vary={repsVary}
        keyboardType="number-pad"
        onChange={setReps}
        onVaryChange={setRepsVary}
      />

      <PerSetField
        label="Carga (kg)"
        sets={sets}
        values={loads}
        vary={loadsVary}
        keyboardType="decimal-pad"
        placeholder="Sem carga"
        onChange={setLoads}
        onVaryChange={setLoadsVary}
      />

      <Field label="Localização no mapa">
        {settings.mapImage ? (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Toque no mapa para marcar onde fica o aparelho.
            </ThemedText>
            <GymMap
              uri={imageUri(settings.mapImage)}
              aspectRatio={settings.mapWidth / settings.mapHeight}
              point={point}
              onPick={setPoint}
            />
            {point && (
              <Button title="Limpar localização" variant="secondary" onPress={() => setPoint(null)} />
            )}
          </>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Carregue o mapa da academia na aba Configurações para marcar a localização.
          </ThemedText>
        )}
      </Field>

      <Field label="Observações (opcional)">
        <Input
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Ex.: banco na posição 3, pegada aberta"
        />
      </Field>

      {exercise && <Button title="Excluir exercício" variant="danger" onPress={confirmDelete} />}
    </FormScreen>
  );
}

type PerSetFieldProps = {
  label: string;
  sets: number;
  values: string[];
  vary: boolean;
  keyboardType: KeyboardTypeOptions;
  placeholder?: string;
  onChange: (values: string[]) => void;
  onVaryChange: (vary: boolean) => void;
};

/** One value for every set, or one value per set (e.g. decreasing reps or load). */
function PerSetField(props: PerSetFieldProps) {
  const { label, sets, values, vary, keyboardType, placeholder, onChange, onVaryChange } = props;
  const perSet = fitToSets(values, sets);

  return (
    <Field label={label}>
      {vary ? (
        <View style={styles.setGrid}>
          {perSet.map((value, i) => (
            <View key={i} style={styles.setCell}>
              <ThemedText type="small" themeColor="textSecondary">
                {i + 1}ª série
              </ThemedText>
              <Input
                value={value}
                keyboardType={keyboardType}
                placeholder={placeholder}
                onChangeText={(text) => onChange(perSet.map((v, j) => (j === i ? text : v)))}
              />
            </View>
          ))}
        </View>
      ) : (
        <Input
          value={values[0] ?? ''}
          keyboardType={keyboardType}
          placeholder={placeholder}
          onChangeText={(text) => onChange([text])}
        />
      )}
      <View style={styles.switchRow}>
        <ThemedText type="small">Variar por série</ThemedText>
        <Switch
          value={vary}
          onValueChange={(next) => {
            // Start the per-set inputs from the single value.
            if (next) onChange(fitToSets(values.slice(0, 1), sets));
            onVaryChange(next);
          }}
        />
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  grow: {
    flex: 1,
  },
  setGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  setCell: {
    width: '30%',
    flexGrow: 1,
    gap: Spacing.one,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
