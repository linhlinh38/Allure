import express from "express";
import { AppDataSource } from "./dataSource";
import { config } from "./configs/envConfig";
import cors from "cors";
import Logging from "./utils/Logging";
import http from "http";
import "./services/cron.service";
import router from "./routes/index.route";
import { errorHandler } from "./errors/errorHandler";
import { initializeMasterConfig } from "./utils/initializeMasterConfig";
import { initializeSlots } from "./utils/initializeSlots";

const app = express();

const StartServer = () => {
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  const options: cors.CorsOptions = {
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "X-Access-Token",
    ],
    credentials: false,
    methods: "GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE",
    origin: "*",
    preflightContinue: false,
  };

  app.use(cors());

  // Log the request and response
  app.use((req, res, next) => {
    Logging.info(
      `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`
    );

    res.on("finish", () => {
      Logging.info(`STATUS: [${res.statusCode}]`);
    });

    next();
  });

  // Healthcheck
  app.get("/ping", (req, res, next) =>
    res.status(200).json({ hello: "world" })
  );

  //Routes
  app.use("/allure", router);
  app.use(errorHandler);

  // app.use(
  //   "/docs",
  //   swaggerUi.serve,
  //   swaggerUi.setup(undefined, {
  //     swaggerOptions: {
  //       url: "/swagger.json",
  //     },
  //   })
  // );

  http
    .createServer(app)
    .listen(config.PORT, () =>
      Logging.info(`Server is running on port ${config.PORT}`)
    );
};
AppDataSource.initialize()
  .then(async () => {
    StartServer();
    Logging.info("Established connection!");
    await initializeMasterConfig();
    await initializeSlots();
  })
  .catch((error) => Logging.error(error));
