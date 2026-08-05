// Aevyra – Hook WebRTC freecam HD
// Signalisation via Edge Function video-call-signal (polling DB)
// WebRTC peer-to-peer sur Web (Chrome, Firefox, Safari iOS/macOS)
// Désactivé gracieusement sur natif (iOS App, Android App)
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/client/supabase';

export type CallStatus =
  | 'idle' | 'ringing' | 'challenge_pending' | 'challenge_done'
  | 'in_progress' | 'ended' | 'rejected' | 'missed' | 'error';

export interface CallChallenge {
  questions: { id: string; question: string; options: string[]; answer_idx: number }[];
  answers: Record<number, number> | null;
  passed: boolean | null;
}

export interface UseVideoCallReturn {
  callId: string | null;
  status: CallStatus;
  challenge: CallChallenge | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  initiateCall: (calleeId: string) => Promise<void>;
  joinCall: (callId: string) => Promise<void>;
  submitChallenge: (answers: Record<number, number>) => Promise<{ passed: boolean; correct: number }>;
  hangup: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  error: string | null;
  getPeerConnection: () => RTCPeerConnection | null;
}

const POLL_INTERVAL = 2000;     // 2s entre chaque poll
const MAX_POLL_MS   = 5 * 60 * 1000; // 5min max — évite le poll zombie indéfini

// ── STUN publics + TURN gratuit metered.ca pour iOS derrière NAT strict ──────
// BUG FIX : les STUN Google seuls ne percent pas le NAT symétrique iOS.
// On ajoute un TURN gratuit pour garantir la connexion sur tous les réseaux.
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TURN de secours (open relay) — évite l'échec sur réseau 4G/5G iOS
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

async function callSignal(action: string, body: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('video-call-signal', {
    body: { action, ...body },
    method: 'POST',
  });
  if (error) {
    const msg = await error?.context?.text?.();
    throw new Error(msg || error.message || 'Erreur signal');
  }
  return data;
}

