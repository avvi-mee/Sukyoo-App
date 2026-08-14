export type MainTabParamList = {
  Home: undefined;
  Health: undefined;
  Orders: undefined;
  Stories: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  LinkSenior: undefined;
  SOSAlert: { sosEventId: string; seniorId: string };
  VideoCall:
    | { mode: 'start'; calleeId: string; calleeName: string }
    | { mode: 'answer'; callSessionId: string; callerName?: string };
};
