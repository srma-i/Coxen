
const express = require("express");
const crypto = require("crypto");

const ChatMessage = require("../models/ChatMessage");

const {
  ai,
  CHAT_MODEL,
  systemInstruction,
} = require("../services/aiService");

const {
  retrieveRelevantMemories,
  saveAutomaticMemories,
} = require("../services/memoryService");

const router = express.Router();

const MAX_CHAT_MESSAGE_LENGTH = 6000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_STORED_MESSAGES = 100;
const MAX_IMPORTED_MESSAGES = 100;

function getUserId(req) {
  return String(req.user.id);
}

function normalizeRole(role) {
  if (role === "assistant" || role === "model") {
    return "model";
  }

  if (role === "user") {
    return "user";
  }

  return null;
}

function getChunkText(chunk) {
  try {
    return typeof chunk?.text === "string" ? chunk.text : "";
  } catch (error) {
    console.warn("Unable to read AI response chunk:", error.message);
    return "";
  }
}

function getFinishReason(chunk) {
  return (
    chunk?.candidates?.[0]?.finishReason ||
    chunk?.promptFeedback?.blockReason ||
    "UNKNOWN"
  );
}

function isValidConversationId(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 100
  );
}

function formatConversationTitle(text) {
  const title = text?.trim() || "New conversation";

  return title.length > 45
    ? `${title.slice(0, 45)}...`
    : title;
}

function formatMessages(messages) {
  return messages.map((message) => ({
    id: String(message._id),
    role: message.role,
    content: message.text,
    createdAt: message.createdAt,
  }));
}

// POST /api/chat
// Generate and stream an AI response.

