const sequelize = require('../config/database');

require('../models');

const migrate = async () => {
  try {
    console.log('Starting database migration...');
    await sequelize.sync({ force: true });
    console.log('All tables recreated successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
