import { newCallback } from "../composables/reactives";
import { UserSetting } from "../models";

type Option = {
  initialValue?: UserSetting;
};

export function newUserSettingStore(option: Option) {
  const callback = newCallback();
  let state: Readonly<UserSetting> = option.initialValue ?? {};

  function patchState(patch: Partial<UserSetting>) {
    state = { ...state, ...patch };
    callback.dispatch();
  }

  return {
    watch: callback.bind,
    getState: () => state,
    patchState,
  };
}
export type UserSettingStore = ReturnType<typeof newUserSettingStore>;
