
import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";

const CATEGORIES = [
  "general",
  "goals",
  "education",
  "career",
  "preferences",
  "habits",
];

const DEFAULT_IMPORTANCE = 3;

function getMemoryText(memory) {
  return memory.fact || memory.content || memory.text || memory.value || "";
}

function getMemoryId(memory) {
  return memory._id || memory.id || "";
}

function getMemoryTimestamp(memory) {
  const date = memory.updatedAt || memory.createdAt;
  const timestamp = date ? new Date(date).getTime() : 0;

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatDate(date) {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function readResponse(response) {
  const responseText = await response.text();

  if (!responseText) return {};

  try {
    return JSON.parse(responseText);
  } catch {
    return { message: responseText };
  }
}

function getErrorMessage(data, fallback) {
  return data.message || data.error || fallback;
}

export default function Memories({ apiRequest }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [showEditor, setShowEditor] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);

  const [fact, setFact] = useState("");
  const [category, setCategory] = useState("general");
  const [importance, setImportance] = useState(DEFAULT_IMPORTANCE);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [memoryToDelete, setMemoryToDelete] = useState(null);

  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/api/memory");
      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to load memories.")
        );
      }

      const list = Array.isArray(data)
        ? data
        : data.memories || data.data?.memories || [];

      setMemories(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Memory loading error:", err);
      setError(err.message || "Unable to load memories.");
    } finally {
      setLoading(false);
    }
  }, [apiRequest]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const resetEditor = () => {
    setEditingMemory(null);
    setFact("");
    setCategory("general");
    setImportance(DEFAULT_IMPORTANCE);
  };

  const openNewMemory = () => {
    resetEditor();
    setError("");
    setShowEditor(true);
  };

  const openEditMemory = (memory) => {
    setEditingMemory(memory);
    setFact(getMemoryText(memory));
    setCategory(
      CATEGORIES.includes(memory.category) ? memory.category : "general"
    );
    setImportance(Number(memory.importance ?? DEFAULT_IMPORTANCE));
    setError("");
    setShowEditor(true);
  };

  const closeEditor = () => {
    if (saving) return;

    setShowEditor(false);
    resetEditor();
  };

  const saveMemory = async (event) => {
    event.preventDefault();

    const trimmedFact = fact.trim();

    if (!trimmedFact) {
      setError("Please enter some memory content.");
      return;
    }

    if (trimmedFact.length > 500) {
      setError("Memory content cannot exceed 500 characters.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const isEditing = Boolean(editingMemory);
      const memoryId = getMemoryId(editingMemory);

      if (isEditing && !memoryId) {
        throw new Error("This memory does not have a valid ID.");
      }

      const endpoint = isEditing
        ? `/api/memory/${memoryId}`
        : "/api/memory";

      const response = await apiRequest(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fact: trimmedFact,
          category,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to save memory.")
        );
      }

      setShowEditor(false);
      resetEditor();

      await loadMemories();
    } catch (err) {
      console.error("Save memory error:", err);
      setError(err.message || "Unable to save memory.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteMemory = async () => {
    if (!memoryToDelete) return;

    const memoryId = getMemoryId(memoryToDelete);

    if (!memoryId) {
      setError("This memory does not have a valid ID.");
      setMemoryToDelete(null);
      return;
    }

    setDeletingId(memoryId);
    setError("");

    try {
      const response = await apiRequest(
        `/api/memory/${memoryId}`,
        { method: "DELETE" }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to delete memory.")
        );
      }

      setMemories((current) =>
        current.filter((memory) => getMemoryId(memory) !== memoryId)
      );

      setMemoryToDelete(null);
    } catch (err) {
      console.error("Delete memory error:", err);
      setError(err.message || "Unable to delete memory.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMemories = useMemo(() => {
    let result = [...memories];

    if (categoryFilter !== "all") {
      result = result.filter(
        (memory) => memory.category === categoryFilter
      );
    }

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((memory) => {
        const memoryText = getMemoryText(memory).toLowerCase();
        const memoryCategory = (memory.category || "").toLowerCase();

        return (
          memoryText.includes(query) ||
          memoryCategory.includes(query)
        );
      });
    }

    if (sortBy === "newest") {
      result.sort(
        (a, b) => getMemoryTimestamp(b) - getMemoryTimestamp(a)
      );
    } else if (sortBy === "oldest") {
      result.sort(
        (a, b) => getMemoryTimestamp(a) - getMemoryTimestamp(b)
      );
    } else if (sortBy === "importance") {
      result.sort(
        (a, b) =>
          Number(b.importance ?? DEFAULT_IMPORTANCE) -
          Number(a.importance ?? DEFAULT_IMPORTANCE)
      );
    }

    return result;
  }, [memories, search, categoryFilter, sortBy]);

  const categoryCount = useMemo(() => {
    return new Set(
      memories.map((memory) => memory.category || "general")
    ).size;
  }, [memories]);

  const averageImportance = useMemo(() => {
    if (memories.length === 0) return "0.0";

    const total = memories.reduce(
      (sum, memory) =>
        sum + Number(memory.importance ?? DEFAULT_IMPORTANCE),
      0
    );

    return (total / memories.length).toFixed(1);
  }, [memories]);

  return (
    <section className="memories-page">
      <style>{`
        .memories-page {
          width: 100%;
          max-width: 1150px;
          min-height: 100%;
          margin: 0 auto;
          padding: 30px 32px 50px;
          color: var(--text, #39354e);
          font-family: "DM Sans", sans-serif;
        }

        .memories-page * { box-sizing: border-box; }

        .memories-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 27px;
        }

        .memories-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--primary, #7967ed);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .memories-eyebrow::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--primary, #7967ed);
          box-shadow: 0 0 10px var(--primary, #7967ed);
        }

        .memories-header h2 {
          margin: 9px 0;
          color: var(--text, #302b48);
          font-family: "Space Grotesk", sans-serif;
          font-size: 29px;
          font-weight: 750;
          letter-spacing: -0.8px;
        }

        .memories-header p {
          max-width: 520px;
          margin: 0;
          color: var(--text-secondary, #9692a8);
          font-size: 12px;
          line-height: 1.7;
        }

        .memory-add-button {
          min-height: 42px;
          padding: 0 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid var(--primary, #7967ed);
          border-radius: 10px;
          background: var(--primary, #7967ed);
          color: #fff;
          font-family: inherit;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 5px 13px rgba(111, 91, 239, 0.15);
          transition: 0.2s ease;
        }

        .memory-add-button:hover {
          background: var(--primary-dark, #6855dc);
          border-color: var(--primary-dark, #6855dc);
          transform: translateY(-2px);
          box-shadow: 0 8px 18px rgba(111, 91, 239, 0.22);
        }

        .memory-add-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .memory-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
          padding: 12px 15px;
          border: 1px solid #f1d5dc;
          border-radius: 10px;
          background: #fff5f7;
          color: #b94b65;
          font-size: 12px;
        }

        .memory-error button {
          display: grid;
          place-items: center;
          border: none;
          background: transparent;
          color: inherit;
          cursor: pointer;
        }

        .memory-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .memory-stat-card {
          min-width: 0;
          padding: 19px;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 15px;
          background: var(--surface, #fff);
          box-shadow: 0 4px 15px rgba(43, 36, 91, 0.025);
        }

        .memory-stat-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: var(--primary-soft, #f0edff);
          color: var(--primary, #7967ed);
        }

        .memory-stat-card span {
          display: block;
          margin-bottom: 5px;
          color: var(--text-secondary, #9692a8);
          font-size: 10px;
          font-weight: 600;
        }

        .memory-stat-card strong {
          color: var(--text, #39354e);
          font-family: "Space Grotesk", sans-serif;
          font-size: 22px;
          font-weight: 750;
        }

        .memories-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 19px;
        }

        .memory-search {
          min-width: 200px;
          flex: 1;
          padding: 11px 13px;
          display: flex;
          align-items: center;
          gap: 9px;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 10px;
          background: var(--surface, #fff);
          color: var(--text-secondary, #aaa6b7);
        }

        .memory-search:focus-within {
          border-color: var(--primary-light, #b9adff);
          box-shadow: 0 0 0 3px rgba(120, 103, 255, 0.07);
        }

        .memory-search input {
          width: 100%;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: var(--text, #39354e);
          font-family: inherit;
          font-size: 11px;
        }

        .memory-search input::placeholder {
          color: var(--muted, #aaa6b7);
        }

        .memories-toolbar select {
          min-height: 41px;
          padding: 0 30px 0 12px;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 10px;
          outline: none;
          background: var(--surface, #fff);
          color: var(--text-secondary, #68637c);
          font-family: inherit;
          font-size: 10px;
          cursor: pointer;
        }

        .memories-toolbar select:focus {
          border-color: var(--primary-light, #b9adff);
        }

        .memories-toolbar select option,
        .memory-form-group select option {
          background: var(--surface, #fff);
          color: var(--text, #39354e);
        }

        .memories-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .memory-card {
          min-width: 0;
          padding: 19px;
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 15px;
          background: var(--surface, #fff);
          box-shadow: 0 4px 15px rgba(43, 36, 91, 0.025);
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }

        .memory-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-strong, #dcd6ef);
          box-shadow: 0 8px 22px rgba(43, 36, 91, 0.06);
        }

        .memory-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .memory-category {
          max-width: 70%;
          padding: 5px 9px;
          overflow: hidden;
          border-radius: 6px;
          background: var(--primary-soft, #f0edff);
          color: var(--primary, #7967ed);
          font-size: 9px;
          font-weight: 800;
          text-overflow: ellipsis;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .memory-card-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .memory-card-actions button {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary, #9692a8);
          cursor: pointer;
          transition: 0.2s;
        }

        .memory-card-actions button:hover {
          border-color: var(--border, #e9e4ff);
          background: var(--primary-soft, #f5f2ff);
          color: var(--primary, #7967ed);
        }

        .memory-card-actions button:last-child:hover {
          border-color: #f4dce2;
          background: #fff3f5;
          color: #d45c76;
        }

        .memory-card-actions button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .memory-card-content {
          flex: 1;
          margin: 17px 0 22px;
          color: var(--text, #514c68);
          font-size: 12px;
          line-height: 1.8;
          overflow-wrap: anywhere;
          white-space: pre-wrap;
        }

        .memory-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 9px;
          padding-top: 13px;
          border-top: 1px solid var(--border, #f0eef5);
        }

        .memory-card-footer > span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--text-secondary, #aaa6b7);
          font-size: 9px;
        }

        .memory-importance {
          color: var(--primary, #7967ed) !important;
          font-weight: 750;
        }

        .memories-loading,
        .memories-empty {
          min-height: 260px;
          padding: 35px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px dashed var(--border-strong, #e5e0f4);
          border-radius: 16px;
          background: var(--surface, #fff);
          text-align: center;
        }

        .memories-loading p {
          margin: 13px 0 0;
          color: var(--text-secondary, #9692a8);
          font-size: 11px;
        }

        .memories-empty-icon {
          width: 60px;
          height: 60px;
          margin-bottom: 15px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          background: var(--primary-soft, #f0edff);
          color: var(--primary, #7967ed);
        }

        .memories-empty h3 {
          margin: 0 0 7px;
          color: var(--text, #39354e);
          font-family: "Space Grotesk", sans-serif;
          font-size: 17px;
        }

        .memories-empty p {
          max-width: 350px;
          margin: 0 0 18px;
          color: var(--text-secondary, #9692a8);
          font-size: 11px;
          line-height: 1.7;
        }

        .memory-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-y: auto;
          background: rgba(35, 30, 58, 0.48);
          backdrop-filter: blur(5px);
          animation: memoryFadeIn 0.2s ease;
        }

        .memory-modal {
          width: 100%;
          max-width: 500px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          padding: 25px;
          border: 1px solid var(--border, #eeeaf7);
          border-radius: 19px;
          background: var(--surface, #fff);
          color: var(--text, #39354e);
          box-shadow: 0 20px 60px rgba(31, 25, 66, 0.2);
          animation: memorySlideIn 0.25s ease;
        }

        .memory-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 23px;
        }

        .memory-modal-header h3 {
          margin: 0 0 6px;
          color: var(--text, #39354e);
          font-family: "Space Grotesk", sans-serif;
          font-size: 19px;
        }

        .memory-modal-header p {
          margin: 0;
          color: var(--text-secondary, #9692a8);
          font-size: 10px;
          line-height: 1.6;
        }

        .memory-modal-header > button {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border: 1px solid var(--border, #eeeaf5);
          border-radius: 9px;
          background: var(--surface-soft, #faf9fd);
          color: var(--text-secondary, #77718e);
          cursor: pointer;
        }

        .memory-modal-header > button:hover {
          background: var(--primary-soft, #f1edff);
          color: var(--primary, #7967ed);
        }

        .memory-modal-header > button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .memory-form-group {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-bottom: 19px;
        }

        .memory-form-group label {
          color: var(--text, #514c68);
          font-size: 11px;
          font-weight: 750;
        }

        .memory-form-group textarea,
        .memory-form-group select {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border, #eae8f3);
          border-radius: 10px;
          outline: none;
          background: var(--surface-soft, #fff);
          color: var(--text, #39354e);
          font-family: inherit;
          font-size: 11px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .memory-form-group textarea {
          min-height: 115px;
          resize: vertical;
          line-height: 1.7;
        }

        .memory-form-group textarea:focus,
        .memory-form-group select:focus {
          border-color: var(--primary, #a99aff);
          box-shadow: 0 0 0 3px rgba(120, 103, 255, 0.07);
        }

        .memory-form-group input[type="range"] {
          width: 100%;
          accent-color: var(--primary, #7967ed);
          cursor: pointer;
        }

        .memory-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 25px;
        }

        .memory-cancel-button,
        .memory-save-button,
        .memory-delete-button {
          min-height: 40px;
          padding: 0 16px;
          border-radius: 9px;
          font-family: inherit;
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.2s;
        }

        .memory-cancel-button {
          border: 1px solid var(--border, #eae8f3);
          background: var(--surface, #fff);
          color: var(--text-secondary, #77718e);
        }

        .memory-cancel-button:hover {
          background: var(--surface-soft, #f8f7fc);
        }

        .memory-save-button {
          border: 1px solid var(--primary, #7967ed);
          background: var(--primary, #7967ed);
          color: #fff;
          box-shadow: 0 4px 10px rgba(111, 91, 239, 0.15);
        }

        .memory-save-button:hover {
          background: var(--primary-dark, #6855dc);
          border-color: var(--primary-dark, #6855dc);
          box-shadow: 0 6px 15px rgba(111, 91, 239, 0.23);
          transform: translateY(-1px);
        }

        .memory-delete-button {
          border: 1px solid #d85b75;
          background: #d85b75;
          color: #fff;
        }

        .memory-delete-button:hover {
          background: #bf405d;
          border-color: #bf405d;
        }

        .memory-save-button:disabled,
        .memory-cancel-button:disabled,
        .memory-delete-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .memory-delete-icon {
          width: 52px;
          height: 52px;
          margin: 0 auto 15px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(216, 91, 117, 0.11);
          color: #d85b75;
        }

        .memory-delete-dialog {
          max-width: 400px;
          text-align: center;
        }

        .memory-delete-dialog h3 {
          margin: 0 0 8px;
          color: var(--text, #39354e);
          font-family: "Space Grotesk", sans-serif;
          font-size: 19px;
        }

        .memory-delete-dialog p {
          margin: 0;
          color: var(--text-secondary, #9692a8);
          font-size: 11px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .memory-delete-dialog .memory-modal-actions {
          justify-content: center;
        }

        :root[data-theme="dark"] .memory-stat-card,
        :root[data-theme="dark"] .memory-card {
          box-shadow: none;
        }

        :root[data-theme="dark"] .memory-card:hover {
          border-color: var(--border-strong, #49435f);
        }

        :root[data-theme="dark"] .memory-error {
          background: #30202c;
          border-color: #59303c;
          color: #f0a1b1;
        }

        :root[data-theme="dark"] .memory-card-actions button:last-child:hover {
          background: #3b2633;
          border-color: #59303c;
        }

        :root[data-theme="dark"] .memory-modal-overlay {
          background: rgba(0, 0, 0, 0.65);
        }

        :root[data-theme="dark"] .memory-modal {
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }

        @keyframes memoryFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes memorySlideIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 800px) {
          .memories-page { padding: 24px 20px 40px; }
          .memory-stats { gap: 10px; }
          .memory-stat-card { padding: 14px; gap: 10px; }
          .memory-stat-icon { width: 38px; height: 38px; }
          .memory-stat-card strong { font-size: 19px; }
        }

        @media (max-width: 600px) {
          .memories-page { padding: 20px 14px 35px; }
          .memories-header {
            align-items: flex-start;
            flex-direction: column;
          }
          .memories-header h2 { font-size: 25px; }
          .memory-stats { grid-template-columns: 1fr; }
          .memory-stat-card { padding: 13px 15px; }
          .memories-toolbar {
            align-items: stretch;
            flex-direction: column;
          }
          .memory-search {
            width: 100%;
            min-height: 42px;
          }
          .memories-toolbar select { width: 100%; }
          .memories-grid { grid-template-columns: 1fr; }
          .memory-modal {
            padding: 19px;
            border-radius: 15px;
          }
          .memory-modal-actions { flex-direction: column-reverse; }
          .memory-modal-actions button { width: 100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .memory-card,
          .memory-add-button,
          .memory-card-actions button,
          .memory-save-button {
            transition: none;
          }

          .memory-modal-overlay,
          .memory-modal {
            animation: none;
          }
        }
      `}</style>

      <div className="memories-header">
        <div>
          <span className="memories-eyebrow">PERSONAL KNOWLEDGE</span>
          <h2>Your AI Memory</h2>
          <p>
            Everything COXEN remembers to make your experience
            more personal.
          </p>
        </div>

        <button
          type="button"
          className="memory-add-button"
          onClick={openNewMemory}
        >
          <Icon name="plus" size={18} />
          Add Memory
        </button>
      </div>

      {error && (
        <div className="memory-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <div className="memory-stats">
        <div className="memory-stat-card">
          <div className="memory-stat-icon">
            <Icon name="memory" size={21} />
          </div>
          <div>
            <span>Total Memories</span>
            <strong>{memories.length}</strong>
          </div>
        </div>

        <div className="memory-stat-card">
          <div className="memory-stat-icon">
            <Icon name="sparkles" size={21} />
          </div>
          <div>
            <span>Categories</span>
            <strong>{categoryCount}</strong>
          </div>
        </div>

        <div className="memory-stat-card">
          <div className="memory-stat-icon">
            <Icon name="eye" size={21} />
          </div>
          <div>
            <span>Average Importance</span>
            <strong>{averageImportance}/5</strong>
          </div>
        </div>
      </div>

      <div className="memories-toolbar">
        <div className="memory-search">
          <Icon name="search" size={19} />
          <input
            type="search"
            placeholder="Search your memories..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search memories"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          aria-label="Sort memories"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="importance">Most important</option>
        </select>
      </div>

      {loading ? (
        <div className="memories-loading" aria-live="polite">
          <div className="loading-spinner" />
          <p>Loading your memories...</p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="memories-empty">
          <div className="memories-empty-icon">
            <Icon name="memory" size={32} />
          </div>

          <h3>
            {memories.length === 0
              ? "No memories yet"
              : "No matching memories"}
          </h3>

          <p>
            {memories.length === 0
              ? "Add your first memory to help COXEN understand you better."
              : "Try changing your search or category filter."}
          </p>

          {memories.length === 0 && (
            <button
              type="button"
              className="memory-add-button"
              onClick={openNewMemory}
            >
              <Icon name="plus" size={17} />
              Add your first memory
            </button>
          )}
        </div>
      ) : (
        <div className="memories-grid">
          {filteredMemories.map((memory) => {
            const id = getMemoryId(memory);

            return (
              <article className="memory-card" key={id}>
                <div className="memory-card-top">
                  <span className="memory-category">
                    {memory.category || "general"}
                  </span>

                  <div className="memory-card-actions">
                    <button
                      type="button"
                      onClick={() => openEditMemory(memory)}
                      title="Edit memory"
                      aria-label="Edit memory"
                    >
                      <Icon name="edit" size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemoryToDelete(memory)}
                      disabled={deletingId === id}
                      title="Delete memory"
                      aria-label="Delete memory"
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                </div>

                <p className="memory-card-content">
                  {getMemoryText(memory)}
                </p>

                <div className="memory-card-footer">
                  <span>
                    <Icon name="clock" size={14} />
                    {formatDate(memory.updatedAt || memory.createdAt)}
                  </span>

                  <span className="memory-importance">
                    Importance: {memory.importance ?? DEFAULT_IMPORTANCE}/5
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showEditor && (
        <div
          className="memory-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeEditor();
            }
          }}
        >
          <div
            className="memory-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="memory-modal-title"
          >
            <div className="memory-modal-header">
              <div>
                <h3 id="memory-modal-title">
                  {editingMemory ? "Edit Memory" : "Add New Memory"}
                </h3>
                <p>
                  Save something important for COXEN to remember.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                disabled={saving}
                aria-label="Close editor"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={saveMemory}>
              <div className="memory-form-group">
                <label htmlFor="memory-content">Memory content</label>
                <textarea
                  id="memory-content"
                  rows={5}
                  maxLength={500}
                  placeholder="For example: My favourite subject is mathematics."
                  value={fact}
                  onChange={(event) => setFact(event.target.value)}
                  required
                />
              </div>

              <div className="memory-form-group">
                <label htmlFor="memory-category">Category</label>
                <select
                  id="memory-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="memory-form-group">
                <label htmlFor="memory-importance">
                  Importance: {importance}/5
                </label>
                <input
                  id="memory-importance"
                  type="range"
                  min="1"
                  max="5"
                  value={importance}
                  onChange={(event) =>
                    setImportance(Number(event.target.value))
                  }
                />
              </div>

              <div className="memory-modal-actions">
                <button
                  type="button"
                  className="memory-cancel-button"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="memory-save-button"
                  disabled={saving || !fact.trim()}
                >
                  {saving
                    ? "Saving..."
                    : editingMemory
                      ? "Update Memory"
                      : "Save Memory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {memoryToDelete && (
        <div
          className="memory-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deletingId
            ) {
              setMemoryToDelete(null);
            }
          }}
        >
          <div
            className="memory-modal memory-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="memory-delete-title"
            aria-describedby="memory-delete-description"
          >
            <div className="memory-delete-icon">
              <Icon name="trash" size={25} />
            </div>

            <h3 id="memory-delete-title">Delete this memory?</h3>

            <p id="memory-delete-description">
              This memory will be permanently deleted from COXEN.
              This action cannot be undone.
            </p>

            <div className="memory-modal-actions">
              <button
                type="button"
                className="memory-cancel-button"
                onClick={() => setMemoryToDelete(null)}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="memory-delete-button"
                onClick={confirmDeleteMemory}
                disabled={Boolean(deletingId)}
              >
                {deletingId ? "Deleting..." : "Delete Memory"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
