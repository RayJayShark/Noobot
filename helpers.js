const Spotify = require("node-spotify-api");
const Discord = require("discord.js");
const models = require("./models");
const XRegExp = require("xregexp");
const { URLSearchParams } = require("url");
const fetch = require("node-fetch");
require("dotenv").config();

const spotify = new Spotify({
  id: process.env.SPOTIFY_ID,
  secret: process.env.SPOTIFY_SECRET
});

module.exports = class Helpers {
  static async play(player, message, manager) {
    const dbserver = await this.retrieveServer(message.guild.id);

    this.retrieveQueue(dbserver.id).then(found => {
      const checkQueueLength = setInterval(() => {
        if (found.songs.length > 0) {
          clearInterval(checkQueueLength);
          const embed = new Discord.RichEmbed()
            .setColor("#0099ff")
            .setAuthor(`Now Playing:`)
            .setTitle(`${found.songs[0].get().title}`)
            .setURL(`${found.songs[0].get().url}`)
            .setFooter(
              `Length: ${this.convertSeconds(
                found.songs[0].get().lengthSeconds
              )}`
            );

          message.channel.send(embed).then(message => {
            message.delete(10000);
          });

          player.play(found.songs[0].get().track);

          player.once("end", msg => {
            if (msg.reason === "REPLACED") return;
            if (msg.reason === "FINISHED" || msg.reason === "STOPPED") {
              this.retrieveQueue(dbserver.id).then(queue => {
                models.SongQueue.destroy({
                  where: {
                    songId: queue.songs[0].get().id,
                    queueId: queue.id
                  }
                }).then(() => {
                  this.retrieveQueue(dbserver.id).then(queue => {
                    if (queue.songs.length > 0) {
                      this.play(player, message, manager);
                    } else {
                      manager.leave(message.guild.id);
                    }
                  });
                });
              });
            }
          });
        }
      }, 50);
    });
  }

  static getSpotifyUrl(args) {
    return new Promise(async (resolve, reject) => {
      if (args.includes("track")) {
        const trackId = args.split("/")[4].split("?")[0];
        let song = await spotify
          .request(`https://api.spotify.com/v1/tracks/${trackId}`)
          .then(data => this.createYoutubeSearch(data))
          .catch(err => {
            reject(err);
          });
        resolve(song);
      } else if (args.includes("playlist")) {
        const playlistId = args.split("/")[4].split("?")[0];
        const queue = await spotify
          .request(`https://api.spotify.com/v1/playlists/${playlistId}`)
          .then(async data => {
            return await Promise.all(
              data.tracks.items.map(track =>
                this.createYoutubeSearch(track.track)
              )
            );
          })
          .catch(err => {
            reject(err);
          });
        resolve(queue);
      } else if (args.includes("album")) {
        const albumId = args.split("/")[4].split("?")[0];
        const queue = await spotify
          .request(`https://api.spotify.com/v1/albums/${albumId}`)
          .then(async data => {
            return await Promise.all(
              data.tracks.items.map(track =>
                this.createYoutubeSearch(
                  track,
                  data.release_date.split("-")[0],
                  data.name
                )
              )
            );
          })
          .catch(err => {
            reject(err);
          });
        resolve(queue);
      }
    });
  }

  static createYoutubeSearch(data, year, album) {
    return new Promise(async (resolve, reject) => {
      const trackName = data.name;
      const artist = data.artists[0].name;
      const date = data["album"]
        ? data["album"].release_date.split("-")[0]
        : year;
      const duration = data.duration_ms / 1000;
      const albumName = album ? album : data.album.name;
      const search = `${trackName} ${artist}`;
      const song = await this.lavalinkHelper(
        search,
        artist,
        trackName,
        duration,
        albumName
      );

      resolve(song);
    });
  }

  static async retrieveServer(guildId) {
    return new Promise((resolve, reject) => {
      models.Server.findOrCreate({ where: { guildId } }).then(([server]) => {
        resolve(server.get());
      });
    });
  }

  static async retrievePlaylist(name, serverId) {
    return new Promise((resolve, reject) => {
      models.Playlist.findOne({
        where: { name, serverId },
        include: "songs"
      }).then(playlist => {
        if (!playlist) {
          resolve(null);
        } else {
          resolve(playlist);
        }
      });
    });
  }

  static async retrieveQueue(serverId) {
    return new Promise((resolve, reject) => {
      models.Queue.findOrCreate({ where: { serverId }, include: "songs" }).then(
        ([queue]) => {
          resolve(queue.get());
        }
      );
    });
  }

  static async songPlaylistJoin(song, playlist) {
    const {
      track,
      info: { title, length, uri }
    } = song;

    models.Song.findOne({
      where: { track }
    }).then(async song => {
      if (!song) {
        models.Song.create({
          track,
          title,
          url: uri,
          lengthSeconds: length / 1000
        }).then(song => {
          models.SongPlaylist.findOne({
            where: {
              songId: song.get().id,
              playlistId: playlist.id
            }
          }).then(joined => {
            if (!joined) {
              models.SongPlaylist.create({
                songId: song.get().id,
                playlistId: playlist.id
              });
            }
          });
        });
      } else {
        models.SongPlaylist.findOne({
          where: {
            songId: song.get().id,
            playlistId: playlist.id
          }
        }).then(joined => {
          if (!joined) {
            models.SongPlaylist.create({
              songId: song.get().id,
              playlistId: playlist.id
            });
          }
        });
      }
    });
  }

  static async songQueueJoin(video, queue) {
    const {
      track,
      info: { title, uri, length }
    } = video;

    models.Song.findOne({ where: { track } }).then(async song => {
      if (song === null) {
        models.Song.create({
          track,
          title,
          url: uri,
          lengthSeconds: length / 1000
        }).then(song => {
          models.SongQueue.findOne({
            where: {
              songId: song.get().id,
              queueId: queue.id
            }
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
        models.SongQueue.findOne({
          where: {
            songId: song.get().id,
            queueId: queue.id
          }
        }).then(joined => {
          if (!joined) {
            models.SongQueue.create({
              songId: song.get().id,
              queueId: queue.id
            });
          }
        });
      }
    });
  }

  static ytSearchWithChoice(search) {
    return new Promise(async resolve => {
      async function getYouTubeSongs(search) {
        const params = new URLSearchParams();
        params.append("identifier", `ytsearch:${search}`);

        return fetch(`http://localhost:2333/loadtracks?${params.toString()}`, {
          headers: { Authorization: process.env.LAVALINK_PASSWORD }
        })
          .then(res => res.json())
          .then(data => data.tracks)
          .catch(err => {
            console.error(err);
            return null;
          });
      }

      const returnedVideos = await getYouTubeSongs(search);
      const threeVideos = returnedVideos.slice(0, 3);

      resolve(threeVideos);
    });
  }

  static async createPagination(array, message, playlistList, edit, playlist) {
    let arrStart = 0;
    let arrEnd = 5;
    let currentPage = 1;
    const additionalPage = array.length % 5 !== 0 ? 1 : 0;
    const pageTotal =
      array.length === 0 ? 1 : Math.floor(array.length / 5) + additionalPage;

    async function createEmbed(
      sentArray,
      arrStart,
      arrEnd,
      currentPage,
      pageTotal
    ) {
      let pageinateEmbed;
      if (playlistList) {
        const arr = sentArray.slice(arrStart, arrEnd);
        pageinateEmbed = new Discord.RichEmbed()
          .setTimestamp()
          .setAuthor(`Your Server has ${sentArray.length} Playlists.`)
          .setColor("#008000");
        for (let i = 0; i < 5; i++) {
          if (arr[i]) {
            pageinateEmbed.addField(
              `${i + 1}.   ${arr[i].get().name}`,
              `Song Total: **${arr[i].get().songs.length}**`
            );
          }
        }
      } else {
        const arr = sentArray.slice(arrStart, arrEnd);
        pageinateEmbed = new Discord.RichEmbed().setTimestamp();
        for (let i = 0; i < 5; i++) {
          if (arr[i]) {
            pageinateEmbed.addField(
              `${arrStart + i + 1}. ${arr[i].get().title}`,
              `${Helpers.convertSeconds(arr[i].get().lengthSeconds)} - [Link](${
                arr[i].get().url
              })`
            );
          }
        }

        let totalLength = 0;
        for (let i = 0; i < array.length; i++) {
          totalLength += array[i].get().lengthSeconds;
        }

        pageinateEmbed
          .setFooter(`Page ${currentPage} of ${pageTotal}`)
          .setAuthor(
            `Total Songs:  ${array.length}   -   ${Helpers.convertSeconds(
              totalLength
            )}`
          );
      }

      return pageinateEmbed;
    }

    async function waitReaction(
      sent,
      currentPage,
      pageTotal,
      arr,
      messageApproval
    ) {
      const filter = (reaction, user) => {
        return (
          ["⬅", "➡", "❌", "1⃣", "2⃣", "3⃣", "4⃣", "5⃣"].includes(
            reaction.emoji.name
          ) && user.id === message.author.id
        );
      };

      sent
        .react("⬅")
        .catch(err => Helpers.earlyEmoteReact())
        .then(() => sent.react("❌").catch(err => Helpers.earlyEmoteReact()))
        .then(() => sent.react("➡").catch(err => Helpers.earlyEmoteReact()));

      sent
        .awaitReactions(filter, {
          max: 1,
          time: 10000,
          errors: ["time"]
        })
        .then(async collected => {
          const reaction = collected.first();
          if (reaction.emoji.name === "⬅" && currentPage !== 1) {
            currentPage--;
            arrStart -= 5;
            arrEnd -= 5;
          } else if (reaction.emoji.name === "❌") {
            sent.delete(100);
            messageApproval ? messageApproval.delete(100) : null;
          } else if (reaction.emoji.name === "➡" && currentPage !== pageTotal) {
            currentPage++;
            arrStart += 5;
            arrEnd += 5;
          } else if (reaction.emoji.name === "⬅" && currentPage === 1) {
            currentPage = pageTotal;
            arrStart = 5 * pageTotal - 5;
            arrEnd = 5 * pageTotal;
          } else if (reaction.emoji.name === "➡" && currentPage === pageTotal) {
            currentPage = 1;
            arrStart = 0;
            arrEnd = 5;
          }
          let embed = await createEmbed(
            arr,
            arrStart,
            arrEnd,
            currentPage,
            pageTotal
          );
          sent
            .edit(embed)
            .catch(err => {
              Helpers.earlyEmoteReact();
            })
            .then(() =>
              waitReaction(
                sent,
                currentPage,
                pageTotal,
                array,
                messageApproval ? messageApproval : null
              )
            );
        })
        .catch(err => {
          sent.delete().catch(err => Helpers.earlyEmoteReact());
        });
    }

    let embed = await createEmbed(
      array,
      arrStart,
      arrEnd,
      currentPage,
      pageTotal
    );
    let messageApproval;
    if (edit) {
      const originalMessage = message;
      const collector = new Discord.MessageCollector(
        message.channel,
        m => m.author.id === message.author.id,
        { time: 30000, errors: ["time"] }
      );
      messageApproval = await message.reply(
        "Reply with song number to delete it."
      );
      collector.on("collect", async message => {
        const selected = parseInt(message.content);
        if (!isNaN(selected)) {
          if (array[selected - 1]) {
            let server = await Helpers.retrieveServer(message.guild.id);
            const selectedSong = array[selected - 1];
            if (!playlist) {
              let queue = await Helpers.retrieveQueue(server.id);
              models.SongQueue.destroy({
                where: { queueId: queue.id, songId: selectedSong.id }
              }).then(() => {
                message.channel.fetchMessage(sentId).then(message => {
                  message.delete();
                  messageApproval.delete();
                });
                message.channel
                  .send(`\`${selectedSong.title}\` removed from Queue!`)
                  .then(message => message.delete(5000));
                collector.stop();
              });
            } else {
              const plName = originalMessage.content.split(" ")[2];
              const playlist = await Helpers.retrievePlaylist(
                plName,
                server.id
              );
              models.SongPlaylist.destroy({
                where: {
                  playlistId: playlist.id,
                  songId: selectedSong.id
                }
              }).then(destroyed => {
                if (destroyed) {
                  message.channel.fetchMessage(sentId).then(message => {
                    message.delete();
                    messageApproval.delete();
                  });
                  message.channel
                    .send(`\`${selectedSong.title}\` removed from Playlist!`)
                    .then(message => message.delete(5000));
                  collector.stop();
                }
              });
            }
          } else {
            message.channel
              .send("No song from your selected number, try again.")
              .then(message => message.delete(5000));
          }
        }
      });
    }

    let sentId;
    message.channel.send(embed).then(message => {
      sentId = message.id;
      waitReaction(
        message,
        currentPage,
        pageTotal,
        array,
        edit ? messageApproval : null
      );
    });
  }

  static lavalinkHelper(search, artist, trackName, duration, albumName) {
    return new Promise(async resolve => {
      async function getYouTubeSongs(search) {
        const params = new URLSearchParams();
        params.append("identifier", `ytsearch:${search}`);

        return fetch(`http://localhost:2333/loadtracks?${params.toString()}`, {
          headers: { Authorization: process.env.LAVALINK_PASSWORD }
        })
          .then(res => res.json())
          .then(data => data.tracks)
          .catch(err => {
            console.error(err);
            return null;
          });
      }

      const returnedVideos = await getYouTubeSongs(search);
      if ((artist, trackName, duration, albumName)) {
        const filtered = returnedVideos.filter(video => {
          const {
            info: { title, length }
          } = video;
          const exp = XRegExp(`[\\p{L}\\p{Nd}]+`);
          const videoTitle = XRegExp.match(title, exp, "all");
          const searchTitle = XRegExp.match(trackName, exp, "all");
          const lengthInSeconds = length / 1000;

          return (
            (searchTitle.some(word => videoTitle.includes(word)) &&
              lengthInSeconds - duration <= 3 &&
              lengthInSeconds - duration >= 0) ||
            (searchTitle.some(word => videoTitle.includes(word)) &&
              duration - lengthInSeconds <= 3 &&
              duration - lengthInSeconds >= 0)
          );
        });

        const officialVideo = filtered.filter(video => {
          const {
            info: { author }
          } = video;
          return author.toLowerCase().includes(artist.toLowerCase());
        });

        const videoForReturn =
          officialVideo.length > 0
            ? officialVideo[0]
            : filtered.length > 0
            ? filtered[0]
            : returnedVideos[0];

        resolve(videoForReturn);
      }

      resolve(returnedVideos[0]);
    });
  }

  static lavalinkForURLOnly(VideoURL) {
    return new Promise(async resolve => {
      async function getYouTubeSongs(VideoURL) {
        const params = new URLSearchParams();
        params.append("identifier", VideoURL);

        return fetch(`http://localhost:2333/loadtracks?${params.toString()}`, {
          headers: { Authorization: process.env.LAVALINK_PASSWORD }
        })
          .then(res => res.json())
          .then(data => data.tracks)
          .catch(err => {
            console.error(err);
            return null;
          });
      }

      const forReturn = await getYouTubeSongs(VideoURL);

      resolve(forReturn);
    });
  }

  static convertSeconds(sec) {
    let hrs = Math.floor(sec / 3600);
    let min = Math.floor((sec - hrs * 3600) / 60);
    let seconds = sec - hrs * 3600 - min * 60;
    seconds = Math.round(seconds * 100) / 100;

    let result = hrs >= 1 ? hrs + "h" : "";
    result += " " + (min >= 1 ? min + "m" : "0m");
    result +=
      " " +
      (seconds < 10
        ? "0" + seconds + "s"
        : seconds >= 10
        ? seconds + "s"
        : "0s");
    return result;
  }

  static joinIfNotPlaying(manager, server, message) {
    const data = {
      guild: message.guild.id,
      channel: message.member.voiceChannelID,
      host: "localhost"
    };

    const botPlayingMusic = manager.spawnPlayer(data);

    if (!botPlayingMusic.playing && !botPlayingMusic.paused) {
      manager.leave(message.guild.id);
      const player = manager.join(data);

      this.retrieveQueue(server.id).then(queue => {
        if (queue) {
          this.play(player, message, manager);
        }
      });
    }
  }

  //This is here if someone clicks an emote before all 3 are reacted to the message.
  static earlyEmoteReact() {
    return;
  }
};
