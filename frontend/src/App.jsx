import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "../components/AppShell";
import ChatInterfacePage from "../pages/ChatInterfacePage";
import MentorChatPage from "../pages/MentorChatPage";
import ResultsDashboardPage from "../pages/ResultsDashboardPage";
import UploadResumePage from "../pages/UploadResumePage";

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<UploadResumePage />} />
        <Route path="/chat" element={<ChatInterfacePage />} />
        <Route path="/mentor" element={<MentorChatPage />} />
        <Route path="/results" element={<ResultsDashboardPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;
