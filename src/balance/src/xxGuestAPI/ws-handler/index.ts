// Passes websocket messages to correct handlers

import fs from "fs";
import path from "path";
import os from "os";

import ws from "ws";


import messageFactory from "../messageFactory";
import xxEventEmitter from "../xxEventEmitter";


const hostname = os.hostname().trim().toLowerCase();

const handlers = {};
const ignoredFiles = ["index"];

// Load message handlers
const files = fs.readdirSync(__dirname);
files.forEach(file => {
  const handlerPath = path.join(__dirname, file);
  const handlerStat = fs.statSync(handlerPath);

  // Ignore directories
  if (handlerStat.isDirectory()) return;

  // Ignore map files
  if (handlerPath.endsWith(".map")) return;

  // This is the name of the message that can be called
  const handlerName = path.basename(handlerPath, ".js");
  
  // Ignore blacklisted files
  if (ignoredFiles.includes(handlerName)) return;

  // Save method to the respective handler
  handlers[handlerName] = require(handlerPath);
});

// Call the appropriate ws handler
export = function(ws: ws, type: string, payload) {
  // Problems
  if (payload.status === 0) {
    return xxEventEmitter.emit("error", `Received error packet from ws: ${JSON.stringify(payload)}`);
  }
  if (!payload.header.hasOwnProperty("type")) {
    const msg = "Payload header has no message type";

    const response = messageFactory(msg);
    ws.send(response);

    return xxEventEmitter.emit("error", msg + " - payload: " + payload);
  }
  if (!handlers.hasOwnProperty(payload.header.type)) {
    const msg = "No handler defined for message type";
    
    const response = messageFactory(msg);
    ws.send(response);

    return xxEventEmitter.emit("error", msg + " - payload: " + payload);
  }

  if (typeof handlers[payload.header.type] !== "function") {
    const msg = "Handler is not a function";
    
    const response = messageFactory(msg);
    ws.send(response);

    return xxEventEmitter.emit("error", msg + " - payload: " + payload);
  }

  // We'll need to reply to the worker with the result of this event
  // console.log(`${hostname} - Calling handler for`, payload.header.type);
  return handlers[payload.header.type](ws, payload, (err, results) => {
    if (err) {
      const msg = "Error in worker handler";
    
      const response = messageFactory(msg);
      ws.send(response);

      return xxEventEmitter.emit("error", msg + ": " + err);
    }

    
    // Send the result to the client app
    const response = messageFactory(null, {
      ...results,
      header: { type }
    });
    ws.send(response);

  });
};
