import React, { useState, useEffect } from "react";
import "./Promotion_page.css";
import logo from "../images/logo-1.png";
import { MessageCircle } from "lucide-react";
import logo2 from "../images/log.gif";
import logo3 from "../images/270024.png";
import logo4 from "../images/WhatsApp-Logo-PNG-HD-Quality.png";

import { useNavigate } from "react-router-dom";
import Footer from "./Footer";
import API_BASE_URL from "./apiConfig";
const Promotion = () => {
  const navigate = useNavigate();
  const [hoveredWhatsApp, setHoveredWhatsApp] = useState(false);

  useEffect(() => {
    const hasCounted = localStorage.getItem("promotionPageViewed");
    if (!hasCounted) {
      fetch(`${API_BASE_URL}/api/pageview/increment`, {
        method: "POST",
      })
        .then(() => {
          localStorage.setItem("promotionPageViewed", "true");
        })
        .catch((err) => {
          console.error("Failed to increment unique page view:", err);
        });
    }
  }, []);
  const incrementWebsiteClick = () => {
    const key = "websiteClickCounted";
    if (!localStorage.getItem(key)) {
      return fetch(`${API_BASE_URL}/api/pageview/incrementWebsiteClick`, {
        method: "POST",
      })
        .then((response) => {
          if (response.ok) {
            localStorage.setItem(key, "true");
            console.log("Website click incremented");
          }
        })
        .catch((err) =>
          console.error("Failed to increment website click:", err)
        );
    } else {
      return Promise.resolve(); // Already counted, no request needed
    }
  };

  const incrementQuotationClick = () => {
    const key = "quotationClickCounted";
    if (!localStorage.getItem(key)) {
      return fetch(`${API_BASE_URL}/api/pageview/incrementQuotationClick`, {
        method: "POST",
      })
        .then((response) => {
          if (response.ok) {
            localStorage.setItem(key, "true");
            console.log("Quotation click incremented");
          }
        })
        .catch((err) =>
          console.error("Failed to increment quotation click:", err)
        );
    } else {
      return Promise.resolve(); // Already counted, skip fetch
    }
  };

  const styles = {
    container: {
      minHeight: "100vh",
      background:
        "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 50%, #f3f4f6 100%)",
      padding: "2rem 1rem",
      fontFamily: "Arial, sans-serif",
    },
    mainCard: {
      maxWidth: "900px",
      margin: "0 auto",
      background: "white",
      borderRadius: "20px",
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
      overflow: "hidden",
    },
    header: {
      background:
        "linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%)",
      padding: "3rem 2rem",
      textAlign: "center",
      color: "white",
    },
    headerTitle: {
      fontSize: "2.8rem",
      fontWeight: "bold",
      marginBottom: "1rem",
      color: "white",
      textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
    },
    headerSubtitle: {
      fontSize: "1.2rem",
      opacity: "0.9",
      fontWeight: "300",
      color: "#d1d5db",
    },
    formContainer: {
      padding: "3rem 2.5rem",
      background: "white",
    },
    row: {
      display: "flex",
      flexWrap: "wrap",
      marginBottom: "2rem",
      gap: "1.5rem",
    },
    col: {
      flex: "1",
      minWidth: "300px",
    },
    colFull: {
      width: "100%",
      marginBottom: "2rem",
    },
    label: {
      display: "block",
      fontSize: "0.95rem",
      fontWeight: "600",
      color: "#374151",
      marginBottom: "0.7rem",
    },
    input: {
      width: "100%",
      padding: "1.1rem",
      border: "2px solid #d1d5db",
      borderRadius: "10px",
      fontSize: "1rem",
      transition: "all 0.3s ease",
      backgroundColor: "#f9fafb",
      boxSizing: "border-box",
      color: "#374151",
    },
    inputFocus: {
      outline: "none",
      borderColor: "#6b7280",
      boxShadow: "0 0 0 3px rgba(107, 114, 128, 0.1)",
      backgroundColor: "white",
    },
    textarea: {
      width: "100%",
      padding: "1.1rem",
      border: "2px solid #d1d5db",
      borderRadius: "10px",
      fontSize: "1rem",
      transition: "all 0.3s ease",
      backgroundColor: "#f9fafb",
      resize: "vertical",
      minHeight: "130px",
      fontFamily: "inherit",
      boxSizing: "border-box",
      color: "#374151",
    },
    fileInput: {
      width: "100%",
      padding: "1.1rem",
      border: "2px dashed #9ca3af",
      borderRadius: "10px",
      fontSize: "1rem",
      transition: "all 0.3s ease",
      backgroundColor: "#f9fafb",
      cursor: "pointer",
      boxSizing: "border-box",
      color: "#6b7280",
    },
    submitButton: {
      maxWidth: "300px",
      width: "auto",
      margin: "0 auto",
      display: "block",
      background: "linear-gradient(135deg, #374151 0%, #4b5563 100%)",
      color: "white",
      padding: "1rem 2.5rem",
      border: "none",
      borderRadius: "10px",
      fontSize: "1.1rem",
      fontWeight: "bold",
      cursor: "pointer",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 15px rgba(55, 65, 81, 0.3)",
      textTransform: "uppercase",
      letterSpacing: "1px",
      textAlign: "center",
    },
    submitButtonHover: {
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(55, 65, 81, 0.4)",
      background: "linear-gradient(135deg, #4b5563 0%, #6b7280 100%)",
    },
    submitButtonDisabled: {
      background: "#9ca3af",
      cursor: "not-allowed",
      transform: "none",
      boxShadow: "0 4px 15px rgba(156, 163, 175, 0.3)",
    },
    whatsappButton: {
      position: "fixed",
      bottom: "2rem",
      right: "2rem",
      background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)",
      color: "white",
      padding: "1rem",
      borderRadius: "50%",
      textDecoration: "none",
      boxShadow: "0 8px 25px rgba(37, 211, 102, 0.4)",
      transition: "all 0.3s ease",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "60px",
      height: "60px",
    },
    whatsappButtonHover: {
      transform: "scale(1.1)",
      boxShadow: "0 12px 35px rgba(37, 211, 102, 0.6)",
    },
    badge: {
      position: "absolute",
      top: "-8px",
      right: "-8px",
      background: "#ef4444",
      color: "white",
      fontSize: "0.75rem",
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "bounce 2s infinite",
    },
    tooltip: {
      position: "absolute",
      bottom: "70px",
      right: "0",
      background: "#374151",
      color: "white",
      padding: "0.6rem 1rem",
      borderRadius: "8px",
      fontSize: "0.875rem",
      whiteSpace: "nowrap",
      opacity: "0",
      transition: "opacity 0.3s ease",
      boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
    },
    tooltipArrow: {
      position: "absolute",
      top: "100%",
      right: "1rem",
      width: "0",
      height: "0",
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderTop: "8px solid #374151",
    },
    cardSection: {
      display: "flex",
      flexWrap: "wrap",
      gap: "2rem",
      marginTop: "2rem",
      justifyContent: "center",
    },
    card: {
      background: "white",
      borderRadius: "15px",
      padding: "2rem",
      flex: "1",
      minWidth: "250px",
      maxWidth: "350px",
      boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)",
      border: "1px solid #f3f4f6",
      textAlign: "center",
      transition: "all 0.3s ease",
    },
    cardHover: {
      transform: "translateY(-5px)",
      boxShadow: "0 15px 40px rgba(0, 0, 0, 0.12)",
    },
    cardTitle: {
      fontSize: "1.4rem",
      fontWeight: "bold",
      color: "#374151",
      marginBottom: "1rem",
    },
    cardText: {
      color: "#6b7280",
      lineHeight: "1.6",
      fontSize: "1rem",
    },
  };
  return (
    <div className="body">
      <header className="main">
        <div className="container">
          <div className="header-row">
            {/* Logo and Brand */}
            <div className="brand-container">
              <div className="logo-wrapper">
                <img src={logo} alt="Dimensify3D Logo" className="brand-logo" />
              </div>
              <div>
                <h1 className="brand-text">Dimensify3D</h1>
                <p className="brand-subtitle">3D Printing Solutions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div
        className="login-form"
        onClick={async () => {
          await incrementWebsiteClick();
          window.location.href = "https://dimensify3d.in";
        }}
        style={{ cursor: "pointer" }}
      >
        <div className="login-flex1">
          <img src={logo2} alt="Dimensify3D Logo" className="brand-logo2" />
        </div>

        <div className="login-flex2">Click here to See our Website</div>
      </div>

      <div
        className="login-form2"
        onClick={async () => {
          await incrementQuotationClick();
          navigate("/Forms");
        }}
        style={{ cursor: "pointer" }}
      >
        <div className="login-flex1">
          <img src={logo3} alt="Dimensify3D Logo" className="brand-logo2" />
        </div>

        <div className="login-flex2">
          For any Quotaion, Inqueries or custom Requests click here
        </div>
      </div>

      <div
        className="login-form3"
        onClick={async () => {
          window.location.href = "https://wa.me/919019303569";
        }}
        style={{ cursor: "pointer" }}
      >
        <div className="login-flex1">
          <img src={logo4} alt="Dimensify3D Logo" className="brand-logo2" />
        </div>

        <div className="login-flex2">
          Click here to Directly contact us or Chat with us
        </div>
      </div>

      <div
        style={{
          position: "relative",
          display: "inline-block",
        }}
        onMouseEnter={() => setHoveredWhatsApp(true)}
        onMouseLeave={() => setHoveredWhatsApp(false)}
      >
        <a
          href="https://wa.me/919019303569"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...styles.whatsappButton,
            ...(hoveredWhatsApp ? styles.whatsappButtonHover : {}),
          }}
        >
          <MessageCircle size={28} />
          <span style={styles.badge}>1</span>
        </a>

        <div
          style={{
            ...styles.tooltip,
            opacity: hoveredWhatsApp ? 1 : 0,
          }}
        >
          Chat with us on WhatsApp
          <div style={styles.tooltipArrow}></div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Promotion;
