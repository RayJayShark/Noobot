"use strict";
module.exports = (sequelize, DataTypes) => {
  const Queue = sequelize.define(
    "Queue",
    {
      serverId: DataTypes.INTEGER
    },
    {}
  );
  Queue.associate = function(models) {
    Queue.belongsTo(models.Server, { foreignKey: "serverId", as: "server" });
    Queue.belongsToMany(models.Song, {
      as: "songs",
      through: "SongQueues",
      foreignKey: "queueId"
    });
  };
  return Queue;
};
