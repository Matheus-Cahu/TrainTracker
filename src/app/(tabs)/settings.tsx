import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { GymMap } from '@/components/gym-map';
import { ThemedText } from '@/components/themed-text';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TabScreen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { getSettings, setMapImage, setRestSeconds } from '@/db/repo';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { formatCountdown } from '@/lib/dates';
import { confirm } from '@/lib/dialog';
import { deleteImage, imageUri, persistImage, pickImage } from '@/lib/images';

const REST_STEP = 15;
const REST_MIN = 15;
const REST_MAX = 600;

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { data: settings, reload } = useFocusQuery(getSettings);
  if (!settings) return <TabScreen title="Configurações">{null}</TabScreen>;

  const changeRest = async (delta: number) => {
    const next = Math.min(REST_MAX, Math.max(REST_MIN, settings.restSeconds + delta));
    await setRestSeconds(db, next);
    reload();
  };

  const changeMap = async () => {
    const picked = await pickImage();
    if (!picked) return;
    const image = await persistImage(picked.uri);
    await setMapImage(db, { image, width: picked.width, height: picked.height });
    if (settings.mapImage) deleteImage(settings.mapImage);
    reload();
  };

  const removeMap = async () => {
    const confirmed = await confirm({
      title: 'Remover mapa?',
      message: 'As localizações dos exercícios deixarão de ser exibidas.',
      confirmLabel: 'Remover',
      destructive: true,
    });
    if (!confirmed) return;
    await setMapImage(db, null);
    if (settings.mapImage) deleteImage(settings.mapImage);
    reload();
  };

  return (
    <TabScreen title="Configurações">
      <Card>
        <ThemedText type="smallBold">Tempo de descanso</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Timer iniciado ao concluir cada série.
        </ThemedText>
        <View style={styles.stepper}>
          <IconButton
            icon="minus"
            label="Diminuir descanso"
            disabled={settings.restSeconds <= REST_MIN}
            onPress={() => changeRest(-REST_STEP)}
          />
          <ThemedText type="subtitle">{formatCountdown(settings.restSeconds)}</ThemedText>
          <IconButton
            icon="add"
            label="Aumentar descanso"
            disabled={settings.restSeconds >= REST_MAX}
            onPress={() => changeRest(REST_STEP)}
          />
        </View>
      </Card>

      <Card>
        <ThemedText type="smallBold">Mapa da academia</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Usado para marcar onde fica o aparelho de cada exercício. Ao trocar a imagem, as
          localizações já marcadas mantêm a mesma posição relativa.
        </ThemedText>
        {settings.mapImage && (
          <GymMap
            uri={imageUri(settings.mapImage)}
            aspectRatio={settings.mapWidth / settings.mapHeight}
          />
        )}
        <Button
          title={settings.mapImage ? 'Trocar imagem' : 'Carregar imagem'}
          icon="camera"
          variant="secondary"
          onPress={changeMap}
        />
        {settings.mapImage && <Button title="Remover mapa" variant="danger" onPress={removeMap} />}
      </Card>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
});
