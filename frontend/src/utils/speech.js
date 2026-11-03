let voicesReady = false

function ensureVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const voices = window.speechSynthesis.getVoices()
  if (voices.length) voicesReady = true
  return voices
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicesReady = true
  }
  ensureVoices()
}

export function canSpeak() {
  return typeof window !== 'undefined' && Boolean(window.speechSynthesis)
}

export function stopSpeech() {
  if (canSpeak()) window.speechSynthesis.cancel()
}

function pickEnglishVoice() {
  const voices = ensureVoices()
  return (
    voices.find((v) => /en-US/i.test(v.lang) && /Google|Microsoft|Natural|Jenny|Aria|Guy/i.test(v.name))
    || voices.find((v) => /^en[-_]/i.test(v.lang))
    || voices.find((v) => /en/i.test(v.lang))
    || null
  )
}

export function speakEnglish(text, { rate = 0.92, onstart, onend, onerror } = {}) {
  if (!canSpeak() || !text) {
    onerror?.()
    return false
  }
  stopSpeech()
  const speakNow = () => {
    const utterance = new SpeechSynthesisUtterance(String(text))
    utterance.lang = 'en-US'
    utterance.rate = rate
    const voice = pickEnglishVoice()
    if (voice) utterance.voice = voice
    utterance.onstart = () => onstart?.()
    utterance.onend = () => onend?.()
    utterance.onerror = () => onerror?.()
    window.speechSynthesis.speak(utterance)
  }
  if (!voicesReady) {
    setTimeout(speakNow, 80)
  } else {
    speakNow()
  }
  return true
}
