const express = require('express');
const { program } = require('commander');
const { exec } = require('child_process');
const pack = require('./package.json');

const app = express();
app.set('trust proxy', true);

let port = pack.default_port;
let verbose, version, help, start, kill, background, restart;


process.argv.map((arg,aind) => {
  switch(arg){
    case '-v': case '--version': version = true; break;
    case '-h': case '--help': help = true; break;
    case '-p': case '--port': port = process.argv[aind+1]; break;
    case '-i': case '--verbose': verbose = true; break;
    case '-s': case '--start': start = true; break;
    case '-k': case '--kill': kill = true; break;
    case '-r': case '--restart': restart = true; break;
    case '--background': background = true; break;
  }
});


function versionAndDie() {
  console.log(`v${pack.version}`);
  process.exit(0);
}

function helpAndDie() {
  console.log(`Usage: ${pack.name} [command] [options]
Commands:
  -s, --start        Start info server
  -k, --kill         Terminate info server
  -r, --restart      Terminate previous info server and start new
Options:
  -i, --verbose      Enable verbose logging
  -p, --port <port>  Set the port to listen on (default: ${pack.default_port})
  -v, --version      Show the version number and exit
  -h, --help         Show this help message and exit`);
  process.exit(0);
}

app.use((req, res, next) => {
  const dt = new Date().toISOString().split('T');
  const headersFormatted = req.headers ? Object.keys(req.headers).map(key => `${key}: ${req.headers[key]}`).join('\n') : "";
  const cookiesFormatted = req.cookies ? Object.keys(req.cookies).map(key => `${key}: ${req.cookies[key]}`).join('\n') : "";

  const response = `Server Time (UTC): ${dt[0]} ${dt[1].split('.')[0]}
Requested: ${req.method} ${req.hostname}${req.url}

Your IP: ${req.ip.includes('::ffff:') ? req.ip.slice(7) : req.ip || req.connection.remoteAddress}

Remote Port: ${req.socket.remotePort}

User-Agent: ${req.headers['user-agent']}
${cookiesFormatted ? `
  Cookies:
  ${cookiesFormatted}
` : ""}
Headers:
${headersFormatted}

`;

  if(verbose) console.log(response);
  res.status(200).send(response);
});

function serverStart(p, v, b){

  // console.log('nohup '+process.argv.join(' ')+' --background > req-info.log  &');
  if(!v && !b){

    exec('nohup '+process.argv.join(' ')+' --background > req-info.log  &', (err, std, stderr) => {
      // process.exit(0);
      // console.log(err, stderr);
    });

  }else{
    app.listen(p, () => {
      console.log(`${pack.name} ${pack.version} listening to ${p}`);
    });
  }
}

function serverRestart(p, v, b) {
  serverKill();
  serverStart(p, v, b);
}

function serverKill() {
  exec('pkill -9 req-info');
}

process.on('SIGINT', () => {
  console.log('Info Server Killed');
  process.exit(0);
});

if(version) versionAndDie();
else if(help || (!start && !kill && !restart)) helpAndDie();
else{
  if(kill) serverKill();
  else if(restart) serverRestart(port, verbose, background);
  else serverStart(port, verbose, background);
}
