const commando = require("discord.js-commando");

module.exports = class ResumeCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "resume",
      group: "music",
      memberName: "resume",
      description: "Resumes playing if the song is paused."
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
    if (player.playing && player.paused) {
      player.resume();
    } else if (!player.playing) {
      manager.leave(message.guild.id);
    }
  }
};
