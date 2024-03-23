import { createContext } from "react";
import { ToastMessage } from "../composables/states/types";

export const ToastMessageContext = createContext<ToastMessage[]>([]);
