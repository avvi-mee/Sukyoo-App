// Web stub — react-native-agora has no web build (it's a pure native SDK
// wrapper), so Metro picks this file instead of useAgoraEngine.ts when
// bundling for web. Video calling isn't available on web yet; this keeps
// the rest of the app (which doesn't touch Agora) from crashing on load.
export function useAgoraEngine(_agoraAppId: string | undefined) {
  return {
    isJoined: false,
    remoteUid: null,
    join: async () => {},
    leave: () => {},
  };
}
