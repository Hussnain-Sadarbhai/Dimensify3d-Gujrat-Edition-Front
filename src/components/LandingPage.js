import React, { useState, useEffect } from 'react';
import { 
  Upload, Check, Phone, Mail, MapPin, Printer, FileText, 
  Layers, Settings, Shield, Clock, Factory, School, 
  Building, Wrench, Rocket, Car, Plane, Activity, Package,
  Zap, Award, Users, ArrowUp, MessageCircle
} from 'lucide-react';
import { Container, Row, Col, Form, Button, Card, Badge, Navbar, Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Footer from './Footer';
import logo from "../images/logo-1.png";
import "./LandingPage.css"
import API_BASE_URL from "./apiConfig"
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    requirementType: '',
    file: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [products, setProducts] = useState([]);

  // Show/hide scroll to top button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch products for gallery
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/get-products`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // WhatsApp click handler
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/917022852377', '_blank');
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim() || !formData.phone.trim() || !formData.requirementType) {
      toast.error('Please fill in all required fields!', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    // Validate phone number format
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

    // Validate email if provided
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
      // Create FormData object to send file
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('phone', formData.phone.trim());
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('requirementType', formData.requirementType);
      
      // Only append file if it exists
      if (formData.file) {
        formDataToSend.append('file', formData.file);
      }

      // Make API call
      const response = await fetch(`${API_BASE_URL}/api/quote-request`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - Show toast
        toast.success(`Quote request submitted successfully! Request ID: ${data.data.quoteId}. We will contact you soon.`, {
          position: "top-right",
          autoClose: 7000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        // Reset form
        setFormData({
          name: '',
          phone: '',
          email: '',
          requirementType: '',
          file: null
        });

        // Clear file input
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        // Error from API
        toast.error(data.message || 'Failed to submit quote request. Please try again.', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    } catch (error) {
      console.error('Error submitting quote request:', error);
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



  const capabilities = [
    { 
      title: 'Materials Supported', 
      items: ['PLA', 'ABS', 'Resin', 'Nylon', 'Metal'],
      icon: <Package size={40} />
    },
    { 
      title: 'Printing Accuracy', 
      items: ['±0.1 mm Precision'],
      icon: <Zap size={40} />
    },
    { 
      title: 'Industrial Printers', 
      items: ['FDM Technology', 'SLA Systems', 'SLS Machines'],
      icon: <Factory size={40} />
    },
    { 
      title: 'Design Support', 
      items: ['CAD Review', 'Engineering Analysis'],
      icon: <Award size={40} />
    }
  ];

  const services = [
    { 
      icon: <Settings size={24} />, 
      title: 'Mechanical Part Prototyping', 
      desc: 'Precision parts for machinery and equipment',
      image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=500&h=400&fit=crop'
    },
    { 
      icon: <Layers size={24} />, 
      title: 'Machine Workflow Models', 
      desc: 'Functional models for process visualization',
      image: 'https://images.unsplash.com/photo-1581092918484-8313e1f7b5e7?w=500&h=400&fit=crop'
    },
    { 
      icon: <FileText size={24} />, 
      title: 'Architectural Models', 
      desc: 'Detailed scale models for architectural projects',
      image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&h=400&fit=crop'
    },
    { 
      icon: <Shield size={24} />, 
      title: 'Custom Engineering Design', 
      desc: 'From concept to production-ready designs',
      image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&h=400&fit=crop'
    },
    { 
      icon: <Printer size={24} />, 
      title: 'Production Batch Printing', 
      desc: 'High-volume manufacturing runs',
      image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&h=400&fit=crop'
    },
    { 
      icon: <Activity size={24} />, 
      title: 'Quality Assurance', 
      desc: 'Rigorous testing and validation',
      image: 'https://images.unsplash.com/photo-1581092162384-8987c1d64926?w=500&h=400&fit=crop'
    }
  ];

  const processSteps = [
    { number: '1', title: 'Share Requirement', desc: 'Submit your CAD file or design brief', icon: <Upload size={24} /> },
    { number: '2', title: 'Engineering Review', desc: 'Our experts analyze your requirements', icon: <Users size={24} /> },
    { number: '3', title: 'Prototype Print', desc: 'Initial prototype development', icon: <Printer size={24} /> },
    { number: '4', title: 'Testing & Refinement', desc: 'Quality checks and optimization', icon: <Shield size={24} /> },
    { number: '5', title: 'Final Production', desc: 'Precision manufacturing at scale', icon: <Check size={24} /> }
  ];

  const industries = [
    { name: 'Manufacturing', icon: <Factory size={20} /> },
    { name: 'Education & Research', icon: <School size={20} /> },
    { name: 'Architecture', icon: <Building size={20} /> },
    { name: 'Mechanical Engineering', icon: <Wrench size={20} /> },
    { name: 'Product Startups', icon: <Rocket size={20} /> },
    { name: 'Automotive', icon: <Car size={20} /> },
    { name: 'Aerospace', icon: <Plane size={20} /> },
    { name: 'Medical Devices', icon: <Activity size={20} /> }
  ];

  const portfolioItems = [
    { category: 'Machine Parts', desc: 'Industrial gear assembly', icon: <Settings size={48} /> },
    { category: 'Workflow Models', desc: 'Factory process visualization', icon: <Layers size={48} /> },
    { category: 'Engineering Prototypes', desc: 'Product development phase', icon: <Shield size={48} /> },
    { category: 'Large Builds', desc: 'Architectural scale models', icon: <Building size={48} /> }
  ];

  // Use only product images from API
  const galleryImages = products.length > 0 ? 
    products.slice(0, 8).map((product, index) => ({
      id: product.id || index,
      src: product.images?.[0] || '',
      alt: product.modelName || `3D Printed ${product.category}`,
      title: product.modelName || `3D ${product.category}`
    })).filter(img => img.src) : [];

  // Handle gallery image click to navigate to online store
  const handleGalleryImageClick = () => {
    navigate('/onlinestore');
  };

  // Inline styles for scroll to top button - at the TOP position
  const scrollTopButtonStyle = {
    position: 'fixed',
    bottom: '100px',
    right: '30px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: showScrollTop ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.4)',
    zIndex: 1000,
    transition: 'all 0.3s ease',
    outline: 'none'
  };

  // WhatsApp button style - at the BOTTOM position
  const whatsappButtonStyle = {
    position: 'fixed',
    bottom: '30px',
    right: '25px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#25D366',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
    zIndex: 1000,
    transition: 'all 0.3s ease',
    outline: 'none',
    animation: 'whatsappPulse 2s infinite'
  };

  return (
    <div className="landing-page">
      {/* Navigation Bar with Logo - Reduced Height */}
      <Navbar bg="dark" variant="dark" expand="lg" className="py-2">
        <Container>
          <Navbar.Brand href="#">
            <div className="d-flex align-items-center">
              <img
                src={logo}
                alt="Dimensify3D Logo"
                height="60"
                className="me-3"
              />
              <div>
                <div className="fw-bold fs-4 text-white">Dimensify3D</div>
                <div className="text-light small">3D Printing Solutions</div>
              </div>
            </div>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
            <Nav className="align-items-center">
              <Nav.Link href="#services" className="text-white mx-3">Services</Nav.Link>
              <Nav.Link href="#process" className="text-white mx-3">Process</Nav.Link>
              <Nav.Link href="#portfolio" className="text-white mx-3">Portfolio</Nav.Link>
              <Nav.Link href="#industries" className="text-white mx-3">Industries</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero Section with Reduced Height and Smaller Text */}
      <section className="hero-section py-4">
        <Container>
          <Row className="align-items-center" style={{ minHeight: '70vh' }}>
            <Col lg={6} className="hero-content mb-4 mb-lg-0">
              {/* Image Gallery - Similar to Header Component - NOW AT TOP */}
              <div className="hero-gallery mb-4">
                {galleryImages.length > 0 ? (
                  <div className="gallery-container-hero">
                    <div className={`gallery-track-hero ${galleryImages.length >= 1 ? 'infinite-scroll-hero' : ''}`}>
                      {/* Original images */}
                      {galleryImages.map((image) => (
                        <div 
                          key={image.id} 
                          className="gallery-item-hero"
                          onClick={handleGalleryImageClick}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="image-wrapper-hero">
                            <img 
                              src={image.src} 
                              alt={image.alt}
                              loading="lazy"
                            />
                            <div className="image-overlay-hero">
                              <h6>{image.title}</h6>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Duplicate images for infinite scroll effect */}
                      {galleryImages.length >= 1 && galleryImages.map((image) => (
                        <div 
                          key={`duplicate-${image.id}`} 
                          className="gallery-item-hero"
                          onClick={handleGalleryImageClick}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="image-wrapper-hero">
                            <img 
                              src={image.src} 
                              alt={image.alt}
                              loading="lazy"
                            />
                            <div className="image-overlay-hero">
                              <h6>{image.title}</h6>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-white text-center py-3">
                    <p className="small opacity-75">Loading product gallery...</p>
                  </div>
                )}
              </div>

              <h1 className="hero-title-small mb-3">
                Custom 3D Printed Mechanical Parts & Prototype Manufacturing
              </h1>
              <p className="hero-subtitle-small text-white mb-3">
                From concept design to precision production
              </p>
              <div className="credibility-badge d-inline-flex align-items-center mb-3">
                <Check className="me-2 text-success" size={18} />
                <span className="text-white">Industrial-grade printing | Engineering design support</span>
              </div>
              <div className="d-flex flex-wrap gap-2 mt-3">
                <Badge bg="light" text="dark" className="p-2">
                  <Clock className="me-2" size={14} />
                  Fast Turnaround
                </Badge>
                <Badge bg="light" text="dark" className="p-2">
                  <Shield className="me-2" size={14} />
                  Quality Guaranteed
                </Badge>
                <Badge bg="light" text="dark" className="p-2">
                  <Settings className="me-2" size={14} />
                  Expert Engineering
                </Badge>
              </div>
            </Col>
            
            <Col lg={6}>
              <Card className="quote-form border-0">
                <Card.Body className="p-4">
                  <h3 className="mb-3 text-dark" style={{ fontSize: '1.5rem' }}>Get Your Custom Quote</h3>

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label className="required-field">Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter Your Name"
                        disabled={isSubmitting}
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label className="required-field">Phone</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter Your Phone Number"
                        disabled={isSubmitting}
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label className="optional-field">Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter Your Email (Optional)"
                        disabled={isSubmitting}
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label className="required-field">Requirement Type</Form.Label>
                      <Form.Select
                        name="requirementType"
                        required
                        value={formData.requirementType}
                        onChange={handleChange}
                        disabled={isSubmitting}
                      >
                        <option value="">Select type</option>
                        <option value="prototype">Prototype</option>
                        <option value="machine-part">Machine Part</option>
                        <option value="model">Model</option>
                        <option value="workflow-design">Workflow Design</option>
                      </Form.Select>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label className="optional-field">Upload Design (Optional)</Form.Label>
                      <div className="file-upload-area p-3 text-center rounded">
                        <Upload className="mb-2 text-muted" size={28} />
                        <p className="text-muted small mb-0">STL, OBJ, STEP, IGES, DWG, PDF, PNG, JPG up to 10MB</p>
                        
                        {formData.file && (
                          <p className="text-success small mb-2 mt-2">
                            <Check className="me-1" size={16} />
                            Selected: {formData.file.name}
                          </p>
                        )}
                        
                        <Form.Control
                          type="file"
                          name="file"
                          onChange={handleChange}
                          className="d-none"
                          accept=".stl,.obj,.step,.stp,.iges,.igs,.dwg,.pdf,.png,.jpg,.jpeg"
                          id="file-upload"
                          disabled={isSubmitting}
                        />
                        <Form.Label htmlFor="file-upload" className={`btn btn-outline-primary mt-2 ${isSubmitting ? 'disabled' : ''}`}>
                          Choose File
                        </Form.Label>
                      </div>
                    </Form.Group>
                    
                    <Button 
                      type="submit" 
                      className="submit-btn w-100 py-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Submitting...
                        </>
                      ) : (
                        'Get Quote Now'
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Capabilities Section */}
      <section className="capability-strip py-5 text-white">
        <Container>
          <Row className="g-4">
            {capabilities.map((capability, index) => (
              <Col md={3} sm={6} key={index}>
                <div className="capability-item text-center p-4">
                  <div className="mb-3 d-flex justify-content-center text-white">{capability.icon}</div>
                  <h5 className="mb-3">{capability.title}</h5>
                  {capability.items.map((item, idx) => (
                    <p key={idx} className="mb-1 text-light">{item}</p>
                  ))}
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Services Section */}
      <section className="py-5 bg-light" id="services">
        <Container>
          <h2 className="section-title text-center">Our Services</h2>
          <Row className="g-4">
            {services.map((service, index) => (
              <Col lg={4} md={6} key={index}>
                <div className="service-card-flip h-100">
                  <div className="service-card-inner">
                    {/* Front Side */}
                    <div className="service-card-front">
                      <Card className="service-card h-100 border-0">
                        <div className="service-icon">
                          {service.icon}
                        </div>
                        <Card.Body className="p-0">
                          <Card.Title className="h5 mb-3">{service.title}</Card.Title>
                          <Card.Text className="text-muted">{service.desc}</Card.Text>
                        </Card.Body>
                      </Card>
                    </div>
                    
                    {/* Back Side with Image */}
                    <div className="service-card-back">
                      <div className="service-image-container">
                        <img 
                          src={service.image} 
                          alt={service.title}
                          className="service-flip-image"
                        />
                        <div className="service-image-overlay">
                          <h5 className="text-white fw-bold">{service.title}</h5>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Process Section */}
      <section className="py-5" id="process">
        <Container>
          <h2 className="section-title text-center">Our Engineering Process</h2>
          <Row className="justify-content-center position-relative">
            <div className="process-line-horizontal d-none d-lg-block"></div>
            {processSteps.map((step, index) => (
              <Col lg={2} md={4} sm={6} key={index} className="mb-4 mb-lg-0">
                <div className="process-step text-center">
                  <div className="step-number rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3">
                    {step.icon}
                  </div>
                  <h5 className="h6 mb-2 fw-bold">{step.title}</h5>
                  <p className="text-muted small">{step.desc}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Portfolio Section */}
      <section className="py-5 bg-light" id="portfolio">
        <Container>
          <h2 className="section-title text-center">Our Work Portfolio</h2>
          <Row className="g-4">
            {portfolioItems.map((item, index) => (
              <Col lg={3} md={6} key={index}>
                <div className="portfolio-item-new">
                  <div className="portfolio-image-new">
                    <div className="text-white">
                      {item.icon}
                    </div>
                  </div>
                  <div className="portfolio-content-new">
                    <h5 className="mb-2 fw-bold">{item.category}</h5>
                    <p className="text-muted small mb-0">{item.desc}</p>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Industries Section */}
      <section className="py-5 bg-dark text-white" id="industries">
        <Container>
          <h2 className="section-title text-center text-white">Industries We Serve</h2>
          <Row className="g-3 justify-content-center">
            {industries.map((industry, index) => (
              <Col xl={3} lg={4} md={6} key={index}>
                <div className="industry-tag">
                  <span className="me-2">{industry.icon}</span>
                  {industry.name}
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>



      {/* Footer */}
      <Footer/>

      {/* Scroll to Top Button - Top Position */}
      <button
        onClick={scrollToTop}
        style={scrollTopButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = '#0056b3';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 123, 255, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = '#007bff';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.4)';
        }}
        aria-label="Scroll to top"
      >
        <ArrowUp size={24} />
      </button>

      {/* WhatsApp Button - Bottom Position */}
      <button
        onClick={handleWhatsAppClick}
        style={whatsappButtonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = '#128C7E';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 211, 102, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = '#25D366';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.4)';
        }}
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle size={28} />
      </button>

      {/* Hero Gallery Styles */}
      <style jsx>{`
        .hero-title-small {
          font-size: 2.2rem;
          font-weight: 700;
          line-height: 1.3;
          color: var(--white);
          text-shadow: 0 3px 15px rgba(0, 0, 0, 0.2);
        }

        .hero-subtitle-small {
          font-size: 1.1rem;
          font-weight: 400;
          opacity: 0.95;
        }

        /* WhatsApp Pulse Animation */
        @keyframes whatsappPulse {
          0% {
            box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4), 0 0 0 0 rgba(37, 211, 102, 0.7);
          }
          50% {
            box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4), 0 0 0 10px rgba(37, 211, 102, 0);
          }
          100% {
            box-shadow: 0 4px 12px rgba(37, 211, 102, 0.4), 0 0 0 0 rgba(37, 211, 102, 0);
          }
        }

        /* Hero Gallery Styles */
        .hero-gallery {
          width: 100%;
          overflow: hidden;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          padding: 15px;
        }

        .gallery-container-hero {
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        .gallery-track-hero {
          display: flex;
          gap: 12px;
          width: fit-content;
        }

        .gallery-track-hero.infinite-scroll-hero {
          animation: scrollGalleryHero 25s linear infinite;
        }

        @keyframes scrollGalleryHero {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .gallery-item-hero {
          flex-shrink: 0;
          width: 200px;
          height: 150px;
          position: relative;
          transition: transform 0.2s ease;
          cursor: pointer;
        }

        .gallery-item-hero:active {
          transform: scale(0.98);
        }

        .image-wrapper-hero {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
          background: #fff;
        }

        .image-wrapper-hero:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
        }

        .image-wrapper-hero img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
          transition: transform 0.3s ease;
          display: block;
        }

        .image-wrapper-hero:hover img {
          transform: scale(1.05);
        }

        .image-overlay-hero {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
          padding: 12px;
          transform: translateY(100%);
          transition: transform 0.3s ease;
        }

        .image-wrapper-hero:hover .image-overlay-hero {
          transform: translateY(0);
        }

        .image-overlay-hero h6 {
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          margin: 0;
        }

        /* Pause animation on hover */
        .gallery-track-hero.infinite-scroll-hero:hover {
          animation-play-state: paused;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .hero-title-small {
            font-size: 1.6rem;
          }

          .hero-subtitle-small {
            font-size: 0.95rem;
          }

          .gallery-item-hero {
            width: 160px;
            height: 120px;
          }

          .hero-gallery {
            padding: 10px;
          }

          .gallery-track-hero {
            gap: 10px;
          }

          .gallery-track-hero.infinite-scroll-hero {
            animation-duration: 20s;
          }

          .image-overlay-hero h6 {
            font-size: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .hero-title-small {
            font-size: 1.4rem;
          }

          .hero-subtitle-small {
            font-size: 0.9rem;
          }

          .gallery-item-hero {
            width: 140px;
            height: 100px;
          }
        }

        /* Service Card Flip Styles */
        .service-card-flip {
          perspective: 1000px;
          cursor: pointer;
        }

        /* Required field asterisk styling - Orange color */
        .required-field::after {
          content: ' *';
          color: #f59e0b;
          font-weight: bold;
        }

        /* Optional fields don't get asterisk */
        .optional-field::after {
          content: '';
        }

        .service-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 280px;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }

        .service-card-flip:hover .service-card-inner {
          transform: rotateY(180deg);
        }

        .service-card-front,
        .service-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .service-card-front {
          z-index: 2;
        }

        .service-card-back {
          transform: rotateY(180deg);
        }

        .service-image-container {
          width: 100%;
          height: 100%;
          min-height: 280px;
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        .service-flip-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .service-image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.85), transparent);
          padding: 30px 20px;
          display: flex;
          align-items: flex-end;
        }

        .service-image-overlay h5 {
          margin: 0;
          font-size: 1.25rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        /* Ensure the card maintains proper styling */
        .service-card-flip .service-card {
          height: 100%;
          min-height: 280px;
        }

        /* Custom Toastify Styles */
        .Toastify__toast-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }
        
        .Toastify__toast {
          border-radius: 12px;
          font-size: 0.95rem;
          padding: 1rem;
          color: white !important;
          font-weight: 500;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
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

        @media (max-width: 768px) {
          .service-card-inner {
            min-height: 260px;
          }

          .service-image-container {
            min-height: 260px;
          }

          .service-card-flip .service-card {
            min-height: 260px;
          }
        }
      `}</style>

      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}