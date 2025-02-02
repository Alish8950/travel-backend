import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" })); //When we have json data
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //When the data is coming from url eg:- in url we have %20, + etc
app.use(express.static("public")); //When we are adding a file so we created public folder
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  })
);

//router import

import userRouter from "./routes/user.routes.js";

//routes declarations
app.use("/api/v1/users", userRouter);

export { app };
