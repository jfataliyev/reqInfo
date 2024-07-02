const express = require('express');
const { exec, fork, spawn } = require('child_process');
const pack = require('./package.json');
const path = require('path');
const os = require('os');
const fs = require('fs');
const chalk = require('chalk');


const app = express();
app.set('trust proxy', true);

let port = pack.default_port;
let version, help, start, kill, background, restart;
let verbose = true;


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
  console.log(chalk.blue(`v${pack.version}`));
  process.exit(0);
}

function helpAndDie() {
  console.log(chalk.cyan(`Usage: ${pack.name} [command] [options]
Commands:
  -s, --start        Start info server
  -k, --kill         Terminate info server
  -r, --restart      Terminate previous info server and start new
Options:
  -i, --verbose      Enable verbose logging
  -p, --port <port>  Set the port to listen on (default: ${pack.default_port})
  -v, --version      Show the version number and exit
  -h, --help         Show this help message and exit`));
  process.exit(0);
}

app.use((req, res, next) => {
  const dt = new Date().toISOString().split('T');
  const headersFormatted = req.headers ? Object.keys(req.headers).map(key => `${key}: ${req.headers[key]}`).join('\n') : "";
  const cookiesFormatted = req.cookies ? Object.keys(req.cookies).map(key => `${key}: ${req.cookies[key]}`).join('\n') : "";


  const response = `
=========================================================
Server Time (UTC): ${dt[0]} ${dt[1].split('.')[0]}
Requested: ${req.method} ${req.hostname}

Your IP: ${req.ip.includes('::ffff:') ? req.ip.slice(7) : req.ip || req.connection.remoteAddress}

Remote Port: ${req.socket.remotePort}

User-Agent: ${req.headers['user-agent']}
${cookiesFormatted ? `
  Cookies:
  ${cookiesFormatted}
` : ""}
Headers:
${headersFormatted}
=========================================================

`;

  if(verbose) console.log(chalk.green(response));
  res.status(200).send(response);
});

  function printSystemInfo(p, v) {
    let mem = {
      totalMemoryKB: os.totalmem() / 1024,
      freeMemoryKB: os.freemem() / 1024,
    };
    mem.totalMemoryMB = mem.totalMemoryKB / 1024;
    mem.freeMemoryMB = mem.freeMemoryKB / 1024;
    mem.totalMemoryPercentFree = ((mem.freeMemoryKB / mem.totalMemoryKB) * 100).toFixed(2);

    const cpus = os.cpus().map(cpu => `1. ${cpu.model} ${cpu.speed} MHz`);
    const networkInterfaces = os.networkInterfaces();
    const nets = Object.keys(networkInterfaces).map(net => {
      return `${net}: ${networkInterfaces[net].map(pr => `${pr.family} - ${pr.address}`).join('     ')}`;
    });

    console.log("=========================================================");
    console.log(chalk.blue(`User:`));
    console.log(chalk.red(`(${os.userInfo().uid}) ${os.userInfo().username}`));
    console.log(chalk.yellow(`Running on ${os.type()} ${os.arch()} ${os.release()}`));

    console.log(chalk.blue("\nCPU's:"));
    cpus.forEach(cpu => console.log(chalk.green(cpu)));

    console.log(chalk.blue("\nNet Interfaces:"));
    nets.forEach(net => console.log(chalk.green(net)));

    console.log(chalk.blue(`\nMemory: `));
    console.log(chalk.green(`Free ${mem.totalMemoryPercentFree}% (${mem.freeMemoryMB.toFixed(2)} MB ${mem.freeMemoryKB.toFixed(2)} KB / ${mem.totalMemoryMB.toFixed(2)} MB ${mem.totalMemoryKB.toFixed(2)} KB)`));
    console.log("=========================================================");
    console.log(' ');

  }

  const log = console.log;

  const pidFile = './server.pid';

  async function serverStart(p, v, b) {
    if (!v && !b) {
        // Check if server is already running
        if (fs.existsSync(pidFile)) {
            const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
            let kill;
            try{
              kill = process.kill(pid, 0);
            }catch(e){}
            if (!isNaN(pid) && kill) {
                log(chalk.red(`Server is already running with PID: ${pid}`));
                process.exit(1);
            } else {
                fs.unlinkSync(pidFile); // PID file exists but process not running, delete the PID file
            }
        }

        const fullFileName = __filename;
        const fileName = path.basename(fullFileName);
        const passiveService = `bun ./${fileName}${p ? ' -p ' + p : ''}`;

        log(chalk.green(`Starting server with command: ${passiveService}`));

        const child = spawn('nohup', ['sh', '-c', passiveService], {
            detached: true,
            stdio: 'ignore'
        });

        child.unref();
        fs.writeFileSync(pidFile, child.pid.toString(), 'utf8');
        log(chalk.magenta(`Server started in the background with PID: ${child.pid}`));
        process.exit(0);
    }

    await app.listen(p, () => {
        if (v) printSystemInfo(v);
        log(chalk.green(`${pack.name} ${pack.version} listening to ${p}`));
        if (v) log(chalk.yellow('Running in verbose mode. All requests info will be printed here..'));
    });
}


function serverRestart(p, v, b) {
  serverKill();
  serverStart(p, v, b);
}

function serverKill() {
  exec('killall req-info');
}

process.on('SIGINT', () => {
  console.log(chalk.red('Info Server Killed'));
  process.exit(0);
});

if(version) versionAndDie();
else if(help || (!start && !kill && !restart)) helpAndDie();
else{
  if(kill) serverKill();
  else if(restart) serverRestart(port, verbose, background);
  else serverStart(port, verbose, background);
}
