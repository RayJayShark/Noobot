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

    switch (command) {
      case "create":
        models.Server.findOrCreate({
          where: { guildId: message.guild.id }
        }).then(([server]) => {
          const discordUser = message.author.id;
          const serverId = server.id;
          models.Playlist.findOrCreate({
            where: {
              name: plName.toLowerCase(),
              serverId: serverId
            },
            defaults: { createdBy: discordUser }
          }).then(([playlist, created]) => {
            if (created) {
              message.reply(
                `Playlist \`${plName.toLowerCase()}\` was created!`
              );
            } else if (!created) {
              message.reply(
                `There is already a playlist by the name of \`${plName.toLowerCase()}\`, pick a new name.`
              );
            }
          });
        });
        break;
      case "add":
        models.Server.findOrCreate({
          where: { guildId: message.guild.id }
        }).then(([server]) => {
          const serverId = server.id;
          models.Playlist.findOne({
            where: { name: plName.toLowerCase(), serverId: serverId }
          }).then(async playlist => {
            //YouTube Playlist
            if (playlist === null) {
              message.reply(
                `No playlist found with the name \`${plName.toLowerCase()}\`, create it first.`
              );
            } else if (url.includes("&list") || url.includes("playlist?list")) {
              const ytPlaylistUrls = await helper.youtubePlaylist(url);
              ytPlaylistUrls.forEach(url => {
                models.Song.findOne({
                  where: { url: url, playlistId: playlist.id }
                }).then(async song => {
                  if (song) {
                    return;
                  } else {
                    const {
                      title,
                      lengthSeconds
                    } = await helper.youTubeApiSearch(url);
                    models.Song.create({
                      url: url,
                      playlistId: playlist.id,
                      title: title,
                      lengthSeconds: lengthSeconds
                    });
                  }
                });
              });
            } else if (url.includes("spotify")) {
              if (args.includes("/playlist/") || args.includes("/album/")) {
                const spotyPlaylist = [...(await helper.getSpotifyUrl(args))];
                spotyPlaylist.forEach(async url => {
                  const {
                    title,
                    lengthSeconds
                  } = await helper.youTubeApiSearch(url);
                  models.Song.create({
                    playlistId: playlist.id,
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
                    playlistId: playlist.id,
                    url
                  },
                  defaults: {
                    title,
                    lengthSeconds
                  }
                });
              }
            }

            //Regular YouTube Link
            else {
              models.Song.findOne({
                where: {
                  url: url,
                  playlistId: playlist.id
                }
              }).then(async song => {
                if (song) {
                  message.reply(
                    `This URL is already in the playlist \`${plName.toLowerCase()}\`.`
                  );
                } else {
                  const {
                    title,
                    lengthSeconds
                  } = await helper.youTubeApiSearch(url);
                  models.Song.create({
                    url: url,
                    playlistId: playlist.id,
                    title: title,
                    lengthSeconds: lengthSeconds
                  });
                  message.channel.send("Song added to playlist!");
                }
              });
            }
          });
        });
        break;
      case "remove":
        models.Server.findOrCreate({
          where: { guildId: message.guild.id }
        }).then(([server]) => {
          const serverId = server.id;
          models.Playlist.findOne({
            where: { name: plName.toLowerCase(), serverId: serverId }
          }).then(async playlist => {
            //YouTube Playlist
            if (playlist === null) {
              message.reply(
                `No playlist found with the name \`${plName.toLowerCase()}\`, create it first.`
              );
            } else {
              models.Song.findOne({
                where: { url: url, playlistId: playlist.id }
              }).then(song => {
                if (song) {
                  song
                    .destroy()
                    .then(
                      message.reply("Song successfully removed from Playlist!")
                    );
                } else {
                  message.reply(
                    `The URL you're trying to remove is not in the Playlist: \`${plName.toLowerCase()}\`.`
                  );
                }
              });
            }
          });
        });
        break;
      case "view":
        models.Server.findOrCreate({
          where: { guildId: message.guild.id }
        }).then(([server]) => {
          const serverId = server.id;
          models.Playlist.findOne({
            where: { name: plName.toLowerCase(), serverId: serverId },
            include: "songs"
          }).then(async playlist => {
            let totalLength = 0;
            const embed = new Discord.RichEmbed().setColor("#0099ff");
            playlist.get().songs.forEach((song, index) => {
              embed.addField(
                `${index + 1}. ${song.title}`,
                `${helper.convertSeconds(song.lengthSeconds)} - [Link](${
                  song.url
                })`
              );
              totalLength += song.lengthSeconds;
            });
            embed.setAuthor(
              `Total Songs:  ${
                playlist.get().songs.length
              }   -   ${helper.convertSeconds(totalLength)}`
            );
            message.channel.send(embed).then(message => {
              if (playlist.get().songs.length <= 10) {
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
          });
        });
        break;
      case "play":
        models.Server.findOrCreate({
          where: { guildId: message.guild.id }
        }).then(([server]) => {
          models.Queue.findOrCreate({
            where: { serverId: server.id }
          }).then(([queue]) => {
            models.Playlist.findOne({
              where: { name: plName, serverId: queue.serverId },
              include: "songs"
            }).then(playlist => {
              if (playlist) {
                if (message.member.voiceChannel) {
                  if (!message.guild.voiceConnection) {
                    if (!servers[message.guild.id]) {
                      servers[message.guild.id] = {};
                    }
                    playlist.get().songs.forEach(song => {
                      song.update({ QueueId: queue.id, queueId: queue.id });
                    });
                    message.member.voiceChannel.join().then(connection => {
                      helper.play(connection, message);
                    });
                  }
                } else {
                  message.reply("You need to be in a voice channel.");
                }
              } else {
                message.reply("Playlist not found, try creating it first.");
              }
            });
          });
        });
        break;
      case "list":
        models.Server.findOrCreate({
          where: { guildId: message.guild.id }
        }).then(([server]) => {
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
        });
        break;
    }
  }
};
