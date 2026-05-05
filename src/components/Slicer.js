import React, { useState, useRef, useEffect } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import * as THREE from "three";
import { CuraWASM } from "cura-wasm";
import { resolveDefinition } from "cura-wasm-definitions";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Badge,
  Alert,
  ProgressBar,
  Modal,
  Collapse,
  Spinner,
} from "react-bootstrap";
import Header from "./Header";
import "./slicer.css";
import API_BASE_URL from "./apiConfig";
import { useNavigate } from "react-router-dom";
import { openDB } from "idb";
import Footer from "./Footer";

// Initialize IndexedDB
const initDB = async () => {
  return await openDB("dimensify-stl-db", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("checkout-files")) {
        db.createObjectStore("checkout-files", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
};

// Maximum allowed dimensions (in mm)
const MAX_DIMENSIONS = {
  width: 256,
  height: 256,
  depth: 256,
};

// STL Model Viewer Component
const STLModel = ({ file, position, rotation, onDimensionsLoad }) => {
  const geometry = useLoader(STLLoader, file);
  geometry.computeBoundingBox();

  // Get dimensions
  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);

  // Pass dimensions to parent component
  React.useEffect(() => {
    if (onDimensionsLoad) {
      onDimensionsLoad({
        width: size.x.toFixed(2),
        height: size.z.toFixed(2), // Z is height in 3D space
        depth: size.y.toFixed(2),
      });
    }
  }, [size.x, size.y, size.z, onDimensionsLoad]);

  // Center the model (X/Y in middle of plate, Z so bottom touches plate)
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  geometry.translate(-center.x, -center.y, -geometry.boundingBox.min.z);

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={[
        rotation[0] - Math.PI / 2, // upright orientation
        rotation[1],
        rotation[2],
      ]}
    >
      <meshStandardMaterial color="#2a65c5" />
    </mesh>
  );
};

// Helper to build overrides with correct format
function buildOverrides(user) {
  const overrides = [
    { scope: undefined, key: "speed_print", value: 80 },
    { scope: undefined, key: "material_bed_temperature", value: 70 },
    { scope: undefined, key: "material_print_temperature", value: 210 },
  ];

  if (user.layerHeight && user.layerHeight !== 0.15) {
    overrides.push({
      scope: undefined,
      key: "layer_height",
      value: user.layerHeight,
    });
    overrides.push({
      scope: undefined,
      key: "initial_layer_height",
      value: user.layerHeight * 1.5,
    });
  } else if (user.layerHeight === 0.15) {
    overrides.push({ scope: undefined, key: "layer_height", value: 0.15 });
    overrides.push({
      scope: undefined,
      key: "initial_layer_height",
      value: 0.2,
    });
  }

  if (user.infillDensity !== undefined && user.infillDensity !== null) {
    overrides.push({
      scope: undefined,
      key: "infill_sparse_density",
      value: user.infillDensity,
    });
  } else {
    overrides.push({
      scope: undefined,
      key: "infill_sparse_density",
      value: 20,
    });
  }

  if (user.infillPattern) {
    overrides.push({
      scope: undefined,
      key: "infill_pattern",
      value: user.infillPattern,
    });
  }

  if (user.supportEnable !== undefined) {
    overrides.push({
      scope: undefined,
      key: "support_enable",
      value: user.supportEnable,
    });
    if (user.supportEnable) {
      overrides.push({
        scope: undefined,
        key: "support_type",
        value: "buildplate",
      });
      overrides.push({ scope: undefined, key: "support_angle", value: 50 });
      overrides.push({
        scope: undefined,
        key: "support_infill_rate",
        value: 15,
      });
    }
  }

  if (user.materialType) {
    switch (user.materialType.toLowerCase()) {
      case "pla":
        overrides.push({
          scope: undefined,
          key: "material_print_temperature",
          value: 210,
        });
        overrides.push({
          scope: undefined,
          key: "material_bed_temperature",
          value: 60,
        });
        overrides.push({
          scope: undefined,
          key: "retraction_amount",
          value: 6.5,
        });
        overrides.push({ scope: undefined, key: "speed_print", value: 80 });
        break;
      case "pla+":
        overrides.push({
          scope: undefined,
          key: "material_print_temperature",
          value: 220,
        });
        overrides.push({
          scope: undefined,
          key: "material_bed_temperature",
          value: 70,
        });
        overrides.push({
          scope: undefined,
          key: "retraction_amount",
          value: 6.5,
        });
        overrides.push({ scope: undefined, key: "speed_print", value: 75 });
        break;
      case "abs":
        overrides.push({
          scope: undefined,
          key: "material_print_temperature",
          value: 250,
        });
        overrides.push({
          scope: undefined,
          key: "material_bed_temperature",
          value: 100,
        });
        overrides.push({
          scope: undefined,
          key: "retraction_amount",
          value: 4.5,
        });
        overrides.push({ scope: undefined, key: "speed_print", value: 70 });
        break;
      default:
        break;
    }
  }

  if (user.materialColor) {
    overrides.push({
      scope: undefined,
      key: "material_colour",
      value: user.materialColor,
    });
  }

  overrides.push({ scope: undefined, key: "retraction_enable", value: true });
  overrides.push({ scope: undefined, key: "wall_line_count", value: 3 });
  overrides.push({ scope: undefined, key: "top_layers", value: 4 });
  overrides.push({ scope: undefined, key: "bottom_layers", value: 3 });
  overrides.push({ scope: undefined, key: "adhesion_type", value: "skirt" });

  return overrides;
}

