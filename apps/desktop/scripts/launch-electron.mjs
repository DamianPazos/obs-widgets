import { spawn } from 'node:child_process';
import electronPath from 'electron';

/**
 * Lanza Electron limpiando `ELECTRON_RUN_AS_NODE`.
 *
 * Los terminales basados en Electron (p. ej. la terminal integrada de VS Code)
 * suelen exportar `ELECTRON_RUN_AS_NODE=1`, lo que haría que nuestra app corra
 * como Node puro (sin ventana, con `require('electron')` devolviendo una ruta).
 * Al removerla del entorno del hijo, Electron arranca como app de escritorio.
 */
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
});

child.on('close', (code) => process.exit(code ?? 0));
