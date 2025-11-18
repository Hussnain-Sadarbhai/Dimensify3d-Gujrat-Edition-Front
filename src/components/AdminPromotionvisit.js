import React, { useEffect, useState } from "react";
import API_BASE_URL from "./apiConfig";
const AdminClickCounts = () => {
  const [counts, setCounts] = useState({
    pageViews: null,
    websiteClicks: null,
    quotationClicks: null,
  });

  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/pageview/count`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/api/pageview/clickCounts`).then((res) => res.json()),
      fetch(`${API_BASE_URL}/api/form-submissions`).then((res) => res.json()),
    ])
      .then(([pageViewData, clickCountData, formsData]) => {
        if (pageViewData.success && clickCountData.success) {
          setCounts({
            pageViews: pageViewData.count ?? 0,
            websiteClicks: clickCountData.websiteCount ?? 0,
            quotationClicks: clickCountData.quoteCount ?? 0,
          });
        } else {
          setCounts({ pageViews: 0, websiteClicks: 0, quotationClicks: 0 });
        }

        if (formsData.success) {
          setForms(formsData.forms ?? {});
        } else {
          setForms({});
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching admin data:", err);
        setCounts({ pageViews: 0, websiteClicks: 0, quotationClicks: 0 });
        setForms({});
        setLoading(false);
      });
  }, []);

  const styles = {
    container: {
      maxWidth: "90vw",
      margin: "2rem auto",
      display: "flex",
      gap: "2rem",
      fontFamily: "Segoe UI, Tahoma, Geneva, Verdana, sans-serif",
      color: "#374151",
    },
    section: {
      flex: 1,
      backgroundColor: "#f9fafb",
      borderRadius: 12,
      boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
      padding: 20,
      overflowY: "auto",
      maxHeight: "70vh",
    },
    heading: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 15,
      color: "#374151",
    },
    countItem: {
      fontSize: 18,
      color: "#2563eb",
      marginBottom: 10,
    },
    formList: {
      listStyleType: "none",
      padding: 0,
      margin: 0,
      maxHeight: "60vh",
      overflowY: "auto",
    },
    formItem: {
      backgroundColor: "#fff",
      borderRadius: 8,
      padding: 15,
      marginBottom: 10,
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      fontSize: 14,
      lineHeight: "1.4",
    },
    label: {
      fontWeight: "600",
    },
  };

  if (loading)
    return (
      <p style={{ color: "#9ca3af", textAlign: "center" }}>
        Loading admin data...
      </p>
    );

  return (
    <div style={styles.container}>
      {/* Click Counts Section */}
      <div style={styles.section}>
        <h2 style={styles.heading}>Admin Page Visit and Click Counts</h2>
        <p style={styles.countItem}>Promotion Page Views: {counts.pageViews}</p>
        <p style={styles.countItem}>Website Clicks: {counts.websiteClicks}</p>
        <p style={styles.countItem}>
          Quotation Clicks: {counts.quotationClicks}
        </p>
      </div>

      {/* Form Submissions Section */}
      <div style={styles.section}>
        <h2 style={styles.heading}>Form Submissions</h2>
        {Object.keys(forms).length === 0 ? (
          <p>No form submissions yet.</p>
        ) : (
          <ul style={styles.formList}>
            {Object.entries(forms).map(([key, form]) => (
              <li key={key} style={styles.formItem}>
                <p>
                  <span style={styles.label}>Name:</span> {form.name}
                </p>
                <p>
                  <span style={styles.label}>Email:</span> {form.email}
                </p>
                <p>
                  <span style={styles.label}>Phone:</span> {form.phone}
                </p>
                <p>
                  <span style={styles.label}>Eligible Days:</span>{" "}
                  {form.eligibleDay}
                </p>
                <p>
                  <span style={styles.label}>Eligible Time From:</span>{" "}
                  {form.eligibleTimeFrom}
                </p>
                <p>
                  <span style={styles.label}>Eligible Time To:</span>{" "}
                  {form.eligibleTimeTo}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminClickCounts;
