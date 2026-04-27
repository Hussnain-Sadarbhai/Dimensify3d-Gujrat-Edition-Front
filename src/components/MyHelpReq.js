import React, { useEffect, useState } from 'react';
import { Card, Button, Badge, Spinner, Container, Row, Col, Form, Alert } from "react-bootstrap";
import axios from "axios";
import API_BASE_URL from "./apiConfig";

export default function MyHelpReq() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);

  // ✅ Fetch requests by phone number
  const fetchRequestsByPhone = async () => {
    // Validate phone number
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      setError('Please enter a valid phone number!');
      return;
    }

    setLoading(true);
    setError('');
    setSearchPerformed(true);

    try {
      const res = await axios.get(`${API_BASE_URL}/api/help-request`);
      const allRequests = res.data.data || {};
      
      // Filter requests by phone number
      const requestsArray = Object.values(allRequests);
      const userRequests = requestsArray.filter(
        req => req.phone === phoneNumber.trim()
      );
      
      // Sort by date (latest first)
      const sortedRequests = userRequests.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      setRequests(sortedRequests);
      setSubmitted(true);
      
      if (sortedRequests.length === 0) {
        setError('No help requests found for this phone number');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to fetch your requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchRequestsByPhone();
  };

  const handleReset = () => {
    setPhoneNumber('');
    setRequests([]);
    setSubmitted(false);
    setError('');
    setSearchPerformed(false);
  };

  const getStatusBadgeProps = (status) => {
    switch (status) {
      case "pending":
        return { bg: "warning", text: "dark", icon: "⏳", label: "Pending" };
      case "resolved":
        return { bg: "success", text: "white", icon: "✅", label: "Resolved" };
      case "rejected":
        return { bg: "danger", text: "white", icon: "❌", label: "Rejected" };
      default:
        return { bg: "secondary", text: "white", icon: "📝", label: status };
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case "pending":
        return "Your request is being reviewed by our support team. We'll get back to you soon!";
      case "resolved":
        return "Your issue has been resolved. Thank you for your patience!";
      case "rejected":
        return "Unfortunately, your request couldn't be processed at this time. Please contact support for more details.";
      default:
        return "";
    }
  };

  return (
    <div style={styles.body}>
      <Container fluid style={styles.container}>
        {/* Header Section */}
        <div style={styles.header}>
          <h1 style={styles.title}>
            <i className="fas fa-clipboard-list" style={styles.icon}></i>
            My Help Requests
          </h1>
          <p style={styles.subtitle}>Track the status of your support requests</p>
        </div>

        {/* Search Card */}
        <Card style={styles.searchCard} className="mb-4">
          <Card.Body>
            <Row>
              <Col lg={8} md={10} className="mx-auto">
                <Form onSubmit={handleSubmit}>
                  <Form.Group>
                    <Form.Label style={styles.searchLabel}>
                      <i className="fas fa-phone-alt" style={styles.labelIcon}></i>
                      Enter Your Phone Number
                    </Form.Label>
                    
                    {/* Phone Input Field */}
                    <Form.Control
                      type="tel"
                      placeholder="e.g., 1234567890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      style={styles.phoneInput}
                      disabled={loading}
                    />
                    
                    <Form.Text style={styles.helpText}>
                      Enter the phone number you used when submitting your request
                    </Form.Text>

                    {/* Button Group */}
                    <div style={styles.buttonGroup}>
                      <Button 
                        type="submit" 
                        style={styles.trackButton}
                        disabled={loading || !phoneNumber.trim()}
                      >
                        {loading ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-chart-line me-2"></i>
                            Track Requests
                          </>
                        )}
                      </Button>
                      
                      {searchPerformed && (
                        <Button 
                          variant="outline-secondary"
                          onClick={handleReset}
                          style={styles.refreshButton}
                          disabled={loading}
                        >
                          <i className="fas fa-sync-alt me-2"></i>
                          New Search
                        </Button>
                      )}
                    </div>
                  </Form.Group>
                </Form>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Results Section */}
        {loading && (
          <div style={styles.loadingContainer}>
            <Spinner animation="border" variant="primary" size="lg" />
            <p style={styles.loadingText}>Fetching your requests...</p>
          </div>
        )}

        {error && !loading && (
          <Alert variant="warning" style={styles.errorAlert}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {submitted && !loading && requests.length > 0 && (
          <>
            {/* Summary Card */}
            <Card style={styles.summaryCard} className="mb-4">
              <Card.Body>
                <Row>
                  <Col md={4} className="text-center mb-3 mb-md-0">
                    <div style={styles.summaryNumber}>{requests.length}</div>
                    <div style={styles.summaryLabel}>Total Requests</div>
                  </Col>
                  <Col md={4} className="text-center mb-3 mb-md-0">
                    <div style={{...styles.summaryNumber, color: '#ff9800'}}>
                      {requests.filter(r => r.status === 'pending').length}
                    </div>
                    <div style={styles.summaryLabel}>Pending</div>
                  </Col>
                  <Col md={4} className="text-center">
                    <div style={{...styles.summaryNumber, color: '#4caf50'}}>
                      {requests.filter(r => r.status === 'resolved').length}
                    </div>
                    <div style={styles.summaryLabel}>Resolved</div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Requests List */}
            <div style={styles.requestsContainer}>
              {requests.map((req, index) => {
                const statusProps = getStatusBadgeProps(req.status);
                return (
                  <Card 
                    key={req.requestId || index} 
                    style={{
                      ...styles.requestCard,
                      ...(req.status === 'pending' ? styles.pendingCard : {}),
                      ...(req.status === 'resolved' ? styles.resolvedCard : {}),
                      ...(req.status === 'rejected' ? styles.rejectedCard : {})
                    }}
                    className="mb-4"
                  >
                    <Card.Header style={styles.cardHeader}>
                      <div style={styles.cardHeaderContent}>
                        <div>
                          <strong style={styles.requestId}>
                            <i className="fas fa-ticket-alt me-2"></i>
                            #{req.requestId || 'N/A'}
                          </strong>
                          <Badge 
                            {...statusProps} 
                            style={styles.statusBadge}
                          >
                            {statusProps.icon} {statusProps.label}
                          </Badge>
                        </div>
                        <small style={styles.dateText}>
                          <i className="far fa-calendar-alt me-1"></i>
                          {new Date(req.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </small>
                      </div>
                    </Card.Header>
                    <Card.Body style={styles.cardBody}>
                      <Row>
                        <Col md={8}>
                          <div style={styles.concernSection}>
                            <h6 style={styles.concernTitle}>
                              <i className="fas fa-comment-dots me-2"></i>
                              Your Concern:
                            </h6>
                            <p style={styles.concernText}>{req.concern}</p>
                          </div>
                          
                          <div style={styles.statusMessage}>
                            <div style={{
                              ...styles.statusIcon,
                              backgroundColor: statusProps.bg === 'warning' ? '#fff3e0' : 
                                             statusProps.bg === 'success' ? '#e8f5e9' : '#ffebee'
                            }}>
                              <span style={{fontSize: '1.5rem'}}>{statusProps.icon}</span>
                            </div>
                            <div style={styles.statusMessageText}>
                              <strong style={styles.statusMessageTitle}>Current Status: {statusProps.label}</strong>
                              <p style={styles.statusMessageDesc}>{getStatusMessage(req.status)}</p>
                            </div>
                          </div>
                        </Col>
                        
                        <Col md={4}>
                          <div style={styles.infoCard}>
                            <h6 style={styles.infoTitle}>
                              <i className="fas fa-info-circle me-2"></i>
                              Request Details
                            </h6>
                            <div style={styles.infoItem}>
                              <i className="fas fa-user me-2"></i>
                              <span><strong>Name:</strong> {req.name}</span>
                            </div>
                            <div style={styles.infoItem}>
                              <i className="fas fa-phone me-2"></i>
                              <span><strong>Phone:</strong> {req.phone}</span>
                            </div>
                            {req.email && (
                              <div style={styles.infoItem}>
                                <i className="fas fa-envelope me-2"></i>
                                <span><strong>Email:</strong> {req.email}</span>
                              </div>
                            )}
                            {req.screenshotUrl && (
                              <div style={styles.attachmentSection}>
                                <a
                                  href={req.screenshotUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={styles.attachmentLink}
                                >
                                  <i className="fas fa-image me-2"></i>
                                  View Attachment
                                </a>
                              </div>
                            )}
                          </div>
                        </Col>
                      </Row>

                      {req.status === 'pending' && (
                        <div style={styles.noteBox}>
                          <i className="fas fa-clock me-2"></i>
                          Our support team will contact you within 2-4 hours regarding your request.
                        </div>
                      )}
                      
                      {req.status === 'resolved' && (
                        <div style={styles.noteBoxSuccess}>
                          <i className="fas fa-check-circle me-2"></i>
                          Your issue has been marked as resolved. Thank you for reaching out!
                        </div>
                      )}
                      
                      {req.status === 'rejected' && (
                        <div style={styles.noteBoxError}>
                          <i className="fas fa-times-circle me-2"></i>
                          For more information about this decision, please contact our support team.
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {submitted && !loading && requests.length === 0 && !error && (
          <Card style={styles.emptyCard}>
            <Card.Body className="text-center">
              <i className="fas fa-inbox" style={styles.emptyIcon}></i>
              <h4 style={styles.emptyTitle}>No requests found</h4>
              <p style={styles.emptyText}>
                We couldn't find any help requests associated with this phone number.
                Please submit a new request if you need assistance.
              </p>
              <Button 
                onClick={handleReset}
                style={styles.newRequestButton}
              >
                <i className="fas fa-plus me-2"></i>
                Submit New Request
              </Button>
            </Card.Body>
          </Card>
        )}
      </Container>
    </div>
  );
}

const styles = {
  body: {
    background: 'linear-gradient(135deg, #f5f5f5 0%, #e9edf2 25%, #dce2e8 50%, #cfd6dd 75%, #e9edf2 100%)',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    background: 'linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)',
    color: 'white',
    padding: '2rem',
    borderRadius: '15px',
    marginBottom: '2rem',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '600',
    margin: '0',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },
  icon: {
    marginRight: '1rem'
  },
  subtitle: {
    fontSize: '1.1rem',
    margin: '0.5rem 0 0 0',
    opacity: '0.9'
  },
  searchCard: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    border: 'none',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  searchLabel: {
    fontWeight: '600',
    color: '#333',
    marginBottom: '0.75rem',
    fontSize: '1rem'
  },
  labelIcon: {
    marginRight: '0.5rem',
    color: '#2a65c5'
  },
  phoneInput: {
    fontSize: '1rem',
    padding: '0.875rem',
    borderRadius: '10px',
    border: '2px solid #e0e0e0',
    transition: 'all 0.3s ease',
    width: '100%',
    marginBottom: '0.5rem'
  },
  helpText: {
    color: '#666',
    fontSize: '0.85rem',
    marginBottom: '1.5rem',
    display: 'block'
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  trackButton: {
    background: 'linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)',
    border: 'none',
    padding: '0.75rem 2rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    borderRadius: '10px',
    fontSize: '1rem',
    minWidth: '180px'
  },
  refreshButton: {
    background: 'white',
    color: '#2a65c5',
    border: '2px solid #2a65c5',
    padding: '0.75rem 2rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    borderRadius: '10px',
    fontSize: '1rem',
    minWidth: '150px'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '4rem',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '15px',
    backdropFilter: 'blur(10px)'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#666',
    fontSize: '1.1rem'
  },
  errorAlert: {
    borderRadius: '12px',
    border: 'none',
    fontSize: '1rem'
  },
  summaryCard: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    border: 'none',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  summaryNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: '0.5rem'
  },
  summaryLabel: {
    fontSize: '0.9rem',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '500'
  },
  requestsContainer: {
    width: '100%'
  },
  requestCard: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    border: 'none',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    overflow: 'hidden'
  },
  pendingCard: {
    borderLeft: '4px solid #ff9800',
    boxShadow: '0 6px 25px rgba(0,0,0,0.12)'
  },
  resolvedCard: {
    borderLeft: '4px solid #4caf50'
  },
  rejectedCard: {
    borderLeft: '4px solid #f44336'
  },
  cardHeader: {
    background: 'linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)',
    color: 'white',
    border: 'none',
    padding: '1rem 1.5rem'
  },
  cardHeaderContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  requestId: {
    fontSize: '1rem',
    marginRight: '1rem'
  },
  statusBadge: {
    fontSize: '0.75rem',
    padding: '0.4rem 0.8rem',
    fontWeight: '600',
    borderRadius: '20px'
  },
  dateText: {
    opacity: '0.9',
    fontSize: '0.85rem'
  },
  cardBody: {
    padding: '1.5rem'
  },
  concernSection: {
    marginBottom: '1.5rem'
  },
  concernTitle: {
    color: '#333',
    marginBottom: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600'
  },
  concernText: {
    color: '#555',
    lineHeight: '1.6',
    padding: '1rem',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    margin: '0'
  },
  statusMessage: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '1rem',
    background: '#f8f9fa',
    borderRadius: '10px',
    marginTop: '1rem'
  },
  statusIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statusMessageText: {
    flex: 1
  },
  statusMessageTitle: {
    display: 'block',
    marginBottom: '0.25rem',
    color: '#333'
  },
  statusMessageDesc: {
    margin: '0',
    fontSize: '0.9rem',
    color: '#666'
  },
  infoCard: {
    background: '#f8f9fa',
    borderRadius: '10px',
    padding: '1rem',
    height: '100%'
  },
  infoTitle: {
    color: '#333',
    marginBottom: '0.75rem',
    fontSize: '0.9rem',
    fontWeight: '600'
  },
  infoItem: {
    fontSize: '0.85rem',
    color: '#555',
    marginBottom: '0.5rem',
    display: 'flex',
    alignItems: 'center'
  },
  attachmentSection: {
    marginTop: '0.75rem'
  },
  attachmentLink: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#2196f3',
    textDecoration: 'none',
    fontSize: '0.85rem',
    fontWeight: '500',
    padding: '0.5rem 1rem',
    background: 'rgba(33, 150, 243, 0.1)',
    borderRadius: '8px',
    transition: 'background 0.2s ease'
  },
  noteBox: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#fff3e0',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: '#e65100',
    borderLeft: '3px solid #ff9800'
  },
  noteBoxSuccess: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#e8f5e9',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: '#2e7d32',
    borderLeft: '3px solid #4caf50'
  },
  noteBoxError: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#ffebee',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: '#c62828',
    borderLeft: '3px solid #f44336'
  },
  emptyCard: {
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(10px)',
    border: 'none',
    borderRadius: '15px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    padding: '3rem'
  },
  emptyIcon: {
    fontSize: '4rem',
    color: '#ccc',
    marginBottom: '1rem'
  },
  emptyTitle: {
    color: '#666',
    marginBottom: '1rem'
  },
  emptyText: {
    color: '#888',
    fontSize: '1rem',
    marginBottom: '1.5rem'
  },
  newRequestButton: {
    background: 'linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)',
    border: 'none',
    padding: '0.75rem 1.5rem'
  }
};