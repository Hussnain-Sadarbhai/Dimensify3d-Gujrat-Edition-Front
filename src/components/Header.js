import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  User,
  HelpCircle,
  Store,
  LogIn,
  UserPlus,
  Menu,
  X,
  ChevronDown,
  MessageCircle,
  LogOut,
  Info, // Added Info icon for About
} from "lucide-react";
import logo from "../images/logo-1.png";
import "./Header.css";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "./apiConfig";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    // Check if user is logged in when component mounts
    checkUserLogin();
    // Fetch products for gallery
    fetchProducts();
  }, []);

  const scrollToSlicerSection = () => {
    const element = document.getElementById("stl-slicer-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };
  const checkUserLogin = async () => {
    try {
      const phoneNumber = localStorage.getItem("dimensify3duserphoneNo");

      if (!phoneNumber) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      // Call the API to get user data
      const response = await fetch(`${API_BASE_URL}/api/user-by-phone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        setIsLoggedIn(true);
        setUser(data.data);
        // Calculate cart items count
        calculateCartItemsCount(data.data);
      } else {
        setIsLoggedIn(false);
        // Remove invalid phone number from localStorage
        localStorage.removeItem("dimensify3duserphoneNo");
      }
    } catch (error) {
      console.error("Error checking user login:", error);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  const calculateCartItemsCount = (userData) => {
    if (userData && userData.cart) {
      // Count all items in cart (sum of quantities)
      const totalItems = Object.values(userData.cart).reduce((total, item) => {
        return total + (item.quantity || 1);
      }, 0);
      setCartItemsCount(totalItems);
    } else {
      setCartItemsCount(0);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/get-products`);
      const data = await response.json();

      if (data.success && data.data) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleLogin = () => {
    localStorage.setItem("last", "/");
    navigate("/login");
  };

  const handleLogout = () => {
    setShowLogoutPopup(true);
  };

  const confirmLogout = () => {
    // Remove the user's phone number from localStorage
    localStorage.removeItem("dimensify3duserphoneNo");

    setIsLoggedIn(false);
    setUser(null);
    setCartItemsCount(0);
    setShowLogoutPopup(false);
    // Optionally navigate to home page or login page
    navigate("/");
  };

  const cancelLogout = () => {
    setShowLogoutPopup(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleConsultancy = () => {
    navigate("/consultancy");
  };

  const handleHelp = () => {
    navigate("/help");
  };

  const handleOnlineStore = () => {
    navigate("/onlinestore");
  };

  const handleCart = () => {
    navigate("/cart");
  };

  const handleAccount = () => {
    navigate("/account");
  };

  // NEW: Handler for About page
  const handleAbout = () => {
    navigate("/about");
  };

  // Use only product images from API
  const galleryImages =
    products.length > 0
      ? products
          .slice(0, 8)
          .map((product, index) => ({
            id: product.id || index,
            src: product.images?.[0] || "",
            alt: product.modelName || `3D Printed ${product.category}`,
            title: product.modelName || `3D ${product.category}`,
          }))
          .filter((img) => img.src) // Filter out products without images
      : [];

  const handleImageClick = () => {
    navigate("/onlinestore");
  };

  return (
    <>
      <header className={`header-container ${scrolled ? "scrolled" : ""}`}>
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

            {/* Desktop Navigation */}
            <div className="desktop-nav">
              <div className="nav-desktop">
                <button className="nav-item" onClick={handleAccount}>
                  <User size={18} />
                  <span>Account</span>
                </button>
                <button className="nav-item" onClick={handleHelp}>
                  <HelpCircle size={18} />
                  <span>Help</span>
                </button>
                <button className="nav-item" onClick={handleConsultancy}>
                  <MessageCircle size={18} />
                  <span>Consultancy</span>
                </button>
                <button className="nav-item" onClick={handleOnlineStore}>
                  <Store size={18} />
                  <span>Store</span>
                </button>
                {/* NEW: About button */}
                <button className="nav-item" onClick={handleAbout}>
                  <Info size={18} />
                  <span>About</span>
                </button>
                <div className="cart-container">
                  <button className="nav-item" onClick={handleCart}>
                    <ShoppingCart size={18} />
                    <span>Cart</span>
                  </button>
                  {cartItemsCount > 0 && (
                    <span className="cart-badge">{cartItemsCount}</span>
                  )}
                </div>
              </div>

              <div className="divider"></div>

              <div className="auth-container">
                {loading ? (
                  <button className="btn-signup" disabled>
                    <span>Loading...</span>
                  </button>
                ) : isLoggedIn ? (
                  <button className="btn-signup" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                ) : (
                  <button className="btn-signup" onClick={handleLogin}>
                    <UserPlus size={18} />
                    <span>Login</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button className="mobile-menu-btn" onClick={toggleMenu}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation Menu */}
          <div className={`mobile-menu ${isMenuOpen ? "open" : "closed"}`}>
            <div>
              <button className="mobile-nav-item" onClick={handleAccount}>
                <User size={18} />
                <span>Account</span>
              </button>
              <button className="mobile-nav-item" onClick={handleHelp}>
                <HelpCircle size={18} />
                <span>Help</span>
              </button>
              <button className="mobile-nav-item" onClick={handleConsultancy}>
                <MessageCircle size={18} />
                <span>Consultancy</span>
              </button>
              <button className="mobile-nav-item" onClick={handleOnlineStore}>
                <Store size={18} />
                <span>Online Store</span>
              </button>
              {/* NEW: About button for mobile */}
              <button className="mobile-nav-item" onClick={handleAbout}>
                <Info size={18} />
                <span>About</span>
              </button>
              <div style={{ position: "relative" }}>
                <button className="mobile-nav-item" onClick={handleCart}>
                  <ShoppingCart size={18} />
                  <span>Cart</span>
                </button>
                {cartItemsCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "12px",
                      left: "36px",
                    }}
                    className="cart-badge"
                  >
                    {cartItemsCount}
                  </span>
                )}
              </div>

              <div className="mobile-auth-section">
                {loading ? (
                  <button className="mobile-btn-signup" disabled>
                    <span>Loading...</span>
                  </button>
                ) : isLoggedIn ? (
                  <button className="mobile-btn-signup" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                ) : (
                  <button className="mobile-btn-signup" onClick={handleLogin}>
                    <UserPlus size={18} />
                    <span>Login</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Popup */}
      {showLogoutPopup && (
        <div className="logout-popup-overlay">
          <div className="logout-popup">
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="logout-popup-buttons">
              <button className="btn-cancel" onClick={cancelLogout}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={confirmLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Content Area */}
      <div className="content-area">
        <div className="demo-content">
          <h2 className="demo-title">Professional 3D Printing</h2>
          <p className="demo-subtitle">
            Transform your ideas into reality with cutting-edge 3D printing
            technology. From prototypes to production, we deliver precision and
            quality.
            {isLoggedIn && user && (
              <span className="welcome-text">
                {" "}
                Welcome back, {user.name || user.phone}!
              </span>
            )}
          </p>

          {/* Compact STL Scroll Note */}
          <div className="scroll-note-inline">
            <span
              className="scroll-message-inline"
              onClick={scrollToSlicerSection}
              style={{ cursor: "pointer" }}
            >
              Scroll down to slice your STL file
            </span>

            <div
              className="scroll-arrow-inline"
              onClick={scrollToSlicerSection}
              style={{ cursor: "pointer" }}
            >
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        {/* 3D Models Gallery */}
        <div className="models-gallery">
          <div className="gallery-header">
            <h3>Our Recent 3D Printed Models</h3>
            <p>
              Explore our portfolio of precision-crafted 3D printed products
            </p>
          </div>

          {galleryImages.length > 0 ? (
            <div className="gallery-container">
              <div
                className={`gallery-track ${galleryImages.length >= 1 ? "infinite-scroll" : ""}`}
              >
                {/* Original images */}
                {galleryImages.map((image) => (
                  <div
                    key={image.id}
                    className="gallery-item"
                    onClick={handleImageClick}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="image-wrapper">
                      <img src={image.src} alt={image.alt} loading="lazy" />
                      <div className="image-overlay">
                        <h4>{image.title}</h4>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Duplicate images for infinite scroll effect */}
                {galleryImages.length >= 1 &&
                  galleryImages.map((image) => (
                    <div
                      key={`duplicate-${image.id}`}
                      className="gallery-item"
                      onClick={handleImageClick}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="image-wrapper">
                        <img src={image.src} alt={image.alt} loading="lazy" />
                        <div className="image-overlay">
                          <h4>{image.title}</h4>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="no-products-message">
              <p>No products available at the moment. Check back soon!</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Logo Styles */
        .logo-wrapper {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 14px;
          padding: 4px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .brand-logo {
          width: 120%;
          height: 120%;
          object-fit: contain;
          transform: scale(1.8);
        }

        /* Inline Scroll Note Styles */
        .scroll-note-inline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 12px 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 25px;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
          animation: fadeInUp 1.5s ease-out;
        }

        .scroll-message-inline {
          font-size: 0.9rem;
          font-weight: 500;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          white-space: nowrap;
        }

        .scroll-arrow-inline {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          animation:
            bounce 2s infinite,
            blink 1.5s infinite;
        }

        .scroll-arrow-inline svg {
          color: white;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%,
          20%,
          50%,
          80%,
          100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-4px);
          }
          60% {
            transform: translateY(-2px);
          }
        }

        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0.4;
          }
        }

        /* No Products Message */
        .no-products-message {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
          font-size: 1.1rem;
        }

        /* Existing Gallery Styles */
        .models-gallery {
          width: 100%;
          padding: 60px 0;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          overflow: hidden;
        }

        .gallery-header {
          text-align: center;
          margin-bottom: 40px;
          padding: 0 20px;
        }

        .gallery-header h3 {
          font-size: 2.2rem;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .gallery-header p {
          font-size: 1.1rem;
          color: #64748b;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
        }

        .gallery-container {
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        .gallery-track {
          display: flex;
          gap: 20px;
          padding: 20px;
          width: fit-content;
        }

        .gallery-track.infinite-scroll {
          animation: scrollGallery 30s linear infinite;
        }

        @keyframes scrollGallery {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .gallery-item {
          flex-shrink: 0;
          width: 320px;
          height: 240px;
          position: relative;
          transition: transform 0.2s ease;
        }

        .gallery-item:active {
          transform: scale(0.98);
        }

        .image-wrapper {
          width: 100%;
          height: 100%;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
          background: #fff;
        }

        .image-wrapper:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
        }

        .image-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          transition: transform 0.3s ease;
          display: block;
        }

        .image-wrapper:hover img {
          transform: scale(1.05);
        }

        .image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
          padding: 20px;
          transform: translateY(100%);
          transition: transform 0.3s ease;
        }

        .image-wrapper:hover .image-overlay {
          transform: translateY(0);
        }

        .image-overlay h4 {
          color: white;
          font-size: 1.1rem;
          font-weight: 600;
          margin: 0;
        }

        /* Pause animation on hover for better user experience */
        .gallery-track.infinite-scroll:hover {
          animation-play-state: paused;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .logo-wrapper {
            width: 55px;
            height: 55px;
            padding: 8px;
          }

          .scroll-note-inline {
            margin-top: 12px;
            padding: 10px 14px;
          }

          .scroll-message-inline {
            font-size: 0.8rem;
          }

          .scroll-arrow-inline {
            width: 20px;
            height: 20px;
          }

          .scroll-arrow-inline svg {
            width: 14px;
            height: 14px;
          }

          .models-gallery {
            padding: 40px 0;
          }

          .gallery-header h3 {
            font-size: 1.8rem;
          }

          .gallery-header p {
            font-size: 1rem;
          }

          .gallery-item {
            width: 280px;
            height: 200px;
          }

          .gallery-track {
            gap: 15px;
            padding: 15px;
          }

          .gallery-track.infinite-scroll {
            animation-duration: 25s;
          }
        }

        @media (max-width: 480px) {
          .logo-wrapper {
            width: 48px;
            height: 48px;
            padding: 6px;
          }

          .scroll-note-inline {
            padding: 8px 12px;
            gap: 6px;
          }

          .scroll-message-inline {
            font-size: 0.75rem;
          }

          .gallery-item {
            width: 250px;
            height: 180px;
          }

          .gallery-header h3 {
            font-size: 1.6rem;
          }
        }
      `}</style>
    </>
  );
};

export default Header;