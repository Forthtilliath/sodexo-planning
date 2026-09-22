import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/Colors';
import { useResolvedScheme, useThemeColors } from '@/hooks/useThemeColors';
import { hexToSoftBackground } from '@/lib/colors';
import { findGroupForCode } from '@/lib/teams';
import type { TeamGroup } from '@/types';

type Props = {
  quickCodes: string[]; // codes proposés en chips
  groups: TeamGroup[]; // pour colorer chaque chip selon son poste
  hasOtherCodes: boolean; // affiche "Autre poste ▾"
  disabled: boolean; // rien de sélectionné
  onApplyCode: (code: string) => void;
  onOpenOtherCodes: () => void;
  onClearSelection: () => void;
};

/** Barre d'actions de l'éditeur par personne : codes habituels en chips colorées par poste, "Vider", "Autre poste", "Annuler". */
export default function QuickCodeBar({
  quickCodes,
  groups,
  hasOtherCodes,
  disabled,
  onApplyCode,
  onOpenOtherCodes,
  onClearSelection,
}: Props) {
  const colors = useThemeColors();
  const isDark = useResolvedScheme() === 'dark';
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    // Toujours montée (juste grisée si rien de sélectionné) pour ne pas
    // décaler le calendrier à chaque sélection.
    <View style={[styles.bulkBar, disabled && styles.bulkBarDisabled]}>
      {quickCodes.length > 0 && (
        <View style={styles.chipsRow}>
          {quickCodes.map((code) => {
            // Même rendu que la case du jour une fois le code appliqué ; sans
            // couleur de poste, on garde la chip pleine couleur d'accent.
            const color = findGroupForCode(code, groups)?.color;
            return (
              <Pressable
                key={code}
                style={[
                  styles.chip,
                  color && { backgroundColor: hexToSoftBackground(color, isDark), borderColor: color },
                ]}
                disabled={disabled}
                onPress={() => onApplyCode(code)}>
                <Text style={[styles.chipText, color && styles.chipTextColored]}>{code}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={styles.bulkRow}>
        <Pressable style={styles.emptyCodeButton} disabled={disabled} onPress={() => onApplyCode('')}>
          <Text style={styles.emptyCodeButtonText}>✕ Vider</Text>
        </Pressable>
        {hasOtherCodes && (
          <Pressable style={styles.otherCodeButton} disabled={disabled} onPress={onOpenOtherCodes}>
            <Text style={styles.otherCodeButtonText}>Autre poste ▾</Text>
          </Pressable>
        )}
        <Pressable style={styles.bulkClearButton} disabled={disabled} onPress={onClearSelection}>
          <Text style={styles.bulkClearText}>Annuler</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bulkBar: {
      marginTop: 4,
      padding: 10,
      borderRadius: 8,
      backgroundColor: colors.tintSoft,
    },
    bulkBarDisabled: {
      opacity: 0.4,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    chip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.tint,
      backgroundColor: colors.tint,
    },
    chipText: {
      color: colors.onTint,
      fontWeight: '700',
      fontSize: 13,
    },
    chipTextColored: {
      color: colors.text,
    },
    bulkRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    emptyCodeButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.card,
    },
    emptyCodeButtonText: {
      color: colors.danger,
      fontWeight: '700',
      fontSize: 13,
    },
    otherCodeButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.tint,
      backgroundColor: colors.card,
    },
    otherCodeButtonText: {
      color: colors.tint,
      fontWeight: '700',
      fontSize: 13,
    },
    bulkClearButton: {
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    bulkClearText: {
      color: colors.danger,
    },
  });
}
