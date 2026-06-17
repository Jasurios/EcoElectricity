import { useState } from 'react'
import styles from './AuthPage.module.css'

export default function LoginPage({ onTabChange, onSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSuccess?.()
  }

  return (
    <div className={styles.pageWrapper}>
      <button className={styles.langButton}>
        <GlobeIcon />
        <span>EN</span>
      </button>

      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <div className={styles.logoCircle}>
            <BoltIcon />
          </div>
        </div>

        <h1 className={styles.title}>EcoElectricity</h1>
        <p className={styles.subtitle}>Sustainable Energy Monitoring</p>

        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${styles.tabActive}`}
            onClick={() => onTabChange('login')}
          >
            Log In
          </button>
          <button
            className={styles.tabBtn}
            onClick={() => onTabChange('signup')}
          >
            Sign Up
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}><MailIcon /></span>
              <input
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}><LockIcon /></span>
              <input
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn}>Log In</button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>Or continue with</span>
          <span className={styles.dividerLine} />
        </div>

        <div className={styles.socialButtons}>
          <button className={styles.socialBtn} onClick={() => onSuccess?.()}>
            <GoogleIcon />
            <span>Continue with Google</span>
          </button>
          <button className={styles.socialBtn} onClick={() => onSuccess?.()}>
            <TelegramIcon />
            <span>Continue with Telegram</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function BoltIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M18 4L8 18H16L14 28L24 14H16L18 4Z" fill="white" strokeLinejoin="round" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="#1a2e35" strokeWidth="1.2" />
      <ellipse cx="8" cy="8" rx="2.8" ry="6.5" stroke="#1a2e35" strokeWidth="1.2" />
      <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="#1a2e35" strokeWidth="1.2" />
      <line x1="2.5" y1="5" x2="13.5" y2="5" stroke="#1a2e35" strokeWidth="1.2" />
      <line x1="2.5" y1="11" x2="13.5" y2="11" stroke="#1a2e35" strokeWidth="1.2" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="12" rx="2" stroke="#547880" strokeWidth="1.4" />
      <path d="M2 6.5L10 11.5L18 6.5" stroke="#547880" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="4" y="9" width="12" height="9" rx="2" stroke="#547880" strokeWidth="1.4" />
      <path d="M6.5 9V6.5C6.5 4.567 8.067 3 10 3C11.933 3 13.5 4.567 13.5 6.5V9" stroke="#547880" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="14" r="1.2" fill="#547880" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M18.1711 10.1945C18.1711 9.47222 18.1128 8.97222 17.9878 8.45276H10.1989V11.6111H14.7461C14.6628 12.4028 14.1461 13.5972 13.0128 14.3972L12.9966 14.5047L15.4989 16.4306L15.6711 16.4472C17.2378 15.0028 18.1711 12.7917 18.1711 10.1945Z" fill="#4285F4"/>
      <path d="M10.199 18.5001C12.4323 18.5001 14.3073 17.7362 15.6712 16.4473L13.0129 14.3973C12.3462 14.8612 11.4323 15.1806 10.199 15.1806C8.01565 15.1806 6.15732 13.7362 5.52399 11.736L5.42177 11.7448L2.82399 13.7448L2.79065 13.8418C4.14648 16.4751 6.96565 18.5001 10.199 18.5001Z" fill="#34A853"/>
      <path d="M5.52387 11.736C5.35721 11.2166 5.26554 10.6638 5.26554 10.0971C5.26554 9.53048 5.35721 8.97771 5.51554 8.45826L5.51053 8.34387L2.87803 6.31055L2.79054 6.35215C2.21554 7.48048 1.88721 8.75215 1.88721 10.0971C1.88721 11.4421 2.21554 12.7138 2.79054 13.8421L5.52387 11.736Z" fill="#FBBC05"/>
      <path d="M10.199 4.01944C11.7573 4.01944 12.8073 4.67778 13.4073 5.22778L15.7323 2.97778C14.299 1.63889 12.4323 0.833344 10.199 0.833344C6.96565 0.833344 4.14648 2.85834 2.79065 5.49167L5.51565 7.59722C6.15732 5.59722 8.01565 4.01944 10.199 4.01944Z" fill="#EB4335"/>
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" fill="#2AABEE"/>
      <path d="M4.5 10.1L14.5 6.3C14.9 6.1 15.3 6.4 15.1 6.9L13.4 14.2C13.3 14.6 12.8 14.7 12.5 14.5L10 12.6L8.8 13.7C8.5 14 8 13.8 8 13.4L8 11.2L12.5 7.9C12.7 7.7 12.5 7.4 12.2 7.6L6.9 11.2L4.7 10.6C4.2 10.4 4.2 9.9 4.5 10.1Z" fill="white"/>
    </svg>
  )
}
