const ua = window.navigator.userAgent.toLowerCase();

function isMac(): boolean {
  return ua.indexOf("mac os x") !== -1;
}

interface ModifiedEvent {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

interface ModifiedMouseEvent extends ModifiedEvent {
  button: number;
}

interface ModifiedKeyboardEvent extends ModifiedEvent {
  key: string;
}

export function isCtrlOrMeta(e: ModifiedEvent): boolean {
  return !!e.ctrlKey || !!e.metaKey;
}

export function isAltOrOpt(e: ModifiedEvent): boolean {
  return !!e.altKey;
}

export function getCtrlOrMetaStr(): string {
  return isMac() ? "Command" : "Ctrl";
}

export function switchClick(
  e: ModifiedEvent,
  callbacks: { plain?: () => void; shift?: () => void; ctrl?: () => void }
) {
  if (isCtrlOrMeta(e)) {
    callbacks.ctrl?.();
  } else if (e.shiftKey) {
    callbacks.shift?.();
  } else {
    callbacks.plain?.();
  }
}

export type MouseOptions = { shift?: boolean; ctrl?: boolean; button: number };

export function getMouseOptions(e: ModifiedMouseEvent): MouseOptions {
  return {
    shift: e.shiftKey,
    ctrl: isCtrlOrMeta(e),
    button: e.button,
  };
}

/**
 * When "key" is capital case, "shift" is true
 */
export type KeyOptions = { shift?: boolean; ctrl?: boolean; key: string };

export function getKeyOptions(e: ModifiedKeyboardEvent): KeyOptions {
  return {
    key: e.key,
    shift: e.shiftKey,
    ctrl: isCtrlOrMeta(e),
  };
}

export function isCopyPasteKeyevent(option: KeyOptions): boolean {
  return !option.shift && !!option.ctrl && (option.key === "v" || option.key === "c");
}
