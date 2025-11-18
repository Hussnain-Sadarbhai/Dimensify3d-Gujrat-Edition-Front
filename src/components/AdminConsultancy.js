import React, { useEffect, useState } from "react";
import {
  Container,
  Card,
  Spinner,
  Alert,
  Button,
  Row,
  Col,
  Badge,
} from "react-bootstrap";
import API_BASE_URL from "./apiConfig";
const AdminConsultancyRequests = () => {
  const [loading, setLoading] = useState(true);
  const [consultancies, setConsultancies] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchConsultancies = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/consultancy-requests`);
        const data = await res.json();

        if (!data.success) {
          setError("Failed to fetch consultancy requests");
          setLoading(false);
          return;
        }

        setConsultancies(data.data); // directly from new API
        setLoading(false);
      } catch (err) {
        console.error("Error fetching consultancies:", err);
        setError("Something went wrong while fetching data");
        setLoading(false);
      }
    };

    fetchConsultancies();
  }, []);

  // Handle copy phone number to clipboard
  const copyPhoneToClipboard = async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      alert("Phone number copied to clipboard!");
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = phone;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Phone number copied to clipboard!");
    }
  };

  // Handle mark as attended
  const handleAttended = async (userId, consultancyId) => {
    try {
      const res = await fetch(
        `API_BASE_URL/api/users/${userId}/consultancy/${consultancyId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "attended" }),
        }
      );

      const data = await res.json();

      if (data.success) {
        // Remove it from UI
        setConsultancies((prev) =>
          prev.filter(
            (req) =>
              !(req.userId === userId && req.consultancyId === consultancyId)
          )
        );
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Something went wrong while updating status");
    }
  };

  return (
    <div style={styles.body}>
      {/* Enhanced Page Header */}
      <div style={styles.pageHeader}>
        <Container>
          <Row className="align-items-center">
            <Col md={8}>
              <div style={styles.headerContent}>
                <h1 style={styles.pageTitle}>
                  <span style={styles.titleIcon}>📋</span>
                  Consultancy Management Dashboard
                </h1>
                <p style={styles.subtitle}>
                  Manage and track all consultancy requests efficiently
                </p>
              </div>
            </Col>
            <Col md={4} className="text-end">
              <div style={styles.statsCard}>
                <div style={styles.statNumber}>{consultancies.length}</div>
                <div style={styles.statLabel}>Pending Requests</div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      <Container className="py-4">
        {/* Main Content Card */}
        <Card style={styles.mainCard} className="shadow-lg">
          <Card.Header style={styles.cardHeader}>
            <Row className="align-items-center">
              <Col>
                <h3 style={styles.cardTitle}>
                  <span style={styles.cardIcon}>🔍</span>
                  Consultancy Requests
                </h3>
              </Col>
              <Col xs="auto">
                <Badge style={styles.headerBadge}>
                  {consultancies.length} requests
                </Badge>
              </Col>
            </Row>
          </Card.Header>

          <Card.Body style={styles.cardBody}>
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" size="lg" />
                <p style={styles.loadingText} className="mt-3">
                  Loading requests...
                </p>
              </div>
            ) : error ? (
              <Alert variant="danger" style={styles.alertBox}>
                <span style={styles.alertIcon}>⚠️</span>
                {error}
              </Alert>
            ) : consultancies.length === 0 ? (
              <Alert variant="info" style={styles.alertBox}>
                <span style={styles.alertIcon}>ℹ️</span>
                No consultancy requests found
              </Alert>
            ) : (
              <div>
                {consultancies.map((req, idx) => (
                  <div key={idx} className="mb-4">
                    <Card style={styles.requestCard} className="shadow-sm">
                      {/* Request Header */}
                      <Card.Header style={styles.requestHeader}>
                        <div style={styles.userInfo}>
                          <div style={styles.userAvatar}>
                            {req.userName?.charAt(0)?.toUpperCase() || "U"}
                          </div>
                          <div>
                            <h5 style={styles.userName}>{req.userName}</h5>
                            <span style={styles.requestDate}>
                              {new Date(req.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Card.Header>

                      {/* Request Body */}
                      <Card.Body style={styles.requestBody}>
                        <div style={styles.infoGrid}>
                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>📞 Phone:</span>
                            <div style={styles.phoneContainer}>
                              <span style={styles.infoValue}>
                                {req.userPhone}
                              </span>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                style={styles.copyButton}
                                onClick={() =>
                                  copyPhoneToClipboard(req.userPhone)
                                }
                                title="Copy phone number"
                              >
                                📋
                              </Button>
                            </div>
                          </div>

                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>
                              📅 Preferred Date:
                            </span>
                            <span style={styles.infoValue}>{req.date}</span>
                          </div>

                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>
                              🕒 Requested At:
                            </span>
                            <span style={styles.infoValue}>
                              {new Date(req.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {req.problem && (
                          <div style={styles.problemSection}>
                            <span style={styles.problemLabel}>
                              💭 Problem Description:
                            </span>
                            <p style={styles.problemText}>{req.problem}</p>
                          </div>
                        )}

                        {req.photoUrl && (
                          <div style={styles.photoSection}>
                            <span style={styles.photoLabel}>
                              📷 Attachment:
                            </span>
                            <div style={styles.photoContainer}>
                              <img
                                src={req.photoUrl}
                                alt="consultancy attachment"
                                style={styles.photo}
                                onClick={() =>
                                  window.open(req.photoUrl, "_blank")
                                }
                              />
                            </div>
                          </div>
                        )}
                      </Card.Body>

                      {/* Request Footer */}
                      <Card.Footer style={styles.requestFooter}>
                        <Button
                          variant="success"
                          style={styles.attendedButton}
                          onClick={() =>
                            handleAttended(req.userId, req.consultancyId)
                          }
                          className="w-100"
                        >
                          <span style={styles.buttonIcon}>✓</span>
                          Mark as Attended
                        </Button>
                      </Card.Footer>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

// Enhanced Internal CSS
const styles = {
  body: {
    background:
      "linear-gradient(135deg, #f5f5f5 0%, #e9edf2 25%, #dce2e8 50%, #cfd6dd 75%, #e9edf2 100%)",
    minHeight: "100vh",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },

  // Page Header Styles
  pageHeader: {
    background:
      "linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)",
    padding: "2rem 0",
    marginBottom: "2rem",
    borderBottom: "4px solid rgba(255, 255, 255, 0.2)",
    boxShadow: "0 4px 20px rgba(42, 101, 197, 0.3)",
  },

  headerContent: {
    color: "white",
  },

  pageTitle: {
    fontSize: "2.5rem",
    fontWeight: "700",
    margin: "0 0 0.5rem 0",
    color: "white",
    textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
  },

  titleIcon: {
    marginRight: "1rem",
    fontSize: "2.2rem",
  },

  subtitle: {
    fontSize: "1.1rem",
    margin: 0,
    opacity: 0.9,
    fontWeight: "300",
  },

  statsCard: {
    background: "rgba(255, 255, 255, 0.15)",
    borderRadius: "16px",
    padding: "1.5rem",
    textAlign: "center",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
  },

  statNumber: {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: "white",
    lineHeight: 1,
  },

  statLabel: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: "0.9rem",
    marginTop: "0.5rem",
    fontWeight: "500",
  },

  // Main Card Styles
  mainCard: {
    borderRadius: "20px",
    border: "none",
    overflow: "hidden",
  },

  cardHeader: {
    background:
      "linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)",
    border: "none",
    padding: "1.5rem 2rem",
  },

  cardTitle: {
    color: "white",
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: "600",
  },

  cardIcon: {
    marginRight: "0.75rem",
    fontSize: "1.3rem",
  },

  headerBadge: {
    background: "rgba(255, 255, 255, 0.2)",
    color: "white",
    padding: "0.5rem 1rem",
    borderRadius: "50px",
    fontSize: "0.9rem",
    fontWeight: "500",
    border: "1px solid rgba(255, 255, 255, 0.3)",
  },

  cardBody: {
    padding: "2rem",
    background: "white",
  },

  // Alert Styles
  alertBox: {
    borderRadius: "12px",
    padding: "1rem 1.5rem",
    fontSize: "1rem",
    border: "none",
    display: "flex",
    alignItems: "center",
  },

  alertIcon: {
    marginRight: "0.75rem",
    fontSize: "1.2rem",
  },

  loadingText: {
    color: "#6c757d",
    fontSize: "1.1rem",
    margin: 0,
  },

  // Request Card Styles
  requestCard: {
    borderRadius: "16px",
    border: "1px solid #e3e6f0",
    transition: "all 0.3s ease",
    overflow: "hidden",
  },

  requestHeader: {
    background: "linear-gradient(135deg, #f8f9fc 0%, #e9ecef 100%)",
    border: "none",
    padding: "1rem 1.5rem",
    borderBottom: "2px solid #e3e6f0",
  },

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },

  userAvatar: {
    width: "50px",
    height: "50px",
    borderRadius: "50%",
    background:
      "linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontSize: "1.2rem",
    fontWeight: "bold",
    boxShadow: "0 4px 12px rgba(42, 101, 197, 0.3)",
  },

  userName: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: "600",
    color: "#2a65c5",
  },

  requestDate: {
    color: "#6c757d",
    fontSize: "0.9rem",
  },

  requestBody: {
    padding: "1.5rem",
  },

  infoGrid: {
    display: "grid",
    gap: "1rem",
    marginBottom: "1rem",
  },

  infoItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem",
    background: "#f8f9fc",
    borderRadius: "8px",
    border: "1px solid #e3e6f0",
  },

  infoLabel: {
    fontWeight: "600",
    color: "#495057",
    fontSize: "0.9rem",
  },

  infoValue: {
    color: "#2a65c5",
    fontWeight: "500",
    fontSize: "0.9rem",
  },

  phoneValue: {
    color: "#2a65c5",
    fontWeight: "500",
    fontSize: "0.9rem",
    cursor: "pointer",
    padding: "0.25rem 0.5rem",
    borderRadius: "4px",
    transition: "all 0.2s ease",
    textDecoration: "underline",
    textDecorationStyle: "dotted",
  },

  phoneContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },

  copyButton: {
    padding: "0.25rem 0.5rem",
    fontSize: "0.8rem",
    border: "1px solid #2a65c5",
    borderRadius: "6px",
    background: "white",
    color: "#2a65c5",
    transition: "all 0.2s ease",
    minWidth: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  problemSection: {
    marginTop: "1rem",
    padding: "1rem",
    background: "#fff3cd",
    borderRadius: "8px",
    border: "1px solid #ffeaa7",
  },

  problemLabel: {
    fontWeight: "600",
    color: "#856404",
    fontSize: "0.9rem",
    display: "block",
    marginBottom: "0.5rem",
  },

  problemText: {
    margin: 0,
    color: "#856404",
    lineHeight: 1.5,
  },

  photoSection: {
    marginTop: "1rem",
  },

  photoLabel: {
    fontWeight: "600",
    color: "#495057",
    fontSize: "0.9rem",
    display: "block",
    marginBottom: "0.75rem",
  },

  photoContainer: {
    textAlign: "center",
  },

  photo: {
    maxWidth: "100%",
    maxHeight: "200px",
    borderRadius: "12px",
    border: "2px solid #e3e6f0",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },

  requestFooter: {
    background: "#f8f9fc",
    border: "none",
    borderTop: "2px solid #e3e6f0",
    padding: "1rem 1.5rem",
  },

  attendedButton: {
    background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)",
    border: "none",
    borderRadius: "10px",
    padding: "0.75rem 1.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)",
    transition: "all 0.3s ease",
  },

  buttonIcon: {
    marginRight: "0.5rem",
    fontSize: "1.1rem",
  },
};

export default AdminConsultancyRequests;
