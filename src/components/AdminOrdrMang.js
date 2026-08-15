import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from './apiConfig';

export default function AdminOrderMang() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [responsibility, setResponsibility] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterResponsibility, setFilterResponsibility] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);

  // Status options
  const statusOptions = [
    'queue',
    'designing',
    'rfp',
    'printing',
    'post-processing',
    'completed',
    'delivered'
  ];

  // Get unique responsibilities from orders
  const getUniqueResponsibilities = () => {
    const responsibilities = orders
      .map(order => order.responsibility)
      .filter(resp => resp && resp.trim() !== '');
    return [...new Set(responsibilities)];
  };

  // Fetch all orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // Scroll to form when editing
  useEffect(() => {
    if (editingId && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingId]);

  // Fetch orders from API
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/orders`);
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Add new order
  const addOrder = async () => {
    if (!productName.trim() || !quantity.trim() || parseInt(quantity) <= 0 || !responsibility.trim()) {
      alert('Please enter valid product name, quantity, and responsibility');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/admin/orders`, {
        productName: productName.trim(),
        quantity: parseInt(quantity),
        responsibility: responsibility.trim(),
        status: 'queue'
      });

      if (response.data.success) {
        setOrders([response.data.data, ...orders]);
        setProductName('');
        setQuantity('');
        setResponsibility('');
        alert('Order added successfully!');
      }
    } catch (error) {
      console.error('Error adding order:', error);
      alert('Failed to add order');
    } finally {
      setLoading(false);
    }
  };

  // Update order status
  const updateStatus = async (id, newStatus) => {
    setLoading(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/admin/orders/${id}/status`, {
        status: newStatus,
      });

      if (response.data.success) {
        setOrders(orders.map(order => 
          order.id === id ? { ...order, status: newStatus } : order
        ));
        // If current tab is 'all' and status changed to 'delivered', stay on 'all' tab
        // The filter will automatically hide delivered orders from 'all' tab
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  // Toggle priority
  const togglePriority = async (id) => {
    setLoading(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/admin/orders/${id}/priority`);

      if (response.data.success) {
        setOrders(orders.map(order => 
          order.id === id ? { ...order, priority: response.data.data.priority } : order
        ));
      }
    } catch (error) {
      console.error('Error toggling priority:', error);
      alert('Failed to toggle priority');
    } finally {
      setLoading(false);
    }
  };

  // Delete order
  const deleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    setLoading(true);
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/admin/orders/${id}`);

      if (response.data.success) {
        setOrders(orders.filter(order => order.id !== id));
        alert('Order deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    } finally {
      setLoading(false);
    }
  };

  // Edit order
  const startEdit = (order) => {
    setEditingId(order.id);
    setProductName(order.productName);
    setQuantity(order.quantity.toString());
    setResponsibility(order.responsibility || '');
  };

  const saveEdit = async (id) => {
    if (!productName.trim() || !quantity.trim() || parseInt(quantity) <= 0 || !responsibility.trim()) {
      alert('Please enter valid product name, quantity, and responsibility');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/admin/orders/${id}`, {
        productName: productName.trim(),
        quantity: parseInt(quantity),
        responsibility: responsibility.trim(),
      });

      if (response.data.success) {
        setOrders(orders.map(order => 
          order.id === id ? { 
            ...order, 
            productName: productName.trim(), 
            quantity: parseInt(quantity),
            responsibility: responsibility.trim()
          } : order
        ));
        setEditingId(null);
        setProductName('');
        setQuantity('');
        setResponsibility('');
        alert('Order updated successfully!');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setProductName('');
    setQuantity('');
    setResponsibility('');
  };

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      // If 'all' tab is active, exclude delivered orders
      if (activeTab === 'all' && order.status === 'delivered') {
        return false;
      }
      
      const matchesSearch = order.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = filterDate ? new Date(order.createdAt).toDateString() === new Date(filterDate).toDateString() : true;
      const matchesResponsibility = filterResponsibility ? order.responsibility === filterResponsibility : true;
      const matchesTab = activeTab === 'all' ? true : order.status === activeTab;
      
      return matchesSearch && matchesDate && matchesResponsibility && matchesTab;
    })
    .sort((a, b) => {
      // Priority orders first
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      
      // Then sort by oldest first (createdAt ascending)
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA - dateB;
    });

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status label
  const getStatusLabel = (status) => {
    const labels = {
      queue: 'Queue',
      designing: 'Designing',
      rfp: 'RFP',
      printing: 'Printing',
      'post-processing': 'Post Processing',
      completed: 'Completed',
      delivered: 'Delivered'
    };
    return labels[status] || status;
  };

  // Get count for each status (excluding delivered from 'all' count)
  const getStatusCount = (status) => {
    if (status === 'all') {
      return orders.filter(order => order.status !== 'delivered').length;
    }
    return orders.filter(order => order.status === status).length;
  };

  // Inline styles
  const styles = {
    container: {
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      padding: '20px',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh',
    },
    mainContainer: {
      maxWidth: '100%',
      margin: '0 auto',
      background: 'white',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
    },
    title: {
      fontSize: '2.5rem',
      color: '#2c3e50',
      marginBottom: '30px',
      paddingBottom: '15px',
      borderBottom: '4px solid #3498db',
      display: 'inline-block',
      fontWeight: 700,
    },
    loadingOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      color: 'white',
      fontSize: '1.5rem',
    },
    controls: {
      display: 'flex',
      gap: '20px',
      marginBottom: '30px',
      flexWrap: 'wrap',
      alignItems: 'center',
      background: '#f8f9fa',
      padding: '20px',
      borderRadius: '12px',
    },
    search: {
      flex: 2,
      minWidth: '250px',
    },
    searchInput: {
      width: '100%',
      padding: '12px 20px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '1rem',
      transition: 'all 0.3s ease',
      background: 'white',
      outline: 'none',
    },
    filterGroup: {
      display: 'flex',
      gap: '15px',
      alignItems: 'center',
      flexWrap: 'wrap',
      flex: 3,
    },
    dateInput: {
      padding: '12px 15px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '1rem',
      background: 'white',
      transition: 'all 0.3s ease',
      outline: 'none',
    },
    responsibilityFilter: {
      padding: '12px 15px',
      border: '2px solid #e0e0e0',
      borderRadius: '8px',
      fontSize: '1rem',
      background: 'white',
      transition: 'all 0.3s ease',
      outline: 'none',
      minWidth: '150px',
      cursor: 'pointer',
    },
    clearFilter: {
      padding: '10px 20px',
      background: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.95rem',
      transition: 'all 0.3s ease',
      fontWeight: 600,
    },
    formCard: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '25px',
      borderRadius: '12px',
      marginBottom: '30px',
      boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
    },
    formTitle: {
      color: 'white',
      fontSize: '1.3rem',
      marginBottom: '20px',
      fontWeight: 600,
    },
    formGroup: {
      display: 'flex',
      gap: '15px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    formInput: {
      flex: 1,
      minWidth: '180px',
      padding: '12px 18px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      background: 'rgba(255, 255, 255, 0.95)',
      transition: 'all 0.3s ease',
      outline: 'none',
    },
    quantityInput: {
      flex: 0.4,
      minWidth: '100px',
      padding: '12px 18px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      background: 'rgba(255, 255, 255, 0.95)',
      transition: 'all 0.3s ease',
      outline: 'none',
    },
    responsibilityInput: {
      flex: 0.6,
      minWidth: '150px',
      padding: '12px 18px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      background: 'rgba(255, 255, 255, 0.95)',
      transition: 'all 0.3s ease',
      outline: 'none',
    },
    formActions: {
      display: 'flex',
      gap: '10px',
      flex: 1,
    },
    btn: {
      padding: '12px 30px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      color: 'white',
    },
    btnAdd: {
      background: '#27ae60',
      boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
    },
    btnSave: {
      background: '#f39c12',
      boxShadow: '0 4px 15px rgba(243, 156, 18, 0.3)',
    },
    btnCancel: {
      background: '#e74c3c',
      boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)',
    },
    tabsContainer: {
      display: 'flex',
      gap: '10px',
      marginBottom: '25px',
      flexWrap: 'wrap',
      borderBottom: '2px solid #e8ecf1',
      paddingBottom: '15px',
    },
    tab: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.9rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      background: '#f8f9fa',
      color: '#7f8c8d',
    },
    tabActive: {
      background: '#3498db',
      color: 'white',
      boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
    },
    tabCount: {
      display: 'inline-block',
      background: 'rgba(0,0,0,0.1)',
      padding: '1px 8px',
      borderRadius: '12px',
      marginLeft: '6px',
      fontSize: '0.75rem',
    },
    ordersSection: {
      marginTop: '10px',
    },
    ordersTitle: {
      fontSize: '1.5rem',
      color: '#2c3e50',
      marginBottom: '20px',
      fontWeight: 600,
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      background: '#f8f9fa',
      borderRadius: '12px',
      color: '#7f8c8d',
    },
    emptyStateP: {
      fontSize: '1.5rem',
      marginBottom: '10px',
      fontWeight: 600,
    },
    emptyStateSpan: {
      fontSize: '1rem',
      color: '#95a5a6',
    },
    ordersGrid: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    orderCard: {
      background: 'white',
      borderRadius: '10px',
      padding: '12px 20px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
      transition: 'all 0.3s ease',
      border: '1px solid #e8ecf1',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '10px',
      minHeight: '60px',
    },
    orderCardPriority: {
      borderLeft: '4px solid #e74c3c',
      background: '#fff5f5',
    },
    orderInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
      flex: 1,
    },
    orderName: {
      fontSize: '1.1rem',
      color: '#2c3e50',
      margin: 0,
      fontWeight: 600,
    },
    orderQuantity: {
      background: '#3498db',
      color: 'white',
      padding: '2px 12px',
      borderRadius: '20px',
      fontSize: '0.85rem',
      fontWeight: 600,
    },
    orderResponsibility: {
      background: '#ecf0f1',
      color: '#2c3e50',
      padding: '2px 12px',
      borderRadius: '20px',
      fontSize: '0.85rem',
      fontWeight: 500,
    },
    orderPriorityBadge: {
      background: '#e74c3c',
      color: 'white',
      padding: '2px 10px',
      borderRadius: '20px',
      fontSize: '0.7rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    orderDate: {
      fontSize: '0.8rem',
      color: '#7f8c8d',
      whiteSpace: 'nowrap',
    },
    orderActions: {
      display: 'flex',
      gap: '6px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    actionBtn: {
      background: 'transparent',
      border: 'none',
      fontSize: '1rem',
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: '6px',
      transition: 'all 0.2s ease',
    },
    priorityBtn: {
      background: '#e74c3c',
      color: 'white',
      border: 'none',
      padding: '4px 12px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      whiteSpace: 'nowrap',
    },
    priorityBtnActive: {
      background: '#27ae60',
    },
    statusBadge: {
      display: 'inline-block',
      padding: '3px 12px',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
    },
    statusQueue: {
      background: '#95a5a6',
      color: 'white',
    },
    statusDesigning: {
      background: '#3498db',
      color: 'white',
    },
    statusRfp: {
      background: '#9b59b6',
      color: 'white',
    },
    statusPrinting: {
      background: '#e67e22',
      color: 'white',
    },
    statusPostProcessing: {
      background: '#1abc9c',
      color: 'white',
    },
    statusCompleted: {
      background: '#27ae60',
      color: 'white',
    },
    statusDelivered: {
      background: '#2c3e50',
      color: 'white',
    },
    statusSelect: {
      padding: '4px 8px',
      border: '2px solid #e0e0e0',
      borderRadius: '6px',
      fontSize: '0.75rem',
      background: 'white',
      cursor: 'pointer',
      outline: 'none',
      fontWeight: 500,
    },
  };

  return (
    <div style={styles.container}>
      {loading && (
        <div style={styles.loadingOverlay}>
          <div>⏳ Loading...</div>
        </div>
      )}
      
      <div style={styles.mainContainer}>
        <h1 style={styles.title}>📦 Order Management</h1>

        {/* Search and Filter Bar */}
        <div style={styles.controls}>
          <div style={styles.search}>
            <input
              type="text"
              placeholder="🔍 Search by product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <div style={styles.filterGroup}>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={styles.dateInput}
            />
            <select
              value={filterResponsibility}
              onChange={(e) => setFilterResponsibility(e.target.value)}
              style={styles.responsibilityFilter}
            >
              <option value="">All Responsibilities</option>
              {getUniqueResponsibilities().map(resp => (
                <option key={resp} value={resp}>
                  👤 {resp}
                </option>
              ))}
            </select>
            {(filterDate || filterResponsibility) && (
              <button 
                onClick={() => {
                  setFilterDate('');
                  setFilterResponsibility('');
                }} 
                style={styles.clearFilter}
              >
                ✕ Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Add Order Form */}
        <div ref={formRef} style={styles.formCard}>
          <h3 style={styles.formTitle}>
            {editingId ? '✏️ Edit Order' : '➕ Add New Order'}
          </h3>
          <div style={styles.formGroup}>
            <input
              type="text"
              placeholder="Product Name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              style={styles.formInput}
            />
            <input
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={styles.quantityInput}
              min="1"
            />
            <input
              type="text"
              placeholder="Responsibility (e.g., John)"
              value={responsibility}
              onChange={(e) => setResponsibility(e.target.value)}
              style={styles.responsibilityInput}
            />
            {editingId ? (
              <div style={styles.formActions}>
                <button 
                  onClick={() => saveEdit(editingId)} 
                  style={{...styles.btn, ...styles.btnSave}}
                  disabled={loading}
                >
                  💾 Save Changes
                </button>
                <button 
                  onClick={cancelEdit} 
                  style={{...styles.btn, ...styles.btnCancel}}
                  disabled={loading}
                >
                  ❌ Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={addOrder} 
                style={{...styles.btn, ...styles.btnAdd}}
                disabled={loading}
              >
                ➕ Add Order
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          {['all', ...statusOptions].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {})
              }}
            >
              {tab === 'all' ? '📋 All' : getStatusLabel(tab)}
              <span style={styles.tabCount}>{getStatusCount(tab)}</span>
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div style={styles.ordersSection}>
          <h3 style={styles.ordersTitle}>
            📋 Orders ({filteredOrders.length})
          </h3>
          {filteredOrders.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyStateP}>No orders found</p>
              <span style={styles.emptyStateSpan}>Add your first order above</span>
            </div>
          ) : (
            <div style={styles.ordersGrid}>
              {filteredOrders.map((order) => (
                <div 
                  key={order.id} 
                  style={{
                    ...styles.orderCard,
                    ...(order.priority ? styles.orderCardPriority : {})
                  }}
                >
                  <div style={styles.orderInfo}>
                    <h4 style={styles.orderName}>{order.productName}</h4>
                    <span style={styles.orderQuantity}>×{order.quantity}</span>
                    {order.responsibility && (
                      <span style={styles.orderResponsibility}>👤 {order.responsibility}</span>
                    )}
                    {order.priority && (
                      <span style={styles.orderPriorityBadge}>⭐ Priority</span>
                    )}
                    <span style={styles.orderDate}>
                      📅 {formatDate(order.createdAt)}
                    </span>
                    <span 
                      style={{
                        ...styles.statusBadge,
                        ...(order.status === 'queue' ? styles.statusQueue : 
                           order.status === 'designing' ? styles.statusDesigning :
                           order.status === 'rfp' ? styles.statusRfp :
                           order.status === 'printing' ? styles.statusPrinting :
                           order.status === 'post-processing' ? styles.statusPostProcessing :
                           order.status === 'completed' ? styles.statusCompleted :
                           styles.statusDelivered)
                      }}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div style={styles.orderActions}>
                    <button 
                      onClick={() => togglePriority(order.id)}
                      style={{
                        ...styles.priorityBtn,
                        ...(order.priority ? styles.priorityBtnActive : {})
                      }}
                      disabled={loading}
                    >
                      {order.priority ? '⭐ Prioritize' : '📌 Prioritize'}
                    </button>
                    
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      style={styles.statusSelect}
                      disabled={loading}
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {getStatusLabel(status)}
                        </option>
                      ))}
                    </select>

                    <button 
                      onClick={() => startEdit(order)} 
                      style={styles.actionBtn}
                      title="Edit"
                      disabled={loading}
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => deleteOrder(order.id)} 
                      style={styles.actionBtn}
                      title="Delete"
                      disabled={loading}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}