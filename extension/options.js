document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get(['serverUrl', 'apiKey'])
  document.getElementById('serverUrl').value = stored.serverUrl || 'http://localhost:3136'
  document.getElementById('apiKey').value = stored.apiKey || ''

  document.getElementById('save').addEventListener('click', async () => {
    const serverUrl = document.getElementById('serverUrl').value.trim().replace(/\/$/, '')
    const apiKey = document.getElementById('apiKey').value.trim()
    await chrome.storage.local.set({ serverUrl, apiKey })
    const status = document.getElementById('status')
    status.textContent = 'Saved!'
    setTimeout(() => { status.textContent = '' }, 2000)
  })
})
