// @ts-nocheck
import * as dotenv from 'dotenv'
import { DataSource } from 'typeorm'

const env = dotenv.config({
    path:
        process.env.NODE_ENV !== undefined
            ? `./.env.${process.env.NODE_ENV}.local`
            : './.env.local',
})

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: env.parsed?.DATABASE_HOST,
    port: env.parsed?.DATABASE_PORT,
    username: env.parsed?.DATABASE_USERNAME,
    password: env.parsed?.DATABASE_PASSWORD,
    database: env.parsed?.DATABASE_NAME,
    synchronize: true,
    logging: false,
    entities: ['dist/**/*.entity{.ts,.js}'],
    // entities: ['src/**/*.entity{.ts,.js}'],
    migrations: ['src/migration/*.ts'],
    // migrations: ['dist/migration/*{.ts,.js}'],
})

AppDataSource.initialize()
    .then(() => {
        console.log('Data Source has been initialized!')
    })
    .catch((err) => {
        console.error('Error during Data Source initialization', err)
    })
