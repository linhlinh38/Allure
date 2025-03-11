import "dotenv/config";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "./configs/envConfig";
import path from "path";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.DB_HOST,
  port: config.DB_PORT,
  username: config.DB_USER,
  password: config.DB_PASS,
  database: config.DB_NAME,
  entities: [path.resolve(__dirname + "/entities/{*.js,*.ts}")],
  migrations: [path.resolve(__dirname + "/migrations/{*.js,*.ts}")],
});