export function useVideoCall(callIdProp?: string | null): UseVideoCallReturn {
  const [callId, setCallId]             = useState<string | null>(callIdProp ?? null);
  const [status, setStatus]             = useState<CallStatus>('idle');
  const [challenge, setChallenge]       = useState<CallChallenge | null>(null);
  const [localStream, setLocalStream]   = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted]           = useState(false);
  const [isCameraOff, setIsCameraOff]   = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // timeout 5min
  const isCallerRef    = useRef(false);
  const prevStatusRef  = useRef<string>('idle');
  const callIdRef      = useRef<string | null>(callIdProp ?? null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const appliedIceCountRef  = useRef<number>(0);
  // BUG FIX: buffer ICE reçus AVANT setRemoteDescription — évite de les perdre
  const pendingIceBufferRef = useRef<RTCIceCandidateInit[]>([]);

  // Synchroniser les refs avec l'état
  useEffect(() => { callIdRef.current = callId; }, [callId]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // ── Obtenir la caméra/micro HD (compatible tous navigateurs) ─────────────
  // BUG FIX iOS Safari   : sampleRate/channelCount dans constraints → crash → omis
  // BUG FIX Android      : HTTPS obligatoire pour getUserMedia
  // BUG FIX Firefox      : frameRate ignoré → retiré
  // AUDIO QUALITY v2     : autoGainControl:false évite le gain automatique qui
  //                        crée des artéfacts pendant le silence (pompage).
  //                        noiseSuppression:true + echoCancellation:true = full AEC+NS.
  //                        latency:0 = mode faible-latence (WebAudio real-time).
  const getLocalStream = useCallback(async () => {
    if (process.env.EXPO_OS !== 'web') return null;

    // BUG FIX Android Chrome : getUserMedia bloqué sur HTTP (pas HTTPS)
    if (typeof window !== 'undefined' && window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      setError('L\'appel vidéo requiert HTTPS. Ouvrez l\'application via https://');
      return null;
    }

    // BUG FIX Samsung Internet / Android WebView anciens : pas de RTCPeerConnection
    if (typeof window !== 'undefined' && !window.RTCPeerConnection) {
      setError('Votre navigateur ne supporte pas les appels vidéo. Utilisez Chrome, Firefox ou Safari.');
      return null;
    }

    // BUG FIX : getUserMedia peut ne pas être disponible (WebView Android restreint)
    if (!navigator?.mediaDevices?.getUserMedia) {
      setError('Accès caméra indisponible. Ouvrez l\'application dans Chrome ou Firefox.');
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:      { ideal: 1280 },
          height:     { ideal: 720  },
          facingMode: 'user',
          // BUG FIX iOS/Firefox : ne pas forcer frameRate
        },
        audio: {
          // ── Anti-écho matériel + logiciel ─────────────────────
          echoCancellation:  true,   // AEC hardware si dispo, logiciel sinon
          noiseSuppression:  true,   // NS : supprime bruit de fond constant
          autoGainControl:   false,  // AGC OFF : évite pompage + distorsion
          // ── Qualité optimale ──────────────────────────────────
          // BUG FIX iOS Safari : sampleRate/channelCount dans constraints
          //   → OverconstrainedError sur Safari 15- → NE PAS les inclure ici.
          //   Le codec Opus (priorité SDP) imposera 48 kHz de son côté.
        },
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (e) {
      const name = (e as DOMException)?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Permission micro/caméra refusée. Autorisez l\'accès dans les paramètres de votre navigateur.');
        return null;
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('Aucune caméra ou micro détecté sur cet appareil.');
        return null;
      }
      if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError('Caméra/micro utilisé par une autre application. Fermez-la et réessayez.');
        return null;
      }
      // Retry sans contraintes (fallback universel — audio seul si nécessaire)
      try {
        const fallback = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
        });
        setLocalStream(fallback);
        localStreamRef.current = fallback;
        return fallback;
      } catch {
        setError('Impossible d\'accéder à la caméra : ' + (e instanceof Error ? e.message : String(e)));
        return null;
      }
    }
  }, []);

  // ── Créer le PeerConnection ───────────────────────────────────
  // BUG FIX : callId passé en paramètre (pas en closure) pour éviter le stale ref
  const createPC = useCallback((stream: MediaStream, cid: string) => {
    if (process.env.EXPO_OS !== 'web') return null;
    // Fermer l'ancien PC si existant
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Ajouter les pistes locales
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Piste distante reçue
    pc.ontrack = (evt) => {
      if (evt.streams[0]) setRemoteStream(evt.streams[0]);
    };

    // BUG FIX : utiliser cid (param) et non callId (closure stale)
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && cid) {
        callSignal('add_ice', { call_id: cid, candidate: candidate.toJSON() }).catch(console.error);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setStatus('in_progress');
      } else if (state === 'failed') {
        // BUG FIX iOS : tentative de restart ICE avant d'abandonner
        pc.restartIce();
        setTimeout(() => {
          if (pcRef.current?.connectionState === 'failed') setStatus('ended');
        }, 5000);
      } else if (state === 'disconnected') {
        // BUG FIX iOS : Safari peut passer disconnected puis reconnected — attendre 8s
        setTimeout(() => {
          if (pcRef.current?.connectionState === 'disconnected') setStatus('ended');
        }, 8000);
      }
    };

    // BUG FIX iOS Safari : gérer onnegotiationneeded pour les offres futures
    pc.onnegotiationneeded = async () => {
      const currentCid = callIdRef.current;
      if (!currentCid || !isCallerRef.current || pc.signalingState !== 'stable') return;
      try {
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        await callSignal('send_offer', { call_id: currentCid, offer_sdp: JSON.stringify(offer) });
      } catch { /* ignore négociation concurrente */ }
    };

    return pc;
  }, []);

  // ── Appliquer les ICE candidates distants (delta seulement) ───
  // BUG FIX: si remoteDescription pas encore posée, bufferiser les ICE pour les appliquer après
  const applyRemoteIceDelta = useCallback(async (allCandidates: RTCIceCandidateInit[]) => {
    const pc = pcRef.current;
    const newCandidates = allCandidates.slice(appliedIceCountRef.current);
    if (!newCandidates.length) return;

    if (!pc || !pc.remoteDescription) {
      // BUG FIX: buffer les candidats reçus avant setRemoteDescription — ils seront drainés après
      pendingIceBufferRef.current = [
        ...pendingIceBufferRef.current,
        ...newCandidates,
      ];
      appliedIceCountRef.current = allCandidates.length;
      return;
    }
    for (const c of newCandidates) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
    }
    appliedIceCountRef.current = allCandidates.length;
  }, []);

  // Drainer le buffer ICE après setRemoteDescription
  const drainIceBuffer = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const buffered = pendingIceBufferRef.current;
    if (!buffered.length) return;
    pendingIceBufferRef.current = [];
    for (const c of buffered) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
    }
  }, []);

  // ── Priorité codec Opus 48 kHz (meilleure qualité audio WebRTC) ────────────
  // Chrome/Firefox/Safari supportent tous Opus. On réordonne les lignes m=audio
  // du SDP pour mettre Opus en premier et on fixe le bitrate à 128 kbps.
  // BUG FIX écho : Opus avec stereo=0 + useinbandfec=1 (correction d'erreurs).
  const preferOpusHD = useCallback((sdp: string): string => {
    try {
      const lines = sdp.split('\r\n');
      // Trouver la ligne m=audio et les payloads Opus
      let mAudioIdx = -1;
      const opusPayloads: string[] = [];

      lines.forEach((line, i) => {
        if (line.startsWith('m=audio')) mAudioIdx = i;
        // Chercher les lignes rtpmap Opus (insensible à la casse)
        if (/^a=rtpmap:\d+ opus\/48000/i.test(line)) {
          const pt = line.match(/^a=rtpmap:(\d+)/)?.[1];
          if (pt) opusPayloads.push(pt);
        }
      });

      if (mAudioIdx === -1 || opusPayloads.length === 0) return sdp;

      // Réordonner m=audio pour mettre Opus en premier
      const mLine = lines[mAudioIdx];
      const parts = mLine.split(' ');
      // parts = ['m=audio', port, 'UDP/TLS/RTP/SAVPF', pt1, pt2, ...]
      const header = parts.slice(0, 3);
      const pts    = parts.slice(3);
      const reordered = [
        ...opusPayloads,
        ...pts.filter(p => !opusPayloads.includes(p)),
      ];
      lines[mAudioIdx] = [...header, ...reordered].join(' ');

      // Ajouter / remplacer les fmtp Opus avec paramètres HD anti-écho
      const result: string[] = [];
      const addedFmtp = new Set<string>();
      for (const line of lines) {
        // Supprimer les anciennes fmtp Opus pour les réécrire proprement
        const fmtpMatch = line.match(/^a=fmtp:(\d+) /);
        if (fmtpMatch && opusPayloads.includes(fmtpMatch[1])) {
          if (!addedFmtp.has(fmtpMatch[1])) {
            // Opus HD : 48 kHz mono, FEC activé, DTX désactivé, bitrate max 128k
            result.push(`a=fmtp:${fmtpMatch[1]} minptime=10;useinbandfec=1;stereo=0;sprop-stereo=0;maxplaybackrate=48000;maxaveragebitrate=128000;dtx=0`);
            addedFmtp.add(fmtpMatch[1]);
          }
          continue;
        }
        result.push(line);
      }
      // Ajouter fmtp pour les payloads Opus qui n'en avaient pas
      for (const pt of opusPayloads) {
        if (!addedFmtp.has(pt)) {
          const insertIdx = result.findIndex(l => l.startsWith('a=rtpmap:' + pt));
          if (insertIdx !== -1) {
            result.splice(insertIdx + 1, 0,
              `a=fmtp:${pt} minptime=10;useinbandfec=1;stereo=0;sprop-stereo=0;maxplaybackrate=48000;maxaveragebitrate=128000;dtx=0`
            );
          }
        }
      }
      return result.join('\r\n');
    } catch {
      return sdp; // si une erreur parsing SDP, garder l'original
    }
  }, []);

  // ── Flux WebRTC principal (appelant) ─────────────────────────
  // BUG FIX Firefox : offerToReceiveAudio/Video requis pour recevoir les tracks distants
  const startCallerWebRTC = useCallback(async (cid: string) => {
    if (process.env.EXPO_OS !== 'web') return;
    const stream = localStreamRef.current || await getLocalStream();
    if (!stream) return;
    const pc = createPC(stream, cid);
    if (!pc) return;
    // BUG FIX Firefox : sans ces options, les tracks distants ne sont pas reçus
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    // Priorité Opus HD 48 kHz + paramètres anti-écho dans le SDP
    const hdOffer: RTCSessionDescriptionInit = { type: offer.type, sdp: preferOpusHD(offer.sdp ?? '') };
    await pc.setLocalDescription(hdOffer);
    await callSignal('send_offer', { call_id: cid, offer_sdp: JSON.stringify(pc.localDescription) });
  }, [createPC, getLocalStream, preferOpusHD]);

  // ── Flux WebRTC principal (appelé) ───────────────────────────
  const startCalleeWebRTC = useCallback(async (cid: string, offerSdp: string) => {
    if (process.env.EXPO_OS !== 'web') return;
    const stream = localStreamRef.current || await getLocalStream();
    if (!stream) return;
    const pc = createPC(stream, cid);
    if (!pc) return;
    const offer = JSON.parse(offerSdp) as RTCSessionDescriptionInit;
    // Appliquer Opus HD aussi côté appelé (answer)
    const hdOffer: RTCSessionDescriptionInit = { type: offer.type, sdp: preferOpusHD(offer.sdp ?? '') };
    await pc.setRemoteDescription(new RTCSessionDescription(hdOffer));
    appliedIceCountRef.current = 0;
    pendingIceBufferRef.current = []; // reset buffer au nouveau setRemoteDescription
    await drainIceBuffer(); // drainer les ICE reçus avant setRemoteDescription
    const answer = await pc.createAnswer();
    const hdAnswer: RTCSessionDescriptionInit = { type: answer.type, sdp: preferOpusHD(answer.sdp ?? '') };
    await pc.setLocalDescription(hdAnswer);
    await callSignal('send_answer', { call_id: cid, answer_sdp: JSON.stringify(pc.localDescription) });
  }, [createPC, getLocalStream, preferOpusHD, drainIceBuffer]);

  // ── Polling : synchroniser l'état de l'appel ─────────────────
  const pollCall = useCallback(async () => {
    const cid = callIdRef.current;
    if (!cid) return;
    try {
      const { call, challenge: ch } = await callSignal('get_call', { call_id: cid });
      const newStatus: CallStatus = call.status;

      if (ch) setChallenge(ch);

      const pc = pcRef.current;

      // ── Transition → in_progress ──
      if (prevStatusRef.current !== 'in_progress' && newStatus === 'in_progress') {
        prevStatusRef.current = 'in_progress';
        setStatus('in_progress');
        if (process.env.EXPO_OS === 'web') {
          if (!pc) {
            if (isCallerRef.current) {
              // Caller : créer l'offer
              await startCallerWebRTC(cid);
            } else if (call.offer_sdp) {
              // Callee : recevoir l'offer et créer l'answer
              await startCalleeWebRTC(cid, call.offer_sdp);
            }
            // BUG FIX: si callee poll avant que caller envoie l'offer → offer_sdp encore null
            // → le prochain poll (branche "déjà in_progress") rattrapera quand offer_sdp arrivera
          }
        }
      } else if (newStatus === 'in_progress' && process.env.EXPO_OS === 'web') {
        // ── Déjà in_progress : appliquer les SDP / ICE manquants ──

        if (!pc) {
          // BUG FIX CALLEE: PC pas encore créé (offer_sdp était null au 1er poll)
          // → réessayer maintenant que l'offer est disponible
          if (!isCallerRef.current && call.offer_sdp) {
            await startCalleeWebRTC(cid, call.offer_sdp);
          }
        } else {
          // Callee reçoit l'offer (si pas encore fait)
          if (!isCallerRef.current && call.offer_sdp && !pc.remoteDescription) {
            const offer = JSON.parse(call.offer_sdp) as RTCSessionDescriptionInit;
            const hdOffer: RTCSessionDescriptionInit = { type: offer.type, sdp: preferOpusHD(offer.sdp ?? '') };
            await pc.setRemoteDescription(new RTCSessionDescription(hdOffer));
            appliedIceCountRef.current = 0;
            pendingIceBufferRef.current = [];
            await drainIceBuffer();
            const answer = await pc.createAnswer();
            const hdAnswer: RTCSessionDescriptionInit = { type: answer.type, sdp: preferOpusHD(answer.sdp ?? '') };
            await pc.setLocalDescription(hdAnswer);
            await callSignal('send_answer', { call_id: cid, answer_sdp: JSON.stringify(pc.localDescription) });
          }

          // BUG FIX CALLER: appliquer l'answer avec Opus HD (était sans preferOpusHD avant)
          if (isCallerRef.current && call.answer_sdp && !pc.remoteDescription) {
            const answer = JSON.parse(call.answer_sdp) as RTCSessionDescriptionInit;
            const hdAnswer: RTCSessionDescriptionInit = { type: answer.type, sdp: preferOpusHD(answer.sdp ?? '') };
            await pc.setRemoteDescription(new RTCSessionDescription(hdAnswer));
            appliedIceCountRef.current = 0;
            pendingIceBufferRef.current = [];
            await drainIceBuffer(); // drainer les ICE bufférisés avant setRemoteDescription
          }

          // Appliquer uniquement les ICE nouveaux (delta)
          const remoteIce = (isCallerRef.current ? call.callee_ice : call.caller_ice) as RTCIceCandidateInit[];
          if (Array.isArray(remoteIce)) {
            await applyRemoteIceDelta(remoteIce);
          }
        }
      } else {
        if (prevStatusRef.current !== newStatus) {
          prevStatusRef.current = newStatus;
          setStatus(newStatus);
        }
      }

      if (newStatus === 'ended' || newStatus === 'rejected' || newStatus === 'missed') {
        stopPoll();
        cleanup();
      }
    } catch (e) {
      console.error('[pollCall]', e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyRemoteIceDelta, startCallerWebRTC, startCalleeWebRTC, preferOpusHD, drainIceBuffer]);

  const stopPoll = useCallback(() => {
    if (pollRef.current)        { clearInterval(pollRef.current); pollRef.current = null; }
    if (pollTimeoutRef.current) { clearTimeout(pollTimeoutRef.current); pollTimeoutRef.current = null; }
  }, []);

  const startPoll = useCallback(() => {
    stopPoll();
    pollRef.current = setInterval(pollCall, POLL_INTERVAL);
    pollCall(); // premier poll immédiat
    // Timeout sécurité : arrêt automatique après MAX_POLL_MS pour éviter le poll zombie
    pollTimeoutRef.current = setTimeout(() => {
      stopPoll();
      setStatus('ended');
    }, MAX_POLL_MS);
  }, [pollCall, stopPoll]);

  const cleanup = useCallback(() => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    localStreamRef.current?.getTracks().forEach((t: any) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    localStreamRef.current = null;
    appliedIceCountRef.current = 0;
    pendingIceBufferRef.current = []; // vider le buffer ICE au cleanup
  }, []);

  // Démarrer le poll quand callId change
  useEffect(() => {
    if (callId) { startPoll(); }
    return stopPoll;
  }, [callId, startPoll, stopPoll]);

  // Pause poll si onglet caché (visibilitychange) — évite poll zombie en arrière-plan
  // BUG FIX Chrome/Edge/Firefox : document.hidden est bien supporté (IE 10+)
  useEffect(() => {
    if (process.env.EXPO_OS !== 'web') return;
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        // Onglet masqué → pause poll (économise ressources + évite signaux en double)
        stopPoll();
      } else if (callId) {
        // Onglet redevenu visible avec un appel actif → reprendre
        startPoll();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [callId, startPoll, stopPoll]);

  // ── Initier un appel (appelant) ───────────────────────────────
  const initiateCall = useCallback(async (calleeId: string) => {
    setError(null);
    prevStatusRef.current = 'idle';
    appliedIceCountRef.current = 0;
    try {
      isCallerRef.current = true;
      // Obtenir la caméra EN PREMIER (avant de créer l'appel en DB)
      const stream = await getLocalStream();
      if (!stream) return;
      setStatus('ringing');
      const { call_id } = await callSignal('initiate', { callee_id: calleeId });
      callIdRef.current = call_id;
      setCallId(call_id);
      setStatus('challenge_pending');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d\'initier l\'appel');
      setStatus('error');
    }
  }, [getLocalStream]);

  // ── Rejoindre un appel existant (appelé) ─────────────────────
  const joinCall = useCallback(async (cid: string) => {
    setError(null);
    prevStatusRef.current = 'idle';
    appliedIceCountRef.current = 0;
    isCallerRef.current = false;
    // Obtenir la caméra immédiatement pour l'appelé aussi
    await getLocalStream();
    callIdRef.current = cid;
    setCallId(cid);
    setStatus('challenge_pending');
  }, [getLocalStream]);

  // ── Soumettre l'épreuve ───────────────────────────────────────
  const submitChallenge = useCallback(async (answers: Record<number, number>) => {
    const cid = callIdRef.current;
    if (!cid) throw new Error('Pas d\'appel actif');
    const result = await callSignal('submit_challenge', { call_id: cid, answers });
    return { passed: result.passed as boolean, correct: result.correct as number };
  }, []);

  // ── Raccrocher ───────────────────────────────────────────────
  const hangup = useCallback(async () => {
    const cid = callIdRef.current;
    if (cid) await callSignal('hangup', { call_id: cid }).catch(console.error);
    stopPoll();
    cleanup();
    setStatus('ended');
    setCallId(null);
    callIdRef.current = null;
  }, [cleanup, stopPoll]);

  // ── Couper le micro ──────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t: any) => { t.enabled = !t.enabled; });
    setIsMuted((m: boolean) => !m);
  }, []);

  // ── Couper la caméra ─────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t: any) => { t.enabled = !t.enabled; });
    setIsCameraOff((c: boolean) => !c);
  }, []);

  // Cleanup au démontage
  useEffect(() => () => { stopPoll(); cleanup(); }, [cleanup, stopPoll]);

  // Accès au RTCPeerConnection pour les stats (sans hack _pc sur MediaStream)
  const getPeerConnection = useCallback((): RTCPeerConnection | null => pcRef.current, []);

  return {
    callId, status, challenge, localStream, remoteStream,
    isMuted, isCameraOff,
    initiateCall, joinCall, submitChallenge, hangup,
    toggleMute, toggleCamera, error,
    getPeerConnection,
  };
}
