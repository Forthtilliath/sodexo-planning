import { fireEvent, render, screen } from '@testing-library/react-native';

import { ThemePreferenceContext } from '@/hooks/useThemeColors';
import ThemeScreen from '@/app/(tabs)/settings/theme';

describe('ThemeScreen', () => {
  it('affiche les trois options avec la préférence système cochée par défaut', async () => {
    const setPreference = jest.fn();
    await render(
      <ThemePreferenceContext.Provider value={{ preference: 'system', setPreference }}>
        <ThemeScreen />
      </ThemePreferenceContext.Provider>
    );

    expect(screen.getByText('Clair')).toBeTruthy();
    expect(screen.getByText('Sombre')).toBeTruthy();
    expect(screen.getByText('Système')).toBeTruthy();
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('appelle setPreference au choix du thème sombre', async () => {
    const setPreference = jest.fn();
    await render(
      <ThemePreferenceContext.Provider value={{ preference: 'system', setPreference }}>
        <ThemeScreen />
      </ThemePreferenceContext.Provider>
    );

    await fireEvent.press(screen.getByText('Sombre'));

    expect(setPreference).toHaveBeenCalledWith('dark');
  });
});
