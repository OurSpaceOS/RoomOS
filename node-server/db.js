const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false, // Turn off console logging for SQL
});

// Since the existing PHP server has users, groups, roster, tasks, transactions, etc.
// we only define models we actually are ready to migrate or we define a generic key-value store 
// or JSON store to mimic how some data is accessed.
// Let's create a dynamic key-value settings table exactly like the PHP backend uses ('settings/group-get') 
// and a User table.

const Setting = sequelize.define('Setting', {
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'compositeIndex'
  },
  groupId: {
    type: DataTypes.INTEGER,
    defaultValue: 1, // Assuming global group for simplicity, or 1
    unique: 'compositeIndex'
  },
  date: {
    // optional date string 'YYYY-MM-DD' for range settings
    type: DataTypes.STRING,
    allowNull: true,
    unique: 'compositeIndex'
  },
  value: {
    // Store JSON strings
    type: DataTypes.TEXT,
  }
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false // Use PHP legacy IDs
  },
  name: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    unique: true
  },
  groupId: DataTypes.INTEGER,
});

module.exports = {
  sequelize,
  Setting,
  User,
};
