// eslint-disable-next-line no-restricted-imports
import { customAlphabet } from "nanoid";

const alphabet = "abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet + alphabet.toUpperCase() + "0123456789-", 12);

// Avoid `crypto.randomUUID` due to HTTPS limitation
// Avoid number prefix for DOM ID
// This ID should be compatible with CSS selector and SVG ID
export const generateUuid: () => string = () => `n${nanoid()}`;
