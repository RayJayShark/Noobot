const commando = require("discord.js-commando");

module.exports = class SkipCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "skip",
      group: "music",
      memberName: "skip",
      description: "Skips currently playing song."
    });
  }

  run(message) {
    if (message.member.voiceChannel) {
      message.delete(2000);
      const manager = this.client.manager;
      const data = {
        guild: message.guild.id,
        channel: message.member.voiceChannelID,
        host: "localhost"
      };
      const player = manager.spawnPlayer(data);
      if (message.member.voiceChannelID === player.channel) {
        if (!player.playing && !player.paused) {
          manager.leave(message.guild.id);
        } else {
          player.stop();
        }
      } else {
        message.channel
          .send("You need to be in the same voice channel to skip the song.")
          .then(message => message.delete(5000));
      }
    } else {
      message.channel
        .send("You need to be in a voice channel to skip the song.")
        .then(message => message.delete(5000));
    }
  }
};
