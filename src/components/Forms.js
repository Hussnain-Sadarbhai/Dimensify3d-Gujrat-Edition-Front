import React, { useState } from "react";
import logo from "../images/logo-1.png";
import logo2 from "../images/log.gif";
import "./Forms.css";
import Footer from "./Footer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import API_BASE_URL from "./apiConfig";
const Form = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    eligibleDay: "Monday-Friday",
    eligibleTimeFrom: "",
    eligibleTimeTo: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/api/form-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Form submitted successfully!");
        setFormData({
          name: "",
          email: "",
          phone: "",
          eligibleDay: "Monday-Friday",
          eligibleTimeFrom: "",
          eligibleTimeTo: "",
        });
      } else {
        toast.error("Failed to submit form: " + result.message);
      }
    } catch (err) {
      toast.error("Error submitting form. Please try again.");
      console.error("Form submission error:", err);
    }
  };

  return (
    <div className="body1">
      <header className="main">
        <div className="container">
          <div className="header-row">
            {/* Logo and Brand */}
            <div className="brand-container">
              <div className="logo-wrapper">
                <img src={logo} alt="Dimensify3D Logo" className="brand-logo" />
              </div>
              <div>
                <h1 className="brand-text">Dimensify3D</h1>
                <p className="brand-subtitle">3D Printing Solutions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <div className="flex1">
          <img src={logo2} alt="Dimensify3D Logo" className="brand-logo2" />
        </div>

        <div className="flex2">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter your name"
            className="login-input"
          />

          <label htmlFor="email" style={{ marginTop: "1rem" }}>
            Email:
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="Enter your email"
            className="login-input"
          />

          <label htmlFor="phone" style={{ marginTop: "1rem" }}>
            Phone Number:
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="Enter your phone number"
            className="login-input"
          />

          <label htmlFor="eligibleDay" style={{ marginTop: "1rem" }}>
            Preferred Days to Contact you:
          </label>
          <select
            id="eligibleDay"
            name="eligibleDay"
            value={formData.eligibleDay}
            onChange={handleChange}
            className="login-input"
            required
          >
            <option value="Monday-Friday">Monday to Friday</option>
            <option value="Monday-Saturday">Monday to Saturday</option>
            <option value="Weekends">Weekends</option>
            <option value="Any">Any day</option>
          </select>
<br></br>
          <label htmlFor="eligibleTimeFrom" style={{ marginTop: "1rem" }}>
           Preferred Timings to Contact you<br></br>
           From:
          </label>
          <input
            type="time"
            id="eligibleTimeFrom"
            name="eligibleTimeFrom"
            value={formData.eligibleTimeFrom}
            onChange={handleChange}
            className="login-input"
            required
          />

          <label htmlFor="eligibleTimeTo" style={{ marginTop: "1rem" }}>
           To:
          </label>
          <input
            type="time"
            id="eligibleTimeTo"
            name="eligibleTimeTo"
            value={formData.eligibleTimeTo}
            onChange={handleChange}
            className="login-input"
            required
          />

          <button
            type="submit"
            className="login-button"
            style={{ marginTop: "1.5rem" }}
          >
            Submit
          </button>
        </div>
      </form>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      <Footer />
    </div>
  );
};

export default Form;
