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
Commands: (unavaliable in web version)
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
  const iscurl = req.headers['user-agent'].includes('curl');
  const headersFormatted = req.headers ? Object.keys(req.headers).map(key => `${key}: ${req.headers[key]}`).join('\n') : "";
  const cookiesFormatted = req.cookies ? Object.keys(req.cookies).map(key => `${key}: ${req.cookies[key]}`).join('\n') : "";

  const rdata = {
    date: dt[0],
    time: dt[1].split('.')[0],
    method: req.method,
    host: req.hostname,
    ip: req.ip.includes('::ffff:') ? req.ip.slice(7) : req.ip || req.connection.remoteAddress,
    port: req.socket.remotePort,
    agent: req.headers['user-agent'],
    cookies: cookiesFormatted,
    headers: headersFormatted,
    iscurl
  }

  const textResponse = `
=========================================================
${chalk.cyan('Server Time (UTC):')} ${chalk.bold.magenta(rdata.date)} ${chalk.bold.magenta(rdata.time)}
${chalk.cyan('Requested:')} ${chalk.bold.magenta(rdata.method)} ${chalk.bold.magenta(rdata.host)}

${chalk.cyan('Your IP:')} ${chalk.bold.magenta(rdata.ip)}

${chalk.cyan('Remote Port:')} ${chalk.bold.magenta(rdata.port)}

${chalk.cyan('User-Agent:')} ${chalk.bold.magenta(rdata.agent)}
${rdata.cookies ? `
${chalk.cyan('Cookies:')}
${rdata.cookies}
` : ""}
${chalk.cyan('Headers:')}
${rdata.headers}
=========================================================
`;


   const htmlResponse = `
       <html>
           <head><title>Request Info</title></head>
           <body>
               <div style="font-family: sans-serif">
                   =========================================================<br />
                   Server Time (UTC): <b>${rdata.date}</b> <b>${rdata.time}</b><br />
                   Requested: <b>${rdata.method}</b> ${rdata.host}<br /><br />

                   Your IP: <b>${rdata.ip}</b><br /><br />

                   Remote Port: <b>${rdata.port}</b><br /><br />

                   User-Agent: <b>${rdata.agent}</b><br /><br />
                   ${rdata.cookies ? `<br />
                   Cookies:<br />
                   ${rdata.cookies.replaceAll('\n','<br />')}
                   <br /><br />` : ""}
                   Headers:<br />
                   ${rdata.headers.replaceAll('\n','<br />')}
                   <br />=========================================================
               </div>
           </body>
       </html>
   `;

//
//   const response = `
// =========================================================
// Server Time (UTC): ${rdata.date} ${rdata.time}
// Requested: ${rdata.method} ${rdata.host}
//
// Your IP: ${rdata.ip}
//
// Remote Port: ${rdata.port}
//
// User-Agent: ${rdata.agent}
// ${rdata.cookies ? `
// Cookies:
// ${rdata.cookies}
// ` : ""}
// Headers:
// ${rdata.headers}
// =========================================================
//
// `;

  if(verbose) console.log(textResponse);

  if(rdata.iscurl) res.status(200).send(textResponse);
  else{
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlResponse);
  }
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

process.on('SIGINT', () => {
  console.log(chalk.red('Info Server Killed'));
  process.exit(0);
});

if(version) versionAndDie();
else if(help) helpAndDie();
else{
   app.listen(port, () => {
      if (verbose) printSystemInfo();
      log(chalk.green(`${pack.name} ${pack.version} listening to ${port}`));
      if (verbose) log(chalk.yellow('Running in verbose mode. All requests info will be printed here..'));
  });
}
