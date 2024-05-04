import { Schema, Types, model } from "mongoose";

const chatSchema = new Schema(
  {
    isGroupChat: { type: Boolean, default: false },
    chatName: { type: String, trim: true },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    latestMessage: { type: Schema.Types.ObjectId, ref: "Message" },
    groupAdmin: { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

const Chat = model("Chat", chatSchema);

export default Chat;
