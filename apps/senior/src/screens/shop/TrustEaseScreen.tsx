import { ScrollView, StyleSheet } from 'react-native';
import { ListRow } from '../../components/ListRow';
import { SectionHeader } from '../../components/SectionHeader';
import { colors, spacing } from '../../theme/tokens';

export function TrustEaseScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionHeader title="Trust & ease" />
      <ListRow icon="✅" title="Verified seller badge" subtitle="Every seller on Sukyoo is verified" />
      <ListRow icon="↩️" title="Easy returns & pickup" subtitle="Doorstep, no questions asked" />
      <ListRow icon="💳" title="Cash or assisted payment" subtitle="COD, UPI help & family billing" />
      <ListRow
        icon="👨‍👩‍👧"
        title="Family co-ordering"
        subtitle="Children can order & gift remotely — set this up under HealthHub > Insurance & records > Invite a family member"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.xs },
});
