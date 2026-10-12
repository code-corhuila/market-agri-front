import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HomePage } from '../layout/HomePage';
import { NotFoundPage } from '../layout/NotFoundPage';
import { Shell } from '../layout/Shell';
import { ToastProvider } from '../shared/ui/toast';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ToastProvider>
  );
}
