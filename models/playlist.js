"use strict";

module.exports = (sequelize, DataTypes) => {
  const Playlist = sequelize.define(
    "Playlist",
    {
      name: DataTypes.STRING,
      createdBy: DataTypes.STRING,
      serverId: DataTypes.INTEGER
    },
    {}
  );
  Playlist.associate = function(models) {
    Playlist.belongsTo(models.Server, { foreignKey: "serverId", as: "server" });
    Playlist.hasMany(models.Song, { as: "songs" });
  };
  return Playlist;
};
