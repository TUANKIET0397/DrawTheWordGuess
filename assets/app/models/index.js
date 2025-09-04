const { sequelize } = require('../../config/db/db');

const db = {};

// Import và khởi tạo models
db.Player = require('./Player')(sequelize);

db.sequelize = sequelize;

module.exports = db;
