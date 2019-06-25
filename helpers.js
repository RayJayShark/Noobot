const YTDL = require("ytdl-core");
const fs = require("fs");
const Spotify = require("node-spotify-api");
const ytSearch = require("yt-search");
const ytlist = require("youtube-playlist");
const request = require("request");
const Discord = require("discord.js");
const models = require("./models");
require("dotenv").config();

const spotify = new Spotify({
  id: process.env.SPOTIFY_ID,
  secret: process.env.SPOTIFY_SECRET
});

const youtubeUrl = "https://www.googleapis.com/youtube/v3/videos?id=";

module.exports = class Helpers {
  static async play(connection, message) {
    const dbserver = await this.retrieveServer(message.guild.id);
    let queue = await this.retreieveQueue(dbserver.id);
    const firstInQueue = queue.songs.length > 0 ? queue.songs[0].get() : null;
    const server = servers[message.guild.id];
    const streamOptions = { volume: 0.8 };
    if (server.dispatcher) {
      streamOptions.volume = server.dispatcher._volume;
    }

    const stream = YTDL(firstInQueue.url, {
      quality: "highestaudio",
      filter: "audioonly"
    }).pipe(fs.WriteStream(`downloads/${Date.now()}.mp3`));

    const embed = new Discord.RichEmbed()
      .setColor("#0099ff")
      .setTitle(`${firstInQueue.title}`)
      .setURL(`${firstInQueue.url}`)
      .setAuthor(`Now Playing:`)
      .setFooter(`Length: ${this.convertSeconds(firstInQueue.lengthSeconds)}`);

    setTimeout(async () => {
      let nowPlaying = await message.channel.send(embed);
      server.dispatcher = connection.playFile(stream.path, streamOptions);
      queue = await this.retreieveQueue(dbserver.id);
      models.SongQueue.findOne({
        where: { songId: firstInQueue.id, queueId: queue.id }
      }).then(join => {
        if (join) {
          join.destroy();
        }
      });

      server.dispatcher.on("end", async () => {
        fs.unlink(stream.path, err => {
          if (err) throw err;
          nowPlaying.delete();
        });
        queue = await this.retreieveQueue(dbserver.id);
        if (queue.songs.length > 0) {
          this.play(connection, message);
        } else {
          connection.disconnect();
        }
      });
    }, 2000);
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
        const playlistId = args.split("/")[6].split("?")[0];
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
                this.createYoutubeSearch(track, data.release_date.split("-")[0])
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

  static createYoutubeSearch(data, year) {
    return new Promise(async (resolve, reject) => {
      const trackName = data.name;
      const artist = data["album"]
        ? data["album"]["artists"][0].name
        : data.artists[0].name;
      const date = data["album"]
        ? data["album"].release_date.split("-")[0]
        : year;
      const duration = data.duration_ms / 1000;
      const search = `${artist} ${trackName} ${date}`;
      const url = await this.searchYoutube(search, artist, trackName, duration);
      resolve(url);
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
        resolve(playlist.get());
      });
    });
  }

  static async retreieveQueue(serverId) {
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

  static searchYoutube(search, artist, trackName, duration) {
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
        if ((artist, trackName, duration)) {
          const official = videos.filter(
            video =>
              video.author.name.toLowerCase().includes(artist.toLowerCase()) &&
              video.title.toLowerCase().includes(trackName.toLowerCase()) &&
              !video.title
                .toLowerCase()
                .includes("live", "conan o'brien", "tutorial")
          );

          let largestOfficial = official[0];
          for (let i = 0; i < official.length; i++) {
            if (official[i].views > largestOfficial.views) {
              largestOfficial = official[i];
            }
          }

          const filtered = videos.filter(
            video =>
              (video.seconds - duration < 3 && video.seconds - duration > 0) ||
              (duration - video.seconds < 3 && duration - video.seconds > 0)
          );

          let largestFiltered = filtered[0];
          for (let i = 0; i < filtered.length; i++) {
            if (filtered[i].views > largestFiltered.views) {
              largestFiltered = filtered[i];
            }
          }

          const newUrl =
            official.length > 0
              ? `https://www.youtube.com${largestOfficial.url}`
              : filtered.length > 0
              ? `https://www.youtube.com${largestFiltered.url}`
              : `https://www.youtube.com${videos[0].url}`;
          resolve(newUrl);
        }

        const newUrl = `https://www.youtube.com${videos[0].url}`;
        resolve(newUrl);
      });
    });
  }

  static async youtubePlaylist(url) {
    return new Promise(async (resolve, reject) => {
      const playlistUrls = await ytlist(url, "url").then(res => {
        return res.data.playlist;
      });
      resolve(playlistUrls);
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
      const videoId = url.match(/(?<=v=)[\D\d]+/);
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
};
