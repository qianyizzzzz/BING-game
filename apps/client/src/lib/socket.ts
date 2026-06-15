import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  ServerToClientEvents
} from "@bing/shared";

export const SERVER_URL = inferServerUrl();

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
  io(SERVER_URL, {
    autoConnect: true
  });

function inferServerUrl(): string {
  const configured = import.meta.env.VITE_SERVER_URL;
  if (configured) {
    return configured;
  }

  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }

  const { hostname, origin, port, protocol } = window.location;
  const devClientPorts = new Set(["5173", "5174"]);
  if (protocol === "https:" || !port || port === "3001" || !devClientPorts.has(port)) {
    return origin;
  }

  return `${protocol}//${hostname}:3001`;
}
