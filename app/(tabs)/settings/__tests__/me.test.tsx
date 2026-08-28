import { fireEvent, render, screen } from '@testing-library/react-native';

import MyNameScreen from '@/app/(tabs)/settings/me';
import { MyNameContext } from '@/hooks/useMyName';

function renderWith(myName: string, setMyName = jest.fn().mockResolvedValue(undefined)) {
  return render(
    <MyNameContext.Provider value={{ myName, setMyName }}>
      <MyNameScreen />
    </MyNameContext.Provider>
  );
}

describe('MyNameScreen', () => {
  it('préremplit le champ avec le nom courant', async () => {
    await renderWith('Julien');
    expect(screen.getByDisplayValue('Julien')).toBeTruthy();
  });

  it('appelle setMyName avec le nouveau nom à l\'enregistrement', async () => {
    const setMyName = jest.fn().mockResolvedValue(undefined);
    await renderWith('Moi', setMyName);

    await fireEvent.changeText(screen.getByDisplayValue('Moi'), 'Julien');
    await fireEvent.press(screen.getByText('Enregistrer'));

    expect(setMyName).toHaveBeenCalledWith('Julien');
  });

  it('n\'enregistre pas un nom inchangé', async () => {
    const setMyName = jest.fn().mockResolvedValue(undefined);
    await renderWith('Moi', setMyName);

    await fireEvent.press(screen.getByText('Enregistrer'));

    expect(setMyName).not.toHaveBeenCalled();
  });
});
