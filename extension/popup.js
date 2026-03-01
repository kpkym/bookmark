let screenshotDataUrl = null;

document.addEventListener("DOMContentLoaded", async () => {
  // Load saved server URL
  const stored = await chrome.storage.local.get("serverUrl");
  const serverUrlInput = document.getElementById("serverUrl");
  serverUrlInput.value = stored.serverUrl || "http://localhost:3000";

  // Save server URL on change
  serverUrlInput.addEventListener("change", () => {
    chrome.storage.local.set({ serverUrl: serverUrlInput.value });
  });

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById("title").value = tab.title || "";
  document.getElementById("url").value = tab.url || "";

  // Capture screenshot
  try {
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: "png",
    });
    document.getElementById("screenshot-preview").src = screenshotDataUrl;
  } catch (err) {
    console.error("Failed to capture screenshot:", err);
  }

  // Load folders
  try {
    const serverUrl = serverUrlInput.value;
    const res = await fetch(`${serverUrl}/api/folders`);
    const folders = await res.json();
    const select = document.getElementById("folder");
    folders.forEach((f) => {
      const option = document.createElement("option");
      option.value = f.id;
      option.textContent = f.name;
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Failed to load folders:", err);
  }

  // Save button
  document.getElementById("save").addEventListener("click", saveBookmark);
});

async function saveBookmark() {
  const btn = document.getElementById("save");
  const status = document.getElementById("status");
  btn.disabled = true;
  status.textContent = "Saving...";
  status.className = "";

  const serverUrl = document.getElementById("serverUrl").value;
  const formData = new FormData();
  formData.append("url", document.getElementById("url").value);
  formData.append("title", document.getElementById("title").value);
  formData.append("description", document.getElementById("description").value);

  const folderId = document.getElementById("folder").value;
  if (folderId) formData.append("folderId", folderId);

  if (screenshotDataUrl) {
    const blob = await (await fetch(screenshotDataUrl)).blob();
    formData.append("screenshot", blob, "screenshot.png");
  }

  try {
    const res = await fetch(`${serverUrl}/api/bookmarks`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    status.textContent = "Saved!";
    status.className = "success";
    setTimeout(() => window.close(), 1000);
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
    status.className = "error";
    btn.disabled = false;
  }
}
