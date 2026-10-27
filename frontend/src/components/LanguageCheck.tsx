import { useEffect } from 'react'
import { LANGUAGES } from '../config/languages'

const sampleCaptions: Record<string, string> = {
  en: 'A for loop repeats one action at a time.',
  hi: 'for loop एक समय में एक काम दोहराता है।',
  ta: 'for loop ஒரு நேரத்தில் ஒரு செயலை மீண்டும் செய்கிறது.',
  te: 'for loop ఒక్కోసారి ఒక పనిని మళ్లీ చేస్తుంది.',
  kn: 'for loop ಒಂದೊಂದು ಬಾರಿ ಒಂದು ಕೆಲಸವನ್ನು ಮತ್ತೆ ಮಾಡುತ್ತದೆ.',
}

export function LanguageCheck() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Blu Visual Teacher - Language check'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <main className="language-check-page">
      <header>
        <p className="section-kicker">DEVELOPMENT FONT CHECK</p>
        <h1>Sample captions by language</h1>
        <p>Check that each language displays clearly on this device.</p>
      </header>
      <div className="language-check-grid">
        {LANGUAGES.map((language) => (
          <article className="language-check-card" key={language.code}>
            <h2>{language.name}</h2>
            <p className="language-check-native" lang={language.code}>
              {language.nativeName}
            </p>
            <p className="language-check-caption" lang={language.code}>
              {sampleCaptions[language.code]}
            </p>
          </article>
        ))}
      </div>
    </main>
  )
}
