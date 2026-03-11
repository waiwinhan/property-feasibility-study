import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PortfolioDashboard from './pages/PortfolioDashboard'
import ProjectOverview from './pages/ProjectOverview'
import StudyEditor from './pages/StudyEditor'
import CostAllocation from './pages/CostAllocation'
import ScenarioManager from './pages/ScenarioManager'
import ScenarioCompare from './pages/ScenarioCompare'
import SensitivityAnalysis from './pages/SensitivityAnalysis'
import ProjectDashboard from './pages/ProjectDashboard'
import ExportCentre from './pages/ExportCentre'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<PortfolioDashboard />} />
        <Route path="project/:id" element={<ProjectOverview />} />
        <Route path="project/:id/study" element={<StudyEditor />} />
        <Route path="project/:id/cost-allocation" element={<CostAllocation />} />
        <Route path="project/:id/phase/:phaseId/scenarios" element={<ScenarioManager />} />
        <Route path="project/:id/phase/:phaseId/scenarios/compare" element={<ScenarioCompare />} />
        <Route path="project/:id/phase/:phaseId/sensitivity" element={<SensitivityAnalysis />} />
        <Route path="project/:id/dashboard" element={<ProjectDashboard />} />
        <Route path="project/:id/export" element={<ExportCentre />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
