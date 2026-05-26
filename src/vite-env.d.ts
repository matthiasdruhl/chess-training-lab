/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_CHESSCOM_FIXTURE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
