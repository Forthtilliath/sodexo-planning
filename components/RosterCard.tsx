import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import ColorDot from '@/components/ColorDot';
import DragHandle from '@/components/DragHandle';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { isRegular, MY_NAME, normalizeName } from '@/lib/teams';
import type { RosterEntry } from '@/types';

type Props = {
  entry: RosterEntry;
  index: number;
  categoryColor?: string;
  codesCount: number;
  dragHandle?: () => void;
  isDragging?: boolean;
  onPress: () => void;
};

/** Une ligne de la liste des salariés : nom, résumé (intérimaire/codes) et accès au détail. */
export default function RosterCard({ entry, index, categoryColor, codesCount, dragHandle, isDragging, onPress }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const summaryParts = [!isRegular(entry) ? 'Intérimaire' : null, codesCount > 0 ? `${codesCount} code(s)` : null]
    .filter(Boolean)
    .join(' · ');
  const isMe = normalizeName(entry.name) === normalizeName(MY_NAME);

  return (
    <View style={[styles.card, isDragging && styles.cardDragging]}>
      {dragHandle && (
        <DragHandle
          onPressIn={dragHandle}
          accessibilityLabel={`Réordonner ${entry.name || `Salarié ${index + 1}`}`}
        />
      )}
      <Pressable style={styles.body} onPress={onPress}>
        <ColorDot color={categoryColor} />
        <View style={styles.nameColumn}>
          <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
            {entry.name || `Salarié ${index + 1}`}
          </Text>
          {summaryParts.length > 0 && (
            <Text style={styles.summary} numberOfLines={1}>
              {summaryParts}
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.card,
    },
    cardDragging: {
      borderColor: colors.tint,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    body: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    nameColumn: {
      flex: 1,
    },
    name: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    nameMe: {
      color: colors.tint,
    },
    summary: {
      fontSize: 12,
      opacity: 0.6,
      marginTop: 2,
      color: colors.text,
    },
    chevron: {
      fontSize: 20,
      opacity: 0.4,
      color: colors.text,
    },
  });
}
