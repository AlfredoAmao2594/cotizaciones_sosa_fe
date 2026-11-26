import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { QuotationFormPage } from "./pages/QuotationFormPage";
import { QuotationsPage } from "./pages/QuotationsPage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { ClientesPage } from "./pages/ClientesPage";
import { AlertsPage } from "./pages/AlertsPage";
import { BancosConfigPage, CondicionesPagoConfigPage, ConfiguracionPage, NumeracionConfigPage, PerfilConfigPage } from "./pages/ConfiguracionPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/cotizaciones" element={<QuotationsPage />} />
              <Route path="/cotizaciones/nueva" element={<QuotationFormPage />} />
              <Route path="/casos/:id" element={<CaseDetailPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/alertas" element={<AlertsPage />} />
              <Route path="/configuracion" element={<ConfiguracionPage />} />
              <Route path="/configuracion/perfil" element={<PerfilConfigPage />} />
              <Route path="/configuracion/bancos" element={<BancosConfigPage />} />
              <Route path="/configuracion/condiciones-pago" element={<CondicionesPagoConfigPage />} />
              <Route path="/configuracion/numeracion" element={<NumeracionConfigPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
