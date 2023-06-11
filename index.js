const { readJSONSync } = require("fs-extra");
const EventEmitter = require("events");
const { join } = require("path");
const { setTimeout } = require("timers/promises");
const { spawnSync } = require("child_process");
const { socksDispatcher } = require("fetch-socks");

const configs = readJSONSync(join(process.cwd(), "config.json"));
const events = new EventEmitter();
if (!Array.isArray(configs)) {
  throw new Error("config.json must be an array");
}


async function checkConnection(socksPort) {
  await setTimeout(1 * 1000);
  let firstError = true;
  let checkConnectionStatus = true;
  events.on("restart", () => {
    checkConnectionStatus = false;
  });
  while (checkConnectionStatus) {
    try {
      const dispatcher = socksDispatcher({
        type: 5,
        host: "127.0.0.1",
        port: socksPort,
      });
      await fetch("https://clients3.google.com/generate_204", {
        dispatcher,
      });
    } catch (error) {
      if (firstError) {
        console.error("first connection error, socksPort: ", socksPort);
        firstError = false;
        await setTimeout(500);
      } else {
        console.error("connection error, socksPort:", socksPort);
        spawnSync("killall", ["ssh"]);
        console.log("killed all ssh");
        events.emit("restart");
        startSsh();
        break;
      }
    }
    await setTimeout(1 * 1000);
  }
  console.log("end", socksPort);
}

function startSsh() {
  try {
    for (let index = 0; index < configs.length; index++) {
      const config = configs[index];
      // check config local port is number and remote port is number
      if (
        !Number.isInteger(config.localPort) ||
        !Number.isInteger(config.remotePort)
      ) {
        throw new Error("localPort and remotePort must be integer");
      }
      // local and remote port must not be 60006 + length of configs
      if (
        config.localPort >= 60006 &&
        config.localPort <= 60006 + configs.length - 1
      ) {
        throw new Error("localPort must not be 60006 + length of configs");
      }
      if (
        config.remotePort >= 60006 &&
        config.remotePort <= 60006 + configs.length - 1
      ) {
        throw new Error("localPort must not be 60006 + length of configs");
      }
      const socksPort = 60006 + index;
      const command = [
        "-f",
        "-N",
        "-D",
        `${socksPort}`,
        "-L",
        `*:${config.localPort}:localhost:${config.remotePort}`,
        `${config.user}@${config.ip}`,
      ];
      spawnSync("ssh", command);
      checkConnection(socksPort).catch((err) => {
        console.error(err);
      });
    }
  } catch (error) {
    console.error(error);
  }
}



startSsh();
