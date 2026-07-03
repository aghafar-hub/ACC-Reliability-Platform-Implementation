/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ACC_API_MODE?: string;
  readonly VITE_ACC_APPS_SCRIPT_BASE_URL?: string;
  readonly VITE_ACC_MASTER_DATA_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