router.post("/", async (req, res) => {
  let savedUserMessage = null;
  let userId;
  let conversationId;
  let completeResponse = "";
  let clientDisconnected = false;

  try {
    userId = getUserId(req);

    const { message } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Message is required.",
      });
    }

    const userMessage = message.trim();

    if (userMessage.length > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `Message cannot exceed ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
      });
    }

    conversationId = isValidConversationId(req.body.conversationId)
      ? req.body.conversationId.trim()
      : crypto.randomUUID();

    const previousMessages = await ChatMessage.find({
      userId,
      conversationId,
    })
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY_MESSAGES)
      .lean();

    previousMessages.reverse();

    savedUserMessage = await ChatMessage.create({
      userId,
      conversationId,
      role: "user",
      text: userMessage,
    });

    let relevantMemories = [];

    try {
      relevantMemories =
        (await retrieveRelevantMemories(userId, userMessage)) || [];
    } catch (error) {
      console.error("Memory retrieval failed:", error.message);
    }

    const memoryContext = relevantMemories.length
      ? [
          "Relevant information from this user's saved memories:",
          "Use these facts only when they help answer the current question.",
          ...relevantMemories.map(
            (memory, index) => `${index + 1}. ${memory.fact}`
          ),
        ].join("\n")
      : "";

    const contents = [];

    if (memoryContext) {
      contents.push(
        {
          role: "user",
          parts: [{ text: memoryContext }],
        },
        {
          role: "model",
          parts: [
            {
              text: "I will use relevant saved information when appropriate.",
            },
          ],
        }
      );
    }

    for (const item of previousMessages) {
      if (!["user", "model"].includes(item.role)) {
        continue;
      }

      if (!item.text?.trim()) {
        continue;
      }

      contents.push({
        role: item.role,
        parts: [{ text: item.text }],
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const startTime = Date.now();
    let lastFinishReason = "UNKNOWN";

    const stream = await ai.models.generateContentStream({
      model: CHAT_MODEL,
      contents,
      config: {
        systemInstruction,
      },
    });

    const iterator = stream[Symbol.asyncIterator]();

    // Wait for the first text chunk so generation errors can still
    // be returned as JSON before the response headers are sent.

    let firstText = "";

    while (true) {
      const result = await iterator.next();

      if (result.done) {
        break;
      }

      const chunk = result.value;
      const chunkText = getChunkText(chunk);

      lastFinishReason = getFinishReason(chunk);

      if (chunkText) {
        firstText = chunkText;
        break;
      }
    }

    if (!firstText.trim()) {
      await ChatMessage.deleteOne({
        _id: savedUserMessage._id,
        userId,
        conversationId,
      });

      savedUserMessage = null;

      return res.status(502).json({
        error:
          "The AI could not generate a response. Please try again or rephrase your message.",
        finishReason: lastFinishReason,
      });
    }

    res.setHeader("X-Conversation-Id", conversationId);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    res.flushHeaders();

    completeResponse = firstText;
    res.write(firstText);

    const onClientDisconnect = () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
      }
    };

    res.on("close", onClientDisconnect);

    while (true) {
      const result = await iterator.next();

      if (result.done) {
        break;
      }

      if (clientDisconnected || res.destroyed || res.writableEnded) {
        clientDisconnected = true;
        break;
      }

      const chunk = result.value;
      const chunkText = getChunkText(chunk);

      lastFinishReason = getFinishReason(chunk);

      if (!chunkText) {
        continue;
      }

      completeResponse += chunkText;
      res.write(chunkText);
    }

    res.off("close", onClientDisconnect);

    // Save only a fully completed response.
    if (!clientDisconnected && completeResponse.trim()) {
      await ChatMessage.create({
        userId,
        conversationId,
        role: "model",
        text: completeResponse,
      });

      console.log(
        `AI response completed in ${Date.now() - startTime} ms.`
      );

      saveAutomaticMemories(userId, userMessage).catch((error) => {
        console.error("Automatic memory saving failed:", error.message);
      });
    }

    if (!clientDisconnected && !res.destroyed && !res.writableEnded) {
      res.end();
    }
  } catch (error) {
    console.error("Chat generation failed:", error.message);

    if (savedUserMessage && !res.headersSent) {
      try {
        await ChatMessage.deleteOne({
          _id: savedUserMessage._id,
          userId,
          conversationId,
        });
      } catch (deleteError) {
        console.error(
          "Unable to remove unanswered message:",
          deleteError.message
        );
      }
    }

    if (res.headersSent) {
      if (!res.destroyed && !res.writableEnded) {
        res.end();
      }

      return;
    }

    return res.status(503).json({
      error: "Unable to generate a response. Please try again.",
      ...(process.env.NODE_ENV === "development"
        ? { details: error.message }
        : {}),
    });
  }
});

// GET /api/chat/conversations
// Retrieve the user's recent conversations.

router.get("/conversations", async (req, res) => {
  try {
    const userId = getUserId(req);

    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          userId,
          conversationId: {
            $exists: true,
            $ne: null,
          },
        },
      },
      {
        $sort: {
          createdAt: 1,
        },
      },
      {
        $group: {
          _id: "$conversationId",
          messages: {
            $push: {
              role: "$role",
              text: "$text",
            },
          },
          createdAt: {
            $first: "$createdAt",
          },
          updatedAt: {
            $last: "$createdAt",
          },
          messageCount: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          updatedAt: -1,
        },
      },
      {
        $limit: 100,
      },
      {
        $project: {
          _id: 0,
          conversationId: "$_id",
          title: {
            $let: {
              vars: {
                firstUserMessage: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$messages",
                        as: "message",
                        cond: {
                          $eq: ["$$message.role", "user"],
                        },
                      },
                    },
                    0,
                  ],
                },
              },
              in: {
                $ifNull: [
                  "$$firstUserMessage.text",
                  "New conversation",
                ],
              },
            },
          },
          createdAt: 1,
          updatedAt: 1,
          messageCount: 1,
        },
      },
    ]);

    const formattedConversations = conversations.map((conversation) => ({
      ...conversation,
      title: formatConversationTitle(conversation.title),
    }));

    return res.status(200).json({
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error("Get conversations failed:", error.message);

    return res.status(500).json({
      error: "Unable to retrieve conversations.",
    });
  }
});

// POST /api/chat/conversations
// Import an existing conversation.

router.post("/conversations", async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId, messages } = req.body;

    if (!isValidConversationId(conversationId)) {
      return res.status(400).json({
        error: "A valid conversation ID is required.",
      });
    }

    if (
      !Array.isArray(messages) ||
      messages.length > MAX_IMPORTED_MESSAGES
    ) {
      return res.status(400).json({
        error: `Messages must be an array containing no more than ${MAX_IMPORTED_MESSAGES} items.`,
      });
    }

    const normalizedConversationId = conversationId.trim();

    const existingMessages = await ChatMessage.exists({
      userId,
      conversationId: normalizedConversationId,
    });

    if (existingMessages) {
      return res.status(200).json({
        message: "Conversation already saved.",
        conversationId: normalizedConversationId,
      });
    }

    const documents = [];

    for (const message of messages) {
      if (!message || typeof message !== "object") {
        continue;
      }

      const role = normalizeRole(message.role);
      const rawText = message.text ?? message.content;

      if (typeof rawText !== "string") {
        continue;
      }

      const text = rawText.trim();

      if (
        !role ||
        !text ||
        text.length > MAX_CHAT_MESSAGE_LENGTH
      ) {
        continue;
      }

      documents.push({
        userId,
        conversationId: normalizedConversationId,
        role,
        text,
      });
    }

    if (documents.length) {
      await ChatMessage.insertMany(documents);
    }

    return res.status(201).json({
      message: "Conversation saved successfully.",
      conversationId: normalizedConversationId,
    });
  } catch (error) {
    console.error("Save conversation failed:", error.message);

    return res.status(500).json({
      error: "Unable to save conversation.",
    });
  }
});

// GET /api/chat/conversations/:id
// Retrieve a specific conversation.

router.get("/conversations/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;

    if (!isValidConversationId(conversationId)) {
      return res.status(400).json({
        error: "Invalid conversation ID.",
      });
    }

    const messages = await ChatMessage.find({
      userId,
      conversationId,
    })
      .sort({ createdAt: 1 })
      .limit(MAX_STORED_MESSAGES)
      .lean();

    if (!messages.length) {
      return res.status(404).json({
        error: "Conversation not found.",
      });
    }

    return res.status(200).json({
      conversationId,
      messages: formatMessages(messages),
    });
  } catch (error) {
    console.error("Get conversation failed:", error.message);

    return res.status(500).json({
      error: "Unable to retrieve conversation.",
    });
  }
});

// DELETE /api/chat/conversations/:id
// Delete a specific conversation.

router.delete("/conversations/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversationId = req.params.id;

    if (!isValidConversationId(conversationId)) {
      return res.status(400).json({
        error: "Invalid conversation ID.",
      });
    }

    const result = await ChatMessage.deleteMany({
      userId,
      conversationId,
    });

    if (!result.deletedCount) {
      return res.status(404).json({
        error: "Conversation not found.",
      });
    }

    return res.status(200).json({
      message: "Conversation deleted successfully.",
      conversationId,
    });
  } catch (error) {
    console.error("Delete conversation failed:", error.message);

    return res.status(500).json({
      error: "Unable to delete conversation.",
    });
  }
});

// GET /api/chat/history
// Retrieve messages from a specific or latest conversation.

router.get("/history", async (req, res) => {
  try {
    const userId = getUserId(req);
    let conversationId = req.query.conversationId;

    if (conversationId && !isValidConversationId(conversationId)) {
      return res.status(400).json({
        error: "Invalid conversation ID.",
      });
    }

    if (!conversationId) {
      const latestMessage = await ChatMessage.findOne({
        userId,
        conversationId: {
          $exists: true,
          $ne: null,
        },
      })
        .sort({ createdAt: -1 })
        .select("conversationId")
        .lean();

      conversationId = latestMessage?.conversationId;
    }

    if (!conversationId) {
      return res.status(200).json({
        conversationId: null,
        messages: [],
      });
    }

    const messages = await ChatMessage.find({
      userId,
      conversationId,
    })
      .sort({ createdAt: -1 })
      .limit(MAX_STORED_MESSAGES)
      .lean();

    messages.reverse();

    return res.status(200).json({
      conversationId,
      messages: formatMessages(messages),
    });
  } catch (error) {
    console.error("Get chat history failed:", error.message);

    return res.status(500).json({
      error: "Unable to retrieve chat history.",
    });
  }
});

// POST /api/chat/history
// Retired endpoint. Messages are saved automatically.

router.post("/history", (req, res) => {
  return res.status(410).json({
    error: "This endpoint is disabled. Messages are saved automatically.",
  });
});

// DELETE /api/chat/history
// Clear all chat history belonging to the authenticated user.

router.delete("/history", async (req, res) => {
  try {
    const userId = getUserId(req);

    await ChatMessage.deleteMany({ userId });

    return res.status(200).json({
      message: "All chat history cleared successfully.",
    });
  } catch (error) {
    console.error("Clear chat history failed:", error.message);

    return res.status(500).json({
      error: "Unable to clear chat history.",
    });
  }
});

module.exports = router;
