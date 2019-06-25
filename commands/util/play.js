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
      models.Server.findOrCreate({ where: { guildId: message.guild.id } }).then(
        ([server]) => {
          models.Queue.findOrCreate({
            where: { serverId: server.id },
            include: "songs"
          }).then(async ([queue]) => {
            if (!servers[message.guild.id]) {
              servers[message.guild.id] = {};
            }
            if (
              !args.includes("youtube") &&
              !args.includes("youtu.be") &&
              !args.includes("spotify")
            ) {
              const url = await helper.searchYoutube(args);
              const { title, lengthSeconds } = await helper.youTubeApiSearch(
                url
              );
              models.Song.findOrCreate({
                where: {
                  queueId: queue.id,
                  url
                },
                defaults: {
                  title,
                  lengthSeconds
                }
              });
            } else if (args.includes("youtube.com") && args.includes("list")) {
              const playlist = await helper.youtubePlaylist(args);
              playlist.forEach(async url => {
                const { title, lengthSeconds } = await helper.youTubeApiSearch(
                  url
                );
                models.Song.create({
                  queueId: queue.id,
                  url,
                  title,
                  lengthSeconds
                });
              });
            } else if (args.includes("spotify")) {
              if (args.includes("/playlist/") || args.includes("/album/")) {
                const spotyPlaylist = [...(await helper.getSpotifyUrl(args))];
                spotyPlaylist.forEach(async url => {
                  const {
                    title,
                    lengthSeconds
                  } = await helper.youTubeApiSearch(url);
                  models.Song.create({
                    queueId: queue.id,
                    url,
                    title,
                    lengthSeconds
                  });
                });
              } else {
                const url = await helper.getSpotifyUrl(args);
                const { title, lengthSeconds } = await helper.youTubeApiSearch(
                  url
                );
                models.Song.findOrCreate({
                  where: {
                    queueId: queue.id,
                    url
                  },
                  defaults: {
                    title,
                    lengthSeconds
                  }
                });
              }
            } else if (args.includes("youtube") || args.includes("youtu.be")) {
              const { title, lengthSeconds } = await helper.youTubeApiSearch(
                args
              );
              models.Song.findOrCreate({
                where: {
                  queueId: queue.id,
                  url: args
                },
                defaults: {
                  title,
                  lengthSeconds
                }
              });
            }
            if (!message.guild.voiceConnection) {
              message.member.voiceChannel.join().then(async connection => {
                models.Queue.findOne({
                  where: { serverId: queue.get().serverId },
                  include: "songs"
                }).then(queue => {
                  if (queue.get().songs.length > 0) {
                    helper.play(connection, message);
                  }
                });
              });
            }
          });
        }
      );
    } else {
      message.reply("You need to be in a voice channel.");
    }
  }
};
