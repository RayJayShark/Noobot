const commando = require("discord.js-commando");
const models = require("../../models");

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
        models.Server.findOrCreate({
          where: { guildId: message.guild.id }
        }).then(([server]) => {
          models.Queue.findOne({
            where: { serverId: server.id },
            include: "songs"
          }).then(queue => {
            queue.get().songs.forEach(song => {
              if (song) {
                if (song.get().playlistId === null) {
                  song.destroy();
                } else {
                  song.update({ QueueId: null, queueId: null });
                }
              }
              setTimeout(() => {
                const server = servers[message.guild.id];
                server.dispatcher.end();
              }, 650);
            });
          });
        });
      }
    } else {
      message.reply("You need to be in a voice channel to stop the song.");
    }
  }
};
