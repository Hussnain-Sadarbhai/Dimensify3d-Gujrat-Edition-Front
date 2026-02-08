import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import STLSlicer from "./components/Slicer";
import Header from "./components/Header";
import HelpSection from "./components/Help";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import HelpRequests from "./components/AdminHelp";
import Checkout from "./components/Checkout";
import LoginPage from "./components/Login";
import SignupPage from "./components/Signup";
import ConsultancyBooking from "./components/Consultancy";
import AdminConsultancyRequests from "./components/AdminConsultancy";
import AdminCoupon from "./components/AdminCoupon";
import ShippingPolicy from "./components/ShippingPolicy";
import CancellationRefundPolicy from "./components/CancellationRefundPolicy";
import TermsConditions from "./components/TermsConditions ";
import PrivacyPolicy from "./components/PrivacyPolicy";
import AdminOrders from "./components/AdminOrders";
import AdminOnlineStore from "./components/AdminOnlineStore";
import OrderUpdate from "./components/AdminOrderUpdate";
import AdminOrderPrint from "./components/AdminOrderPrint";
import OnlineStore from "./components/OnlineStore";
import AdminOnlineStoreDashboard from "./components/AdminOnlineStoreDashoard";
import { Car } from "lucide-react";
import Cart from "./components/Cart";
import AboutUs from "./components/AboutUs";
import OnlineStoreCheckout from "./components/OnlineStoreCheckout";
import AdminOrdersOnlineStore from "./components/AdminOrdersOnlineStore";
import AdminOnlineStoreOrderUpdate from "./components/AdminOnlineStoreOrderUpdate";
import AdminOnlineStoreOrderPrint from "./components/AdminOnlineStoreOrderPrint";
import AdminTransaction from "./components/AdminTransaction";
import Account from "./components/Account";
import ItemDetails from "./components/ItemDetails";
import ProtectedStoreRoute from "./components/ProtectedStoreRoute";
import OnlineStoreLogin from "./components/OnlineStoreLogin";
import Promotion from "./components/Promotion_page";
import Form from "./components/Forms";
import AdminPageViewCount from "./components/AdminPromotionvisit";

// Protected Route Component
const ProtectedAdminRoute = ({ children }) => {
  const isAdminLoggedIn = localStorage.getItem("d3dadminLogin") === "true";

  if (!isAdminLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<STLSlicer />} />
            <Route path="/help" element={<HelpSection />} />
            <Route path="/adminlogin" element={<AdminLogin />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/consultancy" element={<ConsultancyBooking />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/shippingpolicy" element={<ShippingPolicy />} />
            <Route
              path="/cancellationRefundpolicy"
              element={<CancellationRefundPolicy />}
            />
            <Route path="/termsconditions" element={<TermsConditions />} />
            <Route path="/privacypolicy" element={<PrivacyPolicy />} />
            <Route path="/onlinestore" element={<OnlineStore />} />
            <Route path="/onlinestorelogin" element={<OnlineStoreLogin />} />
            <Route path="/More-Info" element={<Promotion />} />
            <Route path="/Forms" element={<Form />} />
            <Route path="/FormsGujratVisit" element={<AdminPageViewCount />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/about" element={<AboutUs />} />
            <Route
              path="/onlinestorecheckout"
              element={<OnlineStoreCheckout />}
            />
            <Route path="/account" element={<Account />} />
            <Route path="/itemdetails" element={<ItemDetails />} />

            {/* Protected Admin Routes */}
            <Route
              path="/admindashboard"
              element={
                <ProtectedAdminRoute>
                  <AdminDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/adminhelp"
              element={
                <ProtectedAdminRoute>
                  <HelpRequests />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/adminconultancy"
              element={
                <ProtectedAdminRoute>
                  <AdminConsultancyRequests />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admincoupon"
              element={
                <ProtectedAdminRoute>
                  <AdminCoupon />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/adminorders"
              element={
                <ProtectedAdminRoute>
                  <AdminOrders />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/adminonlinestore"
              element={
                <ProtectedAdminRoute>
                  <AdminOnlineStore />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/orderupdate"
              element={
                <ProtectedAdminRoute>
                  <OrderUpdate />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/adminorderprint"
              element={
                <ProtectedAdminRoute>
                  <AdminOrderPrint />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/adminonlinestoredashboard"
              element={
                <ProtectedAdminRoute>
                  <AdminOnlineStoreDashboard />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/adminordersonlinestore"
              element={
                <ProtectedAdminRoute>
                  <AdminOrdersOnlineStore />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/adminonlinestoreorderupdate"
              element={
                <ProtectedAdminRoute>
                  <AdminOnlineStoreOrderUpdate />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/adminonlinestoreorderprint"
              element={
                <ProtectedAdminRoute>
                  <AdminOnlineStoreOrderPrint />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admintransaction"
              element={
                <ProtectedAdminRoute>
                  <AdminTransaction />
                </ProtectedAdminRoute>
              }
            />
          </Routes>
        </div>
      </Router>
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}

export default App;
