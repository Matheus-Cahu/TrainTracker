import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';

type TabScreenProps = {
  title: string;
  /** Rendered at the right of the title. */
  action?: ReactNode;
  children: ReactNode;
};

/** Scrollable layout shared by the tab screens, which have no native header. */
export function TabScreen({ title, action, children }: TabScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.content, styles.tabContent]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{title}</ThemedText>
            {action}
          </View>
          {children}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

type FormScreenProps = {
  children: ReactNode;
  /** Pinned below the scrollable content. */
  footer?: ReactNode;
};

/** Scrollable layout for the screens pushed on the stack, which have a native header. */
export function FormScreen({ children, footer }: FormScreenProps) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          {children}
        </ScrollView>
        {footer && <View style={styles.footer}>{footer}</View>}
      </SafeAreaView>
    </ThemedView>
  );
}

export function EmptyState({ children }: { children: string }) {
  return (
    <ThemedText themeColor="textSecondary" style={styles.empty}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  tabContent: {
    paddingTop: TopTabInset + Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  footer: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
  },
});
