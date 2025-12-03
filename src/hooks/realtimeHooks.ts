import { useEffect, useState } from "react";
import {
  awarenessCallback,
  getWebsocketClient,
  websocketCallback,
  WSClient,
} from "../composables/realtime/websocketChannel";
import { UserAwareness } from "../composables/realtime/core";

export function useWebsocketClient(): WSClient | undefined {
  const [state, setState] = useState(() => getWebsocketClient());
  useEffect(() => {
    return websocketCallback.bind((...val) => {
      setState(val[0]);
    });
  }, []);

  return state;
}

export function useWebsocketAwareness(): Map<string, UserAwareness> {
  const client = useWebsocketClient();
  const [state, setState] = useState<Map<string, UserAwareness>>(client?.awareness ?? new Map());
  useEffect(() => {
    if (!client) return;

    return awarenessCallback.bind(() => {
      // Avoid using the same map instance.
      setState(new Map(client.awareness));
    });
  }, [client]);

  return state;
}
