/**
 * Call Store
 * Holds the state of the active SIP call and account registration.
 * The SIP library logic lives in services/sipService.ts, which drives this
 * store; screens (e.g. CallScreen) only read it and call the service.
 */

import { create } from 'zustand';

export type CallStatus =
  | 'idle'
  | 'calling'
  | 'incoming'
  | 'ringing'
  | 'connecting'
  | 'active'
  | 'ended';

export interface ActiveCallInfo {
  /** SIP session id (stringified). */
  callId: string | null;
  /** Database Call record UUID. */
  dbCallId?: string | null;
  /** Dialled number or SIP destination. */
  destination: string;
  /** Remote party display name. */
  displayName: string;
  /** Remote party photo URL. */
  photo: string | null;
  /** Optional conversation UUID if associated. */
  conversationId?: string | null;
}

interface CallStore {
  status: CallStatus;
  call: ActiveCallInfo;
  muted: boolean;
  speaker: boolean;
  registrationStatus: string | null;
  error: string | null;

  // Video calling extensions
  isVideo: boolean;
  videoEnabled: boolean;
  cameraFacing: 'user' | 'environment';
  localStream: any | null;
  remoteStream: any | null;
  remoteStreamVersion: number;
  localStreamVersion: number;

  setStatus: (status: CallStatus) => void;
  setCall: (call: Partial<ActiveCallInfo>) => void;
  setMuted: (muted: boolean) => void;
  setSpeaker: (speaker: boolean) => void;
  setRegistrationStatus: (status: string | null) => void;
  setError: (error: string | null) => void;
  setIsVideo: (isVideo: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  setCameraFacing: (facing: 'user' | 'environment') => void;
  setLocalStream: (stream: any | null) => void;
  setRemoteStream: (stream: any | null) => void;
  reset: () => void;
}

const initialCall: ActiveCallInfo = {
  callId: null,
  destination: '',
  displayName: '',
  photo: null,
  conversationId: null,
};

export const useCallStore = create<CallStore>(set => ({
  status: 'idle',
  call: initialCall,
  muted: false,
  speaker: false,
  registrationStatus: null,
  error: null,

  // Video call defaults
  isVideo: false,
  videoEnabled: false,
  cameraFacing: 'user',
  localStream: null,
  remoteStream: null,
  remoteStreamVersion: 0,
  localStreamVersion: 0,

  setStatus: status => set({ status }),
  setCall: call => set(state => ({ call: { ...state.call, ...call } })),
  setMuted: muted => set({ muted }),
  setSpeaker: speaker => set({ speaker }),
  setRegistrationStatus: registrationStatus => set({ registrationStatus }),
  setError: error => set({ error }),
  setIsVideo: isVideo => set({ isVideo }),
  setVideoEnabled: videoEnabled => set({ videoEnabled }),
  setCameraFacing: cameraFacing => set({ cameraFacing }),
  setLocalStream: localStream =>
    set(state => ({
      localStream,
      localStreamVersion: state.localStreamVersion + 1,
    })),
  setRemoteStream: remoteStream =>
    set(state => ({
      remoteStream,
      remoteStreamVersion: state.remoteStreamVersion + 1,
    })),
  reset: () =>
    set({
      status: 'idle',
      call: initialCall,
      muted: false,
      speaker: false,
      error: null,
      isVideo: false,
      videoEnabled: false,
      cameraFacing: 'user',
      localStream: null,
      remoteStream: null,
      remoteStreamVersion: 0,
      localStreamVersion: 0,
    }),
}));
