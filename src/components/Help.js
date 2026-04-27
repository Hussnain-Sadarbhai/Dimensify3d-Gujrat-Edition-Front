import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_BASE_URL from "./apiConfig"

const HelpSection = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    concern: "",
    screenshot: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "screenshot") {
      setFormData({ ...formData, screenshot: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name.trim() || !formData.phone.trim() || !formData.concern.trim()) {
      toast.error('Please fill in all required fields (Name, Phone, and Concern)!', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      toast.error('Please enter a valid phone number!', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    // Email validation if provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        toast.error('Please enter a valid email address!', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const submitFormData = new FormData();
      submitFormData.append('name', formData.name.trim());
      submitFormData.append('phone', formData.phone.trim());
      submitFormData.append('email', formData.email.trim());
      submitFormData.append('concern', formData.concern.trim());
      
      if (formData.screenshot) {
        submitFormData.append('screenshot', formData.screenshot);
      }

      // Make API call
      const response = await fetch(`${API_BASE_URL}/api/help-request`, {
        method: 'POST',
        body: submitFormData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`Your request has been submitted successfully! Request ID: ${result.data.requestId}`, {
          position: "top-right",
          autoClose: 7000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // Reset form
        setFormData({
          name: "",
          phone: "",
          email: "",
          concern: "",
          screenshot: null,
        });

        // Reset file input
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          fileInput.value = '';
        }

      } else {
        toast.error(result.message || 'Failed to submit request. Please try again.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (error) {
      console.error('Error submitting help request:', error);
      toast.error('Network error. Please check your connection and try again.', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMyRequestsClick = () => {
    navigate('/myhelprequest');
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 50%, #f3f4f6 100%)',
      padding: '2rem 1rem',
      fontFamily: 'Arial, sans-serif'
    },
    mainCard: {
      maxWidth: '900px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    },
    header: {
      background: 'linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%)',
      padding: '3rem 2rem',
      textAlign: 'center',
      color: 'white',
      position: 'relative'
    },
    headerTitle: {
      fontSize: '2.8rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      color: 'white',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
    },
    headerSubtitle: {
      fontSize: '1.2rem',
      opacity: '0.9',
      fontWeight: '300',
      color: '#d1d5db'
    },
    myRequestsButton: {
      position: 'absolute',
      top: '2rem',
      right: '2rem',
      background: 'rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      display: 'inline-block',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
    },
    myRequestsButtonHover: {
      background: 'rgba(255, 255, 255, 0.3)',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
    },
    formContainer: {
      padding: '3rem 2.5rem',
      background: 'white'
    },
    row: {
      display: 'flex',
      flexWrap: 'wrap',
      marginBottom: '2rem',
      gap: '1.5rem'
    },
    col: {
      flex: '1',
      minWidth: '300px'
    },
    colFull: {
      width: '100%',
      marginBottom: '2rem'
    },
    label: {
      display: 'block',
      fontSize: '0.95rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.7rem'
    },
    input: {
      width: '100%',
      padding: '1.1rem',
      border: '2px solid #d1d5db',
      borderRadius: '10px',
      fontSize: '1rem',
      transition: 'all 0.3s ease',
      backgroundColor: '#f9fafb',
      boxSizing: 'border-box',
      color: '#374151'
    },
    inputFocus: {
      outline: 'none',
      borderColor: '#6b7280',
      boxShadow: '0 0 0 3px rgba(107, 114, 128, 0.1)',
      backgroundColor: 'white'
    },
    textarea: {
      width: '100%',
      padding: '1.1rem',
      border: '2px solid #d1d5db',
      borderRadius: '10px',
      fontSize: '1rem',
      transition: 'all 0.3s ease',
      backgroundColor: '#f9fafb',
      resize: 'vertical',
      minHeight: '130px',
      fontFamily: 'inherit',
      boxSizing: 'border-box',
      color: '#374151'
    },
    fileInput: {
      width: '100%',
      padding: '1.1rem',
      border: '2px dashed #9ca3af',
      borderRadius: '10px',
      fontSize: '1rem',
      transition: 'all 0.3s ease',
      backgroundColor: '#f9fafb',
      cursor: 'pointer',
      boxSizing: 'border-box',
      color: '#6b7280'
    },
    submitButton: {
      maxWidth: '300px',
      width: 'auto',
      margin: '0 auto',
      display: 'block',
      background: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
      color: 'white',
      padding: '1rem 2.5rem',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1.1rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px rgba(55, 65, 81, 0.3)',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      textAlign: 'center'
    },
    submitButtonHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(55, 65, 81, 0.4)',
      background: 'linear-gradient(135deg, #4b5563 0%, #6b7280 100%)'
    },
    submitButtonDisabled: {
      background: '#9ca3af',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: '0 4px 15px rgba(156, 163, 175, 0.3)'
    },
    whatsappButton: {
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
      color: 'white',
      padding: '1rem',
      borderRadius: '50%',
      textDecoration: 'none',
      boxShadow: '0 8px 25px rgba(37, 211, 102, 0.4)',
      transition: 'all 0.3s ease',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '60px',
      height: '60px'
    },
    whatsappButtonHover: {
      transform: 'scale(1.1)',
      boxShadow: '0 12px 35px rgba(37, 211, 102, 0.6)'
    },
    badge: {
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      background: '#ef4444',
      color: 'white',
      fontSize: '0.75rem',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'bounce 2s infinite'
    },
    tooltip: {
      position: 'absolute',
      bottom: '70px',
      right: '0',
      background: '#374151',
      color: 'white',
      padding: '0.6rem 1rem',
      borderRadius: '8px',
      fontSize: '0.875rem',
      whiteSpace: 'nowrap',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
    },
    tooltipArrow: {
      position: 'absolute',
      top: '100%',
      right: '1rem',
      width: '0',
      height: '0',
      borderLeft: '8px solid transparent',
      borderRight: '8px solid transparent',
      borderTop: '8px solid #374151'
    },
    cardSection: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '2rem',
      marginTop: '2rem',
      justifyContent: 'center'
    },
    card: {
      background: 'white',
      borderRadius: '15px',
      padding: '2rem',
      flex: '1',
      minWidth: '250px',
      maxWidth: '350px',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
      border: '1px solid #f3f4f6',
      textAlign: 'center',
      transition: 'all 0.3s ease'
    },
    cardHover: {
      transform: 'translateY(-5px)',
      boxShadow: '0 15px 40px rgba(0, 0, 0, 0.12)'
    },
    cardTitle: {
      fontSize: '1.4rem',
      fontWeight: 'bold',
      color: '#374151',
      marginBottom: '1rem'
    },
    cardText: {
      color: '#6b7280',
      lineHeight: '1.6',
      fontSize: '1rem'
    }
  };

  const [hoveredButton, setHoveredButton] = useState(false);
  const [hoveredWhatsApp, setHoveredWhatsApp] = useState(false);
  const [hoveredRequestsButton, setHoveredRequestsButton] = useState(false);
  const [focusedInput, setFocusedInput] = useState('');
  const [hoveredCards, setHoveredCards] = useState({});

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes bounce {
            0%, 20%, 53%, 80%, 100% {
              transform: translate3d(0,0,0);
            }
            40%, 43% {
              transform: translate3d(0, -30px, 0);
            }
            70% {
              transform: translate3d(0, -15px, 0);
            }
            90% {
              transform: translate3d(0,-4px,0);
            }
          }
          
          @media (max-width: 768px) {
            .help-row {
              flex-direction: column !important;
            }
            .help-col {
              min-width: 100% !important;
            }
            .my-requests-btn {
              position: static !important;
              margin-top: 1rem !important;
              display: inline-block !important;
            }
            .header-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1rem;
            }
          }

          /* Custom Toastify Styles */
          .Toastify__toast-container {
            font-family: 'Arial', sans-serif;
          }
          
          .Toastify__toast {
            border-radius: 10px;
            font-size: 0.95rem;
            padding: 1rem;
            color: white !important;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }
          
          .Toastify__toast--success {
            background: linear-gradient(135deg, #10b981 0%, #047857 100%) !important;
          }
          
          .Toastify__toast--error {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
          }
          
          .Toastify__toast-body {
            color: white !important;
            font-weight: 500;
          }
          
          .Toastify__close-button {
            color: white !important;
            opacity: 0.8;
          }
          
          .Toastify__close-button:hover {
            opacity: 1;
          }
          
          .Toastify__progress-bar {
            background: rgba(255, 255, 255, 0.7) !important;
          }
        `}
      </style>
      
      <div style={styles.mainCard}>
        <div style={styles.header}>
          <div className="header-content">
            <h2 style={styles.headerTitle}>Need Help?</h2>
            <p style={styles.headerSubtitle}>
              We're here to assist you. Fill out the form below and our support team will reach out to you.
            </p>
          </div>
          <button
            onClick={handleMyRequestsClick}
            onMouseEnter={() => setHoveredRequestsButton(true)}
            onMouseLeave={() => setHoveredRequestsButton(false)}
            className="my-requests-btn"
            style={{
              ...styles.myRequestsButton,
              ...(hoveredRequestsButton ? styles.myRequestsButtonHover : {})
            }}
          >
            My Requests
          </button>
        </div>

        <div style={styles.formContainer}>
          <div style={styles.row} className="help-row">
            <div style={styles.col} className="help-col">
              <label style={styles.label}>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onFocus={() => setFocusedInput('name')}
                onBlur={() => setFocusedInput('')}
                disabled={isSubmitting}
                style={{
                  ...styles.input,
                  ...(focusedInput === 'name' ? styles.inputFocus : {}),
                  ...(isSubmitting ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                }}
                placeholder="Enter your full name"
              />
            </div>

            <div style={styles.col} className="help-col">
              <label style={styles.label}>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                onFocus={() => setFocusedInput('phone')}
                onBlur={() => setFocusedInput('')}
                disabled={isSubmitting}
                style={{
                  ...styles.input,
                  ...(focusedInput === 'phone' ? styles.inputFocus : {}),
                  ...(isSubmitting ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                }}
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div style={styles.colFull}>
            <label style={styles.label}>Email Address (Optional)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => setFocusedInput('email')}
              onBlur={() => setFocusedInput('')}
              disabled={isSubmitting}
              style={{
                ...styles.input,
                ...(focusedInput === 'email' ? styles.inputFocus : {}),
                ...(isSubmitting ? { opacity: 0.6, cursor: 'not-allowed' } : {})
              }}
              placeholder="Enter your email address"
            />
          </div>

          <div style={styles.colFull}>
            <label style={styles.label}>Describe Your Concern *</label>
            <textarea
              name="concern"
              value={formData.concern}
              onChange={handleChange}
              onFocus={() => setFocusedInput('concern')}
              onBlur={() => setFocusedInput('')}
              disabled={isSubmitting}
              style={{
                ...styles.textarea,
                ...(focusedInput === 'concern' ? styles.inputFocus : {}),
                ...(isSubmitting ? { opacity: 0.6, cursor: 'not-allowed' } : {})
              }}
              placeholder="Please describe your concern in detail..."
            />
          </div>

          <div style={styles.colFull}>
            <label style={styles.label}>Attach Screenshot (Optional)</label>
            <input
              type="file"
              name="screenshot"
              accept="image/*"
              onChange={handleChange}
              disabled={isSubmitting}
              style={{
                ...styles.fileInput,
                ...(isSubmitting ? { opacity: 0.6, cursor: 'not-allowed' } : {})
              }}
            />
          </div>

          <div
            onClick={isSubmitting ? undefined : handleSubmit}
            onMouseEnter={() => !isSubmitting && setHoveredButton(true)}
            onMouseLeave={() => setHoveredButton(false)}
            style={{
              ...styles.submitButton,
              ...(hoveredButton && !isSubmitting ? styles.submitButtonHover : {}),
              ...(isSubmitting ? styles.submitButtonDisabled : {})
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </div>

          {/* Support Cards */}
          <div style={styles.cardSection}>
            <div 
              style={{
                ...styles.card,
                ...(hoveredCards['quick'] ? styles.cardHover : {})
              }}
              onMouseEnter={() => setHoveredCards(prev => ({ ...prev, quick: true }))}
              onMouseLeave={() => setHoveredCards(prev => ({ ...prev, quick: false }))}
            >
              <h3 style={styles.cardTitle}>Quick Response</h3>
              <p style={styles.cardText}>
                Our support team responds within 2-4 hours during business hours for urgent queries.
              </p>
            </div>

            <div 
              style={{
                ...styles.card,
                ...(hoveredCards['expert'] ? styles.cardHover : {})
              }}
              onMouseEnter={() => setHoveredCards(prev => ({ ...prev, expert: true }))}
              onMouseLeave={() => setHoveredCards(prev => ({ ...prev, expert: false }))}
            >
              <h3 style={styles.cardTitle}>Expert Support</h3>
              <p style={styles.cardText}>
                Get help from our experienced technical team with comprehensive solutions.
              </p>
            </div>

            <div 
              style={{
                ...styles.card,
                ...(hoveredCards['available'] ? styles.cardHover : {})
              }}
              onMouseEnter={() => setHoveredCards(prev => ({ ...prev, available: true }))}
              onMouseLeave={() => setHoveredCards(prev => ({ ...prev, available: false }))}
            >
              <h3 style={styles.cardTitle}>24/7 Available</h3>
              <p style={styles.cardText}>
                Connect with us anytime through WhatsApp chat for immediate assistance.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div 
        style={{
          position: 'relative',
          display: 'inline-block'
        }}
        onMouseEnter={() => setHoveredWhatsApp(true)}
        onMouseLeave={() => setHoveredWhatsApp(false)}
      >
        <a
          href="https://wa.me/917022852377"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...styles.whatsappButton,
            ...(hoveredWhatsApp ? styles.whatsappButtonHover : {})
          }}
        >
          <MessageCircle size={28} />
          <span style={styles.badge}>1</span>
        </a>
        
        <div style={{
          ...styles.tooltip,
          opacity: hoveredWhatsApp ? 1 : 0
        }}>
          Chat with us on WhatsApp
          <div style={styles.tooltipArrow}></div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default HelpSection;