const { spawn } = require('child_process');
const cli = 'C:/Users/33352/AppData/Roaming/npm/node_modules/@cloudbase/cli/bin/tcb';
const payload = JSON.stringify([{ TableName: 'rooms', CommandType: 'COMMAND', Command: JSON.stringify({ create: 'rooms' }) }]);
const child = spawn(process.execPath, [cli, 'db', 'nosql', 'execute', '-e', 'a455-d3g2s3dt865d86640', '--command', payload, '--json'], { stdio: ['ignore', 'pipe', 'pipe'] });
let out = '', err = '';
child.stdout.on('data', d => out += d);
child.stderr.on('data', d => err += d);
child.on('close', () => { console.log(out.slice(0, 500)); if (err) console.log('ERR', err.slice(0, 300)); });
