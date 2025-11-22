import { useEffect, useState } from "react";
import {
  isWebsocketChannelActive,
  websocketRoomCallback,
  websocketChannelCallback,
} from "../composables/realtime/websocketChannel";

export function useWebsocketChannelActive(): boolean {
  const [state, setState] = useState(() => isWebsocketChannelActive());
  useEffect(() => {
    return websocketChannelCallback.bind((val) => {
      setState(val);
    });
  }, []);

  return state;
}

export function useWebsocketRoom(): { count: number } {
  const [state, setState] = useState(() => ({ count: 0 }));
  useEffect(() => {
    return websocketRoomCallback.bind((val) => {
      setState(val);
    });
  }, []);

  return state;
}