const STLSlicer = () => {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [stlDimensions, setStlDimensions] = useState(null);
  const [dimensionsValid, setDimensionsValid] = useState(true);
  const [printInfo, setPrintInfo] = useState(null);
  const [error, setError] = useState("");
  const [isSlicing, setIsSlicing] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // NEW: Loading states for buttons
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Model state for viewer
  const [modelPosition, setModelPosition] = useState([0, 0, 0]);
  const [modelRotation, setModelRotation] = useState([0, 0, 0]);

  // Simplified user settings focusing on the 6 main parameters
  const [userSettings, setUserSettings] = useState({
    layerHeight: 0.15,
    infillDensity: 20,
    infillPattern: "grid",
    supportEnable: false,
    materialType: "pla",
    materialColor: "blue",
  });

  // Moved quantity and special notes states to top level
  const [quantity, setQuantity] = useState(1);
  const [specialNotes, setSpecialNotes] = useState("");

  // Coupon states
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [allCoupons, setAllCoupons] = useState([]); // Store all coupons for validation
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // Multiple STL files state - CHANGED: Only store file metadata, not actual file data
  const [stlFiles, setStlFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  // Checkout data state - NEW: Store all data for checkout
  const [checkoutData, setCheckoutData] = useState(null);

  // Create refs for scrolling
  const pricingSectionRef = useRef(null);
  const placeOrderRef = useRef(null);
  const fileInputRef = useRef(null);

  // Layer height options
  const layerHeightOptions = [
    { value: 0.06, label: "Extra Fine (0.06mm)" },
    { value: 0.1, label: "Fine (0.1mm)" },
    { value: 0.15, label: "Normal (0.15mm)" },
    { value: 0.2, label: "Fast (0.2mm)" },
    { value: 0.3, label: "Very Fast (0.3mm)" },
  ];

  // Material type options with auto-color assignment
  const materialOptions = [
    { value: "pla", label: "PLA", color: "blue" },
    { value: "pla+", label: "PLA+", color: "grey" },
    { value: "abs", label: "ABS", color: "yellow" },
  ];

  // Infill percentage options
  const infillOptions = [20, 40, 60, 80, 100];

  // Fetch available coupons when component mounts
  useEffect(() => {
    fetchAvailableCoupons();
  }, []);

  // CHANGED: Load only file metadata from localStorage (not actual files)
  useEffect(() => {
    const savedStlFiles = localStorage.getItem("stlFiles");
    if (savedStlFiles) {
      try {
        const parsedFiles = JSON.parse(savedStlFiles);
        // Only store metadata, not actual file data
        const fileMetadata = parsedFiles.map((fileData) => ({
          name: fileData.file?.name,
          size: fileData.file?.size,
          quantity: fileData.quantity,
          printSettings: fileData.printSettings,
          pricing: fileData.pricing,
          dimensions: fileData.dimensions,
          specialNotes: fileData.specialNotes,
          unitPrice: fileData.unitPrice,
          totalPrice: fileData.totalPrice,
          timestamp: fileData.timestamp,
        }));
        setStlFiles(fileMetadata);
      } catch (error) {
        console.error("Error loading STL files from localStorage:", error);
      }
    }
  }, []);

  const loadFileFromStorage = (fileData) => {
    // This function is kept for compatibility but won't load actual files
    // since we don't store them in localStorage anymore
    console.log("File loading from storage not supported for large files");
  };

  const fetchAvailableCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const userPhone = localStorage.getItem("dimensify3duserphoneNo");
      if (!userPhone) {
        setLoadingCoupons(false);
        return;
      }

      // 1️⃣ Fetch all coupons
      const response = await fetch(`${API_BASE_URL}/api/coupons`);
      const data = await response.json();

      if (data.success && data.data) {
        // 2️⃣ Fetch user details (to know which coupons were already used)
        const userRes = await fetch(`${API_BASE_URL}/api/user-by-phone`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: userPhone }),
        });

        const userData = await userRes.json();
        let usedCoupons = [];

        if (userData.success && userData.data?.orders) {
          const orders = userData.data.orders;
          // Extract all appliedCoupon names from orders
          usedCoupons = Object.values(orders)
            .map((order) => order.appliedCoupon?.name)
            .filter(Boolean); // remove undefined/null
        }

        // 3️⃣ Filter only active, public coupons and not already used
        const activeCoupons = data.data.filter((coupon) => {
          const expiryDate = new Date(coupon.expiry);
          const today = new Date();

          return (
            expiryDate >= today && // not expired
            coupon.public !== false && // public coupons only
            !usedCoupons.includes(coupon.name) // not used by user
          );
        });

        setAvailableCoupons(activeCoupons);

        // 4️⃣ Keep all active coupons (public + private) for validation
        const allActiveCoupons = data.data.filter((coupon) => {
          const expiryDate = new Date(coupon.expiry);
          const today = new Date();
          return expiryDate >= today; // still active
        });
        setAllCoupons(allActiveCoupons);
      }
    } catch (error) {
      console.error("Error fetching coupons:", error);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const applyCoupon = async () => {
    setCouponError("");

    if (!couponInput.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    // Find the coupon in ALL available coupons (including private ones)
    const coupon = allCoupons.find(
      (c) => c.name.toLowerCase() === couponInput.toLowerCase(),
    );

    if (!coupon) {
      setCouponError("Invalid coupon code");
      return;
    }

    // Check if coupon is expired
    const expiryDate = new Date(coupon.expiry);
    const today = new Date();
    if (expiryDate < today) {
      setCouponError("This coupon has expired");
      return;
    }

    // Check if user has already used this coupon
    try {
      const userPhone = localStorage.getItem("dimensify3duserphoneNo");
      if (!userPhone) {
        setCouponError("Please login first to apply coupon");
        return;
      }

      const userRes = await fetch(`${API_BASE_URL}/api/user-by-phone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userPhone }),
      });

      const userData = await userRes.json();

      if (userData.success && userData.data?.orders) {
        const orders = userData.data.orders;
        const usedCoupons = Object.values(orders)
          .map((order) => order.appliedCoupon?.name)
          .filter(Boolean);

        if (usedCoupons.includes(coupon.name)) {
          setCouponError("You have already used this coupon before");
          return;
        }
      }
    } catch (error) {
      console.error("Error checking coupon usage:", error);
      setCouponError("Error validating coupon. Please try again.");
      return;
    }

    // Apply the coupon (works for both public and private coupons)
    setAppliedCoupon(coupon);
    setCouponInput("");
    setCouponError("");
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const copyCouponCode = (couponName) => {
    navigator.clipboard.writeText(couponName);
    // You could add a toast notification here
  };

  // Calculate subtotal for all files (before coupon)
  const calculateSubtotal = () => {
    let total = 0;

    // Add current file price if it exists
    if (printInfo) {
      total += printInfo.pricing.finalPrice * quantity;
    }

    // Add prices of all other files in storage
    stlFiles.forEach((fileData) => {
      if (fileData.pricing) {
        const filePrice = fileData.pricing.finalPrice * fileData.quantity;
        total += filePrice;
      }
    });

    return total;
  };

  // Calculate final price with coupon discount applied to grand total
  const calculateFinalPrice = () => {
    const subtotal = calculateSubtotal();

    if (appliedCoupon) {
      const discount = (subtotal * parseFloat(appliedCoupon.discount)) / 100;
      return Math.floor(subtotal - discount);
    }

    return subtotal;
  };

  // Calculate discount amount on grand total
  const getDiscountAmount = () => {
    if (!appliedCoupon) return 0;

    const subtotal = calculateSubtotal();
    const discount = (subtotal * parseFloat(appliedCoupon.discount)) / 100;
    return Math.floor(discount);
  };

  // Function to check if dimensions are within limits
  const validateDimensions = (dimensions) => {
    if (!dimensions) return true;

    const width = parseFloat(dimensions.width);
    const height = parseFloat(dimensions.height);
    const depth = parseFloat(dimensions.depth);

    return (
      width <= MAX_DIMENSIONS.width &&
      height <= MAX_DIMENSIONS.height &&
      depth <= MAX_DIMENSIONS.depth
    );
  };

  // Function to get filament correction factor
  const getFilamentCorrectionFactor = (
    materialType,
    infillDensity,
    supportEnable,
  ) => {
    const material = materialType.toLowerCase();

    if (supportEnable) {
      if (material === "pla" || material === "pla+") {
        return 0.64;
      } else if (material === "abs") {
        return 0.71;
      }
    } else {
      if (material === "pla" || material === "pla+") {
        switch (infillDensity) {
          case 20:
            return 1.62;
          case 40:
            return 1.0;
          case 60:
            return 0.72;
          case 80:
            return 0.56;
          case 100:
            return 0.49;
          default:
            return 1.0;
        }
      } else if (material === "abs") {
        switch (infillDensity) {
          case 20:
            return 1.5;
          case 40:
            return 0.96;
          case 60:
            return 0.69;
          case 80:
            return 0.54;
          case 100:
            return 0.47;
          default:
            return 1.0;
        }
      }
    }

    return 1.0;
  };

  const calculatePrice = (filamentGrams, estimatedTimeSeconds) => {
    console.log("=== 3D PRINT PRICING CALCULATION ===");

    const roundedFilamentGrams = Math.ceil(filamentGrams);
    console.log(`Original filament weight: ${filamentGrams}g`);
    console.log(`Rounded filament weight: ${roundedFilamentGrams}g`);

    const timeInHours = estimatedTimeSeconds / 3600;
    const roundedHours = Math.ceil(timeInHours);
    console.log(`Original time: ${timeInHours.toFixed(2)} hours`);
    console.log(`Rounded time: ${roundedHours} hours`);

    const filamentCost = roundedFilamentGrams * 1.5;
    const timeCost = roundedHours * 2;
    const packagingCost = 15;

    console.log(
      `Filament cost: ${filamentCost} Rs (${roundedFilamentGrams}g × 1 Rs/g)`,
    );
    console.log(`Time cost: ${timeCost} Rs (${roundedHours}h × 2 Rs/h)`);
    console.log(`Packaging cost: ${packagingCost} Rs (fixed)`);

    const subtotal = filamentCost + timeCost + packagingCost;
    console.log(`Subtotal: ${subtotal} Rs`);

    const humanEffortsCost = subtotal * 0.2;
    console.log(`Human efforts (10%): ${humanEffortsCost} Rs`);

    const totalBeforeProfit = subtotal + humanEffortsCost;
    console.log(`Total before profit: ${totalBeforeProfit} Rs`);

    const profitCost = subtotal * 0.5;
    console.log(`Profit (25% of base costs): ${profitCost} Rs`);

    const finalPrice = totalBeforeProfit + profitCost;
    console.log(`Final price: ${finalPrice} Rs`);
    console.log("=====================================");

    return {
      filamentCost,
      timeCost,
      packagingCost,
      humanEffortsCost,
      profitCost,
      finalPrice: Math.round(finalPrice),
      breakdown: {
        filamentGrams: roundedFilamentGrams,
        hours: roundedHours,
        subtotal,
        totalBeforeProfit,
        finalPrice: Math.round(finalPrice),
      },
    };
  };

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.name.toLowerCase().endsWith(".stl")) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);
      setPrintInfo(null);
      setError("");
      setStlDimensions(null);
      setDimensionsValid(true);
      setModelPosition([0, 0, 0]);
      setModelRotation([0, 0, 0]);
      // Reset coupon when new file is selected
      setAppliedCoupon(null);
      setCouponInput("");
      setCouponError("");
    } else {
      setError("Please select a valid STL file");
    }
  };

  const handleDimensionsLoad = (dimensions) => {
    setStlDimensions(dimensions);
    const isValid = validateDimensions(dimensions);
    setDimensionsValid(isValid);

    if (!isValid) {
      setError(
        "STL file dimensions exceed maximum allowed limits. Please resize your model or split it into smaller parts.",
      );
    } else {
      setError("");
    }
  };

  const handleSettingChange = (key, value) => {
    let newSettings = { ...userSettings, [key]: value };

    if (key === "materialType") {
      const selectedMaterial = materialOptions.find((m) => m.value === value);
      if (selectedMaterial) {
        newSettings.materialColor = selectedMaterial.color;
      }
    }

    setUserSettings(newSettings);
  };

  // Reset button handler
  const handleReset = () => {
    setModelPosition([0, 0, 0]);
    setModelRotation([0, 0, 0]);
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === "N/A") return "N/A";
    const numSeconds =
      typeof seconds === "string" ? parseFloat(seconds) : seconds;
    if (isNaN(numSeconds)) return "N/A";

    const hrs = Math.floor(numSeconds / 3600);
    const mins = Math.floor((numSeconds % 3600) / 60);
    const secs = Math.floor(numSeconds % 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // CHANGED: Save current file metadata to state (not localStorage)
  const handleAddAnotherSTL = async () => {
    if (!file || !printInfo) {
      setError(
        "Please complete the current file analysis before adding another STL file",
      );
      return;
    }

    try {
      setIsAddingFile(true);
      setError("Saving current file data...");

      // Scroll to top to show saving state
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      // Initialize IndexedDB
      const db = await initDB();

      // Convert file to ArrayBuffer for storage
      console.log("Converting file to ArrayBuffer...");
      const arrayBuffer = await file.arrayBuffer();
      console.log("ArrayBuffer size:", arrayBuffer.byteLength);

      // Store complete file data in IndexedDB
      const fileRecord = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileArrayBuffer: arrayBuffer, // Store actual file data
        quantity: quantity,
        printSettings: {
          layerHeight: userSettings.layerHeight,
          infillDensity: userSettings.infillDensity,
          infillPattern: userSettings.infillPattern,
          supportEnable: userSettings.supportEnable,
          materialType: userSettings.materialType,
          materialColor: userSettings.materialColor,
        },
        dimensions: {
          height: printInfo?.height || stlDimensions?.height || "N/A",
          width: printInfo?.width || stlDimensions?.width || "N/A",
          depth: printInfo?.depth || stlDimensions?.depth || "N/A",
        },
        pricing: printInfo?.pricing,
        printDetails: {
          filamentUsedGrams: printInfo?.filamentUsedGrams,
          filamentUsedMm: printInfo?.filamentUsedMm,
          volume: printInfo?.volume,
        },
        modelPosition: [...modelPosition],
        modelRotation: [...modelRotation],
        specialNotes: specialNotes,
        unitPrice: printInfo?.pricing?.finalPrice || 0,
        totalPrice: (printInfo?.pricing?.finalPrice || 0) * quantity,
        timestamp: new Date().toISOString(),
      };

      // Store in IndexedDB and get the ID
      const fileId = await db.add("checkout-files", fileRecord);
      console.log("File stored in IndexedDB with ID:", fileId);

      // Create metadata for UI display (with the IndexedDB ID)
      const fileMetadata = {
        id: fileId, // CRITICAL: Store the IndexedDB ID
        name: file.name,
        size: file.size,
        quantity: quantity,
        printSettings: fileRecord.printSettings,
        pricing: fileRecord.pricing,
        dimensions: fileRecord.dimensions,
        printDetails: fileRecord.printDetails,
        specialNotes: specialNotes,
        unitPrice: fileRecord.unitPrice,
        totalPrice: fileRecord.totalPrice,
        timestamp: fileRecord.timestamp,
      };

      const updatedFiles = [...stlFiles, fileMetadata];
      setStlFiles(updatedFiles);

      // Store only metadata in localStorage for UI purposes
      const metadataOnly = updatedFiles.map((file) => ({
        id: file.id, // Keep IndexedDB ID
        name: file.name,
        size: file.size,
        quantity: file.quantity,
        printSettings: file.printSettings,
        pricing: file.pricing,
        dimensions: file.dimensions,
        printDetails: file.printDetails,
        specialNotes: file.specialNotes,
        unitPrice: file.unitPrice,
        totalPrice: file.totalPrice,
        timestamp: file.timestamp,
      }));
      localStorage.setItem("stlFiles", JSON.stringify(metadataOnly));

      // Reset form
      setFile(null);
      setFileUrl(null);
      setStlDimensions(null);
      setDimensionsValid(true);
      setPrintInfo(null);
      setModelPosition([0, 0, 0]);
      setModelRotation([0, 0, 0]);
      setUserSettings({
        layerHeight: 0.15,
        infillDensity: 20,
        infillPattern: "grid",
        supportEnable: false,
        materialType: "pla",
        materialColor: "blue",
      });
      setQuantity(1);
      setSpecialNotes("");
      setError("");

      const fileInput = document.getElementById("stl-file-input");
      if (fileInput) {
        fileInput.value = "";
      }

      setError(`File saved successfully! You can now add another STL file.`);

      // Scroll to file input section after saving
      setTimeout(() => {
        fileInputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        setTimeout(() => {
          window.scrollBy({
            top: -100,
            behavior: "smooth",
          });
        }, 600);
      }, 500);
    } catch (error) {
      console.error("Error saving STL file:", error);
      setError("Error saving STL file. Please try again.");
    } finally {
      setIsAddingFile(false);
    }
  };

  // Remove a file from the stored files
  const handleRemoveFile = (index) => {
    const updatedFiles = stlFiles.filter((_, i) => i !== index);
    setStlFiles(updatedFiles);

    // Update localStorage with metadata only
    const metadataOnly = updatedFiles.map((file) => ({
      name: file.name,
      size: file.size,
      quantity: file.quantity,
      printSettings: file.printSettings,
      pricing: file.pricing,
      dimensions: file.dimensions,
      specialNotes: file.specialNotes,
      unitPrice: file.unitPrice,
      totalPrice: file.totalPrice,
      timestamp: file.timestamp,
    }));
    localStorage.setItem("stlFiles", JSON.stringify(metadataOnly));

    // If we removed the current file, clear the form
    if (index === currentFileIndex) {
      setFile(null);
      setFileUrl(null);
      setStlDimensions(null);
      setPrintInfo(null);
    }
  };

  const sliceFile = async () => {
    if (!file) {
      setError("Please select an STL file first");
      return;
    }

    if (!dimensionsValid) {
      setError("Cannot slice file: STL dimensions exceed maximum limits");
      return;
    }

    setIsSlicing(true);
    setProgress(0);
    setError("");

    try {
      console.log("Building overrides with settings:", userSettings);
      const overrides = buildOverrides(userSettings);
      console.log("Generated overrides:", overrides);

      const infillOverride = overrides.find(
        (o) => o.key === "infill_sparse_density",
      );
      console.log("Infill override found:", infillOverride);

      const slicer = new CuraWASM({
        definition: resolveDefinition("ultimaker2"),
        overrides: overrides,
        verbose: true,
      });

      slicer.on("progress", (percent) => {
        setProgress(percent);
        console.log(`Slicing progress: ${percent}%`);
      });

      const arrayBuffer = await file.arrayBuffer();
      console.log("Starting slice operation...");

      const result = await slicer.slice(arrayBuffer, "stl");

      console.log("Slice completed!");
      console.log("Generated G-code length:", result.gcode?.length || 0);
      console.log("Metadata:", result.metadata);

      if (result.metadata) {
        const filamentMm =
          result.metadata.filamentUsage ||
          result.metadata.material1Usage ||
          result.metadata.filament_used ||
          0;

        let materialDensity = 1.24;
        switch (userSettings.materialType?.toLowerCase()) {
          case "pla":
            materialDensity = 1.24;
            break;
          case "pla+":
            materialDensity = 1.25;
            break;
          case "abs":
            materialDensity = 1.05;
            break;
          default:
            materialDensity = 1.24;
        }

        const filamentGrams = (filamentMm / 1000) * materialDensity;

        const correctionFactor = getFilamentCorrectionFactor(
          userSettings.materialType,
          userSettings.infillDensity,
          userSettings.supportEnable,
        );
        const correctedFilamentGrams = filamentGrams / correctionFactor;

        console.log(`Correction factor applied: ${correctionFactor}`);
        console.log(
          `Original weight: ${filamentGrams.toFixed(2)}g, Corrected: ${correctedFilamentGrams.toFixed(2)}g`,
        );

        const info = {
          filamentUsedMm: filamentMm,
          filamentUsedGrams: correctedFilamentGrams.toFixed(2),
          volume: result.metadata.volume || "N/A",
          height: result.metadata.height || stlDimensions?.height || "N/A",
          width: result.metadata.width || stlDimensions?.width || "N/A",
          depth: result.metadata.depth || stlDimensions?.depth || "N/A",
          materialType: userSettings.materialType.toUpperCase(),
          materialColor: userSettings.materialColor,
          layerHeight: userSettings.layerHeight,
          infillDensity: userSettings.infillDensity,
        };

        const timeInSeconds =
          result.metadata.printTime ||
          result.metadata.print_time ||
          result.metadata.estimated_time ||
          0;
        const pricing = calculatePrice(correctedFilamentGrams, timeInSeconds);

        info.pricing = pricing;

        console.log("=== PRINT ANALYSIS COMPLETE ===");
        console.log(
          `- Filament Used: ${(info.filamentUsedMm / 1000).toFixed(2)} m`,
        );
        console.log(`- Filament Weight: ${info.filamentUsedGrams} g`);
        console.log("Model Dimensions:");
        console.log(`- Height: ${info.height} mm`);
        console.log(`- Width: ${info.width} mm`);
        console.log(`- Depth: ${info.depth} mm`);
        console.log(`- Volume: ${info.volume} mm³`);
        console.log("Settings Used:");
        console.log(`- Material: ${info.materialType} (${info.materialColor})`);
        console.log(`- Layer Height: ${info.layerHeight}mm`);
        console.log(`- Infill Density: ${info.infillDensity}%`);
        console.log("===============================");

        setPrintInfo(info);

        // Scroll to pricing section after slicing is complete
        setTimeout(() => {
          pricingSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 500);
      } else {
        console.warn("No metadata received from slicing operation");
        const defaultInfo = {
          filamentUsedMm: "N/A",
          filamentUsedGrams: "N/A",
          volume: "N/A",
          height: stlDimensions?.height || "N/A",
          width: stlDimensions?.width || "N/A",
          depth: stlDimensions?.depth || "N/A",
          materialType: userSettings.materialType.toUpperCase(),
          materialColor: userSettings.materialColor,
          layerHeight: userSettings.layerHeight,
          infillDensity: userSettings.infillDensity,
        };

        const pricing = calculatePrice(0, 0);
        defaultInfo.pricing = pricing;

        setPrintInfo(defaultInfo);

        // Scroll to pricing section
        setTimeout(() => {
          pricingSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 500);
      }

      slicer.dispose();
    } catch (err) {
      console.error("Slicing error:", err);
      setError(`Slicing failed: ${err.message}`);
    } finally {
      setIsSlicing(false);
      setProgress(0);
    }
  };

  const handlePayNow = async () => {
    console.log("=== handlePayNow START ===");

    try {
      setIsCheckingOut(true);
      setError("Preparing checkout...");

      // Scroll to top to show loading state
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      // Initialize IndexedDB
      console.log("Initializing database...");
      const db = await initDB();
      console.log("Database initialized");

      const storedFileIds = [];

      // Collect IDs from previously saved files
      console.log("Loading saved files:", stlFiles.length);
      for (const fileMetadata of stlFiles) {
        if (fileMetadata.id) {
          // Verify file exists in IndexedDB
          const existingFile = await db.get("checkout-files", fileMetadata.id);
          if (existingFile && existingFile.fileArrayBuffer) {
            storedFileIds.push(fileMetadata.id);
            console.log(
              "Using existing file ID:",
              fileMetadata.id,
              "Size:",
              existingFile.fileArrayBuffer.byteLength,
            );
          } else {
            console.error("File not found in IndexedDB:", fileMetadata.id);
            setError(
              `File "${fileMetadata.name}" not found. Please re-add this file.`,
            );
            setIsCheckingOut(false);
            return;
          }
        }
      }

      // Add current file if exists
      if (file && printInfo) {
        console.log("Storing current file:", file.name);
        const arrayBuffer = await file.arrayBuffer();
        console.log("Current file ArrayBuffer size:", arrayBuffer.byteLength);

        const fileRecord = {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileArrayBuffer: arrayBuffer,
          quantity: quantity,
          printSettings: {
            layerHeight: userSettings.layerHeight,
            infillDensity: userSettings.infillDensity,
            infillPattern: userSettings.infillPattern,
            supportEnable: userSettings.supportEnable,
            materialType: userSettings.materialType,
            materialColor: userSettings.materialColor,
          },
          dimensions: {
            height: printInfo?.height || stlDimensions?.height || "N/A",
            width: printInfo?.width || stlDimensions?.width || "N/A",
            depth: printInfo?.depth || stlDimensions?.depth || "N/A",
          },
          pricing: printInfo?.pricing,
          printDetails: {
            filamentUsedGrams: printInfo?.filamentUsedGrams,
            filamentUsedMm: printInfo?.filamentUsedMm,
            volume: printInfo?.volume,
          },
          modelPosition: [...modelPosition],
          modelRotation: [...modelRotation],
          specialNotes: specialNotes,
          unitPrice: printInfo?.pricing?.finalPrice || 0,
          totalPrice: (printInfo?.pricing?.finalPrice || 0) * quantity,
          timestamp: new Date().toISOString(),
        };

        const id = await db.add("checkout-files", fileRecord);
        storedFileIds.push(id);
        console.log("Current file stored with ID:", id);
      }

      console.log("Total files for checkout:", storedFileIds.length);
      console.log("All file IDs:", storedFileIds);

      if (storedFileIds.length === 0) {
        setError("No files to checkout. Please add at least one STL file.");
        setIsCheckingOut(false);
        return;
      }

      // Calculate totals
      const subtotal = calculateSubtotal();
      const discountAmount = getDiscountAmount();
      const finalTotal = calculateFinalPrice();

      console.log("Totals:", { subtotal, discountAmount, finalTotal });

      // Prepare checkout data with file IDs
      const checkoutData = {
        fileIds: storedFileIds, // Array of IndexedDB IDs
        fileCount: storedFileIds.length,
        subtotal: subtotal,
        appliedCoupon: appliedCoupon
          ? {
              name: appliedCoupon.name,
              discount: appliedCoupon.discount,
              id: appliedCoupon.id,
            }
          : null,
        discountAmount: discountAmount,
        totalPrice: finalTotal,
        orderTimestamp: new Date().toISOString(),
      };

      console.log("Checkout data prepared:", checkoutData);
      console.log("Storing checkout data in sessionStorage...");
      sessionStorage.setItem("checkoutData", JSON.stringify(checkoutData));

      // Wait for sessionStorage to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify storage
      const verifyData = sessionStorage.getItem("checkoutData");
      if (!verifyData) {
        throw new Error("Failed to store checkout data in sessionStorage");
      }
      console.log("Checkout data verified in sessionStorage");

      // Clear localStorage after successful storage
      localStorage.removeItem("stlFiles");
      setStlFiles([]);
      console.log("Local storage cleaned");

      console.log("Navigating to checkout...");
      console.log("=== handlePayNow END ===");

      // Navigate using window.location for guaranteed page transition
      window.location.href = "/checkout";
    } catch (error) {
      console.error("Error in handlePayNow:", error);
      console.error("Error stack:", error.stack);
      setError(`Failed to prepare checkout: ${error.message}`);
      setIsCheckingOut(false);
    }
  };

  // ... (rest of the component JSX remains exactly the same)
  // The JSX part of your component remains unchanged - only the data storage logic is modified

  return (
    <>
      <Header />

      <div
        id="stl-slicer-section"
        style={{
          background:
            "linear-gradient(135deg, #f5f5f5 0%, #e9edf2 25%, #dce2e8 50%, #cfd6dd 75%, #e9edf2 100%)",
          minHeight: "100vh",
          paddingTop: "2rem",
        }}
      >
        <Container fluid className="px-4">
          {/* Tutorial Banner */}
          <Row className="mb-4">
            <Col>
              <Card className="tutorial-banner border-0 professional-card">
                <Card.Body className="text-center py-3">
                  <p className="mb-0">
                    <i className="fas fa-question-circle me-2"></i>
                    Need help creating STL files?
                    <Button
                      variant="link"
                      className="text-white fw-bold text-decoration-underline p-0 ms-2"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Would navigate to /stltut page");
                      }}
                    >
                      View Tutorial Guide
                    </Button>
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Loading States Alert */}
          {(isAddingFile || isCheckingOut) && (
            <Row className="mb-4">
              <Col>
                <Alert variant="info" className="alert-professional">
                  <div className="d-flex align-items-center">
                    <Spinner animation="border" size="sm" className="me-3" />
                    <div>
                      <strong>
                        {isAddingFile && "Saving current file data..."}
                        {isCheckingOut && "Preparing checkout..."}
                      </strong>
                      <div className="small mt-1">
                        {isAddingFile &&
                          "Please wait while we save your file and prepare for the next upload..."}
                        {isCheckingOut &&
                          "Please wait while we prepare your order for checkout..."}
                      </div>
                    </div>
                  </div>
                </Alert>
              </Col>
            </Row>
          )}

          {/* Saved Files Display */}
          {stlFiles.length > 0 && (
            <Row className="mb-4">
              <Col>
                <Card className="professional-card border border-primary shadow-sm">
                  <Card.Body>
                    <h5 className="section-title text-primary">
                      <i className="fas fa-folder me-2"></i>Saved STL Files (
                      {stlFiles.length})
                    </h5>
                    <Row>
                      {stlFiles.map((fileData, index) => (
                        <Col md={6} lg={4} key={index} className="mb-3">
                          <Card className="h-100 border-primary">
                            <Card.Body className="p-3">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6
                                  className="fw-bold text-truncate mb-0"
                                  title={fileData.name}
                                >
                                  {fileData.name || `File ${index + 1}`}
                                </h6>
                                <Badge bg="primary" className="ms-2">
                                  {fileData.quantity}x
                                </Badge>
                              </div>
                              <div className="small text-muted mb-2">
                                Material:{" "}
                                {fileData.printSettings?.materialType?.toUpperCase()}
                              </div>
                              <div className="small text-muted mb-3">
                                Price: ₹
                                {(fileData.pricing?.finalPrice || 0) *
                                  fileData.quantity}
                              </div>
                              <div className="d-flex gap-2">
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleRemoveFile(index)}
                                  disabled={isAddingFile || isCheckingOut}
                                >
                                  <i className="fas fa-trash"></i>
                                </Button>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                    <div className="mt-3 p-3 bg-light rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <strong>Subtotal for all saved files:</strong>
                        <span className="h5 mb-0 text-primary">
                          ₹{calculateSubtotal()}
                        </span>
                      </div>
                      {appliedCoupon && (
                        <>
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className="text-success">
                              <i className="fas fa-tag me-1"></i>
                              Discount ({appliedCoupon.discount}%):
                            </span>
                            <span className="h6 mb-0 text-success">
                              -₹{getDiscountAmount()}
                            </span>
                          </div>
                          <hr className="my-2" />
                          <div className="d-flex justify-content-between align-items-center">
                            <strong>Final Total:</strong>
                            <span className="h4 mb-0 text-success">
                              ₹{calculateFinalPrice()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* File Selection & Maximum Dimensions - 50/50 Split */}
          <Row className="mb-4" ref={fileInputRef}>
            {/* File Selection - 50% */}
            <Col lg={6}>
              <Card className="professional-card h-100 border border-primary shadow-sm">
                <Card.Body>
                  <h5 className="section-title">
                    <i className="fas fa-upload me-2"></i>Select STL File
                  </h5>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      accept=".stl"
                      onChange={handleFileSelect}
                      className="file-input-hidden"
                      id="stl-file-input"
                      disabled={isAddingFile || isCheckingOut}
                    />
                    <label
                      htmlFor="stl-file-input"
                      className="file-input-custom"
                    >
                      <i className="fas fa-cloud-upload-alt me-2"></i>
                      {file ? file.name : "Choose STL File"}
                    </label>
                  </div>
                  {file && (
                    <div className="mt-3 text-center">
                      <span className="info-badge">
                        <i className="fas fa-check-circle me-1"></i>
                        File Selected: {file.name}
                      </span>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            {/* Maximum Dimensions - 50% */}
            <Col lg={6}>
              <Card className="dimension-card-max professional-card h-100 border border-primary shadow-sm">
                <Card.Body>
                  <h5 className="text-center mb-4 fw-bold">
                    <i className="fas fa-cube me-2"></i>Maximum Print Dimensions
                  </h5>
                  <Row>
                    <Col md={4}>
                      <div className="dimension-stat">
                        <h6 className="mb-2 opacity-75">Max Height</h6>
                        <h3 className="fw-bold mb-0">
                          {MAX_DIMENSIONS.height} mm
                        </h3>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="dimension-stat">
                        <h6 className="mb-2 opacity-75">Max Width</h6>
                        <h3 className="fw-bold mb-0">
                          {MAX_DIMENSIONS.width} mm
                        </h3>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="dimension-stat">
                        <h6 className="mb-2 opacity-75">Max Depth</h6>
                        <h3 className="fw-bold mb-0">
                          {MAX_DIMENSIONS.depth} mm
                        </h3>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* STL File Dimensions & Max Dimensions Combined - Only show if file is selected */}
          {stlDimensions && (
            <Row className="mb-4">
              <Col>
                <Card
                  className={`professional-card ${!dimensionsValid ? "dimension-invalid" : "dimension-card"}`}
                  style={{ backgroundColor: "#e3f2fd" }}
                >
                  <Card.Body>
                    <h5 className="mb-4 fw-bold text-center">
                      <i className="fas fa-ruler-combined me-2"></i>
                      Model vs Maximum Dimensions{" "}
                      {!dimensionsValid && "⚠️ EXCEEDS LIMITS"}
                    </h5>
                    <Row>
                      <Col md={4}>
                        <div
                          className={`dimension-stat ${!dimensionsValid && parseFloat(stlDimensions.height) > MAX_DIMENSIONS.height ? "invalid" : ""}`}
                        >
                          <h6 className="mb-2 opacity-75">Height</h6>
                          <h3 className="fw-bold mb-1">
                            {stlDimensions.height} mm
                          </h3>
                          <small className="text-muted">
                            Max: {MAX_DIMENSIONS.height} mm
                          </small>
                          {parseFloat(stlDimensions.height) >
                            MAX_DIMENSIONS.height && (
                            <div>
                              <small className="text-warning fw-bold">
                                Exceeds limit!
                              </small>
                            </div>
                          )}
                        </div>
                      </Col>
                      <Col md={4}>
                        <div
                          className={`dimension-stat ${!dimensionsValid && parseFloat(stlDimensions.width) > MAX_DIMENSIONS.width ? "invalid" : ""}`}
                        >
                          <h6 className="mb-2 opacity-75">Width</h6>
                          <h3 className="fw-bold mb-1">
                            {stlDimensions.width} mm
                          </h3>
                          <small className="text-muted">
                            Max: {MAX_DIMENSIONS.width} mm
                          </small>
                          {parseFloat(stlDimensions.width) >
                            MAX_DIMENSIONS.width && (
                            <div>
                              <small className="text-warning fw-bold">
                                Exceeds limit!
                              </small>
                            </div>
                          )}
                        </div>
                      </Col>
                      <Col md={4}>
                        <div
                          className={`dimension-stat ${!dimensionsValid && parseFloat(stlDimensions.depth) > MAX_DIMENSIONS.depth ? "invalid" : ""}`}
                        >
                          <h6 className="mb-2 opacity-75">Depth</h6>
                          <h3 className="fw-bold mb-1">
                            {stlDimensions.depth} mm
                          </h3>
                          <small className="text-muted">
                            Max: {MAX_DIMENSIONS.depth} mm
                          </small>
                          {parseFloat(stlDimensions.depth) >
                            MAX_DIMENSIONS.depth && (
                            <div>
                              <small className="text-warning fw-bold">
                                Exceeds limit!
                              </small>
                            </div>
                          )}
                        </div>
                      </Col>
                    </Row>
                    {!dimensionsValid && (
                      <Alert
                        variant="danger"
                        className="alert-professional mt-4"
                      >
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <strong>Model Too Large!</strong> Please resize your STL
                        file or split it into smaller parts that fit within the
                        maximum dimensions.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* 3D Viewer & Model Controls - 50/50 Split - Only show if dimensions are valid */}
          {file && dimensionsValid && (
            <Row className="mb-4">
              {/* 3D Viewer - 50% */}
              <Col lg={6}>
                <Card className="professional-card h-100">
                  <Card.Body>
                    <h5 className="section-title">
                      <i className="fas fa-eye me-2"></i>3D Preview
                    </h5>
                    <div
                      className="viewer-container"
                      style={{ height: "400px" }}
                    >
                      <Canvas shadows>
                        <PerspectiveCamera
                          makeDefault
                          position={[300, 300, 300]}
                          fov={40}
                        />
                        <ambientLight intensity={0.5} />
                        <directionalLight
                          position={[100, 200, 100]}
                          intensity={1}
                          castShadow
                        />

                        {/* Plate */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                          <planeGeometry args={[220, 220]} />
                          <meshStandardMaterial color="#f8f9fa" />
                        </mesh>

                        {/* Model */}
                        {fileUrl && (
                          <STLModel
                            file={fileUrl}
                            position={modelPosition}
                            rotation={modelRotation}
                            onDimensionsLoad={handleDimensionsLoad}
                          />
                        )}

                        <OrbitControls enablePan enableZoom enableRotate />
                      </Canvas>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              {/* Model Controls - 50% */}
              <Col lg={6}>
                <Card className="professional-card h-100">
                  <Card.Body>
                    <h5 className="section-title">
                      <i className="fas fa-sliders-h me-2"></i>Model Controls
                    </h5>

                    {/* Reset Button */}
                    <div className="mb-4 text-center">
                      <Button
                        variant="outline-primary"
                        onClick={handleReset}
                        className="fw-medium"
                        disabled={isAddingFile || isCheckingOut}
                      >
                        <i className="fas fa-undo me-2"></i>Reset to Default
                        Position
                      </Button>
                    </div>

                    {/* Move Controls */}
                    <div
                      className="mb-4"
                      style={{
                        border: "2px solid #2a65c5",
                        borderRadius: "8px",
                        padding: "1rem",
                      }}
                    >
                      <h6 className="fw-semibold mb-3 text-muted">
                        Position Adjustment
                      </h6>
                      <Row>
                        {["X", "Y", "Z"].map((axis, index) => (
                          <Col md={4} key={axis} className="mb-3">
                            <div
                              style={{
                                border: "1px solid #2a65c5",
                                borderRadius: "6px",
                                padding: "0.8rem",
                              }}
                            >
                              <Form.Label className="fw-medium text-dark">
                                {axis}: {modelPosition[index].toFixed(1)}mm
                              </Form.Label>
                              <Form.Range
                                min={-100}
                                max={100}
                                step={1}
                                value={modelPosition[index]}
                                onChange={(e) => {
                                  const newPos = [...modelPosition];
                                  newPos[index] = parseFloat(e.target.value);
                                  setModelPosition(newPos);
                                }}
                                className="control-slider"
                                disabled={isAddingFile || isCheckingOut}
                              />
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>

                    {/* Rotate Controls */}
                    <div
                      className="mb-4"
                      style={{
                        border: "2px solid #2a65c5",
                        borderRadius: "8px",
                        padding: "1rem",
                      }}
                    >
                      <h6 className="fw-semibold mb-3 text-muted">
                        Rotation Adjustment
                      </h6>
                      <Row>
                        {["X", "Y", "Z"].map((axis, index) => (
                          <Col md={4} key={axis} className="mb-3">
                            <div
                              style={{
                                border: "1px solid #2a65c5",
                                borderRadius: "6px",
                                padding: "0.8rem",
                              }}
                            >
                              <Form.Label className="fw-medium text-dark">
                                {axis}:{" "}
                                {(
                                  modelRotation[index] *
                                  (180 / Math.PI)
                                ).toFixed(0)}
                                °
                              </Form.Label>
                              <Form.Range
                                min={-180}
                                max={180}
                                step={1}
                                value={modelRotation[index] * (180 / Math.PI)}
                                onChange={(e) => {
                                  const newRot = [...modelRotation];
                                  newRot[index] =
                                    (parseFloat(e.target.value) * Math.PI) /
                                    180;
                                  setModelRotation(newRot);
                                }}
                                className="control-slider"
                                disabled={isAddingFile || isCheckingOut}
                              />
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Print Configuration - Only show if dimensions are valid */}
          {dimensionsValid && (
            <Row className="mb-4">
              <Col>
                <Card className="professional-card settings-card">
                  <Card.Body>
                    <h5 className="section-title text-center">
                      <i className="fas fa-cogs me-2"></i>Print Configuration
                    </h5>

                    <div className="settings-section">
                      <Row>
                        {/* Layer Height */}
                        <Col lg={4} md={6} className="mb-4">
                          <Form.Group>
                            <Form.Label className="fw-semibold text-dark">
                              <i className="fas fa-layer-group me-2 text-primary"></i>
                              Layer Height
                            </Form.Label>
                            <div className="position-relative">
                              <Form.Select
                                value={userSettings.layerHeight}
                                onChange={(e) =>
                                  handleSettingChange(
                                    "layerHeight",
                                    parseFloat(e.target.value),
                                  )
                                }
                                className="professional-form-control"
                                style={{
                                  appearance: "none",
                                  paddingRight: "2.5rem",
                                }}
                                disabled={isAddingFile || isCheckingOut}
                              >
                                {layerHeightOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </Form.Select>
                              <i
                                className="fas fa-chevron-down position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                                style={{ pointerEvents: "none" }}
                              ></i>
                            </div>
                          </Form.Group>
                        </Col>

                        {/* Infill Density */}
                        <Col lg={4} md={6} className="mb-4">
                          <Form.Group>
                            <Form.Label className="fw-semibold text-dark">
                              <i className="fas fa-fill-drip me-2 text-primary"></i>
                              Infill Density
                            </Form.Label>
                            <div className="position-relative">
                              <Form.Select
                                value={userSettings.infillDensity}
                                onChange={(e) =>
                                  handleSettingChange(
                                    "infillDensity",
                                    parseInt(e.target.value),
                                  )
                                }
                                className="professional-form-control"
                                style={{
                                  appearance: "none",
                                  paddingRight: "2.5rem",
                                }}
                                disabled={isAddingFile || isCheckingOut}
                              >
                                {infillOptions.map((percentage) => (
                                  <option key={percentage} value={percentage}>
                                    {percentage}% Fill
                                  </option>
                                ))}
                              </Form.Select>
                              <i
                                className="fas fa-chevron-down position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                                style={{ pointerEvents: "none" }}
                              ></i>
                            </div>
                          </Form.Group>
                        </Col>

                        {/* Infill Pattern */}
                        <Col lg={4} md={6} className="mb-4">
                          <Form.Group>
                            <Form.Label className="fw-semibold text-dark">
                              <i className="fas fa-th me-2 text-primary"></i>
                              Infill Pattern
                            </Form.Label>
                            <div className="position-relative">
                              <Form.Select
                                value={userSettings.infillPattern}
                                onChange={(e) =>
                                  handleSettingChange(
                                    "infillPattern",
                                    e.target.value,
                                  )
                                }
                                className="professional-form-control"
                                style={{
                                  appearance: "none",
                                  paddingRight: "2.5rem",
                                }}
                                disabled={isAddingFile || isCheckingOut}
                              >
                                <option value="grid">Grid Pattern</option>
                                <option value="lines">Linear Pattern</option>
                                <option value="triangles">
                                  Triangle Pattern
                                </option>
                                <option value="cubic">Cubic Pattern</option>
                                <option value="concentric">
                                  Concentric Pattern
                                </option>
                                <option value="zigzag">Zigzag Pattern</option>
                                <option value="gyroid">Gyroid Pattern</option>
                              </Form.Select>
                              <i
                                className="fas fa-chevron-down position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                                style={{ pointerEvents: "none" }}
                              ></i>
                            </div>
                          </Form.Group>
                        </Col>

                        {/* Support Required */}
                        <Col lg={4} md={6} className="mb-4">
                          <Form.Group>
                            <Form.Label className="fw-semibold text-dark">
                              <i className="fas fa-hands-helping me-2 text-primary"></i>
                              Support Structure
                            </Form.Label>
                            <div className="d-flex gap-4 mt-2">
                              <Form.Check
                                type="radio"
                                label="Not Required"
                                name="support"
                                checked={!userSettings.supportEnable}
                                onChange={() =>
                                  handleSettingChange("supportEnable", false)
                                }
                                className="fw-medium"
                                disabled={isAddingFile || isCheckingOut}
                              />
                              <Form.Check
                                type="radio"
                                label="Required"
                                name="support"
                                checked={userSettings.supportEnable}
                                onChange={() =>
                                  handleSettingChange("supportEnable", true)
                                }
                                className="fw-medium"
                                disabled={isAddingFile || isCheckingOut}
                              />
                            </div>
                          </Form.Group>
                        </Col>

                        {/* Material Type */}
                        <Col lg={4} md={6} className="mb-4">
                          <Form.Group>
                            <Form.Label className="fw-semibold text-dark">
                              <i className="fas fa-cube me-2 text-primary"></i>
                              Material Type
                            </Form.Label>
                            <div className="position-relative">
                              <Form.Select
                                value={userSettings.materialType}
                                onChange={(e) =>
                                  handleSettingChange(
                                    "materialType",
                                    e.target.value,
                                  )
                                }
                                className="professional-form-control"
                                style={{
                                  appearance: "none",
                                  paddingRight: "2.5rem",
                                }}
                                disabled={isAddingFile || isCheckingOut}
                              >
                                {materialOptions.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label} Filament
                                  </option>
                                ))}
                              </Form.Select>
                              <i
                                className="fas fa-chevron-down position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                                style={{ pointerEvents: "none" }}
                              ></i>
                            </div>
                          </Form.Group>
                        </Col>

                        {/* Material Color Dropdown */}
                        <Col lg={4} md={6} className="mb-4">
                          <Form.Group>
                            <Form.Label className="fw-semibold text-dark">
                              <i className="fas fa-palette me-2 text-primary"></i>
                              Material Color
                            </Form.Label>
                            <div className="position-relative">
                              <Form.Select
                                value={userSettings.materialColor}
                                onChange={(e) =>
                                  handleSettingChange(
                                    "materialColor",
                                    e.target.value,
                                  )
                                }
                                className="professional-form-control"
                                style={{
                                  appearance: "none",
                                  paddingRight: "2.5rem",
                                }}
                                disabled={isAddingFile || isCheckingOut}
                              >
                                <option value="white">White</option>
                                <option value="black">Black</option>
                                <option value="dark grey">Dark Grey</option>
                                <option value="yellow">Yellow</option>
                                <option value="blue">Blue</option>
                                <option value="red">Red</option>
                                <option value="green">Green</option>
                              </Form.Select>
                              <i
                                className="fas fa-chevron-down position-absolute top-50 end-0 translate-middle-y me-3 text-muted"
                                style={{ pointerEvents: "none" }}
                              ></i>
                            </div>
                            <div className="mt-2 d-flex align-items-center gap-2">
                              <div
                                className="color-preview"
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "50%",
                                  backgroundColor:
                                    userSettings.materialColor === "dark grey"
                                      ? "#555555"
                                      : userSettings.materialColor,
                                  border: "2px solid #ddd",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                }}
                              ></div>
                              <span className="fw-medium text-capitalize">
                                {userSettings.materialColor} Color Selected
                              </span>
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* Quantity and Special Notes Section - Now moved before slicing */}
                      <div
                        className="mt-4 pt-4"
                        style={{
                          borderTop: "2px solid rgba(42, 101, 197, 0.1)",
                        }}
                      >
                        <h6 className="fw-bold mb-3 text-primary">
                          <i className="fas fa-plus-circle me-2"></i>Order
                          Configuration
                        </h6>
                        <Row>
                          {/* Quantity */}
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label className="fw-semibold text-dark">
                                <i className="fas fa-sort-numeric-up me-2 text-primary"></i>
                                Quantity
                              </Form.Label>
                              <div className="d-flex align-items-center gap-3 mt-2">
                                <Button
                                  variant="outline-secondary"
                                  className="quantity-control"
                                  onClick={() =>
                                    setQuantity(Math.max(1, quantity - 1))
                                  }
                                  disabled={
                                    quantity <= 1 ||
                                    isAddingFile ||
                                    isCheckingOut
                                  }
                                >
                                  -
                                </Button>
                                <span
                                  className="fw-bold fs-4 text-primary"
                                  style={{
                                    minWidth: "3rem",
                                    textAlign: "center",
                                  }}
                                >
                                  {quantity}
                                </span>
                                <Button
                                  variant="outline-secondary"
                                  className="quantity-control"
                                  onClick={() => setQuantity(quantity + 1)}
                                  disabled={isAddingFile || isCheckingOut}
                                >
                                  +
                                </Button>
                              </div>
                              <Form.Text className="text-muted fw-medium">
                                Minimum order quantity: 1 piece
                              </Form.Text>
                            </Form.Group>
                          </Col>

                          {/* Special Notes */}
                          <Col md={6} className="mb-3">
                            <Form.Group>
                              <Form.Label className="fw-semibold text-dark">
                                <i className="fas fa-sticky-note me-2 text-primary"></i>
                                Special Instructions
                              </Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={3}
                                value={specialNotes}
                                onChange={(e) =>
                                  setSpecialNotes(e.target.value)
                                }
                                placeholder="Any special requirements or instructions..."
                                className="professional-form-control"
                                maxLength={500}
                                disabled={isAddingFile || isCheckingOut}
                              />
                              <Form.Text className="text-muted fw-medium">
                                {specialNotes.length}/500 characters remaining
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Action Buttons */}
          <Row className="mb-4">
            <Col>
              <div className="d-grid gap-3">
                {/* Slice Button */}
                <Button
                  onClick={sliceFile}
                  disabled={
                    !file ||
                    isSlicing ||
                    !dimensionsValid ||
                    isAddingFile ||
                    isCheckingOut
                  }
                  className={`py-3 fw-bold ${!file || isSlicing || !dimensionsValid ? "" : "professional-button"}`}
                  size="lg"
                  style={{ fontSize: "1.1rem", letterSpacing: "0.5px" }}
                >
                  {isSlicing ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Analyzing Model... {progress}%
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic me-2"></i>
                      {!dimensionsValid
                        ? "Cannot Process - Model Too Large"
                        : "Analyze & Generate Quote"}
                    </>
                  )}
                </Button>

                {/* Add Another STL File Button - Only show after analysis */}
                {printInfo && (
                  <Button
                    onClick={handleAddAnotherSTL}
                    variant="outline-success"
                    className="py-3 fw-bold"
                    size="lg"
                    style={{ fontSize: "1.1rem", letterSpacing: "0.5px" }}
                    disabled={isAddingFile || isCheckingOut}
                  >
                    {isAddingFile ? (
                      <>
                        <Spinner
                          animation="border"
                          size="sm"
                          className="me-2"
                        />
                        Saving File Data...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus-circle me-2"></i>
                        Add Another STL File ({stlFiles.length} files saved)
                      </>
                    )}
                  </Button>
                )}
              </div>
              {!dimensionsValid && (
                <p className="text-center text-danger mt-3 fw-medium">
                  <i className="fas fa-info-circle me-2"></i>
                  Please upload an STL file within the maximum dimensions to
                  continue.
                </p>
              )}
            </Col>
          </Row>

          {/* Progress Bar */}
          {isSlicing && (
            <Row className="mb-4">
              <Col>
                <Card className="professional-card">
                  <Card.Body>
                    <div className="progress-professional mb-3">
                      <div
                        className="progress-bar"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-center text-muted mb-0 fw-medium">
                      <i className="fas fa-spinner fa-spin me-2 text-primary"></i>
                      Processing your 3D model... {progress}% complete
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Error Display */}
          {error && (
            <Row className="mb-4">
              <Col>
                <Alert
                  variant={
                    error.includes("saved successfully") ? "success" : "danger"
                  }
                  className="alert-professional"
                >
                  <i
                    className={`fas ${error.includes("saved successfully") ? "fa-check-circle" : "fa-exclamation-circle"} me-2`}
                  ></i>
                  {error}
                </Alert>
              </Col>
            </Row>
          )}

          {/* Print Information with Coupon System */}
          {printInfo && (
            <Row className="mb-5" ref={pricingSectionRef}>
              <Col>
                <Card className="pricing-card professional-card">
                  <Card.Body className="pricing-content text-center">
                    <h3 className="fw-bold mb-4 text-success">
                      <i className="fas fa-check-circle me-2"></i>
                      Analysis Complete!
                    </h3>

                    <Row className="justify-content-center">
                      <Col lg={10}>
                        {/* Available Coupons Section */}
                        <Card
                          className="border-0 shadow-sm mb-4"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(147, 197, 253, 0.15) 0%, rgba(196, 181, 253, 0.15) 100%)",
                          }}
                        >
                          <Card.Body>
                            <h5
                              className="fw-bold mb-3"
                              style={{ color: "#4338ca" }}
                            >
                              <i className="fas fa-tags me-2"></i>
                              Available Coupons & Discounts
                            </h5>

                            {loadingCoupons ? (
                              <div className="text-center py-3">
                                <i className="fas fa-spinner fa-spin me-2"></i>
                                Loading available coupons...
                              </div>
                            ) : availableCoupons.length > 0 ? (
                              <Row className="mb-4">
                                {availableCoupons.map((coupon, index) => (
                                  <Col
                                    md={6}
                                    lg={4}
                                    key={coupon.id}
                                    className="mb-3"
                                  >
                                    <Card
                                      className="h-100"
                                      style={{
                                        border: "2px solid #6366f1",
                                        background:
                                          "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
                                        boxShadow:
                                          "0 4px 6px -1px rgba(99, 102, 241, 0.1)",
                                      }}
                                    >
                                      <Card.Body className="text-center">
                                        <div className="mb-2">
                                          <Badge
                                            style={{
                                              background:
                                                "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                                              border: "none",
                                            }}
                                            className="fs-6 px-3 py-2"
                                          >
                                            {coupon.discount}% OFF
                                          </Badge>
                                        </div>
                                        <h6
                                          className="fw-bold mb-2"
                                          style={{ color: "#4338ca" }}
                                        >
                                          {coupon.name}
                                        </h6>
                                        <small className="text-muted d-block mb-2">
                                          Expires:{" "}
                                          {new Date(
                                            coupon.expiry,
                                          ).toLocaleDateString()}
                                        </small>
                                        <Button
                                          style={{
                                            background: "transparent",
                                            border: "2px solid #6366f1",
                                            color: "#4338ca",
                                          }}
                                          size="sm"
                                          onClick={() =>
                                            copyCouponCode(coupon.name)
                                          }
                                          className="fw-medium"
                                          onMouseOver={(e) => {
                                            e.target.style.background =
                                              "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";
                                            e.target.style.color = "white";
                                          }}
                                          onMouseOut={(e) => {
                                            e.target.style.background =
                                              "transparent";
                                            e.target.style.color = "#4338ca";
                                          }}
                                          disabled={
                                            isAddingFile || isCheckingOut
                                          }
                                        >
                                          <i className="fas fa-copy me-1"></i>
                                          Copy Code
                                        </Button>
                                      </Card.Body>
                                    </Card>
                                  </Col>
                                ))}
                              </Row>
                            ) : (
                              <Alert variant="info" className="mb-4">
                                <i className="fas fa-info-circle me-2"></i>
                                No active coupons available at the moment.
                              </Alert>
                            )}

                            {/* Coupon Application Section */}
                            <div
                              className="mt-4 pt-3"
                              style={{ borderTop: "2px solid #6366f1" }}
                            >
                              <h6
                                className="fw-bold mb-3"
                                style={{ color: "#4338ca" }}
                              >
                                Apply Coupon Code
                              </h6>
                              <Row className="align-items-end">
                                <Col md={8}>
                                  <Form.Group>
                                    <Form.Control
                                      type="text"
                                      placeholder="Enter coupon code here..."
                                      value={couponInput}
                                      onChange={(e) =>
                                        setCouponInput(
                                          e.target.value.toUpperCase(),
                                        )
                                      }
                                      className="professional-form-control"
                                      disabled={
                                        appliedCoupon !== null ||
                                        isAddingFile ||
                                        isCheckingOut
                                      }
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={4}>
                                  {appliedCoupon ? (
                                    <Button
                                      variant="danger"
                                      onClick={removeCoupon}
                                      className="w-100 fw-medium"
                                      disabled={isAddingFile || isCheckingOut}
                                    >
                                      <i className="fas fa-times me-2"></i>
                                      Remove
                                    </Button>
                                  ) : (
                                    <Button
                                      style={{
                                        background:
                                          "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                        border: "none",
                                        color: "white",
                                      }}
                                      onClick={applyCoupon}
                                      className="w-100 fw-medium"
                                      disabled={
                                        !couponInput.trim() ||
                                        isAddingFile ||
                                        isCheckingOut
                                      }
                                    >
                                      <i className="fas fa-check me-2"></i>
                                      Apply
                                    </Button>
                                  )}
                                </Col>
                              </Row>

                              {/* Coupon Error/Success Messages */}
                              {couponError && (
                                <Alert variant="danger" className="mt-3 mb-0">
                                  <i className="fas fa-exclamation-triangle me-2"></i>
                                  {couponError}
                                </Alert>
                              )}

                              {appliedCoupon && (
                                <Alert
                                  style={{
                                    background:
                                      "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)",
                                    border: "2px solid #10b981",
                                    color: "#047857",
                                  }}
                                  className="mt-3 mb-0"
                                >
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span>
                                      <i className="fas fa-check-circle me-2"></i>
                                      <strong>{appliedCoupon.name}</strong>{" "}
                                      applied successfully!
                                    </span>
                                    <Badge
                                      style={{
                                        background:
                                          "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                        border: "none",
                                      }}
                                      className="fs-6"
                                    >
                                      {appliedCoupon.discount}% OFF
                                    </Badge>
                                  </div>
                                </Alert>
                              )}
                            </div>
                          </Card.Body>
                        </Card>

                        {/* Detailed Price Breakdown */}
                        <Card
                          className="border-0 shadow-sm mb-4"
                          style={{ background: "rgba(255,255,255,0.95)" }}
                        >
                          <Card.Body>
                            <h5 className="fw-bold mb-4 text-center">
                              <i className="fas fa-calculator me-2"></i>
                              Order Summary & Pricing
                            </h5>

                            {/* Current File Details */}
                            <div className="mb-4 p-3 bg-light rounded">
                              <h6 className="fw-bold mb-3">
                                <i className="fas fa-file me-2 text-primary"></i>
                                Current File: {file?.name}
                              </h6>
                              <Row>
                                <Col md={6}>
                                  <div className="mb-2">
                                    <strong>Unit Price:</strong> ₹
                                    {printInfo.pricing.finalPrice}
                                  </div>
                                  <div className="mb-2">
                                    <strong>Quantity:</strong> {quantity}
                                  </div>
                                  <div className="mb-2">
                                    <strong>Material:</strong>{" "}
                                    {userSettings.materialType.toUpperCase()}
                                  </div>
                                </Col>
                                <Col md={6}>
                                  <div className="mb-2">
                                    <strong>Layer Height:</strong>{" "}
                                    {userSettings.layerHeight}mm
                                  </div>
                                  <div className="mb-2">
                                    <strong>Infill:</strong>{" "}
                                    {userSettings.infillDensity}%
                                  </div>
                                  <div className="mb-2">
                                    <strong>Support:</strong>{" "}
                                    {userSettings.supportEnable ? "Yes" : "No"}
                                  </div>
                                </Col>
                              </Row>
                              <div className="mt-3 pt-3 border-top">
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="fw-bold">
                                    Subtotal for this file:
                                  </span>
                                  <span className="h6 mb-0 text-primary">
                                    ₹{printInfo.pricing.finalPrice * quantity}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* All Files Summary */}
                            {stlFiles.length > 0 && (
                              <div
                                className="mb-4 p-3"
                                style={{
                                  background: "#e3f2fd",
                                  borderRadius: "8px",
                                }}
                              >
                                <h6 className="fw-bold mb-3">
                                  <i className="fas fa-folder me-2 text-primary"></i>
                                  Previously Added Files ({stlFiles.length})
                                </h6>
                                {stlFiles.map((fileData, index) => (
                                  <div
                                    key={index}
                                    className="d-flex justify-content-between align-items-center mb-2"
                                  >
                                    <span className="text-truncate me-2">
                                      {fileData.name} (Qty: {fileData.quantity})
                                    </span>
                                    <span className="fw-bold text-nowrap">
                                      ₹
                                      {(fileData.pricing?.finalPrice || 0) *
                                        fileData.quantity}
                                    </span>
                                  </div>
                                ))}
                                <div className="mt-3 pt-3 border-top">
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="fw-bold">
                                      Subtotal for saved files:
                                    </span>
                                    <span className="h6 mb-0 text-primary">
                                      ₹
                                      {stlFiles.reduce(
                                        (total, file) =>
                                          total +
                                          (file.pricing?.finalPrice || 0) *
                                            file.quantity,
                                        0,
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Grand Total Calculation */}
                            <div
                              className="p-4"
                              style={{
                                background:
                                  "linear-gradient(135deg, rgba(42, 101, 197, 0.1) 0%, rgba(42, 101, 197, 0.05) 100%)",
                                borderRadius: "12px",
                                border: "2px solid rgba(42, 101, 197, 0.2)",
                              }}
                            >
                              <h6 className="fw-bold mb-3 text-center">
                                Final Order Calculation
                              </h6>

                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="fw-medium">
                                  Order Subtotal ({stlFiles.length + 1} file
                                  {stlFiles.length > 0 ? "s" : ""}):
                                </span>
                                <span className="fw-bold">
                                  ₹{calculateSubtotal()}
                                </span>
                              </div>

                              {appliedCoupon && (
                                <div
                                  className="d-flex justify-content-between align-items-center mb-2"
                                  style={{ color: "#047857" }}
                                >
                                  <span className="fw-medium">
                                    <i className="fas fa-tag me-1"></i>
                                    Coupon Discount ({appliedCoupon.discount}%):
                                  </span>
                                  <span className="fw-bold">
                                    -₹{getDiscountAmount()}
                                  </span>
                                </div>
                              )}

                              <hr className="my-3" />

                              <div className="d-flex justify-content-between align-items-center mb-4">
                                <span className="h5 fw-bold">
                                  Grand Total (Excluding Delivery):
                                </span>
                                <div className="text-end">
                                  {appliedCoupon && (
                                    <div className="text-muted text-decoration-line-through mb-1">
                                      ₹{calculateSubtotal()}
                                    </div>
                                  )}
                                  <span className="h2 fw-bold text-success">
                                    ₹{calculateFinalPrice()}
                                  </span>
                                </div>
                              </div>

                              {/* Savings Display */}
                              {appliedCoupon && (
                                <Alert
                                  style={{
                                    background:
                                      "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)",
                                    border: "2px solid #10b981",
                                    color: "#047857",
                                  }}
                                  className="mb-4"
                                >
                                  <div className="text-center">
                                    <h6 className="mb-2">
                                      <i className="fas fa-money-bill-wave me-2"></i>
                                      You're Saving ₹{getDiscountAmount()}!
                                    </h6>
                                    <p className="mb-0">
                                      Thanks for using coupon:{" "}
                                      <strong>{appliedCoupon.name}</strong>
                                    </p>
                                  </div>
                                </Alert>
                              )}
                            </div>

                            {/* Special Notes Display */}
                            {specialNotes.trim() && (
                              <Alert
                                variant="warning"
                                className="alert-professional mt-4"
                              >
                                <p className="fw-bold mb-2">
                                  <i className="fas fa-sticky-note me-2"></i>
                                  Special Instructions:
                                </p>
                                <p className="mb-0 fst-italic">
                                  "{specialNotes}"
                                </p>
                              </Alert>
                            )}

                            <div className="d-grid gap-3 mt-4">
                              <Button
                                onClick={handlePayNow}
                                className="order-button"
                                size="lg"
                                ref={placeOrderRef}
                                disabled={isAddingFile || isCheckingOut}
                              >
                                {isCheckingOut ? (
                                  <>
                                    <Spinner
                                      animation="border"
                                      size="sm"
                                      className="me-2"
                                    />
                                    Preparing Checkout...
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-shopping-cart me-2"></i>
                                    Checkout All {stlFiles.length + 1} File
                                    {stlFiles.length > 0 ? "s" : ""} - ₹
                                    {calculateFinalPrice()}
                                  </>
                                )}
                              </Button>

                              <Button
                                onClick={handleAddAnotherSTL}
                                variant="outline-primary"
                                size="lg"
                                disabled={isAddingFile || isCheckingOut}
                              >
                                {isAddingFile ? (
                                  <>
                                    <Spinner
                                      animation="border"
                                      size="sm"
                                      className="me-2"
                                    />
                                    Saving File...
                                  </>
                                ) : (
                                  <>
                                    <i className="fas fa-plus-circle me-2"></i>
                                    Add Another STL File
                                  </>
                                )}
                              </Button>
                            </div>

                            <div className="mt-3 text-center">
                              <small className="text-muted">
                                <i className="fas fa-shield-alt me-1"></i>
                                Secure checkout • Professional quality guarantee
                              </small>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Container>
        <Footer />
      </div>
    </>
  );
};

export default STLSlicer;
