const YTDL = require("ytdl-core");
const fs = require("fs");
const Spotify = require("node-spotify-api");
const ytSearch = require("yt-search");
const ytlist = require("youtube-playlist");
const Discord = require("discord.js");
require("dotenv").config();

const spotify = new Spotify({
  id: process.env.SPOTIFY_ID,
  secret: process.env.SPOTIFY_SECRET
});

module.exports = class Helpers {
  static async play(connection, message) {
    const server = servers[message.guild.id];
    const streamOptions = { volume: 0.8 };
    if (server.dispatcher) {
      streamOptions.volume = server.dispatcher._volume;
    }

    const stream = YTDL(server.queue[0], {
      quality: "highestaudio",
      filter: "audioonly"
    }).pipe(fs.WriteStream(`downloads/${Date.now()}.mp3`));

    YTDL.getBasicInfo(server.queue[0]).then(async result => {
      const embed = new Discord.RichEmbed()
        .setColor("#0099ff")
        .setTitle(`${result.title}`)
        .setFooter(
          `Length: ${this.convertSeconds(
            result.player_response.videoDetails.lengthSeconds
          )}`
        );
      let nowPlaying = await message.channel.send(embed);
      setTimeout(() => {
        server.dispatcher = connection.playFile(stream.path, streamOptions);

        server.queue.shift();
        server.dispatcher.on("end", () => {
          if (server.queue[0]) {
            fs.unlink(stream.path, err => {
              if (err) throw err;
              message.channel
                .fetchMessage(nowPlaying.author.lastMessageID)
                .then(mes => mes.delete());
            });
            this.play(connection, message);
          } else {
            fs.unlink(stream.path, err => {
              if (err) throw err;
              message.channel
                .fetchMessage(nowPlaying.author.lastMessageID)
                .then(mes => mes.delete());
            });
            connection.disconnect();
          }
        });
      }, 500);
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
              !video.title.toLowerCase().includes("live") &&
              !video.title.toLowerCase().includes("conan o'brien")
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