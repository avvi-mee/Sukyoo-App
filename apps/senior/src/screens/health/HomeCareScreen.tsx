import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { HomeCarePricingType } from '@sukyoo/core';
import { useRequestHomeHealthcare } from '@sukyoo/core';
import { BigButton } from '../../components/BigButton';
import { Icon, type IconName } from '../../components/Icon';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, fontSize, radii, spacing } from '../../theme/tokens';
import { useFontScale } from '../../theme/FontScaleContext';

// ponytail: hardcoded catalog. These four services and their prices are the
// same for every senior today, so a table would be four rows and a join. Move
// to `service_listings` (or a home_care_services table) the moment prices vary
// by city or provider — which is the first thing a real partner will want.
const SERVICES: {
  name: string;
  title: string;
  icon: IconName;
  pricingType: HomeCarePricingType;
  priceLabel: string;
  subtitle: string;
}[] = [
  { name: 'nursing_care', title: 'Nursing care', icon: 'syringe', pricingType: 'per_visit', priceLabel: 'Starts ₹499/visit', subtitle: 'Post-surgery, wound care, injections' },
  { name: 'physiotherapy', title: 'Physiotherapy', icon: 'physio', pricingType: 'per_session', priceLabel: 'Starts ₹599/session', subtitle: 'At-home sessions with certified therapists' },
  { name: 'caregiver', title: 'Caregiver / attendant', icon: 'homeCare', pricingType: 'hourly', priceLabel: 'Starts ₹350/hr', subtitle: 'Hourly, daily or live-in support' },
  { name: 'palliative_care', title: 'Palliative & rehab care', icon: 'palliative', pricingType: 'custom', priceLabel: 'Custom plan', subtitle: 'Long-term supportive care at home' },
];

export function HomeCareScreen() {
  const { scale } = useFontScale();
  const seniorId = useCurrentUserId();
  const requestCare = useRequestHomeHealthcare();

  function handleBook(service: (typeof SERVICES)[number]) {
    if (!seniorId) return;
    requestCare.mutate(
      { seniorId, serviceName: service.name, pricingType: service.pricingType },
      {
        onSuccess: () => notify('Requested', `We'll call you to confirm ${service.title.toLowerCase()}.`),
        onError: (e) => notify('Could not request', e instanceof Error ? e.message : 'Try again.'),
      }
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="Home care" subtitle="Bringing care to your doorstep" />

      {SERVICES.map((s) => (
        <View key={s.name} style={styles.card}>
          <View style={styles.head}>
            <View style={styles.iconWrap}>
              <Icon name={s.icon} size={22 * scale} color={colors.green} />
            </View>
            <View style={styles.text}>
              <Text style={[styles.title, { fontSize: fontSize.body * scale }]}>{s.title}</Text>
              <Text style={[styles.subtitle, { fontSize: fontSize.label * scale }]}>{s.subtitle}</Text>
            </View>
          </View>
          <View style={styles.footer}>
            <Text style={[styles.price, { fontSize: fontSize.label * scale }]}>{s.priceLabel}</Text>
            <BigButton label="Book now" onPress={() => handleBook(s)} style={styles.book} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.card,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontWeight: '800' },
  subtitle: { color: colors.inkMuted },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  price: { color: colors.coral, fontWeight: '800' },
  book: { paddingHorizontal: spacing.lg, minHeight: 48 },
});
