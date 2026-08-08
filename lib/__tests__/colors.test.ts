import { hexToSoftBackground } from '@/lib/colors';

describe('hexToSoftBackground', () => {
  it('convertit un hex en rgba, plus opaque en sombre qu\'en clair', () => {
    expect(hexToSoftBackground('#1e88e5', false)).toBe('rgba(30, 136, 229, 0.22)');
    expect(hexToSoftBackground('#1e88e5', true)).toBe('rgba(30, 136, 229, 0.45)');
  });
});
