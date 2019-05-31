const commando = require("discord.js-commando");
const { RichEmbed } = require("discord.js");
const helper = require("../../helpers");

module.exports = class PlayCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "play",
      group: "util",
      memberName: "play",
      description: ""
    });
  }

  async run(message, args) {
    if (message.member.voiceChannel) {
      if (!message.guild.voiceConnection) {
        if (!servers[message.guild.id]) {
          servers[message.guild.id] = { queue: [] };
        }
        message.member.voiceChannel.join().then(connection => {
          if (args.includes("spotify")) {
            const playOrNot = "true";
            helper.convertToYouTube(
              args,
              message,
              this.client,
              playOrNot,
              connection
            );
          } else if (!args.includes("spotify")) {
            const server = servers[message.guild.id];
            server.queue.push(args);
            helper.play(connection, message, this.client);
          }
        });
      } else if (message.guild.voiceConnection) {
        if (args.includes("spotify")) {
          helper.convertToYouTube(args, message, this.client);
        } else if (!args.includes("spotify")) {
          const server = servers[message.guild.id];
          server.queue.push(args);
        }
      }
    } else {
      message.reply("You need to be in a voice channel.");
    }
  }
};
