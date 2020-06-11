// This file communicates with the CrissCross host server running locally


import { EventEmitter } from "events";


import * as serverCache from "./serverCache";
import * as xxWS from "./xxWS";
import xxEventEmitter from "./xxEventEmitter";
import messageFactory from "./messageFactory";


// The port must be the same as the crisscross guest port, this is the default
// There's no real need to change the port for your own application
const internalPort = 15001;
const internalHost = "127.0.0.1";


let isWS = false;
let wsConnection;


// Start the server, callback on ready to use
export function start(readyCallback): EventEmitter {
  // Start the cache and load initially over HTTP
  serverCache.start(internalHost, internalPort);
  serverCache.triggerCacheReload(readyCallback);

  // Attempt to switch to WS server next
  xxWS.attemptUpgrade(internalHost, internalPort);

  return xxEventEmitter;
};

//
export function stop(): void {
  serverCache.stop();
}

module.exports.messageFactory = messageFactory;

export function listServers(type: string) {
  return serverCache.listServers(type);
};

export function reportServerIssue(address: string, callback?: Function): void {
  return serverCache.reportServerIssue(address, callback);
};
