const commando = require("discord.js-commando");
const YTDL = require("ytdl-core");

module.exports = class QueueCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "queue",
      group: "util",
      memberName: "queue",
      description: ""
    });
  }

  async run(message) {
    const server = servers[message.guild.id];
    let serverQueue = [];
    server.queue.map(url => {
      YTDL.getBasicInfo(url, function(err, result) {
        serverQueue.push(result.title);
      });
    });
    console.log(serverQueue);
  }
};
