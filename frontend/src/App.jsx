import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import RfqListPage from './pages/RfqListPage';
import CreateRfqPage from './pages/CreateRfqPage';
import RfqDetailsPage from './pages/RfqDetailsPage';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-shell">
        <nav className="topbar">
          <Link to="/" className="topbar-logo">
            <Flame size={24} />
            <span>BidForge</span>
          </Link>
          <div className="topbar-nav">
            <Link to="/" className="btn btn-ghost btn-sm">Auctions</Link>
            <Link to="/create" className="btn btn-primary btn-sm">+ Launch Auction</Link>
          </div>
        </nav>
        <main className="content-area">
          <Routes>
            <Route path="/" element={<RfqListPage />} />
            <Route path="/create" element={<CreateRfqPage />} />
            <Route path="/rfq/:id" element={<RfqDetailsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
