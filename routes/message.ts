import express from "express";
import { Response, Request } from "express";
import auth from "../middleware/auth";
import { ObjectId } from "mongoose";
import Chat from "../models/chat";
import Message from "../models/message";
import User from "../models/user";
import { Server as SocketIOServer, Socket } from "socket.io";
const router = express.Router();

interface UserInterface {
  _id: ObjectId;
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
  date: Date;
}

export type UserData = {
  _id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
};

interface MessageRequest extends Request {
  user?: UserInterface;
}

export default function (io: SocketIOServer) {
  // send a message to chat by chatID
  router.post("/", auth, async (req: MessageRequest, res: Response) => {
    const userID = req.user?._id;
    const { chatID, content } = req.body;

    const newMessage = {
      sender: userID,
      content: content,
      chat: chatID,
    };

    try {
      let message = await Message.create(newMessage);
      message = await message.populate("sender", "username email");
      message = await message.populate("chat");

      await User.populate(message, {
        path: "chat.users",
        select: "username email",
      });

      await Chat.findByIdAndUpdate(chatID, {
        latestMessage: message,
      });

      res.send(message);
      console.log(message);

      //

      if (message.chat && message.chat.users) {
        message.chat.users.forEach((user: UserData) => {
          if (user._id !== message.sender) {
            io.in(user._id).emit("message received", message);
          }
        });
      }

      //
    } catch (error) {
      res.status(400).send("Error while creating message");
    }
  });

  // get all messages by chatID
  router.get("/:chatID", auth, async (req: MessageRequest, res: Response) => {
    console.log("Get Messages Called");
    const chatID = req.params.chatID;

    try {
      const messages = await Message.find({ chat: chatID })
        .populate("sender", "username email")
        .populate("chat");

      res.send(messages);
    } catch (error) {
      res.status(400).send("Error while getting messages");
    }
  });

  return router;
}
