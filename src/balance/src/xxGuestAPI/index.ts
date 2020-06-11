// Main entrypoint for module

import { EventEmitter } from "events";

import * as serverCache from "./serverCache";
import * as xxWS from "./xxWS";
import messageFactory from "./messageFactory";
import xxEventEmitter from "./xxEventEmitter";


// The port must be the same as the crisscross guest port, this is the default
// There's no real need to change the port for your own application
// const internalPort = 15001;
// const internalHost = "127.0.0.1";
let internalPort: number, internalHost: string;


// Start the server, callback on ready to use
export function start(options, readyCallback): EventEmitter {
  // Default options
  if (options instanceof Array)
    throw new Error("Guest init options cannot be an array, it must be an object");
  
  if (typeof options !== "object") options = {};
  internalHost = options.host || "127.0.0.1";
  internalPort = options.port || 15001;
  

  // Start the cache and load initially over HTTP
  serverCache.start(internalHost, internalPort);
  serverCache.triggerCacheReload(readyCallback);

  // Attempt to switch to WS server next
  xxWS.attemptUpgrade(internalHost, internalPort);

  // TODO multiple attempts for upgrade, emit error if not possible
  // We need WS for live updates, otherwise we must poll HTTP repeatedly

  // Part of public API
  return xxEventEmitter;
};
export function stop(): void {
  serverCache.stop();
};


// Public API exports

export function listServers(type: string) {
  return serverCache.listServers(type);
};

export function reportServerIssue(address: string, callback?: Function): void {
  return serverCache.reportServerIssue(address, callback);
};

module.exports.messageFactory = messageFactory;
