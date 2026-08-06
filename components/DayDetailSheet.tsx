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
            <Text style={styles.dateTitle} numberOfLines={1}>
              {formatFullDate(day.date)}
            </Text>
            <View style={[styles.codeBadge, styles.myCodeBadge, { backgroundColor: day.group?.color ?? colors.border }]}>
              <Text style={[styles.codeBadgeText, styles.myCodeBadgeText]}>{day.code || '—'}</Text>
            </View>
          </View>

          {(isHoliday || (showHours && day.schedule)) && (
            <View style={styles.subHeaderRow}>
              {isHoliday && <Text style={styles.holidayTag}>Férié</Text>}
              {showHours && day.schedule && <Text style={styles.scheduleText}>{formatScheduleHours(day.schedule)}</Text>}
            </View>
          )}

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
      paddingBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 8,
    },
    dateTitle: {
      flexShrink: 1,
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    subHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
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
    myCodeBadge: {
      minWidth: 56,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
    },
    myCodeBadgeText: {
      fontSize: 16,
    },
    scheduleText: {
      fontSize: 14,
      opacity: 0.75,
      color: colors.text,
    },
    groupSection: {
      marginBottom: 14,
    },
    groupLabel: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      opacity: 0.6,
      marginBottom: 7,
      color: colors.text,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 7,
    },
    codeBadge: {
      minWidth: 40,
      paddingHorizontal: 7,
      paddingVertical: 4,
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
