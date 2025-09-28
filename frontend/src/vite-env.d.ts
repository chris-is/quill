/// <reference types="vite/client" />

declare module '*.wasm?url' {
  const src: string;
  export default src;
}

declare module '*.worker.js?url' {
  const src: string;
  export default src;
}