// Aevyra – Route d'initiation d'appel vidéo (appelant)
// Redirige vers [call_id].tsx après création de l'appel
import VideoCallPage from './[call_id]';

// Même page, callee_id fourni en param → initiateCall() au montage
export default function NewVideoCall() {
  return <VideoCallPage />;
}
