import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import BottomSheet from '@/components/BottomSheet';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatFullDate } from '@/lib/dates';
import { computeDayRoster, formatScheduleHours, type DayPlanning } from '@/lib/teams';
import type { ScanRecord, TeamGroup } from '@/types';

type Props = {
  day: DayPlanning | null; // null = fermé
  scan: ScanRecord;
  groups: TeamGroup[];
  showHours: boolean;
  isHoliday: boolean;
  onClose: () => void;
};

/** Détail d'un jour touché dans le calendrier : code, horaire, et toute l'équipe présente ce jour-là, groupée par poste. */
export default function DayDetailSheet({ day, scan, groups, showHours, isHoliday, onClose }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const roster = useMemo(() => {
    if (!day) return [];
    const dayIndex = scan.days.indexOf(day.date);
    return computeDayRoster(scan, dayIndex, groups);
  }, [day, scan, groups]);

  return (
    <BottomSheet visible={day !== null} onClose={onClose}>
      {day && (
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.dateTitle}>{formatFullDate(day.date)}</Text>
            {isHoliday && <Text style={styles.holidayTag}>Férié</Text>}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Code : {day.code || '—'}</Text>
            {showHours && day.schedule && (
              <Text style={styles.infoText}>Horaire : {formatScheduleHours(day.schedule)}</Text>
            )}
          </View>

          {roster.map(({ group, members }) => (
            <View key={group?.id ?? 'autres'} style={styles.groupSection}>
              <Text style={styles.groupLabel}>{group?.label ?? 'Autres'}</Text>
              {members.map((member) => (
                <View key={`${member.code}-${member.name}`} style={styles.memberRow}>
                  <View style={[styles.codeBadge, { backgroundColor: group?.color ?? colors.border }]}>
                    <Text style={styles.codeBadgeText}>{member.code}</Text>
                  </View>
                  <Text style={styles.memberName}>{member.name}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </BottomSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    dateTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: colors.text,
    },
    holidayTag: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.holiday,
      borderWidth: 1,
      borderColor: colors.holiday,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    infoBox: {
      marginBottom: 20,
      gap: 4,
    },
    infoText: {
      fontSize: 14,
      opacity: 0.85,
      color: colors.text,
    },
    groupSection: {
      marginBottom: 20,
    },
    groupLabel: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      opacity: 0.6,
      marginBottom: 10,
      color: colors.text,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    codeBadge: {
      minWidth: 42,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      alignItems: 'center',
    },
    codeBadgeText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
    memberName: {
      fontSize: 15,
      flexShrink: 1,
      color: colors.text,
    },
  });
}
