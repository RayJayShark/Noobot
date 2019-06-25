const commando = require("discord.js-commando");
const helper = require("../../helpers");
const Sequelize = require("sequelize");
const models = require("../../models");
const Discord = require("discord.js");
const Op = Sequelize.Op;

module.exports = class PlaylistCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "playlist",
      aliases: ["pl"],
      group: "util",
      memberName: "playlist",
      description: ""
    });
  }

  async run(message, args) {
    const command = args.split(" ")[0];
    const plName = args.split(" ")[1];
    const url = args.split(" ")[2];
    const server = await helper.retrieveServer(message.guild.id);
    let playlist;
    const discordUser = message.author.id;

    switch (command) {
      case "create":
        models.Playlist.findOrCreate({
          where: {
            name: plName.toLowerCase(),
            serverId: server.id
          },
          defaults: { createdBy: discordUser }
        }).then(([playlist, created]) => {
          if (created) {
            message.reply(`Playlist \`${plName.toLowerCase()}\` was created!`);
          } else if (!created) {
            message.reply(
              `There is already a playlist by the name of \`${plName.toLowerCase()}\`, pick a new name.`
            );
          }
        });
        break;
      case "add":
        playlist = await helper.retrievePlaylist(
          plName.toLowerCase(),
          server.id
        );
        //YouTube Playlist
        if (playlist === null) {
          message.reply(
            `No playlist found with the name \`${plName.toLowerCase()}\`, create it first.`
          );
        } else if (url.includes("&list") || url.includes("playlist?list")) {
          const ytPlaylistUrls = await helper.youtubePlaylist(url);
          ytPlaylistUrls.forEach(url => {
            helper.songPlaylistJoin(url, playlist);
          });
        }
        //Spotify Album or Playlist
        else if (url.includes("spotify")) {
          if (args.includes("/playlist/") || args.includes("/album/")) {
            const spotyPlaylist = [...(await helper.getSpotifyUrl(args))];
            spotyPlaylist.forEach(async url => {
              helper.songPlaylistJoin(url, playlist);
            });
          } else {
            const url = await helper.getSpotifyUrl(args);
            helper.songPlaylistJoin(url, playlist);
          }
        }
        //Regular YouTube Link
        else {
          helper.songPlaylistJoin(url, playlist);
        }
        break;
      case "remove":
        playlist = await helper.retrievePlaylist(
          plName.toLowerCase(),
          server.id
        );
        //YouTube Playlist
        if (!playlist) {
          message.reply(
            `No playlist found with the name \`${plName.toLowerCase()}\`, create it first.`
          );
        } else {
          models.Song.findOne({
            where: { url: url }
          }).then(song => {
            if (song) {
              models.SongPlaylist.findOne({
                where: { songId: song.get().id, playlistId: playlist.id }
              }).then(join => {
                if (join) {
                  join.destroy();
                } else {
                  message.reply(
                    `The URL you're trying to remove is not in the Playlist: \`${plName.toLowerCase()}\`.`
                  );
                }
              });
            }
          });
        }
        break;
      case "view":
        playlist = await helper.retrievePlaylist(
          plName.toLowerCase(),
          server.id
        );
        let totalLength = 0;
        const embed = new Discord.RichEmbed().setColor("#0099ff");
        playlist.songs.forEach((song, index) => {
          embed.addField(
            `${index + 1}. ${song.title}`,
            `${helper.convertSeconds(song.lengthSeconds)} - [Link](${song.url})`
          );
          totalLength += song.lengthSeconds;
        });
        embed.setAuthor(
          `Total Songs:  ${playlist.songs.length}   -   ${helper.convertSeconds(
            totalLength
          )}`
        );
        message.channel.send(embed).then(message => {
          if (playlist.songs.length <= 10) {
            const filter = reaction => {
              return ["❌"].includes(reaction.emoji.name);
            };
            message.react("❌").then(
              message
                .awaitReactions(filter, {
                  max: 2,
                  time: 30000,
                  errors: ["time"]
                })
                .then(collected => {
                  const reaction = collected.first();
                  if (reaction.emoji.name === "❌") {
                    message.delete();
                  }
                })
                .catch(() => {
                  message.delete();
                })
            );
          }
        });
        break;
      case "play":
        playlist = await helper.retrievePlaylist(
          plName.toLowerCase(),
          server.id
        );
        if (playlist) {
          if (message.member.voiceChannel) {
            if (!message.guild.voiceConnection) {
              if (!servers[message.guild.id]) {
                servers[message.guild.id] = {};
              }
              message.member.voiceChannel.join().then(connection => {
                helper.play(connection, message);
              });
            }
            playlist.songs.forEach(async song => {
              const queue = await helper.retreieveQueue(server.id);
              models.SongQueue.findOne({
                where: { songId: song.get().id, queueId: queue.id }
              }).then(joined => {
                if (!joined) {
                  models.SongQueue.create({
                    songId: song.get().id,
                    queueId: queue.id
                  });
                }
              });
            });
          } else {
            message.reply("You need to be in a voice channel.");
          }
        } else {
          message.reply("Playlist not found, try creating it first.");
        }
        break;
      case "list":
        models.Playlist.findAll({
          where: { serverId: server.id },
          include: "songs"
        }).then(playlists => {
          const embed = new Discord.RichEmbed()
            .setAuthor(`Your Server has ${playlists.length} Playlists.`)
            .setColor("#008000");
          playlists.forEach((playlist, index) => {
            embed.addField(
              `${index + 1}.   ${playlist.get().name}`,
              `Song Total: **${playlist.get().songs.length}**`
            );
          });
          message.channel.send(embed);
        });
        break;
    }
  }
};
