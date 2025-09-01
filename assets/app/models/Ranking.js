const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ranking = sequelize.define(
    'Ranking',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      room_id: { type: DataTypes.INTEGER },
      player_id: { type: DataTypes.INTEGER },
      rank_palyer: { type: DataTypes.INTEGER },
      score: { type: DataTypes.INTEGER },
    },
    {
      tableName: 'Rankings',
      timestamps: false,
    }
  );

  return Ranking;
};
