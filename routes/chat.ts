import express from "express";
import { Response, Request } from "express";
import Chat from "../models/chat";
import auth from "../middleware/auth";
import User from "../models/user";
import { ObjectId } from "mongoose";

const router = express.Router();

interface UserRequest {
  _id: ObjectId;
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
  date: Date;
}

interface ChatRequest extends Request {
  user?: UserRequest;
}

// get all chats by userID
router.get("/", auth, async (req: ChatRequest, res: Response) => {
  const userID = req.user?._id;
  try {
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: userID } },
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    await User.populate(chats, {
      path: "latestMessage.sender",
      select: "name email",
    });

    res.send(chats);
  } catch (error) {
    res.status(400).send("No chats found");
  }
});

// create chat
router.post("/", auth, async (req: ChatRequest, res: Response) => {
  const { userID, userName } = req.body;
  if (!userID) return res.status(400).send("userID is required");

  let isChat: Chat[] = await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: req.user?._id } } },
      { users: { $elemMatch: { $eq: userID } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name email",
  });

  if (isChat.length > 0) {
    console.log(isChat[0]);
    res.send(isChat[0]);
  } else {
    let chatData = {
      chatName: userName,
      isGroupChat: false,
      users: [req.user?._id, userID],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      console.log(FullChat);
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400).send("Could not create new chat");
    }
  }
});

// create group chat
router.post("/group", auth, async (req: ChatRequest, res: Response) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send("Please fill all the fields");
  }

  let users = JSON.parse(req.body.users);
  if (users.length < 2) {
    return res
      .status(400)
      .send("More than 2 users are required to form a group chat");
  }

  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      isGroupChat: true,
      chatName: req.body.name,
      users: users,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error: Failed to create group chat");
  }
});

// update chat's name
router.put("/rename", auth, async (req: ChatRequest, res: Response) => {
  const { chatID, chatName } = req.body;

  const update = await Chat.findByIdAndUpdate(
    chatID,
    {
      chatName,
    },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!update) return res.status(404).send("Chat not found");
  res.send(update);
});

// add new user to group chat
router.put("/add", auth, async (req: ChatRequest, res: Response) => {
  const { chatID, userID } = req.body;

  const update = await Chat.findByIdAndUpdate(
    chatID,
    {
      $push: { users: userID },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!update) return res.status(404).send("Chat not found");
  res.send(update);
});

// delete user from group chat
router.put("/remove", auth, async (req: ChatRequest, res: Response) => {
  const { chatID, userID } = req.body;

  const remove = await Chat.findByIdAndUpdate(
    chatID,
    {
      $pull: { users: userID },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!remove) return res.status(404).send("Chat not found");
  res.send(remove);
});

router.delete("/:id", auth, async (req: ChatRequest, res: Response) => {
  const chatID = req.params.id;

  const chat = await Chat.findById(chatID);
  if (!chat) return res.status(404).send("Chat not found");
  res.send(chat);
});

export default router;
