import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import MyNameProvider from '@/components/MyNameProvider';
import ThemePreferenceProvider from '@/components/ThemePreferenceProvider';
import UpdateBanner from '@/components/UpdateBanner';
import { useHeaderOptions } from '@/hooks/useHeaderOptions';
import { useResolvedScheme, useThemeColors } from '@/hooks/useThemeColors';

// Écran de secours lisible en cas d'erreur, plutôt que l'écran noir de debug.
export { default as ErrorBoundary } from '@/components/ErrorFallback';

// Le splash reste affiché tant que les polices ne sont pas chargées.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemePreferenceProvider>
        <MyNameProvider>
          <RootLayoutNav />
        </MyNameProvider>
      </ThemePreferenceProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const scheme = useResolvedScheme();
  const colors = useThemeColors();
  const headerOptions = useHeaderOptions();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.tint,
      card: colors.headerBackground,
      background: colors.background,
      text: colors.text,
      border: colors.borderSubtle,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <View style={{ flex: 1 }}>
        {/* Icônes claires : l'en-tête bleu Sodexo passe sous la barre d'état. */}
        <StatusBar style="light" />
        <UpdateBanner />
        <Stack screenOptions={headerOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
