import { useEffect, useState } from "react";
import { isWebsocketChannelActive, websocketChannelCallback } from "../composables/realtime/websocketChannel";

export function useWebsocketChannelActive(): boolean {
  const [state, setState] = useState(() => isWebsocketChannelActive());
  useEffect(() => {
    return websocketChannelCallback.bind((val) => {
      setState(val);
    });
  }, []);

  return state;
}
