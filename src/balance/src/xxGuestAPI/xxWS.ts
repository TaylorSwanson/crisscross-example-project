// Handles the websocket for the API

import ws from "ws";

import xxEventEmitter from "./xxEventEmitter";
import messageFactory from "./messageFactory";

let wsConnection: ws;

let isWSAvailable = false;

// Will attempt to switch to WS with the agent
export function attemptUpgrade(host: string, port: number, callback?) {
  //
  if (typeof host !== "string" || typeof port !== "number") {
    xxEventEmitter.emit("error", new Error("XX implementation error - no hostname or port"));

    throw new Error("You must start the serverCache first with a port and hostname before use");
  }

  // We'll try to upgrade to ws now
  wsConnection = new ws(`http://${host}:${port}/ws`);

  wsConnection.on("open", () => {
    console.log("Upgraded to ws connection to xxhost");

    xxEventEmitter.emit("wsready", wsConnection);

    // We're now ready
    isWSAvailable = true;
  });

  //
  wsConnection.on("close", (code, reason) => {
    xxEventEmitter.emit("wsclose", { code, reason });

    isWSAvailable = false;
  });
};

export function getIsWSAvailable() {
  return isWSAvailable;
};

export function sendMessage(type: string, payload?) {

};
