import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Health: undefined;
  Orders: undefined;
  Stories: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  // NavigatorScreenParams so a root-level screen can jump straight to a tab
  // (`navigate('MainTabs', { screen: 'Health' })`) with the target checked.
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  LinkSenior: undefined;
  Privacy: undefined;
  SOSAlert: { sosEventId: string; seniorId: string };
  VideoCall:
    | { mode: 'start'; calleeId: string; calleeName: string }
    | { mode: 'answer'; callSessionId: string; callerName?: string };
};
