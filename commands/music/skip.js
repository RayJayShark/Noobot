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
    const manager = this.client.manager;
    const data = {
      guild: message.guild.id,
      channel: message.member.voiceChannelID,
      host: "localhost"
    };

    const player = manager.spawnPlayer(data);
    if (!player.playing && !player.paused) {
      manager.leave(message.guild.id);
    } else {
      player.stop();
    }
  }
};
