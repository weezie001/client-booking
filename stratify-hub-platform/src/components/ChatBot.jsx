import { useState } from 'react'
import './ChatBot.css'

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! How can I help you today? I can assist with bookings, pricing, and more.' }
  ])
  const [input, setInput] = useState('')

  const send = () => {
    if (!input.trim()) return
    setMessages(prev => [
      ...prev,
      { from: 'user', text: input },
      { from: 'bot', text: 'Thanks for your message! An agent will be in touch shortly.' }
    ])
    setInput('')
  }

  return (
    <>
      <button className="chatbot__toggle btn btn-primary" onClick={() => setOpen(o => !o)} aria-label="Chat">
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div className="chatbot__panel glass-panel">
          <div className="chatbot__header">
            <span>Chat with Agent</span>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="chatbot__messages">
            {messages.map((m, i) => (
              <div key={i} className={`chatbot__msg chatbot__msg--${m.from}`}>{m.text}</div>
            ))}
          </div>
          <div className="chatbot__input">
            <input
              className="input-field"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Type a message..."
            />
            <button className="btn btn-primary" onClick={send}>Send</button>
          </div>
        </div>
      )}
    </>
  )
}
