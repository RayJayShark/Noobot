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
      group: "music",
      memberName: "playlist",
      description:
        "Create, add, edit, remove, view, play, delete, playlists. List shows all playlists in current server."
    });
  }

  async run(message, args) {
    const command = args.split(" ")[0].toLowerCase();
    const plName = args.split(" ")[1];
    const url = args.split(" ")[2];
    const server = await helper.retrieveServer(message.guild.id);
    const discordUser = message.author.id;
    const manager = this.client.manager;
    let playlist;

    if (!plName && command !== "list") {
      message.reply("No playlist name given to create.");
    } else {
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
              message.reply(
                `Playlist \`${plName.toLowerCase()}\` was created!`
              );
            } else if (!created) {
              message
                .reply(
                  `There is already a playlist by the name of \`${plName.toLowerCase()}\`, pick a new name.`
                )
                .then(message => message.delete(5000));
            }
          });
          break;

        case "add":
          playlist = await helper.retrievePlaylist(
            plName.toLowerCase(),
            server.id
          );
          if (playlist && playlist.get().createdBy === message.author.id) {
            if (!url) {
              message.reply("No URL was detected in your message.");
            } else {
              //Spotify URL Handler
              if (url.includes("spotify")) {
                //Spotify Playlist
                if (url.includes("/playlist/")) {
                  const spotyPlaylist = [...(await helper.getSpotifyUrl(url))];

                  spotyPlaylist.forEach(song => {
                    helper.songPlaylistJoin(song, playlist);
                  });
                  message.channel
                    .send(
                      `Added \`${spotyPlaylist.length}\` songs to \`${plName}\`.`
                    )
                    .then(message => message.delete(2000));
                }

                //Spotify Album
                else if (url.includes("/album/")) {
                  const spotyAlbum = [...(await helper.getSpotifyUrl(url))];

                  spotyAlbum.forEach(song => {
                    helper.songPlaylistJoin(song, playlist);
                  });
                  message.channel
                    .send(
                      `Added \`${spotyAlbum.length}\` songs to \`${plName}\`.`
                    )
                    .then(message => message.delete(2000));
                }

                //Regular Spotify Link
                else {
                  const song = await helper.getSpotifyUrl(args);

                  helper.songPlaylistJoin(song, playlist);
                  message.channel
                    .send(`Added \`${song.info.title}\` to \`${plName}\`.`)
                    .then(message => message.delete(2000));
                }
              }

              //YouTube Playlist
              else if (url.includes("youtube.com/playlist")) {
                const ytPlaylistUrls = await helper.lavalinkForURLOnly(url);

                ytPlaylistUrls.forEach(song => {
                  helper.songPlaylistJoin(song, playlist);
                });
                message.channel
                  .send(
                    `Added \`${ytPlaylistUrls.length}\` songs to \`${plName}\`.`
                  )
                  .then(message => message.delete(2000));
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
                message.channel
                  .send(
                    `Added \`${queue.songs[0].get().title}\` to \`${plName}\`.`
                  )
                  .then(message => message.delete(2000));
              }

              //Regular YouTube Link
              else if (args.includes("youtube") || args.includes("youtu.be")) {
                //Playlist Checker
                if (url.includes("?list") || url.includes("&list")) {
                  const filter = (reaction, user) => {
                    return (
                      ["1⃣", "2⃣"].includes(reaction.emoji.name) &&
                      user.id === message.author.id
                    );
                  };

                  const embed = new Discord.RichEmbed()
                    .setTitle("YouTube Playlist Link Detected")
                    .setColor("#FF0000")
                    .addField(
                      "1.  Add just the song.",
                      "---------------------------"
                    )
                    .addField(
                      "2.  Add the playlist.",
                      "---------------------------"
                    );

                  const sent = await message.channel.send(embed);

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
                        const [song] = await helper.lavalinkForURLOnly(
                          url.split("list")[0]
                        );
                        helper.songPlaylistJoin(song, playlist);
                        sent.delete();
                        message.channel
                          .send(`Added \`${song.info.title}\` to ${plName}.`)
                          .then(message => {
                            message.delete(2000);

                          });
                      } else if (reaction.emoji.name === "2⃣") {
                        const ytPlaylistUrls = await helper.lavalinkForURLOnly(
                          url
                        );
                        ytPlaylistUrls.forEach(song => {
                          helper.songPlaylistJoin(song, playlist);
                        });
                        sent.delete();
                        message.channel
                          .send(
                            `Added \`${ytPlaylistUrls.length}\` videos to \`${plName}\`.`
                          )
                          .then(message => {
                            message.delete(2000);
                          });
                      }
                    });
                } else {
                  const [song] = await helper.lavalinkForURLOnly(url);
                  helper.songPlaylistJoin(song, playlist);
                  message.channel
                    .send(`Added \`${song.info.title}\` to \`${plName}\`.`)
                    .then(message => message.delete(2000));
                }
              }
            }
          } else if (
            playlist &&
            playlist.get().createdBy !== message.author.id
          ) {
            message
              .reply("Only the creator of the playlist can add to it.")
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
            if (!url) {
              message.reply("No URL was detected in your message.");
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
                      message.channel
                        .send(`Successfully removed from \`${plName}\``)
                        .then(message => message.delete(3000));
                    } else {
                      message.reply(
                        `The URL you're trying to remove is not in the Playlist: \`${plName.toLowerCase()}\`.`
                      );
                    }
                  });
                }
              });
            }
          }
          break;
        case "view":
          playlist = await helper.retrievePlaylist(
            plName.toLowerCase(),
            server.id
          );
          if (!playlist) {
            message.reply(
              `No playlist found with the name \`${plName.toLowerCase()}\`, create it first.`
            );
          } else {
            helper.createPagination(playlist.get().songs, message);
          }
          break;

        case "edit":
          playlist = await helper.retrievePlaylist(
            plName.toLowerCase(),
            server.id
          );
          if (!playlist) {
            message.reply(
              `No playlist found with the name \`${plName.toLowerCase()}\`, create it first.`
            );
          } else {
            helper.createPagination(
              playlist.get().songs,
              message,
              false,
              true,
              true
            );
          }
          break;
        case "play":
          playlist = await helper.retrievePlaylist(
            plName.toLowerCase(),
            server.id
          );
          if (playlist) {
            if (message.member.voiceChannel) {
              const queue = await helper.retrieveQueue(server.id);
              playlist.get().songs.forEach(song => {
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

              helper.joinIfNotPlaying(manager, server, message);
            } else {
              message.reply("You need to be in a voice channel.");
            }
          } else {
            message.reply("Playlist not found, try creating it first.");
          }
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
              `<@${message.author.id}> Are you sure you want to delete \`${plName}\`?`
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
          } else if (
            playlist &&
            playlist.get().createdBy !== message.author.id
          ) {
            message
              .reply("Only the creator of the playlist can delete it.")
              .then(message => message.delete(3000));
          } else {
            message
              .reply(`No playlist found by the name of \`${plName}\`.`)
              .then(message => message.delete(3000));
          }
          break;
        case "list":
          models.Playlist.findAll({
            where: { serverId: server.id },
            include: "songs"
          }).then(playlists => {
            helper.createPagination(playlists, message, true);
          });
          break;
      }
    }
  }
};
