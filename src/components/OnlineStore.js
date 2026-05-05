import React, { useState, useEffect } from 'react';
import { Search, Package, Tag, ChevronLeft, ChevronRight, ShoppingCart, Zap, ArrowLeft } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_BASE_URL from "./apiConfig";
import { useNavigate, useLocation } from "react-router-dom";
import Header2 from "./Header2"; // Import the Header2 component

export default function ProductStore() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});

  const location = useLocation();
  const navigate = useNavigate();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/get-products`);
      const result = await response.json();
      
      if (result.success) {
        // Process products to round prices
        const processedProducts = result.data.map(product => {
          // Round finalPrice and price to remove decimals
          const roundedProduct = { ...product };
          
          if (roundedProduct.finalPrice) {
            roundedProduct.finalPrice = Math.round(parseFloat(roundedProduct.finalPrice));
          }
          
          if (roundedProduct.price) {
            roundedProduct.price = Math.round(parseFloat(roundedProduct.price));
          }
          
          return roundedProduct;
        });
        
        const sortedProducts = processedProducts.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.dateAdded || 0);
          const dateB = new Date(b.createdAt || b.dateAdded || 0);
          return dateB - dateA;
        });
        
        setProducts(sortedProducts);
        const uniqueCategories = ['All', ...new Set(result.data.map(p => p.category))];
        setCategories(uniqueCategories);
        setError(null);
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    } catch (err) {
      const errorMsg = 'Failed to fetch products. Please try again later.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.modelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const handlePrevImage = (productId, totalImages, e) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => ({
      ...prev,
      [productId]: ((prev[productId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const handleNextImage = (productId, totalImages, e) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => ({
      ...prev,
      [productId]: ((prev[productId] || 0) + 1) % totalImages
    }));
  };

  const checkUserLogin = () => {
    const phone = localStorage.getItem("dimensify3duserphoneNo");
    if (!phone) {
      setShowLoginPopup(true);
      return false;
    }
    return true;
  };

  const handleProductClick = (product) => {
    navigate('/itemdetails', { 
      state: { product } 
    });
  };

  const handleAddToCart = async (product, e) => {
    e.stopPropagation();

    if (!checkUserLogin()) {
      return;
    }

    setAddingToCart(prev => ({ ...prev, [product.id]: true }));

    const phone = localStorage.getItem("dimensify3duserphoneNo");

    try {
      const userResponse = await fetch(`${API_BASE_URL}/api/user-by-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const userResult = await userResponse.json();

      if (!userResult.success || !userResult.data) {
        toast.error("User not found. Please re-login.");
        localStorage.removeItem("dimensify3duserphoneNo");
        setShowLoginPopup(true);
        return;
      }

      const user = userResult.data;
      const cart = user.cart ? Object.values(user.cart) : [];

      const alreadyInCart = cart.some(item => item.id === product.id);
      if (alreadyInCart) {
        toast.info(`"${product.modelName}" is already in your cart!`);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/add-to-cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, product }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`${product.modelName} added to cart successfully!`,{autoClose: 850 
});
      } else {
        toast.error(result.message || "Failed to add to cart");
      }
    } catch (err) {
      console.error("Add to cart failed:", err);
      toast.error("Something went wrong while adding to cart");
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const handleBuyNow = (product, e) => {
    e.stopPropagation();
    
    if (!checkUserLogin()) {
      return;
    }

    // Round prices for cart item
    const cartItem = {
      id: product.id,
      name: product.modelName,
      description: product.description,
      price: Math.round(product.finalPrice || product.price || 0),
      originalPrice: Math.round(product.price || 0),
      image: product.images?.[0] || 'https://via.placeholder.com/150',
      quantity: 1,
      off: product.off || 0,
      category: product.category || '',
      isCustomizable: product.isCustomizable || false,
    };

    navigate('/onlinestorecheckout', { 
      state: { cartItems: [cartItem] } 
    });
    
    toast.success(`Proceeding to checkout for ${product.modelName}`,{autoClose: 850 
});
  };

  const handleLoginRedirect = () => {
    setShowLoginPopup(false);
    localStorage.setItem("last","/onlinestore");
    console.log(localStorage);
    window.location.href = "/login";
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const handleCartClick = () => {
    window.location.href = "/cart";
  };
  
  useEffect(() => {
    // Push current path to history stack
    // Then immediately replace previous history entry with root for back button to land at "/"
    if (location.pathname !== '/') {
      window.history.pushState(null, '', location.pathname);
      window.history.replaceState(null, '', '/');
    }
  }, [location.pathname]);
  
  return (
    <>
      <style>{`
        @import url("https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css");
        @import url("https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap");

        .online-wrapper {
          min-height: 100vh;
          background: linear-gradient(
            135deg,
            #f5f5f5 0%,
            #e9edf2 25%,
            #dce2e8 50%,
            #cfd6dd 75%,
            #e9edf2 100%
          );
          font-family: "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        }

        /* Remove custom header styles since we're using Header2 */
        /* Keep all other styles except header-related ones */
        
        .online-search-section {
          background: white;
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin-bottom: 2.5rem;
          margin-top: 2rem;
        }

        /* Add extra padding for mobile to prevent header overlap */
        @media (max-width: 768px) {
          .online-search-section {
            margin-top: 1rem;
            padding: 1rem;
          }
        }

        .online-search-input-group {
          position: relative;
        }

        .online-search-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          pointer-events: none;
        }

        .online-search-input {
          border: 2px solid #e9edf2;
          border-radius: 12px;
          padding: 0.75rem 1rem 0.75rem 3rem;
          font-size: 1rem;
          transition: all 0.3s ease;
          width: 100%;
        }

        .online-search-input:focus {
          border-color: rgb(42, 101, 197);
          box-shadow: 0 0 0 3px rgba(42, 101, 197, 0.1);
          outline: none;
        }

        .online-category-select-wrapper {
          position: relative;
        }

        .online-category-label {
          position: absolute;
          left: 15px;
          top: -10px;
          background: white;
          padding: 0 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: rgb(42, 101, 197);
          z-index: 10;
        }

        .online-category-select {
          border: 2px solid #e9edf2;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 1rem;
          transition: all 0.3s ease;
          cursor: pointer;
          width: 100%;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237f8c8d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 3rem;
        }

        .online-category-select:focus {
          border-color: rgb(42, 101, 197);
          box-shadow: 0 0 0 3px rgba(42, 101, 197, 0.1);
          outline: none;
        }

        .online-product-card {
          border: none;
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          height: 100%;
          background: white;
          max-width: 350px;
          margin: 0 auto;
          cursor: pointer;
        }

        .online-product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
        }

        .online-product-image {
          width: 100%;
          height: 250px;
          position: relative;
          overflow: hidden;
          background: #f8f9fa;
        }

        .online-product-image img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }

        .online-product-card:hover .online-product-image img {
          transform: scale(1.05);
        }

        .online-image-container {
          position: relative;
        }

        .online-discount-badge {
          position: absolute;
          top: 15px;
          right: 15px;
          background: #ff4757;
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.9rem;
          box-shadow: 0 2px 10px rgba(255, 71, 87, 0.3);
          z-index: 10;
        }

        .online-image-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.9);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          z-index: 10;
        }

        .online-image-nav-btn:hover {
          background: white;
          transform: translateY(-50%) scale(1.1);
        }

        .online-image-nav-btn.online-prev {
          left: 10px;
        }

        .online-image-nav-btn.online-next {
          right: 10px;
        }

        .online-image-indicators {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 10;
        }

        .online-image-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          transition: all 0.3s ease;
        }

        .online-image-indicator.online-active {
          background: white;
          width: 24px;
          border-radius: 4px;
        }

        .online-category-badge {
          background: linear-gradient(135deg, rgb(42, 101, 197), rgb(10, 80, 177));
          color: white;
          padding: 0.35rem 0.7rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          margin-bottom: 0.6rem;
        }

        .online-product-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #2c3e50;
          margin: 0.4rem 0;
          line-height: 1.3;
        }

        .online-product-description {
          color: #7f8c8d;
          font-size: 0.85rem;
          margin-bottom: 0.8rem;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .online-price-section {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          margin: 0.8rem 0;
        }

        .online-final-price {
          font-size: 1.5rem;
          font-weight: 700;
          color: rgb(42, 101, 197);
        }

        .online-original-price {
          font-size: 1rem;
          color: #95a5a6;
          text-decoration: line-through;
        }

        .online-price-on-checkout {
          background: linear-gradient(135deg, #e8f4fd 0%, #d4e9fa 100%);
          border: 2px solid rgba(42, 101, 197, 0.3);
          border-radius: 10px;
          padding: 0.8rem;
          margin: 0.8rem 0;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .online-price-on-checkout-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgb(42, 101, 197);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.3rem;
        }

        .online-price-on-checkout-text {
          font-size: 0.9rem;
          font-weight: 600;
          color: rgb(10, 80, 177);
          margin: 0;
        }

        .online-customize-box {
          background: #f8f9fa;
          padding: 0.6rem;
          border-radius: 8px;
          font-size: 0.8rem;
          color: #495057;
          margin-top: 0.8rem;
        }

        .online-action-buttons {
          display: flex;
          gap: 0.6rem;
          margin-top: 1rem;
        }

        .online-btn-add-cart {
          flex: 1;
          padding: 0.65rem 1rem;
          border: 2px solid rgb(42, 101, 197);
          background: white;
          color: rgb(42, 101, 197);
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          position: relative;
          min-height: 42px;
        }

        .online-btn-add-cart:hover:not(:disabled) {
          background: rgb(42, 101, 197);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(42, 101, 197, 0.3);
        }

        .online-btn-add-cart:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .online-btn-buy-now {
          flex: 1;
          padding: 0.65rem 1rem;
          border: none;
          background: linear-gradient(316deg, rgb(42, 101, 197), rgb(10, 80, 177));
          color: white;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }

        .online-btn-buy-now:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(42, 101, 197, 0.4);
        }

        .online-spinner {
          border: 4px solid rgba(42, 101, 197, 0.2);
          border-left-color: rgb(42, 101, 197);
          border-radius: 50%;
          width: 3rem;
          height: 3rem;
          animation: online-spin 1s linear infinite;
          margin: 0 auto;
        }

        .online-btn-spinner {
          border: 2px solid rgba(42, 101, 197, 0.2);
          border-left-color: rgb(42, 101, 197);
          border-radius: 50%;
          width: 16px;
          height: 16px;
          animation: online-spin 1s linear infinite;
        }

        @keyframes online-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .online-no-products {
          text-align: center;
          padding: 4rem 2rem;
          color: #7f8c8d;
        }

        .online-no-products-icon {
          opacity: 0.3;
          margin-bottom: 1rem;
        }

        .online-alert-custom {
          background: #fee;
          border: 2px solid #fcc;
          color: #c33;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          margin-bottom: 2rem;
        }

        .online-login-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(5px);
        }

        .online-login-popup {
          background: white;
          padding: 2.5rem;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 450px;
          width: 90%;
          text-align: center;
        }

        .online-login-popup h3 {
          color: rgb(42, 101, 197);
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .online-login-popup p {
          color: #7f8c8d;
          font-size: 1rem;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .online-popup-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }

        .online-popup-login-btn {
          flex: 1;
          padding: 0.85rem 1.5rem;
          border: none;
          background: linear-gradient(316deg, rgb(42, 101, 197), rgb(10, 80, 177));
          color: white;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .online-popup-login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(42, 101, 197, 0.4);
        }

        .online-popup-cancel-btn {
          flex: 1;
          padding: 0.85rem 1.5rem;
          border: 2px solid #e0e0e0;
          background: white;
          color: #7f8c8d;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .online-popup-cancel-btn:hover {
          background: #f8f9fa;
          border-color: #d0d0d0;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .online-search-section {
            padding: 1.5rem;
            margin-top: 1rem;
          }

          .online-final-price {
            font-size: 1.5rem;
          }

          .online-product-title {
            font-size: 1.2rem;
          }

          .online-action-buttons {
            flex-direction: column;
          }

          .online-login-popup {
            padding: 2rem;
          }

          .online-popup-buttons {
            flex-direction: column;
          }
        }

        /* Additional margin for very small screens */
        @media (max-width: 480px) {
          .online-search-section {
            margin-top: 0.5rem;
            padding: 1rem;
          }
        }
      `}</style>

      <div className="online-wrapper">
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

        {/* Header2 Component - Replaces custom header */}
        <Header2 />

        {/* Add a wrapper div with margin top to push content below header */}
        <div style={{ marginTop: "150px" }}>
          <div className="container">
            <div className="online-search-section">
              <div className="row g-3">
                <div className="col-12 col-md-8">
                  <div className="online-search-input-group">
                    <div className="online-search-icon">
                      <Search size={20} color="#7f8c8d" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by model name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="online-search-input"
                    />
                  </div>
                </div>
                <div className="col-12 col-md-4">
                  <div className="online-category-select-wrapper">
                    <label className="online-category-label">CATEGORIES</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="online-category-select"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                <div className="online-spinner"></div>
                <p style={{ marginTop: '1rem', color: '#7f8c8d' }}>Loading products...</p>
              </div>
            )}

            {error && (
              <div className="online-alert-custom">
                <strong>Error:</strong> {error}
              </div>
            )}

            {!loading && !error && filteredProducts.length === 0 && (
              <div className="online-no-products">
                <Package size={80} className="online-no-products-icon" />
                <h3>No Products Found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            )}

            {!loading && !error && filteredProducts.length > 0 && (
              <div className="row g-4 pb-5">
                {filteredProducts.map(product => {
                  const currentIndex = currentImageIndex[product.id] || 0;
                  const hasMultipleImages = product.images && product.images.length > 1;
                  const showPriceAtCheckout = !product.finalPrice || product.finalPrice === 0;
                  const isAddingToCart = addingToCart[product.id] || false;
                  
                  return (
                    <div key={product.id} className="col-12 col-sm-6 col-lg-4">
                      <div className="online-product-card" onClick={() => handleProductClick(product)}>
                        <div className="online-image-container">
                          <div className="online-product-image">
                            <img src={product.images[currentIndex]} alt={product.modelName} />
                          </div>
                          
                          {product.off > 0 && !showPriceAtCheckout && (
                            <div className="online-discount-badge">{product.off}% OFF</div>
                          )}

                          {hasMultipleImages && (
                            <>
                              <button className="online-image-nav-btn online-prev"
                                onClick={(e) => handlePrevImage(product.id, product.images.length, e)}>
                                <ChevronLeft size={20} color="#333" />
                              </button>
                              <button className="online-image-nav-btn online-next"
                                onClick={(e) => handleNextImage(product.id, product.images.length, e)}>
                                <ChevronRight size={20} color="#333" />
                              </button>
                              <div className="online-image-indicators">
                                {product.images.map((_, idx) => (
                                  <div key={idx}
                                    className={`online-image-indicator ${idx === currentIndex ? 'online-active' : ''}`} />
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        <div className="card-body p-3">
                          <div className="online-category-badge">
                            <Tag size={12} />
                            <span>{product.category}</span>
                          </div>
                          <h3 className="online-product-title">{product.modelName}</h3>
                          <p className="online-product-description">{product.description}</p>
                          
                          {showPriceAtCheckout ? (
                            <div className="online-price-on-checkout">
                              <div className="online-price-on-checkout-title">💰 Custom Pricing</div>
                              <p className="online-price-on-checkout-text">
                                Price will be decided at checkout based on your requirements
                              </p>
                            </div>
                          ) : (
                            <div className="online-price-section">
                              <span className="online-final-price">₹{product.finalPrice}</span>
                              {product.off > 0 && (
                                <span className="online-original-price">₹{product.price}</span>
                              )}
                            </div>
                          )}

                          {product.customizeQuestion && (
                            <div className="online-customize-box">
                              <strong>Customizable:</strong> {product.customizeQuestion}
                            </div>
                          )}

                          <div className="online-action-buttons">
                            <button 
                              className="online-btn-add-cart" 
                              onClick={(e) => handleAddToCart(product, e)}
                              disabled={isAddingToCart}
                            >
                              {isAddingToCart ? (
                                <>
                                  <div className="online-btn-spinner"></div>
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <ShoppingCart size={16} /> Add to Cart
                                </>
                              )}
                            </button>
                            <button className="online-btn-buy-now" onClick={(e) => handleBuyNow(product, e)}>
                              <Zap size={16} /> Buy Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {showLoginPopup && (
          <div className="online-login-popup-overlay">
            <div className="online-login-popup">
              <h3>Please Login to Continue</h3>
              <p>You must be logged in to add items to your cart or make a purchase.</p>
              <div className="online-popup-buttons">
                <button className="online-popup-login-btn" onClick={handleLoginRedirect}>
                  Go to Login
                </button>
                <button className="online-popup-cancel-btn" onClick={() => setShowLoginPopup(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}