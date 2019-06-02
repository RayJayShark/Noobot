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
      if (!servers[message.guild.id]) {
        servers[message.guild.id] = { queue: [] };
      }
      const server = servers[message.guild.id];
      if (!args.includes("spotify", "youtube", "youtu.be")) {
        const url = await helper.searchYoutube(args);
        server.queue.push(url);
        message.channel.send(`Searching for ${args}`);
      } else if (args.includes("spotify")) {
        const url = await helper.getSpotifyUrl(args);
        server.queue.push(url);
      } else if (!args.includes("spotify")) {
        server.queue.push(args);
      }
      if (!message.guild.voiceConnection) {
        message.member.voiceChannel.join().then(async connection => {
          helper.play(connection, message, this.client);
        });
      }
    } else {
      message.reply("You need to be in a voice channel.");
    }
  }
};
