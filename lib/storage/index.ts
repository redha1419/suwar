import "server-only";
import type { StorageProvider } from "./provider";
import { r2Provider } from "./r2";
import { localProvider } from "./local";

export const usingR2 = Boolean(process.env.R2_ACCOUNT_ID);

export const storage: StorageProvider = usingR2 ? r2Provider : localProvider;

export type { StorageProvider };
