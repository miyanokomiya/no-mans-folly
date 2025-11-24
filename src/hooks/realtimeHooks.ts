import { useEffect, useState } from "react";
import { getWebsocketClient, websocketCallback, WSClient } from "../composables/realtime/websocketChannel";

export function useWebsocketClient(): WSClient | undefined {
  const [state, setState] = useState(() => getWebsocketClient());
  useEffect(() => {
    return websocketCallback.bind((...val) => {
      setState(val[0]);
    });
  }, []);

  return state;
}
