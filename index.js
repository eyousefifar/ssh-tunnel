const { readJSONSync } = require("fs-extra");
const { join } = require("path");
const { setTimeout } = require("timers/promises");
const { spawn } = require("child_process");
const { socksDispatcher } = require("fetch-socks");

const configs = readJSONSync(join(process.cwd(), "config.json"));

if (!Array.isArray(configs)) {
  throw new Error("config.json must be an array");
}

function startSsh(command) {
  const sshProcess = spawn("ssh", command);
  return { sshProcess };
}

async function checkConnection(sshProcess, command, socksPort) {
  let sshProc = sshProcess;
  await setTimeout(5 * 1000);
  let firstError = true;
  while (true) {
    try {
      const dispatcher = socksDispatcher({
        type: 5,
        host: "127.0.0.1",
        port: socksPort,
      });
      const response = await fetch("https://clients3.google.com/generate_204", {
        dispatcher,
      });
      console.log(response.status);
    } catch (error) {
      if (firstError) {
        console.log("connection error: ", error);
        firstError = false;
        await setTimeout(1 * 1000);
      } else {
        console.error("connection error: ", error);
        sshProcess.kill();
        const { sshProcess: newSshProcess } = startSsh(command);
        sshProc = newSshProcess;
        firstError = true;
        await setTimeout(3 * 1000);
      }
    }
    await setTimeout(1 * 1000);
  }
}

async function main() {
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
      const { sshProcess } = startSsh(command, config.password);
      await checkConnection(sshProcess, command, socksPort);
    }
  } catch (error) {
    console.error(error);
  }
}

main();
