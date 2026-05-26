import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { EngineProvider } from './context/EngineContext';
import { AppShell } from './components/layout/AppShell';
import DashboardRoute from './routes/index';
import RepertoireRoute from './routes/repertoire';
import OutOfBookRoute from './routes/out-of-book';
import BridgeRoute from './routes/bridge';
import MiddlegameRoute from './routes/middlegame';
import TacticsRoute from './routes/tactics';
import LeaksRoute from './routes/leaks';
import ConversionRoute from './routes/conversion';
import EndgameRoute from './routes/endgame';

export default function App() {
  return (
    <EngineProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DashboardRoute />} />
              <Route path="repertoire" element={<RepertoireRoute />} />
              <Route path="out-of-book" element={<OutOfBookRoute />} />
              <Route path="bridge" element={<BridgeRoute />} />
              <Route path="middlegame" element={<MiddlegameRoute />} />
              <Route path="tactics" element={<TacticsRoute />} />
              <Route path="leaks" element={<LeaksRoute />} />
              <Route path="conversion" element={<ConversionRoute />} />
              <Route path="endgame" element={<EndgameRoute />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </EngineProvider>
  );
}
