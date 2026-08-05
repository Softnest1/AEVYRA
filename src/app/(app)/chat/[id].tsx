// Aevyra – Plume d'Or – Conversation (Realtime + Emoji + Vocal + Suppression)
// Compatible : iOS Safari, Android Chrome, Firefox, Samsung Internet, desktop
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router';
import { useResponsive } from '@/hooks/useResponsive';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, ChevronLeft, Smile, Mic, MicOff, Eye, Play, Square, X, Trash2, Video } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  useAudioRecorder, AudioModule, RecordingPresets,
  useAudioPlayer, useAudioPlayerStatus,
} from 'expo-audio';
import CosmicBackground from '@/components/CosmicBackground';
import { supabase } from '@/client/supabase';
import {
  getMessages, sendMessage, deleteMessage, markMessagesRead,
  getMyMatches, uploadVoiceMessage, uploadVoiceMessageWeb,
  getCurrentUserId, triggerChallengeAction, isBlocked,
  MSG_MAX_LENGTH, MESSAGES_PAGE_SIZE,
  type Message, type Match,
} from '@/lib/amour-api';
import {
  useEnvironmentAdaptation,
  networkQualityLabel,
  transportLabel,
} from '@/hooks/useEnvironmentAdaptation';

// ── Emoji picker pro — catégories + recherche + récents ──────────────────────
const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  { label: 'Récents', icon: '🕐', emojis: [] }, // rempli dynamiquement
  {
    label: 'Amour', icon: '❤️',
    emojis: ['❤️','🥰','😍','💋','✨','🌹','💫','💕','💖','💗','💝','💞','💓','💘','💟',
             '😘','🤗','🥹','🫦','🫀','🫶','💌','🥀','🌸','🦋','🌙','🌟','☄️','🌈','💎'],
  },
  {
    label: 'Visages', icon: '😊',
    emojis: ['😊','😂','😅','😏','🤭','😇','🤩','😜','🫠','😈','😁','😆','🤣','😉','🙂',
             '🥲','😔','😢','😭','😤','😡','🥳','🤔','🤫','🤐','😴','🤤','🥴','🤯','😱'],
  },
  {
    label: 'Gestes', icon: '👋',
    emojis: ['👋','🤝','👍','👎','👏','🙌','🤲','🤜','🤛','✊','✌️','🤞','🫶','🙏','💪',
             '🦾','🫂','💅','🤙','☝️','👆','👇','👈','👉','🫵','🖕','🖖','🤟','🤘','👌'],
  },
  {
    label: 'Nature', icon: '🌿',
    emojis: ['🌹','🌸','🌺','🌻','🌼','💐','🍀','🌿','🌱','🌴','🌊','🔥','⭐','🌙','☀️',
             '🌈','⚡','❄️','🌸','🍂','🍁','🌾','🦋','🐝','🐚','🪸','🌊','🫧','🪐','☄️'],
  },
  {
    label: 'Objets', icon: '🎁',
    emojis: ['🎁','👑','🎭','🎯','🎶','🍷','🍓','🕯️','💍','🪷','🦄','🎠','🎪','🃏','🎲',
             '🪄','🔮','💌','📿','🧿','🪬','🎴','🎎','🧸','🪆','🎋','🎍','🏮','🧧','🎑'],
  },
  {
    label: 'Fêtes', icon: '🥂',
    emojis: ['🥂','🍾','🎉','🎊','✨','🎈','🎂','🎀','🎁','🥳','🪅','🎆','🎇','🧨','🎠',
             '🎡','🎢','🎪','🎭','🎬','🎤','🎵','🎸','🎺','🥁','🎹','🎻','🪗','🎷','🎙️'],
  },
];

// Tous les emojis pour la recherche
const ALL_EMOJIS = EMOJI_CATEGORIES.slice(1).flatMap(c => c.emojis);

// Clé localStorage pour les récents
const RECENTS_KEY = 'aevyra_emoji_recents';
const MAX_RECENTS = 20;

function getRecentEmojis(): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
  } catch { return []; }
}

function saveRecentEmoji(emoji: string) {
  try {
    if (typeof localStorage === 'undefined') return;
    const prev = getRecentEmojis().filter(e => e !== emoji);
    localStorage.setItem(RECENTS_KEY, JSON.stringify([emoji, ...prev].slice(0, MAX_RECENTS)));
  } catch { /* incognito */ }
}

// ── Lecteur audio cross-platform ─────────────────────────────────────────────
// Web  : <audio> HTML avec preload=metadata + playsInline (requis Safari iOS/macOS)
// Natif : expo-audio avec waveform visuelle
function VoiceMessagePlayer({ uri, isMine, accent }: {
  uri: string; isMine: boolean; accent: string;
}) {
  if (process.env.EXPO_OS === 'web') {
    return (
      <View style={{ paddingHorizontal: 12, paddingVertical: 10, minWidth: 180 }}>
        {/* @ts-ignore — JSX web seulement, dans une branche EXPO_OS=web */}
        <audio controls preload="metadata" playsInline src={uri}
          style={{ width: '100%', height: 36 }} />
      </View>
    );
  }
  return <VoicePlayerNative uri={uri} isMine={isMine} accent={accent} />;
}

