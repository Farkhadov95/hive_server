import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true, required: true },
    chat: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
  },
  { timestamps: true }
);

const Message = model("Message", messageSchema);

export default Message;
