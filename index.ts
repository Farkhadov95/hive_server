import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import user from "./routes/user";
import chat from "./routes/chat";
import message from "./routes/message";
import cors from "cors";
import dotenv from "dotenv";
import { Server as SocketIOServer, Socket } from "socket.io";

export type UserData = {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
};

const app = express();
dotenv.config();
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}...`);
});

const io = new SocketIOServer(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
  },
});

mongoose
  .connect("mongodb://localhost:27017/hive")
  .then(() => console.log("Connected to MongoDB..."))
  .catch((err) => console.log("Could not connect to MongoDB...", err));

const corsOptions = {
  exposedHeaders: "X-Auth-Token",
};

app.use(express.json());
app.use(helmet());
app.use(cors(corsOptions));

app.use("/user", user);
app.use("/chat", chat);
app.use("/message", message(io));

io.on("connection", (socket: Socket) => {
  console.log("connected to socket");

  socket.on("setup", (userData: UserData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined room: " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));

  // socket.on("new message", (newMessageRecieved) => {
  //   var chat = newMessageRecieved.chat;

  //   if (!chat.users) return console.log("chat.users not defined");

  //   chat.users.forEach((user: UserData) => {
  //     if (user._id == newMessageRecieved.sender._id) return;

  //     socket.in(user._id).emit("message received", newMessageRecieved);
  //   });
  // });
});
