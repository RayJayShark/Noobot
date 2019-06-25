const commando = require("discord.js-commando");
const { RichEmbed } = require("discord.js");
const helper = require("../../helpers");
const models = require("../../models");

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
      const dbserver = await helper.retrieveServer(message.guild.id);
      let queue = await helper.retreieveQueue(dbserver.id);
      if (!servers[message.guild.id]) {
        servers[message.guild.id] = {};
      }
      //Normal Word Search for YouTube - No URL.
      if (
        !args.includes("youtube") &&
        !args.includes("youtu.be") &&
        !args.includes("spotify")
      ) {
        const url = await helper.searchYoutube(args);
        helper.songQueueJoin(url, queue);
      }
      //YouTube Playlist
      else if (args.includes("youtube.com") && args.includes("list")) {
        const playlist = await helper.youtubePlaylist(args);
        playlist.forEach(async url => {
          helper.songQueueJoin(url, queue);
        });
      }
      //Spotify Playlist or Album Link
      else if (args.includes("spotify")) {
        if (args.includes("/playlist/") || args.includes("/album/")) {
          const spotyPlaylist = [...(await helper.getSpotifyUrl(args))];
          spotyPlaylist.forEach(async url => {
            helper.songQueueJoin(url, queue);
          });
        } else {
          const url = await helper.getSpotifyUrl(args);
          helper.songQueueJoin(url, queue);
        }
      }
      //Normal YouTube Link
      else if (args.includes("youtube") || args.includes("youtu.be")) {
        helper.songQueueJoin(args, queue);
      }
      if (!message.guild.voiceConnection) {
        message.member.voiceChannel.join().then(async connection => {
          queue = await helper.retreieveQueue(dbserver.id);
          if (queue.songs.length > 0) {
            helper.play(connection, message);
          }
        });
      }
    } else {
      message.reply("You need to be in a voice channel.");
    }
  }
};
