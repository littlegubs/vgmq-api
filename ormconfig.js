const dotenv = require('dotenv');
const env = dotenv.config({
  path: process.env.NODE_ENV !== undefined ? `./.env.${process.env.NODE_ENV}.local` : './.env.local',
});

module.exports = {
    type: 'mysql',
    host: env.parsed.DATABASE_HOST,
    port: env.parsed.DATABASE_PORT,
    username: env.parsed.DATABASE_USERNAME,
    password: env.parsed.DATABASE_PASSWORD,
    database: env.parsed.DATABASE_NAME,
    synchronize: false,
    logging: false,
    entities: ['dist/**/*.entity{.ts,.js}'],
    migrations: ['dist/migration/*.js'],
    cli: {
        migrationsDir: 'src/migration',
    },
}
