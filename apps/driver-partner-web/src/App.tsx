/**
 * The Driver/Partner product is the Expo mobile app in apps/driver-mobile.
 * This Vite app previously showed desktop phone mockups — that presentation was removed by request.
 */
export default function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0B2A6B',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 520 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛺</div>
        <h1 style={{ margin: 0, fontSize: 28 }}>Auto Ad Partner</h1>
        <p style={{ color: '#C7D7FF', lineHeight: 1.5 }}>
          The real Driver / Partner application is the Expo React Native app.
        </p>
        <pre
          style={{
            textAlign: 'left',
            background: '#071F52',
            padding: 16,
            borderRadius: 12,
            overflow: 'auto',
            fontSize: 13,
          }}
        >
          {`cd apps/driver-mobile
npm install
# set EXPO_PUBLIC_API_BASE_URL to your PC LAN IP
npm start
# scan QR with Expo Go on Android`}
        </pre>
      </div>
    </div>
  )
}
