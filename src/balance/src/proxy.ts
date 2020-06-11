// This is the load balancer that talks to all backends in random order
// This should theoretically balance traffic evenly but that's just theory, there's a
// lot of discussion of the best practices for loadbalancing. If you choose to
// implement a similar system, then consider using a more suitable loadbalancing
// algorithm for this

// This is where the user will request to access API backend servers in the project
const publicPort = 8180;
// This is where the API servers are listening for the proxy
const internalPort = 20000;
// Number of times to retry querying a proxy server
const proxyRetries = 3;
// This message is for developers
// You should use something less specific in a production environment
const errorBody = "No API servers are available, are there any nodes running?";
const errorBodyUnavailable = "Reverse API server proxy request failed";

import http from "http";
import url from "url";

import * as xxGuestApi from "crisscross-guest-api";

export function startProxy() {
  const server = http.createServer((req, res) => {
    const apiServers = xxGuestApi.listServers("api");

    if (!apiServers.length) {
      
      // Bad gateway
      res.writeHead(502, {
        "Content-Length": errorBody.length
      });

      return res.end(errorBody);

    }

    function crash() {
      // There was a gateway issue but this is an internal issue
      res.writeHead(500, {
        "Content-Length": errorBodyUnavailable.length
      });

      res.end(errorBodyUnavailable);
    }

    // Will proxy, on error will try another server
    function attemptProxy(callback, remainingRetries: number) {
      if (remainingRetries === 0) {
        return callback(new Error("Maximum number of proxy retries hit"));
      }

      if (apiServers.length === 0 && remainingRetries === 0) {
        // No more server options
        return callback(new Error("No more remaining proxy servers to try"));
      }

      // Choose an API server
      const apiServer = apiServers[Math.floor(Math.random() * apiServers.length)];

      // We'll build a proxy request to send to the selected server
      const parsedURL = url.parse(req.url);
      const passUrl = parsedURL.pathname + parsedURL.query + parsedURL.hash;

      console.log(`Attempting to proxy ${passUrl} to ${apiServer.address} (retries remaining: ${proxyRetries - remainingRetries})`);

      const options = {
        method: req.method,
        headers: {
          ...req.headers,

          // This is not the address of the server we are proxying to, but for
          // the user that we are proxying for

          // Newer API address returns full address as function
          //@ts-ignore
          "X-Forwarded-For": req.socket.address().address,
          // Measure latency
          "Date": (new Date().toUTCString())
        },
        // This is where we are using the random server's address:
        host: apiServer.address,
        port: internalPort,
        path: passUrl
      }; 

      // Make the request to the API server
      const proxy = http.request(options, (pRes) => {
        pRes.on("data", (chunk) => {
          res.write(chunk);
        });

        pRes.on("end", () => { res.end() });
      });

      proxy.on("timeout", () => {
        const timeoutError = "Proxy request timed out";
        // There was a gateway issue but this is an internal issue
        res.writeHead(504, {
          "Content-Length": timeoutError.length
        });

        res.end(timeoutError);
        proxy.end();
      });

      // Handle proxy errors and report the server as damaged if it cannot respond
      proxy.on("error", (err) => {
        // Report this server as unavailable, then wait for cache reload
        // We wait for cache reload so we don't run through all possible servers
        // before they are available
        xxGuestApi.reportServerIssue(apiServer.address, (err, serverCache) => {
          if (err) {
            crash();
            throw err;
          }

          // Avoid stack overflow
          setImmediate(() => {
            attemptProxy(callback, remainingRetries-1)
          });

        });
      });

      // Stop proxy on client end
      req.on("end", () => { proxy.end() });
    };

    // Try to proxy the request
    attemptProxy((err) => {
      // It should callback with no error if all works
      crash();
      
      throw err;
    }, proxyRetries);


  });

  server.listen(publicPort, () => {
    console.log(`The demo reverse proxy is running on port ${publicPort} to send requests to \
API servers on port ${internalPort} of the non-localhost network managed by xxp`);
  });
}
