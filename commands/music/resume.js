const commando = require("discord.js-commando");

module.exports = class ResumeCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "resume",
      group: "music",
      memberName: "resume",
      description: "Resumes playing if the song is paused."
    });
  }

  run(message) {
    const server = servers[message.guild.id];
    if (server.dispatcher.paused) {
      server.dispatcher.resume();
    } else {
      message.channel
        .send("I'm already playing.")
        .then(message => message.delete(3000));
    }
  }
};
