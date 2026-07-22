import { fireEvent, render, screen } from '@testing-library/react-native';

import PersonDayEditor from '@/components/PersonDayEditor';

// mer, jeu, ven, sam, dim, lun, mar — samedi+dimanche consécutifs (indices 3-4)
const days = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07'];

function emptyCodes() {
  return days.map(() => '');
}

describe('PersonDayEditor', () => {
  it('fusionne samedi+dimanche consécutifs en une seule case, affiche les codes existants', async () => {
    const codes = ['E1', '', '', 'F1', 'F1', '', ''];
    await render(
      <PersonDayEditor
        days={days}
        codes={codes}
        codeOptions={[]}
        allCodes={[]}
        holidays={new Set()}
        onChangeCode={jest.fn()}
      />
    );

    // 3 jours normaux + 1 case week-end (avec les 2 quantièmes) + 2 jours normaux.
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('E1')).toBeTruthy();
    // Le code du week-end (basé sur le samedi, index 3) s'affiche une seule fois pour la case fusionnée.
    expect(screen.getAllByText('F1')).toHaveLength(1);
  });

  it("ne propose que les codes normaux quand la sélection est un jour de semaine", async () => {
    await render(
      <PersonDayEditor
        days={days}
        codes={emptyCodes()}
        codeOptions={['E1', 'F1']}
        allCodes={['E1', 'F1']}
        holidays={new Set()}
        onChangeCode={jest.fn()}
      />
    );

    // Rien de sélectionné : les deux codes habituels sont proposés en chips.
    expect(screen.getByText('E1')).toBeTruthy();
    expect(screen.getByText('F1')).toBeTruthy();

    await fireEvent.press(screen.getByText('1')); // mercredi, jour normal

    expect(screen.getByText('E1')).toBeTruthy();
    expect(screen.queryByText('F1')).toBeNull();
  });

  it('ne propose que les codes fériés (F1-F5) quand la sélection est le week-end', async () => {
    await render(
      <PersonDayEditor
        days={days}
        codes={emptyCodes()}
        codeOptions={['E1', 'F1']}
        allCodes={['E1', 'F1']}
        holidays={new Set()}
        onChangeCode={jest.fn()}
      />
    );

    await fireEvent.press(screen.getByText('4')); // case week-end

    expect(screen.queryByText('E1')).toBeNull();
    expect(screen.getByText('F1')).toBeTruthy();
  });

  it('applique le code choisi à tous les jours sélectionnés puis vide la sélection', async () => {
    const onChangeCode = jest.fn();
    await render(
      <PersonDayEditor
        days={days}
        codes={emptyCodes()}
        codeOptions={['E1']}
        allCodes={['E1']}
        holidays={new Set()}
        onChangeCode={onChangeCode}
      />
    );

    await fireEvent.press(screen.getByText('1'));
    await fireEvent.press(screen.getByText('E1'));

    expect(onChangeCode).toHaveBeenCalledWith(0, 'E1');
  });

  it('applique le code aux deux jours du week-end (samedi et dimanche)', async () => {
    const onChangeCode = jest.fn();
    await render(
      <PersonDayEditor
        days={days}
        codes={emptyCodes()}
        codeOptions={['F1']}
        allCodes={['F1']}
        holidays={new Set()}
        onChangeCode={onChangeCode}
      />
    );

    await fireEvent.press(screen.getByText('4'));
    await fireEvent.press(screen.getByText('F1'));

    expect(onChangeCode).toHaveBeenCalledWith(3, 'F1');
    expect(onChangeCode).toHaveBeenCalledWith(4, 'F1');
  });

  it('"✕ Vider" efface le code du jour sélectionné', async () => {
    const onChangeCode = jest.fn();
    await render(
      <PersonDayEditor
        days={days}
        codes={['E1', '', '', '', '', '', '']}
        codeOptions={[]}
        allCodes={[]}
        holidays={new Set()}
        onChangeCode={onChangeCode}
      />
    );

    await fireEvent.press(screen.getByText('1'));
    await fireEvent.press(screen.getByText('✕ Vider'));

    expect(onChangeCode).toHaveBeenCalledWith(0, '');
  });

  it('"Autre poste ▾" liste les codes non habituels et applique le choix', async () => {
    const onChangeCode = jest.fn();
    await render(
      <PersonDayEditor
        days={days}
        codes={emptyCodes()}
        codeOptions={['E1']}
        allCodes={['E1', 'C2']}
        holidays={new Set()}
        onChangeCode={onChangeCode}
      />
    );

    await fireEvent.press(screen.getByText('1'));
    await fireEvent.press(screen.getByText('Autre poste ▾'));
    await fireEvent.press(screen.getByText('C2'));

    expect(onChangeCode).toHaveBeenCalledWith(0, 'C2');
  });

  it('affiche la légende des jours fériés seulement si des jours fériés sont marqués', async () => {
    const { rerender } = await render(
      <PersonDayEditor
        days={days}
        codes={emptyCodes()}
        codeOptions={[]}
        allCodes={[]}
        holidays={new Set()}
        onChangeCode={jest.fn()}
      />
    );

    expect(screen.queryByText('🟧 Bordure orange = jour férié')).toBeNull();

    await rerender(
      <PersonDayEditor
        days={days}
        codes={emptyCodes()}
        codeOptions={[]}
        allCodes={[]}
        holidays={new Set(['2026-07-01'])}
        onChangeCode={jest.fn()}
      />
    );

    expect(screen.getByText('🟧 Bordure orange = jour férié')).toBeTruthy();
  });
});
