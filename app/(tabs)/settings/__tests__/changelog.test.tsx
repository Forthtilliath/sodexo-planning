import { render, screen } from '@testing-library/react-native';

import ChangelogScreen from '@/app/(tabs)/settings/changelog';
import { CHANGELOG } from '@/lib/changelog';

describe('ChangelogScreen', () => {
  it('affiche chaque version avec sa date et ses changements', async () => {
    await render(<ChangelogScreen />);

    for (const entry of CHANGELOG) {
      expect(screen.getByText(`Version ${entry.version}`)).toBeTruthy();
      expect(screen.getAllByText(entry.date).length).toBeGreaterThan(0);
      for (const change of entry.changes) {
        expect(screen.getByText(`•  ${change}`)).toBeTruthy();
      }
    }
  });
});
