// This instance type in the project is a load balancer that sends requests to
// xxp-hosted nodes on this project

// See the proxy.ts file for detailed explanation of how this module works and
// for config settings used in the demo

import "source-map-support/register";

import * as xxGuestApi from "crisscross-guest-api";
import { startProxy } from "./proxy";

const xx = xxGuestApi.start({}, (err, serverCache) => {
  if (err) throw err;

  if (serverCache.length === 1) {
    console.warn(`There are no other network nodes, so all proxy attempts should fail`);
  }

  startProxy();
});

xx.on("error", (err) => {
  console.error("XX error:", err);
});

// Emitted if servers have changed
xx.on("serverchange", (servers) => {
  console.log("There has been a change in servers - full list:", servers);
});

// Emitted if server has been added
xx.on("serversadded", (newServers) => {
  console.log("New servers were added:", newServers);
});
