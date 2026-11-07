import { Navigate, Route, Routes } from 'react-router-dom'
import { AdvertiserShell } from './layouts/AdvertiserShell'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { BillingPage } from './pages/BillingPage'
import { CampaignCreatePage } from './pages/CampaignCreatePage'
import { CampaignDetailPage } from './pages/CampaignDetailPage'
import { CampaignsPage } from './pages/CampaignsPage'
import { CreativesPage } from './pages/CreativesPage'
import { DashboardPage } from './pages/DashboardPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SupportPage } from './pages/SupportPage'
import { TeamPage } from './pages/TeamPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AdvertiserShell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/create" element={<CampaignCreatePage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        <Route path="/inventory" element={<Navigate to="/campaigns" replace />} />
        <Route path="/creatives" element={<CreativesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />
        <Route path="/verification" element={<Navigate to="/settings" replace />} />
        <Route path="/performance" element={<Navigate to="/analytics" replace />} />
        <Route path="/playback-reports" element={<Navigate to="/analytics" replace />} />
        {/* Support remains reachable; it is not part of the primary advertiser sidebar. */}
      </Route>
    </Routes>
  )
}
