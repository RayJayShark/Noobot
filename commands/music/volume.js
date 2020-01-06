const commando = require("discord.js-commando");

module.exports = class VolumeCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "volume",
      aliases: ["vol"],
      group: "music",
      memberName: "volume",
      description: "Changes the volume from 1-100."
    });
  }

  run(message, args) {
    const manager = this.client.manager;
    const data = {
      guild: message.guild.id,
      channel: message.member.voiceChannelID,
      host: "localhost"
    };

    const player = manager.spawnPlayer(data);

    if (!player.playing && !player.paused) {
      manager.leave(message.guild.id);
    }

    if (!args && player.playing) {
      message.channel
        .send(`Volume is currently at ${player.state.volume}%.`)
        .then(message => message.delete(2000));
    } else if (args && player.playing) {
      const volume = parseInt(args);
      if (message.member.voiceChannel) {
        if (message.member.voiceChannelID === player.channel) {
          if (volume > 100) {
            message.channel.send("Cannot go beyond 100% Volume.");
          } else if (volume < 0) {
            message.channel.send("Cannot go below 0% Volume.");
          } else if (volume >= 0 && volume <= 100) {
            message.channel
              .send(`Volume changed to ${volume}%`)
              .then(message => {
                message.delete(2000);
              });
            player.volume(volume);
          }
        } else {
          message.channel
            .send(
              "You need to be in the same voice channel to change the volume."
            )
            .then(message => message.delete(5000));
        }
      } else {
        message.channel
          .send("You need to be in a voice channel to change the volume.")
          .then(message => message.delete(5000));
      }
    }
  }
};
