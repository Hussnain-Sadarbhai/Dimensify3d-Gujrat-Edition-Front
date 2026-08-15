import React, { useEffect } from 'react';
import { CreditCard, Plus, History, ArrowDownCircle, HelpCircle,UserCheck, ShoppingCart, Paperclip, ListOrdered, LogOut, LucideListOrdered, HomeIcon, Moon, PaperclipIcon, LucidePaperclip, ListCheck } from 'lucide-react';
import logo from "../images/logo-1.png"
import { useNavigate } from 'react-router-dom';

function AdminDashboard() {
    useEffect(() => {
        // Add styles to head
        const styleTag = document.createElement('style');
        styleTag.innerHTML = `
            html, body {
                background: linear-gradient(135deg, #f5f5f5 0%, #e9edf2 25%, #dce2e8 50%, #cfd6dd 75%, #e9edf2 100%) !important;
                margin: 0;
                padding: 0;
                min-height: 100vh;
                font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            #root {
                background: transparent !important;
            }
            
            /* Header animations */
            @keyframes slideDown {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .header-animation {
                animation: slideDown 0.6s ease-out;
            }
            
            .content-animation {
                animation: fadeIn 0.8s ease-out 0.3s both;
            }
            
            /* Glassmorphism effect */
            .glass-effect {
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            }
            
            /* Notification badge */
            .notification-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #ef4444;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                border: 2px solid white;
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% {
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                }
                70% {
                    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
                }
            }
        `;
        document.head.appendChild(styleTag);
    
        // Cleanup function
        return () => {
            document.head.removeChild(styleTag);
        };
    }, []);

    const navigate = useNavigate()

    // Logout function
    function handleLogout() {
        localStorage.removeItem('d3dadminLogin');
        navigate('/');
    }

    // Navigation functions (placeholder - replace with your actual navigation logic)
    function goTOHelp() {
        navigate("/adminhelp")
    }

    function goPrintRequest() {
        console.log("Navigate to: /admintokendetails");
        navigate("/adminorders")
    }
    
    function goTransactionHistory() {
        console.log("Navigate to: /admintransactionsdashboard");
    }
    function goConsultancyRequest() {
        navigate("/adminconultancy")
        console.log("Navigate to: /adminconultancy");
    }
    function goAddCoupon() {
        navigate("/admincoupon")
        console.log("Navigate to: /adminconultancy");
    }

    function goAddOnlineStoreProduct(){
        navigate("/adminonlinestoredashboard")
    }
    function goOrderBill(){
        navigate("/adminorderprint")
    }

    function goOrderUpdate(){
        navigate("/orderupdate")
    }


    function goAdminTransaction(){
        navigate("/admintransaction")
    }

    function goLandingPageOrders(){
         navigate("/adminlandingpage")
    }

     function goTapq(){
         navigate("/admintapq")
    }

    function goSOa(){
        navigate("/adminsoa")
    }

    function goMngOrd(){
        navigate("/adminordermng")
    }

    const menuItems = [
        {
            title: 'Help Requests',
            icon: HelpCircle,
            onClick: goTOHelp,
            description: 'Process and manage user concerns'
        },
        {
            title: '3D Print Order',
            icon: Plus,
            onClick: goPrintRequest,
            description: 'Handle 3D Print Orders'
        },
        {
            title: 'Transaction History',
            icon: History,
            onClick: goAdminTransaction,
            description: 'View complete transaction logs and history'
        },
        {
            title: 'Consultancy Request',
            icon: UserCheck,
            onClick: goConsultancyRequest,
            description: 'Manage Consultancy Requests'
        },
        {
            title: 'Add Coupons',
            icon: CreditCard,
            onClick: goAddCoupon,
            description: 'Add and manage Coupons'
        },
        {
            title: 'Orders Bill Download',
            icon:Paperclip,
            onClick: goOrderBill,
            description: 'Download Orders Bills'
        },
        {
            title: 'Orders update',
            icon:ListOrdered,
            onClick: goOrderUpdate,
            description: 'Download Orders Bills'
        },
        {
            title: 'TAPQ Section',
            icon:PaperclipIcon,
            onClick: goTapq,
            description: 'Create Order invoice, quotation etc'
        },
        {
            title: 'Statement Of Account',
            icon:LucidePaperclip,
            onClick: goSOa,
            description: 'Create Statement Of Account'
        },
        {
            title: 'Landing Page Orders',
            icon:Moon,
            onClick: goLandingPageOrders,
            description: 'Landing Page Orders'
        },
        {
            title: 'Order Management',
            icon:ListCheck,
            onClick: goMngOrd,
            description: 'Manage Orders Priority'
        },
        {
            title: 'Admin Online Store Dashboard',
            icon:ShoppingCart,
            onClick: goAddOnlineStoreProduct,
            description: 'Online Store Related pages',
            isStore: true // Added flag to identify store card
        },
    ];

    const styles = {
        container: {
            minHeight: '100vh',
            background: 'transparent'
        },
        header: {
            background: 'linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            position: 'sticky',
            top: '0',
            zIndex: '1000'
        },
        navbar: {
            padding: '20px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto'
        },
        leftSection: {
            display: 'flex',
            alignItems: 'center',
            gap: '24px'
        },
        logo: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
        },
        logoIcon: {
            width: '60px',
            height: '60px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            transition: 'all 0.3s ease'
        },
        brandContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
        },
        logoText: {
            color: 'white',
            fontSize: '28px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
        },
        adminText: {
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '16px',
            fontWeight: '500',
            marginLeft: '8px'
        },
        centerSection: {
            display: 'flex',
            alignItems: 'center'
        },
        dashboardTitle: {
            color: 'white',
            fontSize: '24px',
            fontWeight: '600',
            letterSpacing: '1px',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            textAlign: 'center'
        },
        rightSection: {
            display: 'flex',
            alignItems: 'center'
        },
        logoutButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '12px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
        },
        mainContent: {
            padding: '40px 32px',
            maxWidth: '1400px',
            margin: '0 auto',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '32px',
            padding: '40px 0',
            justifyItems: 'center'
        },
        card: {
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            maxWidth: '400px'
        },
        storeCard: {
            background: 'linear-gradient(135deg, rgba(255, 245, 245, 0.95) 0%, rgba(255, 250, 250, 0.95) 100%)',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 10px 30px rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            maxWidth: '400px'
        },
        cardIcon: {
            width: '80px',
            height: '80px',
            background: 'linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: 'white',
            fontSize: '32px',
            boxShadow: '0 8px 20px rgba(42, 101, 197, 0.3)',
            position: 'relative'
        },
        storeCardIcon: {
            width: '80px',
            height: '80px',
            background: 'linear-gradient(316deg, rgb(239, 68, 68) 0%, rgb(220, 38, 38) 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: 'white',
            fontSize: '32px',
            boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)',
            position: 'relative'
        },
        cardTitle: {
            fontSize: '22px',
            fontWeight: '700',
            color: '#1f2937',
            textAlign: 'center',
            marginBottom: '12px'
        },
        storeCardTitle: {
            fontSize: '22px',
            fontWeight: '700',
            color: '#991b1b',
            textAlign: 'center',
            marginBottom: '12px'
        },
        cardDescription: {
            fontSize: '16px',
            color: '#6b7280',
            textAlign: 'center',
            lineHeight: '1.6'
        },
        storeCardDescription: {
            fontSize: '16px',
            color: '#dc2626',
            textAlign: 'center',
            lineHeight: '1.6'
        }
    };

    const handleCardHover = (e, isEntering, isStore = false) => {
        const card = e.currentTarget;
        if (isEntering) {
            card.style.transform = 'translateY(-12px) scale(1.02)';
            if (isStore) {
                card.style.boxShadow = '0 20px 40px rgba(239, 68, 68, 0.2)';
            } else {
                card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.15)';
            }
        } else {
            card.style.transform = 'translateY(0) scale(1)';
            if (isStore) {
                card.style.boxShadow = '0 10px 30px rgba(239, 68, 68, 0.15)';
            } else {
                card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
            }
        }
    };

    const handleLogoHover = (e, isEntering) => {
        const logoIcon = e.currentTarget.querySelector('.logo-icon');
        if (isEntering) {
            e.currentTarget.style.transform = 'scale(1.05)';
            if (logoIcon) {
                logoIcon.style.transform = 'rotate(5deg) scale(1.1)';
            }
        } else {
            e.currentTarget.style.transform = 'scale(1)';
            if (logoIcon) {
                logoIcon.style.transform = 'rotate(0deg) scale(1)';
            }
        }
    };

    const handleLogoutHover = (e, isEntering) => {
        if (isEntering) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.transform = 'scale(1.05)';
        } else {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1)';
        }
    };

    return (
        <div style={styles.container}>
            {/* Enhanced Header with Professional Design */}
            <header style={styles.header} className="header-animation">
                <nav style={styles.navbar}>
                    {/* Left Section - Logo & Brand */}
                    <div style={styles.leftSection}>
                        <div 
                            style={styles.logo}
                            onMouseEnter={(e) => handleLogoHover(e, true)}
                            onMouseLeave={(e) => handleLogoHover(e, false)}
                        >
                            <div style={styles.logoIcon} className="logo-icon">
                                <img src={logo} alt='logo' height="150"/>
                            </div>
                            <div style={styles.brandContainer}>
                                <span style={styles.logoText}>
                                    <strong>Dimensify3D</strong>
                                    <span style={styles.adminText}>Admin</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Center Section - Dashboard Title */}
                    <div style={styles.centerSection}>
                        <h1 style={styles.dashboardTitle}>
                            <strong>ADMIN DASHBOARD</strong>
                        </h1>
                    </div>

                    {/* Right Section - Logout Button */}
                    <div style={styles.rightSection}>
                        <button
                            style={styles.logoutButton}
                            onClick={handleLogout}
                            onMouseEnter={(e) => handleLogoutHover(e, true)}
                            onMouseLeave={(e) => handleLogoutHover(e, false)}
                        >
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main style={styles.mainContent} className="content-animation">
                <div style={styles.grid}>
                    {menuItems.map((item, index) => {
                        const IconComponent = item.icon;
                        const isStore = item.isStore;
                        
                        return (
                            <div
                                key={index}
                                style={isStore ? styles.storeCard : styles.card}
                                onClick={item.onClick}
                                onMouseEnter={(e) => handleCardHover(e, true, isStore)}
                                onMouseLeave={(e) => handleCardHover(e, false, isStore)}
                            >
                                <div style={isStore ? styles.storeCardIcon : styles.cardIcon}>
                                    <IconComponent size={36} />
                                </div>
                                <h3 style={isStore ? styles.storeCardTitle : styles.cardTitle}>
                                    {item.title}
                                </h3>
                                <p style={isStore ? styles.storeCardDescription : styles.cardDescription}>
                                    {item.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

export default AdminDashboard;