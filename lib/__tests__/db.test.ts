import AsyncStorage from '@react-native-async-storage/async-storage';

import { getScans, saveScan } from '@/lib/db';
import type { ScanRecord } from '@/types';

const scan: ScanRecord = {
  id: 'scan-1',
  year: 2026,
  month: 7,
  createdAt: 1,
  days: ['2026-07-01', '2026-07-02'],
  employees: ['Moi'],
  grid: [['D1', 'X']],
  holidays: ['2026-07-02'],
};

describe('saveScan / getScans', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('conserve les jours fériés après enregistrement', async () => {
    await saveScan(scan);
    const scans = await getScans();

    expect(scans).toHaveLength(1);
    expect(scans[0].holidays).toEqual(['2026-07-02']);
  });

  it('met à jour les jours fériés quand on ré-enregistre le même planning (id identique)', async () => {
    await saveScan(scan);
    await saveScan({ ...scan, holidays: ['2026-07-01', '2026-07-02'] });
    const scans = await getScans();

    expect(scans).toHaveLength(1);
    expect(scans[0].holidays).toEqual(['2026-07-01', '2026-07-02']);
  });
});
