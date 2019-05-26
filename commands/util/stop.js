const commando = require("discord.js-commando");

module.exports = class StopCommand extends commando.Command {
  constructor(client) {
    super(client, {
      name: "stop",
      group: "util",
      memberName: "stop",
      description: ""
    });
  }

  async run(message, argu) {
    if (message.member.voiceChannel) {
      if (!message.guild.voiceConnection) {
        return null;
      } else if (message.guild.voiceConnection) {
        message.guild.voiceConnection.disconnect();
        this.client.user.setActivity(null);
      }
    } else {
      message.reply("You need to be in a voice channel to stop the song.");
    }
  }
};
