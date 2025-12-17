import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { openDB } from 'idb';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Modal,
  Alert,
  Spinner,
  Badge,
} from "react-bootstrap";
import API_BASE_URL from "./apiConfig";

const Checkout = () => {
  const [checkoutData, setCheckoutData] = useState(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressKey, setSelectedAddressKey] = useState(null);
  const [newAddress, setNewAddress] = useState({
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    pincode: "",
    city: "",
    state: "",
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const initDB = async () => {
    return await openDB('dimensify-stl-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('checkout-files')) {
          db.createObjectStore('checkout-files', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
  };

  useEffect(() => {
    document.body.style.background =
      "linear-gradient(135deg, #f5f5f5 0%, #e9edf2 25%, #dce2e8 50%, #cfd6dd 75%, #e9edf2 100%)";

    return () => {
      document.body.style.background = "";
    };
  }, []);

  useEffect(() => {
    const loadCheckoutData = async () => {
      try {
        const userPhone = localStorage.getItem("dimensify3duserphoneNo");
        if (!userPhone) {
          setShowLoginPopup(true);
              localStorage.setItem("last",window.location.pathname);
               console.log(localStorage);
          const timer = setTimeout(() => navigate("/login"), 5000);
          return () => clearTimeout(timer);
        }

        const res = await fetch(`${API_BASE_URL}/api/user-by-phone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: userPhone }),
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
          const userAddresses = data.data.addresses ? Object.entries(data.data.addresses) : [];
          setAddresses(userAddresses);
          
          if (userAddresses.length === 1) {
            setSelectedAddressKey(userAddresses[0][0]);
          }
        }

        const savedData = sessionStorage.getItem("checkoutData");
        if (!savedData) {
          toast.error("No checkout data found. Redirecting...");
          setTimeout(() => navigate("/"), 2000);
          return;
        }

        const parsedData = JSON.parse(savedData);
        const db = await initDB();
        const fileIds = parsedData.fileIds || [];
        
        if (fileIds.length === 0) {
          toast.error("No files found in checkout data");
          setTimeout(() => navigate("/"), 2000);
          return;
        }

        const loadedFiles = [];
        for (const id of fileIds) {
          const fileRecord = await db.get('checkout-files', id);
          if (fileRecord) {
            let file = null;
            if (fileRecord.fileArrayBuffer) {
              const blob = new Blob([fileRecord.fileArrayBuffer], { type: fileRecord.fileType });
              file = new File([blob], fileRecord.fileName, { type: fileRecord.fileType });
            }

            loadedFiles.push({
              file: file,
              fileName: fileRecord.fileName,
              fileSize: fileRecord.fileSize,
              fileType: fileRecord.fileType,
              quantity: fileRecord.quantity,
              printSettings: fileRecord.printSettings,
              pricing: fileRecord.pricing,
              dimensions: fileRecord.dimensions,
              printDetails: fileRecord.printDetails,
              modelPosition: fileRecord.modelPosition,
              modelRotation: fileRecord.modelRotation,
              specialNotes: fileRecord.specialNotes,
              unitPrice: fileRecord.unitPrice,
              totalPrice: fileRecord.totalPrice,
              timestamp: fileRecord.timestamp,
              missingFileData: fileRecord.missingFileData || !fileRecord.fileArrayBuffer
            });
          }
        }

        const updatedCheckoutData = {
          ...parsedData,
          files: loadedFiles
        };

        setCheckoutData(updatedCheckoutData);
        setLoading(false);

      } catch (error) {
        console.error("Error loading checkout data:", error);
        toast.error("Failed to load checkout data");
        setLoading(false);
        setTimeout(() => navigate("/"), 2000);
      }
    };

    loadCheckoutData();
  }, [navigate]);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async () => {
    try {
      const res = await loadRazorpay();
      if (!res) {
        toast.error('Failed to load Razorpay SDK. Check your internet connection.');
        return;
      }

      const userPhone = localStorage.getItem("dimensify3duserphoneNo");
      if (!userPhone) {
        toast.error('Please login first!');
        return;
      }

      const selectedAddr = addresses.find(([key]) => key === selectedAddressKey);
      if (!selectedAddr) {
        toast.error('Please select a delivery address.');
        return;
      }

      const grandTotal = checkoutData.totalPrice + 40;

      const orderRes = await fetch(`${API_BASE_URL}/api/createOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: grandTotal,
          currency: "INR",
          receipt: "receipt_" + Date.now(),
        }),
      });

      const orderDataRes = await orderRes.json();
      if (!orderDataRes.success) {
        toast.error('Failed to create payment order');
        return;
      }

      const { order } = orderDataRes;

      const options = {
        key: "rzp_live_RUxw1CnUrnTqD3",
        amount: order.amount,
        currency: order.currency,
        name: "Dimensify3D",
        description: "3D Printing Order Payment",
        order_id: order.id,
        handler: async function (response) {
          setShowPaymentSuccessModal(true);
          setIsProcessingOrder(true);

          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/verifyOrder`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });

            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              const files = checkoutData.files || [];
              if (!files.length) {
                setIsProcessingOrder(false);
                setShowPaymentSuccessModal(false);
                toast.error('No files found in order!');
                return;
              }

              const filesWithMissingData = files.filter(f => f.missingFileData);
              if (filesWithMissingData.length > 0) {
                toast.error(`Cannot complete order: ${filesWithMissingData.length} file(s) are missing file data.`);
                setIsProcessingOrder(false);
                setShowPaymentSuccessModal(false);
                return;
              }

              const formData = new FormData();

              files.forEach((fileData, index) => {
                if (fileData.file) {
                  formData.append(`stlFile_${index}`, fileData.file, fileData.fileName);
                }
              });

              const cleanOrderData = {
                phone: userPhone,
                address: selectedAddr[1],
                orderTimestamp: new Date().toISOString(),
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                status: "paid",
                totalPrice: checkoutData.totalPrice + 40,
                subtotal: checkoutData.subtotal,
                discountAmount: checkoutData.discountAmount,
                deliveryCharge: 40,
                appliedCoupon: checkoutData.appliedCoupon || null,
                files: files.map((fileData) => ({
                  originalName: fileData.fileName,
                  quantity: fileData.quantity || 1,
                  printSettings: fileData.printSettings || {},
                  dimensions: fileData.dimensions || {},
                  pricing: fileData.pricing || {},
                  printDetails: fileData.printDetails || {},
                  specialNotes: fileData.specialNotes || "",
                  unitPrice: fileData.unitPrice || 0,
                  totalPrice: fileData.totalPrice || 0,
                  modelPosition: fileData.modelPosition || [0, 0, 0],
                  modelRotation: fileData.modelRotation || [0, 0, 0],
                  timestamp: fileData.timestamp || new Date().toISOString()
                })),
                fileCount: files.length
              };

              formData.append("orderData", JSON.stringify(cleanOrderData));

              const orderStoreRes = await fetch(`${API_BASE_URL}/api/orders`, {
                method: "POST",
                body: formData,
              });

              const orderStoreData = await orderStoreRes.json();
              if (orderStoreData.success) {
                setIsProcessingOrder(false);
                sessionStorage.removeItem("checkoutData");
                const db = await initDB();
                await db.clear('checkout-files');
                
                setTimeout(() => {
                  setShowPaymentSuccessModal(false);
                  navigate("/");
                }, 3000);
              } else {
                setIsProcessingOrder(false);
                setShowPaymentSuccessModal(false);
                toast.error(orderStoreData.message || 'Failed to store order');
              }
            } else {
              setIsProcessingOrder(false);
              setShowPaymentSuccessModal(false);
              toast.error('Payment verification failed!');
            }
          } catch (err) {
            console.error("Error processing order:", err);
            setIsProcessingOrder(false);
            setShowPaymentSuccessModal(false);
            toast.error('Something went wrong. Please contact support.');
          }
        },
        prefill: {
          name: user?.name || "Customer",
          email: user?.email || "customer@example.com",
          contact: userPhone,
        },
        theme: { color: "#2a65c5" },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (err) {
      console.error("Error in checkout:", err);
      toast.error('Something went wrong. Please try again!');
    }
  };

  const handleAddAddress = async () => {
    if (addresses.length >= 3) {
      toast.error('You can add only up to 3 addresses.');
      return;
    }
    if (!newAddress.addressLine1 || !newAddress.pincode || !newAddress.city || !newAddress.state) {
      toast.error('Please fill all required fields.');
      return;
    }

    const userPhone = localStorage.getItem("dimensify3duserphoneNo");
    if (!userPhone) {
      toast.error('User not logged in!');
          localStorage.setItem("last",window.location.pathname);
          console.log(localStorage);
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${userPhone}/address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.name || "",
          street: newAddress.addressLine1,
          addressLine2: newAddress.addressLine2,
          landmark: newAddress.landmark,
          city: newAddress.city,
          state: newAddress.state,
          pincode: newAddress.pincode,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const updatedAddresses = [...addresses, [data.addressKey || Date.now(), newAddress]];
        setAddresses(updatedAddresses);
        setSelectedAddressKey(updatedAddresses[updatedAddresses.length - 1][0]);
        setNewAddress({ addressLine1: "", addressLine2: "", landmark: "", pincode: "", city: "", state: "" });
        setShowAddressForm(false);
        toast.success('Address saved successfully!');
      } else {
        toast.error(data.message || 'Failed to save address');
      }
    } catch (err) {
      console.error("Error saving address:", err);
      toast.error('Error saving address. Please try again.');
    }
  };

  const PaymentSuccessModal = () => (
    <Modal show={showPaymentSuccessModal} centered backdrop="static" keyboard={false} size="md">
      <Modal.Body className="text-center py-5" style={{ background: "linear-gradient(135deg, #28a745 0%, #20c997 100%)", color: "white", borderRadius: "0.5rem" }}>
        {isProcessingOrder ? (
          <>
            <div className="mb-4">
              <Spinner animation="border" size="lg" style={{ color: "white" }} />
            </div>
            <h4 className="mb-3">Processing Your Order...</h4>
            <p className="mb-4">Payment successful! We're saving your order details.</p>
            <div className="d-flex align-items-center justify-content-center">
              <Spinner animation="grow" size="sm" className="me-2" />
              <small>Please wait...</small>
              <Spinner animation="grow" size="sm" className="ms-2" />
            </div>
          </>
        ) : (
          <>
            <div className="mb-4">
              <i className="fas fa-check-circle" style={{ fontSize: "4rem" }}></i>
            </div>
            <h4 className="mb-3">Order Confirmed!</h4>
            <p className="mb-4">Your order has been placed successfully.</p>
            <small>Redirecting to homepage...</small>
          </>
        )}
      </Modal.Body>
    </Modal>
  );

  const enhancedStyles = `
    .checkout-container {
      min-height: 100vh;
      padding: 2rem 0;
    }

    .checkout-header {
      background: linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%);
      color: #fff;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 10px 30px rgba(42, 101, 197, 0.3);
      margin-bottom: 2rem;
    }

    .card-enhanced {
      border: none;
      border-radius: 1rem;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      backdrop-filter: blur(10px);
      background: rgba(255, 255, 255, 0.95);
    }

    .card-enhanced:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
    }

    .address-option {
      border: 2px solid #e9ecef;
      border-radius: 0.75rem;
      padding: 1.25rem;
      margin-bottom: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #fff;
      position: relative;
    }

    .address-option:hover {
      border-color: #2a65c5;
      box-shadow: 0 5px 20px rgba(42, 101, 197, 0.15);
      transform: translateY(-2px);
    }

    .address-option.selected {
      border-color: #2a65c5;
      background: linear-gradient(145deg, rgba(42, 101, 197, 0.05) 0%, #fff 100%);
      box-shadow: 0 8px 25px rgba(42, 101, 197, 0.2);
    }

    .address-option.selected::before {
      content: '✓';
      position: absolute;
      top: 1rem;
      right: 1rem;
      color: #2a65c5;
      font-weight: bold;
      font-size: 1.2rem;
    }

    .price-summary {
      background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 1.5rem;
      border-radius: 0.75rem;
      border: 1px solid rgba(42, 101, 197, 0.1);
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }

    .price-row:last-child {
      border-bottom: none;
      font-weight: 700;
      font-size: 1.2rem;
      color: #28a745;
      margin-top: 0.5rem;
      padding-top: 1rem;
      border-top: 2px solid #28a745;
    }

    .pay-button {
      background: linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%);
      border: none;
      border-radius: 0.75rem;
      padding: 1rem 2rem;
      font-size: 1.1rem;
      font-weight: 600;
      transition: all 0.3s ease;
      box-shadow: 0 5px 20px rgba(42, 101, 197, 0.3);
    }

    .pay-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(42, 101, 197, 0.4);
      background: linear-gradient(316deg, rgb(52 111 207) 0%, rgb(20 90 187) 100%);
    }

    .file-card {
      border: 1px solid #e9ecef;
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 1rem;
      background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
      transition: all 0.3s ease;
    }

    .file-card:hover {
      border-color: #2a65c5;
      box-shadow: 0 3px 15px rgba(42, 101, 197, 0.1);
    }

    .info-section {
      padding: 1.5rem;
      border-radius: 0.75rem;
      background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
      border: 1px solid rgba(42, 101, 197, 0.1);
      margin-bottom: 1rem;
    }

    .info-label {
      font-weight: 600;
      color: #2a65c5;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.5rem;
    }

    .btn-add-address {
      background: linear-gradient(145deg, #28a745 0%, #20c997 100%);
      border: none;
      border-radius: 0.5rem;
      padding: 0.75rem 1.5rem;
      font-weight: 600;
      transition: all 0.3s ease;
    }

    .btn-add-address:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(40, 167, 69, 0.3);
    }

    .security-note {
      background: linear-gradient(145deg, #e3f2fd 0%, #f3e5f5 100%);
      border: 1px solid rgba(42, 101, 197, 0.2);
      border-radius: 0.5rem;
      padding: 1rem;
      margin-top: 1rem;
    }

    @media (min-width: 992px) {
      .sticky-sidebar {
        position: sticky;
        top: 2rem;
      }
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
  `;

  if (showLoginPopup) {
    return (
      <Modal show centered backdrop="static">
        <Modal.Header style={{ background: "linear-gradient(316deg, rgb(42 101 197) 0%, rgb(10 80 177) 100%)", color: "#fff" }}>
          <Modal.Title>Authentication Required</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-4">
          <h5 className="mb-3">Please login to continue</h5>
          <Spinner animation="border" size="sm" className="me-2" />
          <Button variant="primary" onClick={() => navigate("/login")}>Go to Login</Button>
        </Modal.Body>
      </Modal>
    );
  }

  if (loading) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col xs={12} md={8}>
            <Card className="shadow-lg p-4">
              <div className="text-center">
                <Spinner animation="border" />
                <p className="mt-3">Loading checkout details...</p>
              </div>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  if (!checkoutData) {
    return (
      <Container className="py-5">
        <Alert variant="danger">No checkout data found.</Alert>
      </Container>
    );
  }

  const files = checkoutData.files || [];
  const fileCount = files.length;
  const totalQuantity = files.reduce((sum, f) => sum + (f.quantity || 1), 0);
  const deliveryPrice = 40;
  const grandTotal = checkoutData.totalPrice + deliveryPrice;

  return (
    <div className="checkout-container">
      <style>{enhancedStyles}</style>
      
      <Container>
        <div className="checkout-header">
          <Row className="align-items-center">
            <Col md={8}>
              <div className="d-flex align-items-center mb-2">
                <i className="fas fa-shopping-cart me-3" style={{ fontSize: "1.5rem" }}></i>
                <div>
                  <h2 className="mb-1">Order Summary</h2>
                  <p className="mb-0 opacity-75">Review your 3D printing order details</p>
                </div>
              </div>
            </Col>
            <Col md={4} className="text-md-end">
              <div className="d-flex flex-column align-items-md-end">
                <Badge bg="light" text="dark" className="mb-2 fs-6">Total Amount</Badge>
                <div style={{ fontSize: "2rem", fontWeight: "700" }}>₹{grandTotal}</div>
                <small className="opacity-75">{fileCount} file{fileCount > 1 ? 's' : ''} • {totalQuantity} item{totalQuantity > 1 ? 's' : ''}</small>
              </div>
            </Col>
          </Row>
        </div>

        <Row className="g-4">
          <Col lg={6}>
            <Card className="card-enhanced">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-4">
                  <i className="fas fa-map-marker-alt me-3 text-primary" style={{ fontSize: "1.5rem" }}></i>
                  <h4 className="mb-0">Delivery Address</h4>
                </div>

                {addresses.length === 0 ? (
                  <Alert variant="warning" className="text-center">
                    <i className="fas fa-exclamation-triangle mb-2 d-block"></i>
                    No delivery address found. Please add one to continue.
                  </Alert>
                ) : (
                  <div className="mb-3">
                    {addresses.map(([key, addr]) => (
                      <div
                        key={key}
                        className={`address-option ${selectedAddressKey === key ? 'selected' : ''}`}
                        onClick={() => setSelectedAddressKey(key)}
                      >
                        <Form.Check
                          type="radio"
                          name="address"
                          checked={selectedAddressKey === key}
                          onChange={() => setSelectedAddressKey(key)}
                          className="mb-2"
                        />
                        <div>
                          <strong>{addr.addressLine1}</strong>
                          {addr.addressLine2 && <div className="text-muted small">{addr.addressLine2}</div>}
                          {addr.landmark && <div className="text-muted small"><i className="fas fa-map-pin me-1"></i>{addr.landmark}</div>}
                          <div className="text-muted small mt-1">
                            <i className="fas fa-location-dot me-1"></i>
                            {addr.city}, {addr.state} - {addr.pincode}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!showAddressForm && addresses.length < 3 && (
                  <Button variant="outline-success" className="w-100 mb-3" onClick={() => setShowAddressForm(true)}>
                    <i className="fas fa-plus me-2"></i>Add New Address
                  </Button>
                )}

                {showAddressForm && (
                  <Card className="mt-3" style={{ backgroundColor: "#f8f9fa" }}>
                    <Card.Body>
                      <h6 className="mb-3"><i className="fas fa-plus-circle me-2"></i>Add New Address</h6>
                      <Form>
                        <Form.Group className="mb-3">
                          <Form.Control type="text" placeholder="Address Line 1 *" value={newAddress.addressLine1} onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Control type="text" placeholder="Address Line 2" value={newAddress.addressLine2} onChange={(e) => setNewAddress({ ...newAddress, addressLine2: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Control type="text" placeholder="Landmark" value={newAddress.landmark} onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Control type="text" placeholder="Pincode *" value={newAddress.pincode} onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })} maxLength={6} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Control type="text" placeholder="City *" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                          <Form.Control type="text" placeholder="State *" value={newAddress.state} onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })} />
                        </Form.Group>
                        <div className="d-grid gap-2">
                          <Button className="btn-add-address" onClick={handleAddAddress}>
                            <i className="fas fa-save me-2"></i>Save Address
                          </Button>
                          <Button variant="outline-secondary" onClick={() => setShowAddressForm(false)}>Cancel</Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card>
                )}

                <Alert variant="info" className="mt-3">
                  <div className="d-flex align-items-center">
                    <i className="fas fa-truck me-2"></i>
                    <small><strong>Estimated Delivery:</strong> 3-5 business days</small>
                  </div>
                </Alert>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6}>
            <div className="sticky-sidebar">
              <Card className="card-enhanced">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center mb-4">
                    <i className="fas fa-cube me-3 text-primary" style={{ fontSize: "1.5rem" }}></i>
                    <h4 className="mb-0">3D Model Details</h4>
                    <Badge bg="secondary" className="ms-auto">{fileCount} File{fileCount > 1 ? 's' : ''}</Badge>
                  </div>

                  {files.length > 0 ? (
                    <div className="info-section mb-4">
                      <div className="info-label">STL Files</div>
                      {files.map((fileData, index) => (
                        <div key={index} className="file-card">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center flex-grow-1">
                              <i className="fas fa-file-alt me-3 text-primary" style={{ fontSize: "1.5rem" }}></i>
                              <div>
                                <div className="fw-semibold">{fileData.fileName}</div>
                                {fileData.fileSize && (
                                  <small className="text-muted">
                                    {(fileData.fileSize / 1024).toFixed(2)} KB
                                  </small>
                                )}
                              </div>
                            </div>
                            <Badge bg="primary">Qty: {fileData.quantity || 1}</Badge>
                          </div>
                          <div className="mt-2">
                            <small className="text-muted">Price: </small>
                            <strong className="text-success">₹{fileData.totalPrice || 0}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Alert variant="warning" className="mb-4">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      No files found in order data.
                    </Alert>
                  )}

                  <div className="info-section mb-4">
                    <div className="info-label">Order Summary</div>
                    <div className="row g-3">
                      <div className="col-6">
                        <div className="text-center">
                          <div className="h4 mb-1 text-primary">{fileCount}</div>
                          <small className="text-muted">Files</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="text-center">
                          <div className="h4 mb-1 text-primary">{totalQuantity}</div>
                          <small className="text-muted">Total Items</small>
                        </div>
                      </div>
                    </div>
                    
                    {checkoutData.appliedCoupon && (
                      <div className="mt-3">
                        <div className="d-flex align-items-center justify-content-center">
                          <Badge bg="success" className="fs-6">
                            <i className="fas fa-tag me-1"></i>
                            {checkoutData.appliedCoupon.name} ({checkoutData.appliedCoupon.discount}% OFF)
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="price-summary mb-4">
                    <h5 className="mb-3">
                      <i className="fas fa-calculator me-2"></i>
                      Price Breakdown
                    </h5>
                    <div className="price-row">
                      <span>Print Cost ({totalQuantity} items)</span>
                      <span>₹{checkoutData.subtotal || checkoutData.totalPrice}</span>
                    </div>
                    {checkoutData.appliedCoupon && checkoutData.discountAmount && (
                      <div className="price-row">
                        <span>Coupon Discount</span>
                        <span className="text-success">-₹{checkoutData.discountAmount}</span>
                      </div>
                    )}
                    <div className="price-row">
                      <span>Delivery Charges</span>
                      <span>₹{deliveryPrice}</span>
                    </div>
                    <div className="price-row">
                      <span>Grand Total</span>
                      <span>₹{grandTotal}</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button 
                      className="pay-button w-100" 
                      size="lg"
                      onClick={handlePayNow}
                      disabled={!selectedAddressKey}
                    >
                      <i className="fas fa-credit-card me-2"></i>
                      Proceed to Pay ₹{grandTotal}
                    </Button>
                  </div>

                  <div className="security-note text-center mt-3">
                    <small>
                      <i className="fas fa-shield-alt me-2"></i>
                      Secure payment powered by Razorpay. Your payment information is encrypted and secure.
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>

        <Row className="mt-5">
          <Col>
            <Card className="card-enhanced">
              <Card.Body className="p-4 text-center">
                <Row className="g-4">
                  <Col md={4}>
                    <div className="mb-3">
                      <i className="fas fa-shield-alt text-primary" style={{ fontSize: "2rem" }}></i>
                    </div>
                    <h6>Secure Payment</h6>
                    <small className="text-muted">
                      Your payment is protected with 256-bit SSL encryption
                    </small>
                  </Col>
                  <Col md={4}>
                    <div className="mb-3">
                      <i className="fas fa-clock text-primary" style={{ fontSize: "2rem" }}></i>
                    </div>
                    <h6>Quick Processing</h6>
                    <small className="text-muted">
                      Your 3D print order will be processed within 24 hours
                    </small>
                  </Col>
                  <Col md={4}>
                    <div className="mb-3">
                      <i className="fas fa-headset text-primary" style={{ fontSize: "2rem" }}></i>
                    </div>
                    <h6>24/7 Support</h6>
                    <small className="text-muted">
                      Get help anytime with our dedicated customer support
                    </small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <PaymentSuccessModal />
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
    </div>
  );
};

export default Checkout;