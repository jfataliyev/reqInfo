const express = require('express');
const app = express();
const pack = require('./package.json');

app.set('trust proxy', true);
app.use((req, res, next) => {
  const dt = ((new Date).toISOString()).split('T');
  console.log(req);
  const headersFormatted = req.headers ? (Object.keys(req?.headers)?.map(key => `${key}: ${req.headers[key]}` ).join('\n')) : "";
  const cookiesFormatted = req.cookies ? (Object.keys(req?.cookies)?.map(key => `${key}: ${req.cookies[key]}` ).join('\n')) : "";
  res.status(200).send(`
Server Time (UTC): ${dt[0]} ${dt[1].split('.')[0]}
Requested: ${req.method} ${req.host}${req.url}

Your IP: ${req.ip.includes('::ffff:') ? req.ip.slice(7) : req.ip || req.connection.remoteAddress}

Remote Port: ${req.socket.remotePort}

User-Agent: ${req.headers['user-agent']}
${cookiesFormatted ? `
  Cookies:
  ${cookiesFormatted}
`:""}

Headers:
${headersFormatted}


`);
});
app.listen(3000, () => console.log(`${pack.name} ${pack.version} is running`));
