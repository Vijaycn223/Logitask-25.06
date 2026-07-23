import http from 'http';

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const targets = await getJson('http://127.0.0.1:9222/json');
    const pageTarget = targets.find(t => t.type === 'page');
    if (!pageTarget) {
      console.error('No page target found!');
      return;
    }

    const wsUrl = pageTarget.webSocketDebuggerUrl;
    console.log('Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected!');
      // Enable domains
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      
      // Inject Store Manager session
      ws.send(JSON.stringify({
        id: 3,
        method: 'Runtime.evaluate',
        params: {
          expression: "localStorage.setItem('fieldops_logged_user', JSON.stringify({ email: 'store@fieldops.com', name: 'Priya Sharma', role: 'Store Manager', orgId: 'org-001' }));"
        }
      }));

      // Reload page to apply session
      ws.send(JSON.stringify({ id: 4, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 5, method: 'Page.reload' }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      // Print console API calls
      if (msg.method === 'Runtime.consoleAPICalled') {
        const args = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        console.log(`[Browser Console] [${msg.params.type}] ${args}`);
      }

      // Print unhandled exceptions
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[Browser Exception]', msg.params.exceptionDetails.exception.description);
        if (msg.params.exceptionDetails.stackTrace) {
          console.error(msg.params.exceptionDetails.stackTrace.callFrames.map(f => `  at ${f.functionName} (${f.url}:${f.lineNumber}:${f.columnNumber})`).join('\n'));
        }
      }

      // Log messages
      if (msg.method === 'Log.entryAdded') {
        console.log(`[Browser Log] [${msg.params.entry.level}] ${msg.params.entry.text}`);
      }
    };

    ws.onerror = (err) => {
      console.error('WS Error:', err);
    };

    // Wait for 5 seconds to capture logs
    await new Promise(resolve => setTimeout(resolve, 5000));
    ws.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
