import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Circuit from "./circuits/Circuit";
import ProjectsPage from "./circuits/ProjectsPage";

function App() {
  return (
    <BrowserRouter>
      <div className="w-screen min-h-screen overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Circuit />} />
          <Route path="/projects" element={<ProjectsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
