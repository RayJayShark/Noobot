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
    const server = servers[message.guild.id];
    if (!args && server) {
      message.channel
        .send(`Volume is currently at ${server.dispatcher._volume * 100}%.`)
        .then(message => message.delete(2000));
    } else if (args && server) {
      const volume = parseInt(args);
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
    } else {
      message.channel
        .send("There is no song being played currently.")
        .then(message => message.delete(2000));
    }
  }
};
