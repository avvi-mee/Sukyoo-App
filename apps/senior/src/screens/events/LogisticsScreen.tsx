import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRequestAccessibleTransport } from '@sukyoo/core';
import { Icon } from '../../components/Icon';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

const SUPPORT_LINE = 'tel:+911800000000';

export function LogisticsScreen() {
  const { scale } = useFontScale();
  const userId = useCurrentUserId();
  const requestTransport = useRequestAccessibleTransport();

  function handleBookTransport() {
    if (!userId) return;
    // ponytail: pickup defaults to the profile address, which we don't collect
    // yet — a human confirms it on the callback. Add an address picker when
    // profiles carry one.
    requestTransport.mutate(
      { userId, pickupText: 'Home pickup' },
      {
        onSuccess: () => notify('Requested', "We'll call to confirm your accessible pickup."),
        onError: (e) => notify('Could not request', e instanceof Error ? e.message : 'Try again.'),
      }
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Logistics support" subtitle="Getting there, made easy" />

      <ListRow
        icon="accessible"
        title="Accessible transport"
        subtitle="Wheelchair-ready pickup for events"
        tint={colors.amberTint}
        actionLabel="Book"
        onPressAction={handleBookTransport}
      />
      <ListRow
        icon="profile"
        title="On-ground coordinator"
        subtitle="A Sukyoo host meets you at every event"
        tint={colors.greenTint}
        actionLabel="Call"
        onPressAction={() => Linking.openURL(SUPPORT_LINE)}
      />

      <View style={styles.discountCard}>
        <View style={styles.discountTitleRow}>
          <Icon name="verified" size={22 * scale} color="#fff" />
          <Text style={[styles.discountTitle, { fontSize: fontSize.body * scale }]}>Group booking discounts</Text>
        </View>
        <Text style={[styles.discountSubtitle, { fontSize: fontSize.label * scale }]}>
          Travelling with friends? Call us before you book and we'll apply a group rate.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl * 2 },
  discountCard: { backgroundColor: colors.ink, borderRadius: radii.card, padding: spacing.md, gap: 4, marginTop: spacing.xs },
  discountTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  discountTitle: { color: '#fff', fontWeight: '800' },
  discountSubtitle: { color: '#D9D2C8' },
});
