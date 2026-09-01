import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import SwipeableRow from '@/components/SwipeableRow';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { MONTH_NAMES } from '@/lib/dates';
import type { ScanRecord } from '@/types';

type Props = {
  scans: ScanRecord[];
  onOpen: (scan: ScanRecord) => void;
  onDelete: (scan: ScanRecord) => void;
};

type ScanCategory = 'current' | 'future' | 'past';

function categorizeScan(scan: ScanRecord): ScanCategory {
  const now = new Date();
  const currentKey = now.getFullYear() * 12 + (now.getMonth() + 1);
  const scanKey = scan.year * 12 + scan.month;
  if (scanKey === currentKey) return 'current';
  return scanKey > currentKey ? 'future' : 'past';
}

/** Liste "Reprendre un planning" : mois en cours en tête, puis à venir, puis passés (masquables) du plus récent au plus ancien. */
export default function SavedScansList({ scans, onOpen, onDelete }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showPastMonths, setShowPastMonths] = useState(false);

  const sortedScans = useMemo(() => {
    const rank = { current: 0, future: 1, past: 2 } as const;
    return scans
      .map((scan) => ({ scan, category: categorizeScan(scan), key: scan.year * 12 + scan.month }))
      .sort((a, b) => {
        if (a.category !== b.category) return rank[a.category] - rank[b.category];
        return a.category === 'past' ? b.key - a.key : a.key - b.key;
      });
  }, [scans]);
  const pastScanCount = useMemo(() => sortedScans.filter((s) => s.category === 'past').length, [sortedScans]);
  const visibleSortedScans = useMemo(
    () => sortedScans.filter((s) => showPastMonths || s.category !== 'past'),
    [sortedScans, showPastMonths]
  );

  if (scans.length === 0) return null;

  return (
    <>
      <View style={styles.separator} />
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Reprendre un planning</Text>
        {pastScanCount > 0 && (
          <View style={styles.pastToggle}>
            <Text style={styles.pastToggleLabel}>Mois passés</Text>
            <Switch value={showPastMonths} onValueChange={setShowPastMonths} />
          </View>
        )}
      </View>
      {visibleSortedScans.map(({ scan, category }) => (
        <SwipeableRow key={scan.id} onDelete={() => onDelete(scan)}>
          <Pressable style={styles.row} onPress={() => onOpen(scan)}>
            <View>
              <Text style={[styles.rowTitle, category === 'past' && styles.rowTitlePast]}>
                {MONTH_NAMES[scan.month - 1]} {scan.year}
              </Text>
              <Text style={[styles.rowHint, category === 'past' && styles.rowHintPast]}>
                {scan.employees.length} salarié(s)
              </Text>
            </View>
            <Text style={[styles.rowAction, category === 'past' && styles.rowActionPast]}>Modifier →</Text>
          </Pressable>
        </SwipeableRow>
      ))}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    separator: {
      height: 1,
      marginVertical: 20,
      backgroundColor: colors.borderSubtle,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    pastToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pastToggleLabel: {
      fontSize: 12,
      opacity: 0.7,
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      // Opaque : une bordure translucide laisserait voir le rouge de SwipeableRow.
      borderColor: colors.divider,
      borderRadius: 8,
      padding: 12,
      // Opaque : masque le bouton "Supprimer" de SwipeableRow tant qu'on ne swipe pas.
      backgroundColor: colors.card,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowTitlePast: {
      fontWeight: '400',
      opacity: 0.55,
    },
    rowHint: {
      fontSize: 12,
      opacity: 0.7,
      marginTop: 2,
      color: colors.text,
    },
    rowHintPast: {
      opacity: 0.45,
    },
    rowAction: {
      color: colors.tint,
      fontWeight: '600',
    },
    rowActionPast: {
      opacity: 0.55,
    },
  });
}
