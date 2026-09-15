import type { BookingMode } from '@sukyoo/core';

export type HealthStackParamList = {
  HealthLanding: undefined;
  MedicalCare: undefined;
  Diagnostics: undefined;
  Medication: undefined;
  Emergency: undefined;
  HomeCare: undefined;
  Wellness: undefined;
  Insurance: undefined;
  DoctorSlots: { doctorId: string; doctorName: string; mode: BookingMode };
};

export type ShopStackParamList = {
  ShopLanding: undefined;
  CoreCategories: undefined;
  ProductList: { categoryId: string; categoryName: string };
  Convenience: undefined;
  ServicesMarketplace: undefined;
  TrustEase: undefined;
};

export type EventsStackParamList = {
  EventsLanding: undefined;
  LocalEvents: undefined;
  TravelTours: undefined;
  TripCompanions: { tripId: string; tripTitle: string };
  SocialEngagement: undefined;
  Logistics: undefined;
};

export type FunStackParamList = {
  FunLanding: undefined;
  DigitalContent: undefined;
  InteractiveSocial: undefined;
  LearningHobbies: undefined;
  Community: undefined;
  Livestreams: undefined;
  LifeStoryRecorder: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Health: undefined;
  Shop: undefined;
  Events: undefined;
  Fun: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  // Pushed above the tabs rather than living inside one: both are reachable
  // from several places (Home header, the Insurance screen, Trust & ease) and
  // neither belongs to a single vertical.
  Settings: undefined;
  FamilySharing: undefined;
  Privacy: undefined;
  VideoCall:
    | { mode: 'start'; calleeId: string; calleeName: string }
    | { mode: 'answer'; callSessionId: string; callerName?: string };
};
