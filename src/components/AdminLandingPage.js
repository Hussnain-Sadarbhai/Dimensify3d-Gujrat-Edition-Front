import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Card, 
  Table, 
  Button, 
  Badge, 
  Spinner, 
  Alert, 
  Modal, 
  Row, 
  Col,
  Form,
  InputGroup
} from 'react-bootstrap';
import { 
  Phone, 
  Calendar, 
  Package, 
  FileText, 
  Eye,
  Search,
  Filter,
  RefreshCw,
  User
} from 'lucide-react';
import API_BASE_URL from './apiConfig';

const AdminLandingPage = () => {
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [displayedRequests, setDisplayedRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [requestsPerPage] = useState(20);

  useEffect(() => {
    fetchQuoteRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [quoteRequests, searchTerm, searchBy, dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    paginateRequests();
  }, [filteredRequests, currentPage]);

  const fetchQuoteRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/quote-requests`);
      const result = await response.json();
      
      if (result.success) {
        setQuoteRequests(result.data);
      } else {
        setError('Failed to fetch quote requests');
      }
    } catch (err) {
      setError('Error fetching quote requests: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...quoteRequests];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(request => {
        const searchLower = searchTerm.toLowerCase();
        switch (searchBy) {
          case 'quoteId':
            return request.quoteId?.toLowerCase().includes(searchLower);
          case 'name':
            return request.customerInfo.name?.toLowerCase().includes(searchLower);
          case 'phone':
            return request.customerInfo.phone?.includes(searchTerm);
          case 'email':
            return request.customerInfo.email?.toLowerCase().includes(searchLower);
          case 'all':
          default:
            return (
              request.quoteId?.toLowerCase().includes(searchLower) ||
              request.customerInfo.name?.toLowerCase().includes(searchLower) ||
              request.customerInfo.phone?.includes(searchTerm) ||
              request.customerInfo.email?.toLowerCase().includes(searchLower)
            );
        }
      });
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      filtered = filtered.filter(request => {
        if (!request.timestamps.createdAt) return false;
        const requestDate = new Date(request.timestamps.createdAt);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null;
        
        if (fromDate && requestDate < fromDate) return false;
        if (toDate && requestDate > toDate) return false;
        return true;
      });
    }

    // Sort by newest first
    filtered.sort((a, b) => {
      const dateA = new Date(a.timestamps.createdAt || 0);
      const dateB = new Date(b.timestamps.createdAt || 0);
      return dateB - dateA;
    });

    setFilteredRequests(filtered);
    setCurrentPage(1);
  };

  const paginateRequests = () => {
    const startIndex = (currentPage - 1) * requestsPerPage;
    const endIndex = startIndex + requestsPerPage;
    setDisplayedRequests(filteredRequests.slice(0, endIndex));
  };

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSearchBy('all');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('pending');
    setCurrentPage(1);
  };

  const handleStatusUpdate = async (quoteId, newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/quote-requests/${quoteId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await fetchQuoteRequests();
        alert(`Quote request ${newStatus} successfully`);
      } else {
        alert(result.message || 'Failed to update status');
      }
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusVariants = {
      'pending': 'warning',
      'succeeded': 'success',
      'rejected': 'danger'
    };

    return (
      <Badge 
        bg={statusVariants[status] || 'secondary'}
        style={{
          padding: '8px 12px',
          fontSize: '0.75rem',
          fontWeight: '600',
          borderRadius: '20px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {status || 'N/A'}
      </Badge>
    );
  };

  const handleShowDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: 'linear-gradient(135deg, #f5f5f5 0%, #e9edf2 25%, #dce2e8 50%, #cfd6dd 75%, #e9edf2 100%)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '40px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p style={{ marginTop: '20px', color: '#495057', fontSize: '1.1rem', fontWeight: '500' }}>
            Loading quote requests...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f5f5 0%, #e9edf2 25%, #dce2e8 50%, #cfd6dd 75%, #e9edf2 100%)'
      }}>
        <Container>
          <Alert variant="danger" style={{
            borderRadius: '15px',
            border: 'none',
            boxShadow: '0 5px 15px rgba(220, 53, 69, 0.3)'
          }}>
            {error}
          </Alert>
        </Container>
      </div>
    );
  }

  const hasMoreRequests = displayedRequests.length < filteredRequests.length;

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f5f5 0%, #e9edf2 25%, #dce2e8 50%, #cfd6dd 75%, #e9edf2 100%)'
    }}>
      <Container fluid style={{ padding: '30px' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)',
          borderRadius: '20px 20px 0 0',
          padding: '30px',
          marginBottom: '0',
          boxShadow: '0 5px 20px rgba(42, 101, 197, 0.3)'
        }}>
          <Row className="align-items-center">
            <Col>
              <h1 style={{ 
                fontSize: '2.5rem', 
                fontWeight: '700', 
                margin: 0, 
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                Landing Page Order Management
              </h1>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                margin: '8px 0 0 0', 
                fontSize: '1.1rem',
                fontWeight: '400'
              }}>
                Manage and track all quote requests
              </p>
            </Col>
            <Col xs="auto">
              <Button
                variant="light"
                onClick={fetchQuoteRequests}
                disabled={loading}
                style={{
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: 'none',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.2)'
                }}
              >
                <RefreshCw size={16} />
                Refresh
              </Button>
            </Col>
          </Row>
        </div>

        {/* Filters and Search */}
        <Card style={{ 
          borderRadius: '0 0 20px 20px',
          border: 'none',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          marginBottom: '30px'
        }}>
          <Card.Body style={{ padding: '30px' }}>
            <Row className="g-3">
              <Col lg={4}>
                <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '8px' }}>
                  Search Orders
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text style={{
                    backgroundColor: '#f8f9fa',
                    border: '2px solid #e9ecef',
                    borderRight: 'none'
                  }}>
                    <Search size={16} color="#6c757d" />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      border: '2px solid #e9ecef',
                      borderLeft: 'none',
                      borderRadius: '0 8px 8px 0',
                      padding: '12px'
                    }}
                  />
                </InputGroup>
              </Col>

              <Col lg={2}>
                <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '8px' }}>
                  Search By
                </Form.Label>
                <Form.Select 
                  value={searchBy} 
                  onChange={(e) => setSearchBy(e.target.value)}
                  style={{
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                >
                  <option value="all">All Fields</option>
                  <option value="quoteId">Quote ID</option>
                  <option value="name">Customer Name</option>
                  <option value="phone">Phone Number</option>
                  <option value="email">Email</option>
                </Form.Select>
              </Col>

              <Col lg={2}>
                <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '8px' }}>
                  Date From
                </Form.Label>
                <Form.Control
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
              </Col>

              <Col lg={2}>
                <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '8px' }}>
                  Date To
                </Form.Label>
                <Form.Control
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
              </Col>

              <Col lg={2}>
                <Form.Label style={{ fontWeight: '600', color: '#495057', marginBottom: '8px' }}>
                  Filter by Status
                </Form.Label>
                <Form.Select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    border: '2px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '12px',
                    fontWeight: '600'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="rejected">Rejected</option>
                </Form.Select>
              </Col>
            </Row>

            <Row className="align-items-center mt-3">
              <Col>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '20px',
                  color: '#6c757d',
                  fontSize: '0.95rem'
                }}>
                  <span>
                    Showing <strong>{displayedRequests.length}</strong> of <strong>{filteredRequests.length}</strong> orders
                    {filteredRequests.length !== quoteRequests.length && ` (filtered from ${quoteRequests.length} total)`}
                  </span>
                </div>
              </Col>
              <Col xs="auto">
                <Button
                  variant="outline-secondary"
                  onClick={resetFilters}
                  style={{
                    borderRadius: '8px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Filter size={14} />
                  Reset Filters
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Quote Requests Table */}
        <Card style={{ 
          borderRadius: '20px',
          border: 'none',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {displayedRequests.length === 0 ? (
            <Card.Body style={{ padding: '80px 20px', textAlign: 'center' }}>
              <Package size={64} style={{ color: '#dee2e6', marginBottom: '20px' }} />
              <h4 style={{ color: '#6c757d', marginBottom: '10px' }}>No quote requests found</h4>
              <p style={{ color: '#adb5bd', margin: 0 }}>
                {filteredRequests.length === 0 && quoteRequests.length > 0 
                  ? 'Try adjusting your search filters'
                  : 'No quote requests have been submitted yet'
                }
              </p>
            </Card.Body>
          ) : (
            <>
              <Table hover responsive style={{ margin: 0 }}>
                <thead>
                  <tr style={{
                    background: 'linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)',
                    color: 'white'
                  }}>
                    <th style={{ padding: '20px 24px', fontWeight: '700', fontSize: '0.95rem', borderBottom: 'none', letterSpacing: '0.5px' }}>
                      Customer
                    </th>
                    <th style={{ padding: '20px 24px', fontWeight: '700', fontSize: '0.95rem', borderBottom: 'none', letterSpacing: '0.5px' }}>
                      Contact
                    </th>
                    <th style={{ padding: '20px 24px', fontWeight: '700', fontSize: '0.95rem', borderBottom: 'none', letterSpacing: '0.5px' }}>
                      Files
                    </th>
                    <th style={{ padding: '20px 24px', fontWeight: '700', fontSize: '0.95rem', borderBottom: 'none', letterSpacing: '0.5px' }}>
                      Order Date
                    </th>
                    <th style={{ padding: '20px 24px', fontWeight: '700', fontSize: '0.95rem', borderBottom: 'none', letterSpacing: '0.5px' }}>
                      Status
                    </th>
                    <th style={{ padding: '20px 24px', fontWeight: '700', fontSize: '0.95rem', borderBottom: 'none', letterSpacing: '0.5px', textAlign: 'center' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRequests.map((request, index) => (
                    <tr 
                      key={request.id} 
                      style={{ 
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '1.1rem'
                          }}>
                            {request.customerInfo.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#343a40', fontSize: '1rem' }}>
                              {request.customerInfo.name}
                            </div>
                            <div style={{ color: '#6c757d', fontSize: '0.85rem' }}>
                              ID: {request.quoteId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Phone size={14} style={{ color: '#6c757d' }} />
                            <span style={{ color: '#495057', fontSize: '0.9rem' }}>{request.customerInfo.phone}</span>
                          </div>
                          <div style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                            {request.customerInfo.email || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileText size={16} style={{ color: '#6c757d' }} />
                          <div>
                            <div style={{ color: '#495057', fontSize: '0.9rem', fontWeight: '500' }}>
                              {request.designFile ? '1 file' : '0 files'}
                            </div>
                            <div style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                              Type: {request.requirementType}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={14} style={{ color: '#6c757d' }} />
                          <div>
                            <div style={{ color: '#495057', fontSize: '0.9rem', fontWeight: '500' }}>
                              {new Date(request.timestamps.createdAt).toLocaleDateString()}
                            </div>
                            <div style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                              {new Date(request.timestamps.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                        {getStatusBadge(request.status)}
                      </td>
                      <td style={{ padding: '20px 24px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleShowDetails(request)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              borderRadius: '8px',
                              fontWeight: '600',
                              padding: '8px 12px',
                              transition: 'all 0.2s ease'
                            }}
                            title="View Details"
                          >
                            <Eye size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {hasMoreRequests && (
                <div style={{ 
                  padding: '30px', 
                  textAlign: 'center', 
                  borderTop: '1px solid #e9ecef',
                  backgroundColor: '#f8f9fa'
                }}>
                  <Button
                    variant="primary"
                    onClick={loadMore}
                    style={{
                      borderRadius: '12px',
                      padding: '12px 30px',
                      fontWeight: '600',
                      fontSize: '1rem',
                      background: 'linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)',
                      border: 'none',
                      boxShadow: '0 4px 15px rgba(42, 101, 197, 0.3)'
                    }}
                  >
                    Load More Orders ({filteredRequests.length - displayedRequests.length} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Quote Request Details Modal */}
        <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
          <Modal.Header 
            closeButton 
            style={{ 
              background: 'linear-gradient(316deg, rgb(42, 101, 197) 0%, rgb(10, 80, 177) 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '15px 15px 0 0'
            }}
          >
            <Modal.Title style={{ 
              color: 'white', 
              fontWeight: '700',
              fontSize: '1.4rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Package size={24} />
              Quote Request Details - {selectedRequest?.customerInfo.name}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ 
            maxHeight: '70vh', 
            overflowY: 'auto', 
            padding: '30px',
            backgroundColor: '#f8f9fa'
          }}>
            {selectedRequest && (
              <Row className="g-4">
                {/* Customer Information */}
                <Col md={6}>
                  <Card style={{ 
                    height: '100%',
                    border: 'none',
                    borderRadius: '15px',
                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)'
                  }}>
                    <Card.Header style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '15px 15px 0 0',
                      padding: '16px 20px'
                    }}>
                      <h6 style={{ 
                        margin: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        fontWeight: '700',
                        gap: '8px'
                      }}>
                        <User size={16} />
                        Customer Information
                      </h6>
                    </Card.Header>
                    <Card.Body style={{ padding: '20px' }}>
                      <div style={{ fontSize: '0.9rem', lineHeight: '2' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#495057' }}>Name:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px' }}>{selectedRequest.customerInfo.name}</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#495057' }}>Phone:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px' }}>{selectedRequest.customerInfo.phone}</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#495057' }}>Email:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px' }}>{selectedRequest.customerInfo.email || 'N/A'}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#495057' }}>Quote ID:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px', fontSize: '0.85rem' }}>{selectedRequest.quoteId}</span>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Request Information */}
                <Col md={6}>
                  <Card style={{ 
                    height: '100%',
                    border: 'none',
                    borderRadius: '15px',
                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)'
                  }}>
                    <Card.Header style={{ 
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '15px 15px 0 0',
                      padding: '16px 20px'
                    }}>
                      <h6 style={{ 
                        margin: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        fontWeight: '700',
                        gap: '8px'
                      }}>
                        <Package size={16} />
                        Request Information
                      </h6>
                    </Card.Header>
                    <Card.Body style={{ padding: '20px' }}>
                      <div style={{ fontSize: '0.9rem', lineHeight: '2' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#495057' }}>Requirement Type:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px', textTransform: 'capitalize' }}>
                            {selectedRequest.requirementType?.replace('-', ' ')}
                          </span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#495057' }}>Current Status:</strong> 
                          <span style={{ marginLeft: '8px' }}>{getStatusBadge(selectedRequest.status)}</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#495057' }}>Update Status:</strong> 
                          <Form.Select
                            value={selectedRequest.status}
                            onChange={(e) => {
                              handleStatusUpdate(selectedRequest.quoteId, e.target.value);
                              handleCloseModal();
                            }}
                            style={{
                              width: '100%',
                              marginTop: '8px',
                              padding: '8px 12px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              borderRadius: '8px',
                              border: '2px solid #e9ecef'
                            }}
                          >
                            <option value="pending">PENDING</option>
                            <option value="succeeded">SUCCEEDED</option>
                            <option value="rejected">REJECTED</option>
                          </Form.Select>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#495057' }}>Priority:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px', textTransform: 'capitalize' }}>
                            {selectedRequest.priority}
                          </span>
                        </div>
                        <div>
                          <strong style={{ color: '#495057' }}>Stage:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px', textTransform: 'capitalize' }}>
                            {selectedRequest.stage}
                          </span>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Design File */}
                {selectedRequest.designFile && (
                  <Col md={12}>
                    <Card style={{ 
                      border: 'none',
                      borderRadius: '15px',
                      boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)'
                    }}>
                      <Card.Header style={{ 
                        background: 'linear-gradient(135deg, #e12bf5ff 0%, #f5576c 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '15px 15px 0 0',
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <h6 style={{ 
                          margin: 0, 
                          display: 'flex', 
                          alignItems: 'center', 
                          fontWeight: '700',
                          gap: '8px'
                        }}>
                          <FileText size={16} />
                          Design File
                        </h6>
                        <Button
                          variant="light"
                          size="sm"
                          onClick={() => window.open(selectedRequest.designFile.url, '_blank')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '600'
                          }}
                        >
                          <Eye size={14} />
                          View File
                        </Button>
                      </Card.Header>
                      <Card.Body style={{ padding: '20px' }}>
                        <Row className="g-3">
                          <Col md={6}>
                            <div style={{ fontSize: '0.9rem', lineHeight: '2' }}>
                              <div style={{ marginBottom: '8px' }}>
                                <strong style={{ color: '#495057' }}>File Name:</strong> 
                                <span style={{ color: '#6c757d', marginLeft: '8px' }}>
                                  {selectedRequest.designFile.metadata.originalName}
                                </span>
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <strong style={{ color: '#495057' }}>File Type:</strong> 
                                <span style={{ color: '#6c757d', marginLeft: '8px' }}>
                                  {selectedRequest.designFile.metadata.fileType}
                                </span>
                              </div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div style={{ fontSize: '0.9rem', lineHeight: '2' }}>
                              <div style={{ marginBottom: '8px' }}>
                                <strong style={{ color: '#495057' }}>File Size:</strong> 
                                <span style={{ color: '#6c757d', marginLeft: '8px' }}>
                                  {(selectedRequest.designFile.metadata.fileSize / 1024).toFixed(2)} KB
                                </span>
                              </div>
                              <div style={{ marginBottom: '8px' }}>
                                <strong style={{ color: '#495057' }}>MIME Type:</strong> 
                                <span style={{ color: '#6c757d', marginLeft: '8px' }}>
                                  {selectedRequest.designFile.metadata.mimeType}
                                </span>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                )}

                {/* Metadata */}
                <Col md={12}>
                  <Card style={{ 
                    border: 'none',
                    borderRadius: '15px',
                    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)'
                  }}>
                    <Card.Header style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '15px 15px 0 0',
                      padding: '16px 20px'
                    }}>
                      <h6 style={{ 
                        margin: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        fontWeight: '700',
                        gap: '8px'
                      }}>
                        <FileText size={16} />
                        Additional Information
                      </h6>
                    </Card.Header>
                    <Card.Body style={{ padding: '20px' }}>
                      <div style={{ fontSize: '0.9rem', lineHeight: '2' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#495057' }}>Source:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px' }}>{selectedRequest.metadata.source}</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#495057' }}>IP Address:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px' }}>{selectedRequest.metadata.ip}</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong style={{ color: '#495057' }}>Created At:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px' }}>
                            {new Date(selectedRequest.timestamps.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <strong style={{ color: '#495057' }}>Last Updated:</strong> 
                          <span style={{ color: '#6c757d', marginLeft: '8px' }}>
                            {new Date(selectedRequest.timestamps.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </Modal.Body>
          <Modal.Footer style={{ 
            backgroundColor: '#f8f9fa', 
            borderTop: '1px solid #dee2e6',
            borderRadius: '0 0 15px 15px',
            padding: '20px 30px'
          }}>
            <Button 
              variant="secondary" 
              onClick={handleCloseModal}
              style={{
                borderRadius: '10px',
                padding: '10px 20px',
                fontWeight: '600'
              }}
            >
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
};

export default AdminLandingPage;