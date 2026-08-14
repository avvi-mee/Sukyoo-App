import { Alert, ScrollView, StyleSheet } from 'react-native';
import type { HomeCarePricingType } from '@sukyoo/core';
import { useRequestHomeHealthcare } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';

const SERVICES: { name: string; icon: string; pricingType: HomeCarePricingType; priceLabel: string; subtitle: string }[] = [
  { name: 'nursing_care', icon: '💉', pricingType: 'per_visit', priceLabel: '₹499/visit', subtitle: 'Post-surgery, wound care, injections' },
  { name: 'physiotherapy', icon: '🦵', pricingType: 'per_session', priceLabel: '₹599/session', subtitle: 'Mobility & recovery sessions' },
  { name: 'caregiver', icon: '🧑‍🍼', pricingType: 'hourly', priceLabel: '₹350/hr', subtitle: 'Hourly, daily or live-in attendant' },
  { name: 'palliative_care', icon: '🕊️', pricingType: 'custom', priceLabel: 'Custom plan', subtitle: 'Palliative & rehab care' },
];

export function HomeCareScreen() {
  const seniorId = useCurrentUserId();
  const requestCare = useRequestHomeHealthcare();

  function handleBook(service: (typeof SERVICES)[number]) {
    if (!seniorId) return;
    requestCare.mutate(
      { seniorId, serviceName: service.name, pricingType: service.pricingType },
      { onSuccess: () => Alert.alert('Requested', "We'll confirm your booking shortly.") }
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Home healthcare" />
      {SERVICES.map((s) => (
        <ListRow
          key={s.name}
          icon={s.icon}
          title={s.name.replace(/_/g, ' ')}
          subtitle={`${s.priceLabel} · ${s.subtitle}`}
          tint={colors.coralTint}
          actionLabel="Book now"
          onPressAction={() => handleBook(s)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs },
});
