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
    Queue.hasMany(models.Song, { as: "songs" });
  };
  return Queue;
};
