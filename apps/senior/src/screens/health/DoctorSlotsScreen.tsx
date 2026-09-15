import { FlatList, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBookDoctor, useDoctorSlots } from '@sukyoo/core';
import { ListRow } from '../../components/ListRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useCurrentUserId } from '../../hooks/useCurrentUserId';
import { notify } from '../../notify';
import { colors, spacing } from '../../theme/tokens';
import type { HealthStackParamList } from '../../navigation/types';

export function DoctorSlotsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HealthStackParamList>>();
  const { params } = useRoute<RouteProp<HealthStackParamList, 'DoctorSlots'>>();
  const userId = useCurrentUserId();
  const { data: slots, isLoading } = useDoctorSlots(params.doctorId, params.mode);
  const bookDoctor = useBookDoctor();

  function handleBook(slotId: string) {
    if (!userId) return;
    bookDoctor.mutate(
      { slotId, patientId: userId, bookedByUserId: userId, mode: params.mode },
      {
        onSuccess: () => {
          notify('Booked', `Your ${params.mode.replace('_', ' ')} consult with ${params.doctorName} is confirmed.`);
          navigation.goBack();
        },
        onError: (e) => notify('Could not book', e instanceof Error ? e.message : 'That slot may already be taken.'),
      }
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={slots ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={<ScreenHeader title={params.doctorName} subtitle="Choose an available slot" />}
      ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No upcoming slots — check back soon.</Text> : null}
      renderItem={({ item }) => (
        <ListRow
          icon="clock"
          title={new Date(item.start_at).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
          subtitle={params.mode.replace('_', ' ')}
          actionLabel="Book"
          onPressAction={() => handleBook(item.id)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, gap: spacing.sm },
  empty: { textAlign: 'center', color: colors.inkMuted, marginTop: spacing.lg },
});
