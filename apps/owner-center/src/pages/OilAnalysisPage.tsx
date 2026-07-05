// apps/owner-center/src/pages/OilAnalysisPage.tsx
// Oil Analysis Module — nested sub-routing for all module screens.

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardScreen from './oil-analysis/DashboardScreen';
import SampleRegistry from './oil-analysis/SampleRegistry';
import LpMapping from './oil-analysis/LpMapping';
import LabResults from './oil-analysis/LabResults';
import AddSample from './oil-analysis/AddSample';
import EngineerReview from './oil-analysis/EngineerReview';
import TimelineScreen from './oil-analysis/TimelineScreen';
import Trends from './oil-analysis/Trends';
import Reports from './oil-analysis/Reports';
import ModuleSettings from './oil-analysis/ModuleSettings';
import EquipmentLpRegister from './oil-analysis/EquipmentLpRegister';
import EquipmentDetails from './oil-analysis/EquipmentDetails';
import SampleReport from './oil-analysis/SampleReport';
import ActionsScreen from './oil-analysis/ActionsScreen';
import ActionEditorScreen from './oil-analysis/ActionEditorScreen';

export default function OilAnalysisPage(): React.ReactElement {
  return (
    <Routes>
      <Route index element={<DashboardScreen />} />

      <Route path="register" element={<EquipmentLpRegister />} />
      <Route path="equipment/:equipmentId" element={<EquipmentDetails />} />
      <Route path="sample-report" element={<SampleReport />} />

      <Route path="add-sample" element={<AddSample />} />
      <Route path="samples" element={<SampleRegistry />} />
      <Route path="intake" element={<Navigate to="/oil-analysis/add-sample?mode=manual" replace />} />
      <Route path="lp-mapping" element={<LpMapping />} />
      <Route path="lab-results" element={<LabResults />} />
      <Route path="pdf-import" element={<Navigate to="/oil-analysis/add-sample" replace />} />
      <Route path="review" element={<EngineerReview />} />
      <Route path="actions" element={<ActionsScreen />} />
      <Route path="actions/new" element={<ActionEditorScreen />} />
      <Route path="actions/:actionId" element={<ActionEditorScreen />} />
      <Route path="timeline" element={<TimelineScreen />} />
      <Route path="trends" element={<Trends />} />
      <Route path="reports" element={<Reports />} />
      <Route path="settings" element={<ModuleSettings />} />

      <Route path="*" element={<Navigate to="/oil-analysis" replace />} />
    </Routes>
  );
}
