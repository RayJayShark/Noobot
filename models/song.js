"use strict";
module.exports = (sequelize, DataTypes) => {
  const Song = sequelize.define(
    "Song",
    {
      title: DataTypes.STRING,
      url: DataTypes.STRING,
      lengthSeconds: DataTypes.INTEGER,
      track: DataTypes.TEXT
    },
    {}
  );
  Song.associate = function(models) {
    Song.belongsToMany(models.Playlist, {
      through: "SongPlaylists",
      foreignKey: "songId"
    });
    Song.belongsToMany(models.Queue, {
      through: "SongQueues",
      foreignKey: "songId"
    });
  };
  return Song;
};
