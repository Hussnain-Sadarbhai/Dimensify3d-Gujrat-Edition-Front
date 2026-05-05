import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, HelpCircle, Store, LogIn, UserPlus, Menu, X, ChevronDown, MessageCircle, LogOut, Home } from 'lucide-react';
import logo from "../images/logo-1.png"
import './Header.css';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL from "./apiConfig"

const Header2 = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [showLogoutPopup, setShowLogoutPopup] = useState(false);
    const [loading, setLoading] = useState(true);
    const [cartItemsCount, setCartItemsCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        
        window.addEventListener('scroll', handleScroll);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    useEffect(() => {
        // Check if user is logged in when component mounts
        checkUserLogin();
    }, []);

    const checkUserLogin = async () => {
        try {
            const phoneNumber = localStorage.getItem('dimensify3duserphoneNo');
            
            if (!phoneNumber) {
                setIsLoggedIn(false);
                setLoading(false);
                return;
            }

            // Call the API to get user data
            const response = await fetch(`${API_BASE_URL}/api/user-by-phone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: phoneNumber })
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
                localStorage.removeItem('dimensify3duserphoneNo');
            }
        } catch (error) {
            console.error('Error checking user login:', error);
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

    const handleLogin = () => {
        localStorage.setItem("last","/");
        navigate("/login");
    };

    const handleLogout = () => {
        setShowLogoutPopup(true);
    };

    const confirmLogout = () => {
        // Remove the user's phone number from localStorage
        localStorage.removeItem('dimensify3duserphoneNo');
        
        setIsLoggedIn(false);
        setUser(null);
        setCartItemsCount(0);
        setShowLogoutPopup(false);
        // Optionally navigate to home page or login page
        navigate('/');
    };

    const cancelLogout = () => {
        setShowLogoutPopup(false);
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleHome = () => {
        navigate('/');
    };

    const handleHelp = () => {
        navigate('/help');
    };

    const handleConsultancy = () => {
        navigate('/consultancy');
    };

    const handleCart = () => {
        navigate('/cart');
    };

    const handleAccount = () => {
        navigate('/account');
    };

    return (
        <>
            <header className={`header-container ${scrolled ? 'scrolled' : ''}`}>
                <div className="container">
                    <div className="header-row">
                        {/* Logo and Brand */}
                        <div className="brand-container">
                            <div className="logo-wrapper">
                               <img src={logo} alt="Dimensify3D Logo" className="brand-logo"/>
                            </div>
                            <div>
                                <h1 className="brand-text">Dimensify3D</h1>
                                <p className="brand-subtitle">3D Printing Solutions</p>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="desktop-nav">
                            <div className="nav-desktop">
                                <button className="nav-item" onClick={handleHome}>
                                    <Home size={18} />
                                    <span>Home</span>
                                </button>
                                <button className="nav-item" onClick={handleAccount}>
                                    <User size={18} />
                                    <span>Account</span>
                                </button>
                                <button className="nav-item" onClick={handleHelp}>
                                    <HelpCircle size={18} />
                                    <span>Help</span>
                                </button>
                                <button className="nav-item" onClick={handleConsultancy}>
                                    <Store size={18} />
                                    <span>Consultancy</span>
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
                    <div className={`mobile-menu ${isMenuOpen ? 'open' : 'closed'}`}>
                        <div>
                            <button className="mobile-nav-item" onClick={handleHome}>
                                <Home size={18} />
                                <span>Home</span>
                            </button>
                            <button className="mobile-nav-item" onClick={handleAccount}>
                                <User size={18} />
                                <span>Account</span>
                            </button>
                            <button className="mobile-nav-item" onClick={handleHelp}>
                                <HelpCircle size={18} />
                                <span>Help</span>
                            </button>
                            <button className="mobile-nav-item" onClick={handleConsultancy}>
                                <Store size={18} />
                                <span>Online Store</span>
                            </button>
                            <div style={{ position: 'relative' }}>
                                <button className="mobile-nav-item" onClick={handleCart}>
                                    <ShoppingCart size={18} />
                                    <span>Cart</span>
                                </button>
                                {cartItemsCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '36px'
                                    }} className="cart-badge">{cartItemsCount}</span>
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

                /* Mobile responsiveness */
                @media (max-width: 768px) {
                    .logo-wrapper {
                        width: 55px;
                        height: 55px;
                        padding: 8px;
                    }
                }

                @media (max-width: 480px) {
                    .logo-wrapper {
                        width: 48px;
                        height: 48px;
                        padding: 6px;
                    }
                }
            `}</style>
        </>
    );
};

export default Header2;