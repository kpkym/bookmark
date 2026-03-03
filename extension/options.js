document.addEventListener('DOMContentLoaded', async () => {
  const stored = await chrome.storage.local.get('serverUrl')
  document.getElementById('serverUrl').value = stored.serverUrl || 'http://localhost:3136'

  document.getElementById('save').addEventListener('click', async () => {
    const serverUrl = document.getElementById('serverUrl').value.trim().replace(/\/$/, '')
    await chrome.storage.local.set({ serverUrl })
    const status = document.getElementById('status')
    status.textContent = 'Saved!'
    setTimeout(() => { status.textContent = '' }, 2000)
  })
})
