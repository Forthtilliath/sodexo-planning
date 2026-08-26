import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  message: string;
  actionLabel?: string;
  onAction: () => void;
};

/** Bandeau bas d'écran type snackbar, pour rattraper une suppression (swipe) sans confirmation préalable. */
export default function UndoToast({ message, actionLabel = 'Annuler', onAction }: Props) {
  return (
    <View style={styles.toast}>
      <Text style={styles.text} numberOfLines={1}>
        {message}
      </Text>
      <Pressable onPress={onAction} hitSlop={8}>
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1f1f1f',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  action: {
    color: '#7cc0ff',
    fontWeight: '700',
    fontSize: 14,
  },
});
