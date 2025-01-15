// @ts-nocheck
import { existsSync } from 'fs'

import * as dotenv from 'dotenv'
import { DataSource } from 'typeorm'

let envPath

if (process.env.NODE_ENV) {
    const nodeEnvPath = `./.env.${process.env.NODE_ENV}`
    if (existsSync(nodeEnvPath)) {
        envPath = nodeEnvPath
    }
}

if (!envPath && existsSync('./.env.local')) {
    envPath = './.env.local'
}

if (!envPath) {
    envPath = './.env'
}

const env = dotenv.config({ path: envPath })

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: env.parsed?.DATABASE_HOST,
    port: env.parsed?.DATABASE_PORT,
    username: env.parsed?.DATABASE_USERNAME,
    password: env.parsed?.DATABASE_PASSWORD,
    database: env.parsed?.DATABASE_NAME,
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
