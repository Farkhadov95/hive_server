import express from "express";
import auth from "../middleware/auth.js";
import Chat from "../models/chat.js";
import Message from "../models/message.js";
import User from "../models/user.js";
const router = express.Router();

export default function (io) {
  // send a message to chat by chatID
  router.post("/", auth, async (req, res) => {
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
        message.chat.users.forEach((user) => {
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
  router.get("/:chatID", auth, async (req, res) => {
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
