import { Route, Routes } from "react-router-dom";

import AppShell from "../components/AppShell";
import ChatInterfacePage from "../pages/ChatInterfacePage";
import HistoryPage from "../pages/HistoryPage";
import HomePage from "../pages/HomePage";
import MentorChatPage from "../pages/MentorChatPage";
import ResultsDashboardPage from "../pages/ResultsDashboardPage";
import UploadResumePage from "../pages/UploadResumePage";

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadResumePage />} />
        <Route path="/chat" element={<ChatInterfacePage />} />
        <Route path="/mentor" element={<MentorChatPage />} />
        <Route path="/results" element={<ResultsDashboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;
