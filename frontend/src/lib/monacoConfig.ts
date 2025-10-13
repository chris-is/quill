import { configureMonacoLoader } from '@sqlrooms/monaco-editor';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

// Configure Monaco Editor to use bundled workers instead of CDN
export function initializeMonaco() {
  configureMonacoLoader({
    monaco,
    workers: {
      default: editorWorker,
    },
  });
}
