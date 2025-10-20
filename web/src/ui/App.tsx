import { Routes, Route } from "react-router-dom";
import "./App.css";
import { Header } from "./Header";
import { LoadTestHome } from "./sim/LoadTestHome";
import { SettingsHome } from "./settings/SettingsHome";

export const App = () => {
  return (
    <div className="container">
      <Header />
      <Routes>
        <Route path="/load-test" element={<LoadTestHome />} />
        <Route path="/settings" element={<SettingsHome />} />
      </Routes>
    </div>
  );
};
