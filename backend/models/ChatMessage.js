
const mongoose = require("mongoose");

const MAX_MESSAGE_LENGTH = 6000;

const chatMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    conversationId: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["user", "model"],
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_MESSAGE_LENGTH,
    },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({
  userId: 1,
  conversationId: 1,
  createdAt: 1,
});

chatMessageSchema.index({
  userId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
