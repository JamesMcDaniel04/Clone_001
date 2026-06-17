import { Routes, Route, Outlet, useLocation } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth.jsx";
import TopNav from "./components/TopNav.jsx";
import { C, font } from "./lib/theme.js";

import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import ProjectsList from "./pages/projects/List.jsx";
import Project from "./pages/projects/Project.jsx";
import Templates from "./pages/projects/Templates.jsx";
import Reviews from "./pages/reviews/Reviews.jsx";
import FromProjects from "./pages/reviews/FromProjects.jsx";
import LibraryManagement from "./pages/library/Management.jsx";
import LibraryCategory from "./pages/library/Category.jsx";
import MergeVariables from "./pages/library/MergeVariables.jsx";
import Tags from "./pages/library/Tags.jsx";
import LibrarySearch from "./pages/library/Search.jsx";
import Settings from "./pages/Settings.jsx";
import SetupWizard from "./pages/SetupWizard.jsx";

function Shell() {
  const loc = useLocation();
  const wide = loc.pathname.startsWith("/projects");
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <TopNav />
      <main style={{ maxWidth: wide ? "none" : 1100, margin: "0 auto", padding: wide ? "18px 16px 80px" : "28px 20px 80px" }}>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Shell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<ProjectsList />} />
        <Route path="/projects/templates" element={<Templates />} />
        <Route path="/projects/:id" element={<Project />} />
        <Route path="/reviews" element={<FromProjects />} />
        <Route path="/reviews/projects" element={<FromProjects />} />
        <Route path="/reviews/library" element={<Reviews />} />
        <Route path="/library" element={<LibraryManagement />} />
        <Route path="/library/category/:id" element={<LibraryCategory />} />
        <Route path="/library/merge-variables" element={<MergeVariables />} />
        <Route path="/library/tags" element={<Tags />} />
        <Route path="/library/search" element={<LibrarySearch />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
