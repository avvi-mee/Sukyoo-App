import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { ChannelProfileType, ClientRoleType, createAgoraRtcEngine, type IRtcEngine } from 'react-native-agora';

async function requestMediaPermissions() {
  if (Platform.OS !== 'android') return;
  await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]);
}

// One Agora engine per call screen — created on mount, torn down on
// unmount. uid is always 0 on both join and token generation ("unrestricted"
// token + SDK auto-assigns the real uid) — see the calls-token Edge Function
// for why this avoids needing a Supabase-UUID-to-Agora-uid mapping.
export function useAgoraEngine(agoraAppId: string | undefined) {
  const engineRef = useRef<IRtcEngine | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  useEffect(() => {
    if (!agoraAppId) return;
    const engine = createAgoraRtcEngine();
    engineRef.current = engine;
    engine.initialize({ appId: agoraAppId, channelProfile: ChannelProfileType.ChannelProfileCommunication });
    engine.enableVideo();
    engine.addListener('onJoinChannelSuccess', () => setIsJoined(true));
    engine.addListener('onUserJoined', (_connection, uid) => setRemoteUid(uid));
    engine.addListener('onUserOffline', () => setRemoteUid(null));

    return () => {
      engine.leaveChannel();
      engine.release();
      engineRef.current = null;
    };
  }, [agoraAppId]);

  async function join(channelName: string, token: string) {
    await requestMediaPermissions();
    engineRef.current?.joinChannel(token, channelName, 0, { clientRoleType: ClientRoleType.ClientRoleBroadcaster });
  }

  function leave() {
    engineRef.current?.leaveChannel();
    setIsJoined(false);
    setRemoteUid(null);
  }

  return { isJoined, remoteUid, join, leave };
}
