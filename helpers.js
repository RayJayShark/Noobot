const YTDL = require("ytdl-core");
const ytSearch = require("yt-search");
const Spotify = require("node-spotify-api");
require("dotenv").config();

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

  static convertToYouTube(args, message, client, play, connection) {
    const trackId = args.split("/")[4].split("?")[0];
    this.getSpotifyUrl(trackId, message, client, play, connection);
  }

  static getSpotifyUrl(trackId, message, client, play, connection) {
    spotify
      .request(`https://api.spotify.com/v1/tracks/${trackId}`)
      .then(data => {
        const trackName = data.name;
        const artist = data["album"]["artists"][0].name;
        const date = data["album"].release_date.split("-")[0];
        const duration = data.duration_ms / 1000;
        const search = `${trackName} ${artist} ${date}`;
        this.searchYoutube(search, duration, message, client, play, connection);
      })
      .catch(err => {
        console.error("Error occurred: " + err);
      });
  }

  static searchYoutube(search, duration, message, client, play, connection) {
    const server = servers[message.guild.id];
    ytSearch(search, (err, r) => {
      const videos = r.videos;
      const filtered = videos.filter(
        video =>
          (video.seconds - duration < 2 && video.seconds - duration > 0) ||
          (duration - video.seconds < 2 && duration - video.seconds > 0)
      );
      const newUrl = `https://www.youtube.com/${filtered[0].url}`;
      server.queue.push(newUrl);
      if (play === "true") {
        this.play(connection, message, client);
      }
    });
  }
};
