
const express = require("express");
const mongoose = require("mongoose");

const Memory = require("../models/Memory");

const {
  MAX_MEMORY_FACT_LENGTH,
  ALLOWED_CATEGORIES,
  createMemoryEmbedding,
  findSimilarMemory,
  calculateImportance,
} = require("../services/memoryService");

const { createNotification } = require("../utils/notificationHelper");

const router = express.Router();

async function sendMemoryNotification({ userId, title, message }) {
  try {
    await createNotification({
      userId,
      title,
      message,
      type: "achievement",
    });
  } catch (error) {
    console.error("Memory notification failed:", error.message);
  }
}

function validateMemoryInput(fact, category) {
  if (typeof fact !== "string" || !fact.trim()) {
    return {
      error: "Memory fact is required.",
    };
  }

  const cleanFact = fact.trim();

  if (cleanFact.length > MAX_MEMORY_FACT_LENGTH) {
    return {
      error: `Memory cannot exceed ${MAX_MEMORY_FACT_LENGTH} characters.`,
    };
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return {
      error: "Invalid memory category.",
    };
  }

  return { cleanFact };
}

function formatMemory(memory) {
  const data = memory.toObject
    ? memory.toObject()
    : memory;

  const {
    embedding,
    __v,
    ...safeMemory
  } = data;

  return safeMemory;
}

// POST /api/memory
// Create a new memory.

router.post("/", async (req, res) => {
  try {
    const userId = String(req.user.id);
    const { fact, category } = req.body;

    const validation = validateMemoryInput(fact, category);

    if (validation.error) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    const { cleanFact } = validation;

    const existingMemory = await findSimilarMemory(
      userId,
      cleanFact
    );

    if (existingMemory) {
      return res.status(409).json({
        error: "A similar memory already exists.",
        memory: formatMemory(existingMemory),
      });
    }

    const embeddingData = await createMemoryEmbedding(cleanFact);

    const memory = await Memory.create({
      userId,
      fact: cleanFact,
      category,
      importance: calculateImportance(category, cleanFact),
      ...embeddingData,
    });

    await sendMemoryNotification({
      userId,
      title: "New Memory Saved",
      message:
        "A new memory has been successfully saved to your COXEN account.",
    });

    return res.status(201).json({
      message: "Memory saved successfully.",
      memory: formatMemory(memory),
    });
  } catch (error) {
    console.error("Create memory failed:", error.message);

    return res.status(500).json({
      error: "Unable to save memory.",
    });
  }
});

// GET /api/memory
// Retrieve the authenticated user's memories.

router.get("/", async (req, res) => {
  try {
    const userId = String(req.user.id);

    const memories = await Memory.find({ userId })
      .select("-embedding -__v")
      .sort({ importance: -1, updatedAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      memories,
    });
  } catch (error) {
    console.error("Get memories failed:", error.message);

    return res.status(500).json({
      error: "Unable to retrieve memories.",
    });
  }
});

// PUT /api/memory/:id
// Update an existing memory.

router.put("/:id", async (req, res) => {
  try {
    const userId = String(req.user.id);
    const { id } = req.params;
    const { fact, category } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "Invalid memory ID.",
      });
    }

    const validation = validateMemoryInput(fact, category);

    if (validation.error) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    const { cleanFact } = validation;

    const currentMemory = await Memory.findOne({
      _id: id,
      userId,
    });

    if (!currentMemory) {
      return res.status(404).json({
        error: "Memory not found.",
      });
    }

    const similarMemory = await findSimilarMemory(
      userId,
      cleanFact,
      currentMemory._id
    );

    if (similarMemory) {
      return res.status(409).json({
        error: "A similar memory already exists.",
        memory: formatMemory(similarMemory),
      });
    }

    const embeddingData = await createMemoryEmbedding(cleanFact);

    currentMemory.fact = cleanFact;
    currentMemory.category = category;
    currentMemory.importance = calculateImportance(
      category,
      cleanFact
    );
    currentMemory.embedding = embeddingData.embedding;
    currentMemory.embeddingModel = embeddingData.embeddingModel;
    currentMemory.embeddingUpdatedAt =
      embeddingData.embeddingUpdatedAt;

    await currentMemory.save();

    await sendMemoryNotification({
      userId,
      title: "Memory Updated",
      message: "Your existing memory has been successfully updated.",
    });

    return res.status(200).json({
      message: "Memory updated successfully.",
      memory: formatMemory(currentMemory),
    });
  } catch (error) {
    console.error("Update memory failed:", error.message);

    return res.status(500).json({
      error: "Unable to update memory.",
    });
  }
});

// DELETE /api/memory/:id
// Delete a memory belonging to the authenticated user.

router.delete("/:id", async (req, res) => {
  try {
    const userId = String(req.user.id);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "Invalid memory ID.",
      });
    }

    const deletedMemory = await Memory.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!deletedMemory) {
      return res.status(404).json({
        error: "Memory not found.",
      });
    }

    await sendMemoryNotification({
      userId,
      title: "Memory Deleted",
      message:
        "A memory has been permanently deleted from your account.",
    });

    return res.status(200).json({
      message: "Memory deleted successfully.",
    });
  } catch (error) {
    console.error("Delete memory failed:", error.message);

    return res.status(500).json({
      error: "Unable to delete memory.",
    });
  }
});

module.exports = router;
