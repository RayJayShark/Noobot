const commando = require("discord.js-commando");
const ps = require("ps-node");
const helper = require("../../helpers");

module.exports = class SkipCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "skip",
      group: "util",
      memberName: "skip",
      description: ""
    });
  }

  run(message) {
    ps.lookup(
      {
        command: "ffmpeg"
      },
      (err, res) => {
        res.forEach(result => ps.kill(result.pid));
      }
    );
  }
};
