// Reduce internal network overhead and latency by caching server list
// On a server issue, it is reported as damaged and the list is reloaded in the
// background while the cache is updated to remove the server immediately'

import http from "http";

import xxEventEmitter from "./xxEventEmitter";
import * as xxWS from "./xxWS";

// Cache the server list unless a cache miss occurs
// We cache the server list to reduce server load internally
// The cache TTL can be decreased much further at the cost of CPU and possibly throughput
let cacheTTL = 120; // Time in seconds
let serverCache: any = [];
let serverCacheInterval;


let host: string, port: number;


// Some cache reload requests need a callback before continuing
// We may have multiple callbacks to trigger
let pendingCacheCallbacks: Function[];


// This will list servers from the cache
export function listServers(type: string): any {
  type = type.trim().toLowerCase();

  if (!type.length) return serverCache;
  return serverCache.filter(s => s.type === type);
};



// Triggers a cache reload in some form, via WS or HTTP depending on what is available
export function triggerCacheReload(callback?) {
  // Callback will be scheduled to be triggered when the cache has been reloaded
  if (typeof callback !== "undefined") pendingCacheCallbacks.push(callback);

  // Use WS or HTTP to load cache
  // Each method triggers appropriate events and callbacks on their own
  if (xxWS.getIsWSAvailable()) {
    loadServerCacheWS();
  } else {
    loadServerCacheHTTP();
  }
};


// Gets called on cache miss, new server, refresh, manual call, etc.
export function loadServerCacheHTTP(): void {

  if (typeof host !== "string" || typeof port !== "number") {
    xxEventEmitter.emit("error", new Error("XX implementation error - no hostname or port"));

    throw new Error("You must start the serverCache first with a port and hostname before use");
  }

  // Calls the xxhost local HTTP api at internalHost (localhost by default)
  http.get(`http://${host}:${port}/servers`, (res) => {
    let data = "";

    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      try {
        data = JSON.parse(data);
      } catch (err) {
        // This could indicate a problem with the xxhost response
        return xxEventEmitter.emit("error", err);
      }

      // Response will be an array of servers with type, hostname, and ip addresses
      //@ts-ignore
      if (!(data instanceof Array)) {
        return xxEventEmitter.emit("err", new Error(`Expected an array of servers, received: ${data}`));
      }

      // This triggers the appropriate callbacks and events
      updateServerCache(data);
    });

    res.on("error", (err) => { throw err });
  });
};

export function loadServerCacheWS() {
  // This function doesn't trigger updateServerCache directly, the response
  // triggers it indirectly
  xxWS.sendMessage("listservers");
};

// Updates the cache with the provided server list, triggering appropriate events
export function updateServerCache(servers) {
  if (typeof serverCacheInterval === "undefined") {
    // Start refresh cycle
    // TODO start on first cache load
    serverCacheInterval = setInterval(() => {
      triggerCacheReload();
    }, cacheTTL * 1000);
  }

  // Find any new servers in data that are not in serverCache
  const serversAdded = servers.filter(s => {
    const name = s.name.toLowerCase().trim();

    // Check if this name is in the cache already
    return -1 === serverCache.findIndex(sc => sc.name.toLowerCase().trim() === name);
  });

  if (serversAdded.length) {
    xxEventEmitter.emit("serversadded", serversAdded);
  }

  const serversChanged = (servers.length !== serverCache.length) || serversAdded.length;
  if (serversChanged) {
    xxEventEmitter.emit("serverchange", servers);
  }
  serverCache = servers;

  // Trigger any pending callbacks
  if (typeof pendingCacheCallbacks !== "undefined" && pendingCacheCallbacks.length) {
    pendingCacheCallbacks.forEach(fn => fn(serverCache));
    pendingCacheCallbacks = [];
  }

};


// Report that a server is not responding, it will be dropped from the cache
// The cache will also be reloaded
// Callback issued once the server list has been reloaded
export function reportCacheMiss(address: string, callback?): void {
  if (!address) throw new Error(`Cache miss reported for undefined address ${address}`);
  
  triggerCacheReload(callback);

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


//


export function start(host: string, port: number) {
  host = host;
  port = port;
};

export function stop() {
  clearInterval(serverCacheInterval);
};
