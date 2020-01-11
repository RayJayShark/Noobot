"use strict";

module.exports = (sequelize, DataTypes) => {
  const Server = sequelize.define(
    "Server",
    {
      guildId: DataTypes.STRING
    },
    {}
  );
  Server.associate = function(models) {
    Server.hasMany(models.Playlist, { as: "playlists" });
    Server.hasOne(models.Queue);
  };
  return Server;
};
