import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import CookieConsent from "@/components/layout/CookieConsent";
import PwaInstallPrompt from "@/components/layout/PwaInstallPrompt";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import CreatePaymentLink from "./pages/CreatePaymentLink";
import Orders from "./pages/Orders";
import Transactions from "./pages/Transactions";
import Notifications from "./pages/Notifications";
import ClientPayment from "./pages/ClientPayment";
import ClientOrder from "./pages/ClientOrder";
import PaymentRedirect from "./pages/PaymentRedirect";
import Profile from "./pages/Profile";
import NewSubscriptions from "./pages/NewSubscriptions";
import Withdrawal from "./pages/Withdrawal";
import KYC from "./pages/KYC";
import KYCSetup from "./pages/KYCSetup";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import { ProtectedAdminRoute } from "./components/ProtectedAdminRoute";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminUsers from "./pages/Admin/Users";
import AdminTransactions from "./pages/Admin/AdminTransactions";
import AdminDisputes from "./pages/Admin/Disputes";
import AdminRefunds from "./pages/Admin/Refunds";
import AdminKYC from "./pages/Admin/KYC";
import AdminSupport from "./pages/Admin/Support";
import AdminOrders from "./pages/Admin/Orders";
import AdminEscrow from "./pages/Admin/EscrowMonitor";
import AdminWithdrawals from "./pages/Admin/Withdrawals";
import AdminNotifications from "./pages/Admin/MessageTemplates";
import AdminWhatsApp from "./pages/Admin/WhatsApp";
import AdminFeedback from "./pages/Admin/Feedback";
import AdminExchangeRates from "./pages/Admin/ExchangeRates";
import { ExchangeRatesProvider } from "./contexts/ExchangeRatesContext";
import ProviderOrders from "./pages/ProviderOrders";
import ProviderFeedback from "./pages/ProviderFeedback";
import SignIn from "./pages/Auth/SignIn";
import SignUp from "./pages/Auth/SignUp";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import PrivacyPolicy from "./pages/Legal/PrivacyPolicy";
import TermsOfService from "./pages/Legal/TermsOfService";
import CookiePolicy from "./pages/Legal/CookiePolicy";
import EscrowPolicy from "./pages/Legal/EscrowPolicy";
import RefundPolicy from "./pages/Legal/RefundPolicy";
import DisputePolicy from "./pages/Legal/DisputePolicy";
import KYCAMLPolicy from "./pages/Legal/KYCAMLPolicy";
import PrePaymentConditions from "./pages/Legal/PrePaymentConditions";
import ProviderRoute from "./components/ProviderRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ExchangeRatesProvider>
            <CookieConsent />
            <PwaInstallPrompt />
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/legal/confidentialite" element={<PrivacyPolicy />} />
            <Route path="/legal/conditions" element={<TermsOfService />} />
            <Route path="/legal/cookies" element={<CookiePolicy />} />
            <Route path="/legal/paiement-securise" element={<EscrowPolicy />} />
            <Route path="/legal/remboursement" element={<RefundPolicy />} />
            <Route path="/legal/litiges" element={<DisputePolicy />} />
            <Route path="/legal/kyc-aml" element={<KYCAMLPolicy />} />
            <Route path="/legal/avant-paiement" element={<PrePaymentConditions />} />
            <Route path="/legal/terms" element={<TermsOfService />} />
            <Route path="/dashboard" element={<ProviderRoute />}>
              <Route index element={<Dashboard />} />
              <Route path="create-link" element={<CreatePaymentLink />} />
              <Route path="orders" element={<Orders />} />
              <Route path="active-orders" element={<ProviderOrders />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />
              <Route path="kyc" element={<KYC />} />
              <Route path="kyc-setup" element={<KYCSetup />} />
              <Route path="subscriptions" element={<NewSubscriptions />} />
              <Route path="withdrawal" element={<Withdrawal />} />
              <Route path="support" element={<Support />} />
              <Route path="feedback" element={<ProviderFeedback />} />
            </Route>
          {/* Ancienne route /pay — page paiement client */}
          <Route path="/pay/:linkId" element={<ClientPayment />} />
          {/* Suivi commande (après paiement) */}
          <Route path="/order/:linkId" element={<ClientOrder />} />
          <Route path="/admin" element={<ProtectedAdminRoute />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="refunds" element={<AdminRefunds />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="kyc" element={<AdminKYC />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="escrow" element={<AdminEscrow />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="whatsapp" element={<AdminWhatsApp />} />
            <Route path="feedback" element={<AdminFeedback />} />
            <Route path="exchange-rates" element={<AdminExchangeRates />} />
            <Route path="dispute-resolution" element={<Navigate to="/admin/disputes" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ExchangeRatesProvider>
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
