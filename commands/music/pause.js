const commando = require("discord.js-commando");

module.exports = class PauseComand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "pause",
      group: "music",
      memberName: "pause",
      description: "Pauses the current playing song."
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
    if (player.playing && !player.paused) {
      player.pause();
      message.channel
        .send("Successfully paused! \nType `?resume` to resume.")
        .then(message => message.delete(5000));
    } else if (!player.playing) {
      manager.leave(message.guild.id);
    }
  }
};
