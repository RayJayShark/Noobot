const YTDL = require("ytdl-core");
const Spotify = require("node-spotify-api");
const ytSearch = require("yt-search");
require("dotenv").config();

const opts = {
  maxResults: 10,
  key: process.env.YOUTUBE_KEY
};

const spotify = new Spotify({
  id: process.env.SPOTIFY_ID,
  secret: process.env.SPOTIFY_SECRET
});

module.exports = class Helpers {
  static play(connection, message, client) {
    const server = servers[message.guild.id];
    YTDL.getBasicInfo(server.queue[0]).then(result => {
      client.user.setActivity(result.title);
      message.channel.send(`Now playing: ${result.title}`);
    });
    server.dispatcher = connection.playStream(
      YTDL(server.queue[0], { filter: "audioonly" })
    );
    server.queue.shift();
    server.dispatcher.on("end", () => {
      if (server.queue[0]) {
        this.play(connection, message, client);
      } else {
        client.user.setActivity(null);
        connection.disconnect();
      }
    });
  }

  static getSpotifyUrl(args) {
    return new Promise(async (resolve, reject) => {
      if (args.includes("track")) {
        const trackId = args.split("/")[4].split("?")[0];
        let url = await spotify
          .request(`https://api.spotify.com/v1/tracks/${trackId}`)
          .then(data => this.searchYoutube(data))
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
              data["tracks"].items.map(track => this.searchYoutube(track.track))
            );
          })
          .catch(err => {
            reject(err);
          });
        resolve(queue);
      }
    });
  }

  static searchYoutube(data) {
    return new Promise((resolve, reject) => {
      const trackName = data.name;
      const album = data["album"].name;
      const artist = data["album"]["artists"][0].name;
      const date = data["album"].release_date.split("-")[0];
      const duration = data.duration_ms / 1000;
      const search = `${artist} ${trackName} ${date}`;

      ytSearch(search, (err, r) => {
        if (err) {
          reject(err);
        }
        const videos = r.videos;
        const playlists = r.playlists;
        const official = videos.filter(
          video =>
            video.author.name.toLowerCase().includes(artist.toLowerCase()) &&
            video.title.toLowerCase().includes(trackName.toLowerCase())
        );
        const filtered = videos.filter(
          video =>
            (video.seconds - duration < 3 && video.seconds - duration > 0) ||
            (duration - video.seconds < 3 && duration - video.seconds > 0)
        );

        let largest = official[0];
        for (let i = 0; i < official.length; i++) {
          if (official[i].views > largest.views) {
            largest = official[i];
          }
        }

        let largestFiltered = filtered[0];
        for (let i = 0; i < filtered.length; i++) {
          if (filtered[i].views > largestFiltered.views) {
            largestFiltered = filtered[i];
          }
        }

        const newUrl =
          !trackName.toLowerCase().includes("live") && official.length > 0
            ? `https://www.youtube.com${largest.url}`
            : filtered.length > 0
            ? `https://www.youtube.com${largestFiltered.url}`
            : `https://www.youtube.com${videos[0].url}`;

        resolve(newUrl);
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
};
