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
    const discordUser = message.author.id;
    let playlist;

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
        if (playlist && playlist.get().createdBy === message.author.id) {
          //Spotify URL Handler
          if (url.includes("spotify")) {
            //Spotify Playlist
            if (url.includes("/playlist/")) {
              const spotyPlaylist = [...(await helper.getSpotifyUrl(url))];
              spotyPlaylist.forEach(async url => {
                helper.songPlaylistJoin(url, playlist);
              });
            }
            //Spotify Album
            else if (url.includes("/album/")) {
              const spotyAlbum = [...(await helper.getSpotifyUrl(url))];
              for (let i = 0; i < spotyAlbum.length; i++) {
                helper.songPlaylistJoin(spotyAlbum[i], playlist);
              }
            }
            //Regular Spotify Link
            else {
              const url = await helper.getSpotifyUrl(args);
              helper.songPlaylistJoin(url, playlist);
            }
          }
          //YouTube Playlist
          else if (url.includes("youtube.com/playlist")) {
            const ytPlaylistUrls = await helper.youtubePlaylist(url);
            ytPlaylistUrls.forEach(url => {
              helper.songPlaylistJoin(url, playlist);
            });
          }
          //Currently playing song
          else if (url === "nowplaying") {
            const queue = await helper.retrieveQueue(server.id);
            playlist = await helper.retrievePlaylist(
              plName.toLowerCase(),
              server.id
            );

            models.SongPlaylist.findOrCreate({
              where: {
                songId: queue.songs[0].get().id,
                playlistId: playlist.id
              }
            });
          }
          //Regular YouTube Link
          else {
            //Playlist Checker
            if (url.includes("?list") || url.includes("&list")) {
              const filter = (reaction, user) => {
                return (
                  ["1⃣", "2⃣"].includes(reaction.emoji.name) &&
                  user.id === message.author.id
                );
              };
              const sent = await message.channel.send(
                "This URL includes a Playlist - Do you want to:\n1. Add just the song.\n2.Add the entire playlist."
              );

              sent.react("1⃣").then(() => sent.react("2⃣"));
              sent
                .awaitReactions(filter, {
                  max: 1,
                  time: 7000,
                  errors: ["time"]
                })
                .catch(() => sent.delete())
                .then(async collected => {
                  const reaction = collected.first();
                  if (reaction.emoji.name === "1⃣") {
                    helper.songPlaylistJoin(url.split("list")[0], playlist);
                    message.channel
                      .send(`Song added to playlist: ${plName}`)
                      .then(message => {
                        message.delete(2000);
                        sent.delete(1900);
                      });
                  } else if (reaction.emoji.name === "2⃣") {
                    const ytPlaylistUrls = await helper.youtubePlaylist(url);
                    ytPlaylistUrls.forEach(url => {
                      helper.songPlaylistJoin(url, playlist);
                    });
                    message.channel
                      .send(`Added all videos to ${plName}`)
                      .then(message => {
                        message.delete(2000);
                        sent.delete(2000);
                      });
                  }
                });
            }
          }
        } else if (playlist && playlist.get().createdBy !== message.author.id) {
          message
            .reply("Only the creator of the playlist can delete it.")
            .then(message => message.delete(3000));
        } else {
          message
            .reply(
              `No playlist found with the name \`${plName.toLowerCase()}\`, create it first.`
            )
            .then(message => message.delete(3000));
        }
        break;
      case "remove":
        playlist = await helper.retrievePlaylist(
          plName.toLowerCase(),
          server.id
        );
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
        helper.createPagination(playlist.get().songs, message);
        break;
      case "play":
        playlist = await helper.retrievePlaylist(
          plName.toLowerCase(),
          server.id
        );
        if (playlist) {
          if (message.member.voiceChannel) {
            playlist.get().songs.forEach(async song => {
              const queue = await helper.retrieveQueue(server.id);
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
            if (!message.guild.voiceConnection) {
              if (!servers[message.guild.id]) {
                servers[message.guild.id] = {};
              }
              helper.retrieveQueue(server.id).then(queue => {
                if (queue) {
                  message.member.voiceChannel
                    .join()
                    .then(connection => {
                      helper.play(connection, message);
                    })
                    .catch(ex => {
                      message.channel
                        .send("I don't have permission to join this channel.")
                        .then(message => message.delete(3000));
                    });
                }
              });
            }
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

          for (let i = 0; i < 5; i++) {
            if (playlists[i + 5]) {
              embed.addField(
                `${i + 1}.   ${playlists[i].get().name}`,
                `Song Total: **${playlists[i].get().songs.length}**`,
                true
              );
              embed.addField(
                `${i + 6}.   ${playlists[i + 5].get().name}`,
                `Song Total: **${playlists[i + 5].get().songs.length}**`,
                true
              );
            } else if (playlists[i]) {
              embed.addField(
                `${i + 1}.   ${playlists[i].get().name}`,
                `Song Total: **${playlists[i].get().songs.length}**`
              );
            }
          }
          message.channel.send(embed).then(message => message.delete(10000));
        });
        break;
      case "delete":
        playlist = await helper.retrievePlaylist(
          plName.toLowerCase(),
          server.id
        );
        if (playlist && playlist.get().createdBy === message.author.id) {
          const filter = (reaction, user) => {
            return (
              ["👍", "👎"].includes(reaction.emoji.name) &&
              user.id === message.author.id
            );
          };

          const confirm = await message.channel.send(
            `<@${
              message.author.id
            }> Are you sure you want to delete \`${plName}\`?`
          );

          confirm.react("👍").then(() => {
            confirm.react("👎");
          });

          confirm
            .awaitReactions(filter, {
              max: 1,
              time: 10000,
              errors: ["time"]
            })
            .then(collected => {
              const reaction = collected.first();

              if (reaction.emoji.name === "👍") {
                models.SongPlaylist.destroy({
                  where: { playlistId: playlist.id }
                })
                  .then(() => {
                    playlist.destroy();
                  })
                  .then(() => {
                    message.channel
                      .send(`\`${plName}\` was successfully deleted!`)
                      .then(message => {
                        message.delete(3000);
                        confirm.delete(3000);
                      });
                  });
              } else {
                message.channel
                  .send("Okay, I won't delete the playlist.")
                  .then(message => {
                    message.delete(3000);
                    confirm.delete(3000);
                  });
              }
            })
            .catch(() => {
              message.delete();
            });
        } else if (playlist && playlist.get().createdBy !== message.author.id) {
          message
            .reply("Only the creator of the playlist can delete it.")
            .then(message => message.delete(3000));
        } else {
          message
            .reply(`No playlist found by the name of \`${plName}\`.`)
            .then(message => message.delete(3000));
        }
        break;
    }
  }
};
