import { Alert, Platform } from 'react-native';

// `Alert` does nothing on web, so the browser's own dialogs are used there.
const isWeb = Platform.OS === 'web';

const joinText = (title: string, message?: string) => (message ? `${title}\n\n${message}` : title);

export function notify(title: string, message?: string) {
  if (isWeb) window.alert(joinText(title, message));
  else Alert.alert(title, message);
}

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
};

export function confirm({ title, message, confirmLabel, destructive }: ConfirmOptions) {
  if (isWeb) return Promise.resolve(window.confirm(joinText(title, message)));
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
