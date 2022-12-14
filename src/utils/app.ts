import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import errorHandler from "../middlewares/errorHandler";
import limiter from "../middlewares/rateLimit";
import config from "./config";

import docsRoute from "../modules/docs/docs.route";
import healthCheckRoute from "../modules/healthcheck/healthcheck.route";
import userRoute from "../modules/user/user.route";
import authRoute from "../modules/auth/auth.route";
import questionRoute from "../modules/question/question.route";
import quizRoute from "../modules/quiz/quiz.route";

const app: Express = express();

dotenv.config({ path: path.resolve(__dirname, "../.env") });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({ origin: config.CLIENT_URL }));
app.use(limiter);
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.get("/", (_req: Request, res: Response) => {
  return res.sendStatus(200);
});

//Routes
app.use("/docs", docsRoute);
app.use("/healthcheck", healthCheckRoute);
app.use("/user", userRoute);
app.use("/auth", authRoute);
app.use("/question", questionRoute);
app.use("/quiz", quizRoute);

app.use(errorHandler);

export default app;
