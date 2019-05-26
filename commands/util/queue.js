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
    const serverQueue = [];
    const server = servers[message.guild.id];
    for (let i = 0; i < server.queue.length; i++) {
      let res = await YTDL.getBasicInfo(server.queue[i]).then(result => {
        return `${i + 1}: ${result.title}`;
      });
      serverQueue.push(res);
    }
    message.channel.send(serverQueue);
  }
};
