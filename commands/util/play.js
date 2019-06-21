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
      if (
        !args.includes("youtube") &&
        !args.includes("youtu.be") &&
        !args.includes("spotify")
      ) {
        const url = await helper.searchYoutube(args);
        server.queue.push(url);
      } else if (args.includes("youtube.com") && args.includes("list")) {
        const playlist = await helper.youtubePlaylist(args);
        server.queue = playlist;
      } else if (args.includes("spotify")) {
        if (args.includes("/playlist/") || args.includes("/album/")) {
          const spotyPlaylist = [...(await helper.getSpotifyUrl(args))];
          spotyPlaylist.forEach(url => server.queue.push(url));
        } else {
          const url = await helper.getSpotifyUrl(args);
          server.queue.push(url);
        }
      } else if (args.includes("youtube") || args.includes("youtu.be")) {
        server.queue.push(args);
      }
      if (!message.guild.voiceConnection) {
        message.member.voiceChannel.join().then(async connection => {
          if (server.queue.length > 0) {
            helper.play(connection, message);
          }
        });
      }
    } else {
      message.reply("You need to be in a voice channel.");
    }
  }
};
