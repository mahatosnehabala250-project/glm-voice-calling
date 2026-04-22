import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VoiceAI - AI Receptionist for Clinics',
    short_name: 'VoiceAI',
    description: 'Multi-tenant Voice AI SaaS platform for Indian health clinics',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#10b981',
    orientation: 'portrait-primary',
    icons: [
      { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' }
    ]
  }
}
