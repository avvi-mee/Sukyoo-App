export { supabase } from './supabaseClient';
export { sendOtp, verifyOtp, signOut, useSession, signInWithEmail, signUpWithEmail } from './auth';
export type { SignUpRole } from './auth';
export { queryClient } from './queryClient';
export { scrubText, scrubUrl, scrubDeep, shouldDropBreadcrumb } from './scrub';
export * from './api/health';
export * from './api/sos';
export * from './api/family';
export * from './api/calls';
export * from './api/ecommerce';
export * from './api/events';
export type {
  Database,
  Json,
  UserRole,
  OrgType,
  FamilyLinkStatus,
  PermissionResourceType,
  PermissionAccessLevel,
  BookingMode,
  BookingStatus,
  HomeCarePricingType,
  SosStatus,
  VitalStatus,
  CallStatus,
  OrderedByRole,
  OrderStatus,
  PaymentStatus,
} from './database.types';
