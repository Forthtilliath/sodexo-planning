import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import ThemePreferenceProvider from '@/components/ThemePreferenceProvider';
import UpdateBanner from '@/components/UpdateBanner';
import { useResolvedScheme } from '@/hooks/useThemeColors';

// Catch any errors thrown by the Layout component, avec un écran de secours
// lisible (voir components/ErrorFallback.tsx) plutôt que l'écran noir de debug par défaut.
export { default as ErrorBoundary } from '@/components/ErrorFallback';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootLayoutNav />
    </ThemePreferenceProvider>
  );
}

function RootLayoutNav() {
  const scheme = useResolvedScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
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

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <UpdateBanner />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
