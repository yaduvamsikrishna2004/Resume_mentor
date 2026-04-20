const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 20000);
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timerId);
  }
}

async function requestJson(url, options, { timeoutMs = API_TIMEOUT_MS, retries = 0 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      if (response.ok || !RETRYABLE_STATUS.has(response.status) || attempt === retries) {
        return parseResponse(response);
      }
    } catch (error) {
      const isAbort = error?.name === "AbortError";
      const isLastAttempt = attempt === retries;
      if (isAbort && isLastAttempt) {
        throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Please try again.`);
      }
      if (isLastAttempt) {
        throw error;
      }
    }

    const backoffMs = 350 * (attempt + 1);
    await delay(backoffMs);
  }

  throw new Error("Request failed");
}

async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = payload?.detail || payload?.message || "Request failed";
    throw new Error(errorMessage);
  }
  return payload;
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson(
    `${API_BASE_URL}/upload_resume`,
    {
      method: "POST",
      body: formData
    },
    { timeoutMs: 45000, retries: 0 }
  );
}

export async function analyzeResume(resumeId) {
  return requestJson(
    `${API_BASE_URL}/analyze_resume`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ resume_id: resumeId })
    },
    { timeoutMs: 20000, retries: 1 }
  );
}

export async function compareJob({ resumeId, jobDescription }) {
  return requestJson(
    `${API_BASE_URL}/compare_job`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        resume_id: resumeId,
        job_description: jobDescription
      })
    },
    { timeoutMs: 25000, retries: 1 }
  );
}

export async function getSuggestions(missingSkills, extraContext = {}) {
  return requestJson(
    `${API_BASE_URL}/get_suggestions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        missing_skills: missingSkills,
        extra_context: extraContext
      })
    },
    { timeoutMs: 20000, retries: 1 }
  );
}

export async function mentorChat({ message, resumeId, resumeText = "", chatHistory = [], extraContext = {} }) {
  return requestJson(
    `${API_BASE_URL}/api/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        resume_id: resumeId,
        resume_text: resumeText,
        chat_history: chatHistory,
        resume_context: extraContext
      })
    },
    { timeoutMs: 22000, retries: 1 }
  );
}
