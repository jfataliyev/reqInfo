# req-info
Service responses with basic information about tcp request it received.

Handy to quickly acquire IP address, remote port, user-agent, cookies, etc.

## How to use
Deploy it to any free hosting, with simple node conf's.

Then curl it from your computer.

```curl -L req-info.vercel.app```

"-L" param is added to follow redirection, Vercel makes from short domain to main one.

### Sample Response:

Server Time (UTC): 2024-07-01 14:36:05
Requested: GET req-info.vercel.app/

Your IP: 110.110.110.110

Remote Port: 36216

User-Agent: curl/8.6.0


Headers:
x-forwarded-for: 110.110.110.110
x-vercel-ip-as-number: 39280
x-vercel-proxied-for: 110.110.110.110