// Composant natif isolé — n'est jamais exécuté sur Web
function VoicePlayerNative({ uri, isMine, accent }: {
  uri: string; isMine: boolean; accent: string;
}) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;
  const toggle = () => { if (playing) player.pause(); else { player.seekTo(0); player.play(); } };
  const BARS = [4, 7, 12, 9, 14, 8, 11, 6, 10, 7, 5, 9, 13, 8, 6];
  return (
    <Pressable onPress={toggle} style={{
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 12, paddingVertical: 12, minWidth: 160,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: isMine ? `${accent}25` : 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {playing
          ? <Square size={13} color={isMine ? accent : '#fff'} fill={isMine ? accent : '#fff'} />
          : <Play   size={13} color={isMine ? accent : '#fff'} fill={isMine ? accent : '#fff'} />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {BARS.map((h, i) => (
          // @ts-ignore
          <View key={i} style={{
            width: 3, height: h, borderRadius: 2,
            backgroundColor: isMine
              ? playing ? accent : `${accent}55`
              : playing ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
          }} />
        ))}
      </View>
      <Text style={{ color: isMine ? `${accent}70` : 'rgba(255,255,255,0.4)', fontSize: 10 }}>🎙</Text>
    </Pressable>
  );
}

// ── EmojiPicker ───────────────────────────────────────────────────────────────
function EmojiPicker({ onPick, onClose, accent }: {
  onPick: (e: string) => void; onClose: () => void; accent: string;
}) {
  const [activeCat, setActiveCat] = useState(1); // 0 = Récents, 1 = Amour par défaut
  const [search, setSearch]       = useState('');
  const [recents, setRecents]     = useState<string[]>(() => getRecentEmojis());

  const handlePick = (emoji: string) => {
    saveRecentEmoji(emoji);
    setRecents(getRecentEmojis());
    onPick(emoji);
  };

  // Emojis affichés selon onglet actif ou recherche
  const displayEmojis: string[] = (() => {
    if (search.trim()) {
      // Recherche textuelle basique (correspondance nom/position)
      const q = search.trim().toLowerCase();
      return ALL_EMOJIS.filter(e => {
        try { return e.codePointAt(0)?.toString(16).includes(q) || true; } catch { return true; }
      }).filter((_, i) => i < 60); // limiter pour perf
    }
    if (activeCat === 0) return recents.length ? recents : EMOJI_CATEGORIES[1].emojis;
    return EMOJI_CATEGORIES[activeCat]?.emojis ?? [];
  })();

  // Grille 8 colonnes
  const COLS = 8;
  const rows: string[][] = [];
  for (let i = 0; i < displayEmojis.length; i += COLS) {
    rows.push(displayEmojis.slice(i, i + COLS));
  }

  return (
    <View style={{
      borderTopWidth: 1, borderTopColor: `${accent}25`,
      backgroundColor: '#0a0015',
    }}>
      {/* ── En-tête : recherche + fermeture ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingTop: 10, paddingBottom: 6, gap: 8,
      }}>
        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20,
          paddingHorizontal: 10, paddingVertical: 6, gap: 6,
          borderWidth: 1, borderColor: `${accent}20`,
        }}>
          {/* Icône loupe Unicode — pas de dépendance */}
          <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher…"
            placeholderTextColor="rgba(255,255,255,0.28)"
            style={{ flex: 1, color: '#F5F5F5', fontSize: 13, paddingVertical: 0 }}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} style={{ padding: 2 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>✕</Text>
            </Pressable>
          )}
        </View>
        <Pressable onPress={onClose} style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: 'rgba(255,255,255,0.06)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <X size={15} color="rgba(255,255,255,0.45)" />
        </Pressable>
      </View>

      {/* ── Onglets catégories (ScrollView horizontal) ── */}
      {!search.trim() && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, gap: 4, paddingBottom: 8 }}
        >
          {EMOJI_CATEGORIES.map((cat, ci) => {
            const isActive = activeCat === ci;
            // Masquer "Récents" si vide
            if (ci === 0 && recents.length === 0) return null;
            return (
              <Pressable
                key={ci}
                onPress={() => setActiveCat(ci)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
                  backgroundColor: isActive ? `${accent}30` : 'rgba(255,255,255,0.05)',
                  borderWidth: 1, borderColor: isActive ? `${accent}60` : 'transparent',
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                }}
              >
                <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                <Text style={{
                  color: isActive ? accent : 'rgba(255,255,255,0.45)',
                  fontSize: 11, fontWeight: isActive ? '700' : '400',
                }}>
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* ── Grille emojis ── */}
      <ScrollView
        style={{ height: 196 }}
        contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {rows.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Aucun résultat</Text>
          </View>
        ) : rows.map((row, ri) => (
          <React.Fragment key={ri}>
          <View style={{ flexDirection: 'row' }}>
            {row.map(emoji => (
              <Pressable
                key={emoji}
                onPress={() => handlePick(emoji)}
                style={({ pressed }) => ({
                  flex: 1, alignItems: 'center', paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: pressed ? `${accent}28` : 'transparent',
                  transform: [{ scale: pressed ? 0.82 : 1 }],
                })}
              >
                <Text style={{ fontSize: 26, lineHeight: 32, includeFontPadding: false } as any}>
                  {emoji}
                </Text>
              </Pressable>
            ))}
          </View>
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function ChatConversation() { 
  const insets = useSafeAreaInsets();
  const { px, avatarSize: _avatarSize, isTablet, isDesktop, isLargeDesktop: _isLargeDesktop, isFullHD: _isFullHD, is4K: _is4K, isCinema: _isCinema, isCar: _isCar,
          captionSize, bodySize, h3Size, iconSize, gap, tapTarget: _tapTarget, contentMaxWidth: _contentMaxWidth,
          cardRadius: _cardRadius  } = useResponsive();

  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [matchInfo, setMatchInfo] = useState<Match | null>(null);
  const [text,      setText]      = useState('');
  const [isWhisper, setIsWhisper] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [myUserId,  setMyUserId]  = useState('');
  // Message sélectionné pour confirmation de suppression
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Mute actif → envoi bloqué
  const [isMuted,      setIsMuted]      = useState(false);
  const [muteExpiry,   setMuteExpiry]   = useState<string | null>(null);
  // Blocage bidirectionnel côté client — double protection (RLS fait le vrai blocage DB)
  const [isBlockedChat, setIsBlockedChat] = useState(false);
  // Erreur d'envoi inline + compteur caractères
  const [sendError, setSendError] = useState('');
  const charCount = text.length;
  const charOverLimit = charCount > MSG_MAX_LENGTH;
  // Quota progressif messages
  const [msgQuota, setMsgQuota] = useState<import('@/lib/amour-api').MessageQuota | null>(null);

  // ── Adaptation d'environnement (transport + réseau) ──────────────────────
  const env = useEnvironmentAdaptation(true);
  // Pagination cursor-based
  const [hasMore,      setHasMore]      = useState(false);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const oldestCursorRef = useRef<string | undefined>(undefined);

  // Vocal — guard Web : expo-audio non disponible sur Web
  const isWeb = process.env.EXPO_OS === 'web';
  const [isRecording,     setIsRecording]     = useState(false);
  const [voiceUri,        setVoiceUri]        = useState<string | null>(null);
  const [voiceBlob,       setVoiceBlob]       = useState<Blob | null>(null); // Web uniquement
  const [uploadingVoice,  setUploadingVoice]  = useState(false);
  // Hook recorder appelé inconditionnellement (règle des hooks React)
  // Sur Web il ne sera simplement jamais utilisé (guard isWeb dans les handlers)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // BUG FIX Web : MediaRecorder pour enregistrement vocal dans le navigateur
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);

  const listRef  = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const ACCENT = matchInfo?.partner?.empreinte_couleur || '#FFD700';

  // ── userId (une seule fois au mount) ────────────────────
  useEffect(() => {
    (async () => {
      const uid = await getCurrentUserId();
      if (uid) setMyUserId(uid);
    })();
  }, []);

  // ── Vérification mute — useFocusEffect pour re-vérifier à chaque retour ──
  // Expire aussi la sanction si expires_at est dépassé
  useFocusEffect(useCallback(() => {
    if (!myUserId) return;
    (async () => {
      // 1. Expirer le mute si échu côté DB
      void Promise.resolve(supabase.rpc('expire_own_sanction'));
      // 2. Vérifier s'il reste un mute vraiment actif
      const { data: mute } = await supabase
        .from('sanctions')
        .select('id, expires_at')
        .eq('user_id', myUserId)
        .eq('type', 'mute')
        .eq('status', 'active')
        .maybeSingle();
      // Double-check côté client : si expires_at dépassé, ne pas bloquer
      const stillMuted = !!mute && (
        mute.expires_at === null ||
        new Date(mute.expires_at).getTime() > Date.now()
      );
      setIsMuted(stillMuted);
      setMuteExpiry(stillMuted ? (mute?.expires_at ?? null) : null);
      // 3. Vérification blocage bidirectionnel côté client
      // (la RLS bloque déjà côté DB — ceci sert l'UX immédiate)
      if (id) {
        const blocked = await isBlocked(id).catch(() => false);
        setIsBlockedChat(blocked);
      }
    })();
  }, [myUserId, id]));

  // ── Charger données ──────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    oldestCursorRef.current = undefined;
    const [msgs, matches] = await Promise.all([getMessages(id), getMyMatches()]);
    setMessages(msgs);
    // Si on reçoit exactement PAGE_SIZE messages, il peut y en avoir de plus anciens
    setHasMore(msgs.length >= MESSAGES_PAGE_SIZE);
    if (msgs.length > 0) oldestCursorRef.current = msgs[0].created_at;

    // Chercher le partenaire : d'abord dans getMyMatches, sinon via le match direct en DB
    let found = matches.find(m => m.id === id) ?? null;
    if (!found) {
      const uid = await getCurrentUserId();
      if (uid) {
        const { supabase } = await import('@/client/supabase');
        const { data: raw } = await supabase
          .from('matches')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (raw) {
          const partnerId = raw.user1_id === uid ? raw.user2_id : raw.user1_id;
          const { data: partner } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', partnerId)
            .maybeSingle();
          found = { ...raw, source: 'match' as const, partner: partner ?? undefined };
        }
      }
    }

    setMatchInfo(found);
    setLoading(false);
    // Marquer les messages reçus comme lus
    markMessagesRead(id).catch(() => {});
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
    // Charger le quota de messages (progressif J1/J2/J3+)
    if (id) {
      const { getMessageQuota } = await import('@/lib/amour-api');
      getMessageQuota(id).then(setMsgQuota).catch(() => {});
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ── Charger les messages plus anciens (scroll vers le haut) ──
  const loadMoreMessages = useCallback(async () => {
    if (!id || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const older = await getMessages(id, oldestCursorRef.current);
    if (older.length === 0) { setHasMore(false); setLoadingMore(false); return; }
    setHasMore(older.length >= MESSAGES_PAGE_SIZE);
    oldestCursorRef.current = older[0].created_at;
    setMessages((prev: Message[]) => [...older, ...prev]);
    setMessages((prev: typeof messages) => [...older, ...prev]);
    setLoadingMore(false);
  }, [id, loadingMore, hasMore]);

  // ── Realtime messages ────────────────────────────────────
  // Stratégie scalable 1M+ users :
  //   • Realtime WebSocket Supabase — zéro polling, zéro requête DB périodique
  //   • Fallback automatique si Realtime échoue (réseau dégradé, WebSocket bloqué) :
  //     polling léger 15s uniquement en mode dégradé (vs 4s avant = -73% requêtes)
  //   • Canal propre par conversation : créé au mount, détruit au unmount
  //   • Un seul useEffect — élimine la concurrence Realtime+polling simultanés
  useEffect(() => {
    if (!id) return;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    let realtimeOk = false;

    const handleNewMsg = () => {
      getMessages(id).then(msgs => {
        setMessages((prev: typeof messages) => {
          const existingIds = new Set(prev.map((m: any) => m.id));
          const fresh = msgs.filter(m => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
          markMessagesRead(id).catch(() => {});
          return [...prev, ...fresh];
        });
      }).catch(() => {});
    };

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${id}` },
        () => { realtimeOk = true; handleNewMsg(); }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          realtimeOk = true;
          // Realtime opérationnel → annuler tout fallback en cours
          if (fallbackInterval) { clearInterval(fallbackInterval); fallbackInterval = null; }
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Realtime indisponible → polling dégradé 15s (vs 4s avant)
          realtimeOk = false;
          if (!fallbackInterval) {
            fallbackInterval = setInterval(() => { if (!realtimeOk) handleNewMsg(); }, 15_000);
          }
        }
      });

    return () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
      void supabase.removeChannel(channel);
    };
  }, [id]);

  // ── Envoyer texte ────────────────────────────────────────
  const handleSend = async () => {
    const content = text.trim();
    if ((!content && !voiceUri && !voiceBlob) || !id || sending || uploadingVoice) return;
    // Validation longueur avant envoi — évite l'erreur DB check_violation
    if (content && content.length > MSG_MAX_LENGTH) {
      setSendError(`Message trop long (${content.length}/${MSG_MAX_LENGTH} caractères).`);
      return;
    }
    setSendError('');
    if (process.env.EXPO_OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setSending(true);
    try {
      if (voiceBlob) {
        // BUG FIX Web : upload depuis un Blob (MediaRecorder) au lieu d'un URI local
        setUploadingVoice(true);
        const publicUrl = await uploadVoiceMessageWeb(voiceBlob);
        setUploadingVoice(false);
        if (publicUrl) await sendMessage(id, `[vocal:${publicUrl}]`, isWhisper);
        // Libérer le blob URL pour éviter la fuite mémoire (Web uniquement)
        if (voiceUri && voiceUri.startsWith('blob:')) URL.revokeObjectURL(voiceUri);
        setVoiceBlob(null);
        setVoiceUri(null);
      } else if (voiceUri) {
        setUploadingVoice(true);
        const publicUrl = await uploadVoiceMessage(voiceUri);
        setUploadingVoice(false);
        if (publicUrl) await sendMessage(id, `[vocal:${publicUrl}]`, isWhisper);
        setVoiceUri(null);
      } else {
        await sendMessage(id, content, isWhisper);
        setText('');
      }
      setShowEmoji(false);
      // triggerChallengeAction APRÈS confirmation du sendMessage — évite faux incrément si réseau fail
      // Incrémenter défi send_message en arrière-plan
      triggerChallengeAction('send_message').catch(() => {});
      // Recharger immédiatement après envoi
      const fresh = await getMessages(id);
      setMessages(fresh);
      // Rafraîchir le quota (le compteur sent_today a augmenté)
      const { getMessageQuota } = await import('@/lib/amour-api');
      getMessageQuota(id).then(setMsgQuota).catch(() => {});
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e) {
      console.error('[Chat] handleSend échoué', e);
      const msg = (e instanceof Error) ? e.message : '';
      if (msg === '__quota_j1__') {
        setSendError('✨ Prenez votre temps — 10 messages max le 1er jour. Revenez demain !');
      } else if (msg === '__quota_j2__') {
        setSendError('💫 20 messages pour aujourd\'hui — la patience rend les liens plus forts !');
      } else if (msg === '__icebreaker__') {
        setSendError('💬 Votre 1er message doit faire au moins 15 caractères — présentez-vous vraiment !');
      } else {
        setSendError('Envoi échoué. Vérifiez votre connexion.');
      }
    } finally {
      setSending(false);
    }
  };

  // ── Suppression message ──────────────────────────────────
  const handleDelete = async (msgId: string) => {
    setConfirmDeleteId(null);
    const ok = await deleteMessage(msgId);
    if (ok) setMessages((prev: Message[]) => prev.filter((m: Message) => m.id !== msgId));
  };

  // ── Enregistrement vocal (natif uniquement) ──────────────
  // Auto-stop à MAX_RECORD_SECONDS pour éviter les fichiers géants
  const MAX_RECORD_SECONDS = 120; // 2 minutes max
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRecording = async () => {
    if (isWeb) return;
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      setVoiceUri(null);
      setShowEmoji(false);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      // Auto-stop sécurité natif
      recordTimerRef.current = setTimeout(() => stopRecording(), MAX_RECORD_SECONDS * 1000);
    } catch (e) {
      console.error('[startRecording]', e);
    }
  };

  const stopRecording = async () => {
    if (isWeb) return;
    if (recordTimerRef.current) { clearTimeout(recordTimerRef.current); recordTimerRef.current = null; }
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) setVoiceUri(uri);
      setIsRecording(false);
    } catch (e) {
      console.error('[stopRecording]', e);
      setIsRecording(false);
    }
  };

  // BUG FIX Web : enregistrement vocal via MediaRecorder API
  // Compatible : Chrome 47+, Firefox 25+, Safari 14.1+, Edge 79+, Android Chrome 47+
  const startRecordingWeb = useCallback(async () => {
    if (!isWeb) return;
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      console.warn('[startRecordingWeb] getUserMedia non disponible');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      console.warn('[startRecordingWeb] MediaRecorder non supporté (Safari < 14.1 ?)');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // BUG FIX Safari : audio/webm non supporté → préférer audio/mp4 ou audio/ogg
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        // Validation taille blob : max 8 MB (évite upload > limit bucket 10 MB)
        const MAX_BLOB_BYTES = 8 * 1024 * 1024;
        if (blob.size > MAX_BLOB_BYTES) {
          console.warn('[startRecordingWeb] blob trop grand:', blob.size, '> 8 MB — annulé');
          stream.getTracks().forEach(t => t.stop());
          setIsRecording(false);
          setSendError('Message vocal trop long. Maximum 2 minutes.');
          return;
        }
        const url  = URL.createObjectURL(blob);
        setVoiceBlob(blob);
        setVoiceUri(url);
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setVoiceBlob(null);
      setVoiceUri(null);
      setShowEmoji(false);
      setIsRecording(true);
      // Auto-stop Web à 120s pour éviter les blobs géants
      recordTimerRef.current = setTimeout(() => stopRecordingWeb(), MAX_RECORD_SECONDS * 1000);
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === 'NotAllowedError') {
        console.warn('[startRecordingWeb] Permission micro refusée');
      } else {
        console.error('[startRecordingWeb]', e);
      }
    }
  }, [isWeb]);

  const stopRecordingWeb = useCallback(() => {
    if (!isWeb || !mediaRecorderRef.current) return;
    if (recordTimerRef.current) { clearTimeout(recordTimerRef.current); recordTimerRef.current = null; }
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
  }, [isWeb]);

  // ── Rendu d'un message ───────────────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    const isMine  = item.sender_id === myUserId;
    const isVoice = typeof item.content === 'string'
      && item.content.startsWith('[vocal:')
      && item.content.endsWith(']');
    const vUri    = isVoice ? item.content.slice(7, -1) : null;
    const isPendingDelete = confirmDeleteId === item.id;

    return (
      <Pressable
        onPress={() => {}}
        onLongPress={() => isMine && setConfirmDeleteId(isPendingDelete ? null : item.id)}
        delayLongPress={400}
        style={{
          alignSelf: isMine ? 'flex-end' : 'flex-start',
          maxWidth: isDesktop ? '60%' : isTablet ? '70%' : '80%',
          marginVertical: 3, marginHorizontal: px,
        }}
      >
        {/* Bulle de l'expéditeur (côté gauche = photo partenaire) */}
        {!isMine && (
          <View style={{ marginBottom: 4 }}>
            {matchInfo?.partner?.photo_url ? (
              <Image
                source={{ uri: matchInfo.partner.photo_url }}
                style={{ width: 24, height: 24, borderRadius: 12 }}
                contentFit="cover"
              />
            ) : (
              <View style={{
                width: 24, height: 24, borderRadius: 12,
                backgroundColor: `${ACCENT}25`,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: iconSize * 0.8 }}>🌟</Text>
              </View>
            )}
          </View>
        )}

        <LinearGradient
          colors={isMine
            ? ['rgba(114,47,55,0.8)', 'rgba(75,0,130,0.7)']
            : ['rgba(75,0,130,0.3)',  'rgba(20,10,40,0.65)']}
          style={{
            borderRadius: 20,
            borderBottomRightRadius: isMine ? 4 : 20,
            borderBottomLeftRadius:  isMine ? 20 : 4,
            borderWidth: isPendingDelete ? 1.5 : 1,
            borderColor: isPendingDelete
              ? 'rgba(255,80,80,0.6)'
              : isMine ? `${ACCENT}30` : 'rgba(255,255,255,0.07)',
            overflow: 'hidden',
          }}
        >
          {item.is_whisper && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              paddingHorizontal: px, paddingTop: 8, paddingBottom: 2,
            }}>
              <Eye size={10} color="rgba(255,182,193,0.6)" />
              <Text style={{ color: 'rgba(255,182,193,0.6)', fontSize: captionSize * 0.85, fontStyle: 'italic' }}>
                Murmure
              </Text>
            </View>
          )}

          {isVoice && vUri ? (
            <VoiceMessagePlayer uri={vUri} isMine={isMine} accent={ACCENT} />
          ) : (
            <Text style={{
              color: 'rgba(255,255,255,0.92)', fontSize: 16, lineHeight: 22,
              paddingHorizontal: px,
              paddingTop: item.is_whisper ? 2 : 10,
              paddingBottom: 6,
            }}>
              {item.content}
            </Text>
          )}

          <View style={{
            flexDirection: 'row', alignItems: 'center',
            justifyContent: isMine ? 'flex-end' : 'flex-start',
            paddingHorizontal: px, paddingBottom: 8, gap: 4,
          }}>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16 }}>
              {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {/* Indicateur lu/envoyé */}
            {isMine && (
              <Text style={{ fontSize: captionSize * 0.8, color: item.read_at ? '#64FFB4' : 'rgba(255,255,255,0.25)' }}>
                {item.read_at ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </LinearGradient>

        {/* Confirmation suppression */}
        {isPendingDelete && (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 8,
            marginTop: 4, alignSelf: 'flex-end',
          }}>
            <Pressable
              onPress={() => setConfirmDeleteId(null)}
              style={{
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
                backgroundColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: bodySize }}>Annuler</Text>
            </Pressable>
            <Pressable
              onPress={() => handleDelete(item.id)}
              style={{
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: 'rgba(255,60,60,0.18)',
                borderWidth: 1, borderColor: 'rgba(255,60,60,0.35)',
              }}
            >
              <Trash2 size={12} color="rgba(255,100,100,0.9)" />
              <Text style={{ color: 'rgba(255,100,100,0.9)', fontSize: captionSize, fontWeight: '700' }}>
                Supprimer
              </Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  // ── Layout ───────────────────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      <CosmicBackground>
        {/* Bannière environnement — réseau faible / transport détecté */}
        {(env.alert || (env.transport !== 'inconnu' && env.transport !== 'pieton' && env.transport !== 'velo')) && (
          <View style={{
            paddingHorizontal: px, paddingVertical: 6,
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: env.networkQuality === 'coupee' ? 'rgba(200,40,40,0.85)'
              : env.networkQuality === 'faible' ? 'rgba(200,110,0,0.82)'
              : 'rgba(40,40,100,0.55)',
            borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
          }}>
            <Text style={{ fontSize: 14 }}>
              {networkQualityLabel(env.networkQuality).emoji}
            </Text>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 }}>
              {env.alert
                ? env.alert
                : `${transportLabel(env.transport)} — réseau ${networkQualityLabel(env.networkQuality).label.toLowerCase()}`}
            </Text>
          </View>
        )}

        {/* En-tête — photo réelle du partenaire */}
        <View style={{
          paddingTop: insets.top + 8, paddingHorizontal: px, paddingBottom: 12,
          flexDirection: 'row', alignItems: 'center', gap: 12,
          borderBottomWidth: 1, borderBottomColor: `${ACCENT}18`,
        }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <ChevronLeft size={24} color={ACCENT} />
          </Pressable>
          {/* Avatar partenaire — photo réelle ou dégradé couleur empreinte */}
          {matchInfo?.partner?.photo_url ? (
            <Image
              source={{ uri: matchInfo.partner.photo_url }}
              style={{
                width: isTablet ? 52 : 42,
                height: isTablet ? 52 : 42,
                borderRadius: isTablet ? 26 : 21,
                borderWidth: 2,
                borderColor: ACCENT,
              }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <LinearGradient
              colors={[ACCENT, `${ACCENT}55`]}
              style={{
                width: isTablet ? 52 : 42, height: isTablet ? 52 : 42,
                borderRadius: isTablet ? 26 : 21,
                borderWidth: 2, borderColor: ACCENT,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 20 }}>🌟</Text>
            </LinearGradient>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: ACCENT, fontWeight: '900', fontSize: 16 }}>
              {matchInfo?.partner?.prenom || 'Âme mystérieuse'}
            </Text>
            <Text style={{ color: ACCENT, fontWeight: '900', fontSize: h3Size }}>
              {matchInfo?.partner?.prenom || 'Âme mystérieuse'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: captionSize }}>
              ✦ {matchInfo?.compatibilite ?? '—'}% compatibilité cosmique
            </Text>
          </View>
          {/* Bouton appel vidéo */}
          <Pressable
            onPress={() => {
              const partnerId = matchInfo?.partner?.id;
              const partnerName = matchInfo?.partner?.prenom ?? 'Votre âme';
              if (partnerId) {
                router.push(
                  `/(app)/video-call/new?callee_id=${partnerId}&callee_name=${encodeURIComponent(partnerName)}` as any
                );
              }
            }}
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(199,125,255,0.15)',
              borderWidth: 1, borderColor: 'rgba(199,125,255,0.35)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Video size={17} color="#C77DFF" />
          </Pressable>

          <Pressable
            onPress={() => setIsWhisper((v: boolean) => !v)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
              backgroundColor: isWhisper ? `${ACCENT}20` : 'transparent',
              borderWidth: 1,
              borderColor: isWhisper ? ACCENT : 'rgba(255,255,255,0.12)',
            }}
          >
            <Eye size={13} color={isWhisper ? ACCENT : 'rgba(255,255,255,0.35)'} />
            <Text style={{
              color: isWhisper ? ACCENT : 'rgba(255,255,255,0.35)',
              fontSize: captionSize, fontWeight: '700',
            }}>
              Murmure
            </Text>
          </Pressable>
        </View>

        {/* Zone messages + barre + emoji — KeyboardAvoidingView désactivé sur Web
            BUG FIX Web : behavior="height" casse le layout sur navigateurs desktop/mobile */}
        <KeyboardAvoidingView
          behavior={process.env.EXPO_OS === 'ios' ? 'padding' : process.env.EXPO_OS === 'web' ? undefined : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          {/* Messages */}
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={ACCENT} size="large" />
            </View>
          ) : messages.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <Text style={{ color: ACCENT, fontWeight: '900', fontSize: h3Size, textAlign: 'center', marginBottom: gap * 0.5 }}>
                Votre histoire commence ici
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center', fontStyle: 'italic', lineHeight: 22 }}>
                Le premier mot est toujours le plus beau.{'\n'}Commencez à écrire votre conte étoilé…
              </Text>
            </View>
          ) : (
            <FlatList
              // @ts-ignore
              ref={listRef as any}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{ paddingVertical: 12 }}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              showsVerticalScrollIndicator={false}
            overScrollMode="never"
              bounces={false}
              // Pagination : charger les messages plus anciens quand on atteint le haut
              onEndReachedThreshold={0.15}
              onEndReached={loadMoreMessages}
              ListHeaderComponent={loadingMore
                ? <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 8 }} />
                : hasMore
                  ? <Pressable onPress={loadMoreMessages} style={{ alignItems: 'center', paddingVertical: 10 }}>
                      <Text style={{ color: `${ACCENT}99`, fontSize: captionSize }}>Charger les messages précédents</Text>
                    </Pressable>
                  : null}
            />
          )}

          {/* Preview vocal prêt */}
          {voiceUri && !isRecording && (
            <View style={{
              marginHorizontal: px, marginBottom: 6,
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: `${ACCENT}12`,
              borderRadius: 14, borderWidth: 1, borderColor: `${ACCENT}25`,
              paddingHorizontal: px, paddingVertical: 10,
            }}>
              <Text style={{ fontSize: 20 }}>🎙</Text>
              <Text style={{ color: ACCENT, fontSize: bodySize, flex: 1, fontWeight: '700' }}>
                {uploadingVoice ? 'Envoi en cours…' : 'Message vocal prêt'}
              </Text>
              {!uploadingVoice && (
                <Pressable onPress={() => setVoiceUri(null)} style={{ padding: 4 }}>
                  <X size={16} color="rgba(255,100,100,0.7)" />
                </Pressable>
              )}
            </View>
          )}

          {/* ── Bannière blocage — remplace la barre de saisie si bloqué ── */}
          {isBlockedChat ? (
            <View style={{
              paddingHorizontal: px / 2, paddingVertical: 14,
              borderTopWidth: 1, borderTopColor: 'rgba(100,100,180,0.25)',
              backgroundColor: 'rgba(20,20,60,0.45)',
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <Text style={{ fontSize: 22 }}>🚫</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '800' }}>
                  Conversation bloquée
                </Text>
                <Text style={{ color: '#A78BFA', fontSize: bodySize, fontWeight: '800' }}>
                  Conversation bloquée
                </Text>
                <Text style={{ color: 'rgba(167,139,250,0.65)', fontSize: captionSize, marginTop: gap * 0.1 }}>
                  Vous avez bloqué cet utilisateur ou il vous a bloqué.{'\n'}
                  Rendez-vous sur son profil pour débloquer.
                </Text>
              </View>
            </View>
          ) : isMuted ? (
            <View style={{
              paddingHorizontal: px / 2, paddingVertical: 14,
              borderTopWidth: 1, borderTopColor: 'rgba(180,60,60,0.25)',
              backgroundColor: 'rgba(100,20,20,0.35)',
              flexDirection: 'row', alignItems: 'center', gap: 10,
            }}>
              <Text style={{ fontSize: 22 }}>🔇</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FC8181', fontSize: 13, fontWeight: '800' }}>
                  Envoi de messages désactivé
                </Text>
                <Text style={{ color: '#FC8181', fontSize: bodySize, fontWeight: '800' }}>
                  Envoi de messages désactivé
                </Text>
                <Text style={{ color: 'rgba(252,129,129,0.65)', fontSize: captionSize, marginTop: gap * 0.1 }}>
                  {muteExpiry
                    ? `Mute actif jusqu'au ${new Date(muteExpiry).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`
                    : 'Vous êtes actuellement muté(e)'}
                  {' '}· Complétez votre mission pour être rétabli(e).
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/(app)/rehabilitation' as never)}
                style={{ backgroundColor: 'rgba(252,129,129,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(252,129,129,0.3)' }}
              >
                <Text style={{ color: '#FC8181', fontSize: captionSize, fontWeight: '800' }}>Voir →</Text>
              </Pressable>
            </View>
          ) : (
          /* Barre de saisie */
          <View style={{
            paddingHorizontal: px / 2, paddingVertical: 8,
            paddingBottom: showEmoji ? 4 : 8,
            borderTopWidth: 1, borderTopColor: `${ACCENT}15`,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
              {/* Bouton emoji */}
              <Pressable
                onPress={() => {
                  setShowEmoji((v: boolean) => !v);
                  if (!showEmoji) inputRef.current?.blur();
                }}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: showEmoji ? `${ACCENT}22` : 'rgba(255,255,255,0.06)',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: showEmoji ? `${ACCENT}45` : 'transparent',
                }}
              >
                <Smile size={20} color={showEmoji ? ACCENT : 'rgba(255,255,255,0.45)'} />
              </Pressable>

              {/* Input */}
              <LinearGradient
                colors={['rgba(75,0,130,0.35)', 'rgba(13,5,30,0.55)']}
                style={{
                  flex: 1, borderRadius: 22, borderWidth: 1,
                  borderColor: `${ACCENT}22`,
                  paddingHorizontal: px, paddingVertical: 2,
                }}
              >
                <TextInput
                  // @ts-ignore
                  ref={inputRef as any}
                  value={text}
                  onChangeText={t => {
                    // Bloquer la saisie au-delà de MSG_MAX_LENGTH + 50 (buffer UX)
                    if (t.length <= MSG_MAX_LENGTH + 50) setText(t);
                    setSendError('');
                  // Ne ferme le picker que si l'utilisateur tape manuellement
                  // (pas lors de l'insertion d'un emoji via onPick — géré séparément)
                  if (showEmoji && t.length === text.length + 1) setShowEmoji(false);
                  }}
                  onFocus={() => setShowEmoji(false)}
                  placeholder={isRecording
                    ? '🔴 Enregistrement en cours…'
                    : voiceUri
                      ? '🎙 Vocal prêt — appuyez sur ➤'
                      : messages.filter(m => m.sender_id === myUserId).length === 0
                        ? '✨ Présentez-vous vraiment (min. 15 caractères)…'
                        : 'Votre plume d\'or…'}
                  placeholderTextColor={
                    isRecording ? 'rgba(255,80,80,0.6)' : 'rgba(255,255,255,0.28)'
                  }
                  multiline
                  editable={!isRecording && !voiceUri}
                  autoCorrect={false}
                  autoCapitalize="sentences"
                  style={{
                    color: charOverLimit ? '#FF6B6B' : '#F5F5F5',
                    fontSize: 16, maxHeight: 100, paddingVertical: 10,
                  }}
                />
              </LinearGradient>

              {/* Bouton vocal — natif : expo-audio / Web : MediaRecorder API */}
              {!isWeb ? (
                <Pressable
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={!!voiceUri}
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: isRecording ? 'rgba(255,60,60,0.25)' : 'rgba(255,255,255,0.06)',
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: isRecording ? 'rgba(255,60,60,0.5)' : 'transparent',
                    opacity: voiceUri && !isRecording ? 0.35 : 1,
                  }}
                >
                  {isRecording
                    ? <MicOff size={18} color="rgba(255,80,80,0.9)" />
                    : <Mic    size={18} color="rgba(255,255,255,0.45)" />}
                </Pressable>
              ) : (
                /* BUG FIX Web : bouton actif si MediaRecorder disponible (Chrome/Firefox/Safari 14.1+) */
                typeof MediaRecorder !== 'undefined' ? (
                  <Pressable
                    onPress={isRecording ? stopRecordingWeb : startRecordingWeb}
                    disabled={!!(voiceUri && !isRecording)}
                    style={{
                      width: 40, height: 40, borderRadius: 20,
                      backgroundColor: isRecording ? 'rgba(255,60,60,0.25)' : 'rgba(255,255,255,0.06)',
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: isRecording ? 'rgba(255,60,60,0.5)' : 'transparent',
                      opacity: voiceUri && !isRecording ? 0.35 : 1,
                    }}
                  >
                    {isRecording
                      ? <MicOff size={18} color="rgba(255,80,80,0.9)" />
                      : <Mic    size={18} color="rgba(255,255,255,0.45)" />}
                  </Pressable>
                ) : (
                  /* Navigateur trop ancien (Safari < 14.1) → bouton grisé */
                  <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    alignItems: 'center', justifyContent: 'center',
                    opacity: 0.3,
                  }}>
                    <Mic size={18} color="rgba(255,255,255,0.3)" />
                  </View>
                )
              )}

              {/* Bouton envoyer */}
              <Pressable
                onPress={handleSend}
                disabled={sending || uploadingVoice || (!text.trim() && !voiceUri) || charOverLimit}
                style={{
                  width: 44, height: 44, borderRadius: 22,
                  backgroundColor: (text.trim() || voiceUri) && !charOverLimit ? ACCENT : `${ACCENT}20`,
                  alignItems: 'center', justifyContent: 'center',
                  opacity: (sending || uploadingVoice || charOverLimit) ? 0.5 : 1,
                }}
              >
                <Send
                  size={18}
                  color={(text.trim() || voiceUri) && !charOverLimit ? '#08001a' : `${ACCENT}35`}
                />
              </Pressable>
            </View>

            {/* Quota progressif — affiché uniquement J1 et J2 */}
            {msgQuota && msgQuota.daily_limit !== null && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingHorizontal: 6, marginTop: 4,
              }}>
                {[...Array(msgQuota.daily_limit)].map((_, i) => (
                  <React.Fragment key={i}>
                    <View style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: i < msgQuota.sent_today
                        ? `${ACCENT}90`
                        : 'rgba(255,255,255,0.15)',
                    }} />
                  </React.Fragment>
                ))}
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginLeft: 4 }}>
                  {msgQuota.remaining === 0
                    ? '⏳ Quota atteint — revenez demain'
                    : `${msgQuota.remaining} message${(msgQuota.remaining ?? 0) > 1 ? 's' : ''} restant${(msgQuota.remaining ?? 0) > 1 ? 's' : ''} aujourd'hui`}
                </Text>
              </View>
            )}

            {/* Compteur caractères + erreur inline */}
            {(charCount > MSG_MAX_LENGTH * 0.8 || sendError.length > 0) && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 4 }}>
                {sendError.length > 0
                  ? <Text style={{ color: '#FF6B6B', fontSize: captionSize }}>{sendError}</Text>
                  : <Text style={{ color: 'transparent', fontSize: captionSize }}> </Text>}
                <Text style={{ color: charOverLimit ? '#FF6B6B' : 'rgba(255,255,255,0.55)', fontSize: captionSize }}>
                  {charCount}/{MSG_MAX_LENGTH}
                </Text>
              </View>
            )}
          </View>
          )} {/* fin ternaire isMuted */}

          {/* Emoji picker — en bas, hors du scroll */}
          {showEmoji && (
            <EmojiPicker
              onPick={e => setText((t: string) => t + e)}
              onClose={() => setShowEmoji(false)}
              accent={ACCENT}
            />
          )}
        </KeyboardAvoidingView>
      </CosmicBackground>
    </View>
  );
}
