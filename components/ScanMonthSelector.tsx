import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { monthYearLabel } from '@/lib/dates';
import type { ScanRecord } from '@/types';

type Anchor = { x: number; y: number; width: number; height: number };

// Hauteur de ligne fixe pour que la hauteur du menu soit calculable (MENU_ROWS * ROW_HEIGHT).
const ROW_HEIGHT = 44;
const MENU_ROWS = 4;

type Props = {
  /** Plannings triés chronologiquement (du plus ancien au plus récent). */
  scans: ScanRecord[];
  selectedScanId: string | null;
  onSelect: (id: string) => void;
};

/** Sélecteur de mois façon dropdown : flèches ‹ › et un bouton central qui ouvre un menu ancré listant tous les plannings, positionné sur le mois sélectionné. */
export default function ScanMonthSelector({ scans, selectedScanId, onSelect }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  // true une fois le scroll initial positionné (remis à false à chaque ouverture).
  const scrolledRef = useRef(false);

  const selectedScan = scans.find((s) => s.id === selectedScanId) ?? null;
  const selectedIndex = scans.findIndex((s) => s.id === selectedScanId);
  const prevScan = selectedIndex >= 0 ? (scans[selectedIndex - 1] ?? null) : null;
  const nextScan = selectedIndex >= 0 ? (scans[selectedIndex + 1] ?? null) : null;

  function openMenu() {
    scrolledRef.current = false;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  }

  function select(id: string) {
    onSelect(id);
    setOpen(false);
  }

  // Positionne le scroll au layout de la ligne sélectionnée : un rAF après
  // l'ouverture peut se déclencher avant que la ligne soit mesurée.
  function handleRowLayout(scanId: string, y: number) {
    if (scrolledRef.current || scanId !== selectedScanId) return;
    scrolledRef.current = true;
    scrollRef.current?.scrollTo({ y, animated: false });
  }

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.navButton, !prevScan && styles.navButtonDisabled]}
        disabled={!prevScan}
        onPress={() => prevScan && onSelect(prevScan.id)}
        accessibilityRole="button"
        accessibilityLabel="Mois précédent">
        <Text style={styles.navButtonText}>‹</Text>
      </Pressable>

      <Pressable
        ref={triggerRef}
        style={styles.trigger}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel="Choisir un planning">
        <Text style={styles.triggerText} numberOfLines={1}>
          {selectedScan ? monthYearLabel(selectedScan.year, selectedScan.month) : 'Choisir un planning'}
        </Text>
        <Text style={styles.caret}>{open ? '▴' : '▾'}</Text>
      </Pressable>

      <Pressable
        style={[styles.navButton, !nextScan && styles.navButtonDisabled]}
        disabled={!nextScan}
        onPress={() => nextScan && onSelect(nextScan.id)}
        accessibilityRole="button"
        accessibilityLabel="Mois suivant">
        <Text style={styles.navButtonText}>›</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
        {anchor && (
          <View
            style={[
              styles.menu,
              { top: anchor.y + anchor.height + 4, left: anchor.x, width: anchor.width, maxHeight: ROW_HEIGHT * MENU_ROWS },
            ]}>
            <ScrollView ref={scrollRef} bounces={false}>
              {scans.map((scan, index) => {
                const active = scan.id === selectedScanId;
                return (
                  <Pressable
                    key={scan.id}
                    onLayout={(e) => handleRowLayout(scan.id, e.nativeEvent.layout.y)}
                    style={[styles.menuRow, index > 0 && styles.menuRowDivider]}
                    onPress={() => select(scan.id)}>
                    <Text style={[styles.menuRowText, active && styles.menuRowTextActive]}>
                      {monthYearLabel(scan.year, scan.month)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    trigger: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    triggerText: {
      flexShrink: 1,
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    caret: {
      marginLeft: 8,
      color: colors.text,
      opacity: 0.6,
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonDisabled: {
      opacity: 0.35,
    },
    navButtonText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 20,
      includeFontPadding: false,
      textAlign: 'center',
      textAlignVertical: 'center',
      marginTop: -2,
    },
    menu: {
      position: 'absolute',
      backgroundColor: colors.modalCard,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    menuRow: {
      height: ROW_HEIGHT,
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    menuRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.divider,
    },
    menuRowText: {
      color: colors.text,
    },
    menuRowTextActive: {
      color: colors.tint,
      fontWeight: '700',
    },
  });
}
