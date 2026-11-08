/**
 * Static SIP configuration.
 *
 * Per-user SIP credentials (username / password / domain / wsServer) are now
 * fetched from the backend `GET /api/v1/sip/credentials/:userId` at sign-in —
 * see services/sipService.ts. Only the values that are identical for every
 * user live here.
 */

/**
 * TURN relay for reliable media traversal behind NAT.
 *
 * coturn is installed on 10.1.1.107 and running (verified 2026-08-22).
 * The router must forward TCP+UDP 3478 → 10.1.1.107 for this to work from
 * the internet (currently port 3478 is NOT forwarded — see FREEPBX.md).
 */
const TURN = {
  urls: [
    'turn:freepbx.solarimsys.online:3478?transport=udp',
    'turn:freepbx.solarimsys.online:3478?transport=tcp',
  ],
  username: 'solarimsys',
  credential: 'echoslam1234',
};

export const SIP = {
  /** Re-registration interval in seconds. */
  regTimeout: 300,
  /** ICE servers for WebRTC media (STUN + TURN relay). */
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    ...TURN.urls.map(url => ({
      urls: url,
      username: TURN.username,
      credential: TURN.credential,
    })),
  ],
};
