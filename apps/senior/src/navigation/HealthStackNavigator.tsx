import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HealthLandingScreen } from '../screens/health/HealthLandingScreen';
import { MedicalCareScreen } from '../screens/health/MedicalCareScreen';
import { DoctorSlotsScreen } from '../screens/health/DoctorSlotsScreen';
import { DiagnosticsScreen } from '../screens/health/DiagnosticsScreen';
import { MedicationScreen } from '../screens/health/MedicationScreen';
import { EmergencyScreen } from '../screens/health/EmergencyScreen';
import { HomeCareScreen } from '../screens/health/HomeCareScreen';
import { WellnessScreen } from '../screens/health/WellnessScreen';
import { InsuranceScreen } from '../screens/health/InsuranceScreen';
import { colors } from '../theme/tokens';
import type { HealthStackParamList } from './types';

const Stack = createNativeStackNavigator<HealthStackParamList>();

export function HealthStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="HealthLanding" component={HealthLandingScreen} options={{ title: 'HealthHub' }} />
      <Stack.Screen name="MedicalCare" component={MedicalCareScreen} options={{ title: 'Medical care' }} />
      <Stack.Screen name="DoctorSlots" component={DoctorSlotsScreen} options={{ title: 'Choose a slot' }} />
      <Stack.Screen name="Diagnostics" component={DiagnosticsScreen} options={{ title: 'Diagnostics' }} />
      <Stack.Screen name="Medication" component={MedicationScreen} options={{ title: 'Medication' }} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} options={{ title: 'Emergency' }} />
      <Stack.Screen name="HomeCare" component={HomeCareScreen} options={{ title: 'Home healthcare' }} />
      <Stack.Screen name="Wellness" component={WellnessScreen} options={{ title: 'Wellness' }} />
      <Stack.Screen name="Insurance" component={InsuranceScreen} options={{ title: 'Insurance & records' }} />
    </Stack.Navigator>
  );
}
