// This file communicates with the CrissCross host server running locally

import http from "http";


// The port must be the same as the crisscross guest port, this is the default
// There's no real need to change the port for your own application
const internalPort = 15001;
const internalHost = "127.0.0.1";

// Cache the server list unless a cache miss occurs
// We cache the server list to reduce server load internally
// The cache TTL can be decreased much further at the cost of CPU and possibly throughput
const cacheTTL = 120; // Time in seconds
let serverCache: any = [];
let serverCacheInterval;

// This will list servers from the cache
export function listServers(type: string): any {
  type = type.trim().toLowerCase();

  if (!type.length) return serverCache;
  return serverCache.filter(s => s.type === type);
};

// Gets called on cache miss, new server, refresh, manual call, etc.
export function refreshServerCache(type?: string, callback?): void {
  if (typeof type === "undefined") type = "";
  
  // Calls the xxhost local api at internalHost
  http.get(`http://${internalHost}:${internalPort}/servers/${type}`, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        data = JSON.parse(data);
      } catch (err) {
        // This could indicate a problem with the xxhost response
        throw err;
      }

      // Response will be an array of servers with type, hostname, and ip addresses
      // TODO check validity
      serverCache = data;
      
      if (typeof callback === "function") callback(null, serverCache);
      return;
    });

    res.on("error", (err) => { throw err });
  });
};

// Report that a server is not responding, it will be dropped from the cache
// The cache will also be reloaded
// Callback issued once the server list has been reloaded
export function reportCacheMiss(address: string, callback?): void {
  if (!address) throw new Error(`Cache miss reported for undefined address ${address}`);
  
  refreshServerCache(callback);

  address = address.toLowerCase().trim();
  const idx = serverCache.findIndex(s => s.address.toLowerCase().trim() === address);

  if (idx === -1) {
    // Server is not in the cache anymore
  } else {
    // Remove from cache
    serverCache.splice(idx, 1);
  }
};

// Immediately calls reportCacheMiss, but extra handling is handled here
// Callback issued once the server list has been reloaded
export function reportServerIssue(address: string, callback?): void {
  // The network will attempt to health-check this node now

  return reportCacheMiss(address, callback);
};

// Start the server, callback on ready to use
export function start(readyCallback): void {
  refreshServerCache("", readyCallback);

  // Start refresh cycle
  serverCacheInterval = setInterval(() => {
    refreshServerCache();
  }, cacheTTL * 1000);
};

//
export function stop(): void {
  clearInterval(serverCacheInterval);
}