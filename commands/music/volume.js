const commando = require("discord.js-commando");

module.exports = class SkipCommand extends commando.Command {
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
    const volume = parseInt(args);
    const server = servers[message.guild.id];
    if (message.member.voiceChannel) {
      if (volume > 100) {
        message.channel.send("Cannot go beyond 100% Volume.");
      } else if (volume < 0) {
        message.channel.send("Cannot go below 0% Volume.");
      } else if (volume >= 0 && volume <= 100) {
        message.channel.send(`Volume changed to ${args}%`).then(message => {
          message.delete(2000);
        });
        server.dispatcher._volume = volume / 100;
      }
    } else {
      message.channel.send(
        "You need to be in a voice channel to change the volume."
      );
    }
  }
};
