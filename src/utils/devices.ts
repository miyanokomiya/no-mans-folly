const ua = window.navigator.userAgent.toLowerCase();

const _isMac = ua.indexOf("mac os x") !== -1;
export function isMac(): boolean {
  return _isMac;
}

export type ModifierOptions = {
  // "Command" key is also treated as Ctrl key
  // When those keys need to be distinguished, check "command" value and use "isMac" in "devices.ts"
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  command?: boolean;
};

export interface ModifiedEvent {
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

export function getAltOrOptionStr(): string {
  return isMac() ? "Option" : "Alt";
}

export function switchClick(
  e: ModifiedEvent,
  callbacks: { plain?: () => void; shift?: () => void; ctrl?: () => void },
) {
  if (isCtrlOrMeta(e)) {
    callbacks.ctrl?.();
  } else if (e.shiftKey) {
    callbacks.shift?.();
  } else {
    callbacks.plain?.();
  }
}

export type MouseOptions = ModifierOptions & { button: number };

export function getModifierOptions(e: ModifiedEvent): ModifierOptions {
  return {
    shift: e.shiftKey,
    ctrl: isCtrlOrMeta(e),
    alt: isAltOrOpt(e),
    command: e.metaKey,
  };
}

export function getMouseOptions(e: ModifiedMouseEvent): MouseOptions {
  return {
    ...getModifierOptions(e),
    button: e.button,
  };
}

/**
 * When "key" is capital case, "shift" is true
 */
export type KeyOptions = ModifierOptions & { key: string };

export function getKeyOptions(e: ModifiedKeyboardEvent): KeyOptions {
  return {
    ...getModifierOptions(e),
    key: e.key,
  };
}

export function isCopyPasteKeyevent(option: KeyOptions): boolean {
  return !option.shift && !!option.ctrl && (option.key === "v" || option.key === "c");
}
