import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { TabScreen } from '@/components/ui/screen';
import { WeightChart } from '@/components/weight-chart';
import { Spacing } from '@/constants/theme';
import {
  deleteWeight,
  listProgressPhotos,
  listWeights,
  setProgressPhoto,
  setWeight,
} from '@/db/repo';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, toDateKey } from '@/lib/dates';
import { confirm, notify } from '@/lib/dialog';
import { formatNumber, parseNumber } from '@/lib/format';
import { deleteImage, imageUri, persistImage, pickImage } from '@/lib/images';
import type { WeightEntry } from '@/types';

/** `days` is how far back the chart goes; null shows everything. */
const RANGES: { days: number | null; label: string }[] = [
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
  { days: null, label: 'Tudo' },
];

const MAX_WEIGHT_KG = 500;

function formatChange(kg: number) {
  if (kg === 0) return '0 kg';
  return `${kg > 0 ? '+' : '−'}${formatNumber(Math.abs(kg))} kg`;
}

export default function ProgressScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const now = new Date();
  const today = toDateKey(now);

  const { data, reload } = useFocusQuery(async (db) => ({
    weights: await listWeights(db),
    photos: await listProgressPhotos(db),
  }));
  // What is being typed; null shows the weight already logged today.
  const [draft, setDraft] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<number | null>(30);
  // Day inspected in the chart; null follows the latest entry.
  const [selected, setSelected] = useState<string | null>(null);

  if (!data) return <TabScreen title="Progresso">{null}</TabScreen>;
  const { weights, photos } = data;

  const todayWeight = weights.find((w) => w.date === today);
  const weightText = draft ?? (todayWeight ? formatNumber(todayWeight.kg) : '');
  const todayPhoto = photos.find((p) => p.date === today);

  const rangeStart =
    rangeDays === null
      ? ''
      : toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - rangeDays + 1));
  const visible = weights.filter((w) => w.date >= rangeStart);
  const latest = visible[visible.length - 1];
  const inspected = visible.find((w) => w.date === selected) ?? latest;

  const saveWeight = async () => {
    const kg = Math.round(parseNumber(weightText) * 10) / 10;
    if (!(kg > 0 && kg <= MAX_WEIGHT_KG)) {
      notify('Peso inválido', 'Informe seu peso em kg, por exemplo 82,5.');
      return;
    }
    await setWeight(db, today, kg);
    Keyboard.dismiss();
    setDraft(null);
    setSelected(null);
    reload();
  };

  const confirmDeleteWeight = async (entry: WeightEntry) => {
    const confirmed = await confirm({
      title: 'Remover peso?',
      message: `O registro de ${formatDateKey(entry.date)} sairá do gráfico.`,
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!confirmed) return;
    await deleteWeight(db, entry.date);
    setSelected(null);
    reload();
  };

  const changePhoto = async () => {
    const picked = await pickImage();
    if (!picked) return;
    const photo = await persistImage(picked.uri);
    const replaced = await setProgressPhoto(db, today, photo);
    if (replaced) deleteImage(replaced);
    reload();
  };

  return (
    <TabScreen title="Progresso">
      <Card>
        <ThemedText type="smallBold">Peso de hoje</ThemedText>
        <ThemedText type="small" themeColor={todayWeight ? 'success' : 'textSecondary'}>
          {todayWeight ? 'Já registrado hoje. Salve de novo para corrigir.' : 'Ainda não registrado hoje.'}
        </ThemedText>
        <View style={styles.row}>
          <Input
            value={weightText}
            onChangeText={setDraft}
            placeholder="Ex.: 82,5"
            keyboardType="decimal-pad"
            returnKeyType="done"
            onSubmitEditing={saveWeight}
            accessibilityLabel="Peso de hoje em kg"
            style={[styles.grow, { backgroundColor: theme.backgroundSelected }]}
          />
          <ThemedText themeColor="textSecondary">kg</ThemedText>
          <Button title="Salvar" icon="check" disabled={weightText.trim() === ''} onPress={saveWeight} />
        </View>
      </Card>

      <Card>
        <ThemedText type="smallBold">Evolução do peso</ThemedText>
        {weights.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Registre seu peso todos os dias para acompanhar a evolução aqui.
          </ThemedText>
        ) : (
          <>
            <View style={[styles.ranges, { backgroundColor: theme.backgroundSelected }]}>
              {RANGES.map(({ days, label }) => {
                const active = days === rangeDays;
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    onPress={() => setRangeDays(days)}
                    style={[styles.range, active && { backgroundColor: theme.tint }]}>
                    <ThemedText type="smallBold" style={active && { color: theme.onTint }}>
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {visible.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.noData}>
                Nenhum peso registrado neste período.
              </ThemedText>
            ) : (
              <>
                <View style={styles.stats}>
                  <View style={styles.grow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Peso atual
                    </ThemedText>
                    <ThemedText type="subtitle">{formatNumber(latest.kg)} kg</ThemedText>
                  </View>
                  <View style={styles.grow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Variação no período
                    </ThemedText>
                    <ThemedText type="subtitle">
                      {formatChange(Math.round((latest.kg - visible[0].kg) * 10) / 10)}
                    </ThemedText>
                  </View>
                </View>

                <WeightChart entries={visible} selected={inspected.date} onSelect={setSelected} />

                <View style={[styles.inspected, { borderTopColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.grow}>
                    {formatDateKey(inspected.date)}
                  </ThemedText>
                  <ThemedText type="smallBold">{formatNumber(inspected.kg)} kg</ThemedText>
                  <IconButton
                    icon="trash"
                    label={`Remover peso de ${formatDateKey(inspected.date)}`}
                    color={theme.textSecondary}
                    onPress={() => confirmDeleteWeight(inspected)}
                  />
                </View>
                {visible.length > 1 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Toque ou arraste no gráfico para ver outros dias.
                  </ThemedText>
                )}
              </>
            )}
          </>
        )}
      </Card>

      <Card>
        <ThemedText type="smallBold">Foto de hoje</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Tire uma foto por dia, sempre na mesma posição e com a mesma luz, e depois assista à sua
          evolução.
        </ThemedText>
        <View style={styles.row}>
          {todayPhoto && (
            <Image
              source={{ uri: imageUri(todayPhoto.photo) }}
              style={styles.photo}
              contentFit="cover"
              accessibilityLabel="Foto de hoje"
            />
          )}
          <View style={styles.photoActions}>
            <ThemedText type="small" themeColor="textSecondary">
              {photos.length === 1 ? '1 foto registrada' : `${photos.length} fotos registradas`}
            </ThemedText>
            <Button
              title={todayPhoto ? 'Trocar foto' : 'Adicionar foto'}
              icon="camera"
              variant="secondary"
              onPress={changePhoto}
            />
            <Button
              title="Ver evolução"
              icon="play"
              disabled={photos.length === 0}
              onPress={() => router.push('/timelapse')}
            />
          </View>
        </View>
      </Card>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  grow: {
    flex: 1,
  },
  ranges: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Spacing.three,
  },
  range: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.three - Spacing.one,
  },
  noData: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  inspected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  photo: {
    width: 108,
    aspectRatio: 3 / 4,
    borderRadius: Spacing.two,
  },
  photoActions: {
    flex: 1,
    gap: Spacing.two,
  },
});
