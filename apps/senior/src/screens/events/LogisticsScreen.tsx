import { Alert, Linking, ScrollView, StyleSheet } from 'react-native';
import { useRequestAccessibleTransport } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';

export function LogisticsScreen() {
  const userId = useCurrentUserId();
  const requestTransport = useRequestAccessibleTransport();

  function handleBookTransport() {
    if (!userId) return;
    requestTransport.mutate(
      { userId, pickupText: 'Home pickup' },
      { onSuccess: () => Alert.alert('Requested', "We'll confirm your accessible pickup shortly.") }
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Logistics support" />
      <ListRow icon="♿" title="Accessible transport" subtitle="Wheelchair-ready pickup" actionLabel="Book" onPressAction={handleBookTransport} />
      <ListRow icon="🧑‍💼" title="On-ground coordinator" subtitle="A Sukyoo host meets you at every event" actionLabel="Call" onPressAction={() => Linking.openURL('tel:+911800000000')} />
      <ListRow icon="👥" title="Group booking discounts" subtitle="Bring 3+ friends, save 10%" tint={colors.ink} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs },
});
