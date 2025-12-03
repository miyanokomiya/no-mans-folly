import { useEffect, useState } from "react";
import { getWebsocketClient, websocketCallback, WSClient } from "../composables/realtime/websocketChannel";
import { UserAwareness } from "../composables/realtime/core";
import { ChronoCacheMap } from "../utils/stateful/cache";

export function useWebsocketClient(): WSClient | undefined {
  const [state, setState] = useState(() => getWebsocketClient());
  useEffect(() => {
    return websocketCallback.bind((...val) => {
      setState(val[0]);
    });
  }, []);

  return state;
}

export function useWebsocketAwareness(): ChronoCacheMap<string, UserAwareness> {
  const client = useWebsocketClient();
  const [state, setState] = useState<ChronoCacheMap<string, UserAwareness>>(
    client?.awareness.getCacheMap() ?? new Map(),
  );
  useEffect(() => {
    if (!client) return;

    return client.awareness.watch(() => {
      // Avoid using the same map instance.
      setState(new Map(client.awareness.getCacheMap()));
    });
  }, [client]);

  return state;
}
