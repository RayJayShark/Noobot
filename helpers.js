const YTDL = require("ytdl-core");
const fs = require("fs");
const Spotify = require("node-spotify-api");
const ytSearch = require("yt-search");
const ytlist = require("youtube-playlist");
const request = require("request");
const Discord = require("discord.js");
const models = require("./models");
const XRegExp = require("xregexp");
require("dotenv").config();

const spotify = new Spotify({
  id: process.env.SPOTIFY_ID,
  secret: process.env.SPOTIFY_SECRET
});

const youtubeUrl = "https://www.googleapis.com/youtube/v3/videos?id=";

module.exports = class Helpers {
  static async play(connection, message) {
    const dbserver = await this.retrieveServer(message.guild.id);
    const server = servers[message.guild.id];
    const streamOptions = { volume: 0.8 };
    let stream;
    if (server.dispatcher) {
      streamOptions.volume = server.dispatcher._volume;
    }

    this.retrieveQueue(dbserver.id).then(found => {
      const checkQueueLength = setInterval(() => {
        if (found.songs.length > 0) {
          clearInterval(checkQueueLength);
          YTDL.getInfo(found.songs[0].get().url, (err, info) => {
            if (err) {
              message.channel
                .send(`Cannot play video.\n${err.message}`)
                .then(message => message.delete(3000));
              models.SongQueue.destroy({
                where: {
                  songId: found.songs[0].get().id,
                  queueId: found.id
                }
              });
              if (found.songs.length > 0) {
                this.play(connection, message);
              } else {
                message.guild.voiceConnection.disconnect();
              }
            } else {
              stream = YTDL(found.songs[0].get().url, {
                quality: "highestaudio",
                filter: "audioonly"
              }).pipe(fs.createWriteStream(`downloads/${Date.now()}.mp3`));

              const embed = new Discord.RichEmbed()
                .setColor("#0099ff")
                .setTitle(`${found.songs[0].get().title}`)
                .setURL(`${found.songs[0].get().url}`)
                .setAuthor(`Now Playing:`)
                .setFooter(
                  `Length: ${this.convertSeconds(
                    found.songs[0].get().lengthSeconds
                  )}`
                );

              message.channel.send(embed).then(message => {
                message.delete(10000);
              });
            }
          });
        }
      }, 50);

      const readFile = setInterval(() => {
        if (stream && stream.path) {
          const stats = fs.statSync(stream.path);
          if (stats && stats.size > 20000) {
            clearInterval(readFile);
            server.dispatcher = connection.playFile(stream.path, streamOptions);
            server.dispatcher.on("end", async reason => {
              if (reason === "user" || reason === "stream") {
                this.retrieveQueue(dbserver.id).then(queue => {
                  models.SongQueue.destroy({
                    where: {
                      songId: queue.songs[0].get().id,
                      queueId: queue.id
                    }
                  }).then(() => {
                    this.retrieveQueue(dbserver.id).then(queue => {
                      if (queue.songs.length > 0) {
                        this.play(connection, message, queue);
                      } else {
                        connection.disconnect();
                      }
                    });
                  });
                });
              }
              fs.unlink(stream.path, err => {
                if (err) console.log(err);
              });
            });
          }
        }
      }, 200);
    });
  }

  static getSpotifyUrl(args) {
    return new Promise(async (resolve, reject) => {
      if (args.includes("track")) {
        const trackId = args.split("/")[4].split("?")[0];
        let url = await spotify
          .request(`https://api.spotify.com/v1/tracks/${trackId}`)
          .then(data => this.createYoutubeSearch(data))
          .catch(err => {
            reject(err);
          });
        resolve(url);
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
      const search = `${trackName} ${albumName} ${artist}`;
      const url = await this.searchYoutube(
        search,
        artist,
        trackName,
        duration,
        albumName
      );
      resolve(url);
    });
  }

  static searchYoutube(search, artist, trackName, duration, albumName) {
    return new Promise((resolve, reject) => {
      const opts = {
        query: search,
        pageStart: 1,
        pageEnd: 2
      };
      ytSearch(opts, (err, r) => {
        if (err) {
          reject(err);
        }
        const videos = r.videos;

        if ((artist, trackName, duration, albumName)) {
          const filtered = videos.filter(video => {
            const exp = XRegExp(`[\\p{L}\\p{Nd}]+`);
            const videoTitle = XRegExp.match(video.title, exp, "all").join(" ");
            const searchTitle = XRegExp.match(trackName, exp, "all");
            return (
              (searchTitle.some(word => videoTitle.includes(word)) &&
                video.seconds - duration <= 2 &&
                video.seconds - duration >= 0) ||
              (searchTitle.some(word => videoTitle.includes(word)) &&
                duration - video.seconds <= 2 &&
                duration - video.seconds >= 0)
            );
          });

          const official = filtered.filter(video => {
            return video.author.name
              .toLowerCase()
              .includes(artist.toLowerCase());
          });

          let largestFiltered = filtered[0];
          for (let i = 0; i < filtered.length; i++) {
            if (filtered[i].views > largestFiltered.views) {
              largestFiltered = filtered[i];
            }
          }

          const lastResort = videos.filter(video => {
            return (
              (!video.title.toLowerCase().includes("live") &&
                video.seconds - duration <= 10 &&
                video.seconds - duration >= 0) ||
              (!video.title.toLowerCase().includes("live") &&
                duration - video.seconds <= 10 &&
                duration - video.seconds >= 0)
            );
          });

          const newUrl =
            official.length > 0
              ? `https://www.youtube.com${official[0].url}`
              : largestFiltered
              ? `https://www.youtube.com${largestFiltered.url}`
              : lastResort > 0
              ? `https://www.youtube.com${lastResort[0].url}`
              : `https://www.youtube.com${videos[0].url}`;
          resolve(newUrl);
        }

        const newUrl = `https://www.youtube.com${videos[0].url}`;
        resolve(newUrl);
      });
    });
  }

  static async youtubePlaylist(url) {
    const ytPlaylistId = url.match(/(?<=list=)[\D\d]+/);
    const newUrl = "https://www.youtube.com/playlist?list=" + ytPlaylistId;
    return new Promise(async (resolve, reject) => {
      const playlistUrls = await ytlist(newUrl, "url").then(res => {
        return res.data.playlist;
      });
      resolve(playlistUrls);
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

  static async songPlaylistJoin(url, playlist) {
    models.Song.findOne({
      where: {
        url: url
      }
    }).then(async song => {
      if (!song) {
        const { title, lengthSeconds } = await this.youTubeApiSearch(url);

        models.Song.create({ title, url, lengthSeconds }).then(song => {
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

  static async songQueueJoin(url, queue) {
    models.Song.findOne({ where: { url } }).then(async song => {
      if (!song) {
        const { title, lengthSeconds } = await this.youTubeApiSearch(url);

        models.Song.create({ title, url, lengthSeconds }).then(song => {
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
    return new Promise((resolve, reject) => {
      const opts = {
        query: search,
        pageStart: 1,
        pageEnd: 2
      };
      ytSearch(opts, (err, r) => {
        if (err) {
          reject(err);
        }
        const videos = r.videos;
        resolve([
          {
            title: videos[0].title,
            url: `https://www.youtube.com${videos[0].url}`,
            lengthSeconds: videos[0].seconds,
            author: videos[0].author.name
          },
          {
            title: videos[1].title,
            url: `https://www.youtube.com${videos[1].url}`,
            lengthSeconds: videos[1].seconds,
            author: videos[1].author.name
          },
          {
            title: videos[2].title,
            url: `https://www.youtube.com${videos[2].url}`,
            lengthSeconds: videos[2].seconds,
            author: videos[2].author.name
          }
        ]);
      });
    });
  }

  static async processTitles(array) {
    return await Promise.all(
      array.map((url, index) =>
        YTDL.getBasicInfo(url).then(res => `${index + 1}: ${res.title}`)
      )
    );
  }

  static youTubeApiSearch(url) {
    return new Promise((resolve, reject) => {
      let videoId;
      if (url.includes("watch?v=")) {
        videoId = url.match(/(?<=v=)[\D\d]+/);
      } else if (url.includes("youtu.be")) {
        videoId = url.match(/(?<=be\/)[\D\d]+/);
      }

      request(
        youtubeUrl + videoId + process.env.YOUTUBE_API,
        (error, response, body) => {
          const result = JSON.parse(body);
          if (result.items.length === 0) {
            return;
          } else {
            const duration = result.items[0].contentDetails.duration;
            const hours = duration.match(/\d+H/g);
            const minutes = duration.match(/\d+M/g);
            const seconds = duration.match(/\d+S/g);
            let total = 0;

            if (hours) {
              total += parseInt(hours[0].split("H")[0]) * 3600;
            }
            if (minutes) {
              total += parseInt(minutes[0].split("M")[0]) * 60;
            }
            if (seconds) {
              total += parseInt(seconds[0].split("S")[0]);
            }

            const returning = {
              title: result.items[0].snippet.title,
              lengthSeconds: total
            };

            resolve(returning);
          }
        }
      );
    });
  }

  static async createPagination(array, message, playlistList, edit) {
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
            edit
              ? "Reply with the Song Number to Delete from Queue"
              : `Total Songs:  ${array.length}   -   ${Helpers.convertSeconds(
                  totalLength
                )}`
          );
      }

      return pageinateEmbed;
    }

    async function waitReaction(sent, currentPage, pageTotal, arr) {
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
          time: 30000,
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
            .then(() => waitReaction(sent, currentPage, pageTotal, array));
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
    let sentId;
    message.channel.send(embed).then(message => {
      sentId = message.id;
      waitReaction(message, currentPage, pageTotal, array);
    });

    if (edit) {
      const collector = new Discord.MessageCollector(
        message.channel,
        m => m.author.id === message.author.id,
        { max: 1, time: 30000, errors: ["time"] }
      );
      collector.on("collect", async message => {
        const selected = parseInt(message.content);
        if (selected !== NaN) {
          if (array[selected - 1]) {
            let server = await Helpers.retrieveServer(message.guild.id);
            let queue = await Helpers.retrieveQueue(server.id);
            models.SongQueue.destroy({
              where: { queueId: queue.id, songId: array[selected - 1].id }
            }).then(() => {
              message.channel
                .fetchMessage(sentId)
                .then(message => message.delete());
              message.channel
                .send("Song removed from Queue!")
                .then(message => message.delete(3000));
            });
          }
        }
      });
    }
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

  //This is here if someone clicks an emote before all 3 are reacted to the message.
  static earlyEmoteReact() {
    return;
  }
};
