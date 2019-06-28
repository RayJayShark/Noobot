const commando = require("discord.js-commando");
const models = require("../../models");
const helper = require("../../helpers");

module.exports = class StopCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "stop",
      group: "util",
      memberName: "stop",
      description: ""
    });
  }

  async run(message) {
    if (message.member.voiceChannel) {
      if (!message.guild.voiceConnection) {
        return null;
      } else if (message.guild.voiceConnection) {
        const dbserver = await helper.retrieveServer(message.guild.id);
        const queue = await helper.retrieveQueue(dbserver.id);
        models.SongQueue.findAll({ where: { queueId: queue.id } })
          .then(joinedQueue => {
            joinedQueue.forEach(queuedSong => {
              queuedSong.destroy();
            });
          })
          .then(() => {
            setTimeout(() => {
              const server = servers[message.guild.id];
              server.dispatcher.end();
            }, 100);
          });
      }
    } else {
      message.reply("You need to be in a voice channel to stop the song.");
    }
  }
};
