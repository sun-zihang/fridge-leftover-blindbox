const { spawn } = require('child_process');
const cli = 'C:/Users/33352/AppData/Roaming/npm/node_modules/@cloudbase/cli/bin/tcb';
const child = spawn(process.execPath, [cli, 'api', 'tcb', 'ModifyDatabaseACL', '--body', JSON.stringify({ EnvId: 'a455-d3g2s3dt865d86640', CollectionName: 'rooms', AclTag: 'ADMINWRITE' }), '--json', '-e', 'a455-d3g2s3dt865d86640', '--api-version', '2018-06-08'], { stdio: ['ignore', 'pipe', 'pipe'] });
let out = '', err = '';
child.stdout.on('data', d => out += d);
child.stderr.on('data', d => err += d);
child.on('close', () => { console.log(out.slice(0, 600)); if (err) console.log('ERR', err.slice(0, 300)); });
