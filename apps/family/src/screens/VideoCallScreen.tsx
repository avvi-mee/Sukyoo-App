import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RtcSurfaceView, VideoSourceType } from 'react-native-agora';
import { useCallToken, useStartCall, useUpdateCallStatus } from '@sukyoo/core';
import { useAgoraEngine } from '../calling/useAgoraEngine';
import { Sentry } from '../observability/sentry';
import { colors, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function VideoCallScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'VideoCall'>>();
  const startCall = useStartCall();
  const getToken = useCallToken();
  const updateStatus = useUpdateCallStatus();

  const [agoraAppId, setAgoraAppId] = useState<string | undefined>();
  const callSessionIdRef = useRef<string | undefined>(params.mode === 'answer' ? params.callSessionId : undefined);
  const { isJoined, remoteUid, join, leave } = useAgoraEngine(agoraAppId);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function begin() {
      const result = params.mode === 'start' ? await startCall.mutateAsync(params.calleeId) : await getToken.mutateAsync(params.callSessionId);
      callSessionIdRef.current = result.callSessionId;
      setAgoraAppId(result.agoraAppId);
      await join(result.channelName, result.token);
      if (params.mode === 'answer') updateStatus.mutate({ callSessionId: result.callSessionId, status: 'active' });
    }
    begin().catch((e) => {
      console.warn('Failed to start/join call', e);
      Sentry.captureException(e, { tags: { flow: 'video-call' } });
    });
  }, []);

  function handleEndCall() {
    leave();
    if (callSessionIdRef.current) {
      updateStatus.mutate({ callSessionId: callSessionIdRef.current, status: 'ended' });
    }
    navigation.goBack();
  }

  const peerName = params.mode === 'start' ? params.calleeName : (params.callerName ?? 'Family');

  return (
    <View style={styles.screen}>
      {isJoined && remoteUid ? (
        <RtcSurfaceView style={styles.remoteVideo} canvas={{ uid: remoteUid, sourceType: VideoSourceType.VideoSourceRemote }} />
      ) : (
        <View style={styles.waitingCenter}>
          <Text style={styles.waitingText}>{isJoined ? `Waiting for ${peerName}...` : `Calling ${peerName}...`}</Text>
        </View>
      )}

      {isJoined ? (
        <RtcSurfaceView style={styles.localVideo} canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }} />
      ) : null}

      <Text style={styles.endButton} onPress={handleEndCall}>
        End call
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  remoteVideo: { flex: 1 },
  waitingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  waitingText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  localVideo: { position: 'absolute', top: spacing.lg, right: spacing.md, width: 100, height: 140, borderRadius: 12, overflow: 'hidden' },
  endButton: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.danger,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
