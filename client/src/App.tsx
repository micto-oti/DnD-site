import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "@/pages/LoginPage";
import LobbyPage from "@/pages/LobbyPage";
import RoomPage from "@/pages/RoomPage";

function App(): React.JSX.Element
{
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/lobby" element={<LobbyPage />} />
            <Route path="/room/:id" element={<RoomPage />} />
            <Route path="/" element={<Navigate to="/lobby" replace />} />
            <Route path="*" element={<Navigate to="/lobby" replace />} />
        </Routes>
    );
}

export default App;