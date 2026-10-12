import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

import { notify } from '@/lib/dialog';

export { deleteImage, imageUri, persistImage } from '@/lib/image-store';

export type PickedImage = { uri: string; width: number; height: number };

async function launch(source: 'camera' | 'library'): Promise<PickedImage | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      notify('Câmera bloqueada', 'Permita o acesso à câmera nos ajustes do aparelho.');
      return null;
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.7 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const { uri, width, height } = result.assets[0];
  return { uri, width, height };
}

/** Asks for camera or gallery and resolves with the picked image, or null if cancelled. */
export function pickImage(): Promise<PickedImage | null> {
  // The browser's file picker already covers both sources.
  if (Platform.OS === 'web') return launch('library');

  return new Promise((resolve) => {
    const from = (source: 'camera' | 'library') => () =>
      launch(source).then(resolve, (error) => {
        console.warn('Image picker failed', error);
        resolve(null);
      });
    Alert.alert(
      'Escolher imagem',
      undefined,
      [
        { text: 'Câmera', onPress: from('camera') },
        { text: 'Galeria', onPress: from('library') },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}
