import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import PreparationList from '@/components/PreparationList';
import QuantityStepper from '@/components/QuantityStepper';
import type { ThemeColors } from '@/constants/Colors';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { MenuQuantities } from '@/lib/collations';
import {
  computeProducts,
  countMenus,
  describeMenu,
  formatPreparationList,
  MENU_GROUPS,
  MENUS,
} from '@/lib/collations';

/** Collations ambu et petits-déjeuners : nombre de menus demandés → produits à préparer. */
export default function CollationsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [quantities, setQuantities] = useState<MenuQuantities>({});

  const lines = useMemo(() => computeProducts(quantities), [quantities]);
  const total = countMenus(quantities);

  function setQuantity(menuId: string, value: number) {
    setQuantities((prev) => ({ ...prev, [menuId]: value }));
  }

  async function handleShare() {
    try {
      await Share.share({ message: formatPreparationList(quantities) });
    } catch (err) {
      console.error('share preparation list failed', err);
      Alert.alert('Échec du partage', err instanceof Error ? err.message : "Une erreur inconnue s'est produite.");
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.hint}>Indique le nombre demandé pour chaque menu.</Text>

      {MENU_GROUPS.map((group) => (
        <View key={group.id} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          {group.note && <Text style={styles.hint}>{group.note}</Text>}
          {MENUS.filter((menu) => menu.group === group.id).map((menu) => (
            <View key={menu.id} style={styles.menuRow}>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{menu.label}</Text>
                <Text style={styles.menuItems}>{describeMenu(menu)}</Text>
              </View>
              <QuantityStepper
                label={menu.label}
                value={quantities[menu.id] ?? 0}
                onChange={(value) => setQuantity(menu.id, value)}
              />
            </View>
          ))}
        </View>
      ))}

      <Text style={styles.sectionTitle}>
        À préparer{total > 0 ? ` (${total} menu${total > 1 ? 's' : ''})` : ''}
      </Text>
      {total === 0 ? (
        <Text style={styles.hint}>La liste des produits s&apos;affiche dès qu&apos;un menu est demandé.</Text>
      ) : (
        <>
          <PreparationList lines={lines} ambuCount={countMenus(quantities, 'ambu')} />
          <View style={styles.actions}>
            <Pressable style={styles.secondaryButton} onPress={() => setQuantities({})}>
              <Text style={styles.secondaryButtonText}>Tout remettre à zéro</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleShare}>
              <Text style={styles.primaryButtonText}>Partager la liste</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 64,
    },
    hint: {
      fontSize: 12,
      opacity: 0.7,
      marginBottom: 8,
      color: colors.text,
    },
    group: {
      marginTop: 16,
    },
    groupTitle: {
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      opacity: 0.8,
      marginBottom: 4,
      color: colors.text,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderSubtle,
    },
    menuText: {
      flex: 1,
    },
    menuLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    menuItems: {
      fontSize: 12,
      opacity: 0.65,
      marginTop: 2,
      color: colors.text,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      marginTop: 24,
      marginBottom: 8,
      color: colors.text,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    primaryButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.tint,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: colors.onTint,
      fontWeight: '700',
    },
    secondaryButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: '600',
    },
  });
}
