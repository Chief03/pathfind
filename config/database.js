const { Sequelize } = require('sequelize');
const path = require('path');

// Create SQLite database connection
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  }
});

// Test the connection
sequelize.authenticate()
  .then(() => {
    console.log('[Database] Connection established successfully.');
  })
  .catch(err => {
    console.error('[Database] Unable to connect:', err);
  });

module.exports = sequelize;