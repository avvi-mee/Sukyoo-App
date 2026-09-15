import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUpcomingBooking } from '@sukyoo/core';
import { HeroBanner } from '../../components/HeroBanner';
import type { IconName } from '../../components/Icon';
import { ModuleGridTile } from '../../components/ModuleGridTile';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { colors, spacing } from '../../theme/tokens';
import type { HealthStackParamList } from '../../navigation/types';

const MODULES: { key: keyof HealthStackParamList; icon: IconName; title: string; subtitle: string; tint: string }[] = [
  { key: 'MedicalCare', icon: 'stethoscope', title: 'Medical care', subtitle: 'Consult a doctor', tint: colors.coralTint },
  { key: 'Diagnostics', icon: 'vitals', title: 'Diagnostics', subtitle: 'Tests & vitals', tint: colors.greenTint },
  { key: 'Medication', icon: 'medication', title: 'Medication', subtitle: 'Orders & reminders', tint: colors.coralTint },
  { key: 'Emergency', icon: 'emergency', title: 'Emergency', subtitle: 'SOS & ambulance', tint: colors.redTint },
  { key: 'HomeCare', icon: 'homeCare', title: 'Home care', subtitle: 'Nursing & attendants', tint: colors.coralTint },
  { key: 'Wellness', icon: 'wellness', title: 'Wellness', subtitle: 'Yoga, diet & counselling', tint: colors.greenTint },
  { key: 'Insurance', icon: 'insurance', title: 'Insurance', subtitle: 'Claims & records', tint: colors.coralTint },
];

export function HealthLandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HealthStackParamList>>();
  const userId = useCurrentUserId();
  const { data: upcoming } = useUpcomingBooking(userId);

  const startAt = upcoming?.slot?.start_at ? new Date(upcoming.slot.start_at) : null;
  const doctorName = upcoming?.slot?.doctor?.profile?.full_name;
  const isToday = startAt ? startAt.toDateString() === new Date().toDateString() : false;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader title="HealthHub" subtitle="7 ways we look after you" />

      {/* Tint rather than solid: this is context, not the screen's call to
          action — the seven tiles below are. */}
      {upcoming && startAt ? (
        <HeroBanner
          accent="green"
          tone="tint"
          icon="calendar"
          eyebrow="Next appointment"
          title={`${doctorName ?? 'Doctor'} · ${isToday ? 'Today' : startAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${startAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`}
        />
      ) : null}

      <View style={styles.grid}>
        {MODULES.map((m) => (
          <ModuleGridTile
            key={m.key}
            icon={m.icon}
            title={m.title}
            subtitle={m.subtitle}
            tint={m.tint}
            // React Navigation's `navigate` overloads are keyed per literal
            // screen name; iterating a static config list over them doesn't
            // narrow, so this one dynamic dispatch needs the escape hatch.
            onPress={() => navigation.navigate(m.key as any)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
