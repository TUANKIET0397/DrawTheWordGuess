console.log("Oke models Player.js")

const { DataTypes } = require("sequelize")

module.exports = (sequelize) => {
    const Player = sequelize.define(
        "Player",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            socket_id: { type: DataTypes.STRING(50), allowNull: false },
            avatar: { type: DataTypes.STRING(50) },
            player_name: { type: DataTypes.STRING(50), allowNull: true },
            score: { type: DataTypes.INTEGER, defaultValue: 0 },
        },
        {
            tableName: "Players",
            timestamps: false,
        }
    )

    return Player
}
