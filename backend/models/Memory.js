
const mongoose = require("mongoose");

const EMBEDDING_DIMENSIONS = 768;

const memorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    fact: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      enum: [
        "goals",
        "education",
        "career",
        "preferences",
        "habits",
        "general",
      ],
      default: "general",
    },
    importance: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    embedding: {
      type: [Number],
      default: [],
      validate: {
        validator(values) {
          return (
            values.length === 0 ||
            (values.length === EMBEDDING_DIMENSIONS &&
              values.every(Number.isFinite))
          );
        },
        message: `Embedding must contain exactly ${EMBEDDING_DIMENSIONS} valid numbers.`,
      },
    },
    embeddingModel: {
      type: String,
      default: null,
      trim: true,
    },
    embeddingUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

memorySchema.index({
  userId: 1,
  importance: -1,
  updatedAt: -1,
});

memorySchema.index({
  userId: 1,
  category: 1,
  importance: -1,
  updatedAt: -1,
});

module.exports = mongoose.model("Memory", memorySchema);
