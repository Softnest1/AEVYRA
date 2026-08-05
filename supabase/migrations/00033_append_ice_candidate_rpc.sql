
-- Fonction RPC atomique pour append ICE candidate sans race condition
-- Évite la lecture-réécriture du tableau entier qui perd des candidats si 2 appels simultanés
CREATE OR REPLACE FUNCTION append_ice_candidate(
  p_call_id uuid,
  p_field   text,
  p_candidate jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_field = 'caller_ice' THEN
    UPDATE video_calls
    SET caller_ice = caller_ice || jsonb_build_array(p_candidate)
    WHERE id = p_call_id;
  ELSIF p_field = 'callee_ice' THEN
    UPDATE video_calls
    SET callee_ice = callee_ice || jsonb_build_array(p_candidate)
    WHERE id = p_call_id;
  END IF;
END;
$$;

-- Autoriser les authentifiés à appeler cette fonction
GRANT EXECUTE ON FUNCTION append_ice_candidate(uuid, text, jsonb) TO authenticated;
